"""
Sloth Graph Engine
Heterogeneous Hypergraph Convolution Network for Music Recommendation.
Combines LightGCN 2-layer aggregation, multi-node hypergraph incidence,
edge-dropout InfoNCE contrastive pretraining, and BPR ranking fine-tuning.
"""

from .schema import (
    CANONICAL_RELATIONS,
    CanonicalEdge,
    CanonicalEdgeType,
    HeteroGraphMeta,
    HeteroNodeType,
    Hyperedge,
    PRIMARY_NODE_TYPES,
)
from .builder import HeteroGraphData, SQLiteGraphBuilder
from .light_hgcn import HeteroHypergraph, LightHGCN
from .contrastive_pretrain import ContrastivePretrainer, TrainingMetrics
from .embeddings_store import (
    GraphEmbeddingsStore,
    deserialize_embedding,
    serialize_embedding,
)
from .training_runner import GraphTrainingRunner

__all__ = [
    "HeteroNodeType",
    "CanonicalEdgeType",
    "PRIMARY_NODE_TYPES",
    "CANONICAL_RELATIONS",
    "CanonicalEdge",
    "Hyperedge",
    "HeteroGraphMeta",
    "HeteroGraphData",
    "SQLiteGraphBuilder",
    "HeteroHypergraph",
    "LightHGCN",
    "ContrastivePretrainer",
    "TrainingMetrics",
    "GraphEmbeddingsStore",
    "serialize_embedding",
    "deserialize_embedding",
    "GraphTrainingRunner",
]
