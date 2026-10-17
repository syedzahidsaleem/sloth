# Source: BERT4Rec: Sequential Recommendation with Bidirectional Encoder Representations from Transformer, Fei Sun, Jun Liu, Jie Wu, Changhua Pei, Xiao Lin, Wenwu Ou, Peng Jiang, 2019
# Reference implementation: https://github.com/jaywonchung/BERT4Rec-VAE-Pytorch
# Adapted for Sloth by: Syed Zahid
# License of original: MIT
# Changes: Adapted input vocabulary to Sloth track ID space, Cloze masking strategy (p=0.15), multi-head bidirectional self-attention, and dense projection to 256-dimensional sequence embedding vectors.

from __future__ import annotations

from dataclasses import dataclass, field
import math
from typing import Dict, List, Optional, Tuple, Union
import numpy as np


@dataclass
class BERT4RecConfig:
    max_len: int = 50
    hidden_dim: int = 256
    num_heads: int = 4
    num_blocks: int = 2
    dropout: float = 0.1
    mask_prob: float = 0.15
    vocab_size: int = 10000


def gelu(x: np.ndarray) -> np.ndarray:
    """
    Gaussian Error Linear Unit (GELU) activation function.
    0.5 * x * (1 + tanh(sqrt(2 / pi) * (x + 0.044715 * x^3)))
    """
    return 0.5 * x * (1.0 + np.tanh(math.sqrt(2.0 / math.pi) * (x + 0.044715 * np.power(x, 3.0))))


def layer_norm(x: np.ndarray, gamma: np.ndarray, beta: np.ndarray, eps: float = 1e-5) -> np.ndarray:
    """
    Standard Layer Normalization over the last dimension.
    """
    mean = np.mean(x, axis=-1, keepdims=True)
    var = np.var(x, axis=-1, keepdims=True)
    norm = (x - mean) / np.sqrt(var + eps)
    return norm * gamma + beta


class MultiHeadAttention:
    """
    Bidirectional Multi-Head Self-Attention for sequential recommendation.
    """

    def __init__(self, hidden_dim: int, num_heads: int):
        assert hidden_dim % num_heads == 0, "hidden_dim must be divisible by num_heads"
        self.hidden_dim = hidden_dim
        self.num_heads = num_heads
        self.head_dim = hidden_dim // num_heads

        scale = 1.0 / math.sqrt(hidden_dim)
        self.w_q = np.random.normal(0.0, scale, size=(hidden_dim, hidden_dim)).astype(np.float32)
        self.w_k = np.random.normal(0.0, scale, size=(hidden_dim, hidden_dim)).astype(np.float32)
        self.w_v = np.random.normal(0.0, scale, size=(hidden_dim, hidden_dim)).astype(np.float32)
        self.w_o = np.random.normal(0.0, scale, size=(hidden_dim, hidden_dim)).astype(np.float32)

    def forward(self, x: np.ndarray, mask: Optional[np.ndarray] = None) -> np.ndarray:
        """
        x: (batch_size, seq_len, hidden_dim)
        mask: (batch_size, seq_len) boolean or float mask (True = attend, False = mask out)
        """
        batch_size, seq_len, _ = x.shape

        q = (x @ self.w_q).reshape(batch_size, seq_len, self.num_heads, self.head_dim).transpose(0, 2, 1, 3)
        k = (x @ self.w_k).reshape(batch_size, seq_len, self.num_heads, self.head_dim).transpose(0, 2, 1, 3)
        v = (x @ self.w_v).reshape(batch_size, seq_len, self.num_heads, self.head_dim).transpose(0, 2, 1, 3)

        # Scaled dot-product scores: (batch, heads, seq_len, seq_len)
        scores = (q @ k.transpose(0, 1, 3, 2)) / math.sqrt(self.head_dim)

        if mask is not None:
            # Broadcast mask over heads and query positions
            # mask shape: (batch_size, 1, 1, seq_len)
            mask_4d = mask[:, np.newaxis, np.newaxis, :]
            scores = np.where(mask_4d, scores, -1e9)

        # Softmax along last dimension
        exp_scores = np.exp(scores - np.max(scores, axis=-1, keepdims=True))
        attn_weights = exp_scores / (np.sum(exp_scores, axis=-1, keepdims=True) + 1e-9)

        # Weighted sum: (batch, heads, seq_len, head_dim)
        context = attn_weights @ v

        # Concatenate heads: (batch_size, seq_len, hidden_dim)
        context = context.transpose(0, 2, 1, 3).reshape(batch_size, seq_len, self.hidden_dim)
        return context @ self.w_o


class TransformerBlock:
    """
    BERT4Rec Transformer Layer: Multi-Head Attention + GELU FFN with residual connections.
    """

    def __init__(self, hidden_dim: int, num_heads: int):
        self.attention = MultiHeadAttention(hidden_dim, num_heads)
        d_ff = hidden_dim * 4
        scale_1 = 1.0 / math.sqrt(hidden_dim)
        scale_2 = 1.0 / math.sqrt(d_ff)

        self.w_1 = np.random.normal(0.0, scale_1, size=(hidden_dim, d_ff)).astype(np.float32)
        self.b_1 = np.zeros(d_ff, dtype=np.float32)
        self.w_2 = np.random.normal(0.0, scale_2, size=(d_ff, hidden_dim)).astype(np.float32)
        self.b_2 = np.zeros(hidden_dim, dtype=np.float32)

        self.gamma_1 = np.ones(hidden_dim, dtype=np.float32)
        self.beta_1 = np.zeros(hidden_dim, dtype=np.float32)
        self.gamma_2 = np.ones(hidden_dim, dtype=np.float32)
        self.beta_2 = np.zeros(hidden_dim, dtype=np.float32)

    def forward(self, x: np.ndarray, mask: Optional[np.ndarray] = None) -> np.ndarray:
        # Self-attention sublayer + residual + layer norm
        attn_out = self.attention.forward(x, mask)
        x = layer_norm(x + attn_out, self.gamma_1, self.beta_1)

        # Positionwise feedforward sublayer + residual + layer norm
        ffn_out = gelu(x @ self.w_1 + self.b_1) @ self.w_2 + self.b_2
        x = layer_norm(x + ffn_out, self.gamma_2, self.beta_2)
        return x


class BERT4Rec:
    """
    BERT4Rec Model adapted for Sloth music sequential recommendation.
    Outputs a 256-dimensional sequence embedding for track sequences.
    """

    def __init__(self, config: Optional[BERT4RecConfig] = None):
        self.config = config or BERT4RecConfig()

        # Special tokens: 0: PAD, vocab_size - 1: MASK
        self.pad_token = 0
        self.mask_token = self.config.vocab_size - 1

        # Track token and positional embeddings
        scale = 1.0 / math.sqrt(self.config.hidden_dim)
        self.token_embeddings = np.random.normal(
            0.0, scale, size=(self.config.vocab_size, self.config.hidden_dim)
        ).astype(np.float32)
        self.pos_embeddings = np.random.normal(
            0.0, scale, size=(self.config.max_len, self.config.hidden_dim)
        ).astype(np.float32)

        self.blocks = [
            TransformerBlock(self.config.hidden_dim, self.config.num_heads)
            for _ in range(self.config.num_blocks)
        ]

        # Final projection to 256-dim embedding
        self.proj_gamma = np.ones(self.config.hidden_dim, dtype=np.float32)
        self.proj_beta = np.zeros(self.config.hidden_dim, dtype=np.float32)

        # Track string ID to internal int vocabulary mapping
        self.track_to_id: Dict[str, int] = {}
        self.id_to_track: Dict[int, str] = {}

    def get_or_create_track_id(self, track_str_id: str) -> int:
        if track_str_id in self.track_to_id:
            return self.track_to_id[track_str_id]

        new_id = len(self.track_to_id) + 1  # 0 is reserved for PAD
        if new_id >= self.mask_token:
            # Wrap around or hash if vocabulary exceeds bound
            new_id = (hash(track_str_id) % (self.config.vocab_size - 2)) + 1

        self.track_to_id[track_str_id] = new_id
        self.id_to_track[new_id] = track_str_id
        return new_id

    def apply_cloze_mask(
        self, sequence: List[int]
    ) -> Tuple[List[int], List[int], List[int]]:
        """
        Applies Cloze task masking with mask_prob (default 0.15).
        Returns:
            masked_seq: sequence with masked tokens replaced by mask_token
            masked_positions: list of token indices that were masked
            target_tokens: ground truth tokens at the masked positions
        """
        masked_seq = list(sequence)
        masked_positions = []
        target_tokens = []

        for idx, token in enumerate(sequence):
            if token == self.pad_token:
                continue
            prob = np.random.rand()
            if prob < self.config.mask_prob:
                masked_positions.append(idx)
                target_tokens.append(token)

                dice = np.random.rand()
                if dice < 0.8:
                    masked_seq[idx] = self.mask_token
                elif dice < 0.9:
                    # Random replacement
                    masked_seq[idx] = np.random.randint(1, self.config.vocab_size - 1)
                # Remaining 10% keeps original token unchanged

        # Ensure at least the last token is masked if none were randomly selected
        if not masked_positions and len(sequence) > 0:
            last_idx = len(sequence) - 1
            masked_positions.append(last_idx)
            target_tokens.append(sequence[last_idx])
            masked_seq[last_idx] = self.mask_token

        return masked_seq, masked_positions, target_tokens

    def forward(self, input_ids: np.ndarray) -> np.ndarray:
        """
        input_ids: (batch_size, seq_len) of token integers
        Returns: (batch_size, seq_len, hidden_dim) contextual sequence representations
        """
        batch_size, seq_len = input_ids.shape
        seq_len = min(seq_len, self.config.max_len)
        ids = input_ids[:, :seq_len]

        # Padding mask: True where token != PAD
        mask = ids != self.pad_token

        # Token + Positional embeddings
        x = self.token_embeddings[ids] + self.pos_embeddings[:seq_len][np.newaxis, :, :]

        # Pass through bidirectional Transformer blocks
        for block in self.blocks:
            x = block.forward(x, mask)

        return layer_norm(x, self.proj_gamma, self.proj_beta)

    def encode_track_sequence(self, track_sequence: List[str]) -> np.ndarray:
        """
        Encodes a list of track IDs into a 256-dimensional sequential latent embedding vector.
        """
        if not track_sequence:
            return np.zeros(self.config.hidden_dim, dtype=np.float32)

        token_ids = [self.get_or_create_track_id(tid) for tid in track_sequence]

        # Truncate to max_len
        if len(token_ids) > self.config.max_len:
            token_ids = token_ids[-self.config.max_len :]

        # Append mask token to predict next track representation
        seq_with_target = token_ids + [self.mask_token]
        if len(seq_with_target) > self.config.max_len:
            seq_with_target = seq_with_target[-self.config.max_len :]

        input_tensor = np.array([seq_with_target], dtype=np.int64)
        hidden_states = self.forward(input_tensor)

        # Return representation at the masked final target position
        return hidden_states[0, -1, :].astype(np.float32)

    def predict_next_candidates(
        self,
        track_sequence: List[str],
        candidate_track_ids: List[str],
        top_k: int = 10,
    ) -> List[Tuple[str, float]]:
        """
        Ranks candidate tracks given the current listening sequence.
        """
        seq_emb = self.encode_track_sequence(track_sequence)

        scores = []
        for cand_id in candidate_track_ids:
            token_id = self.get_or_create_track_id(cand_id)
            cand_emb = self.token_embeddings[token_id]
            score = float(np.dot(seq_emb, cand_emb))
            scores.append((cand_id, score))

        scores.sort(key=lambda x: x[1], reverse=True)
        return scores[:top_k]
