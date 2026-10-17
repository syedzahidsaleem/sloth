"""
Sloth Diffusion Generator - Mood Arc Planner
Plans continuous emotional trajectories across N tracks using linear interpolation (lerp)
with controlled Gaussian variance: lerp(start_V, end_V, i/n) + N(0, 0.05).
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple
import numpy as np


@dataclass
class MoodWaypoint:
    step: int
    progress: float  # [0.0, 1.0]
    valence: float   # [0.0, 1.0]
    arousal: float   # [0.0, 1.0]


@dataclass
class MoodPreset:
    name: str
    description: str
    start_valence: float
    start_arousal: float
    target_valence: float
    target_arousal: float


MOOD_PRESETS: Dict[str, MoodPreset] = {
    "focus": MoodPreset(
        name="Focus",
        description="Steady, deep concentration with minimal distraction and low-medium arousal",
        start_valence=0.20,
        start_arousal=0.30,
        target_valence=0.10,
        target_arousal=0.40,
    ),
    "wind_down": MoodPreset(
        name="Wind Down",
        description="Gradual deceleration from active evening into calm, warm nighttime repose",
        start_valence=0.40,
        start_arousal=0.70,
        target_valence=0.60,
        target_arousal=0.10,
    ),
    "hype_up": MoodPreset(
        name="Hype Up",
        description="Building euphoric crescendo for workouts, pre-parties, and peak motivation",
        start_valence=0.30,
        start_arousal=0.40,
        target_valence=0.90,
        target_arousal=0.95,
    ),
    "chill": MoodPreset(
        name="Chill",
        description="Easygoing, melodic afternoon vibes with mellow rhythmic warmth",
        start_valence=0.50,
        start_arousal=0.40,
        target_valence=0.70,
        target_arousal=0.25,
    ),
}


class MoodArcPlanner:
    """
    Synthesizes smooth, coherent mood trajectories for playlist diffusion conditioning.
    """

    def __init__(self, default_noise_std: float = 0.05):
        self.default_noise_std = default_noise_std

    def plan_trajectory(
        self,
        start_valence: float,
        start_arousal: float,
        target_valence: float,
        target_arousal: float,
        num_tracks: int = 20,
        noise_std: Optional[float] = None,
        random_seed: Optional[int] = None,
    ) -> List[MoodWaypoint]:
        """
        Generates N waypoints along the valence/arousal emotional axis using lerp:
          lerp(start, end, i / (N - 1)) + N(0, noise_std)
        """
        if num_tracks <= 0:
            return []

        rng = np.random.default_rng(random_seed)
        std = noise_std if noise_std is not None else self.default_noise_std

        waypoints: List[MoodWaypoint] = []
        denom = float(max(1, num_tracks - 1))

        for i in range(num_tracks):
            t = float(i) / denom if num_tracks > 1 else 0.0

            # Linear interpolation (lerp)
            mean_v = (1.0 - t) * start_valence + t * target_valence
            mean_a = (1.0 - t) * start_arousal + t * target_arousal

            # Add zero-mean Gaussian jitter N(0, noise_std)
            jitter_v = float(rng.normal(0.0, std)) if std > 0 else 0.0
            jitter_a = float(rng.normal(0.0, std)) if std > 0 else 0.0

            v = float(np.clip(mean_v + jitter_v, 0.0, 1.0))
            a = float(np.clip(mean_a + jitter_a, 0.0, 1.0))

            waypoints.append(
                MoodWaypoint(
                    step=i,
                    progress=round(t, 4),
                    valence=round(v, 4),
                    arousal=round(a, 4),
                )
            )

        return waypoints

    def plan_preset_trajectory(
        self,
        preset_name: str,
        num_tracks: int = 20,
        noise_std: Optional[float] = None,
        random_seed: Optional[int] = None,
    ) -> List[MoodWaypoint]:
        """
        Generates trajectory using one of the calibrated Sloth presets:
        'Focus', 'Wind Down', 'Hype Up', 'Chill'.
        """
        key = preset_name.lower().replace(" ", "_").strip()
        preset = MOOD_PRESETS.get(key)
        if not preset:
            # Fallback to Chill preset
            preset = MOOD_PRESETS["chill"]

        return self.plan_trajectory(
            start_valence=preset.start_valence,
            start_arousal=preset.start_arousal,
            target_valence=preset.target_valence,
            target_arousal=preset.target_arousal,
            num_tracks=num_tracks,
            noise_std=noise_std,
            random_seed=random_seed,
        )

    def extract_mood_vectors(self, waypoints: List[MoodWaypoint]) -> np.ndarray:
        """
        Extracts 2-dimensional (valence, arousal) array for diffusion conditioning.
        Shape: (num_tracks, 2)
        """
        return np.array([[wp.valence, wp.arousal] for wp in waypoints], dtype=np.float32)
