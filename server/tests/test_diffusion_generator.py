"""
Unit tests for Sloth Diffusion Generator (L-DiffRec):
- Noise schedule (cosine & linear, alpha/beta math)
- U-Net denoiser forward pass & sinusoidal timestep embeddings
- Mood Arc Planner (lerp + Gaussian jitter, preset trajectories)
- Playlist Coherence Evaluator (BPM delta < 15, Circle-of-Fifths < 3, valence std < 0.3)
- FAISS IndexFlatIP acoustic retrieval & unique sequence mapping
- End-to-end playlist diffusion synthesis
- Fast CPU training on playlist history (< 5 min)
- Generator FastAPI endpoints
"""

import math
import unittest
import numpy as np
from fastapi.testclient import TestClient

from server.engine.main import app
from server.engine.generator import (
    DiffusionConfig,
    PlaylistDiffusionGenerator,
    NoiseSchedule,
    UNetDenoiserMLP,
    MoodArcPlanner,
    MOOD_PRESETS,
    PlaylistCoherenceEvaluator,
    TrackAcousticMetadata,
    circle_of_fifths_distance,
    FAISSRetriever,
)


class TestNoiseSchedule(unittest.TestCase):
    def test_linear_schedule(self):
        schedule = NoiseSchedule(timesteps=50, beta_start=0.0001, beta_end=0.02, schedule_type="linear")
        self.assertEqual(len(schedule.betas), 50)
        self.assertEqual(len(schedule.alphas), 50)
        self.assertAlmostEqual(schedule.alphas_cumprod[0], 1.0 - schedule.betas[0], places=4)
        self.assertLess(schedule.alphas_cumprod[-1], schedule.alphas_cumprod[0])

    def test_cosine_schedule(self):
        schedule = NoiseSchedule(timesteps=100, schedule_type="cosine")
        self.assertEqual(len(schedule.betas), 100)
        self.assertTrue(np.all(schedule.betas > 0))
        self.assertTrue(np.all(schedule.betas < 1))
        # alphas_cumprod must monotonically decrease
        diffs = np.diff(schedule.alphas_cumprod)
        self.assertTrue(np.all(diffs <= 0))

    def test_q_sample_forward_process(self):
        schedule = NoiseSchedule(timesteps=20, schedule_type="linear")
        x_0 = np.ones((4, 768), dtype=np.float32)
        t = np.array([0, 5, 10, 19], dtype=np.int32)

        x_t, noise = schedule.q_sample(x_0, t)
        self.assertEqual(x_t.shape, (4, 768))
        self.assertEqual(noise.shape, (4, 768))
        # At t=0, x_t should be very close to x_0
        self.assertAlmostEqual(float(np.mean(x_t[0])), 1.0, places=1)


class TestUNetDenoiser(unittest.TestCase):
    def test_denoiser_forward(self):
        denoiser = UNetDenoiserMLP(latent_dim=768, condition_dim=264, time_emb_dim=64, hidden_dims=[128, 64])
        batch_size = 2
        x_t = np.random.normal(size=(batch_size, 768)).astype(np.float32)
        timesteps = np.array([10, 50], dtype=np.int32)
        cond = np.random.normal(size=(batch_size, 264)).astype(np.float32)

        out = denoiser.forward(x_t, timesteps, cond)
        self.assertEqual(out.shape, (batch_size, 768))
        self.assertFalse(np.isnan(out).any())


class TestMoodArcPlanner(unittest.TestCase):
    def setUp(self):
        self.planner = MoodArcPlanner(default_noise_std=0.02)

    def test_lerp_trajectory(self):
        waypoints = self.planner.plan_trajectory(
            start_valence=0.20,
            start_arousal=0.80,
            target_valence=0.90,
            target_arousal=0.10,
            num_tracks=20,
            noise_std=0.01,
        )
        self.assertEqual(len(waypoints), 20)
        self.assertAlmostEqual(waypoints[0].valence, 0.20, delta=0.05)
        self.assertAlmostEqual(waypoints[0].arousal, 0.80, delta=0.05)
        self.assertAlmostEqual(waypoints[-1].valence, 0.90, delta=0.05)
        self.assertAlmostEqual(waypoints[-1].arousal, 0.10, delta=0.05)

    def test_presets(self):
        for preset_name in ["focus", "wind_down", "hype_up", "chill"]:
            waypoints = self.planner.plan_preset_trajectory(preset_name, num_tracks=15)
            self.assertEqual(len(waypoints), 15)
            self.assertTrue(all(0.0 <= wp.valence <= 1.0 for wp in waypoints))
            self.assertTrue(all(0.0 <= wp.arousal <= 1.0 for wp in waypoints))


class TestCoherence(unittest.TestCase):
    def setUp(self):
        self.evaluator = PlaylistCoherenceEvaluator(
            max_bpm_delta=15.0,
            max_cof_distance=3,
            max_valence_std=0.30,
        )

    def test_bpm_delta_evaluation(self):
        smooth_bpms = [120.0, 124.0, 128.0, 125.0, 122.0]
        deltas, violations, ok = self.evaluator.evaluate_bpm_transitions(smooth_bpms)
        self.assertEqual(violations, 0)
        self.assertTrue(ok)
        self.assertTrue(all(d < 15 for d in deltas))

        jarring_bpms = [120.0, 160.0, 90.0, 140.0]
        _, viol_count, jarring_ok = self.evaluator.evaluate_bpm_transitions(jarring_bpms)
        self.assertGreaterEqual(viol_count, 2)
        self.assertFalse(jarring_ok)

    def test_circle_of_fifths_distance(self):
        # C to G (adjacent step along CoF = 1)
        self.assertEqual(circle_of_fifths_distance("C", "G"), 1)
        # C to C (same key = 0)
        self.assertEqual(circle_of_fifths_distance("C", "C"), 0)
        # C to F# (tritone / opposite side of circle = 6)
        self.assertEqual(circle_of_fifths_distance("C", "F#"), 6)
        # Relative minor: A minor shares key signature with C major
        self.assertEqual(circle_of_fifths_distance("C", "Am"), 0)
        # Harmonic transition condition: C to D is 2 steps (< 3)
        self.assertEqual(circle_of_fifths_distance("C", "D"), 2)

    def test_valence_slope_std(self):
        # Steady linear slope from 0.2 to 0.8
        valences = [0.2 + (i / 9.0) * 0.6 for i in range(10)]
        residuals, std_val, ok = self.evaluator.evaluate_valence_slope(valences, 0.2, 0.8)
        self.assertAlmostEqual(std_val, 0.0, places=3)
        self.assertTrue(ok)

    def test_full_playlist_coherence(self):
        tracks = [
            TrackAcousticMetadata("t1", bpm=120.0, key="C", mode=1, valence=0.3),
            TrackAcousticMetadata("t2", bpm=124.0, key="G", mode=1, valence=0.4),
            TrackAcousticMetadata("t3", bpm=128.0, key="D", mode=1, valence=0.5),
            TrackAcousticMetadata("t4", bpm=126.0, key="A", mode=1, valence=0.6),
        ]
        report = self.evaluator.evaluate_playlist(tracks, start_valence=0.3, target_valence=0.6)
        self.assertEqual(report.total_tracks, 4)
        self.assertTrue(report.overall_coherent)
        self.assertGreater(report.coherence_score, 0.85)


class TestFAISSRetrieval(unittest.TestCase):
    def test_rebuild_index_and_unique_trajectory(self):
        retriever = FAISSRetriever(embedding_dim=128)
        catalog = {
            f"track_{i}": np.eye(128)[i].astype(np.float32)
            for i in range(10)
        }
        retriever.rebuild_index(catalog)
        self.assertEqual(len(retriever.track_ids), 10)

        # 5 distinct query vectors matching tracks 0, 1, 2, 3, 4
        queries = np.array([catalog[f"track_{i}"] for i in range(5)], dtype=np.float32)
        trajectory = retriever.find_unique_trajectory(queries)

        self.assertEqual(len(trajectory), 5)
        # All selected IDs must be unique
        selected_ids = [tid for tid, _ in trajectory]
        self.assertEqual(len(set(selected_ids)), 5)
        self.assertEqual(selected_ids, [f"track_{i}" for i in range(5)])


class TestPlaylistDiffusionGenerator(unittest.TestCase):
    def setUp(self):
        config = DiffusionConfig(
            latent_dim=64,
            user_pref_dim=16,
            context_dim=6,
            mood_dim=2,
            timesteps=10,
            hidden_dims=[32, 16],
        )
        self.generator = PlaylistDiffusionGenerator(config)

    def test_condition_vector_building(self):
        cond = self.generator.build_condition_vector(
            user_preference=np.ones(16),
            context_vector=np.ones(6),
            mood_target=(0.8, 0.9),
        )
        self.assertEqual(len(cond), 16 + 6 + 2)

    def test_reverse_diffusion_sampling(self):
        cond = self.generator.build_condition_vector()
        latent = self.generator.reverse_diffusion_sample(cond)
        self.assertEqual(len(latent), 64)
        self.assertFalse(np.isnan(latent).any())

    def test_generate_sequence(self):
        seq = self.generator.generate_sequence(sequence_length=5)
        self.assertEqual(seq.shape, (5, 64))
        # Each vector should be normalized to unit length
        norms = np.linalg.norm(seq, axis=1)
        self.assertTrue(np.allclose(norms, 1.0, atol=1e-3))

    def test_train_on_playlist_history(self):
        # Fast CPU training with 20 sample vectors
        sample_tracks = [np.random.normal(size=(64,)).astype(np.float32) for _ in range(20)]
        result = self.generator.train_on_playlist_history(
            sample_tracks,
            epochs=2,
            learning_rate=0.001,
            batch_size=8,
        )
        self.assertEqual(result["status"], "trained")
        self.assertEqual(result["epochs"], 2)
        self.assertLess(result["time_seconds"], 10.0)


class TestGeneratorAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_get_presets_endpoint(self):
        res = self.client.get("/api/engine/generator/presets")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "ok")
        self.assertGreaterEqual(len(data["presets"]), 4)
        preset_names = [p["name"] for p in data["presets"]]
        self.assertIn("Focus", preset_names)
        self.assertIn("Wind Down", preset_names)
        self.assertIn("Hype Up", preset_names)
        self.assertIn("Chill", preset_names)

    def test_plan_arc_endpoint(self):
        res = self.client.post(
            "/api/engine/generator/plan-arc",
            json={
                "start_valence": 0.3,
                "start_arousal": 0.4,
                "target_valence": 0.8,
                "target_arousal": 0.9,
                "num_tracks": 20,
            },
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["num_tracks"], 20)
        self.assertEqual(len(data["waypoints"]), 20)
        self.assertEqual(data["waypoints"][0]["step"], 0)
        self.assertEqual(data["waypoints"][-1]["step"], 19)

    def test_diffuse_endpoint(self):
        res = self.client.post(
            "/api/engine/generator/diffuse",
            json={
                "start_valence": 0.4,
                "start_arousal": 0.5,
                "target_valence": 0.7,
                "target_arousal": 0.3,
                "preset_name": "chill",
                "num_tracks": 10,
            },
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["num_tracks"], 10)
        self.assertIn("playlist", data)
        self.assertIn("coherence", data)
        self.assertIn("overall_coherent", data["coherence"])


if __name__ == "__main__":
    unittest.main()
