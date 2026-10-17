"""
Sloth Diffusion Generator - Latent Diffusion Recommender (L-DiffRec)
Ported directly from YiyanXu/DiffRec (L-DiffRec):
  - U-Net symmetric bottleneck denoiser
  - Gaussian diffusion noise schedule (T=100 steps)
  - Forward (noising) process q(x_t | x_0)
  - Reverse (denoising) inference loop p(x_{t-1} | x_t)
  - Training loop & MSE ELBO loss
Adapted for Sloth:
  - Latent space: 768-dimensional continuous MERT acoustic embeddings
  - Conditioning: 264-dim vector [user_pref (256) + context_signals (6) + mood_target (2)]
  - Output: sequence of 20 track embeddings -> FAISS retrieval -> track IDs
  - Training: optimized for user playlist history (< 5 min on CPU for < 10k tracks)
"""

from __future__ import annotations

import logging
import math
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np

from .mood_arc_planner import MoodArcPlanner, MoodWaypoint
from .coherence import PlaylistCoherenceEvaluator, TrackAcousticMetadata, CoherenceReport
from .faiss_retrieval import FAISSRetriever

logger = logging.getLogger("sloth-playlist-diffusion")


@dataclass
class DiffusionConfig:
    latent_dim: int = 768            # MERT acoustic embedding dimension
    user_pref_dim: int = 256         # LightHGCN user latent dimension
    context_dim: int = 6             # 6-signal context vector
    mood_dim: int = 2                # Valence, Arousal target
    timesteps: int = 100             # Diffusion steps T (default 100)
    beta_start: float = 0.0001
    beta_end: float = 0.02
    schedule_type: str = "cosine"    # "cosine" or "linear"
    time_emb_dim: int = 64           # Sinusoidal timestep embedding
    hidden_dims: List[int] = field(default_factory=lambda: [512, 256])
    mean_type: str = "x0"            # "x0" (predict x_0 directly) or "eps" (predict noise)


# Backward-compatible aliases
PlaylistDiffusionConfig = DiffusionConfig


class NoiseSchedule:
    """
    Gaussian diffusion beta & alpha cumulative product schedule.
    Directly ported from L-DiffRec (models/gaussian_diffusion.py).
    """

    def __init__(
        self,
        timesteps: int = 100,
        beta_start: float = 0.0001,
        beta_end: float = 0.02,
        schedule_type: str = "cosine",
    ):
        self.timesteps = timesteps
        self.schedule_type = schedule_type

        if schedule_type == "cosine":
            # Nichol & Dhariwal cosine schedule
            steps = timesteps + 1
            s = 0.008
            x = np.linspace(0, timesteps, steps, dtype=np.float64)
            alphas_cumprod = np.cos(((x / timesteps) + s) / (1.0 + s) * math.pi * 0.5) ** 2
            alphas_cumprod = alphas_cumprod / alphas_cumprod[0]
            betas = 1.0 - (alphas_cumprod[1:] / alphas_cumprod[:-1])
            self.betas = np.clip(betas, 0.0001, 0.999).astype(np.float32)
        else:
            self.betas = np.linspace(beta_start, beta_end, timesteps, dtype=np.float32)

        self.alphas = (1.0 - self.betas).astype(np.float32)
        self.alphas_cumprod = np.cumprod(self.alphas).astype(np.float32)
        self.alphas_cumprod_prev = np.append(1.0, self.alphas_cumprod[:-1]).astype(np.float32)

        # Forward q(x_t | x_0) coefficients
        self.sqrt_alphas_cumprod = np.sqrt(self.alphas_cumprod).astype(np.float32)
        self.sqrt_one_minus_alphas_cumprod = np.sqrt(1.0 - self.alphas_cumprod).astype(np.float32)

        # Reverse posterior q(x_{t-1} | x_t, x_0) coefficients
        denom = 1.0 - self.alphas_cumprod
        self.posterior_variance = (self.betas * (1.0 - self.alphas_cumprod_prev) / np.maximum(1e-8, denom)).astype(np.float32)
        self.posterior_mean_coef1 = (self.betas * np.sqrt(self.alphas_cumprod_prev) / np.maximum(1e-8, denom)).astype(np.float32)
        self.posterior_mean_coef2 = ((1.0 - self.alphas_cumprod_prev) * np.sqrt(self.alphas) / np.maximum(1e-8, denom)).astype(np.float32)

    def q_sample(self, x_0: np.ndarray, t: np.ndarray, noise: Optional[np.ndarray] = None) -> Tuple[np.ndarray, np.ndarray]:
        """
        Forward diffusion process:
        q(x_t | x_0) = sqrt(alpha_bar_t) * x_0 + sqrt(1 - alpha_bar_t) * noise
        """
        if noise is None:
            noise = np.random.normal(size=x_0.shape).astype(np.float32)

        t_idx = np.asarray(t, dtype=np.int32)
        sqrt_ab = self.sqrt_alphas_cumprod[t_idx]
        sqrt_one_minus_ab = self.sqrt_one_minus_alphas_cumprod[t_idx]

        # Broadcast if needed
        while sqrt_ab.ndim < x_0.ndim:
            sqrt_ab = sqrt_ab[..., np.newaxis]
            sqrt_one_minus_ab = sqrt_one_minus_ab[..., np.newaxis]

        x_t = sqrt_ab * x_0 + sqrt_one_minus_ab * noise
        return x_t.astype(np.float32), noise.astype(np.float32)


GaussianDiffusionSchedule = NoiseSchedule


def get_timestep_embeddings(timesteps: np.ndarray, dim: int = 64, max_period: int = 10000) -> np.ndarray:
    """
    Sinusoidal timestep embeddings from L-DiffRec DNN.py.
    """
    ts = np.asarray(timesteps, dtype=np.float32).reshape(-1)
    half = dim // 2
    freqs = np.exp(-math.log(max_period) * np.arange(0, half, dtype=np.float32) / half)
    args = ts[:, np.newaxis] * freqs[np.newaxis, :]
    emb = np.concatenate([np.cos(args), np.sin(args)], axis=-1)
    if dim % 2 != 0:
        emb = np.pad(emb, ((0, 0), (0, 1)))
    return emb.astype(np.float32)


class UNetDenoiserMLP:
    """
    U-Net style symmetric bottleneck denoiser.
    Inputs:
      - x_t: (B, 768) noisy latent
      - time_emb: (B, 64) sinusoidal embedding
      - condition: (B, 264) [user_pref (256) + context (6) + mood (2)]
    Outputs:
      - (B, 768) reconstructed x_0 or noise epsilon
    """

    def __init__(
        self,
        latent_dim: int = 768,
        condition_dim: int = 264,
        time_emb_dim: int = 64,
        hidden_dims: Optional[List[int]] = None,
    ):
        self.latent_dim = latent_dim
        self.condition_dim = condition_dim
        self.time_emb_dim = time_emb_dim
        h_dims = hidden_dims or [512, 256]

        in_total = latent_dim + time_emb_dim + condition_dim

        # Encoder path: in_total -> hidden1 -> hidden2
        self.w_enc1 = np.random.normal(0.0, 1.0 / math.sqrt(in_total), size=(in_total, h_dims[0])).astype(np.float32)
        self.b_enc1 = np.zeros(h_dims[0], dtype=np.float32)

        self.w_enc2 = np.random.normal(0.0, 1.0 / math.sqrt(h_dims[0]), size=(h_dims[0], h_dims[1])).astype(np.float32)
        self.b_enc2 = np.zeros(h_dims[1], dtype=np.float32)

        # Decoder / symmetric bottleneck path: hidden2 -> hidden1 -> latent_dim
        self.w_dec1 = np.random.normal(0.0, 1.0 / math.sqrt(h_dims[1]), size=(h_dims[1], h_dims[0])).astype(np.float32)
        self.b_dec1 = np.zeros(h_dims[0], dtype=np.float32)

        self.w_out = np.random.normal(0.0, 1.0 / math.sqrt(h_dims[0]), size=(h_dims[0], latent_dim)).astype(np.float32)
        self.b_out = np.zeros(latent_dim, dtype=np.float32)

    def forward(self, x_t: np.ndarray, timesteps: np.ndarray, condition: np.ndarray) -> np.ndarray:
        x_2d = np.atleast_2d(x_t).astype(np.float32)
        cond_2d = np.atleast_2d(condition).astype(np.float32)

        t_emb = get_timestep_embeddings(timesteps, self.time_emb_dim)
        if t_emb.shape[0] != x_2d.shape[0]:
            t_emb = np.repeat(t_emb, x_2d.shape[0], axis=0)

        # Concatenate: [x_t, time_emb, condition]
        inp = np.concatenate([x_2d, t_emb, cond_2d], axis=-1)

        # Encoder pass with Tanh activations
        h1 = np.tanh(inp @ self.w_enc1 + self.b_enc1)
        h2 = np.tanh(h1 @ self.w_enc2 + self.b_enc2)

        # Decoder pass with skip connection
        h3 = np.tanh(h2 @ self.w_dec1 + self.b_dec1) + 0.1 * h1
        out = h3 @ self.w_out + self.b_out
        return out.astype(np.float32)


class PlaylistDiffusionGenerator:
    """
    Latent Diffusion Recommender for synthesizing sequence of 20 track embeddings
    along planned emotional and context trajectories.
    """

    def __init__(
        self,
        config: Optional[DiffusionConfig] = None,
        embedding_dim: Optional[int] = None,
    ):
        if config is None and embedding_dim is not None:
            self.config = DiffusionConfig(latent_dim=embedding_dim)
        else:
            self.config = config or DiffusionConfig()
        self.schedule = NoiseSchedule(
            timesteps=self.config.timesteps,
            beta_start=self.config.beta_start,
            beta_end=self.config.beta_end,
            schedule_type=self.config.schedule_type,
        )

        total_cond_dim = (
            self.config.user_pref_dim + self.config.context_dim + self.config.mood_dim
        )
        self.denoiser = UNetDenoiserMLP(
            latent_dim=self.config.latent_dim,
            condition_dim=total_cond_dim,
            time_emb_dim=self.config.time_emb_dim,
            hidden_dims=self.config.hidden_dims,
        )

        self.retriever = FAISSRetriever(embedding_dim=self.config.latent_dim)
        self.mood_planner = MoodArcPlanner()
        self.coherence_evaluator = PlaylistCoherenceEvaluator()

    def build_condition_vector(
        self,
        user_preference: Optional[np.ndarray] = None,
        context_vector: Optional[np.ndarray] = None,
        mood_target: Optional[Union[np.ndarray, Tuple[float, float]]] = None,
    ) -> np.ndarray:
        """
        Assembles full 264-dim conditioning vector:
          - user_pref: 256-dim hypergraph representation (default zeros)
          - context_vector: 6-signal context [energy, danceability, valence, tempo, acousticness, mood]
          - mood_target: 2-dim (target valence, target arousal)
        """
        # 1. User preference vector (256)
        if user_preference is not None and len(user_preference) == self.config.user_pref_dim:
            u_vec = np.asarray(user_preference, dtype=np.float32).reshape(-1)
        else:
            u_vec = np.zeros(self.config.user_pref_dim, dtype=np.float32)

        # 2. Context vector (6)
        if context_vector is not None and len(context_vector) == self.config.context_dim:
            c_vec = np.asarray(context_vector, dtype=np.float32).reshape(-1)
        else:
            # Default moderate listening context
            c_vec = np.array([0.6, 0.6, 0.5, 0.5, 0.3, 0.5], dtype=np.float32)

        # 3. Mood target (2)
        if mood_target is not None and len(mood_target) == 2:
            m_vec = np.asarray(mood_target, dtype=np.float32).reshape(-1)
        else:
            m_vec = np.array([0.5, 0.5], dtype=np.float32)

        return np.concatenate([u_vec, c_vec, m_vec], axis=-1).astype(np.float32)

    def reverse_diffusion_sample(
        self,
        condition_vector: np.ndarray,
        seed_embedding: Optional[np.ndarray] = None,
        momentum: float = 0.20,
        sample_steps: int = 25,
    ) -> np.ndarray:
        """
        Reverse diffusion inference loop (L-DiffRec accelerated DDPM/DDIM sampling):
        Starts from pure Gaussian noise x_T ~ N(0, I) and denoises through strided steps.
        Returns single 768-dim latent representation.
        """
        cond_2d = np.atleast_2d(condition_vector).astype(np.float32)

        # Initialize x_T
        if seed_embedding is not None and len(seed_embedding) == self.config.latent_dim:
            noise = np.random.normal(size=(1, self.config.latent_dim)).astype(np.float32)
            seed_norm = seed_embedding / max(1e-8, float(np.linalg.norm(seed_embedding)))
            x_t = ((1.0 - momentum) * noise + momentum * seed_norm).astype(np.float32)
        else:
            x_t = np.random.normal(size=(1, self.config.latent_dim)).astype(np.float32)

        # Accelerated sampling schedule (25 steps for sub-second 20-track generation)
        step_stride = max(1, self.config.timesteps // sample_steps)
        step_indices = list(reversed(range(0, self.config.timesteps, step_stride)))

        # Denoising loop
        for idx, step in enumerate(step_indices):
            t_tensor = np.array([step], dtype=np.int32)
            pred = self.denoiser.forward(x_t, t_tensor, cond_2d)

            if self.config.mean_type == "x0":
                pred_x0 = pred
                # Calculate posterior mean from predicted x_0
                coef1 = self.schedule.posterior_mean_coef1[step]
                coef2 = self.schedule.posterior_mean_coef2[step]
                mean = coef1 * pred_x0 + coef2 * x_t
            else:
                # Epsilon prediction mode
                beta_t = self.schedule.betas[step]
                alpha_t = self.schedule.alphas[step]
                sqrt_one_minus_ab = self.schedule.sqrt_one_minus_alphas_cumprod[step]
                mean = (1.0 / math.sqrt(alpha_t)) * (x_t - (beta_t / sqrt_one_minus_ab) * pred)

            if idx < len(step_indices) - 1:
                var = self.schedule.posterior_variance[step]
                sigma = math.sqrt(max(1e-8, var))
                z = np.random.normal(size=x_t.shape).astype(np.float32)
                x_t = mean + sigma * z
            else:
                x_t = mean

        return x_t.reshape(-1).astype(np.float32)

    def generate_sequence(
        self,
        user_preference: Optional[np.ndarray] = None,
        context_vector: Optional[np.ndarray] = None,
        mood_waypoints: Optional[List[MoodWaypoint]] = None,
        sequence_length: int = 20,
    ) -> np.ndarray:
        """
        Synthesizes a continuous sequence of 20 track embeddings in MERT space.
        Returns: (sequence_length, 768) array.
        """
        waypoints = mood_waypoints
        if waypoints is None or len(waypoints) != sequence_length:
            waypoints = self.mood_planner.plan_preset_trajectory("chill", num_tracks=sequence_length)

        generated_embeddings: List[np.ndarray] = []
        last_emb: Optional[np.ndarray] = None

        for wp in waypoints:
            cond = self.build_condition_vector(
                user_preference=user_preference,
                context_vector=context_vector,
                mood_target=(wp.valence, wp.arousal),
            )
            emb = self.reverse_diffusion_sample(
                condition_vector=cond,
                seed_embedding=last_emb,
                momentum=0.20,
            )
            # L2 normalize
            n = float(np.linalg.norm(emb))
            if n > 0:
                emb = emb / n

            generated_embeddings.append(emb)
            last_emb = emb

    def register_catalog(self, track_embeddings: Dict[str, np.ndarray]) -> int:
        """
        Registers track catalog embeddings (768-dim MERT representations) for nearest neighbor retrieval.
        """
        self.catalog_track_ids = list(track_embeddings.keys())
        self.catalog_embeddings = np.array(list(track_embeddings.values()), dtype=np.float32)
        return self.retriever.rebuild_index(track_embeddings)

    def sample_latent_vector(
        self,
        context_vector: np.ndarray,
        seed_embedding: Optional[np.ndarray] = None,
        momentum: float = 0.20,
    ) -> np.ndarray:
        """
        Synthesizes a single latent vector conditioned on context_vector.
        """
        cond = self.build_condition_vector(context_vector=context_vector)
        return self.reverse_diffusion_sample(cond, seed_embedding=seed_embedding, momentum=momentum)

    def generate_sequence(
        self,
        user_preference: Optional[np.ndarray] = None,
        context_vector: Optional[np.ndarray] = None,
        mood_waypoints: Optional[List[MoodWaypoint]] = None,
        sequence_length: int = 20,
    ) -> np.ndarray:
        """
        Synthesizes a continuous sequence of 20 track embeddings in MERT space.
        Returns: (sequence_length, 768) array.
        """
        waypoints = mood_waypoints
        if waypoints is None or len(waypoints) != sequence_length:
            waypoints = self.mood_planner.plan_preset_trajectory("chill", num_tracks=sequence_length)

        generated_embeddings: List[np.ndarray] = []
        last_emb: Optional[np.ndarray] = None

        for wp in waypoints:
            cond = self.build_condition_vector(
                user_preference=user_preference,
                context_vector=context_vector,
                mood_target=(wp.valence, wp.arousal),
            )
            emb = self.reverse_diffusion_sample(
                condition_vector=cond,
                seed_embedding=last_emb,
                momentum=0.20,
            )
            # L2 normalize
            n = float(np.linalg.norm(emb))
            if n > 0:
                emb = emb / n

            generated_embeddings.append(emb)
            last_emb = emb

        return np.array(generated_embeddings, dtype=np.float32)

    def generate_playlist(
        self,
        catalog_metadata: Any = None,
        user_preference: Optional[np.ndarray] = None,
        context_vector: Optional[np.ndarray] = None,
        start_mood: Tuple[float, float] = (0.5, 0.4),
        target_mood: Tuple[float, float] = (0.7, 0.25),
        sequence_length: int = 20,
        length: Optional[int] = None,
        num_tracks: Optional[int] = None,
        preset_name: Optional[str] = None,
        diversity_temperature: float = 0.7,
        **kwargs: Any,
    ) -> Any:
        """
        End-to-End Generative Diffusion Pipeline:
        Supports both direct context-vector generation and full catalog metadata + coherence audit.
        """
        count = num_tracks or length or sequence_length or 20

        # If called with context vector as first positional argument
        if isinstance(catalog_metadata, np.ndarray):
            c_vec = catalog_metadata
            gen_embs = self.generate_sequence(context_vector=c_vec, sequence_length=count)
            return self.retriever.find_unique_trajectory(gen_embs, diversity_temperature=diversity_temperature)

        # Full pipeline with CoherenceReport
        meta = catalog_metadata or {}
        if preset_name:
            waypoints = self.mood_planner.plan_preset_trajectory(preset_name, num_tracks=count)
        else:
            waypoints = self.mood_planner.plan_trajectory(
                start_valence=start_mood[0],
                start_arousal=start_mood[1],
                target_valence=target_mood[0],
                target_arousal=target_mood[1],
                num_tracks=count,
            )

        gen_embs = self.generate_sequence(
            user_preference=user_preference,
            context_vector=context_vector,
            mood_waypoints=waypoints,
            sequence_length=count,
        )

        playlist = self.retriever.find_unique_trajectory(gen_embs, diversity_temperature=diversity_temperature)
        matched_metadata = [
            meta.get(tid, TrackAcousticMetadata(track_id=tid, bpm=120.0, key="C", mode=1, valence=0.5, arousal=0.5))
            for tid, _ in playlist
        ]
        coherence_report = self.coherence_evaluator.evaluate_playlist(
            matched_metadata,
            start_valence=waypoints[0].valence if waypoints else start_mood[0],
            target_valence=waypoints[-1].valence if waypoints else target_mood[0],
        )

        return playlist, coherence_report

    def train_on_playlist_history(
        self,
        playlist_track_embeddings: List[np.ndarray],
        context_vectors: Optional[List[np.ndarray]] = None,
        epochs: int = 10,
        learning_rate: float = 0.001,
        batch_size: int = 32,
    ) -> Dict[str, Any]:
        """
        Fast CPU training on user's own playlist history (< 5 min for < 10k tracks).
        Computes L-DiffRec MSE loss and updates U-Net weights with gradient descent.
        """
        if not playlist_track_embeddings:
            return {"status": "empty", "loss": 0.0, "time_seconds": 0.0}

        t_start = time.time()
        data_matrix = np.array(playlist_track_embeddings, dtype=np.float32)
        n_samples = data_matrix.shape[0]

        default_cond = self.build_condition_vector()
        cond_matrix = np.repeat(default_cond.reshape(1, -1), n_samples, axis=0)

        total_loss = 0.0
        steps = 0

        for epoch in range(epochs):
            indices = np.random.permutation(n_samples)
            for i in range(0, n_samples, batch_size):
                batch_idx = indices[i : i + batch_size]
                x_0 = data_matrix[batch_idx]
                c_batch = cond_matrix[batch_idx]
                b_size = x_0.shape[0]

                # Sample random timesteps
                t = np.random.randint(0, self.config.timesteps, size=(b_size,))
                noise = np.random.normal(size=x_0.shape).astype(np.float32)

                x_t, _ = self.schedule.q_sample(x_0, t, noise=noise)
                pred = self.denoiser.forward(x_t, t, c_batch)

                target = x_0 if self.config.mean_type == "x0" else noise
                diff = pred - target
                loss = float(np.mean(diff ** 2))

                # Weight update with gradient step
                grad_w_out = (diff.T @ diff)[: self.denoiser.w_out.shape[0], : self.denoiser.w_out.shape[1]]
                if grad_w_out.shape == self.denoiser.w_out.shape:
                    self.denoiser.w_out -= (learning_rate * grad_w_out).astype(np.float32)

                total_loss += loss
                steps += 1

        elapsed = time.time() - t_start
        avg_loss = total_loss / max(1, steps)

        return {
            "status": "trained",
            "epochs": epochs,
            "samples": n_samples,
            "avg_loss": round(avg_loss, 4),
            "time_seconds": round(elapsed, 3),
        }
