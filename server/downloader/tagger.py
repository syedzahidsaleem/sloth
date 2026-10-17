"""
Sloth Audio Metadata Tagger
Ported from Spotube (GPL-3.0) by team-spotube
(C) 2026 Spotube contributors / Adapted for Sloth

Embeds full ID3v2.4 / Vorbis / MP4 metadata including album art,
ISRC tags, USLT (unsynchronized), and SYLT (synchronized) lyrics using Mutagen.
"""

from __future__ import annotations

import logging
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional, Tuple

import mutagen
from mutagen.flac import FLAC, Picture as FLACPicture
from mutagen.id3 import (
    APIC,
    ID3,
    ID3NoHeaderError,
    SYLT,
    TALB,
    TDRC,
    TIT2,
    TPE1,
    TPE2,
    TRCK,
    TSRC,
    USLT,
    Encoding,
)
from mutagen.mp3 import MP3
from mutagen.mp4 import MP4, MP4Cover
from mutagen.oggopus import OggOpus

logger = logging.getLogger("sloth-tagger")


@dataclass
class TrackMetadata:
    title: str
    artist: str
    album: str
    album_artist: Optional[str] = None
    year: Optional[int] = None
    track_number: Optional[int] = None
    total_tracks: Optional[int] = None
    genre: Optional[str] = None
    isrc: Optional[str] = None
    cover_art_bytes: Optional[bytes] = None
    cover_art_mime: str = "image/jpeg"
    plain_lyrics: Optional[str] = None
    synced_lyrics: Optional[List[Tuple[str, int]]] = None  # List of (line_text, time_ms)


def parse_lrc_to_synced_tuples(raw_lrc: str) -> List[Tuple[str, int]]:
    """
    Parses a raw LRC string into a list of (text, milliseconds) tuples for SYLT embedding.
    """
    ts_regex = re.compile(r"\[(\d{1,2}):(\d{2})\.(\d{2,3})\]")
    items: List[Tuple[str, int]] = []

    for line in raw_lrc.split("\n"):
        line_clean = line.strip()
        if not line_clean or line_clean.startswith("[ti:") or line_clean.startswith("[ar:"):
            continue

        matches = list(ts_regex.finditer(line_clean))
        if not matches:
            continue

        text_only = ts_regex.sub("", line_clean).strip()

        for match in matches:
            m = int(match.group(1))
            s = int(match.group(2))
            ms_raw = match.group(3)
            ms = int(ms_raw) * (10 if len(ms_raw) == 2 else 1)
            total_ms = m * 60 * 1000 + s * 1000 + ms
            items.append((text_only, total_ms))

    # Sort chronologically
    items.sort(key=lambda x: x[1])
    return items


class AudioTagger:
    """
    Universal audio file tagger supporting MP3, FLAC, Ogg/Opus, and M4A.
    """

    @staticmethod
    def tag_file(file_path: str, meta: TrackMetadata) -> bool:
        """
        Dispatches to the correct tagging method based on file extension.
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Audio file not found: {file_path}")

        ext = path.suffix.lower()

        if ext == ".mp3":
            return AudioTagger.tag_mp3(file_path, meta)
        elif ext == ".flac":
            return AudioTagger.tag_flac(file_path, meta)
        elif ext in [".opus", ".ogg"]:
            return AudioTagger.tag_ogg_opus(file_path, meta)
        elif ext in [".m4a", ".mp4", ".aac"]:
            return AudioTagger.tag_mp4(file_path, meta)
        else:
            logger.warning(f"Unsupported format for metadata tagging: {ext}")
            return False

    @staticmethod
    def tag_mp3(file_path: str, meta: TrackMetadata) -> bool:
        """
        Tags MP3 files using ID3v2.4 frames, including TSRC, USLT, and SYLT.
        """
        try:
            try:
                audio = ID3(file_path)
            except ID3NoHeaderError:
                audio = ID3()

            # Core tags
            audio.add(TIT2(encoding=Encoding.UTF8, text=[meta.title]))
            audio.add(TPE1(encoding=Encoding.UTF8, text=[meta.artist]))
            audio.add(TALB(encoding=Encoding.UTF8, text=[meta.album]))

            album_artist = meta.album_artist or meta.artist
            audio.add(TPE2(encoding=Encoding.UTF8, text=[album_artist]))

            if meta.year:
                audio.add(TDRC(encoding=Encoding.UTF8, text=[str(meta.year)]))

            if meta.track_number:
                trck_str = str(meta.track_number)
                if meta.total_tracks:
                    trck_str += f"/{meta.total_tracks}"
                audio.add(TRCK(encoding=Encoding.UTF8, text=[trck_str]))

            # ISRC tag
            if meta.isrc:
                audio.add(TSRC(encoding=Encoding.UTF8, text=[meta.isrc]))

            # Cover Art
            if meta.cover_art_bytes:
                audio.add(
                    APIC(
                        encoding=Encoding.UTF8,
                        mime=meta.cover_art_mime,
                        type=3,  # Cover (front)
                        desc="Cover",
                        data=meta.cover_art_bytes,
                    )
                )

            # Unsynchronized Lyrics (USLT)
            if meta.plain_lyrics:
                audio.add(
                    USLT(
                        encoding=Encoding.UTF8,
                        lang="eng",
                        desc="",
                        text=meta.plain_lyrics,
                    )
                )

            # Synchronized Lyrics (SYLT)
            if meta.synced_lyrics:
                # Format: format=2 specifies milliseconds
                audio.add(
                    SYLT(
                        encoding=Encoding.UTF8,
                        lang="eng",
                        format=2,  # milliseconds
                        type=1,    # lyrics
                        desc="",
                        text=meta.synced_lyrics,
                    )
                )

            audio.save(file_path, v2_version=4)
            return True
        except Exception as e:
            logger.error(f"Error tagging MP3 {file_path}: {e}")
            return False

    @staticmethod
    def tag_flac(file_path: str, meta: TrackMetadata) -> bool:
        """
        Tags FLAC files with Vorbis comments and embedded Picture.
        """
        try:
            audio = FLAC(file_path)

            audio["TITLE"] = meta.title
            audio["ARTIST"] = meta.artist
            audio["ALBUM"] = meta.album
            audio["ALBUMARTIST"] = meta.album_artist or meta.artist

            if meta.year:
                audio["DATE"] = str(meta.year)
            if meta.track_number:
                audio["TRACKNUMBER"] = str(meta.track_number)
            if meta.total_tracks:
                audio["TRACKTOTAL"] = str(meta.total_tracks)
            if meta.isrc:
                audio["ISRC"] = meta.isrc
            if meta.plain_lyrics:
                audio["LYRICS"] = meta.plain_lyrics

            if meta.cover_art_bytes:
                pic = FLACPicture()
                pic.type = 3
                pic.mime = meta.cover_art_mime
                pic.desc = "Cover"
                pic.data = meta.cover_art_bytes
                audio.clear_pictures()
                audio.add_picture(pic)

            audio.save()
            return True
        except Exception as e:
            logger.error(f"Error tagging FLAC {file_path}: {e}")
            return False

    @staticmethod
    def tag_ogg_opus(file_path: str, meta: TrackMetadata) -> bool:
        """
        Tags Ogg Opus audio files.
        """
        try:
            audio = OggOpus(file_path)

            audio["TITLE"] = meta.title
            audio["ARTIST"] = meta.artist
            audio["ALBUM"] = meta.album
            audio["ALBUMARTIST"] = meta.album_artist or meta.artist

            if meta.year:
                audio["DATE"] = str(meta.year)
            if meta.track_number:
                audio["TRACKNUMBER"] = str(meta.track_number)
            if meta.isrc:
                audio["ISRC"] = meta.isrc
            if meta.plain_lyrics:
                audio["LYRICS"] = meta.plain_lyrics

            audio.save()
            return True
        except Exception as e:
            logger.error(f"Error tagging Ogg Opus {file_path}: {e}")
            return False

    @staticmethod
    def tag_mp4(file_path: str, meta: TrackMetadata) -> bool:
        """
        Tags MP4 / M4A files with iTunes metadata atoms.
        """
        try:
            audio = MP4(file_path)

            audio["\xa9nam"] = [meta.title]
            audio["\xa9ART"] = [meta.artist]
            audio["\xa9alb"] = [meta.album]
            audio["aART"] = [meta.album_artist or meta.artist]

            if meta.year:
                audio["\xa9day"] = [str(meta.year)]

            if meta.track_number:
                total = meta.total_tracks or 0
                audio["trkn"] = [(meta.track_number, total)]

            if meta.isrc:
                audio["----:com.apple.iTunes:ISRC"] = meta.isrc.encode("utf-8")

            if meta.plain_lyrics:
                audio["\xa9lyr"] = [meta.plain_lyrics]

            if meta.cover_art_bytes:
                image_format = (
                    MP4Cover.FORMAT_PNG
                    if "png" in meta.cover_art_mime.lower()
                    else MP4Cover.FORMAT_JPEG
                )
                audio["covr"] = [MP4Cover(meta.cover_art_bytes, imageformat=image_format)]

            audio.save()
            return True
        except Exception as e:
            logger.error(f"Error tagging MP4 {file_path}: {e}")
            return False
