"""
Sloth Coldstart & Debiasing Engine - Cultural Affinity Scorer
Applies locale-aware cultural and regional affinity weighting:
  - Primary language match: +0.10 score boost
  - Regional genre match: +0.05 score boost
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set, Tuple


@dataclass
class LocaleProfile:
    primary_languages: Set[str]
    regional_genres: Set[str]


# Curated locale cultural profiles
LOCALE_PROFILES: Dict[str, LocaleProfile] = {
    "hi-in": LocaleProfile(
        primary_languages={"hi", "hin", "hindi", "en", "ta", "te", "pa", "ur"},
        regional_genres={"bollywood", "desi", "indian indie", "punjabi", "filmi", "carnatic", "hindustani", "bhangra"},
    ),
    "en-in": LocaleProfile(
        primary_languages={"en", "hi", "hin", "ta", "te", "pa"},
        regional_genres={"bollywood", "desi", "indian indie", "punjabi", "filmi"},
    ),
    "ja-jp": LocaleProfile(
        primary_languages={"ja", "jpn", "japanese"},
        regional_genres={"j-pop", "j-rock", "anime", "city pop", "vocaloid", "enka"},
    ),
    "ko-kr": LocaleProfile(
        primary_languages={"ko", "kor", "korean"},
        regional_genres={"k-pop", "k-indie", "k-r&b", "trot", "k-hip hop"},
    ),
    "es-es": LocaleProfile(
        primary_languages={"es", "spa", "spanish"},
        regional_genres={"flamenco", "latin", "reggaeton", "pop espanol", "rumba"},
    ),
    "es-mx": LocaleProfile(
        primary_languages={"es", "spa", "spanish"},
        regional_genres={"reggaeton", "latin", "mariachi", "cumbia", "norteno", "ranchera", "corridos"},
    ),
    "fr-fr": LocaleProfile(
        primary_languages={"fr", "fra", "french"},
        regional_genres={"chanson", "french rap", "variete francaise", "french touch", "afro trap"},
    ),
    "de-de": LocaleProfile(
        primary_languages={"de", "deu", "german"},
        regional_genres={"deutschrap", "schlager", "krautrock", "neue deutsche welle"},
    ),
    "pt-br": LocaleProfile(
        primary_languages={"pt", "por", "portuguese"},
        regional_genres={"bossa nova", "mpb", "samba", "funk carioca", "sertanejo", "forro", "pagode"},
    ),
    "en-us": LocaleProfile(
        primary_languages={"en", "eng", "english"},
        regional_genres={"hip hop", "r&b", "country", "rock", "indie rock", "pop"},
    ),
    "en-gb": LocaleProfile(
        primary_languages={"en", "eng", "english"},
        regional_genres={"grime", "uk drill", "britpop", "uk garage", "drum and bass"},
    ),
}


class CulturalAffinityScorer:
    """
    Applies locale cultural affinity boosts (+0.10 language, +0.05 regional genres).
    """

    def __init__(
        self,
        language_boost: float = 0.10,
        genre_boost: float = 0.05,
    ):
        self.language_boost = language_boost
        self.genre_boost = genre_boost

    def resolve_profile(self, locale: str) -> Optional[LocaleProfile]:
        """
        Resolves locale string (e.g., 'en-US', 'hi_IN', 'ja') to a LocaleProfile.
        """
        clean = locale.lower().replace("_", "-").strip()
        if clean in LOCALE_PROFILES:
            return LOCALE_PROFILES[clean]

        # Match by language prefix (e.g. 'hi' -> 'hi-in', 'es' -> 'es-es')
        prefix = clean.split("-")[0]
        for key, prof in LOCALE_PROFILES.items():
            if key.startswith(prefix):
                return prof

        return None

    def compute_affinity_boost(
        self,
        locale: str,
        track_language: Optional[str] = None,
        track_genres: Optional[List[str]] = None,
    ) -> float:
        """
        Calculates additive cultural affinity boost:
          +0.10 if track language matches user primary language
          +0.05 if track genre overlaps regional genres
        """
        profile = self.resolve_profile(locale)
        if not profile:
            return 0.0

        boost = 0.0

        # 1. Primary language boost (+0.10)
        if track_language:
            t_lang = track_language.lower().strip()
            if t_lang in profile.primary_languages:
                boost += self.language_boost

        # 2. Regional genre boost (+0.05)
        if track_genres:
            for g in track_genres:
                clean_g = g.lower().strip()
                if any(reg in clean_g for reg in profile.regional_genres):
                    boost += self.genre_boost
                    break  # Apply once per track

        return float(boost)

    def boost_candidate_scores(
        self,
        locale: str,
        scores: Dict[str, float],
        track_metadata: Dict[str, Dict[str, Any]],
    ) -> Dict[str, float]:
        """
        Applies cultural affinity boosts across a dictionary of track candidate scores.
        """
        boosted = {}
        for tid, raw_score in scores.items():
            meta = track_metadata.get(tid, {})
            lang = meta.get("language")
            genres = meta.get("genre_tags") or meta.get("genres") or []
            boost = self.compute_affinity_boost(locale, track_language=lang, track_genres=genres)
            boosted[tid] = float(round(raw_score + boost, 4))

        return boosted
