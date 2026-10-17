"""
Sloth Sequential Engine - Context Encoder
MLP neural encoder projecting multi-modal contextual cues into a 128-dimensional latent vector:
  - hour_of_day: cyclic sine/cosine encoding
  - day_type: weekend vs weekday and day-of-week cycle
  - activity: working, workout, relax, commute, focus, party, etc.
  - ambient_level: continuous [0, 1] noise/crowd level
  - weather: clear, rain, cloudy, snow, night, etc.
  - user valence/arousal: Russell circumplex emotional coordinates
"""

from __future__ import annotations

from dataclasses import dataclass
import math
from typing import Any, Dict, List, Optional, Union
import numpy as np


ACTIVITIES = [
    "working",
    "workout",
    "relax",
    "commute",
    "focus",
    "party",
    "sleep",
    "gaming",
]

WEATHERS = [
    "clear",
    "rain",
    "cloudy",
    "snow",
    "storm",
    "night",
]


@dataclass
class ContextFeatures:
    hour_of_day: float = 12.0          # 0 to 23.99
    day_of_week: int = 2              # 0=Monday, 6=Sunday
    is_weekend: Optional[bool] = None # Inferred from day_of_week if None
    activity: str = "relax"
    ambient_level: float = 0.3        # 0.0 (silent) to 1.0 (loud)
    weather: str = "clear"
    user_valence: float = 0.5         # 0.0 (sad) to 1.0 (happy)
    user_arousal: float = 0.5         # 0.0 (calm) to 1.0 (energised)


def gelu(x: np.ndarray) -> np.ndarray:
    return 0.5 * x * (1.0 + np.tanh(math.sqrt(2.0 / math.pi) * (x + 0.044715 * np.power(x, 3.0))))


def layer_norm(x: np.ndarray, eps: float = 1e-5) -> np.ndarray:
    mean = np.mean(x, axis=-1, keepdims=True)
    var = np.var(x, axis=-1, keepdims=True)
    return (x - mean) / np.sqrt(var + eps)


class ContextEncoder:
    """
    Multi-Layer Perceptron (MLP) projecting music session context into a 128-dimensional representation.
    """

    def __init__(self, output_dim: int = 128, hidden_dim: int = 256, seed: int = 42):
        self.output_dim = output_dim
        self.hidden_dim = hidden_dim

        # Input dimension:
        # hour_sin, hour_cos (2)
        # day_sin, day_cos, is_weekend (3)
        # activity one-hot (8)
        # ambient_level (1)
        # weather one-hot (6)
        # valence, arousal (2)
        self.input_dim = 2 + 3 + len(ACTIVITIES) + 1 + len(WEATHERS) + 2

        rng = np.random.RandomState(seed)
        scale_1 = 1.0 / math.sqrt(self.input_dim)
        scale_2 = 1.0 / math.sqrt(self.hidden_dim)

        self.w1 = rng.normal(0.0, scale_1, size=(self.input_dim, self.hidden_dim)).astype(np.float32)
        self.b1 = np.zeros(self.hidden_dim, dtype=np.float32)

        self.w2 = rng.normal(0.0, scale_2, size=(self.hidden_dim, self.output_dim)).astype(np.float32)
        self.b2 = np.zeros(self.output_dim, dtype=np.float32)

    def extract_feature_vector(self, ctx: Union[ContextFeatures, Dict[str, Any]]) -> np.ndarray:
        """
        Converts ContextFeatures or raw dict into a continuous feature vector.
        """
        if isinstance(ctx, dict):
            hour = float(ctx.get("hour_of_day", ctx.get("hour", 12.0)))
            dow = int(ctx.get("day_of_week", 2))
            is_wknd = ctx.get("is_weekend", dow >= 5)
            act = str(ctx.get("activity", "relax")).lower()
            ambient = float(ctx.get("ambient_level", 0.3))
            weath = str(ctx.get("weather", "clear")).lower()
            val = float(ctx.get("user_valence", ctx.get("valence", 0.5)))
            aro = float(ctx.get("user_arousal", ctx.get("arousal", 0.5)))
        else:
            hour = ctx.hour_of_day
            dow = ctx.day_of_week
            is_wknd = ctx.is_weekend if ctx.is_weekend is not None else (dow >= 5)
            act = ctx.activity.lower()
            ambient = ctx.ambient_level
            weath = ctx.weather.lower()
            val = ctx.user_valence
            aro = ctx.user_arousal

        features: List[float] = []

        # 1. Hour of day (cyclical)
        h_rad = 2.0 * math.pi * (hour % 24.0) / 24.0
        features.append(math.sin(h_rad))
        features.append(math.cos(h_rad))

        # 2. Day type
        d_rad = 2.0 * math.pi * (dow % 7) / 7.0
        features.append(math.sin(d_rad))
        features.append(math.cos(d_rad))
        features.append(1.0 if is_wknd else 0.0)

        # 3. Activity one-hot
        act_vec = [1.0 if act == a else 0.0 for a in ACTIVITIES]
        # If none matched, mark neutral
        if sum(act_vec) == 0:
            act_vec[2] = 1.0  # default relax
        features.extend(act_vec)

        # 4. Ambient level [0, 1]
        features.append(float(np.clip(ambient, 0.0, 1.0)))

        # 5. Weather one-hot
        weath_vec = [1.0 if weath == w else 0.0 for w in WEATHERS]
        if sum(weath_vec) == 0:
            weath_vec[0] = 1.0  # default clear
        features.extend(weath_vec)

        # 6. Valence & Arousal [0, 1]
        features.append(float(np.clip(val, 0.0, 1.0)))
        features.append(float(np.clip(aro, 0.0, 1.0)))

        return np.array(features, dtype=np.float32)

    def forward(self, x: np.ndarray) -> np.ndarray:
        """
        x: (batch_size, input_dim) or (input_dim,)
        Returns: (batch_size, 128) or (128,) normalized context embedding
        """
        single_input = x.ndim == 1
        if single_input:
            x = x[np.newaxis, :]

        # Layer 1: Linear + GELU + LayerNorm
        h = gelu(x @ self.w1 + self.b1)
        h = layer_norm(h)

        # Layer 2: Linear
        out = h @ self.w2 + self.b2

        # L2 row normalization for cosine similarity compatibility
        norms = np.linalg.norm(out, axis=-1, keepdims=True) + 1e-8
        out = out / norms

        return out[0] if single_input else out

    def encode_context(self, ctx: Union[ContextFeatures, Dict[str, Any]]) -> np.ndarray:
        """
        Encodes context into 128-dimensional embedding.
        """
        vec = self.extract_feature_vector(ctx)
        return self.forward(vec)
