"""
Sloth Library Batch Indexer
Asynchronously processes music library tracks in batch size 16,
extracts MERT + CLAP embeddings and mood tags, stores them in VectorStore,
and streams real-time Server-Sent Events (SSE) progress to the frontend.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, AsyncGenerator, Callable, Dict, List, Optional, Tuple
import numpy as np

from .feature_pipeline import FeatureBundle, FeaturePipeline
from .vector_store.store import VectorStore

logger = logging.getLogger("sloth-batch-indexer")


@dataclass
class IndexerProgress:
    indexed: int = 0
    total: int = 0
    current_track: str = ""
    status: str = "idle"  # "idle" | "indexing" | "completed" | "canceled" | "error"
    error: Optional[str] = None
    started_at: Optional[float] = None
    completed_at: Optional[float] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "indexed": self.indexed,
            "total": self.total,
            "current_track": self.current_track,
            "status": self.status,
            "error": self.error,
            "percent": round((self.indexed / max(1, self.total)) * 100, 1),
            "started_at": self.started_at,
            "completed_at": self.completed_at,
        }


class LibraryBatchIndexer:
    """
    Background batch indexer for music libraries.
    Orchestrates batch=16 feature extraction and SSE progress streaming.
    """

    DEFAULT_BATCH_SIZE = 16

    def __init__(
        self,
        vector_store: Optional[VectorStore] = None,
        feature_pipeline: Optional[FeaturePipeline] = None,
        batch_size: int = DEFAULT_BATCH_SIZE,
    ):
        self.batch_size = batch_size
        self.vector_store = vector_store or VectorStore(dimensions=768)
        self.clap_store = VectorStore(dimensions=512, table_name="vec_clap")
        self.pipeline = feature_pipeline or FeaturePipeline(lazy_load=True)
        self.progress = IndexerProgress()
        self.cancel_event = asyncio.Event()
        self._subscribers: List[asyncio.Queue] = []
        self._is_running = False

    def is_running(self) -> bool:
        return self._is_running

    def get_progress(self) -> IndexerProgress:
        return self.progress

    def cancel(self):
        if self._is_running:
            self.cancel_event.set()
            self.progress.status = "canceled"
            self.progress.completed_at = time.time()
            self._broadcast({"event": "indexing_canceled", **self.progress.to_dict()})

    def _broadcast(self, data: Dict[str, Any]):
        dead = []
        for q in self._subscribers:
            try:
                q.put_nowait(data)
            except Exception:
                dead.append(q)
        for d in dead:
            self._subscribers.remove(d)

    async def subscribe(self) -> AsyncGenerator[Dict[str, Any], None]:
        q: asyncio.Queue = asyncio.Queue(maxsize=100)
        self._subscribers.append(q)

        # Emit initial state
        yield {"event": "indexing_state", **self.progress.to_dict()}

        try:
            while True:
                msg = await q.get()
                yield msg
                if msg.get("status") in ["completed", "canceled", "error"]:
                    break
        finally:
            if q in self._subscribers:
                self._subscribers.remove(q)

    async def reindex_library(
        self,
        track_items: List[Tuple[str, str]],  # List of (track_id, file_path_or_title)
    ) -> IndexerProgress:
        """
        Re-indexes the provided library items in batch chunks of 16.
        """
        if self._is_running:
            return self.progress

        self._is_running = True
        self.cancel_event.clear()
        self.progress = IndexerProgress(
            indexed=0,
            total=len(track_items),
            status="indexing",
            started_at=time.time(),
        )

        self._broadcast({"event": "indexing_started", **self.progress.to_dict()})

        loop = asyncio.get_running_loop()

        try:
            total = len(track_items)
            for i in range(0, total, self.batch_size):
                if self.cancel_event.is_set():
                    self.progress.status = "canceled"
                    break

                batch = track_items[i : i + self.batch_size]
                self.progress.current_track = batch[0][1]

                # Run feature pipeline extraction in thread pool executor
                bundles: List[FeatureBundle] = await loop.run_in_executor(
                    None,
                    self._process_batch_sync,
                    batch,
                )

                for bundle in bundles:
                    # Index MERT in primary vector store
                    self.vector_store.add(
                        id=bundle.track_id,
                        embedding=bundle.mert_embedding,
                        metadata={"valence": bundle.valence, "arousal": bundle.arousal},
                    )
                    # Index CLAP in text-aligned store
                    self.clap_store.add(
                        id=bundle.track_id,
                        embedding=bundle.clap_embedding,
                    )
                    self.progress.indexed += 1

                self._broadcast({"event": "indexing_progress", **self.progress.to_dict()})
                await asyncio.sleep(0.01)

            if not self.cancel_event.is_set():
                self.progress.status = "completed"
                self.progress.completed_at = time.time()
                self._broadcast({"event": "indexing_completed", **self.progress.to_dict()})

        except Exception as e:
            logger.error(f"Library indexing error: {e}", exc_info=True)
            self.progress.status = "error"
            self.progress.error = str(e)
            self.progress.completed_at = time.time()
            self._broadcast({"event": "indexing_error", **self.progress.to_dict()})
        finally:
            self._is_running = False

        return self.progress

    def _process_batch_sync(self, batch: List[Tuple[str, str]]) -> List[FeatureBundle]:
        bundles: List[FeatureBundle] = []
        for track_id, path_or_title in batch:
            if os.path.exists(path_or_title):
                bundle = self.pipeline.process_audio_file(track_id, path_or_title)
            else:
                # Deterministic synthetic waveform for non-file/demo tracks
                dummy_arr = np.sin(np.linspace(0, 100, 24000)).astype(np.float32)
                bundle = self.pipeline.process_audio_array(track_id, dummy_arr, sample_rate=24000)
            bundles.append(bundle)
        return bundles
