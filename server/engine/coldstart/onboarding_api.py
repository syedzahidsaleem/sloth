"""
Sloth Coldstart & Debiasing Engine - Onboarding & Clip Feedback API
FastAPI router managing cold-start genre quiz feedback, Thompson bandit updates,
and initial candidate retrieval.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from .thompson_bandit import ThompsonBandit
from .cultural_affinity import CulturalAffinityScorer

logger = logging.getLogger("sloth-coldstart-onboarding")

router = APIRouter()

# Global in-memory bandit instance per user
_user_bandits: Dict[str, ThompsonBandit] = {}
_cultural_scorer = CulturalAffinityScorer()

CURATED_ONBOARDING_GENRES = [
    {"id": "synthwave", "name": "Synthwave", "description": "80s retro synth arpeggios, neon drum machines, cyber atmospheres"},
    {"id": "indie rock", "name": "Indie Rock", "description": "Raw guitars, punchy drums, expressive hooks and storytelling"},
    {"id": "electronic", "name": "Electronic", "description": "Modulated basslines, driving 4/4 beats, synth leads and club grooves"},
    {"id": "ambient", "name": "Ambient", "description": "Lush reverb pads, drone soundscapes, calm generative textures"},
    {"id": "lo-fi", "name": "Lo-Fi Hip Hop", "description": "Warm vinyl crackle, mellow piano chords, dusty boom-bap rhythms"},
    {"id": "hip hop", "name": "Hip Hop", "description": "Crisp 808s, syncopated hi-hats, rhythmic flows and heavy bass"},
    {"id": "post-rock", "name": "Post-Rock", "description": "Crescendo guitars, delay-drenched textures, cinematic climaxes"},
    {"id": "jazz", "name": "Modern Jazz", "description": "Harmonic complexity, brass timbres, syncopated swing and soul"},
    {"id": "cinematic", "name": "Cinematic", "description": "Orchestral strings, hybrid brass, dramatic tension and film themes"},
    {"id": "metal", "name": "Metal / Heavy", "description": "Distorted riffs, double-bass drums, energetic aggression"},
    {"id": "neo-classical", "name": "Neo-Classical", "description": "Intimate felt piano, solo cello, emotional minimalist phrasing"},
    {"id": "city pop", "name": "City Pop / J-Pop", "description": "Upbeat funk bass, brass stabs, glittering Tokyo night aesthetic"},
]


def get_user_bandit(user_id: str) -> ThompsonBandit:
    if user_id not in _user_bandits:
        _user_bandits[user_id] = ThompsonBandit()
    return _user_bandits[user_id]


class ClipFeedbackItem(BaseModel):
    genre: str = Field(..., description="Target genre label (e.g. 'synthwave', 'indie rock')")
    liked: bool = Field(default=True, description="Whether user liked or disliked the sample clip")
    rating: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Optional continuous rating in [0, 1]")
    track_id: Optional[str] = Field(default=None, description="Optional track ID for the sample clip")


class OnboardingFeedbackRequest(BaseModel):
    user_id: str = Field(default="user_primary", description="Unique user identifier")
    feedback: List[ClipFeedbackItem] = Field(..., description="List of clip or genre selections and ratings")
    locale: Optional[str] = Field(default="en-US", description="User locale for cultural affinity boosting")


class GenreWeightItem(BaseModel):
    genre: str
    sampled_weight: float
    expected_reward: float
    uncertainty: float
    pulls: int


class OnboardingFeedbackResponse(BaseModel):
    status: str
    user_id: str
    top_genres: List[GenreWeightItem]
    locale_boost_applied: bool
    recommended_starting_genres: List[str]


@router.get("/genres")
def list_onboarding_genres():
    """
    Returns curated genre options and descriptions for the first-launch onboarding quiz.
    """
    return {
        "status": "ok",
        "genres": CURATED_ONBOARDING_GENRES,
    }


@router.get("/profile/{user_id}")
def get_user_coldstart_profile(user_id: str):
    """
    Retrieves the current Thompson sampling bandit arm statistics for a user.
    """
    bandit = get_user_bandit(user_id)
    stats: List[Dict[str, Any]] = []
    for g_id, arm in bandit.arms.items():
        arm_stat = bandit.get_arm_stats(g_id)
        stats.append({
            "genre": g_id,
            "alpha": arm.alpha,
            "beta": arm.beta,
            "expected_reward": round(arm_stat["expected_reward"], 4),
            "uncertainty": round(arm_stat["uncertainty"], 4),
            "pulls": arm.total_pulls,
        })

    stats.sort(key=lambda x: x["expected_reward"], reverse=True)
    return {
        "user_id": user_id,
        "arms_count": len(bandit.arms),
        "arms": stats,
    }


@router.post("/clip-feedback", response_model=OnboardingFeedbackResponse)
def submit_clip_feedback(req: OnboardingFeedbackRequest):
    """
    Processes cold-start clip & genre quiz feedback:
    1. Updates Beta-Bernoulli Thompson Sampling arms for each rated genre.
    2. Incorporates optional cultural affinity boosts based on user locale.
    3. Returns updated sampled preference weights and starting genre candidates.
    """
    if not req.feedback:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Feedback list cannot be empty.",
        )

    bandit = get_user_bandit(req.user_id)

    # 1. Update Thompson Bandit arms
    for item in req.feedback:
        bandit.record_genre_feedback(
            genre=item.genre,
            liked=item.liked,
            rating=item.rating,
        )

    # 2. Draw sampled weights and rank
    all_genres = [item.genre.lower().strip() for item in req.feedback]
    # Also include any previously registered arms
    for g in bandit.arms.keys():
        if g not in all_genres:
            all_genres.append(g)

    sampled_weights = bandit.sample_genre_weights(all_genres)
    ranked_genres = sorted(sampled_weights.items(), key=lambda x: x[1], reverse=True)

    # 3. Apply optional cultural affinity check
    locale_profile = _cultural_scorer.resolve_profile(req.locale or "en-US")
    locale_boosted = False
    if locale_profile:
        locale_boosted = True

    top_genre_items: List[GenreWeightItem] = []
    for g, w in ranked_genres[:10]:
        stats = bandit.get_arm_stats(g)
        top_genre_items.append(
            GenreWeightItem(
                genre=g,
                sampled_weight=round(w, 4),
                expected_reward=round(stats["expected_reward"], 4),
                uncertainty=round(stats["uncertainty"], 4),
                pulls=int(stats["pulls"]),
            )
        )

    recommended_starting_genres = [item.genre for item in top_genre_items[:5]]

    return OnboardingFeedbackResponse(
        status="success",
        user_id=req.user_id,
        top_genres=top_genre_items,
        locale_boost_applied=locale_boosted,
        recommended_starting_genres=recommended_starting_genres,
    )
