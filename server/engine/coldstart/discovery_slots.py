"""
Sloth Coldstart & Debiasing Engine - Discovery Slots Injector
Curates and injects long-tail gems into recommendation queues:
Every 7th track is selected from the bottom-5% popularity distribution,
conditioned on audio/embedding similarity to the active listening session.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Set, Tuple
import numpy as np


def cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


@dataclass
class QueueTrackItem:
    track_id: str
    is_discovery_slot: bool = False
    badge: Optional[str] = None
    similarity_score: float = 0.0


class DiscoverySlotInjector:
    """
    Injects bottom-5% popularity undiscovered gems every 7th track in the queue.
    """

    def __init__(
        self,
        slot_interval: int = 7,
        popularity_percentile: float = 0.05,
        min_similarity: float = 0.50,
    ):
        self.slot_interval = slot_interval
        self.popularity_percentile = popularity_percentile
        self.min_similarity = min_similarity

    def identify_long_tail_tracks(
        self,
        play_counts: Dict[str, int],
        percentile: Optional[float] = None,
    ) -> Set[str]:
        """
        Determines tracks whose play count falls within the bottom popularity percentile.
        """
        if not play_counts:
            return set()

        pct = percentile if percentile is not None else self.popularity_percentile
        counts = list(play_counts.values())
        threshold = float(np.percentile(counts, pct * 100.0))

        # Bottom percentile tracks
        return {tid for tid, count in play_counts.items() if count <= threshold}

    def rank_discovery_candidates(
        self,
        long_tail_track_ids: Set[str],
        session_embedding: np.ndarray,
        track_embeddings: Dict[str, np.ndarray],
        exclude_track_ids: Optional[Set[str]] = None,
        top_k: int = 20,
    ) -> List[Tuple[str, float]]:
        """
        Ranks long-tail tracks by cosine similarity to the current session embedding.
        """
        excludes = exclude_track_ids or set()
        candidates: List[Tuple[str, float]] = []

        for tid in long_tail_track_ids:
            if tid in excludes:
                continue
            emb = track_embeddings.get(tid)
            if emb is not None:
                sim = cosine_sim(session_embedding, emb)
                if sim >= self.min_similarity:
                    candidates.append((tid, sim))

        candidates.sort(key=lambda x: x[1], reverse=True)
        return candidates[:top_k]

    def inject_slots(
        self,
        ranked_track_ids: List[str],
        discovery_candidates: List[Tuple[str, float]],
        slot_interval: Optional[int] = None,
    ) -> List[QueueTrackItem]:
        """
        Injects a discovery track into every 7th position in the queue.
        Format:
          Tracks 1-6: Standard recommendations
          Track 7: Discovery slot (tagged with is_discovery_slot=True, badge="New")
          Tracks 8-13: Standard recommendations
          Track 14: Discovery slot
          ...
        """
        interval = slot_interval or self.slot_interval
        result: List[QueueTrackItem] = []

        standard_pool = [tid for tid in ranked_track_ids]
        discovery_pool = list(discovery_candidates)
        already_queued: Set[str] = set()

        disc_idx = 0
        std_idx = 0
        current_pos = 1

        while std_idx < len(standard_pool) or disc_idx < len(discovery_pool):
            is_slot = (current_pos % interval == 0)

            if is_slot and disc_idx < len(discovery_pool):
                d_id, sim = discovery_pool[disc_idx]
                disc_idx += 1
                if d_id not in already_queued:
                    result.append(
                        QueueTrackItem(
                            track_id=d_id,
                            is_discovery_slot=True,
                            badge="New",
                            similarity_score=round(sim, 4),
                        )
                    )
                    already_queued.add(d_id)
                    current_pos += 1
                    continue

            # Standard track
            if std_idx < len(standard_pool):
                tid = standard_pool[std_idx]
                std_idx += 1
                if tid not in already_queued:
                    result.append(
                        QueueTrackItem(
                            track_id=tid,
                            is_discovery_slot=False,
                            badge=None,
                            similarity_score=1.0,
                        )
                    )
                    already_queued.add(tid)
                    current_pos += 1
            else:
                # If standard pool exhausted, fill with remaining discovery tracks
                if disc_idx < len(discovery_pool):
                    d_id, sim = discovery_pool[disc_idx]
                    disc_idx += 1
                    if d_id not in already_queued:
                        result.append(
                            QueueTrackItem(
                                track_id=d_id,
                                is_discovery_slot=True,
                                badge="New",
                                similarity_score=round(sim, 4),
                            )
                        )
                        already_queued.add(d_id)
                        current_pos += 1
                else:
                    break

        return result
