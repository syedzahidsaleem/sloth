"""
Unit and Integration Tests for Audio Feature Extraction & Vector Store
Tests shape checks (768 for MERT, 512 for CLAP), valence/arousal bounds in [0, 1],
ANN nearest neighbor correctness, and batch indexer SSE events.
"""

import asyncio
import os
import unittest
import numpy as np

from server.engine.audio.batch_indexer import LibraryBatchIndexer
from server.engine.audio.clap_extractor import CLAPExtractor
from server.engine.audio.feature_pipeline import FeatureBundle, FeaturePipeline
from server.engine.audio.mert_extractor import MERTExtractor
from server.engine.audio.mood_tagger import MoodTagger
from server.engine.audio.vector_store.store import VectorStore


class TestMERTExtractor(unittest.TestCase):
    def setUp(self):
        self.extractor = MERTExtractor(lazy_load=True)

    def test_single_embedding_shape_and_norm(self):
        # 1-second 24kHz synthetic tone
        t = np.linspace(0, 1, 24000, endpoint=False)
        waveform = (np.sin(2 * np.pi * 440 * t)).astype(np.float32)

        emb = self.extractor.extract_embedding_from_array(waveform, sample_rate=24000)

        # Check dimension is strictly 768
        self.assertEqual(emb.shape, (768,))
        self.assertEqual(emb.dtype, np.float32)

        # Check L2 unit normalization
        norm = np.linalg.norm(emb)
        self.assertAlmostEqual(norm, 1.0, places=4)

    def test_batch_embeddings_shape(self):
        t = np.linspace(0, 0.5, 12000, endpoint=False)
        batch = [
            (np.sin(2 * np.pi * (220 + i * 50) * t)).astype(np.float32)
            for i in range(20)
        ]

        embs = self.extractor.extract_batch_embeddings(batch, sample_rate=24000, batch_size=16)

        self.assertEqual(embs.shape, (20, 768))
        self.assertEqual(embs.dtype, np.float32)

        for i in range(20):
            norm = np.linalg.norm(embs[i])
            self.assertAlmostEqual(norm, 1.0, places=4)


class TestCLAPExtractor(unittest.TestCase):
    def setUp(self):
        self.extractor = CLAPExtractor(lazy_load=True)

    def test_audio_embedding_shape_and_norm(self):
        t = np.linspace(0, 1, 48000, endpoint=False)
        waveform = (np.sin(2 * np.pi * 880 * t)).astype(np.float32)

        emb = self.extractor.get_audio_embedding(waveform, sample_rate=48000)

        # Check dimension is strictly 512
        self.assertEqual(emb.shape, (512,))
        self.assertEqual(emb.dtype, np.float32)

        # Check L2 unit normalization
        norm = np.linalg.norm(emb)
        self.assertAlmostEqual(norm, 1.0, places=4)

    def test_text_embedding_shape_and_similarity(self):
        prompt = "relaxing ambient synthwave"
        text_emb = self.extractor.get_text_embedding(prompt)

        self.assertEqual(text_emb.shape, (512,))
        norm = np.linalg.norm(text_emb)
        self.assertAlmostEqual(norm, 1.0, places=4)

        # Test cross-modal similarity computation
        audio_emb = np.random.randn(512).astype(np.float32)
        audio_emb /= np.linalg.norm(audio_emb)

        sim = self.extractor.compute_cross_modal_similarity(audio_emb, text_emb)
        self.assertGreaterEqual(sim, -1.0)
        self.assertLessEqual(sim, 1.0)


class TestMoodTagger(unittest.TestCase):
    def setUp(self):
        self.tagger = MoodTagger()

    def test_valence_arousal_bounds(self):
        # Test random 768-dim embeddings across various distributions
        for seed in [42, 101, 777, 9999]:
            np.random.seed(seed)
            emb = np.random.randn(768).astype(np.float32)
            emb /= np.linalg.norm(emb)

            valence, arousal = self.tagger.predict(emb)

            # Valence and arousal must strictly be bounded in [0.0, 1.0]
            self.assertGreaterEqual(valence, 0.0, f"Valence {valence} < 0.0")
            self.assertLessEqual(valence, 1.0, f"Valence {valence} > 1.0")
            self.assertGreaterEqual(arousal, 0.0, f"Arousal {arousal} < 0.0")
            self.assertLessEqual(arousal, 1.0, f"Arousal {arousal} > 1.0")

    def test_predict_batch_bounds(self):
        np.random.seed(123)
        batch = np.random.randn(10, 768).astype(np.float32)
        preds = self.tagger.predict_batch(batch)

        self.assertEqual(preds.shape, (10, 2))
        self.assertTrue(np.all(preds >= 0.0))
        self.assertTrue(np.all(preds <= 1.0))


class TestFeaturePipeline(unittest.TestCase):
    def setUp(self):
        self.pipeline = FeaturePipeline(lazy_load=True)

    def test_feature_bundle_creation_and_blobs(self):
        t = np.linspace(0, 0.5, 24000, endpoint=False)
        audio = (np.sin(2 * np.pi * 330 * t)).astype(np.float32)

        bundle = self.pipeline.process_audio_array(
            track_id="track_001",
            audio_array=audio,
            sample_rate=48000,
            bpm=128.0,
            key_sig="Am",
        )

        self.assertEqual(bundle.track_id, "track_001")
        self.assertEqual(bundle.mert_embedding.shape, (768,))
        self.assertEqual(bundle.clap_embedding.shape, (512,))
        self.assertGreaterEqual(bundle.valence, 0.0)
        self.assertLessEqual(bundle.valence, 1.0)
        self.assertGreaterEqual(bundle.arousal, 0.0)
        self.assertLessEqual(bundle.arousal, 1.0)

        # Verify BLOB serializations (float32 = 4 bytes per element)
        mert_blob = bundle.mert_to_blob()
        clap_blob = bundle.clap_to_blob()
        self.assertEqual(len(mert_blob), 768 * 4)
        self.assertEqual(len(clap_blob), 512 * 4)

        # Verify exact round-trip deserialization
        restored_mert = FeatureBundle.mert_from_blob(mert_blob)
        restored_clap = FeatureBundle.clap_from_blob(clap_blob)
        np.testing.assert_array_almost_equal(restored_mert, bundle.mert_embedding)
        np.testing.assert_array_almost_equal(restored_clap, bundle.clap_embedding)


class TestVectorStoreANN(unittest.TestCase):
    def setUp(self):
        self.store = VectorStore(dimensions=768, db_path=":memory:")

    def tearDown(self):
        self.store.close()

    def test_ann_correctness(self):
        np.random.seed(42)

        # Create 20 random item vectors
        item_ids = [f"song_{i}" for i in range(20)]
        for i, item_id in enumerate(item_ids):
            vec = np.random.randn(768).astype(np.float32)
            self.store.add(item_id, vec, metadata={"index": i})

        self.assertEqual(self.store.count(), 20)

        # Target item to search for
        target_id = "song_7"
        target_vec = self.store.get(target_id)
        self.assertIsNotNone(target_vec)

        # Search with the exact target vector
        results = self.store.search(target_vec, k=5)

        self.assertGreater(len(results), 0)
        top_id, top_sim = results[0]

        # ANN Correctness: Top-1 match must be the exact item with similarity ~ 1.0
        self.assertEqual(top_id, target_id)
        self.assertAlmostEqual(top_sim, 1.0, places=3)

        # Check results are in descending similarity order
        similarities = [r[1] for r in results]
        self.assertEqual(similarities, sorted(similarities, reverse=True))

    def test_removal_and_count(self):
        vec = np.ones(768, dtype=np.float32)
        self.store.add("del_me", vec)
        self.assertEqual(self.store.count(), 1)

        removed = self.store.remove("del_me")
        self.assertTrue(removed)
        self.assertEqual(self.store.count(), 0)
        self.assertIsNone(self.store.get("del_me"))


class TestLibraryBatchIndexer(unittest.IsolatedAsyncioTestCase):
    async def test_batch_indexer_progress_stream(self):
        indexer = LibraryBatchIndexer(batch_size=4)

        tracks = [(f"track_{i}", f"Mock Song {i}") for i in range(10)]

        # Subscribe to SSE generator
        events = []
        gen = indexer.subscribe()
        initial = await gen.__anext__()
        events.append(initial)

        async def collect_events():
            async for ev in gen:
                events.append(ev)

        subscriber_task = asyncio.create_task(collect_events())

        # Start reindex
        progress = await indexer.reindex_library(tracks)

        await subscriber_task

        self.assertEqual(progress.status, "completed")
        self.assertEqual(progress.indexed, 10)
        self.assertEqual(progress.total, 10)

        # Verify events received
        event_names = [e["event"] for e in events]
        self.assertIn("indexing_started", event_names)
        self.assertIn("indexing_progress", event_names)
        self.assertIn("indexing_completed", event_names)

        # Verify VectorStore contains indexed items
        self.assertEqual(indexer.vector_store.count(), 10)
        self.assertEqual(indexer.clap_store.count(), 10)


if __name__ == "__main__":
    unittest.main()
