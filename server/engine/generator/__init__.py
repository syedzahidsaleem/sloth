"""
Sloth Generator Module - Latent Diffusion Recommender (L-DiffRec)
Includes playlist diffusion generator, U-Net denoiser, mood arc planner,
coherence metrics, and FAISS acoustic retrieval.
"""

from .playlist_diffusion import (
    DiffusionConfig,
    PlaylistDiffusionConfig,
    PlaylistDiffusionGenerator,
    NoiseSchedule,
    GaussianDiffusionSchedule,
    UNetDenoiserMLP,
)
from .mood_arc_planner import (
    MoodArcPlanner,
    MoodWaypoint,
    MoodPreset,
    MOOD_PRESETS,
)
from .coherence import (
    PlaylistCoherenceEvaluator,
    TrackAcousticMetadata,
    CoherenceReport,
    circle_of_fifths_distance,
)
from .faiss_retrieval import FAISSRetriever

__all__ = [
    "DiffusionConfig",
    "PlaylistDiffusionConfig",
    "PlaylistDiffusionGenerator",
    "NoiseSchedule",
    "GaussianDiffusionSchedule",
    "UNetDenoiserMLP",
    "MoodArcPlanner",
    "MoodWaypoint",
    "MoodPreset",
    "MOOD_PRESETS",
    "PlaylistCoherenceEvaluator",
    "TrackAcousticMetadata",
    "CoherenceReport",
    "circle_of_fifths_distance",
    "FAISSRetriever",
]
