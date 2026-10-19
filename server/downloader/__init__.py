"""
Sloth Downloader & Metadata Tagger Package
Ported from Spotube (GPL-3.0) by team-spotube
(C) 2026 Spotube contributors / Adapted for Sloth
"""

from .downloader import (
    AudioContainer,
    AudioQuality,
    Downloader,
    DownloadOptions,
    DownloadResult,
    DownloadStatus,
    SkipSegment,
    find_ytdlp_executable,
    sanitize_filename,
)
from .job_queue import DownloadQueue, DownloadTask
from .tagger import AudioTagger, TrackMetadata, parse_lrc_to_synced_tuples

__all__ = [
    "AudioContainer",
    "AudioQuality",
    "Downloader",
    "DownloadOptions",
    "DownloadResult",
    "DownloadStatus",
    "SkipSegment",
    "sanitize_filename",
    "find_ytdlp_executable",
    "DownloadQueue",
    "DownloadTask",
    "AudioTagger",
    "TrackMetadata",
    "parse_lrc_to_synced_tuples",
]
