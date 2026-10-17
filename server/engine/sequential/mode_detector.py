"""
Sloth Sequential Engine - Mode Detector
Logistic regression classifier determining user listening mode:
  - Comfort Mode: High repeat ratio, low entropy -> sequential weight 0.6, graph weight 0.4
  - Exploration Mode: High skip rate, high genre entropy -> sequential weight 0.3, graph weight 0.7
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
import math
from typing import Dict, List, Optional, Set, Tuple, Union
import numpy as np


class ModeType(str, Enum):
    COMFORT = "comfort"
    EXPLORATION = "exploration"


@dataclass
class ModeDetectionResult:
    mode: ModeType
    comfort_probability: float
    exploration_probability: float
    seq_weight: float
    graph_weight: float
    features: Dict[str, float]


class ModeDetector:
    """
    Logistic Regression classifier detecting Comfort vs Exploration listening modes.
    Features:
      - repeat_ratio: [0, 1] fraction of tracks previously heard
      - skip_rate: [0, 1] fraction of tracks skipped
      - genre_entropy: [0, 1] normalized entropy of genres in session
      - session_length: [0, 1] normalized session duration/count
    """

    def __init__(
        self,
        # Default trained weights for music session mode detection
        # Positive pushes towards EXPLORATION, negative towards COMFORT
        w_intercept: float = 0.20,
        w_repeat: float = -2.80,     # Strong comfort signal
        w_skip: float = 1.60,       # High skip signals hunting for new songs
        w_entropy: float = 2.40,    # High genre diversity signals exploration
        w_length: float = -0.50,    # Longer sessions drift toward background comfort
        comfort_seq_weight: float = 0.60,
        comfort_graph_weight: float = 0.40,
        exploration_seq_weight: float = 0.30,
        exploration_graph_weight: float = 0.70,
    ):
        self.w_intercept = w_intercept
        self.w_repeat = w_repeat
        self.w_skip = w_skip
        self.w_entropy = w_entropy
        self.w_length = w_length

        self.comfort_seq_weight = comfort_seq_weight
        self.comfort_graph_weight = comfort_graph_weight
        self.exploration_seq_weight = exploration_seq_weight
        self.exploration_graph_weight = exploration_graph_weight

    def compute_genre_entropy(self, genres: List[str]) -> float:
        """
        Computes normalized Shannon entropy of genre distribution in [0, 1].
        """
        if not genres:
            return 0.0

        counts: Dict[str, int] = {}
        for g in genres:
            counts[g] = counts.get(g, 0) + 1

        total = len(genres)
        num_distinct = len(counts)
        if num_distinct <= 1:
            return 0.0

        entropy = 0.0
        for count in counts.values():
            p = count / float(total)
            if p > 0:
                entropy -= p * math.log2(p)

        # Normalize by maximum possible entropy log2(num_distinct)
        max_entropy = math.log2(num_distinct)
        return float(min(1.0, max(0.0, entropy / max_entropy)))

    def predict(
        self,
        repeat_ratio: float,
        skip_rate: float,
        genre_entropy: float,
        session_length: float,
        continuous_gating: bool = True,
    ) -> ModeDetectionResult:
        """
        Evaluates logistic regression logit:
          z = w_0 + w_rep*rep + w_sk*skip + w_ent*entropy + w_len*len
          P(Exploration) = sigmoid(z)
        """
        r_rep = float(np.clip(repeat_ratio, 0.0, 1.0))
        r_sk = float(np.clip(skip_rate, 0.0, 1.0))
        r_ent = float(np.clip(genre_entropy, 0.0, 1.0))
        r_len = float(np.clip(session_length, 0.0, 1.0))

        z = (
            self.w_intercept
            + self.w_repeat * r_rep
            + self.w_skip * r_sk
            + self.w_entropy * r_ent
            + self.w_length * r_len
        )

        p_explore = float(1.0 / (1.0 + math.exp(-np.clip(z, -30.0, 30.0))))
        p_comfort = float(1.0 - p_explore)

        mode = ModeType.EXPLORATION if p_explore >= 0.5 else ModeType.COMFORT

        if continuous_gating:
            seq_weight = float(
                p_comfort * self.comfort_seq_weight + p_explore * self.exploration_seq_weight
            )
            graph_weight = float(
                p_comfort * self.comfort_graph_weight + p_explore * self.exploration_graph_weight
            )
        else:
            if mode == ModeType.COMFORT:
                seq_weight = self.comfort_seq_weight
                graph_weight = self.comfort_graph_weight
            else:
                seq_weight = self.exploration_seq_weight
                graph_weight = self.exploration_graph_weight

        return ModeDetectionResult(
            mode=mode,
            comfort_probability=round(p_comfort, 4),
            exploration_probability=round(p_explore, 4),
            seq_weight=round(seq_weight, 4),
            graph_weight=round(graph_weight, 4),
            features={
                "repeat_ratio": r_rep,
                "skip_rate": r_sk,
                "genre_entropy": r_ent,
                "session_length": r_len,
            },
        )

    def detect_from_events(
        self,
        events: List[Dict[str, Any]],
        known_track_ids: Optional[Set[str]] = None,
        track_genres_map: Optional[Dict[str, List[str]]] = None,
        continuous_gating: bool = True,
    ) -> ModeDetectionResult:
        """
        Extracts features from recent listening events and returns mode classification.
        """
        if not events:
            # Default to neutral comfort mode
            return self.predict(
                repeat_ratio=0.5,
                skip_rate=0.1,
                genre_entropy=0.3,
                session_length=0.2,
                continuous_gating=continuous_gating,
            )

        known = known_track_ids or set()
        genre_map = track_genres_map or {}

        repeats = 0
        skips = 0
        all_genres: List[str] = []

        for ev in events:
            t_id = str(ev.get("track_id", ""))
            if t_id in known:
                repeats += 1

            skip_ms = ev.get("skip_at_ms")
            if skip_ms is not None and int(skip_ms) < 30000:
                skips += 1

            if t_id in genre_map:
                all_genres.extend(genre_map[t_id])

        num_events = len(events)
        repeat_ratio = repeats / float(num_events)
        skip_rate = skips / float(num_events)
        genre_entropy = self.compute_genre_entropy(all_genres)
        # Normalize session length by 20 tracks
        session_length = min(1.0, num_events / 20.0)

        return self.predict(
            repeat_ratio=repeat_ratio,
            skip_rate=skip_rate,
            genre_entropy=genre_entropy,
            session_length=session_length,
            continuous_gating=continuous_gating,
        )
