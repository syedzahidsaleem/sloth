"""
Unit tests for Sloth Gated Fusion, Feedback Dispatcher, and Unified Recommender Engine
Tests:
- GatingNetwork architecture, Softmax sum-to-1 constraint, and inductive bias shifts
- FeedbackDispatcher reward computation and state updates (bandit, mood, BPR)
- SLOTHRecommender 6-stage recommendation and mood arc playlist generation
- Performance SLA validation (/recommend < 200ms, /feedback < 20ms, /playlist/generate < 2s)
- FastAPI endpoints via TestClient (/recommend, /feedback, /playlist/generate, /status, /reindex)
"""

import os
import tempfile
import time
import unittest
import numpy as np
from fastapi.testclient import TestClient

from server.engine.main import app
from server.engine.fusion import (
    FusionContext,
    GatingNetwork,
    ScoringLayer,
    SCORING_LAYERS,
)
from server.engine.feedback import (
    FeedbackDispatcher,
    FeedbackEvent,
    FeedbackEventType,
)
from server.engine.recommender import (
    ENGINE_VERSION,
    RecommendedTrack,
    SLOTHRecommender,
)
from server.engine.api import get_recommender, set_recommender


class TestGatingNetwork(unittest.TestCase):
    def setUp(self):
        self.gating = GatingNetwork(in_features=6, hidden_dim=32, out_features=6, seed=42)

    def test_forward_output_shape_and_sum(self):
        ctx = FusionContext(is_new_user=False, mode="focus", session_depth=5)
        weights = self.gating.compute_weights(ctx)
        self.assertEqual(len(weights), 6)
        total = sum(weights.values())
        self.assertAlmostEqual(total, 1.0, places=5)
        for layer, w in weights.items():
            self.assertGreater(w, 0.0)
            self.assertLess(w, 1.0)

    def test_new_user_bias(self):
        ctx_new = FusionContext(is_new_user=True, mode=None)
        ctx_existing = FusionContext(is_new_user=False, mode=None)

        w_new = self.gating.compute_weights(ctx_new)
        w_exist = self.gating.compute_weights(ctx_existing)

        # For new users, bandit and meld heuristics should have higher weight than for existing users
        self.assertGreater(w_new["bandit"], w_exist["bandit"])
        self.assertGreater(w_new["meld"], w_exist["meld"])
        # Collaborative graph should be lower for new users
        self.assertLess(w_new["graph"], w_exist["graph"])

    def test_mode_and_deep_session_bias(self):
        ctx_focus = FusionContext(mode="focus", session_depth=0)
        ctx_default = FusionContext(mode=None, session_depth=0)

        w_focus = self.gating.compute_weights(ctx_focus)
        w_default = self.gating.compute_weights(ctx_default)
        self.assertGreater(w_focus["acoustic"], w_default["acoustic"])

        # Deep session: sequential and memory boosted
        ctx_deep = FusionContext(session_depth=25)
        w_deep = self.gating.compute_weights(ctx_deep)
        self.assertGreater(w_deep["sequential"], w_default["sequential"])
        self.assertGreater(w_deep["memory"], w_default["memory"])

    def test_fuse_scores(self):
        scores = {
            "graph": np.array([0.8, 0.4]),
            "sequential": np.array([0.5, 0.9]),
            "memory": np.array([0.2, 0.3]),
            "acoustic": np.array([0.7, 0.6]),
            "meld": np.array([0.9, 0.1]),
            "bandit": np.array([0.4, 0.5]),
        }
        w = {
            "graph": 0.3,
            "sequential": 0.2,
            "memory": 0.1,
            "acoustic": 0.1,
            "meld": 0.2,
            "bandit": 0.1,
        }
        fused = self.gating.fuse_scores(scores, w)
        self.assertEqual(len(fused), 2)
        expected_0 = 0.3 * 0.8 + 0.2 * 0.5 + 0.1 * 0.2 + 0.1 * 0.7 + 0.2 * 0.9 + 0.1 * 0.4
        self.assertAlmostEqual(fused[0], expected_0, places=4)


class TestFeedbackDispatcher(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.temp_dir.name, "test_feedback.db")
        self.dispatcher = FeedbackDispatcher(db_path=self.db_path)

    def tearDown(self):
        try:
            self.temp_dir.cleanup()
        except Exception:
            pass

    def test_reward_values(self):
        # listen_through -> +1.0
        ev_listen = FeedbackEvent(user_id="u1", track_id="t1", event_type="listen_through")
        self.assertEqual(ev_listen.calculate_reward(), 1.0)

        # early_skip -> -0.5
        ev_skip = FeedbackEvent(user_id="u1", track_id="t1", event_type="early_skip")
        self.assertEqual(ev_skip.calculate_reward(), -0.5)

        # save / favorite -> +2.0
        ev_save = FeedbackEvent(user_id="u1", track_id="t1", event_type="save")
        self.assertEqual(ev_save.calculate_reward(), 2.0)

        ev_fav = FeedbackEvent(user_id="u1", track_id="t1", event_type="favorite")
        self.assertEqual(ev_fav.calculate_reward(), 2.0)

        # dislike -> -1.5
        ev_dis = FeedbackEvent(user_id="u1", track_id="t1", event_type="dislike")
        self.assertEqual(ev_dis.calculate_reward(), -1.5)

    def test_process_feedback_sync_latency(self):
        ev = FeedbackEvent(
            user_id="user_test",
            track_id="track_123",
            event_type="listen_through",
            genre="electronic",
            valence=0.75,
            arousal=0.82,
        )
        res = self.dispatcher.process_feedback_sync(ev)
        self.assertEqual(res["status"], "processed")
        self.assertEqual(res["reward"], 1.0)
        # Verify sub-20ms SLA
        self.assertLess(res["latency_ms"], 20.0)

        # Check mood memory updated
        moods = self.dispatcher.get_user_recent_moods("user_test")
        self.assertEqual(len(moods), 1)
        self.assertEqual(moods[0].track_id, "track_123")
        self.assertAlmostEqual(moods[0].valence, 0.75, places=2)

    def test_persist_feedback_background(self):
        ev = FeedbackEvent(
            user_id="u_bg",
            track_id="t_bg",
            event_type="save",
            genre="indie",
            valence=0.6,
            arousal=0.4,
        )
        # Synchronous queue
        self.dispatcher.process_feedback_sync(ev)
        # Background write
        self.dispatcher.persist_feedback_background(ev, reward=2.0)

        # Verify mood query from DB
        moods = self.dispatcher.get_user_recent_moods("u_bg")
        self.assertEqual(len(moods), 1)


class TestSLOTHRecommender(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.temp_dir.name, "test_rec.db")
        self.recommender = SLOTHRecommender(db_path=self.db_path)

    def tearDown(self):
        try:
            self.temp_dir.cleanup()
        except Exception:
            pass

    def test_initial_catalog_indexed(self):
        status = self.recommender.get_status()
        self.assertEqual(status["status"], "online")
        self.assertGreaterEqual(status["indexed_tracks"], 100)
        self.assertGreaterEqual(status["faiss_indexed_count"], 100)
        self.assertEqual(status["version"], ENGINE_VERSION)

    def test_recommend_flow_and_sla(self):
        t0 = time.perf_counter()
        res = self.recommender.recommend(
            user_id="user_listener",
            count=15,
            mode="focus",
            alpha=0.6,
        )
        elapsed_ms = (time.perf_counter() - t0) * 1000.0

        # Verify SLA: < 200ms
        self.assertLess(elapsed_ms, 200.0)
        self.assertEqual(res["user_id"], "user_listener")
        self.assertEqual(res["mode"], "focus")
        self.assertEqual(res["discovery_alpha"], 0.6)
        self.assertIn("gating_weights", res)
        self.assertLessEqual(len(res["recommendations"]), 15)
        self.assertGreaterEqual(len(res["recommendations"]), 5)

        first_track = res["recommendations"][0]
        self.assertIn("track_id", first_track)
        self.assertIn("title", first_track)
        self.assertIn("artist", first_track)
        self.assertIn("score", first_track)

    def test_generate_playlist_and_sla(self):
        t0 = time.perf_counter()
        res = self.recommender.generate_playlist(
            preset="Focus",
            start_mood={"valence": 0.4, "arousal": 0.4},
            target_mood={"valence": 0.6, "arousal": 0.7},
            track_count=20,
        )
        elapsed_ms = (time.perf_counter() - t0) * 1000.0

        # Verify SLA: < 2000ms
        self.assertLess(elapsed_ms, 2000.0)
        self.assertEqual(res["track_count"], 20)
        self.assertEqual(len(res["tracks"]), 20)
        self.assertEqual(len(res["waypoints"]), 20)
        self.assertIn("coherence", res)
        self.assertIn("mean_bpm_delta", res["coherence"])
        self.assertIn("harmonic_compliance_rate", res["coherence"])


class TestEngineAPIEndpoints(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.temp_dir.name, "test_api.db")
        self.recommender = SLOTHRecommender(db_path=self.db_path)
        set_recommender(self.recommender)
        self.client = TestClient(app)

    def tearDown(self):
        try:
            self.temp_dir.cleanup()
        except Exception:
            pass

    def test_status_endpoint(self):
        for route in ("/status", "/api/engine/status"):
            res = self.client.get(route)
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertEqual(data["status"], "online")
            self.assertEqual(data["service"], "sloth-engine")
            self.assertIn("v0.1.0-hybrid", data["version"])

    def test_recommend_endpoint_performance(self):
        t0 = time.perf_counter()
        res = self.client.get(
            "/recommend",
            params={
                "user_id": "api_test_user",
                "count": 10,
                "mode": "chill",
                "alpha": 0.5,
            },
        )
        elapsed_ms = (time.perf_counter() - t0) * 1000.0

        self.assertEqual(res.status_code, 200)
        self.assertLess(elapsed_ms, 200.0)  # SLA < 200ms
        data = res.json()
        self.assertEqual(data["user_id"], "api_test_user")
        self.assertEqual(len(data["recommendations"]), 10)
        self.assertIn("gating_weights", data)

    def test_feedback_endpoint_performance(self):
        payload = {
            "user_id": "test_user_fb",
            "track_id": "track_0042",
            "event_type": "listen_through",
            "duration_ms": 210000,
            "position_ms": 200000,
            "genre": "electronic",
            "valence": 0.8,
            "arousal": 0.7,
        }
        t0 = time.perf_counter()
        res = self.client.post("/feedback", json=payload)
        elapsed_ms = (time.perf_counter() - t0) * 1000.0

        self.assertEqual(res.status_code, 200)
        self.assertLess(elapsed_ms, 50.0)  # API roundtrip fast, processing < 20ms
        data = res.json()
        self.assertEqual(data["status"], "processed")
        self.assertEqual(data["reward"], 1.0)
        self.assertLess(data["latency_ms"], 20.0)

    def test_playlist_generate_endpoint_performance(self):
        payload = {
            "preset": "Wind Down",
            "start_mood": {"valence": 0.7, "arousal": 0.8},
            "target_mood": {"valence": 0.3, "arousal": 0.2},
            "track_count": 20,
        }
        t0 = time.perf_counter()
        res = self.client.post("/playlist/generate", json=payload)
        elapsed_ms = (time.perf_counter() - t0) * 1000.0

        self.assertEqual(res.status_code, 200)
        self.assertLess(elapsed_ms, 2000.0)  # SLA < 2.0s
        data = res.json()
        self.assertEqual(data["track_count"], 20)
        self.assertEqual(len(data["tracks"]), 20)
        self.assertIn("coherence", data)

    def test_reindex_endpoint(self):
        res_get = self.client.get("/reindex")
        self.assertEqual(res_get.status_code, 200)
        data_get = res_get.json()
        self.assertEqual(data_get["status"], "reindexed")
        self.assertGreaterEqual(data_get["tracks_indexed"], 50)

        res_post = self.client.post("/reindex")
        self.assertEqual(res_post.status_code, 200)
        data_post = res_post.json()
        self.assertEqual(data_post["status"], "reindexed")


if __name__ == "__main__":
    unittest.main()
