# Source: Analysis of Thompson Sampling for the Multi-armed Bandit Problem, Shipra Agrawal, Navin Goyal, 2012
# Reference implementation: Multi-Armed Bandit Thompson Sampling (Beta-Bernoulli conjugate model)
# Adapted for Sloth by: Syed Zahid
# License of original: MIT
# Changes: Multi-armed bandit Beta distribution sampler with non-stationary decay gamma, cold-start exploration bonus, batch arm updates, and track recommendation selection.

from __future__ import annotations

from dataclasses import dataclass
import math
from typing import Dict, List, Optional, Tuple
import numpy as np


@dataclass
class BanditArm:
    item_id: str
    alpha: float = 1.0   # Prior successes (default 1.0 for uniform prior Beta(1,1))
    beta: float = 1.0    # Prior failures
    total_pulls: int = 0


class ThompsonBandit:
    """
    Beta-Bernoulli Thompson Sampling Multi-Armed Bandit.
    Optimizes exploration vs. exploitation for cold-start tracks and new users.
    """

    def __init__(self, decay_factor: float = 0.99, default_alpha: float = 1.0, default_beta: float = 1.0):
        self.decay_factor = decay_factor  # Gamma for non-stationary taste drift
        self.default_alpha = default_alpha
        self.default_beta = default_beta
        self.arms: Dict[str, BanditArm] = {}

    def get_or_create_arm(self, item_id: str) -> BanditArm:
        if item_id not in self.arms:
            self.arms[item_id] = BanditArm(
                item_id=item_id,
                alpha=self.default_alpha,
                beta=self.default_beta,
            )
        return self.arms[item_id]

    def sample_arm(self, item_id: str) -> float:
        """
        Draws a random probability sample theta_i ~ Beta(alpha, beta).
        """
        arm = self.get_or_create_arm(item_id)
        # np.random.beta requires alpha > 0, beta > 0
        a = max(1e-4, arm.alpha)
        b = max(1e-4, arm.beta)
        return float(np.random.beta(a, b))

    def select_top_k(self, candidate_ids: List[str], k: int = 10) -> List[Tuple[str, float]]:
        """
        Selects top-k items by drawing independent Beta samples and ranking.
        """
        if not candidate_ids:
            return []

        sampled_scores: List[Tuple[str, float]] = []
        for item_id in candidate_ids:
            score = self.sample_arm(item_id)
            sampled_scores.append((item_id, score))

        sampled_scores.sort(key=lambda x: x[1], reverse=True)
        return sampled_scores[:k]

    def update(self, item_id: str, reward: float) -> None:
        """
        Bayesian update:
        alpha <- gamma * alpha + reward
        beta  <- gamma * beta + (1 - reward)
        reward is typically in [0.0, 1.0] (e.g. 1.0 for favorite/completion, 0.0 for instant skip).
        """
        arm = self.get_or_create_arm(item_id)
        r = max(0.0, min(1.0, float(reward)))

        arm.alpha = self.decay_factor * arm.alpha + r
        arm.beta = self.decay_factor * arm.beta + (1.0 - r)
        arm.total_pulls += 1

    def batch_update(self, rewards: Dict[str, float]) -> None:
        """
        Updates multiple arms simultaneously from session feedback.
        """
        for item_id, reward in rewards.items():
            self.update(item_id, reward)

    def get_arm_stats(self, item_id: str) -> Dict[str, float]:
        """
        Returns expected reward mean and uncertainty variance for an arm.
        mean = alpha / (alpha + beta)
        var  = (alpha * beta) / ((alpha + beta)^2 * (alpha + beta + 1))
        """
        arm = self.get_or_create_arm(item_id)
        total = arm.alpha + arm.beta
        mean = arm.alpha / total
        variance = (arm.alpha * arm.beta) / (math.pow(total, 2) * (total + 1.0))
        return {
            "alpha": arm.alpha,
            "beta": arm.beta,
            "expected_reward": mean,
            "uncertainty": math.sqrt(variance),
            "pulls": arm.total_pulls,
        }

    def record_genre_feedback(self, genre: str, liked: bool, rating: Optional[float] = None) -> None:
        """
        Updates genre arm with user feedback:
        liked=True (or high rating) increases alpha, liked=False increases beta.
        """
        if rating is not None:
            r = float(np.clip(rating, 0.0, 1.0))
        else:
            r = 1.0 if liked else 0.0
        self.update(genre.lower().strip(), r)

    def sample_genre_weights(self, genres: Optional[List[str]] = None) -> Dict[str, float]:
        """
        Draws Thompson Samples for each specified genre arm (or all arms).
        """
        arm_keys = [g.lower().strip() for g in genres] if genres else list(self.arms.keys())
        if not arm_keys:
            return {}

        samples = {g: self.sample_arm(g) for g in arm_keys}
        # Normalize weights so sum equals 1.0
        total = sum(samples.values()) + 1e-9
        return {g: float(v / total) for g, v in samples.items()}

    def rank_genres(self, genres: Optional[List[str]] = None) -> List[Tuple[str, float]]:
        """
        Returns genres ordered by sampled preference probability.
        """
        weights = self.sample_genre_weights(genres)
        ranked = sorted(weights.items(), key=lambda x: x[1], reverse=True)
        return ranked
