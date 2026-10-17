# Source: LightGCN: Simplifying and Powering Graph Convolution Network for Recommendation, Xiangnan He, Kuan Deng, Xiang Wang, Yan Li, Yongdong Zhang, Meng Wang, 2020
# Reference implementation: https://github.com/gusye1234/LightGCN-PyTorch
# Adapted for Sloth by: Syed Zahid
# License of original: MIT
# Changes: Replaced user-item bipartite graph with a 5-node heterogeneous hypergraph schema (User, Track, Artist, Album, Playlist, Context), incidence matrix normalization D_v^(-1/2) * H * W * D_e^(-1) * H^T * D_v^(-1/2), 2-layer convolution, 256-dim embeddings, multi-layer aggregation, and high-performance numpy/sparse execution.

from __future__ import annotations

import math
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple, Union
import numpy as np

from .schema import (
    CANONICAL_RELATIONS,
    CanonicalEdgeType,
    HeteroGraphMeta,
    HeteroNodeType,
    Hyperedge,
    PRIMARY_NODE_TYPES,
)


class HeteroHypergraph:
    """
    Manages heterogeneous 5-node music hypergraph incidence structure.
    Nodes: User, Track, Artist, Playlist, Context, Album.
    """

    def __init__(self):
        # Maps (node_type, external_id) -> global_int_index
        self.node_to_idx: Dict[Tuple[HeteroNodeType, str], int] = {}
        self.idx_to_node: Dict[int, Tuple[HeteroNodeType, str]] = {}
        self.type_to_indices: Dict[HeteroNodeType, List[int]] = {
            t: [] for t in HeteroNodeType
        }
        self.hyperedges: List[Hyperedge] = []
        self._incidence_matrix: Optional[np.ndarray] = None
        self._norm_adj: Optional[np.ndarray] = None

    def add_node(self, node_type: HeteroNodeType, external_id: str) -> int:
        key = (node_type, str(external_id))
        if key in self.node_to_idx:
            return self.node_to_idx[key]

        idx = len(self.node_to_idx)
        self.node_to_idx[key] = idx
        self.idx_to_node[idx] = key
        self.type_to_indices[node_type].append(idx)
        self.invalidate_cache()
        return idx

    def add_hyperedge(
        self,
        edge_id: str,
        edge_type: str,
        nodes: List[Tuple[HeteroNodeType, str]],
        weight: float = 1.0,
    ) -> None:
        edge = Hyperedge(id=edge_id, edge_type=edge_type, weight=weight)
        for n_type, ext_id in nodes:
            self.add_node(n_type, ext_id)
            edge.nodes.add((n_type, str(ext_id)))
        self.hyperedges.append(edge)
        self.invalidate_cache()

    def invalidate_cache(self) -> None:
        self._incidence_matrix = None
        self._norm_adj = None

    @property
    def num_nodes(self) -> int:
        return len(self.node_to_idx)

    @property
    def num_edges(self) -> int:
        return len(self.hyperedges)

    def build_incidence_matrix(self) -> np.ndarray:
        """
        Builds binary incidence matrix H of shape (|V|, |E|).
        H[v, e] = 1 if node v in hyperedge e else 0.
        """
        if self._incidence_matrix is not None:
            return self._incidence_matrix

        num_v = self.num_nodes
        num_e = self.num_edges
        if num_v == 0 or num_e == 0:
            return np.zeros((num_v, num_e), dtype=np.float32)

        H = np.zeros((num_v, num_e), dtype=np.float32)
        for e_idx, edge in enumerate(self.hyperedges):
            for n in edge.nodes:
                if n in self.node_to_idx:
                    v_idx = self.node_to_idx[n]
                    H[v_idx, e_idx] = 1.0

        self._incidence_matrix = H
        return H

    def get_normalized_hypergraph_adjacency(self) -> np.ndarray:
        """
        Computes the LightHGCN normalized hypergraph adjacency matrix:
        A_hyper = D_v^(-1/2) * H * W * D_e^(-1) * H^T * D_v^(-1/2)

        Guarantees spectral radius <= 1 and avoids numerical instability.
        """
        if self._norm_adj is not None:
            return self._norm_adj

        H = self.build_incidence_matrix()
        num_v, num_e = H.shape
        if num_v == 0 or num_e == 0:
            return np.zeros((num_v, num_v), dtype=np.float32)

        # Hyperedge weights vector W
        w = np.array([e.weight for e in self.hyperedges], dtype=np.float32)

        # Edge degrees: D_e = sum_v H[v, e]
        d_e = np.sum(H, axis=0)
        d_e_inv = np.zeros_like(d_e)
        nonzero_e = d_e > 0
        d_e_inv[nonzero_e] = 1.0 / d_e[nonzero_e]

        # Scaled H: H_scaled = H * sqrt(W * D_e^(-1))
        scale = np.sqrt(w * d_e_inv)
        H_scaled = H * scale[np.newaxis, :]

        # Unnormalized hypergraph adjacency: A_raw = H * W * D_e^(-1) * H^T = H_scaled @ H_scaled^T
        A_raw = H_scaled @ H_scaled.T

        # Vertex degrees: D_v = sum_j A_raw[i, j]
        d_v = np.sum(A_raw, axis=1)
        d_v_inv_sqrt = np.zeros_like(d_v)
        nonzero_v = d_v > 0
        d_v_inv_sqrt[nonzero_v] = 1.0 / np.sqrt(d_v[nonzero_v])

        # Symmetrically normalized adjacency: D_v^(-1/2) * A_raw * D_v^(-1/2)
        D_v_inv_sqrt_mat = np.diag(d_v_inv_sqrt)
        A_norm = D_v_inv_sqrt_mat @ A_raw @ D_v_inv_sqrt_mat

        self._norm_adj = A_norm.astype(np.float32)
        return self._norm_adj

    @classmethod
    def from_graph_data(cls, graph_data: Any) -> "HeteroHypergraph":
        """
        Constructs a HeteroHypergraph from HeteroGraphData extracted by SQLiteGraphBuilder.
        """
        hg = cls()
        # Register all nodes
        for (n_type_str, ext_id), _ in graph_data.global_node_to_idx.items():
            try:
                n_type = HeteroNodeType(n_type_str)
            except ValueError:
                continue
            hg.add_node(n_type, ext_id)

        # Add hyperedges
        for he in graph_data.hyperedges:
            hg.add_hyperedge(
                edge_id=he.id,
                edge_type=he.edge_type,
                nodes=list(he.nodes),
                weight=he.weight,
            )

        # Add canonical pairwise relations as 2-node hyperedges if not already covered
        for (src_t, rel, dst_t), (src_indices, dst_indices, weights) in graph_data.canonical_edges.items():
            try:
                src_enum = HeteroNodeType(src_t)
                dst_enum = HeteroNodeType(dst_t)
            except ValueError:
                continue

            src_id_map = graph_data.idx_to_node_id.get(src_t, {})
            dst_id_map = graph_data.idx_to_node_id.get(dst_t, {})

            for i in range(len(src_indices)):
                s_id = src_id_map.get(int(src_indices[i]))
                d_id = dst_id_map.get(int(dst_indices[i]))
                if s_id and d_id:
                    hg.add_hyperedge(
                        edge_id=f"{rel}_{s_id}_{d_id}",
                        edge_type=rel,
                        nodes=[(src_enum, s_id), (dst_enum, d_id)],
                        weight=float(weights[i]) if len(weights) > i else 1.0,
                    )

        return hg


class LightHGCN:
    """
    Light Hypergraph Convolutional Network for 5-Node Music Recommendation.
    Implements 2-layer neighborhood aggregation without non-linear activation functions,
    following LightGCN's architecture (He et al., SIGIR 2020).

    Default configuration:
      - 2-layer convolution (K=2)
      - 256-dimensional embeddings
      - Uniform combination: alpha = [1/3, 1/3, 1/3]
      - BPR loss on positive/negative pairs with L2 regularization
    """

    def __init__(
        self,
        graph: HeteroHypergraph,
        embedding_dim: int = 256,
        num_layers: int = 2,
        alpha: Optional[List[float]] = None,
    ):
        self.graph = graph
        self.embedding_dim = embedding_dim
        self.num_layers = num_layers

        # Layer combination coefficients (default: uniform average 1 / (K + 1))
        if alpha is not None:
            assert len(alpha) == num_layers + 1
            self.alpha = np.array(alpha, dtype=np.float32) / sum(alpha)
        else:
            self.alpha = np.full(num_layers + 1, 1.0 / (num_layers + 1), dtype=np.float32)

        # Initial ego-embeddings E^(0) ~ N(0, 0.1)
        num_nodes = self.graph.num_nodes
        if num_nodes > 0:
            self.embeddings_0 = np.random.normal(
                0.0, 0.1, size=(num_nodes, embedding_dim)
            ).astype(np.float32)
        else:
            self.embeddings_0 = np.empty((0, embedding_dim), dtype=np.float32)

    def initialize_embeddings(
        self, node_features: Optional[Dict[Tuple[HeteroNodeType, str], np.ndarray]] = None
    ) -> None:
        """
        Initializes or loads pretrained feature representations for graph nodes.
        """
        num_nodes = self.graph.num_nodes
        self.embeddings_0 = np.random.normal(
            0.0, 0.1, size=(num_nodes, self.embedding_dim)
        ).astype(np.float32)

        if node_features:
            for node_key, feat in node_features.items():
                if node_key in self.graph.node_to_idx:
                    idx = self.graph.node_to_idx[node_key]
                    if len(feat) == self.embedding_dim:
                        self.embeddings_0[idx] = feat
                    elif len(feat) > self.embedding_dim:
                        self.embeddings_0[idx] = feat[: self.embedding_dim]
                    else:
                        self.embeddings_0[idx, : len(feat)] = feat

    def get_propagation_matrix(self) -> np.ndarray:
        """
        Returns the combined LightGCN multi-layer propagation operator M:
        M = sum_{k=0}^K alpha_k * (A_norm)^k
        such that E* = M @ E^(0).
        """
        num_nodes = self.graph.num_nodes
        if num_nodes == 0:
            return np.empty((0, 0), dtype=np.float32)

        A_norm = self.graph.get_normalized_hypergraph_adjacency()
        M = self.alpha[0] * np.eye(num_nodes, dtype=np.float32)
        A_power = np.eye(num_nodes, dtype=np.float32)

        for k in range(1, self.num_layers + 1):
            A_power = A_power @ A_norm
            M += self.alpha[k] * A_power

        return M

    def forward(self, ego_embeddings: Optional[np.ndarray] = None) -> np.ndarray:
        """
        Propagates embeddings across the heterogeneous hypergraph:
        E^(k+1) = A_hyper * E^(k)
        Final embedding E* = sum_{k=0}^K alpha_k * E^(k)
        """
        num_nodes = self.graph.num_nodes
        if num_nodes == 0:
            return np.empty((0, self.embedding_dim), dtype=np.float32)

        init_emb = ego_embeddings if ego_embeddings is not None else self.embeddings_0
        if len(init_emb) != num_nodes:
            # Resized graph: reinitialize
            self.initialize_embeddings()
            init_emb = self.embeddings_0

        A_norm = self.graph.get_normalized_hypergraph_adjacency()

        all_layers = [init_emb]
        current_emb = init_emb

        for _ in range(self.num_layers):
            next_emb = A_norm @ current_emb
            all_layers.append(next_emb)
            current_emb = next_emb

        # Weighted combination across layers
        final_emb = np.zeros_like(init_emb)
        for k in range(self.num_layers + 1):
            final_emb += self.alpha[k] * all_layers[k]

        return final_emb

    def get_node_embedding(
        self,
        node_type: HeteroNodeType,
        external_id: str,
        computed_embeddings: Optional[np.ndarray] = None,
    ) -> Optional[np.ndarray]:
        key = (node_type, str(external_id))
        if key not in self.graph.node_to_idx:
            return None
        idx = self.graph.node_to_idx[key]
        embs = computed_embeddings if computed_embeddings is not None else self.forward()
        return embs[idx]

    def get_all_track_embeddings(
        self, computed_embeddings: Optional[np.ndarray] = None
    ) -> Dict[str, np.ndarray]:
        """
        Extracts computed embeddings for all TRACK nodes in the hypergraph.
        """
        embs = computed_embeddings if computed_embeddings is not None else self.forward()
        track_indices = self.graph.type_to_indices[HeteroNodeType.TRACK]
        result: Dict[str, np.ndarray] = {}
        for idx in track_indices:
            _, track_id = self.graph.idx_to_node[idx]
            result[track_id] = embs[idx]
        return result

    def predict_score(
        self,
        user_id: str,
        track_id: str,
        computed_embeddings: Optional[np.ndarray] = None,
    ) -> float:
        """
        Calculates affinity score between a user and a track:
        score = inner_product(e_user, e_track)
        """
        embs = computed_embeddings if computed_embeddings is not None else self.forward()
        u_emb = self.get_node_embedding(HeteroNodeType.USER, user_id, embs)
        t_emb = self.get_node_embedding(HeteroNodeType.TRACK, track_id, embs)

        if u_emb is None or t_emb is None:
            return 0.0

        return float(np.dot(u_emb, t_emb))

    def recommend_tracks_for_user(
        self,
        user_id: str,
        top_k: int = 20,
        exclude_tracks: Optional[Set[str]] = None,
        computed_embeddings: Optional[np.ndarray] = None,
    ) -> List[Tuple[str, float]]:
        """
        Ranks all candidate tracks for the given user by inner product affinity.
        """
        embs = computed_embeddings if computed_embeddings is not None else self.forward()
        u_emb = self.get_node_embedding(HeteroNodeType.USER, user_id, embs)
        if u_emb is None:
            return []

        track_indices = self.graph.type_to_indices[HeteroNodeType.TRACK]
        if not track_indices:
            return []

        track_embs = embs[track_indices]
        scores = track_embs @ u_emb

        excludes = exclude_tracks or set()
        results: List[Tuple[str, float]] = []

        # Sort indices by descending score
        ranked_order = np.argsort(-scores)
        for rank_pos in ranked_order:
            idx = track_indices[rank_pos]
            _, track_ext_id = self.graph.idx_to_node[idx]
            if track_ext_id in excludes:
                continue
            results.append((track_ext_id, float(scores[rank_pos])))
            if len(results) >= top_k:
                break

        return results

    def bpr_loss(
        self,
        users: List[str],
        pos_tracks: List[str],
        neg_tracks: List[str],
        reg_weight: float = 1e-4,
    ) -> Tuple[float, float]:
        """
        Bayesian Personalized Ranking (BPR) Loss for hypergraph training:
        L_bpr = -sum(log(sigmoid(pos_score - neg_score))) + reg_loss
        Exact LightGCN formulation:
        softplus(neg_score - pos_score).mean() + reg_weight * reg_loss
        """
        all_embs = self.forward()

        loss_terms = []
        reg_losses = []

        for u_id, p_id, n_id in zip(users, pos_tracks, neg_tracks):
            u_emb = self.get_node_embedding(HeteroNodeType.USER, u_id, all_embs)
            p_emb = self.get_node_embedding(HeteroNodeType.TRACK, p_id, all_embs)
            n_emb = self.get_node_embedding(HeteroNodeType.TRACK, n_id, all_embs)

            if u_emb is None or p_emb is None or n_emb is None:
                continue

            pos_score = float(np.dot(u_emb, p_emb))
            neg_score = float(np.dot(u_emb, n_emb))

            # softplus(neg_score - pos_score) == log(1 + exp(neg_score - pos_score))
            diff = neg_score - pos_score
            loss_val = np.log1p(np.exp(np.clip(diff, -50.0, 50.0)))
            loss_terms.append(loss_val)

            # L2 regularization on ego embeddings E^(0)
            u_ego = self.embeddings_0[self.graph.node_to_idx[(HeteroNodeType.USER, u_id)]]
            p_ego = self.embeddings_0[self.graph.node_to_idx[(HeteroNodeType.TRACK, p_id)]]
            n_ego = self.embeddings_0[self.graph.node_to_idx[(HeteroNodeType.TRACK, n_id)]]
            reg = 0.5 * (np.sum(u_ego**2) + np.sum(p_ego**2) + np.sum(n_ego**2))
            reg_losses.append(reg)

        if not loss_terms:
            return 0.0, 0.0

        bpr = float(np.mean(loss_terms))
        reg = float(reg_weight * np.mean(reg_losses))
        return bpr, reg

    def fit_bpr_step(
        self,
        users: List[str],
        pos_tracks: List[str],
        neg_tracks: List[str],
        learning_rate: float = 0.01,
        reg_weight: float = 1e-4,
    ) -> Tuple[float, float]:
        """
        Performs one gradient descent step optimizing BPR loss using LightGCN's
        analytic backpropagation:
        d(L_bpr)/d(E*) propagated back to d(L_bpr)/d(E^(0)) via M^T.
        """
        num_nodes = self.graph.num_nodes
        if num_nodes == 0:
            return 0.0, 0.0

        M = self.get_propagation_matrix()  # shape (N, N), symmetric
        all_embs = M @ self.embeddings_0   # E* shape (N, D)

        grad_E_star = np.zeros_like(all_embs)
        loss_terms = []
        reg_losses = []

        valid_count = 0
        for u_id, p_id, n_id in zip(users, pos_tracks, neg_tracks):
            u_key = (HeteroNodeType.USER, u_id)
            p_key = (HeteroNodeType.TRACK, p_id)
            n_key = (HeteroNodeType.TRACK, n_id)

            if u_key not in self.graph.node_to_idx or p_key not in self.graph.node_to_idx or n_key not in self.graph.node_to_idx:
                continue

            u_idx = self.graph.node_to_idx[u_key]
            p_idx = self.graph.node_to_idx[p_key]
            n_idx = self.graph.node_to_idx[n_key]

            u_vec = all_embs[u_idx]
            p_vec = all_embs[p_idx]
            n_vec = all_embs[n_idx]

            pos_score = float(np.dot(u_vec, p_vec))
            neg_score = float(np.dot(u_vec, n_vec))
            diff = neg_score - pos_score

            # Sigmoid factor: sigmoid(diff) = 1 / (1 + exp(-diff))
            prob = 1.0 / (1.0 + np.exp(-np.clip(diff, -50.0, 50.0)))
            loss_val = np.log1p(np.exp(np.clip(diff, -50.0, 50.0)))
            loss_terms.append(loss_val)

            # Gradient wrt E*:
            # d(loss)/d(pos_score) = -prob, d(loss)/d(neg_score) = +prob
            grad_E_star[u_idx] += prob * (n_vec - p_vec)
            grad_E_star[p_idx] += -prob * u_vec
            grad_E_star[n_idx] += prob * u_vec

            # Reg loss on ego
            u_ego = self.embeddings_0[u_idx]
            p_ego = self.embeddings_0[p_idx]
            n_ego = self.embeddings_0[n_idx]
            reg = 0.5 * (np.sum(u_ego**2) + np.sum(p_ego**2) + np.sum(n_ego**2))
            reg_losses.append(reg)
            valid_count += 1

        if valid_count == 0:
            return 0.0, 0.0

        # Average loss and gradient over the batch
        grad_E_star /= valid_count

        # Propagate back to E^(0): d(L)/d(E^(0)) = M^T @ grad_E_star = M @ grad_E_star
        grad_E_0 = M @ grad_E_star + reg_weight * self.embeddings_0

        # Gradient update with clipping
        np.clip(grad_E_0, -5.0, 5.0, out=grad_E_0)
        self.embeddings_0 -= learning_rate * grad_E_0

        return float(np.mean(loss_terms)), float(reg_weight * np.mean(reg_losses))
