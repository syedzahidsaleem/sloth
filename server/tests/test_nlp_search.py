"""
test_nlp_search.py — Unit Tests for Ask Sloth NLP Search Pipeline and API
"""

import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from server.engine.main import app
from server.engine.nlp_search import NaturalQueryParser, NaturalSearchPipeline
from server.engine.recommender import SLOTHRecommender


class TestNaturalQueryParser(unittest.TestCase):
    def setUp(self):
        self.parser = NaturalQueryParser(api_key=None)  # forces deterministic rule-based mode

    def test_rule_based_chill_jazz_study(self):
        query = "rainy late night jazz piano for deep work studying"
        parsed = self.parser.parse_sync(query)

        self.assertIn("mood", parsed)
        self.assertIn("genres", parsed)
        self.assertIn("activity", parsed)
        self.assertIn("filters", parsed)
        self.assertIn("text_embedding_query", parsed)
        self.assertIn("interpretation", parsed)

        self.assertIn("jazz", [g.lower() for g in parsed["genres"]])
        self.assertIn(parsed["mood"], ["chill", "rainy", "focus"])
        self.assertEqual(parsed["activity"], "studying")
        self.assertIn("jazz", parsed["text_embedding_query"].lower())

    def test_rule_based_bpm_range_parsing(self):
        query = "120-140 bpm cyberpunk synthwave for coding"
        parsed = self.parser.parse_sync(query)

        self.assertEqual(parsed["filters"]["bpm_min"], 120.0)
        self.assertEqual(parsed["filters"]["bpm_max"], 140.0)
        self.assertIn("synthwave", [g.lower() for g in parsed["genres"]])
        self.assertEqual(parsed["activity"], "coding")

    def test_rule_based_single_bpm_parsing(self):
        query = "high energy 140 bpm workout drum and bass"
        parsed = self.parser.parse_sync(query)

        self.assertIsNotNone(parsed["filters"]["bpm_min"])
        self.assertIsNotNone(parsed["filters"]["bpm_max"])
        # Should center around 140
        self.assertTrue(parsed["filters"]["bpm_min"] <= 140.0 <= parsed["filters"]["bpm_max"])

    def test_rule_based_tempo_fallback(self):
        query = "intense workout gym hype"
        parsed = self.parser.parse_sync(query)
        self.assertGreaterEqual(parsed["filters"]["bpm_min"], 120.0)

        query_slow = "ambient peaceful music for sleep"
        parsed_slow = self.parser.parse_sync(query_slow)
        self.assertLessEqual(parsed_slow["filters"]["bpm_max"], 100.0)

    def test_json_extraction_helpers(self):
        raw_fence = '```json\n{"mood": "chill", "genres": ["ambient"]}\n```'
        res = self.parser._extract_json(raw_fence)
        self.assertIsNotNone(res)
        self.assertEqual(res["mood"], "chill")


class TestNaturalSearchPipeline(unittest.TestCase):
    def setUp(self):
        self.recommender = SLOTHRecommender(db_path=None)
        self.pipeline = NaturalSearchPipeline(recommender=self.recommender)

    def test_search_pipeline_execution(self):
        import asyncio

        res = asyncio.run(self.pipeline.search(
            query="rainy jazz for studying",
            user_id="test_user",
            limit=10,
        ))

        self.assertEqual(res["query"], "rainy jazz for studying")
        self.assertIn("interpretation", res)
        self.assertIn("parsed_query", res)
        self.assertIsInstance(res["results"], list)
        self.assertEqual(len(res["results"]), 10)
        self.assertEqual(res["count"], 10)
        self.assertGreater(res["elapsed_ms"], 0.0)

        # Check track structure
        top_track = res["results"][0]
        self.assertIn("track_id", top_track)
        self.assertIn("score", top_track)
        self.assertIn("title", top_track)
        self.assertIn("bpm", top_track)

    def test_search_empty_query(self):
        import asyncio
        res = asyncio.run(self.pipeline.search(query="   ", limit=10))
        self.assertEqual(res["count"], 0)
        self.assertEqual(len(res["results"]), 0)

    def test_search_bpm_filter_satisfaction(self):
        import asyncio
        res = asyncio.run(self.pipeline.search(
            query="140 bpm energetic dance music",
            limit=5,
        ))
        self.assertEqual(res["count"], 5)
        # Results should be sorted by score descending
        scores = [t["score"] for t in res["results"]]
        self.assertEqual(scores, sorted(scores, reverse=True))


class TestNaturalSearchAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_post_search_natural_root(self):
        payload = {
            "query": "late night lo-fi hip hop for studying",
            "user_id": "test_api_user",
            "limit": 15,
        }
        res = self.client.post("/search/natural", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["query"], payload["query"])
        self.assertIn("interpretation", data)
        self.assertEqual(len(data["results"]), 15)

    def test_post_search_natural_prefixed(self):
        payload = {
            "query": "ambient chill synthwave",
            "limit": 5,
        }
        res = self.client.post("/api/engine/search/natural", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(len(data["results"]), 5)

    def test_search_natural_validation(self):
        # Invalid payload: missing required query
        res = self.client.post("/search/natural", json={})
        self.assertEqual(res.status_code, 422)


if __name__ == "__main__":
    unittest.main()
