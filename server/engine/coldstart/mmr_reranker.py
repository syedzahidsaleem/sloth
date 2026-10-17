"""
Sloth Coldstart & Debiasing Engine - Maximal Marginal Relevance (MMR) Re-Ranker
Implements MMR diversification with:
  - lambda = 0.7 (70% relevance, 30% diversity)
  - Max 3 tracks per artist in any 10-track sliding window
  - Max 2 consecutive tracks in the same genre
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Set, Tuple
import numpy as np


def cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


class MMRReranker:
    """
    Maximal Marginal Relevance Re-Ranker with music-streaming catalog constraints:
      1. Relevance vs Diversity balance via lambda_param (default 0.7)
      2. Artist saturation ceiling: max 3 tracks per artist in any 10-track window
      3. Genre fatigue limit: max 2 consecutive tracks in the same primary genre
    """

    def __init__(
        self,
        lambda_param: float = 0.70,
        max_tracks_per_artist_window: int = 3,
        artist_window_size: int = 10,
        max_consecutive_same_genre: int = 2,
    ):
        self.lambda_param = lambda_param
        self.max_tracks_per_artist_window = max_tracks_per_artist_window
        self.artist_window_size = artist_window_size
        self.max_consecutive_same_genre = max_consecutive_same_genre

    def _check_artist_constraint(
        self,
        candidate_artist: Optional[str],
        selected_artists: List[Optional[str]],
    ) -> bool:
        """
        Ensures an artist does not appear more than 3 times in any 10-track window.
        """
        if not candidate_artist:
            return True

        # Look back up to (artist_window_size - 1) items in the selected history
        window = selected_artists[-(self.artist_window_size - 1):] if selected_artists else []
        count = sum(1 for a in window if a == candidate_artist)
        return count < self.max_tracks_per_artist_window

    def _check_genre_constraint(
        self,
        candidate_genres: List[str],
        selected_genres: List[List[str]],
    ) -> bool:
        """
        Ensures no more than 2 consecutive tracks share the same primary genre.
        """
        if not candidate_genres or len(selected_genres) < self.max_consecutive_same_genre:
            return True

        recent = selected_genres[-self.max_consecutive_same_genre:]
        cand_set = set(g.lower() for g in candidate_genres)

        # Check if every recent track in history shares at least one common genre with candidate
        all_share = True
        for prev_g_list in recent:
            prev_set = set(g.lower() for g in prev_g_list)
            if not cand_set.intersection(prev_set):
                all_share = False
                break

        return not all_share

    def rerank(
        self,
        candidate_ids: List[str],
        relevance_scores: Dict[str, float],
        embeddings: Optional[Dict[str, np.ndarray]] = None,
        artist_map: Optional[Dict[str, str]] = None,
        genre_map: Optional[Dict[str, List[str]]] = None,
        top_k: int = 20,
        lambda_param: Optional[float] = None,
    ) -> List[Tuple[str, float]]:
        """
        Executes MMR re-ranking on candidate tracks:
        MMR(i) = lambda * Rel(i) - (1 - lambda) * max_{s in Selected} Sim(i, s)
        Subject to artist sliding-window and consecutive genre constraints.
        """
        if not candidate_ids:
            return []

        lam = lambda_param if lambda_param is not None else self.lambda_param
        artists = artist_map or {}
        genres = genre_map or {}
        embs = embeddings or {}

        # Normalize relevance scores to [0, 1] for balanced MMR math
        scores_arr = [relevance_scores.get(tid, 0.0) for tid in candidate_ids]
        min_s = min(scores_arr)
        max_s = max(scores_arr)
        range_s = max_s - min_s if max_s > min_s else 1.0

        norm_rel: Dict[str, float] = {
            tid: (relevance_scores.get(tid, 0.0) - min_s) / range_s
            for tid in candidate_ids
        }

        # Greedy MMR selection
        selected: List[str] = []
        selected_artists: List[Optional[str]] = []
        selected_genres: List[List[str]] = []
        result: List[Tuple[str, float]] = []

        remaining = set(candidate_ids)

        # 1. Pick the top initial track
        first_pick = max(remaining, key=lambda tid: norm_rel.get(tid, 0.0))
        selected.append(first_pick)
        selected_artists.append(artists.get(first_pick))
        selected_genres.append(genres.get(first_pick, []))
        result.append((first_pick, float(relevance_scores.get(first_pick, 1.0))))
        remaining.remove(first_pick)

        # 2. Iteratively pick next best track
        target_len = min(top_k, len(candidate_ids))

        while len(selected) < target_len and remaining:
            best_cand = None
            best_mmr = -1e9
            fallback_cand = None
            fallback_mmr = -1e9

            for cand in remaining:
                rel = norm_rel.get(cand, 0.0)
                cand_vec = embs.get(cand)

                # Maximum similarity to already selected items
                max_sim = 0.0
                if cand_vec is not None and selected:
                    sims = [
                        cosine_sim(cand_vec, embs[s])
                        for s in selected
                        if s in embs
                    ]
                    max_sim = max(sims) if sims else 0.0

                mmr_score = lam * rel - (1.0 - lam) * max_sim

                # Always keep best unconstrained fallback in case all violate hard constraints
                if mmr_score > fallback_mmr:
                    fallback_mmr = mmr_score
                    fallback_cand = cand

                # Check artist window constraint
                c_art = artists.get(cand)
                if not self._check_artist_constraint(c_art, selected_artists):
                    continue

                # Check consecutive genre constraint
                c_gen = genres.get(cand, [])
                if not self._check_genre_constraint(c_gen, selected_genres):
                    continue

                if mmr_score > best_mmr:
                    best_mmr = mmr_score
                    best_cand = cand

            chosen = best_cand if best_cand is not None else fallback_cand
            if chosen is None:
                break

            selected.append(chosen)
            selected_artists.append(artists.get(chosen))
            selected_genres.append(genres.get(chosen, []))
            result.append((chosen, float(relevance_scores.get(chosen, 0.0))))
            remaining.remove(chosen)

        return result
