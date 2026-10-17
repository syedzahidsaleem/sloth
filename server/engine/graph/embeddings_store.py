"""
Sloth Graph Engine - Embeddings Persistence Store
Persists and retrieves 256-dimensional neural graph embeddings to/from SQLite BLOB columns.
Supports zero-copy byte serialization (float32, 1024 bytes per 256-dim vector)
and high-performance cosine similarity nearest-neighbor lookup.
"""

from __future__ import annotations

import sqlite3
import time
from typing import Dict, List, Optional, Tuple, Union
import numpy as np


def serialize_embedding(arr: np.ndarray) -> bytes:
    """Serializes a NumPy vector to raw float32 bytes."""
    return arr.astype(np.float32).tobytes()


def deserialize_embedding(blob: bytes, expected_dim: Optional[int] = 256) -> np.ndarray:
    """Deserializes raw float32 bytes back into a 1D NumPy array."""
    arr = np.frombuffer(blob, dtype=np.float32)
    if expected_dim is not None and len(arr) != expected_dim:
        # If dimension mismatch, pad or truncate cleanly
        if len(arr) < expected_dim:
            padded = np.zeros(expected_dim, dtype=np.float32)
            padded[:len(arr)] = arr
            return padded
        return arr[:expected_dim]
    return arr.copy()


class GraphEmbeddingsStore:
    """
    Manages persistence of 256-dim embeddings for all 5 graph node types
    (tracks, artists, users, playlists, contexts) in SQLite.
    """

    def __init__(self, db_path_or_conn: Union[str, sqlite3.Connection]):
        self.db_path_or_conn = db_path_or_conn
        self.ensure_schema()

    def _get_connection(self) -> sqlite3.Connection:
        if isinstance(self.db_path_or_conn, sqlite3.Connection):
            return self.db_path_or_conn
        conn = sqlite3.connect(self.db_path_or_conn, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def ensure_schema(self) -> None:
        """Creates graph_embeddings table if not exists."""
        conn = self._get_connection()
        close_needed = not isinstance(self.db_path_or_conn, sqlite3.Connection)
        try:
            with conn:
                conn.execute(
                    """
                    CREATE TABLE IF NOT EXISTS graph_embeddings (
                        node_type TEXT NOT NULL,
                        node_id TEXT NOT NULL,
                        embedding BLOB NOT NULL,
                        dim INTEGER NOT NULL DEFAULT 256,
                        updated_at INTEGER NOT NULL,
                        PRIMARY KEY (node_type, node_id)
                    )
                    """
                )
                conn.execute(
                    """
                    CREATE INDEX IF NOT EXISTS idx_graph_embeddings_type
                    ON graph_embeddings (node_type)
                    """
                )
        finally:
            if close_needed:
                conn.close()

    def save_node_embeddings(
        self,
        embeddings: Dict[Tuple[str, str], np.ndarray],
    ) -> int:
        """
        Batch saves embeddings for arbitrary node types into graph_embeddings table.
        embeddings: dict of (node_type, node_id) -> np.ndarray
        """
        if not embeddings:
            return 0

        conn = self._get_connection()
        close_needed = not isinstance(self.db_path_or_conn, sqlite3.Connection)
        now = int(time.time())

        rows = []
        for (n_type, n_id), vec in embeddings.items():
            blob = serialize_embedding(vec)
            dim = len(vec)
            rows.append((str(n_type), str(n_id), blob, dim, now))

        try:
            with conn:
                conn.executemany(
                    """
                    INSERT INTO graph_embeddings (node_type, node_id, embedding, dim, updated_at)
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT(node_type, node_id) DO UPDATE SET
                        embedding = excluded.embedding,
                        dim = excluded.dim,
                        updated_at = excluded.updated_at
                    """,
                    rows,
                )
            return len(rows)
        finally:
            if close_needed:
                conn.close()

    def save_track_embeddings(
        self,
        track_embeddings: Dict[str, np.ndarray],
        update_tracks_table: bool = True,
    ) -> int:
        """
        Saves track embeddings into graph_embeddings and optionally mirrors them into
        the tracks table's BLOB columns.
        """
        if not track_embeddings:
            return 0

        # Save to graph_embeddings
        formatted = {("track", t_id): vec for t_id, vec in track_embeddings.items()}
        self.save_node_embeddings(formatted)

        if not update_tracks_table:
            return len(track_embeddings)

        conn = self._get_connection()
        close_needed = not isinstance(self.db_path_or_conn, sqlite3.Connection)
        try:
            # Check if tracks table exists and has mert_embedding or similar
            track_updates = [
                (serialize_embedding(vec), t_id)
                for t_id, vec in track_embeddings.items()
            ]
            with conn:
                conn.executemany(
                    """
                    UPDATE tracks
                    SET mert_embedding = ?
                    WHERE id = ?
                    """,
                    track_updates,
                )
            return len(track_updates)
        except Exception:
            # If column or table doesn't exist, graph_embeddings has already persisted it
            return len(track_embeddings)
        finally:
            if close_needed:
                conn.close()

    def get_node_embedding(
        self, node_type: str, node_id: str
    ) -> Optional[np.ndarray]:
        """Loads single 256-dim embedding for a specific node."""
        conn = self._get_connection()
        close_needed = not isinstance(self.db_path_or_conn, sqlite3.Connection)
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT embedding, dim FROM graph_embeddings
                WHERE node_type = ? AND node_id = ?
                """,
                (str(node_type), str(node_id)),
            )
            row = cursor.fetchone()
            if not row:
                return None
            blob = row["embedding"] if isinstance(row, sqlite3.Row) else row[0]
            dim = row["dim"] if isinstance(row, sqlite3.Row) else row[1]
            return deserialize_embedding(blob, expected_dim=dim)
        finally:
            if close_needed:
                conn.close()

    def get_all_embeddings(self, node_type: str = "track") -> Dict[str, np.ndarray]:
        """Loads all stored embeddings for a given node type."""
        conn = self._get_connection()
        close_needed = not isinstance(self.db_path_or_conn, sqlite3.Connection)
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT node_id, embedding, dim FROM graph_embeddings
                WHERE node_type = ?
                """,
                (str(node_type),),
            )
            rows = cursor.fetchall()
            results: Dict[str, np.ndarray] = {}
            for r in rows:
                nid = str(r["node_id"] if isinstance(r, sqlite3.Row) else r[0])
                blob = r["embedding"] if isinstance(r, sqlite3.Row) else r[1]
                dim = r["dim"] if isinstance(r, sqlite3.Row) else r[2]
                results[nid] = deserialize_embedding(blob, expected_dim=dim)
            return results
        finally:
            if close_needed:
                conn.close()

    def find_nearest_neighbors(
        self,
        query_embedding: np.ndarray,
        node_type: str = "track",
        top_k: int = 20,
        exclude_ids: Optional[List[str]] = None,
    ) -> List[Tuple[str, float]]:
        """
        Vectorized cosine similarity search across all stored node embeddings.
        """
        all_embs = self.get_all_embeddings(node_type)
        if not all_embs:
            return []

        excludes = set(exclude_ids or [])
        node_ids = [nid for nid in all_embs.keys() if nid not in excludes]
        if not node_ids:
            return []

        matrix = np.array([all_embs[nid] for nid in node_ids], dtype=np.float32)

        # Normalize query and matrix
        q_norm = query_embedding / (np.linalg.norm(query_embedding) + 1e-8)
        m_norms = np.linalg.norm(matrix, axis=1, keepdims=True) + 1e-8
        norm_matrix = matrix / m_norms

        sims = norm_matrix @ q_norm
        ranked_indices = np.argsort(-sims)[:top_k]

        return [(node_ids[idx], float(sims[idx])) for idx in ranked_indices]
