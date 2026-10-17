# Source: Recommendations as Treatments: Debiasing Learning and Evaluation, Tobias Schnabel, Adith Swaminathan, Ashudeep Singh, Navin Chandak, Thorsten Joachims, 2016
# Reference implementation: https://github.com/jiawei-chen/RecDebiasing
# Adapted for Sloth by: Syed Zahid
# License of original: MIT
# Changes: Propensity score estimation derived from SQLite play_count power-law distribution with Laplace smoothing, propensity clipping, IPS/SNIPS loss reweighting, and debiased evaluation metrics.

from __future__ import annotations

from dataclasses import dataclass
import math
import sqlite3
from typing import Dict, List, Optional, Tuple, Union
import numpy as np


@dataclass
class IPSLossConfig:
    gamma: float = 0.5              # Popularity power-law exponent (typically 0.5 for Square Root propensity)
    min_propensity: float = 0.01     # Clipping threshold to prevent extreme variance
    smoothing: float = 1.0           # Laplace smoothing added to counts
    use_snips: bool = True           # Self-Normalized IPS (SNIPS) for bounded variance


class IPSDebiaser:
    """
    Inverse Propensity Scoring (IPS) Debiasing Engine.
    Corrects for exposure and popularity bias in music streaming logs.
    """

    def __init__(self, config: Optional[IPSLossConfig] = None):
        self.config = config or IPSLossConfig()
        self.propensities: Dict[str, float] = {}
        self.max_play_count: int = 1

    def fit_propensities_from_counts(self, play_counts: Dict[str, int]) -> Dict[str, float]:
        """
        Estimates item observation propensities from raw play counts:
        p_i = ((play_count_i + smoothing) / (max_count + smoothing)) ^ gamma
        hat{p}_i = max(p_i, min_propensity)
        """
        if not play_counts:
            self.propensities = {}
            return self.propensities

        self.max_play_count = max(play_counts.values())
        denom = float(self.max_play_count + self.config.smoothing)

        self.propensities = {}
        for track_id, count in play_counts.items():
            numer = float(max(0, count) + self.config.smoothing)
            raw_p = math.pow(numer / denom, self.config.gamma)
            clipped_p = max(self.config.min_propensity, min(1.0, raw_p))
            self.propensities[track_id] = float(clipped_p)

        return self.propensities

    def debias_candidate_scores(
        self,
        raw_scores: Dict[str, float],
        play_counts: Dict[str, int],
        alpha: float = 0.5,
        min_propensity: float = 0.01,
    ) -> Dict[str, float]:
        """
        Direct test-time score debiasing:
        debiased_score[i] = raw[i] / (play_count[i] / max_count) ^ alpha
        where alpha is user-controlled (0.0 = Familiar, 1.0 = Discovery).
        """
        if not raw_scores:
            return {}

        max_count = max(play_counts.values()) if play_counts else 1
        max_count = max(1, max_count)

        debiased = {}
        for track_id, raw_score in raw_scores.items():
            count = max(0, play_counts.get(track_id, 0))
            if alpha <= 0.0:
                propensity = 1.0
            else:
                ratio = float(count + self.config.smoothing) / float(max_count + self.config.smoothing)
                propensity = max(min_propensity, math.pow(ratio, alpha))

            debiased[track_id] = float(raw_score / propensity)

        return debiased

    def fit_from_sqlite(
        self,
        db_path_or_conn: Union[str, sqlite3.Connection],
        table_name: str = "tracks",
        id_column: str = "id",
        play_count_column: str = "play_count",
    ) -> Dict[str, float]:
        """
        Queries SQLite database table for item play counts and computes propensities.
        """
        close_conn = False
        if isinstance(db_path_or_conn, str):
            conn = sqlite3.connect(db_path_or_conn)
            close_conn = True
        else:
            conn = db_path_or_conn

        cursor = conn.cursor()
        query = f"SELECT {id_column}, COALESCE({play_count_column}, 0) FROM {table_name}"
        cursor.execute(query)
        rows = cursor.fetchall()

        if close_conn:
            conn.close()

        counts = {str(row[0]): int(row[1]) for row in rows}
        return self.fit_propensities_from_counts(counts)

    def get_propensity(self, track_id: str) -> float:
        """
        Returns the observation propensity for a track.
        Falls back to min_propensity for unseen / cold-start tracks.
        """
        return self.propensities.get(track_id, self.config.min_propensity)

    def compute_ips_weights(self, track_ids: List[str]) -> np.ndarray:
        """
        Returns inverse propensity weights w_i = 1 / hat{p}_i for a batch of tracks.
        """
        props = np.array([self.get_propensity(tid) for tid in track_ids], dtype=np.float32)
        props = np.clip(props, self.config.min_propensity, 1.0)
        return 1.0 / props

    def compute_bce_loss(
        self,
        predictions: np.ndarray,
        labels: np.ndarray,
        track_ids: List[str],
    ) -> float:
        """
        Computes Inverse Propensity Weighted Binary Cross-Entropy loss.
        predictions: predicted probabilities or sigmoid outputs in [0, 1]
        labels: ground truth implicit feedback {0, 1}
        """
        eps = 1e-7
        preds = np.clip(predictions, eps, 1.0 - eps)
        # Element-wise BCE
        elementwise_bce = -(labels * np.log(preds) + (1.0 - labels) * np.log(1.0 - preds))

        weights = self.compute_ips_weights(track_ids)

        if self.config.use_snips:
            # Self-Normalized IPS: sum(w * L) / sum(w)
            weight_sum = np.sum(weights) + eps
            return float(np.sum(weights * elementwise_bce) / weight_sum)
        else:
            # Standard IPS: 1/N * sum(w * L)
            return float(np.mean(weights * elementwise_bce))

    def compute_bpr_loss(
        self,
        pos_scores: np.ndarray,
        neg_scores: np.ndarray,
        pos_track_ids: List[str],
        neg_track_ids: List[str],
    ) -> float:
        """
        Computes Debiased Bayesian Personalized Ranking (BPR) Loss:
        L_debiased = -sum( w_i * log(sigmoid(pos_score - neg_score)) )
        """
        diff = pos_scores - neg_scores
        # Softplus loss: log(1 + exp(-diff))
        elementwise_bpr = np.log1p(np.exp(np.clip(-diff, -50.0, 50.0)))

        # Positives carry the main exposure propensity
        pos_weights = self.compute_ips_weights(pos_track_ids)

        if self.config.use_snips:
            weight_sum = np.sum(pos_weights) + 1e-7
            return float(np.sum(pos_weights * elementwise_bpr) / weight_sum)
        else:
            return float(np.mean(pos_weights * elementwise_bpr))

    def debias_ranking_metrics(
        self,
        recommended_tracks: List[str],
        ground_truth_positives: Dict[str, float],
        k: int = 10,
    ) -> Dict[str, float]:
        """
        Evaluates ranking using debiased DCG (Discounted Cumulative Gain) and Recall:
        Gain is reweighted by 1 / propensity to reflect true user relevance under uniform exposure.
        """
        top_k = recommended_tracks[:k]
        dcg = 0.0
        hits = 0.0

        for rank, tid in enumerate(top_k):
            if tid in ground_truth_positives:
                rel = ground_truth_positives[tid]
                prop = self.get_propensity(tid)
                weight = 1.0 / prop

                discount = math.log2(rank + 2)
                dcg += (rel * weight) / discount
                hits += rel * weight

        total_pos_weight = sum((rel / self.get_propensity(tid)) for tid, rel in ground_truth_positives.items())
        recall = hits / max(1e-7, total_pos_weight)

        return {
            f"debiased_dcg@{k}": float(dcg),
            f"debiased_recall@{k}": float(recall),
        }
