"""
Sloth Sequential Engine - Mood Trajectory Predictor
Gated Recurrent Unit (GRU) forecasting current musical mood (valence, arousal)
from user's 14-day listening event history.
"""

from __future__ import annotations

from dataclasses import dataclass
import math
import time
from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np


def sigmoid(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-np.clip(x, -30.0, 30.0)))


@dataclass
class DailyMoodSummary:
    day_offset: int           # 0 = today, 13 = 14 days ago
    avg_valence: float = 0.5
    avg_arousal: float = 0.5
    track_count: int = 0
    skip_rate: float = 0.0
    hour_center: float = 14.0 # Mean listening hour of day


class MoodTrajectoryPredictor:
    """
    Gated Recurrent Unit (GRU) recurrent network tracking 14-day emotional listening trajectory.
    Predicts expected target mood (valence, arousal) in Russell circumplex space [0, 1] x [0, 1].
    """

    def __init__(
        self,
        input_dim: int = 8,
        hidden_dim: int = 64,
        window_days: int = 14,
        seed: int = 42,
    ):
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.window_days = window_days

        rng = np.random.RandomState(seed)
        scale_in = 1.0 / math.sqrt(input_dim)
        scale_h = 1.0 / math.sqrt(hidden_dim)

        # Reset gate weights
        self.w_r = rng.normal(0.0, scale_in, size=(input_dim, hidden_dim)).astype(np.float32)
        self.u_r = rng.normal(0.0, scale_h, size=(hidden_dim, hidden_dim)).astype(np.float32)
        self.b_r = np.zeros(hidden_dim, dtype=np.float32)

        # Update gate weights
        self.w_z = rng.normal(0.0, scale_in, size=(input_dim, hidden_dim)).astype(np.float32)
        self.u_z = rng.normal(0.0, scale_h, size=(hidden_dim, hidden_dim)).astype(np.float32)
        self.b_z = np.zeros(hidden_dim, dtype=np.float32)

        # Candidate state weights
        self.w_h = rng.normal(0.0, scale_in, size=(input_dim, hidden_dim)).astype(np.float32)
        self.u_h = rng.normal(0.0, scale_h, size=(hidden_dim, hidden_dim)).astype(np.float32)
        self.b_h = np.zeros(hidden_dim, dtype=np.float32)

        # Output projection to (valence, arousal)
        self.w_out = rng.normal(0.0, scale_h, size=(hidden_dim, 2)).astype(np.float32)
        self.b_out = np.zeros(2, dtype=np.float32)

    def extract_day_vector(self, day: DailyMoodSummary) -> np.ndarray:
        """
        Encodes daily summary into an 8-dimensional feature vector.
        """
        h_rad = 2.0 * math.pi * (day.hour_center % 24.0) / 24.0
        recency = 1.0 - (min(self.window_days, day.day_offset) / float(self.window_days))

        vec = [
            float(np.clip(day.avg_valence, 0.0, 1.0)),
            float(np.clip(day.avg_arousal, 0.0, 1.0)),
            float(min(1.0, day.track_count / 30.0)),
            float(np.clip(day.skip_rate, 0.0, 1.0)),
            math.sin(h_rad),
            math.cos(h_rad),
            float(recency),
            1.0 if day.track_count > 0 else 0.0,
        ]
        return np.array(vec, dtype=np.float32)

    def forward(self, sequence_vectors: np.ndarray) -> Tuple[float, float]:
        """
        sequence_vectors: (seq_len, input_dim) ordered chronologically (oldest to newest)
        Returns: (predicted_valence, predicted_arousal)
        """
        seq_len, _ = sequence_vectors.shape
        h = np.zeros(self.hidden_dim, dtype=np.float32)

        if seq_len == 0:
            return 0.5, 0.5

        for t in range(seq_len):
            x_t = sequence_vectors[t]

            # Reset gate
            r_t = sigmoid(x_t @ self.w_r + h @ self.u_r + self.b_r)
            # Update gate
            z_t = sigmoid(x_t @ self.w_z + h @ self.u_z + self.b_z)
            # Candidate activation
            h_tilde = np.tanh(x_t @ self.w_h + (r_t * h) @ self.u_h + self.b_h)
            # Hidden state
            h = (1.0 - z_t) * h_tilde + z_t * h

        # Project final hidden state to (valence, arousal)
        out = sigmoid(h @ self.w_out + self.b_out)
        val = float(round(float(out[0]), 3))
        aro = float(round(float(out[1]), 3))
        return val, aro

    def predict_from_events(
        self,
        events: List[Dict[str, Any]],
        track_metadata: Optional[Dict[str, Dict[str, float]]] = None,
        current_time: Optional[float] = None,
    ) -> Tuple[float, float]:
        """
        Groups listening events from the last 14 days into daily summaries
        and executes the GRU forward pass.
        """
        now = current_time if current_time is not None else time.time()
        tracks_meta = track_metadata or {}
        day_seconds = 86400.0

        # Create 14 daily bins (day_offset 0 to 13)
        daily_bins: Dict[int, List[Dict[str, Any]]] = {i: [] for i in range(self.window_days)}

        for ev in events:
            ts = float(ev.get("started_at", 0))
            if ts <= 0:
                continue
            delta_days = int((now - ts) / day_seconds)
            if 0 <= delta_days < self.window_days:
                daily_bins[delta_days].append(ev)

        # Build chronological sequence (day 13 down to day 0)
        daily_summaries: List[DailyMoodSummary] = []
        for d in reversed(range(self.window_days)):
            ev_list = daily_bins[d]
            if not ev_list:
                daily_summaries.append(DailyMoodSummary(day_offset=d))
                continue

            valences: List[float] = []
            arousals: List[float] = []
            hours: List[float] = []
            skips = 0

            for ev in ev_list:
                tid = str(ev.get("track_id", ""))
                meta = tracks_meta.get(tid, {})
                v = meta.get("valence")
                a = meta.get("arousal")
                if v is not None:
                    valences.append(float(v))
                if a is not None:
                    arousals.append(float(a))

                skip_ms = ev.get("skip_at_ms")
                if skip_ms is not None and int(skip_ms) < 30000:
                    skips += 1

                st = float(ev.get("started_at", 0))
                if st > 0:
                    hr = (st % day_seconds) / 3600.0
                    hours.append(hr)

            avg_v = float(np.mean(valences)) if valences else 0.5
            avg_a = float(np.mean(arousals)) if arousals else 0.5
            mean_hr = float(np.mean(hours)) if hours else 12.0
            skip_rate = skips / float(len(ev_list))

            daily_summaries.append(
                DailyMoodSummary(
                    day_offset=d,
                    avg_valence=avg_v,
                    avg_arousal=avg_a,
                    track_count=len(ev_list),
                    skip_rate=skip_rate,
                    hour_center=mean_hr,
                )
            )

        # Convert to matrix
        matrix = np.array(
            [self.extract_day_vector(s) for s in daily_summaries],
            dtype=np.float32,
        )
        return self.forward(matrix)
