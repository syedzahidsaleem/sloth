"""
api.py — Sloth AI Recommender Engine FastAPI Router

Exposes high-performance async endpoints:
- GET  /recommend         -> Gated 6-layer candidate scoring + IPS + MMR + Diffusion
- POST /feedback          -> Sub-20ms feedback processing & async SQLite persistence
- POST /playlist/generate -> Mood arc planning + 20-track L-DiffRec latent diffusion
- GET  /status            -> Diagnostics, indexed track count, model versions, uptime
- GET  /reindex           -> Trigger catalog re-indexing
- POST /reindex           -> Trigger catalog re-indexing
"""

from __future__ import annotations

import logging
import time
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, status
from pydantic import BaseModel, Field

from .feedback import FeedbackEvent, FeedbackEventType
from .recommender import SLOTHRecommender

logger = logging.getLogger("sloth-engine-api")

router = APIRouter()

# Global singleton recommender instance
_recommender: Optional[SLOTHRecommender] = None


def get_recommender() -> SLOTHRecommender:
    global _recommender
    if _recommender is None:
        _recommender = SLOTHRecommender()
    return _recommender


def set_recommender(rec: SLOTHRecommender) -> None:
    global _recommender
    _recommender = rec


# --- Pydantic V2 Request & Response Schemas ---

class FeedbackRequest(BaseModel):
    user_id: str = Field(default="user_primary", description="Active user ID")
    track_id: str = Field(..., description="Consumed track ID")
    event_type: str = Field(
        ...,
        description="Event type: 'listen_through', 'early_skip', 'save', 'favorite', 'dislike'",
    )
    duration_ms: Optional[int] = Field(default=None, ge=0, description="Total duration of track in ms")
    position_ms: Optional[int] = Field(default=None, ge=0, description="Playback position in ms at time of event")
    genre: Optional[str] = Field(default=None, description="Primary musical genre")
    valence: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Acoustic valence coordinate")
    arousal: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Acoustic arousal coordinate")


class GeneratePlaylistRequest(BaseModel):
    preset: Optional[str] = Field(default=None, description="Preset name: 'Focus', 'Wind Down', 'Hype Up', 'Chill'")
    start_mood: Optional[Dict[str, float]] = Field(
        default=None,
        description="Starting mood coordinates {'valence': float, 'arousal': float}",
    )
    target_mood: Optional[Dict[str, float]] = Field(
        default=None,
        description="Target mood coordinates {'valence': float, 'arousal': float}",
    )
    track_count: int = Field(default=20, ge=5, le=50, description="Number of tracks to diffuse")
    user_id: str = Field(default="user_primary", description="User ID for preference conditioning")


# --- Endpoint Implementations ---

@router.get("/status")
def get_engine_status():
    """
    Returns diagnostic status, uptime, index count, and version of Sloth Recommender Engine.
    """
    rec = get_recommender()
    return rec.get_status()


@router.get("/recommend")
def recommend_tracks(
    user_id: str = Query(default="user_primary"),
    count: int = Query(default=20, ge=1, le=100),
    mode: Optional[str] = Query(default=None, description="Active listening mode ('focus', 'workout', 'chill', 'party')"),
    context_type: Optional[str] = Query(default=None, description="Temporal context ('morning', 'evening', 'transit')"),
    alpha: Optional[float] = Query(default=None, ge=0.0, le=1.0, description="IPS discovery exponent"),
):
    """
    Executes full 6-stage recommendation pipeline:
    FAISS 500 candidate recall -> 6-layer scoring -> Gated Fusion -> IPS debiasing -> MMR -> Diffusion
    SLA: < 200ms p95
    """
    rec = get_recommender()
    result = rec.recommend(
        user_id=user_id,
        count=count,
        mode=mode,
        context_type=context_type,
        alpha=alpha,
    )
    return result


@router.post("/feedback")
def submit_feedback(
    req: FeedbackRequest,
    background_tasks: BackgroundTasks,
):
    """
    Ingests user listening feedback and updates reinforcement models in real-time.
    Synchronous bandit and mood memory update: < 20ms
    SQLite write is scheduled via BackgroundTasks off the hot path.
    """
    rec = get_recommender()
    event = FeedbackEvent(
        user_id=req.user_id,
        track_id=req.track_id,
        event_type=req.event_type,
        duration_ms=req.duration_ms,
        position_ms=req.position_ms,
        genre=req.genre,
        valence=req.valence,
        arousal=req.arousal,
        timestamp=time.time(),
    )

    # 1. Fast in-memory synchronous update
    res = rec.record_feedback(event)

    # 2. Asynchronous SQLite write
    reward = res.get("reward", 0.0)
    background_tasks.add_task(rec.feedback.persist_feedback_background, event, reward)

    return res


@router.post("/playlist/generate")
def generate_playlist(req: GeneratePlaylistRequest):
    """
    Synthesizes a cohesive 20-track playlist via Mood Arc Planning + L-DiffRec Latent Diffusion.
    SLA: < 2000ms p95
    """
    rec = get_recommender()
    result = rec.generate_playlist(
        preset=req.preset,
        start_mood=req.start_mood,
        target_mood=req.target_mood,
        track_count=req.track_count,
        user_id=req.user_id,
    )
    return result


@router.get("/reindex")
def trigger_reindex_get():
    """
    Rebuilds the FAISS acoustic vector index from SQLite catalogue.
    """
    rec = get_recommender()
    return rec.reindex(force=True)


@router.post("/reindex")
def trigger_reindex_post():
    """
    Rebuilds the FAISS acoustic vector index from SQLite catalogue.
    """
    rec = get_recommender()
    return rec.reindex(force=True)
