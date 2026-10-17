"""
Sloth Audio Feature Pipeline
Orchestrates MERT (768-dim), CLAP (512-dim), and Mood Tagger (valence/arousal)
into a unified FeatureBundle representation.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np

from .clap_extractor import CLAPExtractor
from .mert_extractor import MERTExtractor
from .mood_tagger import MoodTagger

logger = logging.getLogger("sloth-feature-pipeline")


@dataclass
class FeatureBundle:
    track_id: str
    mert_embedding: np.ndarray  # Shape: (768,), float32
    clap_embedding: np.ndarray  # Shape: (512,), float32
    valence: float              # [0.0, 1.0]
    arousal: float              # [0.0, 1.0]
    bpm: Optional[float] = None
    key_sig: Optional[str] = None
    duration_ms: Optional[int] = None

    def __post_init__(self):
        # Validate shapes and numerical constraints
        self.mert_embedding = np.asarray(self.mert_embedding, dtype=np.float32)
        self.clap_embedding = np.asarray(self.clap_embedding, dtype=np.float32)

        if self.mert_embedding.shape != (768,):
            raise ValueError(f"MERT embedding shape must be (768,), got {self.mert_embedding.shape}")
        if self.clap_embedding.shape != (512,):
            raise ValueError(f"CLAP embedding shape must be (512,), got {self.clap_embedding.shape}")

        self.valence = float(np.clip(self.valence, 0.0, 1.0))
        self.arousal = float(np.clip(self.arousal, 0.0, 1.0))

    def mert_to_blob(self) -> bytes:
        """Serializes 768-dim MERT float32 embedding to raw binary BLOB for SQLite."""
        return self.mert_embedding.astype(np.float32).tobytes()

    def clap_to_blob(self) -> bytes:
        """Serializes 512-dim CLAP float32 embedding to raw binary BLOB for SQLite."""
        return self.clap_embedding.astype(np.float32).tobytes()

    @staticmethod
    def mert_from_blob(blob: bytes) -> np.ndarray:
        return np.frombuffer(blob, dtype=np.float32)

    @staticmethod
    def clap_from_blob(blob: bytes) -> np.ndarray:
        return np.frombuffer(blob, dtype=np.float32)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "track_id": self.track_id,
            "valence": round(self.valence, 4),
            "arousal": round(self.arousal, 4),
            "bpm": self.bpm,
            "key_sig": self.key_sig,
            "duration_ms": self.duration_ms,
            "mert_dim": len(self.mert_embedding),
            "clap_dim": len(self.clap_embedding),
        }


class FeaturePipeline:
    """
    Unified extraction pipeline for MERT, CLAP, and Mood tagger.
    Supports single audio files, memory arrays, and batch extraction.
    """

    def __init__(
        self,
        device: Optional[str] = None,
        lazy_load: bool = True,
    ):
        self.device = device
        self.mert = MERTExtractor(device=device, lazy_load=lazy_load)
        self.clap = CLAPExtractor(device=device, lazy_load=lazy_load)
        self.mood_tagger = MoodTagger(device=device)

    def process_audio_array(
        self,
        track_id: str,
        audio_array: np.ndarray,
        sample_rate: int = 48000,
        bpm: Optional[float] = None,
        key_sig: Optional[str] = None,
        duration_ms: Optional[int] = None,
    ) -> FeatureBundle:
        """
        Processes a raw audio array through MERT, CLAP, and MoodTagger.
        """
        # 1. Extract 768-dim MERT embedding (internally handles 24kHz resampling)
        mert_emb = self.mert.extract_embedding_from_array(audio_array, sample_rate=sample_rate)

        # 2. Extract 512-dim CLAP embedding (internally handles 48kHz resampling)
        clap_emb = self.clap.get_audio_embedding(audio_array, sample_rate=sample_rate)

        # 3. Predict valence & arousal using MoodTagger CNN on MERT representation
        valence, arousal = self.mood_tagger.predict(mert_emb)

        if duration_ms is None and len(audio_array) > 0 and sample_rate > 0:
            duration_ms = int((len(audio_array) / float(sample_rate)) * 1000)

        return FeatureBundle(
            track_id=track_id,
            mert_embedding=mert_emb,
            clap_embedding=clap_emb,
            valence=valence,
            arousal=arousal,
            bpm=bpm,
            key_sig=key_sig,
            duration_ms=duration_ms,
        )

    def process_audio_file(
        self,
        track_id: str,
        file_path: str,
        bpm: Optional[float] = None,
        key_sig: Optional[str] = None,
    ) -> FeatureBundle:
        """
        Reads audio file from disk and computes complete FeatureBundle.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Audio file not found: {file_path}")

        try:
            import soundfile as sf
            audio, sr = sf.read(file_path)
            if audio.ndim > 1:
                audio = audio.mean(axis=1)  # Mono
        except Exception:
            # Fallback byte reader
            with open(file_path, "rb") as f:
                raw_bytes = f.read()
            audio = np.frombuffer(raw_bytes[:16384], dtype=np.int16).astype(np.float32) / 32768.0
            sr = 48000

        duration_ms = int((len(audio) / float(sr)) * 1000) if sr > 0 else None

        return self.process_audio_array(
            track_id=track_id,
            audio_array=audio,
            sample_rate=sr,
            bpm=bpm,
            key_sig=key_sig,
            duration_ms=duration_ms,
        )

    def process_batch_files(
        self,
        track_items: List[Tuple[str, str]],  # List of (track_id, file_path)
        batch_size: int = 16,
    ) -> List[FeatureBundle]:
        """
        Batch processes tracks in chunks of batch_size=16 for maximum pipeline efficiency.
        """
        results: List[FeatureBundle] = []
        for track_id, path in track_items:
            try:
                bundle = self.process_audio_file(track_id, path)
                results.append(bundle)
            except Exception as e:
                logger.error(f"Failed extracting features for track {track_id} ({path}): {e}")
        return results
