"""
Sloth Graph Engine - HeteroGraph Schema
Defines 5-node heterogeneous graph types, canonical relations, and hyperedge specifications
adapted for music recommendation.

Nodes:
  - user
  - track
  - artist
  - playlist
  - context (listening context: time of day, session mood, activity)
  - album (retained for backward compatibility and discography relations)

Edges:
  - (user, listened, track) & (track, listened_by, user)
  - (track, in_playlist, playlist) & (playlist, contains_track, track)
  - (track, by_artist, artist) & (artist, created_track, track)
  - (artist, same_genre, artist)
  - (track, same_mood, track)
  - (artist, collaborated, artist)
  - (user, session_context, context) & (context, context_of, track)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple


class HeteroNodeType(str, Enum):
    USER = "user"
    TRACK = "track"
    ARTIST = "artist"
    PLAYLIST = "playlist"
    CONTEXT = "context"
    ALBUM = "album"  # Backwards compatibility and discography hyperedges


class CanonicalEdgeType(str, Enum):
    LISTENED = "listened"
    LISTENED_BY = "listened_by"
    IN_PLAYLIST = "in_playlist"
    CONTAINS_TRACK = "contains_track"
    BY_ARTIST = "by_artist"
    CREATED_TRACK = "created_track"
    SAME_GENRE = "same_genre"
    SAME_MOOD = "same_mood"
    COLLABORATED = "collaborated"
    SESSION_CONTEXT = "session_context"
    CONTEXT_OF = "context_of"


# Core 5 node types
PRIMARY_NODE_TYPES: List[HeteroNodeType] = [
    HeteroNodeType.USER,
    HeteroNodeType.TRACK,
    HeteroNodeType.ARTIST,
    HeteroNodeType.PLAYLIST,
    HeteroNodeType.CONTEXT,
]

# Canonical DGL relation triplets: (src_type, edge_type, dst_type)
CANONICAL_RELATIONS: List[Tuple[str, str, str]] = [
    ("user", "listened", "track"),
    ("track", "listened_by", "user"),
    ("track", "in_playlist", "playlist"),
    ("playlist", "contains_track", "track"),
    ("track", "by_artist", "artist"),
    ("artist", "created_track", "track"),
    ("artist", "same_genre", "artist"),
    ("track", "same_mood", "track"),
    ("artist", "collaborated", "artist"),
    ("user", "session_context", "context"),
    ("context", "context_of", "track"),
    # Discography extensions
    ("track", "in_album", "album"),
    ("album", "has_track", "track"),
    ("album", "by_artist", "artist"),
]


@dataclass(frozen=True)
class NodeRef:
    node_type: HeteroNodeType
    node_id: str

    def as_tuple(self) -> Tuple[HeteroNodeType, str]:
        return (self.node_type, self.node_id)


@dataclass
class CanonicalEdge:
    src_type: str
    edge_type: str
    dst_type: str
    src_id: str
    dst_id: str
    weight: float = 1.0


@dataclass
class Hyperedge:
    """
    Music Hyperedge representing n-ary group relations
    (e.g., listening session, co-occurring playlist tracks, album discography).
    """
    id: str
    edge_type: str  # "session", "playlist", "album_discography", "mood_cluster", "genre_cluster"
    weight: float = 1.0
    nodes: Set[Tuple[HeteroNodeType, str]] = field(default_factory=set)

    def add_node(self, node_type: HeteroNodeType, node_id: str) -> None:
        self.nodes.add((node_type, str(node_id)))


@dataclass
class HeteroGraphMeta:
    """
    Metadata summarizing graph cardinality and relation distributions.
    """
    num_nodes_by_type: Dict[str, int] = field(default_factory=dict)
    num_edges_by_relation: Dict[Tuple[str, str, str], int] = field(default_factory=dict)
    num_hyperedges: int = 0
    total_nodes: int = 0
    total_edges: int = 0


def get_dgl_relation_schema() -> Dict[Tuple[str, str, str], Any]:
    """
    Returns relation schema dictionary formatted for DGL HeteroGraph initialization.
    """
    return {rel: [] for rel in CANONICAL_RELATIONS}
