"""
Sloth Sequential & Cognitive Recommendation Engine
Includes:
  - BERT4Rec: Bidirectional transformer sequential recommender (last 50 tracks, d_model=256)
  - ACT-R Memory: Cognitive memory decay A(t) = log(n) - 1.0 * log(delta_t_hours + 1)
  - Mode Detector: Logistic regression classifier (Comfort vs Exploration) with mode gating
  - Context Encoder: MLP neural encoder for multi-modal contextual signals (128-dim)
  - Mood Trajectory: 14-day GRU forecasting current emotional circumplex coordinates
"""

from .bert4rec import BERT4Rec, BERT4RecConfig
from .actr_memory import (
    ACTRMemoryEngine,
    MemoryCandidateType,
    MemoryScoreResult,
    TrackMemoryRecord,
)
from .mode_detector import ModeDetector, ModeDetectionResult, ModeType
from .context_encoder import ContextEncoder, ContextFeatures
from .mood_trajectory import DailyMoodSummary, MoodTrajectoryPredictor

__all__ = [
    "BERT4Rec",
    "BERT4RecConfig",
    "ACTRMemoryEngine",
    "TrackMemoryRecord",
    "MemoryCandidateType",
    "MemoryScoreResult",
    "ModeDetector",
    "ModeDetectionResult",
    "ModeType",
    "ContextEncoder",
    "ContextFeatures",
    "MoodTrajectoryPredictor",
    "DailyMoodSummary",
]
