"""
Sloth Audio Feature Extraction Engine
Includes MERT music acoustic embeddings and CLAP cross-modal audio-text representations.
"""

from .mert_extractor import MERTExtractor
from .clap_extractor import CLAPExtractor

__all__ = ["MERTExtractor", "CLAPExtractor"]
