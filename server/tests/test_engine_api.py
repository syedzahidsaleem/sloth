"""
Unit tests for Sloth AI Engine FastAPI Endpoints & SSE Streaming
"""

import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from server.engine.main import app
from server.tests.test_graph_engine import create_test_db


class TestEngineAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        # Create a temp sqlite file for tests
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = str(Path(self.temp_dir.name) / "test_engine.db")

        # Copy test schema & data from create_test_db into file
        mem_conn = create_test_db()
        file_conn = sqlite3.connect(self.db_path)
        mem_conn.backup(file_conn)
        file_conn.close()
        mem_conn.close()

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_health_endpoint(self):
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["service"], "sloth-engine")
        self.assertIn("graph", data["features"])

    def test_trigger_training_endpoint(self):
        res = self.client.post(
            "/api/engine/graph/train",
            json={
                "db_path": self.db_path,
                "embedding_dim": 64,
                "pretrain_epochs": 2,
                "finetune_epochs": 1,
            },
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "training_started")

    def test_get_recommendations_endpoint(self):
        res = self.client.get(
            "/api/engine/graph/recommend",
            params={"user_id": "user_primary", "top_k": 3, "db_path": self.db_path},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["user_id"], "user_primary")
        self.assertIn("recommendations", data)
        self.assertLessEqual(len(data["recommendations"]), 3)

    def test_sse_stream_training_endpoint(self):
        # Request SSE endpoint
        with self.client.stream(
            "GET",
            "/api/engine/graph/train/stream",
            params={
                "db_path": self.db_path,
                "embedding_dim": 64,
                "pretrain_epochs": 2,
                "finetune_epochs": 1,
            },
        ) as response:
            self.assertEqual(response.status_code, 200)
            self.assertIn("text/event-stream", response.headers.get("content-type", ""))

            lines = []
            for line in response.iter_lines():
                if line:
                    lines.append(line)
                    if len(lines) >= 3:
                        break

            self.assertGreaterEqual(len(lines), 1)
            first_line = lines[0]
            self.assertTrue(first_line.startswith("data: "))
            parsed = json.loads(first_line[6:])
            self.assertIn("phase", parsed)


if __name__ == "__main__":
    unittest.main()
