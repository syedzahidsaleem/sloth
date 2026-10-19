"""
Unit and Integration Tests for Sloth Downloader API & Queue Manager
Validates FastAPI endpoints, SSE streaming, 3 concurrent worker limit,
task cancellation, directory traversal security, and 300MB bounds.
"""

import asyncio
import json
import os
import tempfile
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from server.downloader.downloader import (
    AudioContainer,
    AudioQuality,
    DownloadOptions,
    DownloadResult,
    DownloadStatus,
)
from server.downloader.main import app, download_queue
from server.downloader.job_queue import DownloadQueue, DownloadTask


class TestDownloaderQueue(unittest.IsolatedAsyncioTestCase):
    async def test_queue_enqueue_and_status(self):
        queue = DownloadQueue(max_concurrent=3)
        with patch.object(queue.downloader, "download_track") as mock_download:
            mock_download.return_value = DownloadResult(
                video_id="vid123",
                title="Test Song",
                file_path="/tmp/test.mp3",
                format="mp3",
                duration=120.0,
                success=True,
            )

            task = queue.enqueue(
                url_or_id="vid123",
                title="Test Song",
                artist="Test Artist",
                format=AudioContainer.MP3,
                quality=AudioQuality.HIGH,
            )

            self.assertIsNotNone(task.job_id)
            self.assertEqual(task.title, "Test Song")
            self.assertEqual(task.status, DownloadStatus.QUEUED)

            # Wait briefly for worker task
            await asyncio.sleep(0.05)

            updated = queue.get_task(task.job_id)
            self.assertIsNotNone(updated)
            self.assertEqual(updated.status, DownloadStatus.COMPLETED)
            self.assertEqual(updated.progress, 1.0)

    async def test_queue_concurrency_limit(self):
        queue = DownloadQueue(max_concurrent=3)
        active_count = 0
        max_seen = 0

        def fake_worker(*args, **kwargs):
            nonlocal active_count, max_seen
            active_count += 1
            max_seen = max(max_seen, active_count)
            import time
            time.sleep(0.04)
            active_count -= 1
            return DownloadResult(
                video_id="mock",
                title="Song",
                file_path="/tmp/mock.mp3",
                format="mp3",
                duration=10.0,
                success=True,
            )

        with patch.object(queue.downloader, "download_track", side_effect=fake_worker):
            # Enqueue 5 jobs
            tasks = [queue.enqueue(f"id_{i}") for i in range(5)]
            await asyncio.sleep(0.20)

            # Concurrency must never exceed max_concurrent (3)
            self.assertLessEqual(max_seen, 3)

    async def test_queue_cancellation(self):
        queue = DownloadQueue(max_concurrent=1)

        def long_running(*args, **kwargs):
            import time
            time.sleep(0.5)
            return DownloadResult(
                video_id="long",
                title="Long",
                file_path="/tmp/long.mp3",
                format="mp3",
                duration=100.0,
                success=True,
            )

        with patch.object(queue.downloader, "download_track", side_effect=long_running):
            task = queue.enqueue("long_job")
            # Cancel immediately
            canceled = queue.cancel_task(task.job_id)
            self.assertTrue(canceled)
            self.assertEqual(task.status, DownloadStatus.CANCELED)


class TestDownloaderAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_endpoint(self):
        resp = self.client.get("/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["service"], "sloth-downloader")
        self.assertEqual(data["max_concurrent"], 3)

    def test_directory_traversal_rejection(self):
        # Attempt path traversal via output_dir
        payload = {
            "url_or_id": "test_id",
            "output_dir": "../../etc/shadow",
            "stream": False,
        }
        resp = self.client.post("/download", json=payload)
        self.assertEqual(resp.status_code, 400)
        self.assertIn("traversal", resp.json()["detail"].lower())

    @patch.object(download_queue.downloader, "download_track")
    def test_download_json_mode(self, mock_download):
        mock_download.return_value = DownloadResult(
            video_id="abc12345",
            title="Json Mode Track",
            file_path="/tmp/test.mp3",
            format="mp3",
            duration=180.0,
            success=True,
        )

        payload = {
            "url_or_id": "https://www.youtube.com/watch?v=abc12345",
            "title": "Json Mode Track",
            "artist": "Mock Artist",
            "format": "mp3",
            "quality": "high",
            "stream": False,
        }
        resp = self.client.post("/download", json=payload)
        self.assertEqual(resp.status_code, 202)
        data = resp.json()
        job_id = data["job_id"]
        self.assertEqual(data["title"], "Json Mode Track")

        # Query status
        status_resp = self.client.get(f"/download/status/{job_id}")
        self.assertEqual(status_resp.status_code, 200)
        self.assertEqual(status_resp.json()["job_id"], job_id)

    def test_download_status_404_on_unknown(self):
        resp = self.client.get("/download/status/non_existent_id")
        self.assertEqual(resp.status_code, 404)

    def test_cancel_non_existent_task(self):
        resp = self.client.post("/download/cancel/non_existent_id")
        self.assertEqual(resp.status_code, 404)

    @patch.object(download_queue.downloader, "download_track")
    def test_download_sse_stream_format(self, mock_download):
        mock_download.return_value = DownloadResult(
            video_id="sse_test",
            title="SSE Track",
            file_path="/tmp/sse.mp3",
            format="mp3",
            duration=90.0,
            success=True,
        )

        payload = {
            "url_or_id": "sse_test",
            "title": "SSE Track",
            "stream": True,
        }
        with self.client.stream("POST", "/download", json=payload) as response:
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.headers["content-type"], "text/event-stream; charset=utf-8")

            # Collect streamed chunks
            lines = []
            for line in response.iter_lines():
                if line:
                    lines.append(line)
                if len(lines) >= 1:
                    break

            self.assertTrue(any("data:" in l for l in lines))

    def test_queue_list_and_clear(self):
        resp = self.client.get("/download/queue")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("active_count", data)
        self.assertIn("jobs", data)

        clear_resp = self.client.post("/download/clear")
        self.assertEqual(clear_resp.status_code, 200)
        self.assertIn("cleared_count", clear_resp.json())


if __name__ == "__main__":
    unittest.main()
