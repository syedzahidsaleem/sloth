"""
Sloth Diffusion Generator - FastAPI Service Router
Exposes endpoints for mood arc generation, preset retrieval, and playlist diffusion.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from .playlist_diffusion import (
    DiffusionConfig,
    PlaylistDiffusionGenerator,
)
from .mood_arc_planner import MoodArcPlanner, MOOD_PRESETS
from .coherence import TrackAcousticMetadata

logger = logging.getLogger("sloth-generator-api")

router = APIRouter()

# Global in-memory generator instance
_generator = PlaylistDiffusionGenerator()
_planner = MoodArcPlanner()


class MoodArcRequest(BaseModel):
    start_valence: float = Field(default=0.5, ge=0.0, le=1.0)
    start_arousal: float = Field(default=0.4, ge=0.0, le=1.0)
    target_valence: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    target_arousal: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    preset_name: Optional[str] = Field(default=None, description="'focus', 'wind_down', 'hype_up', 'chill'")
    num_tracks: int = Field(default=20, ge=5, le=50)


class WaypointResponse(BaseModel):
    step: int
    progress: float
    valence: float
    arousal: float


class MoodArcResponse(BaseModel):
    status: str
    num_tracks: int
    waypoints: List[WaypointResponse]
    preset: Optional[str] = None


@router.get("/presets")
def list_mood_presets():
    """
    Returns available mood arc presets ('Focus', 'Wind Down', 'Hype Up', 'Chill')
    with starting and ending valence/arousal coordinates.
    """
    presets_data = []
    for key, p in MOOD_PRESETS.items():
        presets_data.append({
            "id": key,
            "name": p.name,
            "description": p.description,
            "start_valence": p.start_valence,
            "start_arousal": p.start_arousal,
            "target_valence": p.target_valence,
            "target_arousal": p.target_arousal,
        })
    return {"status": "ok", "presets": presets_data}


@router.post("/plan-arc", response_model=MoodArcResponse)
def plan_mood_arc(req: MoodArcRequest):
    """
    Plans 20-track emotional trajectory using lerp and Gaussian jitter.
    """
    if req.preset_name:
        waypoints = _planner.plan_preset_trajectory(req.preset_name, num_tracks=req.num_tracks)
    else:
        target_v = req.target_valence if req.target_valence is not None else req.start_valence
        target_a = req.target_arousal if req.target_arousal is not None else req.start_arousal
        waypoints = _planner.plan_trajectory(
            start_valence=req.start_valence,
            start_arousal=req.start_arousal,
            target_valence=target_v,
            target_arousal=target_a,
            num_tracks=req.num_tracks,
        )

    res_waypoints = [
        WaypointResponse(
            step=wp.step,
            progress=wp.progress,
            valence=wp.valence,
            arousal=wp.arousal,
        )
        for wp in waypoints
    ]

    return MoodArcResponse(
        status="ok",
        num_tracks=len(res_waypoints),
        waypoints=res_waypoints,
        preset=req.preset_name,
    )


@router.post("/diffuse")
def generate_diffused_playlist(req: MoodArcRequest):
    """
    Synthesizes a 20-track playlist via L-DiffRec U-Net reverse diffusion,
    maps to catalog tracks with FAISS IndexFlatIP, and computes coherence metrics.
    """
    # Sample catalog tracks if empty
    if len(_generator.retriever.track_ids) == 0:
        sample_catalog: Dict[str, Any] = {}
        sample_metadata: Dict[str, TrackAcousticMetadata] = {}
        for i in range(50):
            tid = f"track_{i+1:03d}"
            # Deterministic 768-dim pseudo MERT vector
            vec = np.sin(np.linspace(0.1 * i, 10.0 + 0.1 * i, 768)).astype(np.float32)
            sample_catalog[tid] = vec
            sample_metadata[tid] = TrackAcousticMetadata(
                track_id=tid,
                bpm=100.0 + (i % 8) * 3.0,
                key=(i * 7) % 12,
                mode=1 if i % 2 == 0 else 0,
                valence=0.2 + (i % 10) * 0.07,
                arousal=0.3 + (i % 8) * 0.08,
            )
        _generator.retriever.rebuild_index(sample_catalog)
    else:
        sample_metadata = {}

    target_v = req.target_valence if req.target_valence is not None else req.start_valence
    target_a = req.target_arousal if req.target_arousal is not None else req.start_arousal

    playlist, report = _generator.generate_playlist(
        catalog_metadata=sample_metadata,
        start_mood=(req.start_valence, req.start_arousal),
        target_mood=(target_v, target_a),
        sequence_length=req.num_tracks,
        preset_name=req.preset_name,
    )

    return {
        "status": "success",
        "num_tracks": len(playlist),
        "playlist": [{"track_id": tid, "similarity": s} for tid, s in playlist],
        "coherence": {
            "overall_coherent": report.overall_coherent,
            "coherence_score": report.coherence_score,
            "bpm_coherent": report.bpm_coherent,
            "harmonic_coherent": report.harmonic_coherent,
            "valence_coherent": report.valence_coherent,
            "valence_slope_std": report.valence_slope_std,
            "bpm_violations": report.bpm_violations,
            "harmonic_violations": report.harmonic_violations,
        },
    }
