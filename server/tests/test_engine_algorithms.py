"""
Unit tests for SLOTH Core Recommendation & AI Engine Algorithms
Validates:
1. LightHGCN (5-node heterogeneous hypergraph convolution)
2. BERT4Rec (Bidirectional transformer sequential recommender)
3. ACT-R Cognitive Memory Decay (RecSys 2024 PISA model)
4. L-DiffRec (Latent diffusion playlist generation with 6-signal conditioning)
5. IPS Debiasing (Inverse propensity scoring from play_count)
6. Thompson Sampling Bandit (Beta distribution exploration/exploitation)
7. MERT (768-dim acoustic feature extraction)
8. CLAP (512-dim multimodal audio-text cross-modal search)
"""

import math
import unittest
import numpy as np

from server.engine.graph import HeteroHypergraph, HeteroNodeType, LightHGCN
from server.engine.sequential import (
    ACTRMemoryEngine,
    BERT4Rec,
    BERT4RecConfig,
    TrackMemoryRecord,
)
from server.engine.generator import (
    GaussianDiffusionSchedule,
    PlaylistDiffusionConfig,
    PlaylistDiffusionGenerator,
)
from server.engine.coldstart import (
    BanditArm,
    IPSDebiaser,
    IPSLossConfig,
    ThompsonBandit,
)
from server.engine.audio import CLAPExtractor, MERTExtractor


class TestLightHGCN(unittest.TestCase):
    def setUp(self):
        self.graph = HeteroHypergraph()

        # Build heterogeneous 5-node music hypergraph:
        # Session hyperedge: User1 + Track1 + Track2
        self.graph.add_hyperedge(
            edge_id="session_1",
            edge_type="session",
            nodes=[
                (HeteroNodeType.USER, "user_1"),
                (HeteroNodeType.TRACK, "track_1"),
                (HeteroNodeType.TRACK, "track_2"),
            ],
            weight=1.0,
        )

        # Album hyperedge: Album1 + Artist1 + Track1 + Track2
        self.graph.add_hyperedge(
            edge_id="album_1",
            edge_type="album_discography",
            nodes=[
                (HeteroNodeType.ALBUM, "album_1"),
                (HeteroNodeType.ARTIST, "artist_1"),
                (HeteroNodeType.TRACK, "track_1"),
                (HeteroNodeType.TRACK, "track_2"),
            ],
            weight=1.5,
        )

        # Playlist hyperedge: Playlist1 + User1 + Track2 + Track3
        self.graph.add_hyperedge(
            edge_id="playlist_1",
            edge_type="playlist",
            nodes=[
                (HeteroNodeType.PLAYLIST, "playlist_1"),
                (HeteroNodeType.USER, "user_1"),
                (HeteroNodeType.TRACK, "track_2"),
                (HeteroNodeType.TRACK, "track_3"),
            ],
            weight=1.2,
        )

        self.model = LightHGCN(
            graph=self.graph,
            embedding_dim=32,
            num_layers=2,
        )

    def test_hypergraph_incidence_and_normalized_adjacency(self):
        # 5 distinct node types present
        self.assertGreaterEqual(self.graph.num_nodes, 6)
        self.assertEqual(self.graph.num_edges, 3)

        H = self.graph.build_incidence_matrix()
        self.assertEqual(H.shape, (self.graph.num_nodes, 3))
        # Elements are 0 or 1
        self.assertTrue(np.all((H == 0.0) | (H == 1.0)))

        A_norm = self.graph.get_normalized_hypergraph_adjacency()
        self.assertEqual(A_norm.shape, (self.graph.num_nodes, self.graph.num_nodes))
        # Symmetric
        self.assertTrue(np.allclose(A_norm, A_norm.T, atol=1e-5))
        # Spectral properties: max eigenvalue <= 1.0
        eigvals = np.linalg.eigvalsh(A_norm)
        self.assertLessEqual(np.max(eigvals), 1.0001)

    def test_lighthgcn_forward_and_recommendations(self):
        embs = self.model.forward()
        self.assertEqual(embs.shape, (self.graph.num_nodes, 32))

        # Check track prediction scores
        score_1 = self.model.predict_score("user_1", "track_1", computed_embeddings=embs)
        self.assertIsInstance(score_1, float)

        # Recommendations rank
        recs = self.model.recommend_tracks_for_user("user_1", top_k=2, computed_embeddings=embs)
        self.assertLessEqual(len(recs), 2)
        if len(recs) == 2:
            self.assertGreaterEqual(recs[0][1], recs[1][1])

        # BPR Loss
        bpr, reg = self.model.bpr_loss(
            users=["user_1"],
            pos_tracks=["track_1"],
            neg_tracks=["track_3"],
        )
        self.assertGreaterEqual(bpr, 0.0)
        self.assertGreaterEqual(reg, 0.0)


class TestBERT4Rec(unittest.TestCase):
    def setUp(self):
        self.config = BERT4RecConfig(
            max_len=10,
            hidden_dim=256,
            num_heads=4,
            num_blocks=2,
            vocab_size=100,
            mask_prob=0.15,
        )
        self.bert = BERT4Rec(self.config)

    def test_cloze_masking(self):
        seq = [1, 2, 3, 4, 5]
        masked_seq, masked_pos, targets = self.bert.apply_cloze_mask(seq)
        self.assertEqual(len(masked_seq), len(seq))
        self.assertGreater(len(masked_pos), 0)
        self.assertEqual(len(masked_pos), len(targets))

    def test_sequence_encoding_to_256_dim(self):
        history = ["track_A", "track_B", "track_C", "track_D"]
        embedding = self.bert.encode_track_sequence(history)

        self.assertEqual(embedding.shape, (256,))
        self.assertFalse(np.all(embedding == 0.0))

    def test_candidate_ranking(self):
        history = ["track_A", "track_B"]
        candidates = ["track_C", "track_D", "track_E"]

        ranked = self.bert.predict_next_candidates(history, candidates, top_k=2)
        self.assertEqual(len(ranked), 2)
        self.assertGreaterEqual(ranked[0][1], ranked[1][1])


class TestACTRMemory(unittest.TestCase):
    def setUp(self):
        self.engine = ACTRMemoryEngine(decay_factor=0.5, pmi_weight=0.3, similarity_weight=0.2)

    def test_base_level_activation_equation(self):
        # 1. Listen at t=0, query at t=3600 (1 hour elapsed)
        rec = TrackMemoryRecord(
            track_id="t1",
            play_timestamps=[0.0],
            last_played=0.0,
            play_count=1,
        )

        # Exact formula: B(t) = ln( (delta_hours)^(-0.5) )
        # at 1 hour: 1^(-0.5) = 1, ln(1) = 0.0
        act_exact = self.engine.compute_base_level_activation(rec, current_time=3600.0, use_approximation=False)
        self.assertAlmostEqual(act_exact, 0.0, places=3)

        # Approx formula: A(t) = log(n) - d * log(delta_t)
        # log(1) - 0.5 * log(1) = 0.0
        act_approx = self.engine.compute_base_level_activation(rec, current_time=3600.0, use_approximation=True)
        self.assertAlmostEqual(act_approx, 0.0, places=3)

        # 2. More frequent listens increase activation
        rec_frequent = TrackMemoryRecord(
            track_id="t2",
            play_timestamps=[0.0, 1800.0, 3500.0],
            last_played=3500.0,
            play_count=3,
        )
        act_freq = self.engine.compute_base_level_activation(rec_frequent, current_time=3600.0)
        self.assertGreater(act_freq, act_exact)

    def test_spreading_and_retrieval_ranking(self):
        # Record session with co-occurring tracks
        self.engine.record_listen("u1", "rock_1", timestamp=100.0, session_context=["rock_2"])
        self.engine.record_listen("u1", "rock_2", timestamp=150.0, session_context=["rock_1"])
        self.engine.record_listen("u1", "jazz_1", timestamp=200.0, session_context=[])

        # When active session context is ["rock_2"], "rock_1" should receive higher spreading activation
        ranked = self.engine.rank_repeat_candidates(
            user_id="u1",
            candidate_track_ids=["rock_1", "jazz_1"],
            current_time=300.0,
            session_context=["rock_2"],
        )

        self.assertEqual(len(ranked), 2)
        # Sum of probabilities = 1.0
        self.assertAlmostEqual(ranked[0][1] + ranked[1][1], 1.0, places=4)
        self.assertEqual(ranked[0][0], "rock_1")


class TestPlaylistDiffusion(unittest.TestCase):
    def setUp(self):
        self.config = PlaylistDiffusionConfig(
            latent_dim=768,
            context_dim=6,
            timesteps=10,  # fast test schedule
        )
        self.generator = PlaylistDiffusionGenerator(self.config)

        # Register small synthetic catalog of 5 tracks
        np.random.seed(42)
        catalog = {
            f"cat_track_{i}": np.random.normal(size=(768,)).astype(np.float32)
            for i in range(5)
        }
        self.generator.register_catalog(catalog)

    def test_forward_diffusion_schedule(self):
        schedule = GaussianDiffusionSchedule(timesteps=10)
        x_0 = np.ones((768,), dtype=np.float32)

        x_t, noise = schedule.q_sample(x_0, t=5)
        self.assertEqual(x_t.shape, (768,))
        self.assertEqual(noise.shape, (768,))
        # Noise should have changed the signal
        self.assertFalse(np.allclose(x_t, x_0))

    def test_latent_sampling_and_playlist_synthesis(self):
        # 6-signal context vector: [energy, danceability, valence, tempo_norm, acousticness, mood]
        context = np.array([0.8, 0.7, 0.9, 0.65, 0.2, 0.85], dtype=np.float32)

        latent_vec = self.generator.sample_latent_vector(context)
        self.assertEqual(latent_vec.shape, (768,))

        playlist = self.generator.generate_playlist(context, length=3)
        self.assertEqual(len(playlist), 3)
        # Unique tracks
        track_ids = [t[0] for t in playlist]
        self.assertEqual(len(set(track_ids)), 3)


class TestIPSDebiasing(unittest.TestCase):
    def setUp(self):
        self.debiaser = IPSDebiaser(IPSLossConfig(gamma=0.5, min_propensity=0.05))
        self.play_counts = {
            "head_track_1": 10000,
            "mid_track_2": 400,
            "tail_track_3": 5,
        }
        self.debiaser.fit_propensities_from_counts(self.play_counts)

    def test_propensity_scaling_and_clipping(self):
        p_head = self.debiaser.get_propensity("head_track_1")
        p_mid = self.debiaser.get_propensity("mid_track_2")
        p_tail = self.debiaser.get_propensity("tail_track_3")

        # Head track should have highest propensity
        self.assertGreater(p_head, p_mid)
        self.assertGreater(p_mid, p_tail)
        # Tail track should respect min_propensity clip
        self.assertGreaterEqual(p_tail, 0.05)

    def test_debiased_bce_loss(self):
        preds = np.array([0.9, 0.4], dtype=np.float32)
        labels = np.array([1.0, 0.0], dtype=np.float32)
        track_ids = ["head_track_1", "tail_track_3"]

        loss = self.debiaser.compute_bce_loss(preds, labels, track_ids)
        self.assertIsInstance(loss, float)
        self.assertGreater(loss, 0.0)


class TestThompsonBandit(unittest.TestCase):
    def setUp(self):
        self.bandit = ThompsonBandit(decay_factor=0.95)

    def test_bandit_sampling_and_bayesian_updates(self):
        # Fresh arm has default Beta(1, 1) -> mean 0.5
        stats_init = self.bandit.get_arm_stats("arm_new")
        self.assertAlmostEqual(stats_init["expected_reward"], 0.5, places=2)

        # Provide 10 consecutive positive rewards (r=1.0)
        for _ in range(10):
            self.bandit.update("arm_new", reward=1.0)

        stats_after = self.bandit.get_arm_stats("arm_new")
        self.assertGreater(stats_after["expected_reward"], 0.75)
        self.assertEqual(stats_after["pulls"], 10)

        # Selection of top candidate
        top = self.bandit.select_top_k(["arm_new", "arm_cold_2"], k=1)
        self.assertEqual(len(top), 1)


class TestAudioExtractors(unittest.TestCase):
    def test_mert_extractor_output_shape(self):
        extractor = MERTExtractor(lazy_load=True)
        # Create 1 second of 24kHz synthetic audio sine wave
        t = np.linspace(0, 1, 24000, endpoint=False)
        sine_audio = (0.5 * np.sin(2 * np.pi * 440 * t)).astype(np.float32)

        embedding = extractor.extract_embedding_from_array(sine_audio, sample_rate=24000)
        self.assertEqual(embedding.shape, (768,))
        # Unit norm
        norm = np.linalg.norm(embedding)
        self.assertAlmostEqual(norm, 1.0, places=4)

    def test_clap_extractor_multimodal_matching(self):
        clap = CLAPExtractor(lazy_load=True)
        # 1 second of 48kHz audio
        t = np.linspace(0, 1, 48000, endpoint=False)
        audio = (0.5 * np.sin(2 * np.pi * 220 * t)).astype(np.float32)

        audio_emb = clap.get_audio_embedding(audio, sample_rate=48000)
        self.assertEqual(audio_emb.shape, (512,))

        text_emb = clap.get_text_embedding("peaceful acoustic guitar morning")
        self.assertEqual(text_emb.shape, (512,))

        sim = clap.compute_cross_modal_similarity(audio_emb, text_emb)
        self.assertGreaterEqual(sim, -1.0)
        self.assertLessEqual(sim, 1.0)

        # Prompt ranking
        catalog = {"track_1": audio_emb, "track_2": -audio_emb}
        ranked = clap.rank_tracks_by_prompt("peaceful acoustic guitar", catalog, top_k=2)
        self.assertEqual(len(ranked), 2)
        self.assertGreater(ranked[0][1], ranked[1][1])


if __name__ == "__main__":
    unittest.main()
