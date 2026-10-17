import shutil
import tempfile
import time
import unittest
from server.engine.cache import (
    MemoryLRUCache,
    HostCooldownTracker,
    ThreeTierCache,
    TTL_STREAM_URL_SECONDS,
)


class TestCacheEngine(unittest.TestCase):

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_lru_capacity_eviction(self):
        cache = MemoryLRUCache[str](max_entries=3)
        cache.put("k1", "v1", ttl_seconds=100)
        cache.put("k2", "v2", ttl_seconds=100)
        cache.put("k3", "v3", ttl_seconds=100)

        # Access k1 to make it most recently used
        self.assertEqual(cache.get("k1"), "v1")

        # Adding k4 should evict k2 (least recently used)
        cache.put("k4", "v4", ttl_seconds=100)
        self.assertIsNone(cache.get("k2"))
        self.assertEqual(cache.get("k1"), "v1")
        self.assertEqual(cache.get("k3"), "v3")
        self.assertEqual(cache.get("k4"), "v4")

    def test_ttl_expiration(self):
        cache = MemoryLRUCache[str](max_entries=10)
        # Put item with 0s TTL (immediately expired)
        cache.put("exp", "val", ttl_seconds=0)
        time.sleep(0.01)
        self.assertIsNone(cache.get("exp"))

    def test_generation_tracking(self):
        cache = MemoryLRUCache[str](max_entries=10)
        gen = cache.get_generation("track_url")
        self.assertEqual(gen, 0)

        # Invalidate increments generation
        cache.put("track_url", "http://old", ttl_seconds=10)
        cache.invalidate("track_url")
        new_gen = cache.get_generation("track_url")
        self.assertEqual(new_gen, 1)

        # Stale put with old expected generation should fail
        success = cache.put("track_url", "http://stale", ttl_seconds=10, expected_generation=0)
        self.assertFalse(success)

        # Fresh put with correct generation should succeed
        success = cache.put("track_url", "http://fresh", ttl_seconds=10, expected_generation=new_gen)
        self.assertTrue(success)
        self.assertEqual(cache.get("track_url"), "http://fresh")

    def test_host_cooldown_tracker(self):
        tracker = HostCooldownTracker()
        host = "api.qobuz.squid.wtf"

        self.assertFalse(tracker.is_cooling_down(host))
        tracker.mark_cooling_down(host, duration_seconds=10)
        self.assertTrue(tracker.is_cooling_down(host))
        self.assertGreater(tracker.remaining_seconds(host), 0.0)

    def test_three_tier_cache_persistence_and_fallback(self):
        cache = ThreeTierCache(persistence_dir=self.temp_dir, memory_capacity=10)
        key = "spotify_user_profile"

        fetch_count = 0
        def fetcher():
            nonlocal fetch_count
            fetch_count += 1
            return {"user": "syed", "tier": "premium"}

        # 1st call fetches from Tier 3
        res1 = cache.get_or_fetch(key, fetcher, ttl_seconds=60)
        self.assertEqual(res1["user"], "syed")
        self.assertEqual(fetch_count, 1)

        # 2nd call hits Memory Tier 1 (fetcher not called)
        res2 = cache.get_or_fetch(key, fetcher, ttl_seconds=60)
        self.assertEqual(res2["user"], "syed")
        self.assertEqual(fetch_count, 1)

        # Clear memory to test Tier 2 Disk fallback
        cache.memory.clear()
        res3 = cache.get_or_fetch(key, fetcher, ttl_seconds=60)
        self.assertEqual(res3["user"], "syed")
        self.assertEqual(fetch_count, 1)  # Still 1 because disk was hit!


if __name__ == "__main__":
    unittest.main()
