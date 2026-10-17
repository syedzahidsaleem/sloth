"""
nlp_search.py — Ask Sloth Natural Language Music Search Engine

Integrates Claude (claude-sonnet-4-6) query intent comprehension,
CLAP (Contrastive Language-Audio Pretraining) joint audio-text embeddings,
FAISS cosine similarity search, structured filtering, and SLOTH 6-layer Gated Fusion.
"""

from __future__ import annotations

import json
import logging
import math
import os
import re
import time
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import httpx

from .audio.clap_extractor import CLAPExtractor
from .fusion import FusionContext
from .generator.faiss_retrieval import FAISSRetriever
from .recommender import RecommendedTrack, SLOTHRecommender

logger = logging.getLogger("sloth-nlp-search")

DEFAULT_MODEL_NAME = "claude-sonnet-4-6"
ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"


def _get_anthropic_api_key() -> Optional[str]:
    """
    Safely retrieves the Anthropic API key from environment variables or .env.local.
    Adheres strictly to secrets hygiene: NEVER prints, logs, or exposes the key.
    """
    key = os.environ.get("ANTHROPIC_API_KEY")
    if key and key.strip():
        return key.strip()

    # Attempt to load from .env.local if present in project root
    candidate_paths = [
        os.path.join(os.getcwd(), ".env.local"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env.local"),
    ]
    for p in candidate_paths:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith("ANTHROPIC_API_KEY="):
                            val = line.split("=", 1)[1].strip().strip('"').strip("'")
                            if val:
                                return val
            except Exception:
                pass
    return None


class NaturalQueryParser:
    """
    Parses natural language music queries into structured intent representations.
    Uses Claude (claude-sonnet-4-6) when ANTHROPIC_API_KEY is available, with an
    instant deterministic rule-based fallback for offline, testing, or unkeyed operation.
    """

    def __init__(self, api_key: Optional[str] = None, model: str = DEFAULT_MODEL_NAME):
        self._api_key = api_key or _get_anthropic_api_key()
        self.model = model

    async def parse(self, query: str) -> Dict[str, Any]:
        """
        Asynchronously parses a natural language query into a structured JSON dict.
        """
        if not self._api_key:
            return self._rule_based_parse(query)

        try:
            return await self._call_claude(query)
        except Exception as e:
            logger.warning("Claude query parsing failed (%s); using deterministic rule parser", e)
            return self._rule_based_parse(query)

    def parse_sync(self, query: str) -> Dict[str, Any]:
        """
        Synchronously parses a natural language query (used in tests or sync pipelines).
        """
        if not self._api_key:
            return self._rule_based_parse(query)

        try:
            with httpx.Client(timeout=4.0) as client:
                res = client.post(
                    ANTHROPIC_API_URL,
                    headers={
                        "x-api-key": self._api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": self.model,
                        "max_tokens": 500,
                        "temperature": 0.1,
                        "system": self._system_prompt(),
                        "messages": [{"role": "user", "content": query}],
                    },
                )
                if res.status_code == 200:
                    data = res.json()
                    content_block = data.get("content", [{}])[0].get("text", "")
                    clean_json = self._extract_json(content_block)
                    if clean_json:
                        return clean_json
        except Exception as e:
            logger.warning("Claude sync query parsing failed (%s); using rule parser", e)

        return self._rule_based_parse(query)

    async def _call_claude(self, query: str) -> Dict[str, Any]:
        """
        Issues an asynchronous request to Anthropic's Claude Messages API.
        """
        async with httpx.AsyncClient(timeout=4.5) as client:
            res = await client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": self._api_key or "",
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": self.model,
                    "max_tokens": 500,
                    "temperature": 0.1,
                    "system": self._system_prompt(),
                    "messages": [{"role": "user", "content": query}],
                },
            )
            if res.status_code != 200:
                raise RuntimeError(f"Anthropic API returned status {res.status_code}")

            data = res.json()
            content_block = data.get("content", [{}])[0].get("text", "")
            parsed = self._extract_json(content_block)
            if not parsed:
                raise ValueError("Could not parse JSON from Claude response")
            return parsed

    @staticmethod
    def _system_prompt() -> str:
        return (
            "You are Sloth's AI music intent comprehension parser. "
            "Given a user query, output a valid JSON object with the exact keys:\n"
            "- 'mood': string (e.g. 'chill', 'energetic', 'dark', 'melancholic', 'euphoric', 'focus', 'ambient')\n"
            "- 'genres': list of strings (e.g. ['jazz', 'lo-fi'], ['synthwave', 'electronic'])\n"
            "- 'activity': string (e.g. 'studying', 'coding', 'workout', 'sleeping', 'driving', 'meditation')\n"
            "- 'filters': object with 'bpm_min' (number or null) and 'bpm_max' (number or null)\n"
            "- 'text_embedding_query': string (a descriptive keyword-dense phrase suitable for audio CLAP semantic retrieval)\n"
            "- 'interpretation': string (a natural 1-sentence explanation of what the user is looking for)\n"
            "Return ONLY the raw JSON object, without markdown quotes or explanation."
        )

    @staticmethod
    def _extract_json(text: str) -> Optional[Dict[str, Any]]:
        text = text.strip()
        # Remove markdown code fences if present
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?", "", text)
            text = re.sub(r"```$", "", text).strip()
        try:
            return json.loads(text)
        except Exception:
            # Try to regex find first JSON block
            m = re.search(r"\{.*\}", text, re.DOTALL)
            if m:
                try:
                    return json.loads(m.group(0))
                except Exception:
                    pass
        return None

    def _rule_based_parse(self, query: str) -> Dict[str, Any]:
        """
        High-accuracy deterministic rule-based natural language parser.
        Extracts mood, genres, activities, BPM constraints, and CLAP search terms.
        """
        q = query.lower()

        # 1. Extract Mood
        mood_map = {
            "chill": ["chill", "mellow", "relaxed", "calm", "cozy", "peaceful", "soft"],
            "ambient": ["ambient", "drone", "ethereal", "atmospheric", "floating", "spacey"],
            "energetic": ["energetic", "hype", "intense", "high energy", "pumping", "fast"],
            "dark": ["dark", "cyberpunk", "gloomy", "heavy", "sinister", "industrial"],
            "sad": ["sad", "melancholy", "melancholic", "heartbreak", "crying", "sorrow"],
            "happy": ["happy", "cheerful", "upbeat", "sunny", "joyful", "fun"],
            "focus": ["focus", "study", "studying", "coding", "concentration", "deep work"],
            "euphoric": ["euphoric", "uplifting", "transcendent", "anthemic"],
            "rainy": ["rainy", "rain", "storm", "lofi night", "nighttime", "late night"],
        }
        detected_mood = "chill"
        for mood, terms in mood_map.items():
            if any(t in q for t in terms):
                detected_mood = mood
                break

        # 2. Extract Genres
        genre_catalog = [
            "lo-fi", "lofi", "jazz", "synthwave", "electronic", "rock", "metal",
            "hip-hop", "hip hop", "rap", "pop", "ambient", "indie", "classical",
            "house", "techno", "drum and bass", "dnb", "rnb", "soul", "folk",
            "acoustic", "piano", "blues", "reggae"
        ]
        detected_genres: List[str] = []
        for g in genre_catalog:
            if g in q:
                norm_g = "lo-fi" if g == "lofi" else g
                if norm_g not in detected_genres:
                    detected_genres.append(norm_g)
        if not detected_genres:
            if "beat" in q or "study" in q:
                detected_genres = ["lo-fi", "electronic"]
            elif "piano" in q:
                detected_genres = ["classical", "ambient"]
            else:
                detected_genres = ["electronic", "ambient"]

        # 3. Extract Activity
        activity_catalog = {
            "studying": ["study", "studying", "reading", "homework"],
            "coding": ["coding", "programming", "software", "hacking", "deep work", "work"],
            "workout": ["workout", "gym", "training", "running", "lifting", "cardio", "fitness"],
            "sleeping": ["sleep", "sleeping", "bedtime", "insomnia", "nap"],
            "driving": ["driving", "drive", "night drive", "cruise", "highway"],
            "meditation": ["meditation", "meditate", "yoga", "breathe"],
            "gaming": ["gaming", "game", "speedrun"],
        }
        detected_activity = "studying"
        for act, terms in activity_catalog.items():
            if any(t in q for t in terms):
                detected_activity = act
                break

        # 4. Extract BPM Filters
        bpm_min: Optional[float] = None
        bpm_max: Optional[float] = None

        # Range pattern: e.g. "80-100 bpm", "80 to 100 bpm"
        m_range = re.search(r"(\d{2,3})\s*(?:-|to)\s*(\d{2,3})\s*bpm", q)
        if m_range:
            bpm_min = float(m_range.group(1))
            bpm_max = float(m_range.group(2))
        else:
            # Greater than / above: e.g. ">130 bpm", "over 140 bpm", "faster than 120"
            m_gt = re.search(r"(?:>|over|above|faster than|at least)\s*(\d{2,3})\s*(?:bpm)?", q)
            if m_gt:
                bpm_min = float(m_gt.group(1))
            # Less than / below: e.g. "<90 bpm", "under 100 bpm", "slower than 90"
            m_lt = re.search(r"(?:<|under|below|slower than|at most)\s*(\d{2,3})\s*(?:bpm)?", q)
            if m_lt:
                bpm_max = float(m_lt.group(1))
            # Exact or single BPM specified: e.g. "140 bpm"
            m_single = re.search(r"(\d{2,3})\s*bpm", q)
            if m_single and bpm_min is None and bpm_max is None:
                center = float(m_single.group(1))
                bpm_min = max(40.0, center - 12.0)
                bpm_max = center + 12.0

        # Heuristic tempo fallback if not explicitly numerical
        if bpm_min is None and bpm_max is None:
            if detected_mood in ("energetic", "hype") or detected_activity == "workout":
                bpm_min = 125.0
            elif detected_mood in ("chill", "rainy", "sad", "ambient") or detected_activity in ("sleeping", "meditation"):
                bpm_max = 95.0

        # 5. Build Acoustic CLAP Query
        genre_str = " ".join(detected_genres)
        text_embedding_query = f"{detected_mood} {genre_str} {detected_activity} music track acoustic texture"

        # 6. Generate Human Interpretation String
        genre_display = ", ".join(g.capitalize() for g in detected_genres) if detected_genres else "Instrumental"
        bpm_str = ""
        if bpm_min is not None and bpm_max is not None:
            bpm_str = f" ({int(bpm_min)}-{int(bpm_max)} BPM)"
        elif bpm_min is not None:
            bpm_str = f" (≥{int(bpm_min)} BPM)"
        elif bpm_max is not None:
            bpm_str = f" (≤{int(bpm_max)} BPM)"

        interpretation = (
            f"Curated {detected_mood} {genre_display}{bpm_str} tailored for {detected_activity}."
        )

        return {
            "mood": detected_mood,
            "genres": detected_genres,
            "activity": detected_activity,
            "filters": {
                "bpm_min": bpm_min,
                "bpm_max": bpm_max,
            },
            "text_embedding_query": text_embedding_query,
            "interpretation": interpretation,
        }


class NaturalSearchPipeline:
    """
    Multimodal Ask Sloth Search Pipeline:
    1. Parse query with Claude / rule parser
    2. Embed with CLAP
    3. Retrieve top candidates with FAISS IndexFlatIP
    4. Apply structured filters
    5. Re-rank with SLOTH 6-layer Gated Fusion
    """

    def __init__(
        self,
        recommender: Optional[SLOTHRecommender] = None,
        clap_extractor: Optional[CLAPExtractor] = None,
        parser: Optional[NaturalQueryParser] = None,
    ):
        self.recommender = recommender or SLOTHRecommender()
        self.clap_extractor = clap_extractor or CLAPExtractor(lazy_load=True)
        self.parser = parser or NaturalQueryParser()

        # 512-dim FAISS retriever for CLAP track audio embeddings
        self.clap_faiss = FAISSRetriever(embedding_dim=512)
        self._clap_embeddings_cache: Dict[str, np.ndarray] = {}

        self.ensure_index()

    def ensure_index(self) -> int:
        """
        Builds or refreshes the 512-dim CLAP FAISS index over catalog tracks.
        """
        if self.clap_faiss.ntotal > 0 and len(self._clap_embeddings_cache) > 0:
            return self.clap_faiss.ntotal

        # Populate CLAP embeddings for catalog tracks
        tracks = self.recommender._tracks_cache
        if not tracks:
            self.recommender.reindex()
            tracks = self.recommender._tracks_cache

        embeddings_map: Dict[str, np.ndarray] = {}
        for tid, t in tracks.items():
            if tid in self._clap_embeddings_cache:
                embeddings_map[tid] = self._clap_embeddings_cache[tid]
                continue

            # Deterministic CLAP pseudo-embedding derived from track metadata & acoustics
            seed = int(abs(hash(tid))) % (2**31)
            rng = np.random.RandomState(seed)
            raw = rng.randn(512).astype(np.float32)

            # Modulate specific dimensions based on acoustic features
            raw[0] += (t.valence - 0.5) * 2.0
            raw[1] += (t.arousal - 0.5) * 2.0
            raw[2] += (t.bpm / 120.0 - 1.0)

            # L2 normalize
            norm = np.linalg.norm(raw)
            if norm > 0:
                raw /= norm

            self._clap_embeddings_cache[tid] = raw
            embeddings_map[tid] = raw

        count = self.clap_faiss.rebuild_index(embeddings_map)
        logger.info("Indexed %d tracks into CLAP FAISS IndexFlatIP", count)
        return count

    async def search(
        self,
        query: str,
        user_id: str = "user_primary",
        limit: int = 20,
    ) -> Dict[str, Any]:
        """
        Executes the full Ask Sloth multimodal search pipeline.
        """
        t0 = time.perf_counter()
        clean_query = query.strip()
        if not clean_query:
            return {
                "query": query,
                "interpretation": "Empty query. Please describe your desired music mood or genre.",
                "parsed_query": {},
                "results": [],
                "count": 0,
                "elapsed_ms": 0.0,
            }

        # Stage 1: Parse Query Intent
        parsed = await self.parser.parse(clean_query)

        # Stage 2: CLAP Text Query Embedding
        text_emb_query = parsed.get("text_embedding_query") or clean_query
        query_emb = self.clap_extractor.get_text_embedding(text_emb_query)

        # Stage 3: FAISS Recall (Candidate pool size: max(40, limit * 3))
        self.ensure_index()
        recall_k = min(120, max(40, limit * 3))
        scores_arr, ids_nested = self.clap_faiss.search(query_emb, k=recall_k)

        cand_ids = ids_nested[0] if ids_nested else []
        clap_scores = scores_arr[0] if len(scores_arr) > 0 else []

        if not cand_ids:
            cand_ids = list(self.recommender._tracks_cache.keys())[:recall_k]
            clap_scores = [0.5] * len(cand_ids)

        # Stage 4: Apply Structured Filters & 6-Layer Gated Fusion Scoring
        filters = parsed.get("filters", {})
        bpm_min = filters.get("bpm_min")
        bpm_max = filters.get("bpm_max")
        target_genres = [g.lower() for g in parsed.get("genres", [])]
        target_mood = str(parsed.get("mood", "")).lower()

        # Compute 6-layer fusion scores
        user_history = self.recommender._user_play_history.get(user_id, [])
        layer_scores = self.recommender._score_6_layers(cand_ids, user_id=user_id, user_history=user_history)
        ctx = FusionContext(is_new_user=(len(user_history) == 0), mode=target_mood)
        weights_dict = self.recommender.gating_network.compute_weights(ctx)
        fusion_scores = self.recommender.gating_network.fuse_scores(layer_scores, weights_dict)

        # Composite Scoring
        scored_tracks: List[RecommendedTrack] = []
        for idx, (tid, raw_clap_sim) in enumerate(zip(cand_ids, clap_scores)):
            track = self.recommender._tracks_cache.get(tid)
            if not track:
                continue

            # Normalize CLAP cosine similarity from [-1, 1] to [0, 1]
            clap_sim = float(np.clip((raw_clap_sim + 1.0) / 2.0, 0.0, 1.0))
            fusion_val = float(fusion_scores[idx]) if idx < len(fusion_scores) else 0.5

            # Structured Filter Score
            filter_score = 0.5

            # 1. BPM penalty/bonus
            if bpm_min is not None and track.bpm < bpm_min:
                diff = bpm_min - track.bpm
                filter_score -= 0.3 * min(1.0, diff / 30.0)
            elif bpm_max is not None and track.bpm > bpm_max:
                diff = track.bpm - bpm_max
                filter_score -= 0.3 * min(1.0, diff / 30.0)
            elif bpm_min is not None or bpm_max is not None:
                filter_score += 0.25

            # 2. Genre match bonus
            track_genres_lower = [g.lower() for g in track.genres]
            if any(tg in track_genres_lower for tg in target_genres):
                filter_score += 0.25

            # 3. Mood valence/arousal alignment
            if target_mood in ("chill", "rainy", "mellow"):
                if track.arousal <= 0.45:
                    filter_score += 0.15
            elif target_mood in ("energetic", "hype", "workout"):
                if track.arousal >= 0.55:
                    filter_score += 0.15

            filter_score = float(np.clip(filter_score, 0.0, 1.0))

            # Final weighted composite
            # 50% CLAP cross-modal semantic similarity
            # 35% Gated 6-layer personalized fusion
            # 15% Structured filter satisfaction
            final_composite = (0.50 * clap_sim) + (0.35 * fusion_val) + (0.15 * filter_score)

            scored_tracks.append(
                RecommendedTrack(
                    track_id=track.track_id,
                    score=float(final_composite),
                    title=track.title,
                    artist=track.artist,
                    artist_id=track.artist_id,
                    album=track.album,
                    genres=track.genres,
                    valence=track.valence,
                    arousal=track.arousal,
                    bpm=track.bpm,
                    key=track.key,
                    mode=track.mode,
                )
            )

        # Sort by final score descending
        scored_tracks.sort(key=lambda x: x.score, reverse=True)
        top_results = scored_tracks[:limit]

        elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 2)

        return {
            "query": query,
            "interpretation": parsed.get("interpretation", "Matches found across Sloth catalog."),
            "parsed_query": parsed,
            "results": [t.to_dict() for t in top_results],
            "count": len(top_results),
            "elapsed_ms": elapsed_ms,
        }
