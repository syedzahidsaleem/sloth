"""
meld_matcher.py — ported from Meld (GPL-3.0). Original logic by FrancescoGrazioso. Adapted to Python.

Baseline cross-source track matching engine supporting:
  - 7-regex title and artist normalization (stripping feat, ft, brackets, remaster, remix)
  - Fast Bigram Dice coefficient similarity calculation
  - Duration differential scoring (2s, 5s, 10s, 30s buckets)
  - Composite matching score: Title * 0.45 + Artist * 0.35 + Duration * 0.20
  - Early exit optimization (> 0.95)
  - ISRC exact matching (+1000 score priority)
  - Qobuz candidate scoring & Hi-Res evaluation
  - Match override JSON serialization/deserialization
"""

from __future__ import annotations
import json
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple


# Pre-compiled regex patterns for normalization
FEAT_PATTERN = re.compile(r"\(feat\..*?\)", re.IGNORECASE)
FT_PATTERN = re.compile(r"\(ft\..*?\)", re.IGNORECASE)
BRACKET_PATTERN = re.compile(r"\[.*?\]")
REMASTER_PATTERN = re.compile(r"\(.*?remaster.*?\)", re.IGNORECASE)
REMIX_PATTERN = re.compile(r"\(.*?remix.*?\)", re.IGNORECASE)
NON_ALNUM_PATTERN = re.compile(r"[^a-z0-9\s]")
MULTI_SPACE_PATTERN = re.compile(r"\s+")

EARLY_EXIT_THRESHOLD: float = 0.95
REJECT_SCORE: int = -1_000_000
ISRC_MATCH_BONUS: int = 1000


def normalize_string(text: str) -> str:
    """
    Normalizes a title or artist string by stripping clutter tags and special characters.
    Ported directly from Meld's SpotifyMapper.normalizeTitle().
    """
    if not text:
        return ""
    s = text.lower()
    s = FEAT_PATTERN.sub("", s)
    s = FT_PATTERN.sub("", s)
    s = BRACKET_PATTERN.sub("", s)
    s = REMASTER_PATTERN.sub("", s)
    s = REMIX_PATTERN.sub("", s)
    s = NON_ALNUM_PATTERN.sub("", s)
    s = MULTI_SPACE_PATTERN.sub(" ", s)
    return s.strip()


def get_bigrams(text: str) -> Set[str]:
    """Generates 2-character sliding window bigrams."""
    if len(text) < 2:
        return set()
    return {text[i : i + 2] for i in range(len(text) - 1)}


def bigram_similarity(
    a: str, bigrams_a: Set[str], b: str, bigrams_b: Set[str]
) -> float:
    """
    Calculates Dice coefficient between two strings: 2*|A ∩ B| / (|A| + |B|).
    Ported from Meld's SpotifyMapper.bigramSimilarity().
    """
    if a == b:
        return 1.0
    if not bigrams_a or not bigrams_b:
        return 0.0
    intersection = len(bigrams_a.intersection(bigrams_b))
    return (2.0 * intersection) / (len(bigrams_a) + len(bigrams_b))


def duration_score(source_duration_ms: int, candidate_duration_sec: Optional[int]) -> float:
    """
    Calculates duration score based on absolute second delta.
    Ported from Meld's SpotifyMapper.durationScore().
    """
    if candidate_duration_sec is None or source_duration_ms <= 0:
        return 0.5  # Neutral fallback for missing metadata
    diff = abs(source_duration_ms // 1000 - candidate_duration_sec)
    if diff <= 2:
        return 1.0
    elif diff <= 5:
        return 0.8
    elif diff <= 10:
        return 0.5
    elif diff <= 30:
        return 0.2
    else:
        return 0.0


@dataclass(frozen=True)
class PrecomputedTrack:
    """
    Precomputed normalized forms and bigram sets for fast candidate evaluation.
    Ported from Meld's SpotifyMapper.PrecomputedTrack.
    """
    normalized_title: str
    title_bigrams: Set[str]
    normalized_artist: str
    artist_bigrams: Set[str]
    duration_ms: int

    @classmethod
    def from_track(cls, title: str, artist: str, duration_ms: int) -> PrecomputedTrack:
        norm_title = normalize_string(title)
        norm_artist = normalize_string(artist)
        return cls(
            normalized_title=norm_title,
            title_bigrams=get_bigrams(norm_title),
            normalized_artist=norm_artist,
            artist_bigrams=get_bigrams(norm_artist),
            duration_ms=duration_ms,
        )


def match_score(
    spotify_title: str,
    spotify_artist: str,
    spotify_duration_ms: int,
    candidate_title: str,
    candidate_artist: str,
    candidate_duration_sec: Optional[int],
) -> float:
    """
    Calculates composite match confidence score (0.0 to 1.0).
    Formula: Title * 0.45 + Artist * 0.35 + Duration * 0.20.
    Ported from Meld's SpotifyMapper.matchScore().
    """
    norm_s_title = normalize_string(spotify_title)
    norm_c_title = normalize_string(candidate_title)
    norm_s_artist = normalize_string(spotify_artist)
    norm_c_artist = normalize_string(candidate_artist)

    title_sim = bigram_similarity(
        norm_s_title, get_bigrams(norm_s_title), norm_c_title, get_bigrams(norm_c_title)
    )
    artist_sim = bigram_similarity(
        norm_s_artist, get_bigrams(norm_s_artist), norm_c_artist, get_bigrams(norm_c_artist)
    )
    dur_sim = duration_score(spotify_duration_ms, candidate_duration_sec)

    return (title_sim * 0.45) + (artist_sim * 0.35) + (dur_sim * 0.20)


def match_score_precomputed(
    precomputed: PrecomputedTrack,
    candidate_title: str,
    candidate_artist: str,
    candidate_duration_sec: Optional[int],
) -> float:
    """
    Fast path: scores candidate against pre-computed source track.
    Ported from Meld's SpotifyMapper.matchScorePrecomputed().
    """
    norm_c_title = normalize_string(candidate_title)
    norm_c_artist = normalize_string(candidate_artist)

    title_sim = bigram_similarity(
        precomputed.normalized_title,
        precomputed.title_bigrams,
        norm_c_title,
        get_bigrams(norm_c_title),
    )
    artist_sim = bigram_similarity(
        precomputed.normalized_artist,
        precomputed.artist_bigrams,
        norm_c_artist,
        get_bigrams(norm_c_artist),
    )
    dur_sim = duration_score(precomputed.duration_ms, candidate_duration_sec)

    return (title_sim * 0.45) + (artist_sim * 0.35) + (dur_sim * 0.20)


@dataclass
class MatchOverride:
    """
    Manual match override representation.
    Ported from Meld's QobuzMatchOverride.kt.
    """
    qobuz_track_id: str
    label: str
    hires: bool = False
    bit_depth: Optional[int] = None
    sampling_rate_khz: Optional[float] = None

    def provider_media_id(self) -> str:
        return f"qobuz:track:{self.qobuz_track_id}"


def decode_overrides(raw_json: Optional[str]) -> Dict[str, MatchOverride]:
    """Decodes JSON map of match overrides."""
    if not raw_json or not raw_json.strip():
        return {}
    try:
        data = json.loads(raw_json)
        result: Dict[str, MatchOverride] = {}
        for media_id, entry in data.items():
            if not isinstance(entry, dict):
                continue
            track_id = entry.get("trackId")
            if not track_id:
                continue
            result[media_id] = MatchOverride(
                qobuz_track_id=str(track_id),
                label=entry.get("label", str(track_id)),
                hires=bool(entry.get("hires", False)),
                bit_depth=entry.get("bitDepth"),
                sampling_rate_khz=entry.get("samplingRateKhz"),
            )
        return result
    except Exception:
        return {}


def encode_overrides(overrides: Dict[str, MatchOverride]) -> str:
    """Encodes match overrides to JSON string."""
    data = {}
    for media_id, item in overrides.items():
        entry = {
            "trackId": item.qobuz_track_id,
            "label": item.label,
            "hires": item.hires,
        }
        if item.bit_depth is not None:
            entry["bitDepth"] = item.bit_depth
        if item.sampling_rate_khz is not None:
            entry["samplingRateKhz"] = item.sampling_rate_khz
        data[media_id] = entry
    return json.dumps(data)


# --- Qobuz Resolution & ISRC Match Scoring ---

@dataclass
class QobuzCandidate:
    track_id: str
    title: str
    version: Optional[str] = None
    artists: List[str] = field(default_factory=list)
    album_title: Optional[str] = None
    isrc: Optional[str] = None
    duration_sec: Optional[int] = None
    hires: bool = False
    bit_depth: Optional[int] = None
    sampling_rate_khz: Optional[float] = None
    downloadable: bool = True
    streamable: bool = True


@dataclass
class WantedTrackQuery:
    title: str
    artists: List[str]
    album: Optional[str] = None
    isrc: Optional[str] = None
    duration_ms: Optional[int] = None


def word_overlap(a: str, b: str) -> int:
    """Count of common words between two normalized strings."""
    words_a = set(a.split())
    words_b = set(b.split())
    return len(words_a.intersection(words_b))


def significant_tokens(text: str) -> List[str]:
    """Extracts non-trivial tokens for precision/recall evaluation."""
    stopwords = {"the", "a", "an", "and", "or", "in", "on", "of", "to", "for", "with", "feat", "ft"}
    return [w for w in text.split() if w not in stopwords and len(w) > 1]


def score_qobuz_candidate(
    wanted: WantedTrackQuery,
    candidate: QobuzCandidate,
    min_accept_score: int = 330,
) -> Tuple[int, bool]:
    """
    Evaluates a candidate from Qobuz using Meld's exact integer scoring logic.
    Ported from Meld's QobuzAudioProvider.selectBestTrack().
    Returns: (score, is_acceptable)
    """
    norm_w_title = normalize_string(wanted.title)
    norm_w_artists = [normalize_string(a) for a in wanted.artists if normalize_string(a)]
    norm_w_album = normalize_string(wanted.album or "")
    wanted_isrc = (wanted.isrc or "").strip().upper()
    wanted_dur_sec = (wanted.duration_ms // 1000) if wanted.duration_ms else None

    cand_title = normalize_string(candidate.title)
    cand_version = normalize_string(candidate.version or "")
    combined_cand_title = f"{cand_title} {cand_version}".strip()
    cand_album = normalize_string(candidate.album_title or "")
    cand_isrc = (candidate.isrc or "").strip().upper()
    cand_artists = [normalize_string(a) for a in candidate.artists if normalize_string(a)]

    # 1. Reject checks
    if wanted_dur_sec and candidate.duration_sec:
        if abs(wanted_dur_sec - candidate.duration_sec) > 25:
            return REJECT_SCORE, False

    exact_artist_matches = sum(1 for w in norm_w_artists if w in cand_artists)
    partial_artist_matches = sum(
        1 for w in norm_w_artists if any(w in c or c in w for c in cand_artists)
    )

    if norm_w_artists and exact_artist_matches == 0 and partial_artist_matches == 0:
        return REJECT_SCORE, False

    score = 0

    # 2. ISRC Match: massive +1000 bonus
    isrc_matched = bool(wanted_isrc and cand_isrc and wanted_isrc == cand_isrc)
    if isrc_matched:
        score += ISRC_MATCH_BONUS

    # 3. Title Matching
    if norm_w_title:
        if cand_title == norm_w_title:
            score += 360
        elif combined_cand_title == norm_w_title:
            score += 340
        elif norm_w_title in combined_cand_title or cand_title in norm_w_title:
            score += 180
        elif word_overlap(norm_w_title, combined_cand_title) >= 3:
            score += 110
        else:
            score -= 120

    # 4. Title Tokens Match
    wanted_tokens = significant_tokens(norm_w_title)
    cand_tokens = set(significant_tokens(combined_cand_title))
    matched_tokens = sum(1 for t in wanted_tokens if t in cand_tokens)
    if wanted_tokens:
        if matched_tokens == len(wanted_tokens):
            score += 180
        elif matched_tokens >= max(1, len(wanted_tokens) - 1):
            score += 70
        elif matched_tokens >= max(3, len(wanted_tokens) - 2):
            score -= 20
        else:
            score -= 180

    # 5. Album Matching
    if norm_w_album and cand_album:
        if cand_album == norm_w_album:
            score += 160
        elif norm_w_album in cand_album or cand_album in norm_w_album:
            score += 60
        elif word_overlap(norm_w_album, cand_album) >= 2:
            score += 35
        else:
            score -= 50

    # 6. Artist Matching
    if norm_w_artists:
        if exact_artist_matches > 0:
            score += 260 + ((exact_artist_matches - 1) * 55)
        elif partial_artist_matches > 0:
            score += 120 + ((partial_artist_matches - 1) * 40)
        else:
            return REJECT_SCORE, False

    # 7. Duration Matching
    if wanted_dur_sec and candidate.duration_sec:
        diff = abs(wanted_dur_sec - candidate.duration_sec)
        if diff <= 2:
            score += 180
        elif diff <= 5:
            score += 120
        elif diff <= 10:
            score += 50
        elif diff <= 15:
            score += 10
        else:
            score -= 90

    # 8. Hi-Res bonus & availability
    if candidate.hires:
        score += 15
    if not candidate.downloadable and not candidate.streamable:
        score -= 25

    is_acceptable = (score >= min_accept_score) or isrc_matched
    return score, is_acceptable
