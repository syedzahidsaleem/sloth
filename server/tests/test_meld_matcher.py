import unittest
from server.engine.scoring.meld_matcher import (
    normalize_string,
    get_bigrams,
    bigram_similarity,
    duration_score,
    match_score,
    match_score_precomputed,
    PrecomputedTrack,
    MatchOverride,
    encode_overrides,
    decode_overrides,
    WantedTrackQuery,
    QobuzCandidate,
    score_qobuz_candidate,
    EARLY_EXIT_THRESHOLD,
    ISRC_MATCH_BONUS,
)


class TestMeldMatcher(unittest.TestCase):
    """
    Direct verification matching Meld's SpotifyMapperMatchScoreTest.kt test cases.
    """

    def test_exact_title_artist_and_duration_produce_near_perfect_score(self):
        score = match_score(
            spotify_title="Bohemian Rhapsody",
            spotify_artist="Queen",
            spotify_duration_ms=354_000,
            candidate_title="Bohemian Rhapsody",
            candidate_artist="Queen",
            candidate_duration_sec=354,
        )
        self.assertGreaterEqual(score, 0.95, f"Expected >= 0.95, got {score}")

    def test_feat_and_remaster_tags_in_title_do_not_tank_the_score(self):
        score = match_score(
            spotify_title="Lose Yourself (feat. Eminem) [Remastered 2023]",
            spotify_artist="Eminem",
            spotify_duration_ms=326_000,
            candidate_title="Lose Yourself",
            candidate_artist="Eminem",
            candidate_duration_sec=326,
        )
        self.assertGreaterEqual(score, 0.90, f"Expected tag-stripped title >= 0.90, got {score}")

    def test_wrong_artist_drops_the_score_substantially(self):
        score = match_score(
            spotify_title="Imagine",
            spotify_artist="John Lennon",
            spotify_duration_ms=183_000,
            candidate_title="Imagine",
            candidate_artist="Ariana Grande",
            candidate_duration_sec=183,
        )
        self.assertLess(score, 0.80, f"Expected wrong artist < 0.80, got {score}")

    def test_null_candidate_duration_gives_neutral_duration_score(self):
        score = match_score(
            spotify_title="Flowers",
            spotify_artist="Miley Cyrus",
            spotify_duration_ms=200_000,
            candidate_title="Flowers",
            candidate_artist="Miley Cyrus",
            candidate_duration_sec=None,
        )
        self.assertGreaterEqual(score, 0.80, f"Expected neutral duration >= 0.80, got {score}")

    def test_duration_mismatch_thresholds_behave_monotonically(self):
        def score_at(diff_sec: int) -> float:
            return match_score(
                spotify_title="Song",
                spotify_artist="Artist",
                spotify_duration_ms=200_000,
                candidate_title="Song",
                candidate_artist="Artist",
                candidate_duration_sec=200 + diff_sec,
            )

        s0 = score_at(0)
        s3 = score_at(3)
        s7 = score_at(7)
        s20 = score_at(20)
        s60 = score_at(60)

        self.assertGreaterEqual(s0, s3)
        self.assertGreaterEqual(s3, s7)
        self.assertGreaterEqual(s7, s20)
        self.assertGreaterEqual(s20, s60)

    def test_early_exit_threshold_constant(self):
        self.assertAlmostEqual(EARLY_EXIT_THRESHOLD, 0.95, places=4)

    def test_precomputed_track_equals_direct_match(self):
        direct = match_score(
            spotify_title="Instant Crush",
            spotify_artist="Daft Punk",
            spotify_duration_ms=337_000,
            candidate_title="Instant Crush (Audio)",
            candidate_artist="Daft Punk ft. Julian Casablancas",
            candidate_duration_sec=338,
        )
        pre = PrecomputedTrack.from_track("Instant Crush", "Daft Punk", 337_000)
        cached = match_score_precomputed(
            pre,
            "Instant Crush (Audio)",
            "Daft Punk ft. Julian Casablancas",
            338,
        )
        self.assertAlmostEqual(direct, cached, places=5)

    def test_overrides_serialization_roundtrip(self):
        overrides = {
            "yt:123": MatchOverride(
                qobuz_track_id="qbz:999",
                label="Master FLAC",
                hires=True,
                bit_depth=24,
                sampling_rate_khz=96.0,
            )
        }
        encoded = encode_overrides(overrides)
        decoded = decode_overrides(encoded)
        self.assertIn("yt:123", decoded)
        self.assertEqual(decoded["yt:123"].qobuz_track_id, "qbz:999")
        self.assertTrue(decoded["yt:123"].hires)
        self.assertEqual(decoded["yt:123"].bit_depth, 24)

    def test_qobuz_isrc_exact_match_bonus(self):
        wanted = WantedTrackQuery(
            title="Starboy",
            artists=["The Weeknd"],
            isrc="USUM71607148",
            duration_ms=230_000,
        )
        matching_cand = QobuzCandidate(
            track_id="101",
            title="Starboy",
            artists=["The Weeknd"],
            isrc="USUM71607148",
            duration_sec=230,
            hires=True,
        )
        non_isrc_cand = QobuzCandidate(
            track_id="102",
            title="Starboy",
            artists=["The Weeknd"],
            isrc="DIFFERENT_ISRC",
            duration_sec=230,
        )

        score_match, ok_match = score_qobuz_candidate(wanted, matching_cand)
        score_other, ok_other = score_qobuz_candidate(wanted, non_isrc_cand)

        self.assertTrue(ok_match)
        self.assertGreaterEqual(score_match - score_other, ISRC_MATCH_BONUS - 20)


if __name__ == "__main__":
    unittest.main()
