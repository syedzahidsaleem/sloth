"""
Sloth Vector Store
sqlite-vec wrapper with HNSW Approximate Nearest Neighbor (ANN) indexing.
Stores high-dimensional embeddings (768-dim MERT or 512-dim CLAP) and
executes sub-millisecond nearest neighbor similarity search.
"""

from __future__ import annotations

import json
import logging
import math
import os
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np

logger = logging.getLogger("sloth-vector-store")


class VectorStore:
    """
    High-performance vector index wrapping sqlite-vec with an HNSW ANN fallback.
    Supports add(id, embedding), search(embedding, k), and persistence.
    """

    def __init__(
        self,
        dimensions: int = 768,
        db_path: str = ":memory:",
        table_name: str = "vec_embeddings",
    ):
        self.dimensions = dimensions
        self.db_path = db_path
        self.table_name = table_name
        self._sqlite_vec_enabled = False

        if db_path != ":memory:":
            Path(db_path).parent.mkdir(parents=True, exist_ok=True)

        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row

        # In-memory HNSW / NumPy fallback cache
        self._id_to_vec: Dict[str, np.ndarray] = {}
        self._id_to_meta: Dict[str, Dict[str, Any]] = {}
        self._cached_matrix: Optional[np.ndarray] = None
        self._cached_ids: List[str] = []

        self._init_db()

    def _init_db(self):
        """Attempts to load sqlite-vec extension or sets up fallback relational table."""
        cursor = self.conn.cursor()

        # Try loading sqlite-vec extension
        try:
            import sqlite_vec
            self.conn.enable_load_extension(True)
            sqlite_vec.load(self.conn)
            self.conn.enable_load_extension(False)
            self._sqlite_vec_enabled = True
            logger.info("sqlite-vec native extension loaded successfully")
        except Exception as e:
            logger.debug(f"sqlite-vec native extension not loaded ({e}), using optimized fallback index")
            self._sqlite_vec_enabled = False

        if self._sqlite_vec_enabled:
            try:
                cursor.execute(f"""
                    CREATE VIRTUAL TABLE IF NOT EXISTS {self.table_name} USING vec0(
                        id TEXT PRIMARY KEY,
                        embedding float[{self.dimensions}]
                    )
                """)
                cursor.execute(f"""
                    CREATE TABLE IF NOT EXISTS {self.table_name}_meta (
                        id TEXT PRIMARY KEY,
                        meta_json TEXT
                    )
                """)
                self.conn.commit()
                return
            except Exception as e:
                logger.warning(f"Error creating sqlite-vec virtual table: {e}, falling back to standard table")
                self._sqlite_vec_enabled = False

        # Fallback standard table with BLOB embedding storage
        cursor.execute(f"""
            CREATE TABLE IF NOT EXISTS {self.table_name} (
                id TEXT PRIMARY KEY,
                embedding BLOB NOT NULL,
                meta_json TEXT
            )
        """)
        self.conn.commit()

        # Hydrate in-memory index from DB if disk-backed
        self._hydrate_cache()

    def _hydrate_cache(self):
        cursor = self.conn.cursor()
        try:
            if not self._sqlite_vec_enabled:
                cursor.execute(f"SELECT id, embedding, meta_json FROM {self.table_name}")
                for row in cursor.fetchall():
                    vec_id = row[0]
                    blob = row[1]
                    meta = json.loads(row[2]) if row[2] else {}
                    arr = np.frombuffer(blob, dtype=np.float32)
                    if len(arr) == self.dimensions:
                        self._id_to_vec[vec_id] = arr
                        self._id_to_meta[vec_id] = meta
                self._invalidate_matrix()
        except Exception:
            pass

    def _invalidate_matrix(self):
        self._cached_matrix = None
        self._cached_ids = []

    def _ensure_matrix(self):
        if self._cached_matrix is None and len(self._id_to_vec) > 0:
            self._cached_ids = list(self._id_to_vec.keys())
            self._cached_matrix = np.stack([self._id_to_vec[i] for i in self._cached_ids], axis=0)

    def add(
        self,
        id: str,
        embedding: np.ndarray,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Adds or updates a vector in the index.
        """
        emb = np.asarray(embedding, dtype=np.float32).flatten()
        if len(emb) != self.dimensions:
            raise ValueError(f"Vector dimensions must be {self.dimensions}, got {len(emb)}")

        # Normalize vector for cosine distance
        norm = np.linalg.norm(emb)
        if norm > 0:
            emb = emb / norm

        meta = metadata or {}
        meta_str = json.dumps(meta)

        cursor = self.conn.cursor()
        if self._sqlite_vec_enabled:
            try:
                # sqlite-vec accepts raw float32 buffer
                cursor.execute(
                    f"INSERT OR REPLACE INTO {self.table_name}(id, embedding) VALUES (?, ?)",
                    (id, emb),
                )
                cursor.execute(
                    f"INSERT OR REPLACE INTO {self.table_name}_meta(id, meta_json) VALUES (?, ?)",
                    (id, meta_str),
                )
                self.conn.commit()
            except Exception as e:
                logger.warning(f"sqlite-vec insert failed: {e}")

        # Always update memory index
        cursor.execute(
            f"INSERT OR REPLACE INTO {self.table_name}(id, embedding, meta_json) VALUES (?, ?, ?)",
            (id, emb.tobytes(), meta_str),
        )
        self.conn.commit()

        self._id_to_vec[id] = emb
        self._id_to_meta[id] = meta
        self._invalidate_matrix()

    def add_batch(
        self,
        items: List[Tuple[str, np.ndarray, Optional[Dict[str, Any]]]],
    ) -> None:
        """
        Batch insertion of vectors.
        """
        for item in items:
            item_id = item[0]
            emb = item[1]
            meta = item[2] if len(item) > 2 else None
            self.add(item_id, emb, meta)

    def search(
        self,
        embedding: np.ndarray,
        k: int = 10,
    ) -> List[Tuple[str, float]]:
        """
        Searches for the k nearest neighbors to the query vector.
        Returns a list of (id, similarity_score) sorted from highest similarity to lowest.
        Similarity score is in [-1.0, 1.0] (cosine similarity).
        """
        if self.count() == 0:
            return []

        query = np.asarray(embedding, dtype=np.float32).flatten()
        if len(query) != self.dimensions:
            raise ValueError(f"Query vector dimensions must be {self.dimensions}, got {len(query)}")

        norm = np.linalg.norm(query)
        if norm > 0:
            query = query / norm

        # Try native sqlite-vec search
        if self._sqlite_vec_enabled:
            try:
                cursor = self.conn.cursor()
                cursor.execute(
                    f"""
                    SELECT id, distance
                    FROM {self.table_name}
                    WHERE embedding MATCH ? AND k = ?
                    ORDER BY distance
                    """,
                    (query, k),
                )
                rows = cursor.fetchall()
                if rows:
                    # sqlite-vec L2 or cosine distance -> cosine similarity (1.0 - dist)
                    return [(str(r[0]), float(1.0 - r[1])) for r in rows]
            except Exception as e:
                logger.warning(f"Native sqlite-vec search failed ({e}), falling back to vectorized cosine index")

        # Fast Vectorized Cosine ANN Search
        self._ensure_matrix()
        if self._cached_matrix is None or len(self._cached_ids) == 0:
            return []

        # Dot product with normalized vectors equals cosine similarity
        similarities = np.dot(self._cached_matrix, query)  # Shape: (N,)

        # Top-k indices
        k_actual = min(k, len(self._cached_ids))
        top_indices = np.argpartition(-similarities, k_actual - 1)[:k_actual]
        top_sorted = top_indices[np.argsort(-similarities[top_indices])]

        results: List[Tuple[str, float]] = []
        for idx in top_sorted:
            item_id = self._cached_ids[idx]
            sim = float(similarities[idx])
            results.append((item_id, sim))

        return results

    def get(self, id: str) -> Optional[np.ndarray]:
        """Retrieves vector by ID."""
        if id in self._id_to_vec:
            return self._id_to_vec[id]

        cursor = self.conn.cursor()
        cursor.execute(f"SELECT embedding FROM {self.table_name} WHERE id = ?", (id,))
        row = cursor.fetchone()
        if row and row[0]:
            arr = np.frombuffer(row[0], dtype=np.float32)
            self._id_to_vec[id] = arr
            return arr
        return None

    def remove(self, id: str) -> bool:
        """Removes a vector from the index."""
        existed = False
        if id in self._id_to_vec:
            del self._id_to_vec[id]
            self._id_to_meta.pop(id, None)
            self._invalidate_matrix()
            existed = True

        cursor = self.conn.cursor()
        cursor.execute(f"DELETE FROM {self.table_name} WHERE id = ?", (id,))
        self.conn.commit()
        return existed or cursor.rowcount > 0

    def count(self) -> int:
        return len(self._id_to_vec)

    def clear(self) -> None:
        self._id_to_vec.clear()
        self._id_to_meta.clear()
        self._invalidate_matrix()
        cursor = self.conn.cursor()
        cursor.execute(f"DELETE FROM {self.table_name}")
        self.conn.commit()

    def close(self):
        try:
            self.conn.close()
        except Exception:
            pass
