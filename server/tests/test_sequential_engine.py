"""
Unit tests for Sloth Sequential & Context Recommendation Engine
Validates:
1. BERT4Rec bidirectional transformer (last 50 tracks, 2 layers, 4 heads, d_model=256, Cloze masking)
2. ACT-R Cognitive Memory: A(t) = log(n) - 1.0 * log(delta_t_hours + 1)
3. Repeat vs Rediscovery Candidate Classification
4. Mode Detector Logistic Regression (Comfort vs Exploration) & Gating Weights (0.6/0.4 vs 0.3/0.7)
5. Context Encoder MLP (hour sin/cos, day_type, activity, ambient, weather, valence/arousal -> 128-dim)
6. Mood Trajectory GRU (14-day event sequence -> predicted valence/arousal)
"""

import math
import unittest
import numpy as np

from server.engine.sequential import (
    ACTRMemoryEngine,
    BERT4Rec,
    BERT4RecConfig,
    ContextEncoder,
    ContextFeatures,
    DailyMoodSummary,
    MemoryCandidateType,
    ModeDetector,
    ModeType,
    MoodTrajectoryPredictor,
    TrackMemoryRecord,
)


class TestBERT4RecSequential(unittest.TestCase):
    def setUp(self):
        self.config = BERT4RecConfig(
            max_len=50,
            hidden_dim=256,
            num_heads=4,
            num_blocks=2,
            vocab_size=1000,
            mask_prob=0.15,
        )
        self.bert = BERT4Rec(self.config)

    def test_architecture_dimensions(self):
        self.assertEqual(self.bert.config.max_len, 50)
        self.assertEqual(self.bert.config.hidden_dim, 256)
        self.assertEqual(self.bert.config.num_heads, 4)
        self.assertEqual(self.bert.config.num_blocks, 2)
        self.assertEqual(len(self.bert.blocks), 2)

        # Check embedding tables
        self.assertEqual(self.bert.token_embeddings.shape, (1000, 256))
        self.assertEqual(self.bert.pos_embeddings.shape, (50, 256))

    def test_encode_track_sequence_window_50(self):
        # Sequence of 60 tracks (should be truncated to last 50)
        history = [f"track_{i}" for i in range(60)]
        emb = self.bert.encode_track_sequence(history)

        self.assertEqual(emb.shape, (256,))
        self.assertFalse(np.isnan(emb).any())
        self.assertFalse(np.all(emb == 0.0))

    def test_cloze_masking_probabilities(self):
        seq = list(range(1, 21))  # 20 non-zero tokens
        masked_seq, masked_pos, targets = self.bert.apply_cloze_mask(seq)

        self.assertEqual(len(masked_seq), len(seq))
        self.assertGreater(len(masked_pos), 0)
        for pos in masked_pos:
            self.assertIn(pos, range(len(seq)))

    def test_predict_next_candidates_ranking(self):
        history = ["synth_1", "synth_2", "synth_3"]
        candidates = ["synth_4", "rock_1", "ambient_1"]

        ranked = self.bert.predict_next_candidates(history, candidates, top_k=2)
        self.assertEqual(len(ranked), 2)
        # Monotonically decreasing scores
        self.assertGreaterEqual(ranked[0][1], ranked[1][1])


class TestACTRMemoryActivation(unittest.TestCase):
    def setUp(self):
        self.engine = ACTRMemoryEngine(decay_factor=1.0)

    def test_exact_activation_formula(self):
        # A(t) = log(n) - 1.0 * log(delta_t_hours + 1)
        rec = TrackMemoryRecord(
            track_id="track_hit",
            play_timestamps=[0.0],
            last_played=0.0,
            play_count=4,
        )

        # At t=0 (0 hours elapsed): A(t) = log(4) - log(0 + 1) = log(4)
        act_0 = self.engine.compute_activation(rec, current_time=0.0)
        self.assertAlmostEqual(act_0, math.log(4), places=4)

        # At t=3600 (1 hour elapsed): A(t) = log(4) - log(1 + 1) = log(4) - log(2) = log(2)
        act_1h = self.engine.compute_activation(rec, current_time=3600.0)
        self.assertAlmostEqual(act_1h, math.log(2), places=4)

        # At t=3600*7 (7 hours elapsed): A(t) = log(4) - log(7 + 1) = log(4) - log(8) = log(0.5)
        act_7h = self.engine.compute_activation(rec, current_time=3600.0 * 7)
        self.assertAlmostEqual(act_7h, math.log(0.5), places=4)

    def test_repeat_vs_rediscovery_classification(self):
        user = "test_user"
        now = 1000000.0

        # 1. Frequently played very recently (1 hour ago) -> REPEAT
        self.engine.record_listen(user, "fav_track", timestamp=now - 3600.0)
        self.engine.record_listen(user, "fav_track", timestamp=now - 3600.0)
        self.engine.record_listen(user, "fav_track", timestamp=now - 3600.0)

        res_repeat = self.engine.classify_candidate("fav_track", user, current_time=now)
        self.assertEqual(res_repeat.candidate_type, MemoryCandidateType.REPEAT)
        self.assertGreaterEqual(res_repeat.activation, 0.0)

        # 2. Played multiple times in the past (e.g. 100 hours ago), but audio-similar to current session -> REDISCOVERY
        self.engine.record_listen(user, "dormant_gem", timestamp=now - 3600.0 * 100)
        self.engine.record_listen(user, "dormant_gem", timestamp=now - 3600.0 * 100)
        self.engine.record_listen(user, "dormant_gem", timestamp=now - 3600.0 * 100)

        # High similarity vector (cosine ~ 0.95)
        ctx_vec = np.ones(64, dtype=np.float32)
        track_vec = np.ones(64, dtype=np.float32)

        res_rediscovery = self.engine.classify_candidate(
            "dormant_gem",
            user,
            current_time=now,
            context_embedding=ctx_vec,
            track_embedding=track_vec,
        )
        self.assertEqual(res_rediscovery.candidate_type, MemoryCandidateType.REDISCOVERY)

        # 3. Completely unheard track -> EXPLORE
        res_explore = self.engine.classify_candidate("unknown_track", user, current_time=now)
        self.assertEqual(res_explore.candidate_type, MemoryCandidateType.EXPLORE)


class TestModeDetector(unittest.TestCase):
    def setUp(self):
        self.detector = ModeDetector(
            comfort_seq_weight=0.6,
            comfort_graph_weight=0.4,
            exploration_seq_weight=0.3,
            exploration_graph_weight=0.7,
        )

    def test_comfort_mode_classification(self):
        # High repeat ratio (0.9), zero skips, single genre (0 entropy)
        res = self.detector.predict(
            repeat_ratio=0.9,
            skip_rate=0.05,
            genre_entropy=0.1,
            session_length=0.5,
        )
        self.assertEqual(res.mode, ModeType.COMFORT)
        self.assertGreater(res.comfort_probability, 0.6)
        # Sequential weight should be around 0.6, graph around 0.4
        self.assertGreater(res.seq_weight, 0.5)
        self.assertAlmostEqual(res.seq_weight + res.graph_weight, 1.0, places=3)

    def test_exploration_mode_classification(self):
        # Zero repeat ratio, high skips (0.7), high genre entropy (0.95)
        res = self.detector.predict(
            repeat_ratio=0.0,
            skip_rate=0.7,
            genre_entropy=0.95,
            session_length=0.2,
        )
        self.assertEqual(res.mode, ModeType.EXPLORATION)
        self.assertGreater(res.exploration_probability, 0.6)
        # Exploration gating: seq=0.3, graph=0.7
        self.assertGreater(res.graph_weight, 0.6)
        self.assertAlmostEqual(res.seq_weight + res.graph_weight, 1.0, places=3)

    def test_detect_from_events(self):
        known_tracks = {"t1", "t2"}
        events = [
            {"track_id": "t1", "skip_at_ms": None},
            {"track_id": "t2", "skip_at_ms": None},
            {"track_id": "t1", "skip_at_ms": None},
        ]
        genres = {"t1": ["rock"], "t2": ["rock"]}

        res = self.detector.detect_from_events(
            events=events,
            known_track_ids=known_tracks,
            track_genres_map=genres,
        )
        self.assertEqual(res.mode, ModeType.COMFORT)


class TestContextEncoder(unittest.TestCase):
    def setUp(self):
        self.encoder = ContextEncoder(output_dim=128, hidden_dim=256)

    def test_encode_context_dimensions(self):
        ctx = ContextFeatures(
            hour_of_day=18.5,
            day_of_week=5,
            is_weekend=True,
            activity="workout",
            ambient_level=0.7,
            weather="rain",
            user_valence=0.85,
            user_arousal=0.90,
        )

        embedding = self.encoder.encode_context(ctx)
        self.assertEqual(embedding.shape, (128,))
        # Unit L2 norm
        norm = np.linalg.norm(embedding)
        self.assertAlmostEqual(norm, 1.0, places=4)

    def test_batch_forward(self):
        ctx1 = self.encoder.extract_feature_vector({"hour_of_day": 8, "activity": "working"})
        ctx2 = self.encoder.extract_feature_vector({"hour_of_day": 23, "activity": "sleep"})
        batch = np.array([ctx1, ctx2])

        out = self.encoder.forward(batch)
        self.assertEqual(out.shape, (2, 128))
        np.testing.assert_allclose(np.linalg.norm(out, axis=1), [1.0, 1.0], atol=1e-4)


class TestMoodTrajectory(unittest.TestCase):
    def setUp(self):
        self.predictor = MoodTrajectoryPredictor(input_dim=8, hidden_dim=64, window_days=14)

    def test_mood_trajectory_prediction(self):
        # 14 daily summaries with increasing positivity
        days = []
        for d in range(14):
            days.append(
                DailyMoodSummary(
                    day_offset=13 - d,
                    avg_valence=0.3 + (d * 0.04),
                    avg_arousal=0.4 + (d * 0.03),
                    track_count=15,
                    skip_rate=0.1,
                    hour_center=18.0,
                )
            )

        matrix = np.array([self.predictor.extract_day_vector(s) for s in days], dtype=np.float32)
        val, aro = self.predictor.forward(matrix)

        self.assertGreaterEqual(val, 0.0)
        self.assertLessEqual(val, 1.0)
        self.assertGreaterEqual(aro, 0.0)
        self.assertLessEqual(aro, 1.0)

    def test_predict_from_events(self):
        now = 1700000000.0
        events = [
            {"track_id": "t_happy", "started_at": now - 3600.0 * 12, "skip_at_ms": None},
            {"track_id": "t_calm", "started_at": now - 3600.0 * 36, "skip_at_ms": None},
        ]
        meta = {
            "t_happy": {"valence": 0.9, "arousal": 0.8},
            "t_calm": {"valence": 0.6, "arousal": 0.3},
        }

        val, aro = self.predictor.predict_from_events(events, track_metadata=meta, current_time=now)
        self.assertIsInstance(val, float)
        self.assertIsInstance(aro, float)
        self.assertTrue(0.0 <= val <= 1.0)
        self.assertTrue(0.0 <= aro <= 1.0)


if __name__ == "__main__":
    unittest.main()
