# Source: Large-Scale Contrastive Language-Audio Pretraining with Feature Fusion and Keyword-to-Caption Augmentation, Yusong Wu, Ke Chen, Tianyu Zhang, Yuchen Hui, Taylor Berg-Kirkpatrick, Shlomo Dubnov, 2023
# Reference implementation: https://github.com/LAION-AI/CLAP
# Adapted for Sloth by: Syed Zahid
# License of original: MIT
# Changes: Inference pattern from LAION-AI/CLAP (laion_clap.CLAP_Module / HuggingFace Transformers CLAP), audio embedding extraction at 48kHz, text query embedding, cross-modal cosine similarity ranking for natural language music search, and offline fallback mode.

from __future__ import annotations

import logging
import math
import os
from typing import Dict, List, Optional, Tuple, Union
import numpy as np

logger = logging.getLogger("sloth-clap-extractor")


class CLAPExtractor:
    """
    CLAP (Contrastive Language-Audio Pretraining) Multimodal Feature Extractor.
    Extracts joint 512-dimensional representations for audio and text queries.
    Enables zero-shot natural language search (e.g. "rainy jazz coffee shop vibes").
    """

    TARGET_SAMPLE_RATE = 48000
    FEATURE_DIM = 512

    def __init__(
        self,
        enable_fusion: bool = False,
        device: Optional[str] = None,
        lazy_load: bool = True,
    ):
        self.enable_fusion = enable_fusion
        self.device = device
        self.model = None
        self.is_loaded = False
        self._mock_mode = False

        if not lazy_load:
            self.load_model()

    def load_model(self) -> bool:
        """
        Loads the CLAP module using the official LAION pattern.
        """
        if self.is_loaded:
            return True

        try:
            import laion_clap
            import torch

            if self.device is None:
                self.device = "cuda" if torch.cuda.is_available() else "cpu"

            logger.info("Initializing LAION CLAP Module...")
            # LAION-AI/CLAP inference initialization pattern
            self.model = laion_clap.CLAP_Module(
                enable_fusion=self.enable_fusion,
                device=torch.device(self.device),
            )
            self.model.load_ckpt()
            self.is_loaded = True
            return True
        except Exception as e:
            logger.info(
                f"LAION CLAP library not active ({e}). Operating in deterministic multimodal fallback mode."
            )
            self._mock_mode = True
            self.is_loaded = True
            return False

    def get_audio_embedding(
        self,
        audio_array: np.ndarray,
        sample_rate: int = 48000,
    ) -> np.ndarray:
        """
        Extracts a 512-dimensional audio embedding from raw audio data.
        Follows LAION-AI/CLAP:
        audio_data = audio_data.reshape(1, -1)
        audio_embed = model.get_audio_embedding_from_data(x=audio_data, use_tensor=False)
        """
        if not self.is_loaded:
            self.load_model()

        if self._mock_mode or self.model is None:
            return self._compute_deterministic_audio_fallback(audio_array)

        # Ensure correct shape: (1, T) or (N, T)
        audio = audio_array.astype(np.float32)
        if audio.ndim == 1:
            audio = audio.reshape(1, -1)

        # Quantization pattern as in LAION CLAP documentation
        # int16_to_float32(float32_to_int16(audio_data))
        audio_int16 = np.clip(audio, -1.0, 1.0) * 32767.0
        audio_quantized = (audio_int16 / 32767.0).astype(np.float32)

        raw_embed = self.model.get_audio_embedding_from_data(x=audio_quantized, use_tensor=False)
        embed = np.array(raw_embed[0], dtype=np.float32)

        # L2 normalize
        norm = np.linalg.norm(embed)
        if norm > 0:
            embed = embed / norm

        return embed

    def get_text_embedding(self, text_or_texts: Union[str, List[str]]) -> np.ndarray:
        """
        Extracts 512-dimensional text embeddings for natural language prompts.
        Follows LAION-AI/CLAP:
        text_embed = model.get_text_embedding(text_data)
        """
        if not self.is_loaded:
            self.load_model()

        texts = [text_or_texts] if isinstance(text_or_texts, str) else text_or_texts

        if self._mock_mode or self.model is None:
            embs = [self._compute_deterministic_text_fallback(t) for t in texts]
            return np.array(embs, dtype=np.float32) if isinstance(text_or_texts, list) else embs[0]

        raw_embed = self.model.get_text_embedding(texts)
        embs = np.array(raw_embed, dtype=np.float32)

        # L2 normalize rows
        norms = np.linalg.norm(embs, axis=-1, keepdims=True)
        norms[norms == 0] = 1.0
        embs = embs / norms

        return embs if isinstance(text_or_texts, list) else embs[0]

    def compute_cross_modal_similarity(
        self,
        audio_embedding: np.ndarray,
        text_embedding: np.ndarray,
    ) -> float:
        """
        Computes cosine similarity between an audio embedding and a text query embedding.
        Score is in [-1.0, 1.0].
        """
        norm_a = np.linalg.norm(audio_embedding)
        norm_t = np.linalg.norm(text_embedding)

        if norm_a == 0 or norm_t == 0:
            return 0.0

        sim = float(np.dot(audio_embedding, text_embedding) / (norm_a * norm_t))
        return float(np.clip(sim, -1.0, 1.0))

    def rank_tracks_by_prompt(
        self,
        text_prompt: str,
        catalog_track_embeddings: Dict[str, np.ndarray],
        top_k: int = 20,
    ) -> List[Tuple[str, float]]:
        """
        Ranks audio track embeddings against a natural language text query (e.g. "chill lofi hip hop").
        """
        if not catalog_track_embeddings:
            return []

        text_emb = self.get_text_embedding(text_prompt)

        scored: List[Tuple[str, float]] = []
        for track_id, audio_emb in catalog_track_embeddings.items():
            sim = self.compute_cross_modal_similarity(audio_emb, text_emb)
            scored.append((track_id, sim))

        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:top_k]

    def _compute_deterministic_audio_fallback(self, audio_array: np.ndarray) -> np.ndarray:
        vec = np.zeros(self.FEATURE_DIM, dtype=np.float32)
        if len(audio_array) == 0:
            vec[0] = 1.0
            return vec

        fft = np.abs(np.fft.rfft(audio_array[:2048]))
        fft_len = len(fft)
        for i in range(self.FEATURE_DIM):
            idx = (i * 23) % max(1, fft_len)
            vec[i] = float(fft[idx] if idx < fft_len else math.cos(i * 0.05))

        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        else:
            vec[0] = 1.0
        return vec

    def _compute_deterministic_text_fallback(self, text: str) -> np.ndarray:
        vec = np.zeros(self.FEATURE_DIM, dtype=np.float32)
        clean = text.lower().strip()
        if not clean:
            vec[0] = 1.0
            return vec

        for idx, char in enumerate(clean):
            slot = (ord(char) * 31 + idx * 7) % self.FEATURE_DIM
            vec[slot] += 1.0 / (idx + 1)

        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        else:
            vec[0] = 1.0
        return vec
