"""
Sloth Audio Downloader & SponsorBlock Chapter Fix
Ported from Spotube (GPL-3.0) by team-spotube
(C) 2026 Spotube contributors / Adapted for Sloth

Orchestrates yt-dlp audio extraction, quality selection, concurrency queue,
and resolves the Spotube SponsorBlock clipping bug by prioritizing official yt-dlp chapters.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import shutil
import subprocess
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional
import urllib.request
import urllib.parse

logger = logging.getLogger("sloth-downloader")


class DownloadStatus(str, Enum):
    QUEUED = "queued"
    DOWNLOADING = "downloading"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELED = "canceled"


class AudioContainer(str, Enum):
    MP3 = "mp3"
    FLAC = "flac"
    OPUS = "opus"
    M4A = "m4a"


class AudioQuality(str, Enum):
    HIGH = "high"       # 320k or best lossless
    MEDIUM = "medium"   # 192k
    LOW = "low"         # 128k


@dataclass
class SkipSegment:
    start: float
    end: float
    category: str
    source: str  # "chapter" or "sponsorblock"


@dataclass
class DownloadOptions:
    output_dir: str = "./downloads"
    format: AudioContainer = AudioContainer.MP3
    quality: AudioQuality = AudioQuality.HIGH
    skip_non_music: bool = True
    prefer_chapters: bool = True
    ytdlp_path: Optional[str] = None


@dataclass
class DownloadResult:
    video_id: str
    title: str
    file_path: str
    format: str
    duration: float
    skip_segments: List[SkipSegment] = field(default_factory=list)
    success: bool = True
    error: Optional[str] = None


def sanitize_filename(filename: str) -> str:
    """
    Sanitizes a filename to avoid path traversal and invalid characters.
    """
    # Remove directory traversal prefixes
    clean = filename.replace("\\", "/")
    clean = re.sub(r"^(\.\./|\./)+", "", clean)
    clean = re.sub(r"[\\/:*?\"<>|]", "_", clean)
    clean = re.sub(r"\.\.+", "", clean)
    clean = clean.strip(" ._")
    return clean or "unnamed_track"


def find_ytdlp_executable(custom_path: Optional[str] = None) -> str:
    """
    Locates the yt-dlp executable on PATH or custom path.
    """
    if custom_path and os.path.isfile(custom_path):
        return custom_path

    # Try shutil.which
    found = shutil.which("yt-dlp")
    if found:
        return found

    # Windows fallback common locations
    candidates = [
        "yt-dlp.exe",
        "yt-dlp",
        os.path.expanduser("~/yt-dlp.exe"),
        os.path.expanduser("~/yt-dlp"),
    ]
    for c in candidates:
        if shutil.which(c):
            return shutil.which(c)  # type: ignore

    return "yt-dlp"


class Downloader:
    """
    Downloader wrapper around yt-dlp with chapter extraction and SponsorBlock fallback.
    """

    def __init__(self, ytdlp_path: Optional[str] = None):
        self.ytdlp_path = find_ytdlp_executable(ytdlp_path)

    def extract_info(self, url_or_id: str) -> Dict[str, Any]:
        """
        Extracts video metadata and official chapters via yt-dlp --dump-json.
        Uses subprocess with shell=False for security.
        """
        video_url = (
            url_or_id
            if url_or_id.startswith("http://") or url_or_id.startswith("https://")
            else f"https://www.youtube.com/watch?v={url_or_id}"
        )

        args = [
            self.ytdlp_path,
            "--dump-json",
            "--no-playlist",
            "--skip-download",
            "--no-check-certificates",
            "--geo-bypass",
            "--quiet",
            video_url,
        ]

        proc = subprocess.run(
            args,
            shell=False,
            capture_output=True,
            text=True,
            timeout=60,
        )

        if proc.returncode != 0:
            raise RuntimeError(f"yt-dlp info extraction failed: {proc.stderr.strip()}")

        try:
            return json.loads(proc.stdout)
        except json.JSONDecodeError as e:
            raise RuntimeError(f"Failed to parse yt-dlp JSON output: {e}")

    def resolve_skip_segments(
        self,
        video_id: str,
        video_info: Optional[Dict[str, Any]] = None,
        prefer_chapters: bool = True,
    ) -> List[SkipSegment]:
        """
        Resolves non-music / sponsor segments.

        SPOTUBE BUG FIX:
        Spotube truncates SponsorBlock segment boundaries to integer seconds (.toInt())
        and adds an arbitrary +1s offset, chopping the music.
        Furthermore, it completely ignores official yt-dlp chapters.

        Sloth:
        1. Checks official creator chapters first (e.g. Intro, Outro, Sponsors, Intermission).
        2. If official chapters exist and mark non-music, uses exact float boundaries.
        3. If no chapters exist, queries SponsorBlock maintaining exact float precision.
        """
        segments: List[SkipSegment] = []

        # 1. Check official chapters from yt-dlp info
        if prefer_chapters and video_info and "chapters" in video_info and video_info["chapters"]:
            chapters = video_info["chapters"]
            non_music_pattern = re.compile(
                r"\b(intro|outro|sponsor|credits|intermission|preview|promo|subscribe)\b",
                re.IGNORECASE,
            )

            for chapter in chapters:
                title = chapter.get("title", "")
                if non_music_pattern.search(title):
                    segments.append(
                        SkipSegment(
                            start=float(chapter.get("start_time", 0.0)),
                            end=float(chapter.get("end_time", 0.0)),
                            category=title,
                            source="chapter",
                        )
                    )

            if segments:
                logger.info(f"Resolved {len(segments)} exact skip segments from official chapters")
                return segments

        # 2. Fallback to SponsorBlock API with sub-second float precision
        try:
            query_params = urllib.parse.urlencode(
                {
                    "videoID": video_id,
                    "category": json.dumps(["sponsor", "selfpromo", "interaction", "intro", "outro", "music_offtopic"]),
                    "actionType": "skip",
                }
            )
            # Reconstruct array param style for SponsorBlock
            sb_url = f"https://sponsor.ajay.app/api/skipSegments?videoID={urllib.parse.quote(video_id)}&category=%5B%22sponsor%22,%22selfpromo%22,%22interaction%22,%22intro%22,%22outro%22,%22music_offtopic%22%5D&actionType=skip"

            req = urllib.request.Request(
                sb_url,
                headers={"User-Agent": "Sloth-Music-Player/1.0 (SponsorBlock-Fixed)"},
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    if isinstance(data, list):
                        for item in data:
                            segment_bounds = item.get("segment", [])
                            if len(segment_bounds) >= 2:
                                # Retain exact floating-point precision, no integer truncation!
                                start_sec = float(segment_bounds[0])
                                end_sec = float(segment_bounds[1])
                                category = item.get("category", "sponsor")
                                segments.append(
                                    SkipSegment(
                                        start=start_sec,
                                        end=end_sec,
                                        category=category,
                                        source="sponsorblock",
                                    )
                                )
        except Exception as e:
            logger.debug(f"SponsorBlock lookup returned no segments or timed out: {e}")

        return segments

    def download_track(
        self,
        url_or_id: str,
        options: Optional[DownloadOptions] = None,
        progress_callback: Optional[Callable[[float], None]] = None,
    ) -> DownloadResult:
        """
        Downloads and converts the audio track into the desired format using yt-dlp.
        """
        opts = options or DownloadOptions()
        out_dir = Path(opts.output_dir).resolve()
        out_dir.mkdir(parents=True, exist_ok=True)

        info = self.extract_info(url_or_id)
        video_id = info.get("id", "track")
        raw_title = info.get("title", "Untitled Track")
        uploader = info.get("uploader", "Unknown Artist")
        duration = float(info.get("duration", 0.0))

        clean_name = sanitize_filename(f"{raw_title} - {uploader}")
        target_path = (out_dir / clean_name).resolve()

        # Enforce directory traversal security
        try:
            target_path.relative_to(out_dir)
        except ValueError:
            raise PermissionError("Directory traversal detected in destination path")

        target_stem = str(target_path)
        final_file_path = f"{target_stem}.{opts.format.value}"

        # Resolve skip segments
        skip_segments: List[SkipSegment] = []
        if opts.skip_non_music:
            skip_segments = self.resolve_skip_segments(
                video_id=video_id,
                video_info=info,
                prefer_chapters=opts.prefer_chapters,
            )

        # Quality mapping
        quality_map = {
            AudioQuality.HIGH: "0",    # best quality
            AudioQuality.MEDIUM: "5",  # 192kbps approx
            AudioQuality.LOW: "9",     # 128kbps approx
        }
        audio_quality_val = quality_map.get(opts.quality, "0")

        # Build yt-dlp arguments
        video_url = (
            url_or_id
            if url_or_id.startswith("http://") or url_or_id.startswith("https://")
            else f"https://www.youtube.com/watch?v={url_or_id}"
        )

        args = [
            self.ytdlp_path,
            "--no-playlist",
            "--extract-audio",
            "--audio-format",
            opts.format.value,
            "--audio-quality",
            audio_quality_val,
            "--max-filesize",
            "300M",
            "--newline",
            "--output",
            f"{target_stem}.%(ext)s",
            "--no-check-certificates",
            "--geo-bypass",
            video_url,
        ]

        # Execute yt-dlp with progress parsing
        proc = subprocess.Popen(
            args,
            shell=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True,
        )

        output_lines = []
        if proc.stdout:
            for line in iter(proc.stdout.readline, ""):
                output_lines.append(line)
                if progress_callback:
                    m = re.search(r"(\d+(?:\.\d+)?)%", line)
                    if m:
                        try:
                            pct = float(m.group(1)) / 100.0
                            spd = re.search(r"at\s+([~0-9\.]+[kMG]?i?B/s)", line)
                            eta = re.search(r"ETA\s+(\d+:\d+)", line)
                            speed_str = spd.group(1) if spd else None
                            eta_str = eta.group(1) if eta else None
                            try:
                                progress_callback({"progress": pct, "speed": speed_str, "eta": eta_str})
                            except TypeError:
                                progress_callback(pct)
                        except Exception:
                            pass
            proc.stdout.close()
        proc.wait(timeout=300)

        if proc.returncode != 0:
            return DownloadResult(
                video_id=video_id,
                title=raw_title,
                file_path=final_file_path,
                format=opts.format.value,
                duration=duration,
                success=False,
                error="".join(output_lines).strip() or "yt-dlp process returned non-zero code",
            )

        # Ensure file exists
        if not os.path.exists(final_file_path):
            # Check if extension differed slightly (e.g. opus vs ogg)
            for file_name in os.listdir(out_dir):
                if file_name.startswith(clean_name):
                    final_file_path = str(out_dir / file_name)
                    break

        # Check 300MB maximum file size limit
        if os.path.exists(final_file_path):
            file_size = os.path.getsize(final_file_path)
            if file_size > 300 * 1024 * 1024:
                try:
                    os.remove(final_file_path)
                except OSError:
                    pass
                return DownloadResult(
                    video_id=video_id,
                    title=raw_title,
                    file_path="",
                    format=opts.format.value,
                    duration=duration,
                    success=False,
                    error="File size exceeds maximum allowed 300MB limit",
                )

        return DownloadResult(
            video_id=video_id,
            title=raw_title,
            file_path=final_file_path,
            format=opts.format.value,
            duration=duration,
            skip_segments=skip_segments,
            success=True,
        )


class DownloadQueueManager:
    """
    Thread-safe concurrency queue manager for downloads.
    """

    def __init__(self, max_concurrent: int = 3, ytdlp_path: Optional[str] = None):
        self.max_concurrent = max_concurrent
        self.downloader = Downloader(ytdlp_path)
        self.tasks: Dict[str, Dict[str, Any]] = {}
        self.semaphore = asyncio.Semaphore(max_concurrent)

    def add_task(self, video_id: str, options: Optional[DownloadOptions] = None) -> str:
        self.tasks[video_id] = {
            "status": DownloadStatus.QUEUED,
            "options": options or DownloadOptions(),
            "result": None,
            "error": None,
        }
        return video_id

    async def run_task(self, video_id: str) -> DownloadResult:
        task = self.tasks.get(video_id)
        if not task:
            raise KeyError(f"Task {video_id} not found in queue")

        async with self.semaphore:
            task["status"] = DownloadStatus.DOWNLOADING
            loop = asyncio.get_event_loop()
            try:
                result = await loop.run_in_executor(
                    None,
                    self.downloader.download_track,
                    video_id,
                    task["options"],
                )
                if result.success:
                    task["status"] = DownloadStatus.COMPLETED
                    task["result"] = result
                else:
                    task["status"] = DownloadStatus.FAILED
                    task["error"] = result.error
                return result
            except Exception as e:
                task["status"] = DownloadStatus.FAILED
                task["error"] = str(e)
                raise
