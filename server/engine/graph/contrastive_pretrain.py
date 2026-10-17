"""
Sloth Graph Engine - Contrastive Pre-training & BPR Fine-tuning
Implements edge-dropout data augmentation (p=0.2) with InfoNCE loss (50 epochs)
followed by Bayesian Personalized Ranking (BPR) fine-tuning (batch size 512).

Architecture adapted from SGL (Self-supervised Graph Learning, Wu et al. 2021)
and SimGCL (Simple Graph Contrastive Learning, Yu et al. 2022).
"""

from __future__ import annotations

import copy
import math
import random
from dataclasses import dataclass
from typing import Callable, Dict, List, Optional, Tuple, Union
import numpy as np

from .light_hgcn import HeteroHypergraph, LightHGCN
from .schema import HeteroNodeType, Hyperedge


@dataclass
class TrainingMetrics:
    phase: str  # "pretrain" | "finetune" | "completed"
    epoch: int
    total_epochs: int
    loss: float
    progress: float  # 0.0 to 1.0
    extra: Optional[Dict[str, float]] = None


class ContrastivePretrainer:
    """
    Orchestrates self-supervised InfoNCE pre-training via hypergraph edge dropout
    followed by supervised BPR ranking fine-tuning.
    """

    def __init__(
        self,
        model: LightHGCN,
        dropout_rate: float = 0.20,
        temperature: float = 0.20,
        pretrain_epochs: int = 50,
        finetune_epochs: int = 20,
        batch_size: int = 512,
        learning_rate: float = 0.01,
        reg_weight: float = 1e-4,
    ):
        self.model = model
        self.dropout_rate = dropout_rate
        self.temperature = temperature
        self.pretrain_epochs = pretrain_epochs
        self.finetune_epochs = finetune_epochs
        self.batch_size = batch_size
        self.learning_rate = learning_rate
        self.reg_weight = reg_weight

    def create_augmented_view(self, p_drop: Optional[float] = None) -> HeteroHypergraph:
        """
        Generates an augmented graph view G' by dropping hyperedges with probability p_drop.
        """
        p = p_drop if p_drop is not None else self.dropout_rate
        base_graph = self.model.graph

        augmented = HeteroHypergraph()
        # Keep same node mapping
        for node_key, idx in base_graph.node_to_idx.items():
            n_type, ext_id = node_key
            augmented.add_node(n_type, ext_id)

        # Perturb hyperedges
        for edge in base_graph.hyperedges:
            if random.random() >= p:
                augmented.hyperedges.append(
                    Hyperedge(
                        id=edge.id,
                        edge_type=edge.edge_type,
                        weight=edge.weight,
                        nodes=set(edge.nodes),
                    )
                )

        # Fallback if too many dropped
        if len(augmented.hyperedges) == 0 and len(base_graph.hyperedges) > 0:
            augmented.hyperedges = list(base_graph.hyperedges)

        return augmented

    def compute_infonce_loss(
        self,
        z1: np.ndarray,
        z2: np.ndarray,
        temperature: Optional[float] = None,
    ) -> Tuple[float, np.ndarray, np.ndarray]:
        """
        Computes InfoNCE contrastive loss between two augmented graph views:
        L_InfoNCE = -log ( exp( sim(z1_i, z2_i) / tau ) / sum_j exp( sim(z1_i, z2_j) / tau ) )

        Returns:
          loss_val: scalar loss
          grad_z1: gradient with respect to view 1 normalized embeddings
          grad_z2: gradient with respect to view 2 normalized embeddings
        """
        tau = temperature if temperature is not None else self.temperature
        N, D = z1.shape
        if N == 0:
            return 0.0, np.zeros_like(z1), np.zeros_like(z2)

        # Row-normalize to unit hypersphere
        norm1 = np.linalg.norm(z1, axis=1, keepdims=True) + 1e-8
        norm2 = np.linalg.norm(z2, axis=1, keepdims=True) + 1e-8
        u1 = z1 / norm1
        u2 = z2 / norm2

        # Cosine similarity matrix scaled by tau
        # sim[i, j] = <u1_i, u2_j> / tau
        sim = (u1 @ u2.T) / tau
        # Stabilize max for numerical safety
        sim_max = np.max(sim, axis=1, keepdims=True)
        exp_sim = np.exp(np.clip(sim - sim_max, -50.0, 50.0))
        sum_exp = np.sum(exp_sim, axis=1, keepdims=True)

        # Softmax probability matrix P[i, j]
        P = exp_sim / (sum_exp + 1e-8)

        # Positive pairs are diagonal elements (i == j)
        pos_diag = np.diag(sim)
        log_pos = pos_diag - np.squeeze(sim_max) - np.log(np.squeeze(sum_exp) + 1e-8)
        loss = -float(np.mean(log_pos))

        # Analytic gradient of InfoNCE wrt u1 and u2
        # d(L)/d(u1_i) = 1/(N * tau) * ( sum_j P[i, j] u2_j - u2_i )
        grad_u1 = (P @ u2 - u2) / (N * tau)
        # Symmetrically wrt u2_i
        grad_u2 = (P.T @ u1 - u1) / (N * tau)

        # Backprop through L2 normalization:
        # d(L)/d(z) = (I - u u^T) grad_u / norm
        grad_z1 = (grad_u1 - u1 * np.sum(grad_u1 * u1, axis=1, keepdims=True)) / norm1
        grad_z2 = (grad_u2 - u2 * np.sum(grad_u2 * u2, axis=1, keepdims=True)) / norm2

        return loss, grad_z1, grad_z2

    def pretrain_step(self) -> float:
        """
        Executes one InfoNCE pre-training epoch across 2 augmented views.
        """
        g1 = self.create_augmented_view()
        g2 = self.create_augmented_view()

        m1 = LightHGCN(g1, embedding_dim=self.model.embedding_dim, num_layers=self.model.num_layers)
        m2 = LightHGCN(g2, embedding_dim=self.model.embedding_dim, num_layers=self.model.num_layers)

        # Forward passes using current ego-embeddings
        z1 = m1.forward(self.model.embeddings_0)
        z2 = m2.forward(self.model.embeddings_0)

        loss, grad_z1, grad_z2 = self.compute_infonce_loss(z1, z2)

        # Propagation back to E^(0)
        M1 = m1.get_propagation_matrix()
        M2 = m2.get_propagation_matrix()

        grad_E0 = (M1 @ grad_z1 + M2 @ grad_z2) + self.reg_weight * self.model.embeddings_0
        np.clip(grad_E0, -2.0, 2.0, out=grad_E0)

        self.model.embeddings_0 -= self.learning_rate * grad_E0
        return loss

    def finetune_step(
        self,
        users: List[str],
        pos_tracks: List[str],
        neg_tracks: List[str],
    ) -> Tuple[float, float]:
        """
        Executes one batch of BPR fine-tuning.
        """
        return self.model.fit_bpr_step(
            users=users,
            pos_tracks=pos_tracks,
            neg_tracks=neg_tracks,
            learning_rate=self.learning_rate,
            reg_weight=self.reg_weight,
        )

    def train_pipeline(
        self,
        bpr_pairs: Optional[List[Tuple[str, str, str]]] = None,
        progress_callback: Optional[Callable[[TrainingMetrics], None]] = None,
    ) -> Dict[str, Any]:
        """
        Runs the complete 2-phase training regimen:
          Phase 1: 50 epochs InfoNCE contrastive pretraining
          Phase 2: BPR ranking fine-tuning (batch size 512)
        """
        total_epochs = self.pretrain_epochs + (self.finetune_epochs if bpr_pairs else 0)
        current_step = 0
        pretrain_losses: List[float] = []
        finetune_losses: List[float] = []

        # Phase 1: InfoNCE Pre-training
        for epoch in range(1, self.pretrain_epochs + 1):
            loss = self.pretrain_step()
            pretrain_losses.append(loss)
            current_step += 1
            progress = current_step / max(1, total_epochs)

            if progress_callback:
                progress_callback(
                    TrainingMetrics(
                        phase="pretrain",
                        epoch=epoch,
                        total_epochs=self.pretrain_epochs,
                        loss=round(loss, 4),
                        progress=round(progress, 3),
                    )
                )

        # Phase 2: BPR Fine-tuning
        if bpr_pairs and len(bpr_pairs) > 0:
            num_pairs = len(bpr_pairs)
            for epoch in range(1, self.finetune_epochs + 1):
                # Shuffle pairs
                shuffled = list(bpr_pairs)
                random.shuffle(shuffled)
                epoch_bpr_losses = []

                # Minibatch iteration with batch size 512
                for i in range(0, num_pairs, self.batch_size):
                    batch = shuffled[i : i + self.batch_size]
                    u_b = [p[0] for p in batch]
                    pos_b = [p[1] for p in batch]
                    neg_b = [p[2] for p in batch]

                    bpr_l, _ = self.finetune_step(u_b, pos_b, neg_b)
                    epoch_bpr_losses.append(bpr_l)

                avg_epoch_loss = float(np.mean(epoch_bpr_losses)) if epoch_bpr_losses else 0.0
                finetune_losses.append(avg_epoch_loss)
                current_step += 1
                progress = current_step / max(1, total_epochs)

                if progress_callback:
                    progress_callback(
                        TrainingMetrics(
                            phase="finetune",
                            epoch=epoch,
                            total_epochs=self.finetune_epochs,
                            loss=round(avg_epoch_loss, 4),
                            progress=round(progress, 3),
                        )
                    )

        if progress_callback:
            progress_callback(
                TrainingMetrics(
                    phase="completed",
                    epoch=total_epochs,
                    total_epochs=total_epochs,
                    loss=finetune_losses[-1] if finetune_losses else (pretrain_losses[-1] if pretrain_losses else 0.0),
                    progress=1.0,
                )
            )

        return {
            "pretrain_epochs": self.pretrain_epochs,
            "finetune_epochs": self.finetune_epochs if bpr_pairs else 0,
            "final_pretrain_loss": pretrain_losses[-1] if pretrain_losses else 0.0,
            "final_finetune_loss": finetune_losses[-1] if finetune_losses else 0.0,
            "num_nodes": self.model.graph.num_nodes,
            "embedding_dim": self.model.embedding_dim,
        }
