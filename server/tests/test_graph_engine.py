"""
Unit tests for Sloth Heterogeneous Hypergraph Recommendation Engine
Validates:
1. HeteroGraph 5-node schema and canonical relation definitions
2. SQLiteGraphBuilder directly reading tracks, artists, playlists, and listening_events
3. LightHGCN 2-layer convolution, 256-dim embeddings, and BPR loss
4. ContrastivePretrainer edge-dropout augmentation (p=0.2) and InfoNCE contrastive loss
5. GraphEmbeddingsStore SQLite BLOB serialization and fast cosine retrieval
6. GraphTrainingRunner end-to-end training and SSE event streaming
"""

import asyncio
import json
import sqlite3
import unittest
import numpy as np

from server.engine.graph import (
    CANONICAL_RELATIONS,
    CanonicalEdgeType,
    ContrastivePretrainer,
    GraphEmbeddingsStore,
    GraphTrainingRunner,
    HeteroGraphData,
    HeteroHypergraph,
    HeteroNodeType,
    LightHGCN,
    PRIMARY_NODE_TYPES,
    SQLiteGraphBuilder,
    deserialize_embedding,
    serialize_embedding,
)


def create_test_db() -> sqlite3.Connection:
    """Creates an in-memory SQLite database populated with test music data."""
    conn = sqlite3.connect(":memory:", check_same_thread=False)
    conn.row_factory = sqlite3.Row

    with conn:
        # 1. Artists
        conn.execute(
            """
            CREATE TABLE artists (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                genre_tags TEXT
            )
            """
        )
        conn.executemany(
            "INSERT INTO artists VALUES (?, ?, ?)",
            [
                ("artist_synth", "Neon Synth", json.dumps(["synthwave", "electronic", "retrowave"])),
                ("artist_retro", "Retro Wave", json.dumps(["synthwave", "cyberpunk"])),
                ("artist_ambient", "Deep Echo", json.dumps(["ambient", "drone", "meditation"])),
            ],
        )

        # 2. Albums
        conn.execute(
            """
            CREATE TABLE albums (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                artist_id TEXT
            )
            """
        )
        conn.execute(
            "INSERT INTO albums VALUES (?, ?, ?)",
            ("album_cyber", "Cyber Odyssey", "artist_synth"),
        )

        # 3. Tracks
        conn.execute(
            """
            CREATE TABLE tracks (
                id TEXT PRIMARY KEY,
                isrc TEXT,
                title TEXT NOT NULL,
                artist_id TEXT,
                album_id TEXT,
                duration_ms INTEGER,
                bpm REAL,
                key_sig TEXT,
                valence REAL,
                arousal REAL,
                mert_embedding BLOB,
                clap_embedding BLOB,
                play_count INTEGER DEFAULT 0,
                skip_count INTEGER DEFAULT 0,
                last_played_at INTEGER,
                source_url TEXT,
                created_at INTEGER
            )
            """
        )
        conn.executemany(
            """
            INSERT INTO tracks (id, title, artist_id, album_id, valence, arousal, duration_ms)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            [
                # High energy / high positivity (close mood pair)
                ("track_upbeat_1", "Neon City Lights", "artist_synth", "album_cyber", 0.82, 0.78, 210000),
                ("track_upbeat_2", "Midnight Cruise", "artist_retro", None, 0.85, 0.80, 195000),
                # Melancholy / low arousal
                ("track_somber_1", "Rainy Streets", "artist_synth", "album_cyber", 0.22, 0.25, 240000),
                # Deep ambient / low arousal
                ("track_ambient_1", "Subsurface Drone", "artist_ambient", None, 0.18, 0.20, 360000),
                ("track_indie_1", "Fading Shadows", "artist_retro", None, 0.50, 0.50, 180000),
            ],
        )

        # 4. Playlists
        conn.execute(
            """
            CREATE TABLE playlists (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                track_ids TEXT NOT NULL,
                created_at INTEGER,
                updated_at INTEGER
            )
            """
        )
        conn.execute(
            "INSERT INTO playlists VALUES (?, ?, ?, ?, ?, ?)",
            (
                "playlist_drive",
                "Late Night Drive",
                "Cruising through neon highway",
                json.dumps(["track_upbeat_1", "track_upbeat_2"]),
                1000,
                1000,
            ),
        )

        # 5. Listening Events
        conn.execute(
            """
            CREATE TABLE listening_events (
                id TEXT PRIMARY KEY,
                track_id TEXT NOT NULL,
                started_at INTEGER NOT NULL,
                ended_at INTEGER,
                skip_at_ms INTEGER,
                source TEXT,
                context_json TEXT
            )
            """
        )
        conn.executemany(
            """
            INSERT INTO listening_events (id, track_id, started_at, ended_at, skip_at_ms, source, context_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            [
                ("evt_1", "track_upbeat_1", 1000, 1210, None, "player", json.dumps({"time_of_day": "night", "mood": "energy"})),
                ("evt_2", "track_upbeat_2", 1220, 1415, None, "player", json.dumps({"time_of_day": "night", "mood": "energy"})),
                ("evt_3", "track_somber_1", 5000, 5010, 8000, "player", json.dumps({"time_of_day": "morning", "mood": "focus"})),  # Skipped
            ],
        )

    return conn


class TestHeteroSchema(unittest.TestCase):
    def test_node_types_and_canonical_relations(self):
        # 5 core node types
        self.assertIn(HeteroNodeType.USER, PRIMARY_NODE_TYPES)
        self.assertIn(HeteroNodeType.TRACK, PRIMARY_NODE_TYPES)
        self.assertIn(HeteroNodeType.ARTIST, PRIMARY_NODE_TYPES)
        self.assertIn(HeteroNodeType.PLAYLIST, PRIMARY_NODE_TYPES)
        self.assertIn(HeteroNodeType.CONTEXT, PRIMARY_NODE_TYPES)

        # Required canonical edges
        rel_set = set(CANONICAL_RELATIONS)
        self.assertIn(("user", "listened", "track"), rel_set)
        self.assertIn(("track", "in_playlist", "playlist"), rel_set)
        self.assertIn(("track", "by_artist", "artist"), rel_set)
        self.assertIn(("artist", "same_genre", "artist"), rel_set)
        self.assertIn(("track", "same_mood", "track"), rel_set)
        self.assertIn(("artist", "collaborated", "artist"), rel_set)
        self.assertIn(("user", "session_context", "context"), rel_set)


class TestSQLiteGraphBuilder(unittest.TestCase):
    def setUp(self):
        self.conn = create_test_db()
        self.builder = SQLiteGraphBuilder(self.conn)

    def tearDown(self):
        self.conn.close()

    def test_build_extracts_all_entities_and_relations(self):
        data = self.builder.build()

        self.assertIsInstance(data, HeteroGraphData)
        # 1 user, 5 tracks, 3 artists, 1 playlist, >=1 context
        self.assertEqual(data.get_num_nodes(HeteroNodeType.USER), 1)
        self.assertEqual(data.get_num_nodes(HeteroNodeType.TRACK), 5)
        self.assertEqual(data.get_num_nodes(HeteroNodeType.ARTIST), 3)
        self.assertEqual(data.get_num_nodes(HeteroNodeType.PLAYLIST), 1)
        self.assertGreaterEqual(data.get_num_nodes(HeteroNodeType.CONTEXT), 1)

        # Check by_artist edges exist
        src_by, dst_by, _ = data.canonical_edges[("track", "by_artist", "artist")]
        self.assertGreater(len(src_by), 0)

        # Check same_genre edges between artist_synth and artist_retro
        src_g, dst_g, w_g = data.canonical_edges[("artist", "same_genre", "artist")]
        self.assertGreater(len(src_g), 0)
        self.assertGreater(float(w_g[0]), 0.0)

        # Check same_mood edges between track_upbeat_1 and track_upbeat_2
        src_m, dst_m, w_m = data.canonical_edges[("track", "same_mood", "track")]
        self.assertGreater(len(src_m), 0)

        # Check listened edge with skip penalty
        src_l, dst_l, w_l = data.canonical_edges[("user", "listened", "track")]
        self.assertGreater(len(src_l), 0)
        # Skipped track should have lower weight
        self.assertTrue(any(w < 0.5 for w in w_l))

        # Check hyperedges generated (session and playlist)
        self.assertGreaterEqual(len(data.hyperedges), 1)
        edge_types = {e.edge_type for e in data.hyperedges}
        self.assertIn("playlist", edge_types)

    def test_dgl_graph_graceful_fallback(self):
        # Even if DGL is not installed, calling build_dgl_graph returns None without crashing
        g = self.builder.build_dgl_graph()
        # Returns either dgl.DGLGraph or None depending on environment
        self.assertTrue(g is None or hasattr(g, "nodes"))


class TestLightHGCN(unittest.TestCase):
    def setUp(self):
        self.conn = create_test_db()
        builder = SQLiteGraphBuilder(self.conn)
        graph_data = builder.build()
        self.graph = HeteroHypergraph.from_graph_data(graph_data)
        self.model = LightHGCN(
            graph=self.graph,
            embedding_dim=256,
            num_layers=2,
        )

    def tearDown(self):
        self.conn.close()

    def test_forward_pass_dimensions(self):
        embeddings = self.model.forward()
        self.assertEqual(embeddings.shape, (self.graph.num_nodes, 256))
        self.assertFalse(np.isnan(embeddings).any())

    def test_propagation_matrix_properties(self):
        M = self.model.get_propagation_matrix()
        self.assertEqual(M.shape, (self.graph.num_nodes, self.graph.num_nodes))
        # Symmetric
        np.testing.assert_allclose(M, M.T, atol=1e-5)

    def test_recommend_tracks(self):
        recs = self.model.recommend_tracks_for_user("user_primary", top_k=3)
        self.assertIsInstance(recs, list)
        self.assertLessEqual(len(recs), 3)
        for track_id, score in recs:
            self.assertIsInstance(track_id, str)
            self.assertIsInstance(score, float)

    def test_bpr_loss_and_gradient_step(self):
        users = ["user_primary", "user_primary"]
        pos = ["track_upbeat_1", "track_upbeat_2"]
        neg = ["track_ambient_1", "track_somber_1"]

        initial_loss, _ = self.model.bpr_loss(users, pos, neg)
        self.assertGreater(initial_loss, 0.0)

        # Run several BPR optimization steps
        for _ in range(5):
            self.model.fit_bpr_step(users, pos, neg, learning_rate=0.05)

        updated_loss, _ = self.model.bpr_loss(users, pos, neg)
        self.assertLess(updated_loss, initial_loss)


class TestContrastivePretrainer(unittest.TestCase):
    def setUp(self):
        self.conn = create_test_db()
        builder = SQLiteGraphBuilder(self.conn)
        graph_data = builder.build()
        self.graph = HeteroHypergraph.from_graph_data(graph_data)
        self.model = LightHGCN(
            graph=self.graph,
            embedding_dim=64,
            num_layers=2,
        )
        self.pretrainer = ContrastivePretrainer(
            model=self.model,
            dropout_rate=0.20,
            temperature=0.20,
            pretrain_epochs=5,  # Short for fast test
            finetune_epochs=3,
            batch_size=16,
            learning_rate=0.02,
        )

    def tearDown(self):
        self.conn.close()

    def test_edge_dropout_augmented_view(self):
        aug_view = self.pretrainer.create_augmented_view(p_drop=0.20)
        self.assertIsInstance(aug_view, HeteroHypergraph)
        self.assertEqual(aug_view.num_nodes, self.graph.num_nodes)

    def test_infonce_loss_math(self):
        N = 10
        D = 32
        z1 = np.random.randn(N, D).astype(np.float32)
        # Perfect agreement
        loss_identical, g1, g2 = self.pretrainer.compute_infonce_loss(z1, z1, temperature=0.2)
        # Perturbed view
        z2 = z1 + np.random.randn(N, D).astype(np.float32) * 2.0
        loss_perturbed, _, _ = self.pretrainer.compute_infonce_loss(z1, z2, temperature=0.2)

        self.assertLess(loss_identical, loss_perturbed)
        self.assertEqual(g1.shape, z1.shape)
        self.assertEqual(g2.shape, z2.shape)

    def test_training_pipeline_with_callback(self):
        callbacks_received = []

        def callback(m):
            callbacks_received.append(m)

        bpr_pairs = [("user_primary", "track_upbeat_1", "track_ambient_1")]
        results = self.pretrainer.train_pipeline(
            bpr_pairs=bpr_pairs,
            progress_callback=callback,
        )

        self.assertIn("final_pretrain_loss", results)
        self.assertGreaterEqual(len(callbacks_received), 5)
        phases = {m.phase for m in callbacks_received}
        self.assertIn("pretrain", phases)
        self.assertIn("completed", phases)


class TestGraphEmbeddingsStore(unittest.TestCase):
    def setUp(self):
        self.conn = create_test_db()
        self.store = GraphEmbeddingsStore(self.conn)

    def tearDown(self):
        self.conn.close()

    def test_serialization_and_deserialization(self):
        vec = np.random.randn(256).astype(np.float32)
        raw_bytes = serialize_embedding(vec)
        self.assertEqual(len(raw_bytes), 256 * 4)  # 1024 bytes

        unpacked = deserialize_embedding(raw_bytes, expected_dim=256)
        self.assertEqual(len(unpacked), 256)
        np.testing.assert_allclose(vec, unpacked, atol=1e-7)

    def test_save_and_retrieve_embeddings(self):
        v1 = np.random.randn(256).astype(np.float32)
        v2 = np.random.randn(256).astype(np.float32)

        self.store.save_node_embeddings({
            ("track", "track_upbeat_1"): v1,
            ("track", "track_ambient_1"): v2,
        })

        retrieved = self.store.get_node_embedding("track", "track_upbeat_1")
        self.assertIsNotNone(retrieved)
        np.testing.assert_allclose(v1, retrieved, atol=1e-6)

        all_tracks = self.store.get_all_embeddings("track")
        self.assertEqual(len(all_tracks), 2)
        self.assertIn("track_upbeat_1", all_tracks)

    def test_nearest_neighbor_search(self):
        target = np.zeros(256, dtype=np.float32)
        target[0] = 1.0  # Unit vector on axis 0

        close = target + np.random.randn(256).astype(np.float32) * 0.05
        far = np.zeros(256, dtype=np.float32)
        far[1] = 1.0  # Orthogonal

        self.store.save_node_embeddings({
            ("track", "close_track"): close,
            ("track", "far_track"): far,
        })

        neighbors = self.store.find_nearest_neighbors(target, node_type="track", top_k=2)
        self.assertEqual(len(neighbors), 2)
        self.assertEqual(neighbors[0][0], "close_track")
        self.assertGreater(neighbors[0][1], neighbors[1][1])


class TestGraphTrainingRunner(unittest.TestCase):
    def setUp(self):
        self.conn = create_test_db()
        self.runner = GraphTrainingRunner(
            db_path_or_conn=self.conn,
            embedding_dim=64,
            num_layers=2,
            pretrain_epochs=3,
            finetune_epochs=2,
            batch_size=8,
        )

    def tearDown(self):
        self.conn.close()

    def test_sync_training_flow(self):
        result = self.runner.run_training_sync()
        self.assertIn("tracks_embedded", result)
        self.assertIn("nodes_saved", result)
        self.assertGreater(result["tracks_embedded"], 0)

    def test_sse_streaming_events(self):
        async def run_stream():
            events = []
            async for ev in self.runner.stream_training_events():
                events.append(ev)
                if len(events) >= 5:
                    break
            return events

        events = asyncio.run(run_stream())
        self.assertGreaterEqual(len(events), 1)
        for ev in events:
            self.assertTrue(ev.startswith("data: "))
            self.assertTrue(ev.endswith("\n\n"))
            parsed = json.loads(ev[6:].strip())
            self.assertIn("phase", parsed)


if __name__ == "__main__":
    unittest.main()
