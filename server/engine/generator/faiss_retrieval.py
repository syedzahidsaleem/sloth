"""
Sloth Diffusion Generator - Fast Acoustic Retrieval (FAISS IndexFlatIP)
Retrieves nearest catalog tracks from continuous 768-dimensional MERT latent embeddings.
Provides native FAISS IndexFlatIP with a robust vectorized NumPy fallback.
"""

from __future__ import annotations

import logging
from typing import Dict, List, Optional, Set, Tuple
import numpy as np

logger = logging.getLogger("sloth-faiss-retrieval")

# Check if FAISS is available in environment
try:
    import faiss
    _FAISS_AVAILABLE = True
except ImportError:
    _FAISS_AVAILABLE = False
    logger.info("Faiss library not installed. Operating with vectorized NumPy IndexFlatIP fallback.")


class FAISSRetriever:
    """
    IndexFlatIP over 768-dimensional continuous MERT track embeddings.
    Vectors are L2-normalized so Inner Product (IP) corresponds exactly to Cosine Similarity.
    """

    def __init__(self, embedding_dim: int = 768):
        self.embedding_dim = embedding_dim
        self.track_ids: List[str] = []
        self.embeddings: Optional[np.ndarray] = None  # (N, D) normalized float32
        self.faiss_index: Any = None
        self.use_faiss = _FAISS_AVAILABLE

    @property
    def ntotal(self) -> int:
        """Returns number of indexed tracks in FAISS / NumPy index."""
        return len(self.track_ids)

    def rebuild_index(self, track_embeddings: Dict[str, np.ndarray]) -> int:
        """
        Reconstructs the index over the catalog of MERT track embeddings.
        Returns total indexed track count.
        """
        if not track_embeddings:
            self.track_ids = []
            self.embeddings = None
            self.faiss_index = None
            return 0

        self.track_ids = list(track_embeddings.keys())
        raw_matrix = np.array([track_embeddings[tid] for tid in self.track_ids], dtype=np.float32)

        # Ensure correct dimension
        if raw_matrix.ndim == 1:
            raw_matrix = raw_matrix.reshape(1, -1)

        # L2-normalize vectors so Inner Product == Cosine Similarity
        norms = np.linalg.norm(raw_matrix, axis=-1, keepdims=True)
        norms[norms == 0] = 1.0
        normalized_matrix = (raw_matrix / norms).astype(np.float32)
        self.embeddings = normalized_matrix

        if self.use_faiss:
            try:
                index = faiss.IndexFlatIP(self.embedding_dim)
                index.add(normalized_matrix)
                self.faiss_index = index
            except Exception as e:
                logger.warning("Failed to initialize FAISS index (%s). Falling back to NumPy.", e)
                self.faiss_index = None

        return len(self.track_ids)

    def search(
        self,
        query_vectors: np.ndarray,
        k: int = 5,
    ) -> Tuple[np.ndarray, List[List[str]]]:
        """
        Searches for top-k nearest tracks for a batch of query vectors.
        query_vectors: (B, D) or (D,)
        Returns:
          - similarities: (B, k)
          - track_ids: (B, k)
        """
        if self.embeddings is None or len(self.track_ids) == 0:
            return np.zeros((0, 0), dtype=np.float32), []

        queries = np.atleast_2d(query_vectors).astype(np.float32)
        # Normalize queries
        q_norms = np.linalg.norm(queries, axis=-1, keepdims=True)
        q_norms[q_norms == 0] = 1.0
        q_norm = queries / q_norms

        top_k = min(k, len(self.track_ids))

        # FAISS search branch
        if self.faiss_index is not None:
            scores, indices = self.faiss_index.search(q_norm, top_k)
            result_ids = [[self.track_ids[idx] for idx in row if 0 <= idx < len(self.track_ids)] for row in indices]
            return scores, result_ids

        # Pure NumPy exact IndexFlatIP fallback
        # Similarities: (B, N)
        sim_matrix = q_norm @ self.embeddings.T

        # Get top-k indices per query
        top_indices = np.argsort(-sim_matrix, axis=1)[:, :top_k]
        top_scores = np.take_along_axis(sim_matrix, top_indices, axis=1)

        result_ids = [
            [self.track_ids[idx] for idx in row_indices]
            for row_indices in top_indices
        ]
        return top_scores.astype(np.float32), result_ids

    def find_unique_trajectory(
        self,
        query_embeddings: np.ndarray,
        diversity_temperature: float = 0.5,
    ) -> List[Tuple[str, float]]:
        """
        Maps an ordered sequence of continuous generated latent vectors (e.g. 20 tracks)
        to unique catalog track IDs without repetitions.
        Returns: list of (track_id, similarity_score).
        """
        if self.embeddings is None or len(self.track_ids) == 0:
            return []

        queries = np.atleast_2d(query_embeddings).astype(np.float32)
        q_norms = np.linalg.norm(queries, axis=-1, keepdims=True)
        q_norms[q_norms == 0] = 1.0
        q_norm = queries / q_norms

        selected_tracks: List[Tuple[str, float]] = []
        used_ids: Set[str] = set()

        # Compute full similarity matrix (num_queries, num_catalog)
        sim_matrix = q_norm @ self.embeddings.T

        for step in range(len(queries)):
            step_sims = sim_matrix[step].copy()

            # Mask already selected tracks
            for uid in used_ids:
                if uid in self.track_ids:
                    idx = self.track_ids.index(uid)
                    step_sims[idx] = -1e9

            # Pick best match
            best_idx = int(np.argmax(step_sims))
            best_tid = self.track_ids[best_idx]
            score = float(step_sims[best_idx])

            selected_tracks.append((best_tid, round(score, 4)))
            used_ids.add(best_tid)

            # If all catalog tracks used, reset pool
            if len(used_ids) >= len(self.track_ids):
                used_ids.clear()

        return selected_tracks
