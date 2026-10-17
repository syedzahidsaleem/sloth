"""
fusion.py — Gated Fusion Layer for Sloth Recommendation Engine

Implements GatingNetwork:
    Linear(6 -> 32) -> ReLU -> Linear(32 -> 6) -> Softmax
Conditioned on:
    [is_new_user, mode_code, context_type, session_depth, time_of_day, exploration_intent]

Dynamically weights 6 candidate recommendation scoring layers:
    1. LightHGCN (Collaborative heterogeneous hypergraph)
    2. BERT4Rec (Sequential Transformer transition)
    3. ACT-R (Cognitive memory activation & decay)
    4. Acoustic/CLAP (MERT audio & multimodal text-audio similarity)
    5. Meld (Source relevance, artist affinity, genre overlap, recency)
    6. Thompson Bandit (Cold-start exploration/exploitation)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    HAS_TORCH = True
except ImportError:
    torch = None
    nn = None
    F = None
    HAS_TORCH = False


class ScoringLayer(str, Enum):
    GRAPH = "graph"
    SEQUENTIAL = "sequential"
    MEMORY = "memory"
    ACOUSTIC = "acoustic"
    MELD = "meld"
    BANDIT = "bandit"


SCORING_LAYERS: List[ScoringLayer] = [
    ScoringLayer.GRAPH,
    ScoringLayer.SEQUENTIAL,
    ScoringLayer.MEMORY,
    ScoringLayer.ACOUSTIC,
    ScoringLayer.MELD,
    ScoringLayer.BANDIT,
]

MODE_ENCODING: Dict[str, float] = {
    "focus": 0.1,
    "workout": 0.3,
    "chill": 0.5,
    "commute": 0.7,
    "party": 0.9,
    "none": 0.0,
}

CONTEXT_ENCODING: Dict[str, float] = {
    "morning": 0.1,
    "afternoon": 0.3,
    "evening": 0.6,
    "night": 0.9,
    "work": 0.2,
    "leisure": 0.5,
    "transit": 0.8,
}


@dataclass
class FusionContext:
    """
    Contextual signals passed to GatingNetwork to adjust scoring weights.
    """
    is_new_user: bool = False
    mode: Optional[str] = None
    context_type: Optional[str] = None
    session_depth: int = 0
    time_of_day: Optional[str] = None
    discovery_alpha: float = 0.5  # User IPS debiasing exploration slider [0.0 - 1.0]

    def to_vector(self) -> np.ndarray:
        """
        Converts context into normalized 6-dimensional input vector:
        [is_new_user, mode_code, context_code, session_depth_norm, time_code, discovery_alpha]
        """
        v_new_user = 1.0 if self.is_new_user else 0.0
        v_mode = MODE_ENCODING.get(str(self.mode).lower(), 0.0)
        v_context = CONTEXT_ENCODING.get(str(self.context_type).lower(), 0.0)
        # Saturates at 30 tracks
        v_session = min(1.0, max(0.0, float(self.session_depth) / 30.0))
        v_time = CONTEXT_ENCODING.get(str(self.time_of_day).lower(), 0.5)
        v_alpha = float(min(1.0, max(0.0, self.discovery_alpha)))

        return np.array([v_new_user, v_mode, v_context, v_session, v_time, v_alpha], dtype=np.float32)


if HAS_TORCH:
    class _TorchGatingMLP(nn.Module):
        def __init__(self, in_features: int = 6, hidden_dim: int = 32, out_features: int = 6):
            super().__init__()
            self.fc1 = nn.Linear(in_features, hidden_dim)
            self.relu = nn.ReLU()
            self.fc2 = nn.Linear(hidden_dim, out_features)

        def forward(self, x: torch.Tensor) -> torch.Tensor:
            h = self.relu(self.fc1(x))
            logits = self.fc2(h)
            return F.softmax(logits, dim=-1)
else:
    _TorchGatingMLP = None


class GatingNetwork:
    """
    Gating Network mapping 6 context signals -> 6 Softmax weights for scoring layers.
    Architecture: Linear(6 -> 32) -> ReLU -> Linear(32 -> 6) -> Softmax.
    Runs on PyTorch if available, with deterministic, optimized NumPy fallback.
    """
    def __init__(
        self,
        in_features: int = 6,
        hidden_dim: int = 32,
        out_features: int = 6,
        seed: int = 42,
    ):
        self.in_features = in_features
        self.hidden_dim = hidden_dim
        self.out_features = out_features
        self.seed = seed

        # Deterministic weight initialization
        rng = np.random.RandomState(seed)
        # Xavier/Glorot uniform initialization
        limit1 = np.sqrt(6.0 / (in_features + hidden_dim))
        self.W1 = rng.uniform(-limit1, limit1, (hidden_dim, in_features)).astype(np.float32)
        self.b1 = np.zeros(hidden_dim, dtype=np.float32)

        limit2 = np.sqrt(6.0 / (hidden_dim + out_features))
        self.W2 = rng.uniform(-limit2, limit2, (out_features, hidden_dim)).astype(np.float32)
        # Prior biases favoring balanced collaborative, sequential and heuristics
        # [graph, sequential, memory, acoustic, meld, bandit]
        self.b2 = np.array([0.5, 0.4, 0.2, 0.3, 0.5, 0.1], dtype=np.float32)

        self._torch_model = None
        if HAS_TORCH:
            try:
                self._torch_model = _TorchGatingMLP(in_features, hidden_dim, out_features)
                with torch.no_grad():
                    self._torch_model.fc1.weight.copy_(torch.from_numpy(self.W1))
                    self._torch_model.fc1.bias.copy_(torch.from_numpy(self.b1))
                    self._torch_model.fc2.weight.copy_(torch.from_numpy(self.W2))
                    self._torch_model.fc2.bias.copy_(torch.from_numpy(self.b2))
                self._torch_model.eval()
            except Exception:
                self._torch_model = None

    def forward_numpy(self, x: np.ndarray) -> np.ndarray:
        """
        Pure NumPy vectorized forward pass:
        h = max(0, W1 @ x + b1)
        logits = W2 @ h + b2
        weights = softmax(logits)
        """
        x = np.asarray(x, dtype=np.float32)
        single_input = (x.ndim == 1)
        if single_input:
            x = x.reshape(1, -1)

        # h: (batch, hidden_dim)
        h = np.maximum(0.0, x @ self.W1.T + self.b1)
        # logits: (batch, out_features)
        logits = h @ self.W2.T + self.b2

        # Context inductive priors:
        # If is_new_user (index 0 > 0.5), strongly boost bandit and meld heuristics
        for i in range(x.shape[0]):
            if x[i, 0] > 0.5:
                # new user: damp graph/sequential, boost bandit and meld
                logits[i, 0] -= 1.0  # graph
                logits[i, 1] -= 1.0  # sequential
                logits[i, 4] += 1.2  # meld
                logits[i, 5] += 1.5  # bandit

            # If mode is focus/chill (mode code 0.1 or 0.5), boost acoustic consistency
            if 0.05 <= x[i, 1] <= 0.55:
                logits[i, 3] += 0.8  # acoustic

            # If session is deep (session_depth > 0.4), boost sequential and memory
            if x[i, 3] > 0.3:
                logits[i, 1] += 0.7  # sequential
                logits[i, 2] += 0.6  # memory

            # If high discovery intent (x[i, 5] > 0.7), boost bandit and acoustic
            if x[i, 5] > 0.7:
                logits[i, 5] += 0.8
                logits[i, 3] += 0.5

        # Stable softmax
        shift_logits = logits - np.max(logits, axis=-1, keepdims=True)
        exp_logits = np.exp(shift_logits)
        weights = exp_logits / np.sum(exp_logits, axis=-1, keepdims=True)

        if single_input:
            return weights[0]
        return weights

    def compute_weights(
        self,
        context: Optional[Union[FusionContext, np.ndarray, Dict[str, Any]]] = None,
    ) -> Dict[str, float]:
        """
        Computes dynamic weights for the 6 scoring layers.
        Returns a dictionary mapping layer name -> weight in [0.0, 1.0], summing to 1.0.
        """
        if context is None:
            ctx_vec = FusionContext().to_vector()
        elif isinstance(context, FusionContext):
            ctx_vec = context.to_vector()
        elif isinstance(context, dict):
            ctx_obj = FusionContext(
                is_new_user=bool(context.get("is_new_user", False)),
                mode=context.get("mode"),
                context_type=context.get("context_type"),
                session_depth=int(context.get("session_depth", 0)),
                time_of_day=context.get("time_of_day"),
                discovery_alpha=float(context.get("discovery_alpha", 0.5)),
            )
            ctx_vec = ctx_obj.to_vector()
        else:
            ctx_vec = np.asarray(context, dtype=np.float32)

        if HAS_TORCH and self._torch_model is not None and isinstance(ctx_vec, torch.Tensor):
            with torch.no_grad():
                weights_np = self._torch_model(ctx_vec).cpu().numpy().flatten()
        else:
            weights_np = self.forward_numpy(ctx_vec)

        return {
            layer.value: float(weights_np[idx])
            for idx, layer in enumerate(SCORING_LAYERS)
        }

    def fuse_scores(
        self,
        layer_scores: Dict[str, np.ndarray],
        weights: Dict[str, float],
    ) -> np.ndarray:
        """
        Fuses multiple scoring vectors into a single composite score array:
            S_fused = sum_k w_k * S_k
        """
        if not layer_scores:
            return np.array([], dtype=np.float32)

        first_arr = next(iter(layer_scores.values()))
        length = len(first_arr)
        fused = np.zeros(length, dtype=np.float32)

        for layer_name, w in weights.items():
            if layer_name in layer_scores and w > 0.0:
                scores = np.asarray(layer_scores[layer_name], dtype=np.float32)
                fused += w * scores

        return fused
