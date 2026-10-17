# Source: Transformers Meet ACT-R: Repeat-Aware and Sequential Listening Session Recommendation, Viet-Anh Tran, Guillaume Salha-Galvan, Bruno Sguerra, Romain Hennequin, 2024
# Reference implementation: https://github.com/deezer/recsys24-pisa
# Adapted for Sloth by: Syed Zahid
# License of original: MIT
# Changes: Implementation of ACT-R declarative memory equations: Base-Level Activation A(t) = log(n) - d * log(delta_t) with exact multi-event decay sum, Spreading Activation via Pointwise Mutual Information (PMI), and Partial Matching acoustic similarity for repeat vs discovery prediction.

from __future__ import annotations

from dataclasses import dataclass, field
import math
import time
from typing import Dict, List, Optional, Tuple
import numpy as np


@dataclass
class TrackMemoryRecord:
    track_id: str
    play_timestamps: List[float] = field(default_factory=list)  # Unix timestamps in seconds
    last_played: float = 0.0
    play_count: int = 0
    co_listens: Dict[str, int] = field(default_factory=dict)     # Co-occurring tracks in session


class ACTRMemoryEngine:
    """
    Cognitive Memory Architecture based on ACT-R for music listening sessions.
    Models whether a user will repeat-play a familiar track or explore a new track.
    """

    def __init__(
        self,
        decay_factor: float = 0.5,           # Standard cognitive decay parameter d ~ 0.5
        retrieval_threshold: float = -3.0,   # Minimum activation threshold for cognitive recall
        temperature: float = 1.0,           # Softmax retrieval temperature tau
        pmi_weight: float = 0.35,            # Weight of Spreading Activation W_j
        similarity_weight: float = 0.20,     # Weight of Partial Matching M_ik
    ):
        self.decay_factor = decay_factor
        self.retrieval_threshold = retrieval_threshold
        self.temperature = temperature
        self.pmi_weight = pmi_weight
        self.similarity_weight = similarity_weight

        # Track history per user: user_id -> {track_id -> TrackMemoryRecord}
        self.user_memories: Dict[str, Dict[str, TrackMemoryRecord]] = {}
        # Global track listen counts for PMI computation
        self.global_track_counts: Dict[str, int] = {}
        self.total_global_listens: int = 0

    def record_listen(
        self,
        user_id: str,
        track_id: str,
        timestamp: Optional[float] = None,
        session_context: Optional[List[str]] = None,
    ) -> None:
        """
        Records a listen event into ACT-R declarative memory.
        Updates frequency n, recency delta_t, and co-listen associative strengths.
        """
        ts = timestamp if timestamp is not None else time.time()

        if user_id not in self.user_memories:
            self.user_memories[user_id] = {}

        user_tracks = self.user_memories[user_id]
        if track_id not in user_tracks:
            user_tracks[track_id] = TrackMemoryRecord(
                track_id=track_id,
                play_timestamps=[],
                last_played=ts,
                play_count=0,
            )

        rec = user_tracks[track_id]
        rec.play_timestamps.append(ts)
        rec.last_played = ts
        rec.play_count += 1

        # Global stats
        self.global_track_counts[track_id] = self.global_track_counts.get(track_id, 0) + 1
        self.total_global_listens += 1

        # Update co-occurrence associations with session context
        if session_context:
            for ctx_track in session_context:
                if ctx_track != track_id:
                    rec.co_listens[ctx_track] = rec.co_listens.get(ctx_track, 0) + 1
                    # Symmetrical co-occurrence
                    if ctx_track in user_tracks:
                        user_tracks[ctx_track].co_listens[track_id] = (
                            user_tracks[ctx_track].co_listens.get(track_id, 0) + 1
                        )

    def compute_base_level_activation(
        self,
        record: TrackMemoryRecord,
        current_time: Optional[float] = None,
        use_approximation: bool = False,
    ) -> float:
        """
        Computes Base-Level Activation (BL) in ACT-R:
        Exact formula:
            B(t) = ln( sum_{k=1}^n (t - t_k)^(-d) )
        Approximation formula:
            B(t) = ln(n) - d * ln(delta_t)
        Where delta_t is elapsed time in hours (or normalized units) since last play.
        """
        if record.play_count == 0 or not record.play_timestamps:
            return self.retrieval_threshold - 1.0

        now = current_time if current_time is not None else time.time()

        if use_approximation:
            # Formula: A(t) = log(n) - d * log(delta_t)
            elapsed_sec = max(1.0, now - record.last_played)
            elapsed_hours = elapsed_sec / 3600.0
            return float(math.log(record.play_count) - self.decay_factor * math.log(max(1e-4, elapsed_hours)))

        # Exact multi-event power-law summation
        decay_sum = 0.0
        for play_ts in record.play_timestamps:
            delta_sec = max(1.0, now - play_ts)
            delta_hours = delta_sec / 3600.0
            decay_sum += math.pow(delta_hours, -self.decay_factor)

        return float(math.log(max(1e-9, decay_sum)))

    def compute_spreading_activation(
        self,
        user_id: str,
        track_id: str,
        session_context: List[str],
    ) -> float:
        """
        Computes Spreading Activation (SPR) from active listening context:
        S(t) = sum_{j in Context} W_j * S_ji
        where S_ji is the associative strength (PMI) between context track j and target track i.
        """
        if not session_context or self.total_global_listens == 0:
            return 0.0

        user_tracks = self.user_memories.get(user_id, {})
        record = user_tracks.get(track_id)
        if not record:
            return 0.0

        p_i = max(1, self.global_track_counts.get(track_id, 1)) / float(self.total_global_listens)
        total_spreading = 0.0
        num_cues = len(session_context)

        for cue_track in session_context:
            co_count = record.co_listens.get(cue_track, 0)
            if co_count == 0:
                continue

            p_j = max(1, self.global_track_counts.get(cue_track, 1)) / float(self.total_global_listens)
            p_ij = co_count / float(self.total_global_listens)

            # Pointwise Mutual Information: PMI = log( P(i,j) / (P(i) * P(j)) )
            pmi = math.log(max(1e-9, p_ij) / (p_i * p_j))
            # Weight cue inversely proportional to context size (uniform cue attention)
            weight = 1.0 / num_cues
            total_spreading += weight * pmi

        return float(self.pmi_weight * total_spreading)

    def compute_partial_matching(
        self,
        track_id: str,
        session_context: List[str],
        similarity_matrix: Optional[Dict[Tuple[str, str], float]] = None,
    ) -> float:
        """
        Computes Partial Matching (P):
        P(t) = sum_{k in Context} M_ik * sim(i, k)
        """
        if not session_context or not similarity_matrix:
            return 0.0

        scores = []
        for cue in session_context:
            sim = similarity_matrix.get((track_id, cue), similarity_matrix.get((cue, track_id), 0.0))
            scores.append(sim)

        if not scores:
            return 0.0

        avg_sim = float(np.mean(scores))
        return float(self.similarity_weight * avg_sim)

    def get_track_activation(
        self,
        user_id: str,
        track_id: str,
        current_time: Optional[float] = None,
        session_context: Optional[List[str]] = None,
        similarity_matrix: Optional[Dict[Tuple[str, str], float]] = None,
        use_approximation: bool = False,
    ) -> float:
        """
        Total Cognitive Activation A(t) = BaseLevel + Spreading + PartialMatching.
        """
        user_tracks = self.user_memories.get(user_id, {})
        record = user_tracks.get(track_id)
        if not record:
            return self.retrieval_threshold - 2.0

        bl = self.compute_base_level_activation(record, current_time, use_approximation=use_approximation)
        spr = self.compute_spreading_activation(user_id, track_id, session_context or [])
        pm = self.compute_partial_matching(track_id, session_context or [], similarity_matrix)

        return float(bl + spr + pm)

    def rank_repeat_candidates(
        self,
        user_id: str,
        candidate_track_ids: List[str],
        current_time: Optional[float] = None,
        session_context: Optional[List[str]] = None,
        similarity_matrix: Optional[Dict[Tuple[str, str], float]] = None,
    ) -> List[Tuple[str, float]]:
        """
        Calculates retrieval probabilities for repeat candidates via softmax over ACT-R activations.
        P(retrieve i) = exp(A_i / tau) / sum_m exp(A_m / tau)
        """
        if not candidate_track_ids:
            return []

        activations = []
        for tid in candidate_track_ids:
            act = self.get_track_activation(
                user_id=user_id,
                track_id=tid,
                current_time=current_time,
                session_context=session_context,
                similarity_matrix=similarity_matrix,
            )
            activations.append(act)

        act_arr = np.array(activations, dtype=np.float64)
        scaled_act = act_arr / max(1e-4, self.temperature)
        # Numerical stability softmax
        scaled_act -= np.max(scaled_act)
        exp_act = np.exp(scaled_act)
        probs = exp_act / (np.sum(exp_act) + 1e-9)

        ranked = [(candidate_track_ids[i], float(probs[i])) for i in range(len(candidate_track_ids))]
        ranked.sort(key=lambda x: x[1], reverse=True)
        return ranked
