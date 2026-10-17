"""
Sloth Diffusion Generator - Playlist Coherence Metrics
Evaluates transitions between consecutive tracks in generated playlists:
  1. BPM delta: |BPM_{i+1} - BPM_i| < 15
  2. Circle-of-Fifths distance: harmonic key transition distance < 3
  3. Valence slope: standard deviation of residuals along the emotional arc < 0.3
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np


# Circle of Fifths position mapping for standard 12 pitch classes
# (C=0, G=1, D=2, A=3, E=4, B=5, F#/Gb=6, Db=7, Ab=8, Eb=9, Bb=10, F=11)
COF_MAJOR_MAP: Dict[str, int] = {
    "c": 0, "b#": 0,
    "g": 1,
    "d": 2,
    "a": 3,
    "e": 4,
    "b": 5, "cb": 5,
    "f#": 6, "gb": 6,
    "c#": 7, "db": 7,
    "g#": 8, "ab": 8,
    "d#": 9, "eb": 9,
    "a#": 10, "bb": 10,
    "f": 11, "e#": 11,
}

PITCH_CLASS_NAMES = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"]


def pitch_class_to_cof(pitch_class: int, is_minor: bool = False) -> int:
    """
    Maps a pitch class (0..11, C=0) to its Circle-of-Fifths position (0..11).
    For minor keys, uses relative major (pitch_class + 3) % 12.
    """
    effective_pitch = (pitch_class + 3) % 12 if is_minor else (pitch_class % 12)
    # Pitch class * 7 mod 12 gives Circle of Fifths order:
    # 0(C)->0, 7(G)->1, 2(D)->2, 9(A)->3, 4(E)->4, 11(B)->5, 6(F#)->6, 1(C#)->7, 8(G#)->8, 3(D#)->9, 10(A#)->10, 5(F)->11
    return (effective_pitch * 7) % 12


def parse_key_to_cof(key: Union[str, int], mode: Optional[int] = None) -> int:
    """
    Parses a musical key representation (e.g. 'Am', 'C#', 0, 'G major') to its CoF index (0..11).
    """
    if isinstance(key, int):
        is_minor = (mode == 0)
        return pitch_class_to_cof(key, is_minor=is_minor)

    k_clean = str(key).lower().strip()
    is_minor = "m" in k_clean and "maj" not in k_clean
    if mode is not None:
        is_minor = (mode == 0)

    # Strip major/minor suffixes
    for suffix in [" major", " minor", " maj", " min", "m"]:
        if k_clean.endswith(suffix):
            k_clean = k_clean[: -len(suffix)].strip()
            break

    if k_clean in COF_MAJOR_MAP:
        major_pos = COF_MAJOR_MAP[k_clean]
        if is_minor:
            # Parallel minor is 3 steps counter-clockwise on the Circle of Fifths
            # (e.g. A minor shares key signature with C major: (3 - 3) % 12 = 0)
            return (major_pos - 3) % 12
        return major_pos

    # Try numeric pitch class fallback
    try:
        val = int(k_clean)
        return pitch_class_to_cof(val, is_minor)
    except ValueError:
        return 0


def circle_of_fifths_distance(key_a: Union[str, int], key_b: Union[str, int], mode_a: Optional[int] = None, mode_b: Optional[int] = None) -> int:
    """
    Computes shortest circular distance between two keys along the Circle of Fifths:
    dist in [0, 6]. Harmonic mixing guidelines require dist < 3 (same, adjacent, or relative key).
    """
    pos_a = parse_key_to_cof(key_a, mode_a)
    pos_b = parse_key_to_cof(key_b, mode_b)
    diff = abs(pos_a - pos_b)
    return min(diff, 12 - diff)


@dataclass
class TrackAcousticMetadata:
    track_id: str
    bpm: float
    key: Union[str, int]
    mode: int = 1  # 1 for major, 0 for minor
    valence: float = 0.5  # [0.0, 1.0]
    arousal: float = 0.5  # [0.0, 1.0]


@dataclass
class CoherenceReport:
    total_tracks: int
    bpm_deltas: List[float]
    bpm_violations: int
    bpm_coherent: bool

    cof_distances: List[int]
    harmonic_violations: int
    harmonic_coherent: bool

    valence_residuals: List[float]
    valence_slope_std: float
    valence_coherent: bool

    overall_coherent: bool
    coherence_score: float  # [0.0, 1.0]


class PlaylistCoherenceEvaluator:
    """
    Evaluates playlist acoustic and musical coherence across transitions.
    Thresholds:
      - Max BPM jump between consecutive tracks: < 15 BPM
      - Max Circle-of-Fifths key distance: < 3 steps
      - Max valence trajectory residual standard deviation: < 0.3
    """

    def __init__(
        self,
        max_bpm_delta: float = 15.0,
        max_cof_distance: int = 3,
        max_valence_std: float = 0.30,
    ):
        self.max_bpm_delta = max_bpm_delta
        self.max_cof_distance = max_cof_distance
        self.max_valence_std = max_valence_std

    def evaluate_bpm_transitions(self, bpms: List[float]) -> Tuple[List[float], int, bool]:
        """
        Computes consecutive BPM jumps: delta_i = |bpm_{i+1} - bpm_i| < 15.
        """
        if len(bpms) <= 1:
            return [], 0, True

        deltas: List[float] = []
        violations = 0
        for i in range(len(bpms) - 1):
            delta = abs(bpms[i + 1] - bpms[i])
            deltas.append(round(delta, 2))
            if delta >= self.max_bpm_delta:
                violations += 1

        is_coherent = (violations == 0) or (violations / len(deltas) <= 0.15)
        return deltas, violations, is_coherent

    def evaluate_harmonic_transitions(
        self,
        keys: List[Union[str, int]],
        modes: Optional[List[int]] = None,
    ) -> Tuple[List[int], int, bool]:
        """
        Computes Circle-of-Fifths distance between consecutive track keys (< 3).
        """
        if len(keys) <= 1:
            return [], 0, True

        m_list = modes or [1] * len(keys)
        distances: List[int] = []
        violations = 0

        for i in range(len(keys) - 1):
            dist = circle_of_fifths_distance(
                keys[i],
                keys[i + 1],
                mode_a=m_list[i],
                mode_b=m_list[i + 1],
            )
            distances.append(dist)
            if dist >= self.max_cof_distance:
                violations += 1

        is_coherent = (violations == 0) or (violations / len(distances) <= 0.20)
        return distances, violations, is_coherent

    def evaluate_valence_slope(
        self,
        valences: List[float],
        start_valence: Optional[float] = None,
        target_valence: Optional[float] = None,
    ) -> Tuple[List[float], float, bool]:
        """
        Measures variance from the intended mood arc progression:
        std(r_i) < 0.3 where r_i = actual_V_i - planned_V_i.
        """
        n = len(valences)
        if n <= 1:
            return [0.0], 0.0, True

        v_start = start_valence if start_valence is not None else valences[0]
        v_end = target_valence if target_valence is not None else valences[-1]

        residuals: List[float] = []
        for i, actual_v in enumerate(valences):
            t = float(i) / float(n - 1)
            planned_v = (1.0 - t) * v_start + t * v_end
            residuals.append(float(actual_v - planned_v))

        std_residual = float(np.std(residuals))
        is_coherent = std_residual < self.max_valence_std
        return [round(r, 4) for r in residuals], round(std_residual, 4), is_coherent

    def evaluate_playlist(
        self,
        tracks: List[TrackAcousticMetadata],
        start_valence: Optional[float] = None,
        target_valence: Optional[float] = None,
    ) -> CoherenceReport:
        """
        Full playlist coherence audit across BPM, Harmonic Key, and Valence Arc dimensions.
        """
        n = len(tracks)
        if n == 0:
            return CoherenceReport(
                total_tracks=0,
                bpm_deltas=[],
                bpm_violations=0,
                bpm_coherent=True,
                cof_distances=[],
                harmonic_violations=0,
                harmonic_coherent=True,
                valence_residuals=[],
                valence_slope_std=0.0,
                valence_coherent=True,
                overall_coherent=True,
                coherence_score=1.0,
            )

        bpms = [t.bpm for t in tracks]
        keys = [t.key for t in tracks]
        modes = [t.mode for t in tracks]
        valences = [t.valence for t in tracks]

        bpm_deltas, bpm_viol, bpm_ok = self.evaluate_bpm_transitions(bpms)
        cof_dists, cof_viol, cof_ok = self.evaluate_harmonic_transitions(keys, modes)
        residuals, val_std, val_ok = self.evaluate_valence_slope(valences, start_valence, target_valence)

        overall = bpm_ok and cof_ok and val_ok

        # Compute fractional scores [0..1]
        num_transitions = max(1, n - 1)
        bpm_score = 1.0 - (bpm_viol / num_transitions)
        cof_score = 1.0 - (cof_viol / num_transitions)
        val_score = max(0.0, 1.0 - (val_std / self.max_valence_std))

        composite_score = float(round(0.40 * bpm_score + 0.35 * cof_score + 0.25 * val_score, 4))

        return CoherenceReport(
            total_tracks=n,
            bpm_deltas=bpm_deltas,
            bpm_violations=bpm_viol,
            bpm_coherent=bpm_ok,
            cof_distances=cof_dists,
            harmonic_violations=cof_viol,
            harmonic_coherent=cof_ok,
            valence_residuals=residuals,
            valence_slope_std=val_std,
            valence_coherent=val_ok,
            overall_coherent=overall,
            coherence_score=composite_score,
        )
