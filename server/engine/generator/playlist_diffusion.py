# Source: Diffusion Recommender Model, Yiyan Xu, Wenjie Wang, Fuli Feng, Chao Wang, Xiangnan He, Tat-Seng Chua, 2023
# Reference implementation: https://github.com/YiyanXu/DiffRec
# Adapted for Sloth by: Syed Zahid
# License of original: MIT
# Changes: Adapted L-DiffRec (Latent Diffusion) to 768-dimensional MERT continuous audio embedding space, conditioned on Sloth's 6-signal context vector (energy, danceability, valence, tempo, acousticness, mood) with DDPM/DDIM sampling and nearest-neighbor catalog projection.

from __future__ import annotations

from dataclasses import dataclass, field
import math
from typing import Dict, List, Optional, Tuple, Union
import numpy as np


@dataclass
class PlaylistDiffusionConfig:
    latent_dim: int = 768          # Matches MERT acoustic embedding dimension
    context_dim: int = 6           # 6-signal context: energy, danceability, valence, tempo, acousticness, mood
    timesteps: int = 100           # Diffusion steps T
    beta_start: float = 0.0001
    beta_end: float = 0.02
    schedule_type: str = "linear"  # "linear" or "cosine"
    hidden_dims: List[int] = field(default_factory=lambda: [512, 512])
    time_emb_dim: int = 64


class GaussianDiffusionSchedule:
    """
    Forward and reverse Gaussian diffusion process schedule.
    """

    def __init__(self, timesteps: int = 100, beta_start: float = 0.0001, beta_end: float = 0.02, schedule_type: str = "linear"):
        self.timesteps = timesteps

        if schedule_type == "cosine":
            # Cosine beta schedule (Nichol & Dhariwal, 2021)
            steps = timesteps + 1
            s = 0.008
            x = np.linspace(0, timesteps, steps)
            alphas_cumprod = np.cos(((x / timesteps) + s) / (1 + s) * math.pi * 0.5) ** 2
            alphas_cumprod = alphas_cumprod / alphas_cumprod[0]
            betas = 1 - (alphas_cumprod[1:] / alphas_cumprod[:-1])
            self.betas = np.clip(betas, 0.0001, 0.9999).astype(np.float32)
        else:
            # Linear beta schedule
            self.betas = np.linspace(beta_start, beta_end, timesteps, dtype=np.float32)

        self.alphas = 1.0 - self.betas
        self.alphas_cumprod = np.cumprod(self.alphas)
        self.alphas_cumprod_prev = np.append(1.0, self.alphas_cumprod[:-1])

        # Calculations for diffusion q(x_t | x_0)
        self.sqrt_alphas_cumprod = np.sqrt(self.alphas_cumprod)
        self.sqrt_one_minus_alphas_cumprod = np.sqrt(1.0 - self.alphas_cumprod)

        # Calculations for posterior q(x_{t-1} | x_t, x_0)
        self.posterior_variance = (
            self.betas * (1.0 - self.alphas_cumprod_prev) / (1.0 - self.alphas_cumprod)
        )
        self.posterior_mean_coef1 = (
            self.betas * np.sqrt(self.alphas_cumprod_prev) / (1.0 - self.alphas_cumprod)
        )
        self.posterior_mean_coef2 = (
            (1.0 - self.alphas_cumprod_prev) * np.sqrt(self.alphas) / (1.0 - self.alphas_cumprod)
        )

    def q_sample(self, x_0: np.ndarray, t: int, noise: Optional[np.ndarray] = None) -> Tuple[np.ndarray, np.ndarray]:
        """
        Forward process: sample from q(x_t | x_0) = sqrt(alpha_bar_t) * x_0 + sqrt(1 - alpha_bar_t) * noise
        """
        if noise is None:
            noise = np.random.normal(size=x_0.shape).astype(np.float32)

        sqrt_alpha = self.sqrt_alphas_cumprod[t]
        sqrt_one_minus_alpha = self.sqrt_one_minus_alphas_cumprod[t]

        x_t = sqrt_alpha * x_0 + sqrt_one_minus_alpha * noise
        return x_t.astype(np.float32), noise.astype(np.float32)


def get_sinusoidal_timestep_embedding(timesteps: np.ndarray, dim: int, max_period: int = 10000) -> np.ndarray:
    """
    Generates sinusoidal positional embeddings for diffusion timesteps.
    """
    half = dim // 2
    freqs = np.exp(-math.log(max_period) * np.arange(0, half, dtype=np.float32) / half)
    args = timesteps[:, np.newaxis] * freqs[np.newaxis, :]
    embedding = np.concatenate([np.cos(args), np.sin(args)], axis=-1)
    if dim % 2 != 0:
        embedding = np.pad(embedding, ((0, 0), (0, 1)))
    return embedding.astype(np.float32)


class ConditionalDenoiserMLP:
    """
    U-Net/MLP style conditional denoiser for Latent DiffRec.
    Takes noisy latent vector x_t (768), timestep t, and 6-signal context vector c,
    and predicts the injected noise epsilon.
    """

    def __init__(self, latent_dim: int = 768, context_dim: int = 6, time_emb_dim: int = 64, hidden_dim: int = 512):
        self.latent_dim = latent_dim
        self.context_dim = context_dim
        self.time_emb_dim = time_emb_dim

        in_dim = latent_dim + time_emb_dim + context_dim

        scale_1 = 1.0 / math.sqrt(in_dim)
        scale_2 = 1.0 / math.sqrt(hidden_dim)
        scale_3 = 1.0 / math.sqrt(hidden_dim)

        self.w1 = np.random.normal(0.0, scale_1, size=(in_dim, hidden_dim)).astype(np.float32)
        self.b1 = np.zeros(hidden_dim, dtype=np.float32)

        self.w2 = np.random.normal(0.0, scale_2, size=(hidden_dim, hidden_dim)).astype(np.float32)
        self.b2 = np.zeros(hidden_dim, dtype=np.float32)

        self.w_out = np.random.normal(0.0, scale_3, size=(hidden_dim, latent_dim)).astype(np.float32)
        self.b_out = np.zeros(latent_dim, dtype=np.float32)

    def forward(self, x_t: np.ndarray, t: np.ndarray, context: np.ndarray) -> np.ndarray:
        """
        x_t: (batch_size, latent_dim)
        t: (batch_size,) integer steps
        context: (batch_size, context_dim)
        Returns predicted noise epsilon: (batch_size, latent_dim)
        """
        time_emb = get_sinusoidal_timestep_embedding(t, self.time_emb_dim)

        # Concatenate inputs: [x_t, time_emb, context]
        h = np.concatenate([x_t, time_emb, context], axis=-1)

        # Hidden layer 1: Linear + Tanh
        h = np.tanh(h @ self.w1 + self.b1)
        # Hidden layer 2: Linear + Tanh
        h = np.tanh(h @ self.w2 + self.b2)
        # Output projection
        pred_noise = h @ self.w_out + self.b_out
        return pred_noise


class PlaylistDiffusionGenerator:
    """
    L-DiffRec Generative Diffusion Model for Sloth Playlist Synthesis.
    Generates cohesive 768-dim track embeddings conditioned on the 6-signal context vector,
    then projects them to actual audio catalog tracks.
    """

    def __init__(self, config: Optional[PlaylistDiffusionConfig] = None):
        self.config = config or PlaylistDiffusionConfig()
        self.schedule = GaussianDiffusionSchedule(
            timesteps=self.config.timesteps,
            beta_start=self.config.beta_start,
            beta_end=self.config.beta_end,
            schedule_type=self.config.schedule_type,
        )
        self.denoiser = ConditionalDenoiserMLP(
            latent_dim=self.config.latent_dim,
            context_dim=self.config.context_dim,
            time_emb_dim=self.config.time_emb_dim,
            hidden_dim=self.config.hidden_dims[0],
        )

        # Catalog track repository: track_id -> 768-dim MERT embedding
        self.catalog_track_ids: List[str] = []
        self.catalog_embeddings: Optional[np.ndarray] = None  # (N, 768)

    def register_catalog(self, track_embeddings: Dict[str, np.ndarray]) -> None:
        """
        Registers track catalog embeddings (768-dim MERT representations) for nearest neighbor retrieval.
        """
        self.catalog_track_ids = list(track_embeddings.keys())
        matrix = np.array([track_embeddings[tid] for tid in self.catalog_track_ids], dtype=np.float32)

        # Normalize catalog embeddings for fast cosine similarity via dot product
        norms = np.linalg.norm(matrix, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        self.catalog_embeddings = matrix / norms

    def compute_loss(
        self,
        x_0: np.ndarray,
        context: np.ndarray,
        timesteps: Optional[np.ndarray] = None,
    ) -> float:
        """
        Diffusion training loss: L_diff = MSE(epsilon, epsilon_theta(x_t, t, c))
        """
        batch_size = x_0.shape[0]
        if timesteps is None:
            t = np.random.randint(0, self.config.timesteps, size=(batch_size,))
        else:
            t = timesteps

        noise = np.random.normal(size=x_0.shape).astype(np.float32)
        # Sample x_t for each element
        x_t = np.zeros_like(x_0)
        for i in range(batch_size):
            x_t[i], _ = self.schedule.q_sample(x_0[i], int(t[i]), noise=noise[i])

        pred_noise = self.denoiser.forward(x_t, t, context)
        mse = float(np.mean((noise - pred_noise) ** 2))
        return mse

    def sample_latent_vector(
        self,
        context_vector: np.ndarray,
        seed_embedding: Optional[np.ndarray] = None,
        momentum: float = 0.3,
    ) -> np.ndarray:
        """
        Reverse diffusion sampling (DDPM):
        Generates a 768-dim latent track representation conditioned on context_vector.
        """
        context_2d = context_vector.reshape(1, self.config.context_dim)

        # Start from pure Gaussian noise or biased seed
        if seed_embedding is not None and len(seed_embedding) == self.config.latent_dim:
            noise = np.random.normal(size=(1, self.config.latent_dim)).astype(np.float32)
            x_t = ((1.0 - momentum) * noise + momentum * seed_embedding).astype(np.float32)
        else:
            x_t = np.random.normal(size=(1, self.config.latent_dim)).astype(np.float32)

        # Reverse denoising loop from T-1 down to 0
        for step in reversed(range(self.config.timesteps)):
            t_batch = np.array([step], dtype=np.int32)
            pred_noise = self.denoiser.forward(x_t, t_batch, context_2d)

            beta_t = self.schedule.betas[step]
            alpha_t = self.schedule.alphas[step]
            sqrt_one_minus_alpha_bar = self.schedule.sqrt_one_minus_alphas_cumprod[step]

            # Mean estimate: mu = 1 / sqrt(alpha_t) * (x_t - (beta_t / sqrt(1 - alpha_bar_t)) * pred_noise)
            mean = (1.0 / math.sqrt(alpha_t)) * (x_t - (beta_t / sqrt_one_minus_alpha_bar) * pred_noise)

            if step > 0:
                var = self.schedule.posterior_variance[step]
                sigma = math.sqrt(max(1e-9, var))
                z = np.random.normal(size=x_t.shape).astype(np.float32)
                x_t = mean + sigma * z
            else:
                x_t = mean

        return x_t.squeeze(0).astype(np.float32)

    def generate_playlist(
        self,
        context_vector: np.ndarray,
        length: int = 10,
        seed_track_embedding: Optional[np.ndarray] = None,
        diversity_temperature: float = 0.7,
    ) -> List[Tuple[str, float]]:
        """
        Synthesizes a cohesive playlist trajectory in MERT latent space and maps to catalog tracks.
        Returns a list of (track_id, match_score).
        """
        if self.catalog_embeddings is None or len(self.catalog_track_ids) == 0:
            return []

        selected_tracks: List[Tuple[str, float]] = []
        used_ids = set()
        current_momentum_emb = seed_track_embedding

        for _ in range(length):
            # Synthesize latent vector for next position
            target_emb = self.sample_latent_vector(
                context_vector=context_vector,
                seed_embedding=current_momentum_emb,
                momentum=0.25,
            )

            # Normalize for cosine similarity
            norm = np.linalg.norm(target_emb)
            if norm > 0:
                target_emb = target_emb / norm

            # Nearest neighbor search in catalog
            similarities = self.catalog_embeddings @ target_emb

            # Mask out already selected tracks
            for uid in used_ids:
                if uid in self.catalog_track_ids:
                    idx = self.catalog_track_ids.index(uid)
                    similarities[idx] = -1.0

            # Softmax sampling with diversity temperature or greedy top-1
            if diversity_temperature <= 0.1:
                best_idx = int(np.argmax(similarities))
            else:
                # Top candidate sampling
                top_k_indices = np.argsort(-similarities)[:10]
                top_scores = similarities[top_k_indices]
                scaled = top_scores / diversity_temperature
                scaled -= np.max(scaled)
                probs = np.exp(scaled) / (np.sum(np.exp(scaled)) + 1e-9)
                best_idx = int(np.random.choice(top_k_indices, p=probs))

            best_track_id = self.catalog_track_ids[best_idx]
            match_score = float(similarities[best_idx])

            selected_tracks.append((best_track_id, match_score))
            used_ids.add(best_track_id)

            # Update momentum with chosen track embedding
            current_momentum_emb = self.catalog_embeddings[best_idx]

        return selected_tracks
