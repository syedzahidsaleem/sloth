"""
Sloth Graph Engine - Background Training Runner & SSE Progress Streamer
Coordinates SQLite extraction, hypergraph construction, contrastive pretraining,
BPR fine-tuning, embedding persistence, and Server-Sent Events (SSE) progress streaming.
"""

from __future__ import annotations

import asyncio
import json
import logging
import random
import sqlite3
import time
from typing import AsyncGenerator, Callable, Dict, List, Optional, Tuple, Union

from .builder import SQLiteGraphBuilder
from .contrastive_pretrain import ContrastivePretrainer, TrainingMetrics
from .embeddings_store import GraphEmbeddingsStore
from .light_hgcn import HeteroHypergraph, LightHGCN
from .schema import HeteroNodeType

logger = logging.getLogger("sloth.engine.graph")


class GraphTrainingRunner:
    """
    Coordinates training of the Heterogeneous Hypergraph Model on new listening events
    and streams metrics over Server-Sent Events (SSE).
    """

    def __init__(
        self,
        db_path_or_conn: Union[str, sqlite3.Connection],
        embedding_dim: int = 256,
        num_layers: int = 2,
        pretrain_epochs: int = 50,
        finetune_epochs: int = 20,
        batch_size: int = 512,
        learning_rate: float = 0.01,
        reg_weight: float = 1e-4,
    ):
        self.db_path_or_conn = db_path_or_conn
        self.embedding_dim = embedding_dim
        self.num_layers = num_layers
        self.pretrain_epochs = pretrain_epochs
        self.finetune_epochs = finetune_epochs
        self.batch_size = batch_size
        self.learning_rate = learning_rate
        self.reg_weight = reg_weight
        self._is_training = False

    def generate_bpr_pairs(
        self,
        graph: HeteroHypergraph,
        max_pairs: int = 2048,
    ) -> List[Tuple[str, str, str]]:
        """
        Samples (user_id, pos_track_id, neg_track_id) triplets from hyperedges and events.
        """
        pairs: List[Tuple[str, str, str]] = []
        user_tracks: Dict[str, Set[str]] = {}
        all_tracks: List[str] = []

        track_indices = graph.type_to_indices.get(HeteroNodeType.TRACK, [])
        for idx in track_indices:
            _, t_id = graph.idx_to_node[idx]
            all_tracks.append(t_id)

        if not all_tracks:
            return []

        # Find positive interactions from hyperedges
        for edge in graph.hyperedges:
            users_in_edge = [nid for (nt, nid) in edge.nodes if nt == HeteroNodeType.USER]
            tracks_in_edge = [nid for (nt, nid) in edge.nodes if nt == HeteroNodeType.TRACK]
            for u in users_in_edge:
                user_tracks.setdefault(u, set()).update(tracks_in_edge)

        if not user_tracks:
            # Fallback default user with available tracks
            def_user = "user_primary"
            user_tracks[def_user] = set(all_tracks[: max(1, len(all_tracks) // 2)])

        track_set = set(all_tracks)
        for u, pos_set in user_tracks.items():
            neg_candidates = list(track_set - pos_set)
            if not neg_candidates:
                neg_candidates = all_tracks

            for pos in pos_set:
                neg = random.choice(neg_candidates)
                pairs.append((u, pos, neg))
                if len(pairs) >= max_pairs:
                    break
            if len(pairs) >= max_pairs:
                break

        return pairs

    def run_training_sync(
        self,
        progress_callback: Optional[Callable[[TrainingMetrics], None]] = None,
    ) -> Dict[str, Any]:
        """
        Synchronously runs the full extraction, pretraining, fine-tuning, and storage.
        """
        start_time = time.time()
        self._is_training = True

        try:
            # 1. Extraction from SQLite
            if progress_callback:
                progress_callback(
                    TrainingMetrics(
                        phase="extracting",
                        epoch=0,
                        total_epochs=self.pretrain_epochs + self.finetune_epochs,
                        loss=0.0,
                        progress=0.01,
                    )
                )

            builder = SQLiteGraphBuilder(self.db_path_or_conn)
            graph_data = builder.build()
            hypergraph = HeteroHypergraph.from_graph_data(graph_data)

            # 2. Initialize Model
            model = LightHGCN(
                graph=hypergraph,
                embedding_dim=self.embedding_dim,
                num_layers=self.num_layers,
            )

            # 3. Sample BPR pairs
            bpr_pairs = self.generate_bpr_pairs(hypergraph)

            # 4. Contrastive Pretrainer
            pretrainer = ContrastivePretrainer(
                model=model,
                dropout_rate=0.20,
                temperature=0.20,
                pretrain_epochs=self.pretrain_epochs,
                finetune_epochs=self.finetune_epochs,
                batch_size=self.batch_size,
                learning_rate=self.learning_rate,
                reg_weight=self.reg_weight,
            )

            results = pretrainer.train_pipeline(
                bpr_pairs=bpr_pairs,
                progress_callback=progress_callback,
            )

            # 5. Persist final embeddings to SQLite
            store = GraphEmbeddingsStore(self.db_path_or_conn)
            final_embeddings = model.forward()

            # Save all node embeddings
            save_map: Dict[Tuple[str, str], Any] = {}
            for idx, (n_type, ext_id) in hypergraph.idx_to_node.items():
                save_map[(n_type.value, ext_id)] = final_embeddings[idx]

            saved_count = store.save_node_embeddings(save_map)
            # Update tracks table specifically
            track_embs = model.get_all_track_embeddings(final_embeddings)
            store.save_track_embeddings(track_embs, update_tracks_table=True)

            elapsed = round(time.time() - start_time, 2)
            results.update({
                "nodes_saved": saved_count,
                "tracks_embedded": len(track_embs),
                "elapsed_seconds": elapsed,
            })
            return results

        finally:
            self._is_training = False

    async def stream_training_events(self) -> AsyncGenerator[str, None]:
        """
        Asynchronous generator emitting Server-Sent Events (SSE) formatted text.
        Format: data: <json>\n\n
        """
        queue: asyncio.Queue[TrainingMetrics] = asyncio.Queue()
        loop = asyncio.get_running_loop()

        def _callback(m: TrainingMetrics) -> None:
            loop.call_soon_threadsafe(queue.put_nowait, m)

        # Launch training in executor thread so event loop remains unblocked
        train_future = loop.run_in_executor(None, self.run_training_sync, _callback)

        while not train_future.done() or not queue.empty():
            try:
                # Wait for metric with short timeout
                metric = await asyncio.wait_for(queue.get(), timeout=0.1)
                payload = {
                    "phase": metric.phase,
                    "epoch": metric.epoch,
                    "total_epochs": metric.total_epochs,
                    "loss": metric.loss,
                    "progress": metric.progress,
                }
                yield f"data: {json.dumps(payload)}\n\n"
            except asyncio.TimeoutError:
                continue

        # Await final result to propagate any exceptions
        result = await train_future
        final_payload = {
            "phase": "completed",
            "progress": 1.0,
            "result": result,
        }
        yield f"data: {json.dumps(final_payload)}\n\n"
