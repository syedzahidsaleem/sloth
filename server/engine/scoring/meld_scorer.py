"""
meld_scorer.py — ported from Meld (GPL-3.0). Original logic by FrancescoGrazioso. Adapted to Python.

Baseline recommendation scoring engine based on Meld's SpotifyRecommendationEngine.kt.
Combines 4 distinct signals:
  1. Source relevance (Seed artist, same album, genre neighbor, user top pool)
  2. Artist affinity (Position-weighted taste profile, normalized [0, 1])
  3. Genre overlap (Jaccard similarity between seed artist and candidate artist genres)
  4. Recency boost (Indicator for user's short-term favorite artists)
Enforces diversification via per-artist caps and bucket interleaving.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Set, Tuple
import time


# Scoring weights (sum to 1.0).
# Populated exactly from Meld's SpotifyRecommendationEngine.kt:
# Note from upstream: A popularity-similarity term was removed as GQL candidates lacked
# popularity data, so its 10% weight was redistributed proportionally over remaining signals.
W_SOURCE: float = 0.28
W_AFFINITY: float = 0.33
W_GENRE: float = 0.22
W_RECENCY: float = 0.17

MAX_TRACKS_PER_ARTIST: int = 3
PROFILE_TTL_SECONDS: int = 6 * 60 * 60  # 6 hours


class Bucket(Enum):
    """
    Candidate bucket describing source relevance.
    Values match Meld's Bucket enum sourceScore.
    """
    SEED_ARTIST = 1.0
    SAME_ALBUM = 0.85
    GENRE_NEIGHBOR = 0.65
    USER_TOP = 0.45

    @property
    def source_score(self) -> float:
        return self.value


@dataclass(frozen=True)
class ArtistInfo:
    id: str
    name: str = ""
    genres: Set[str] = field(default_factory=set)


@dataclass(frozen=True)
class TrackInfo:
    id: str
    name: str
    artist_ids: List[str]
    album_id: Optional[str] = None
    genres: Set[str] = field(default_factory=set)
    duration_ms: Optional[int] = None


@dataclass
class ScoredCandidate:
    track: TrackInfo
    bucket: Bucket
    source_score: float
    artist_affinity: float
    genre_overlap: float
    recency_boost: float

    @property
    def final_score(self) -> float:
        return (
            (W_SOURCE * self.source_score)
            + (W_AFFINITY * self.artist_affinity)
            + (W_GENRE * self.genre_overlap)
            + (W_RECENCY * self.recency_boost)
        )


@dataclass
class UserTasteProfile:
    artist_affinity_map: Dict[str, float] = field(default_factory=dict)
    artist_genre_map: Dict[str, Set[str]] = field(default_factory=dict)
    top_track_pool: List[TrackInfo] = field(default_factory=list)
    short_term_artist_ids: Set[str] = field(default_factory=set)
    last_profile_refresh: float = 0.0

    def is_valid(self, ttl_seconds: int = PROFILE_TTL_SECONDS) -> bool:
        if not self.artist_affinity_map:
            return False
        return (time.time() - self.last_profile_refresh) < ttl_seconds


def jaccard_similarity(set_a: Set[str], set_b: Set[str]) -> float:
    """Calculates Jaccard overlap: |A ∩ B| / |A ∪ B|."""
    if not set_a or not set_b:
        return 0.0
    intersection = len(set_a.intersection(set_b))
    union = len(set_a.union(set_b))
    return float(intersection) / float(union) if union > 0 else 0.0


def build_user_taste_profile(
    profile_artists: List[ArtistInfo],
    profile_tracks: List[TrackInfo],
) -> UserTasteProfile:
    """
    Builds or refreshes the user taste profile using position-weighted scoring.
    Ported directly from Meld's SpotifyRecommendationEngine.ensureProfileLoaded().
    """
    if not profile_artists and not profile_tracks:
        return UserTasteProfile()

    affinity_builder: Dict[str, float] = {}
    genre_builder: Dict[str, Set[str]] = {}

    # 1. Position score from top artists (weight 2.0)
    num_artists = max(1, len(profile_artists))
    for index, artist in enumerate(profile_artists):
        if not artist.id:
            continue
        position_score = 1.0 - (float(index) / float(num_artists))
        affinity_builder[artist.id] = (
            affinity_builder.get(artist.id, 0.0) + (position_score * 2.0)
        )
        if artist.genres:
            genre_builder.setdefault(artist.id, set()).update(artist.genres)

    # 2. Add affinity from track artists (weaker signal: weight 1.0)
    num_tracks = max(1, len(profile_tracks))
    for index, track in enumerate(profile_tracks):
        position_score = 1.0 - (float(index) / float(num_tracks))
        for artist_id in track.artist_ids:
            if not artist_id:
                continue
            affinity_builder[artist_id] = (
                affinity_builder.get(artist_id, 0.0) + (position_score * 1.0)
            )

    # 3. Normalize affinity to [0.0, 1.0]
    max_affinity = max(affinity_builder.values()) if affinity_builder else 1.0
    normalized_affinity: Dict[str, float] = {}
    if max_affinity > 0.0:
        for artist_id, val in affinity_builder.items():
            normalized_affinity[artist_id] = val / max_affinity
    else:
        normalized_affinity = affinity_builder

    # 4. Deduplicated top track pool
    seen_track_ids: Set[str] = set()
    track_pool: List[TrackInfo] = []
    for track in profile_tracks:
        if track.id and track.id not in seen_track_ids:
            seen_track_ids.add(track.id)
            track_pool.append(track)

    # 5. Top 10 artists considered "short-term" favorites for recency boost
    recent_artists: Set[str] = {
        a.id for a in profile_artists[:10] if a.id
    }

    return UserTasteProfile(
        artist_affinity_map=normalized_affinity,
        artist_genre_map=genre_builder,
        top_track_pool=track_pool,
        short_term_artist_ids=recent_artists,
        last_profile_refresh=time.time(),
    )


def find_genre_neighbors(
    seed_artist_ids: Set[str],
    seed_genres: Set[str],
    profile: UserTasteProfile,
    limit: int = 6,
) -> List[str]:
    """
    Finds artists from user profile sharing genres with seed artists (excluding seed artists).
    Ranked by: (genre overlap * 0.6) + (user affinity * 0.4).
    Threshold > 0.05.
    Ported from Meld's SpotifyRecommendationEngine.findGenreNeighbors().
    """
    if not seed_genres:
        # Fall back to highest-affinity artists not in seed
        available = [
            (artist_id, aff)
            for artist_id, aff in profile.artist_affinity_map.items()
            if artist_id not in seed_artist_ids
        ]
        available.sort(key=lambda x: x[1], reverse=True)
        return [a[0] for a in available[:5]]

    ranked_neighbors: List[Tuple[str, float]] = []
    for artist_id, genres in profile.artist_genre_map.items():
        if artist_id in seed_artist_ids:
            continue
        jaccard = jaccard_similarity(seed_genres, genres)
        affinity = profile.artist_affinity_map.get(artist_id, 0.0)
        combined_score = (jaccard * 0.6) + (affinity * 0.4)
        if combined_score > 0.05:
            ranked_neighbors.append((artist_id, combined_score))

    ranked_neighbors.sort(key=lambda x: x[1], reverse=True)
    return [artist_id for artist_id, _ in ranked_neighbors[:limit]]


def build_candidate(
    track: TrackInfo,
    bucket: Bucket,
    seed_genres: Set[str],
    profile: UserTasteProfile,
) -> ScoredCandidate:
    """
    Scores a single candidate track across the 4 Meld signals.
    """
    # 1. Best affinity among track artists
    affinity = 0.0
    if track.artist_ids:
        affinity = max(
            profile.artist_affinity_map.get(a_id, 0.0)
            for a_id in track.artist_ids
        )

    # 2. Genre overlap with seed genres
    track_genres: Set[str] = set(track.genres)
    for a_id in track.artist_ids:
        track_genres.update(profile.artist_genre_map.get(a_id, set()))

    genre_overlap = jaccard_similarity(seed_genres, track_genres)

    # 3. Recency boost (1.0 if any artist is in user's top 10 short-term)
    recency = 1.0 if any(a_id in profile.short_term_artist_ids for a_id in track.artist_ids) else 0.0

    return ScoredCandidate(
        track=track,
        bucket=bucket,
        source_score=bucket.source_score,
        artist_affinity=affinity,
        genre_overlap=genre_overlap,
        recency_boost=recency,
    )


def diversify(
    ranked_candidates: List[ScoredCandidate],
    limit: int = 50,
    max_per_artist: int = MAX_TRACKS_PER_ARTIST,
) -> List[TrackInfo]:
    """
    Diversifies the ranked candidate list to prevent monotony:
      - Max MAX_TRACKS_PER_ARTIST per artist
      - Bucket interleaving: every ~3 tracks, prefer a different bucket source
    Ported from Meld's SpotifyRecommendationEngine.diversify().
    """
    result: List[TrackInfo] = []
    artist_count: Dict[str, int] = {}
    last_buckets: List[Bucket] = []
    used_indices: Set[int] = set()

    while len(result) < limit and len(used_indices) < len(ranked_candidates):
        # Prefer a different bucket if the last 3 tracks came from the exact same bucket
        prefer_different_bucket = (
            len(last_buckets) >= 3
            and len(set(last_buckets[-3:])) == 1
        )

        best_index = -1
        for i, candidate in enumerate(ranked_candidates):
            if i in used_indices:
                continue

            main_artist = candidate.track.artist_ids[0] if candidate.track.artist_ids else ""
            if artist_count.get(main_artist, 0) >= max_per_artist:
                continue

            if prefer_different_bucket and last_buckets:
                last_bucket = last_buckets[-1]
                if candidate.bucket != last_bucket:
                    best_index = i
                    break
                if best_index == -1:
                    best_index = i
            else:
                best_index = i
                break

        if best_index == -1:
            break

        chosen = ranked_candidates[best_index]
        used_indices.add(best_index)
        result.append(chosen.track)

        main_artist = chosen.track.artist_ids[0] if chosen.track.artist_ids else ""
        artist_count[main_artist] = artist_count.get(main_artist, 0) + 1
        last_buckets.append(chosen.bucket)
        if len(last_buckets) > 5:
            last_buckets.pop(0)

    return result


def score_and_recommend(
    seed_track: TrackInfo,
    candidates: List[Tuple[TrackInfo, Bucket]],
    profile: UserTasteProfile,
    limit: int = 50,
) -> List[TrackInfo]:
    """
    Executes the complete Meld recommendation pipeline for a given candidate set.
    """
    seed_artist_ids = set(seed_track.artist_ids)
    seed_genres: Set[str] = set(seed_track.genres)
    for a_id in seed_artist_ids:
        seed_genres.update(profile.artist_genre_map.get(a_id, set()))

    seen_ids: Set[str] = {seed_track.id}
    scored: List[ScoredCandidate] = []

    for track, bucket in candidates:
        if track.id and track.id not in seen_ids:
            seen_ids.add(track.id)
            scored.append(build_candidate(track, bucket, seed_genres, profile))

    # Rank descending by composite final_score
    scored.sort(key=lambda c: c.final_score, reverse=True)

    # Diversify
    return diversify(scored, limit=limit)
