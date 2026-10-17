import unittest
from server.engine.scoring.meld_scorer import (
    W_SOURCE,
    W_AFFINITY,
    W_GENRE,
    W_RECENCY,
    MAX_TRACKS_PER_ARTIST,
    Bucket,
    ArtistInfo,
    TrackInfo,
    build_user_taste_profile,
    find_genre_neighbors,
    build_candidate,
    diversify,
    score_and_recommend,
    jaccard_similarity,
)


class TestMeldScorer(unittest.TestCase):

    def setUp(self):
        self.artist1 = ArtistInfo(id="art1", name="M83", genres={"electronic", "synthpop", "dream pop"})
        self.artist2 = ArtistInfo(id="art2", name="Daft Punk", genres={"electronic", "french house", "disco"})
        self.artist3 = ArtistInfo(id="art3", name="The Weeknd", genres={"r&b", "pop"})
        self.artist4 = ArtistInfo(id="art4", name="Kavinsky", genres={"electronic", "synthwave", "french house"})

        self.track1 = TrackInfo(id="trk1", name="Midnight City", artist_ids=["art1"], genres={"electronic"})
        self.track2 = TrackInfo(id="trk2", name="One More Time", artist_ids=["art2"], genres={"electronic"})
        self.track3 = TrackInfo(id="trk3", name="Starboy", artist_ids=["art3"], genres={"r&b"})

        self.profile = build_user_taste_profile(
            profile_artists=[self.artist1, self.artist2, self.artist3, self.artist4],
            profile_tracks=[self.track1, self.track2, self.track3],
        )

    def test_weights_sum_to_one(self):
        total_weight = W_SOURCE + W_AFFINITY + W_GENRE + W_RECENCY
        self.assertAlmostEqual(total_weight, 1.0, places=4)

    def test_artist_affinity_normalization(self):
        # art1 is first in artists list and first in tracks, so it should have affinity 1.0
        aff_art1 = self.profile.artist_affinity_map.get("art1", 0.0)
        self.assertAlmostEqual(aff_art1, 1.0, places=4)

        # Later artists should have monotonically decreasing affinity
        aff_art2 = self.profile.artist_affinity_map.get("art2", 0.0)
        aff_art3 = self.profile.artist_affinity_map.get("art3", 0.0)
        self.assertGreater(aff_art1, aff_art2)
        self.assertGreater(aff_art2, aff_art3)

    def test_jaccard_similarity(self):
        s1 = {"electronic", "synthpop"}
        s2 = {"electronic", "disco"}
        # intersection = 1, union = 3 -> 1/3
        self.assertAlmostEqual(jaccard_similarity(s1, s2), 1.0 / 3.0, places=4)
        self.assertEqual(jaccard_similarity(set(), s1), 0.0)

    def test_find_genre_neighbors(self):
        # For seed art1 (genres: electronic, synthpop, dream pop)
        # Neighbor art4 shares electronic and french house
        neighbors = find_genre_neighbors(
            seed_artist_ids={"art1"},
            seed_genres={"electronic", "synthpop"},
            profile=self.profile,
            limit=3,
        )
        self.assertNotIn("art1", neighbors)
        self.assertIn("art2", neighbors)

    def test_candidate_scoring(self):
        cand_track = TrackInfo(id="cand1", name="Nightcall", artist_ids=["art4"], genres={"synthwave"})
        scored = build_candidate(
            cand_track,
            Bucket.SEED_ARTIST,
            seed_genres={"electronic", "synthwave"},
            profile=self.profile,
        )
        self.assertEqual(scored.source_score, 1.0)
        self.assertGreater(scored.final_score, 0.0)

    def test_diversification_caps_per_artist(self):
        # Create 6 tracks by art1
        art1_tracks = [
            TrackInfo(id=f"t{i}", name=f"Song {i}", artist_ids=["art1"])
            for i in range(6)
        ]
        # Create 2 tracks by art2
        art2_tracks = [
            TrackInfo(id=f"t_other_{i}", name=f"Other {i}", artist_ids=["art2"])
            for i in range(2)
        ]

        candidates = [
            (t, Bucket.SEED_ARTIST) for t in art1_tracks
        ] + [
            (t, Bucket.SAME_ALBUM) for t in art2_tracks
        ]

        recommended = score_and_recommend(
            seed_track=self.track1,
            candidates=candidates,
            profile=self.profile,
            limit=10,
        )

        art1_count = sum(1 for t in recommended if "art1" in t.artist_ids)
        self.assertLessEqual(
            art1_count,
            MAX_TRACKS_PER_ARTIST,
            f"Expected max {MAX_TRACKS_PER_ARTIST} tracks for art1, got {art1_count}",
        )


if __name__ == "__main__":
    unittest.main()
