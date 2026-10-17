"""
Unit tests for Sloth Coldstart & Debiasing Engine:
- Inverse Propensity Scoring (IPS) & SNIPS
- Thompson Sampling Multi-Armed Bandit Genre Arms
- Maximal Marginal Relevance (MMR) Re-Ranker with Catalog Constraints
- Discovery Slots Injector (Bottom-5% gems every 7th track)
- Cultural & Regional Affinity Scorer (+0.10 language, +0.05 regional genre)
- Onboarding & Clip Feedback FastAPI Endpoints
"""

import math
import sqlite3
import unittest
import numpy as np
from fastapi.testclient import TestClient

from server.engine.main import app
from server.engine.coldstart import (
    IPSDebiaser,
    IPSLossConfig,
    ThompsonBandit,
    MMRReranker,
    DiscoverySlotInjector,
    CulturalAffinityScorer,
)


class TestIPSDebiaser(unittest.TestCase):
    def setUp(self):
        self.debiaser = IPSDebiaser(IPSLossConfig(gamma=0.5, min_propensity=0.05))

    def test_fit_propensities_from_counts(self):
        counts = {
            "track_popular": 1000,
            "track_mid": 100,
            "track_rare": 1,
        }
        propensities = self.debiaser.fit_propensities_from_counts(counts)
        self.assertEqual(len(propensities), 3)
        self.assertAlmostEqual(propensities["track_popular"], 1.0, places=1)
        self.assertLess(propensities["track_mid"], propensities["track_popular"])
        self.assertGreaterEqual(propensities["track_rare"], 0.05)

    def test_fit_from_sqlite(self):
        conn = sqlite3.connect(":memory:")
        cursor = conn.cursor()
        cursor.execute("CREATE TABLE tracks (id TEXT PRIMARY KEY, play_count INTEGER)")
        cursor.executemany(
            "INSERT INTO tracks VALUES (?, ?)",
            [("t1", 500), ("t2", 50), ("t3", 0)],
        )
        conn.commit()

        props = self.debiaser.fit_from_sqlite(conn, table_name="tracks")
        self.assertEqual(len(props), 3)
        self.assertGreater(props["t1"], props["t2"])
        self.assertGreaterEqual(props["t3"], 0.05)
        conn.close()

    def test_debias_candidate_scores_alpha(self):
        raw_scores = {"t_pop": 0.90, "t_rare": 0.85}
        play_counts = {"t_pop": 10000, "t_rare": 10}

        # Alpha = 0.0 -> Familiar mode (scores untouched)
        debiased_familiar = self.debiaser.debias_candidate_scores(
            raw_scores, play_counts, alpha=0.0
        )
        self.assertAlmostEqual(debiased_familiar["t_pop"], 0.90)
        self.assertAlmostEqual(debiased_familiar["t_rare"], 0.85)

        # Alpha = 0.5 -> Balanced discovery
        debiased_discovery = self.debiaser.debias_candidate_scores(
            raw_scores, play_counts, alpha=0.5
        )
        # The rare track's debiased score should increase significantly relative to the popular track
        ratio_raw = raw_scores["t_rare"] / raw_scores["t_pop"]
        ratio_debiased = debiased_discovery["t_rare"] / debiased_discovery["t_pop"]
        self.assertGreater(ratio_debiased, ratio_raw)

    def test_ips_losses_and_weights(self):
        counts = {"t1": 100, "t2": 5}
        self.debiaser.fit_propensities_from_counts(counts)
        weights = self.debiaser.compute_ips_weights(["t1", "t2"])
        self.assertEqual(len(weights), 2)
        self.assertGreater(weights[1], weights[0])

        # Test BCE loss
        preds = np.array([0.8, 0.4])
        labels = np.array([1.0, 0.0])
        bce = self.debiaser.compute_bce_loss(preds, labels, ["t1", "t2"])
        self.assertGreater(bce, 0.0)

        # Test BPR loss
        pos = np.array([0.9, 0.8])
        neg = np.array([0.2, 0.3])
        bpr = self.debiaser.compute_bpr_loss(pos, neg, ["t1", "t2"], ["t2", "t1"])
        self.assertGreater(bpr, 0.0)

    def test_debias_ranking_metrics(self):
        counts = {"t1": 1000, "t2": 10}
        self.debiaser.fit_propensities_from_counts(counts)
        ground_truth = {"t1": 1.0, "t2": 1.0}
        metrics = self.debiaser.debias_ranking_metrics(["t2", "t1"], ground_truth, k=2)
        self.assertIn("debiased_dcg@2", metrics)
        self.assertIn("debiased_recall@2", metrics)
        self.assertGreater(metrics["debiased_recall@2"], 0.99)


class TestThompsonBandit(unittest.TestCase):
    def setUp(self):
        self.bandit = ThompsonBandit(decay_factor=0.95)

    def test_arm_creation_and_sample(self):
        arm = self.bandit.get_or_create_arm("synthwave")
        self.assertEqual(arm.alpha, 1.0)
        self.assertEqual(arm.beta, 1.0)

        sample = self.bandit.sample_arm("synthwave")
        self.assertGreaterEqual(sample, 0.0)
        self.assertLessEqual(sample, 1.0)

    def test_update_and_stats(self):
        # Update with reward 1.0
        self.bandit.update("indie_rock", 1.0)
        stats = self.bandit.get_arm_stats("indie_rock")
        self.assertGreater(stats["expected_reward"], 0.5)
        self.assertEqual(stats["pulls"], 1)

        # Update with negative reward
        self.bandit.update("indie_rock", 0.0)
        stats2 = self.bandit.get_arm_stats("indie_rock")
        self.assertEqual(stats2["pulls"], 2)

    def test_record_genre_feedback_and_ranking(self):
        # High feedback for synthwave, negative for metal
        for _ in range(5):
            self.bandit.record_genre_feedback("synthwave", liked=True, rating=1.0)
            self.bandit.record_genre_feedback("metal", liked=False, rating=0.0)

        weights = self.bandit.sample_genre_weights(["synthwave", "metal"])
        self.assertIn("synthwave", weights)
        self.assertIn("metal", weights)
        self.assertAlmostEqual(sum(weights.values()), 1.0, places=3)

        ranked = self.bandit.rank_genres(["synthwave", "metal"])
        self.assertEqual(len(ranked), 2)
        # Synthwave should almost certainly have higher weight than metal
        self.assertGreater(ranked[0][1], ranked[1][1])
        self.assertEqual(ranked[0][0], "synthwave")


class TestMMRReranker(unittest.TestCase):
    def setUp(self):
        self.reranker = MMRReranker(
            lambda_param=0.70,
            max_tracks_per_artist_window=3,
            artist_window_size=10,
            max_consecutive_same_genre=2,
        )

    def test_artist_window_constraint(self):
        # Create 20 tracks where Artist_A dominates top relevance (first 8 tracks)
        candidates = [f"t{i}" for i in range(20)]
        rel_scores = {f"t{i}": 1.0 - (i * 0.02) for i in range(20)}
        artists = {f"t{i}": f"Artist_{i // 4}" for i in range(20)}
        for i in range(8):
            artists[f"t{i}"] = "Artist_A"
        genres = {f"t{i}": [f"genre_{i}"] for i in range(20)}

        # Dummy orthogonal embeddings
        embeddings = {f"t{i}": np.eye(20)[i] for i in range(20)}

        reranked = self.reranker.rerank(
            candidates,
            rel_scores,
            embeddings=embeddings,
            artist_map=artists,
            genre_map=genres,
            top_k=10,
        )

        ranked_ids = [tid for tid, _ in reranked]
        # In the first 10 tracks, Artist_A must not appear more than 3 times
        artist_counts = [artists[tid] for tid in ranked_ids]
        count_a = sum(1 for a in artist_counts if a == "Artist_A")
        self.assertLessEqual(count_a, 3)

    def test_consecutive_genre_constraint(self):
        # 6 tracks where all share genre 'rock' except t3 and t4
        candidates = [f"t{i}" for i in range(6)]
        rel_scores = {f"t{i}": 1.0 - (i * 0.05) for i in range(6)}
        artists = {f"t{i}": f"artist_{i}" for i in range(6)}
        genres = {
            "t0": ["rock"],
            "t1": ["rock"],
            "t2": ["rock"],
            "t3": ["ambient"],
            "t4": ["ambient"],
            "t5": ["rock"],
        }
        embeddings = {f"t{i}": np.eye(6)[i] for i in range(6)}

        reranked = self.reranker.rerank(
            candidates,
            rel_scores,
            embeddings=embeddings,
            artist_map=artists,
            genre_map=genres,
            top_k=6,
        )

        ranked_genres = [genres[tid][0] for tid, _ in reranked]
        # Check that no 3 consecutive tracks have "rock"
        for i in range(len(ranked_genres) - 2):
            consecutive_three = ranked_genres[i : i + 3]
            self.assertFalse(all(g == "rock" for g in consecutive_three))


class TestDiscoverySlotInjector(unittest.TestCase):
    def setUp(self):
        self.injector = DiscoverySlotInjector(
            slot_interval=7,
            popularity_percentile=0.10,
            min_similarity=0.40,
        )

    def test_identify_long_tail(self):
        counts = {f"t{i}": i * 100 for i in range(20)}
        long_tail = self.injector.identify_long_tail_tracks(counts, percentile=0.10)
        # Bottom 10% should contain the lowest count tracks
        self.assertIn("t0", long_tail)
        self.assertIn("t1", long_tail)
        self.assertNotIn("t19", long_tail)

    def test_slot_injection(self):
        # 14 standard tracks
        standard_tracks = [f"std_{i}" for i in range(14)]
        # 3 discovery candidates
        discovery_candidates = [("disc_1", 0.88), ("disc_2", 0.75), ("disc_3", 0.65)]

        queue_items = self.injector.inject_slots(
            standard_tracks,
            discovery_candidates,
            slot_interval=7,
        )

        # Positions are 1-indexed. Position 7 (index 6) must be a discovery slot
        self.assertTrue(queue_items[6].is_discovery_slot)
        self.assertEqual(queue_items[6].badge, "New")
        self.assertEqual(queue_items[6].track_id, "disc_1")

        # Position 14 (index 13) must also be a discovery slot
        if len(queue_items) >= 14:
            self.assertTrue(queue_items[13].is_discovery_slot)
            self.assertEqual(queue_items[13].badge, "New")
            self.assertEqual(queue_items[13].track_id, "disc_2")


class TestCulturalAffinityScorer(unittest.TestCase):
    def setUp(self):
        self.scorer = CulturalAffinityScorer(language_boost=0.10, genre_boost=0.05)

    def test_resolve_profile(self):
        prof_in = self.scorer.resolve_profile("hi-IN")
        self.assertIsNotNone(prof_in)
        self.assertIn("hi", prof_in.primary_languages)

        prof_jp = self.scorer.resolve_profile("ja")
        self.assertIsNotNone(prof_jp)
        self.assertIn("city pop", prof_jp.regional_genres)

    def test_compute_affinity_boost(self):
        # Japanese user listening to City Pop in Japanese
        boost_both = self.scorer.compute_affinity_boost(
            locale="ja-JP",
            track_language="ja",
            track_genres=["city pop", "funk"],
        )
        self.assertAlmostEqual(boost_both, 0.15)

        # Language match only
        boost_lang = self.scorer.compute_affinity_boost(
            locale="ja-JP",
            track_language="ja",
            track_genres=["synthwave"],
        )
        self.assertAlmostEqual(boost_lang, 0.10)

        # Regional genre match only
        boost_genre = self.scorer.compute_affinity_boost(
            locale="ja-JP",
            track_language="en",
            track_genres=["city pop"],
        )
        self.assertAlmostEqual(boost_genre, 0.05)


class TestOnboardingAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_get_genres_endpoint(self):
        res = self.client.get("/api/engine/coldstart/onboarding/genres")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "ok")
        self.assertGreater(len(data["genres"]), 5)

    def test_clip_feedback_endpoint(self):
        payload = {
            "user_id": "test_user_coldstart",
            "locale": "hi-IN",
            "feedback": [
                {"genre": "synthwave", "liked": True, "rating": 0.95},
                {"genre": "electronic", "liked": True, "rating": 0.85},
                {"genre": "metal", "liked": False, "rating": 0.10},
            ],
        }
        res = self.client.post(
            "/api/engine/coldstart/onboarding/clip-feedback",
            json=payload,
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["user_id"], "test_user_coldstart")
        self.assertGreaterEqual(len(data["top_genres"]), 3)
        self.assertTrue(data["locale_boost_applied"])
        self.assertIn("synthwave", data["recommended_starting_genres"])

    def test_clip_feedback_alias_endpoint(self):
        payload = {
            "user_id": "test_user_alias",
            "feedback": [
                {"genre": "indie rock", "liked": True, "rating": 0.9},
            ],
        }
        res = self.client.post(
            "/engine/onboarding/clip-feedback",
            json=payload,
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")

    def test_user_profile_endpoint(self):
        res = self.client.get("/api/engine/coldstart/onboarding/profile/test_user_coldstart")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["user_id"], "test_user_coldstart")
        self.assertGreaterEqual(data["arms_count"], 3)


if __name__ == "__main__":
    unittest.main()
