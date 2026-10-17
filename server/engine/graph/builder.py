"""
Sloth Graph Engine - SQLite Graph Builder
Constructs heterogeneous 5-node graph and hypergraph incidence structures directly
from local SQLite tables: tracks, artists, playlists, and listening_events.

Extracts:
  - Canonical Relations:
    * (user, listened, track) / (track, listened_by, user)
    * (track, in_playlist, playlist) / (playlist, contains_track, track)
    * (track, by_artist, artist) / (artist, created_track, track)
    * (artist, same_genre, artist)
    * (track, same_mood, track) (via valence/arousal Euclidean proximity)
    * (artist, collaborated, artist)
    * (user, session_context, context) / (context, context_of, track)
  - Hyperedges:
    * Sessions: User + Context + Tracks in 30-minute listening sessions
    * Playlists: Playlist + User + member tracks
    * Albums: Album + Artist + member tracks
"""

from __future__ import annotations

import json
import math
import sqlite3
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set, Tuple, Union
import numpy as np

from .schema import (
    CANONICAL_RELATIONS,
    CanonicalEdge,
    CanonicalEdgeType,
    HeteroGraphMeta,
    HeteroNodeType,
    Hyperedge,
    PRIMARY_NODE_TYPES,
)


@dataclass
class HeteroGraphData:
    """
    Standardized in-memory container for heterogeneous graph nodes,
    canonical relation edges, and hyperedge incidence structures.
    """
    # Per-node-type ID mappings: node_type -> {external_id: int_index}
    node_id_to_idx: Dict[str, Dict[str, int]] = field(default_factory=dict)
    # Per-node-type reverse mappings: node_type -> {int_index: external_id}
    idx_to_node_id: Dict[str, Dict[int, str]] = field(default_factory=dict)
    # Global flat node index mappings: (node_type, external_id) <-> global_idx
    global_node_to_idx: Dict[Tuple[str, str], int] = field(default_factory=dict)
    global_idx_to_node: Dict[int, Tuple[str, str]] = field(default_factory=dict)

    # Relation edges: (src_type, etype, dst_type) -> (src_indices, dst_indices, weights)
    canonical_edges: Dict[Tuple[str, str, str], Tuple[np.ndarray, np.ndarray, np.ndarray]] = field(
        default_factory=dict
    )

    # Hyperedges
    hyperedges: List[Hyperedge] = field(default_factory=list)

    # Graph metadata
    meta: HeteroGraphMeta = field(default_factory=HeteroGraphMeta)

    def get_num_nodes(self, node_type: Union[str, HeteroNodeType]) -> int:
        n_type = str(node_type.value if isinstance(node_type, HeteroNodeType) else node_type)
        return len(self.node_id_to_idx.get(n_type, {}))

    @property
    def total_nodes(self) -> int:
        return len(self.global_node_to_idx)

    @property
    def total_hyperedges(self) -> int:
        return len(self.hyperedges)


class SQLiteGraphBuilder:
    """
    Reads SQLite database and constructs the 5-node HeteroGraph structure.
    """

    def __init__(
        self,
        db_path_or_conn: Union[str, sqlite3.Connection],
        default_user_id: str = "user_primary",
        mood_distance_threshold: float = 0.20,
        max_mood_neighbors: int = 5,
        session_window_seconds: int = 1800,  # 30 minutes
    ):
        self.db_path_or_conn = db_path_or_conn
        self.default_user_id = default_user_id
        self.mood_distance_threshold = mood_distance_threshold
        self.max_mood_neighbors = max_mood_neighbors
        self.session_window_seconds = session_window_seconds

    def _get_connection(self) -> sqlite3.Connection:
        if isinstance(self.db_path_or_conn, sqlite3.Connection):
            return self.db_path_or_conn
        conn = sqlite3.connect(self.db_path_or_conn, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def build(self) -> HeteroGraphData:
        """
        Executes SQL queries to extract nodes, edges, and hyperedges,
        returning a compiled HeteroGraphData instance.
        """
        conn = self._get_connection()
        close_needed = not isinstance(self.db_path_or_conn, sqlite3.Connection)

        try:
            # 1. Initialize node registries
            node_id_to_idx: Dict[str, Dict[str, int]] = {
                t.value: {} for t in HeteroNodeType
            }
            idx_to_node_id: Dict[str, Dict[int, str]] = {
                t.value: {} for t in HeteroNodeType
            }
            global_node_to_idx: Dict[Tuple[str, str], int] = {}
            global_idx_to_node: Dict[int, Tuple[str, str]] = {}

            def register_node(n_type: str, ext_id: str) -> Tuple[int, int]:
                """Registers node in both type-local and global namespaces."""
                ext_id = str(ext_id)
                # Local index
                if ext_id not in node_id_to_idx[n_type]:
                    local_idx = len(node_id_to_idx[n_type])
                    node_id_to_idx[n_type][ext_id] = local_idx
                    idx_to_node_id[n_type][local_idx] = ext_id
                else:
                    local_idx = node_id_to_idx[n_type][ext_id]

                # Global index
                g_key = (n_type, ext_id)
                if g_key not in global_node_to_idx:
                    g_idx = len(global_node_to_idx)
                    global_node_to_idx[g_key] = g_idx
                    global_idx_to_node[g_idx] = g_key
                else:
                    g_idx = global_node_to_idx[g_key]

                return local_idx, g_idx

            # Always register default user
            register_node(HeteroNodeType.USER.value, self.default_user_id)

            # Raw edges collector: (src_type, etype, dst_type) -> list of (src_local, dst_local, weight)
            raw_edges: Dict[Tuple[str, str, str], List[Tuple[int, int, float]]] = {
                rel: [] for rel in CANONICAL_RELATIONS
            }
            hyperedges: List[Hyperedge] = []

            cursor = conn.cursor()

            # 2. Extract Artists & Genres
            cursor.execute(
                "SELECT id, name, genre_tags FROM artists"
            )
            artist_rows = cursor.fetchall()
            artist_genres: Dict[str, List[str]] = {}
            for r in artist_rows:
                a_id = str(r["id"] if isinstance(r, sqlite3.Row) else r[0])
                raw_tags = r["genre_tags"] if isinstance(r, sqlite3.Row) else r[2]
                genres = []
                if raw_tags:
                    try:
                        genres = json.loads(raw_tags) if isinstance(raw_tags, str) else list(raw_tags)
                    except Exception:
                        genres = [str(raw_tags)]
                artist_genres[a_id] = [g.lower().strip() for g in genres if g]
                register_node(HeteroNodeType.ARTIST.value, a_id)

            # Artist-to-artist same_genre edges
            artist_ids = list(artist_genres.keys())
            for i in range(len(artist_ids)):
                for j in range(i + 1, len(artist_ids)):
                    a1 = artist_ids[i]
                    a2 = artist_ids[j]
                    s1 = set(artist_genres[a1])
                    s2 = set(artist_genres[a2])
                    if s1 and s2:
                        inter = len(s1.intersection(s2))
                        if inter > 0:
                            union = len(s1.union(s2))
                            jaccard = inter / union
                            idx1 = node_id_to_idx[HeteroNodeType.ARTIST.value][a1]
                            idx2 = node_id_to_idx[HeteroNodeType.ARTIST.value][a2]
                            raw_edges[("artist", "same_genre", "artist")].append(
                                (idx1, idx2, float(jaccard))
                            )
                            raw_edges[("artist", "same_genre", "artist")].append(
                                (idx2, idx1, float(jaccard))
                            )

            # 3. Extract Tracks & Moods
            cursor.execute(
                "SELECT id, artist_id, album_id, valence, arousal, duration_ms, play_count, skip_count FROM tracks"
            )
            track_rows = cursor.fetchall()
            track_moods: Dict[str, Tuple[float, float]] = {}
            artist_track_count: Dict[str, List[str]] = {}

            for r in track_rows:
                t_id = str(r["id"] if isinstance(r, sqlite3.Row) else r[0])
                art_id = str(r["artist_id"] if isinstance(r, sqlite3.Row) else r[1]) if (r["artist_id"] if isinstance(r, sqlite3.Row) else r[1]) else None
                alb_id = str(r["album_id"] if isinstance(r, sqlite3.Row) else r[2]) if (r["album_id"] if isinstance(r, sqlite3.Row) else r[2]) else None
                val = r["valence"] if isinstance(r, sqlite3.Row) else r[3]
                aro = r["arousal"] if isinstance(r, sqlite3.Row) else r[4]

                t_loc, _ = register_node(HeteroNodeType.TRACK.value, t_id)

                if art_id:
                    a_loc, _ = register_node(HeteroNodeType.ARTIST.value, art_id)
                    raw_edges[("track", "by_artist", "artist")].append((t_loc, a_loc, 1.0))
                    raw_edges[("artist", "created_track", "track")].append((a_loc, t_loc, 1.0))
                    artist_track_count.setdefault(art_id, []).append(t_id)

                if alb_id:
                    alb_loc, _ = register_node(HeteroNodeType.ALBUM.value, alb_id)
                    raw_edges[("track", "in_album", "album")].append((t_loc, alb_loc, 1.0))
                    raw_edges[("album", "has_track", "track")].append((alb_loc, t_loc, 1.0))
                    if art_id:
                        raw_edges[("album", "by_artist", "artist")].append((alb_loc, a_loc, 1.0))

                if val is not None and aro is not None:
                    try:
                        v_f = float(val)
                        a_f = float(aro)
                        track_moods[t_id] = (v_f, a_f)
                    except (ValueError, TypeError):
                        pass

            # Track same_mood edges (k-nearest mood neighbors within threshold)
            mood_tracks = list(track_moods.keys())
            if len(mood_tracks) > 1:
                coords = np.array([track_moods[tid] for tid in mood_tracks], dtype=np.float32)
                for i, tid1 in enumerate(mood_tracks):
                    diffs = coords - coords[i]
                    dists = np.sqrt(np.sum(diffs**2, axis=1))
                    # Mask self
                    dists[i] = 1e9
                    close_mask = dists < self.mood_distance_threshold
                    valid_indices = np.where(close_mask)[0]
                    if len(valid_indices) > 0:
                        # Top-k closest
                        if len(valid_indices) > self.max_mood_neighbors:
                            sorted_order = np.argsort(dists[valid_indices])[:self.max_mood_neighbors]
                            chosen = valid_indices[sorted_order]
                        else:
                            chosen = valid_indices

                        t1_loc = node_id_to_idx[HeteroNodeType.TRACK.value][tid1]
                        for c_idx in chosen:
                            tid2 = mood_tracks[c_idx]
                            d = dists[c_idx]
                            t2_loc = node_id_to_idx[HeteroNodeType.TRACK.value][tid2]
                            w = float(max(0.1, 1.0 - (d / self.mood_distance_threshold)))
                            raw_edges[("track", "same_mood", "track")].append((t1_loc, t2_loc, w))

            # 4. Extract Playlists
            cursor.execute("SELECT id, name, track_ids FROM playlists")
            playlist_rows = cursor.fetchall()
            for r in playlist_rows:
                p_id = str(r["id"] if isinstance(r, sqlite3.Row) else r[0])
                raw_tids = r["track_ids"] if isinstance(r, sqlite3.Row) else r[2]
                tids: List[str] = []
                if raw_tids:
                    try:
                        tids = json.loads(raw_tids) if isinstance(raw_tids, str) else list(raw_tids)
                    except Exception:
                        tids = []

                p_loc, _ = register_node(HeteroNodeType.PLAYLIST.value, p_id)
                pl_hyperedge = Hyperedge(
                    id=f"pl_{p_id}",
                    edge_type="playlist",
                    weight=1.2,
                )
                pl_hyperedge.add_node(HeteroNodeType.PLAYLIST, p_id)

                for tid in tids:
                    tid_str = str(tid)
                    if tid_str in node_id_to_idx[HeteroNodeType.TRACK.value]:
                        t_loc = node_id_to_idx[HeteroNodeType.TRACK.value][tid_str]
                        raw_edges[("track", "in_playlist", "playlist")].append((t_loc, p_loc, 1.0))
                        raw_edges[("playlist", "contains_track", "track")].append((p_loc, t_loc, 1.0))
                        pl_hyperedge.add_node(HeteroNodeType.TRACK, tid_str)

                if len(pl_hyperedge.nodes) > 1:
                    hyperedges.append(pl_hyperedge)

            # 5. Extract Listening Events
            cursor.execute(
                """
                SELECT id, track_id, started_at, ended_at, skip_at_ms, source, context_json
                FROM listening_events
                ORDER BY started_at ASC
                """
            )
            event_rows = cursor.fetchall()
            current_session_tracks: List[str] = []
            current_session_context: Optional[str] = None
            last_timestamp: int = 0

            for r in event_rows:
                t_id = str(r["track_id"] if isinstance(r, sqlite3.Row) else r[1])
                started_at = int(r["started_at"] if isinstance(r, sqlite3.Row) else r[2] or 0)
                skip_at_ms = r["skip_at_ms"] if isinstance(r, sqlite3.Row) else r[4]
                raw_ctx = r["context_json"] if isinstance(r, sqlite3.Row) else r[6]

                # Parse context
                ctx_name = "default_context"
                if raw_ctx:
                    try:
                        c_dict = json.loads(raw_ctx) if isinstance(raw_ctx, str) else dict(raw_ctx)
                        # Extract session context string
                        parts = []
                        if "time_of_day" in c_dict:
                            parts.append(str(c_dict["time_of_day"]))
                        if "mood" in c_dict:
                            parts.append(str(c_dict["mood"]))
                        if "activity" in c_dict:
                            parts.append(str(c_dict["activity"]))
                        if parts:
                            ctx_name = "_".join(parts)
                    except Exception:
                        pass

                ctx_loc, _ = register_node(HeteroNodeType.CONTEXT.value, ctx_name)
                u_loc = node_id_to_idx[HeteroNodeType.USER.value][self.default_user_id]

                # User session_context edge
                raw_edges[("user", "session_context", "context")].append((u_loc, ctx_loc, 1.0))

                # User listened track edge
                if t_id in node_id_to_idx[HeteroNodeType.TRACK.value]:
                    t_loc = node_id_to_idx[HeteroNodeType.TRACK.value][t_id]
                    # Compute listen quality weight (penalize instant skips)
                    weight = 1.0
                    if skip_at_ms is not None and int(skip_at_ms) < 15000:
                        weight = 0.2
                    elif skip_at_ms is not None and int(skip_at_ms) < 30000:
                        weight = 0.5
                    else:
                        weight = 1.0

                    raw_edges[("user", "listened", "track")].append((u_loc, t_loc, weight))
                    raw_edges[("track", "listened_by", "user")].append((t_loc, u_loc, weight))

                    # Context of track
                    raw_edges[("context", "context_of", "track")].append((ctx_loc, t_loc, weight))

                # Session Hyperedge grouping
                if last_timestamp > 0 and (started_at - last_timestamp) > self.session_window_seconds:
                    # Flush previous session hyperedge
                    if len(current_session_tracks) >= 2:
                        s_edge = Hyperedge(
                            id=f"session_{last_timestamp}",
                            edge_type="session",
                            weight=1.0,
                        )
                        s_edge.add_node(HeteroNodeType.USER, self.default_user_id)
                        if current_session_context:
                            s_edge.add_node(HeteroNodeType.CONTEXT, current_session_context)
                        for st in set(current_session_tracks):
                            s_edge.add_node(HeteroNodeType.TRACK, st)
                        hyperedges.append(s_edge)
                    current_session_tracks = []

                current_session_tracks.append(t_id)
                current_session_context = ctx_name
                last_timestamp = started_at

            # Final session hyperedge
            if len(current_session_tracks) >= 2:
                s_edge = Hyperedge(
                    id=f"session_{last_timestamp}",
                    edge_type="session",
                    weight=1.0,
                )
                s_edge.add_node(HeteroNodeType.USER, self.default_user_id)
                if current_session_context:
                    s_edge.add_node(HeteroNodeType.CONTEXT, current_session_context)
                for st in set(current_session_tracks):
                    s_edge.add_node(HeteroNodeType.TRACK, st)
                hyperedges.append(s_edge)

            # 6. Convert edge lists to NumPy arrays
            canonical_edges: Dict[Tuple[str, str, str], Tuple[np.ndarray, np.ndarray, np.ndarray]] = {}
            total_edges = 0
            edges_by_rel: Dict[Tuple[str, str, str], int] = {}

            for rel, edge_list in raw_edges.items():
                if edge_list:
                    src_arr = np.array([e[0] for e in edge_list], dtype=np.int64)
                    dst_arr = np.array([e[1] for e in edge_list], dtype=np.int64)
                    w_arr = np.array([e[2] for e in edge_list], dtype=np.float32)
                else:
                    src_arr = np.empty(0, dtype=np.int64)
                    dst_arr = np.empty(0, dtype=np.int64)
                    w_arr = np.empty(0, dtype=np.float32)

                canonical_edges[rel] = (src_arr, dst_arr, w_arr)
                edges_by_rel[rel] = len(src_arr)
                total_edges += len(src_arr)

            nodes_by_type = {t: len(node_id_to_idx[t]) for t in node_id_to_idx}

            meta = HeteroGraphMeta(
                num_nodes_by_type=nodes_by_type,
                num_edges_by_relation=edges_by_rel,
                num_hyperedges=len(hyperedges),
                total_nodes=len(global_node_to_idx),
                total_edges=total_edges,
            )

            return HeteroGraphData(
                node_id_to_idx=node_id_to_idx,
                idx_to_node_id=idx_to_node_id,
                global_node_to_idx=global_node_to_idx,
                global_idx_to_node=global_idx_to_node,
                canonical_edges=canonical_edges,
                hyperedges=hyperedges,
                meta=meta,
            )

        finally:
            if close_needed:
                conn.close()

    def build_dgl_graph(self, graph_data: Optional[HeteroGraphData] = None) -> Any:
        """
        Builds a DGL HeteroGraph object from graph data if DGL is installed.
        Returns the dgl.heterograph instance or None if dgl is unavailable.
        """
        data = graph_data or self.build()
        try:
            import dgl  # type: ignore
            import torch  # type: ignore

            dgl_dict = {}
            for rel, (src_arr, dst_arr, _) in data.canonical_edges.items():
                if len(src_arr) > 0:
                    dgl_dict[rel] = (torch.tensor(src_arr, dtype=torch.int64), torch.tensor(dst_arr, dtype=torch.int64))
                else:
                    dgl_dict[rel] = (torch.empty(0, dtype=torch.int64), torch.empty(0, dtype=torch.int64))

            num_nodes_dict = {
                t: data.get_num_nodes(t)
                for t in PRIMARY_NODE_TYPES
            }

            g = dgl.heterograph(dgl_dict, num_nodes_dict=num_nodes_dict)
            return g
        except ImportError:
            return None
