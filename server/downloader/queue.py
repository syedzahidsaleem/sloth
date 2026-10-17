"""
Sloth Download Concurrency Queue Manager
Ported from Spotube (GPL-3.0) by team-spotube
(C) 2026 Spotube contributors / Adapted for Sloth

Manages asynchronous download jobs with max 3 concurrent workers,
unique UUID tracking, event emitters for SSE progress streaming,
and cancellation support.
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
import urllib.request
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, AsyncGenerator, Callable, Dict, List, Optional

from .downloader import (
    AudioContainer,
    AudioQuality,
    Downloader,
    DownloadOptions,
    DownloadResult,
    DownloadStatus,
    sanitize_filename,
)
from .tagger import AudioTagger, TrackMetadata, parse_lrc_to_synced_tuples

logger = logging.getLogger("sloth-download-queue")


@dataclass
class DownloadTask:
    job_id: str
    url_or_id: str
    title: str = "Unknown Title"
    artist: str = "Unknown Artist"
    album: str = "Unknown Album"
    year: Optional[int] = None
    isrc: Optional[str] = None
    cover_url: Optional[str] = None
    plain_lyrics: Optional[str] = None
    lrc_lyrics: Optional[str] = None
    format: AudioContainer = AudioContainer.MP3
    quality: AudioQuality = AudioQuality.HIGH
    skip_non_music: bool = True
    prefer_chapters: bool = True
    output_dir: str = "./downloads"
    status: DownloadStatus = DownloadStatus.QUEUED
    progress: float = 0.0
    speed: Optional[str] = None
    eta: Optional[str] = None
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    error: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    completed_at: Optional[float] = None
    cancel_event: asyncio.Event = field(default_factory=asyncio.Event)
    _subscribers: List[asyncio.Queue] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "job_id": self.job_id,
            "url_or_id": self.url_or_id,
            "title": self.title,
            "artist": self.artist,
            "album": self.album,
            "year": self.year,
            "isrc": self.isrc,
            "cover_url": self.cover_url,
            "format": self.format.value,
            "quality": self.quality.value,
            "status": self.status.value,
            "progress": round(self.progress, 4),
            "speed": self.speed,
            "eta": self.eta,
            "file_path": self.file_path,
            "file_size": self.file_size,
            "error": self.error,
            "created_at": self.created_at,
            "completed_at": self.completed_at,
        }


class DownloadQueue:
    """
    Thread-safe concurrency queue manager for downloads.
    Enforces maximum of 3 concurrent downloads and handles cancellation.
    """

    def __init__(self, max_concurrent: int = 3, ytdlp_path: Optional[str] = None):
        self.max_concurrent = max_concurrent
        self.downloader = Downloader(ytdlp_path)
        self.tasks: Dict[str, DownloadTask] = {}
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self._global_subscribers: List[asyncio.Queue] = []
        self._lock = asyncio.Lock()

    def enqueue(
        self,
        url_or_id: str,
        title: Optional[str] = None,
        artist: Optional[str] = None,
        album: Optional[str] = None,
        year: Optional[int] = None,
        isrc: Optional[str] = None,
        cover_url: Optional[str] = None,
        plain_lyrics: Optional[str] = None,
        lrc_lyrics: Optional[str] = None,
        format: AudioContainer = AudioContainer.MP3,
        quality: AudioQuality = AudioQuality.HIGH,
        skip_non_music: bool = True,
        prefer_chapters: bool = True,
        output_dir: str = "./downloads",
    ) -> DownloadTask:
        job_id = uuid.uuid4().hex[:12]

        task = DownloadTask(
            job_id=job_id,
            url_or_id=url_or_id,
            title=title or "Track",
            artist=artist or "Artist",
            album=album or "Album",
            year=year,
            isrc=isrc,
            cover_url=cover_url,
            plain_lyrics=plain_lyrics,
            lrc_lyrics=lrc_lyrics,
            format=format,
            quality=quality,
            skip_non_music=skip_non_music,
            prefer_chapters=prefer_chapters,
            output_dir=output_dir,
            status=DownloadStatus.QUEUED,
        )

        self.tasks[job_id] = task
        self._notify_subscribers(task, event_type="queued")

        # Spawn processing coroutine in the running loop
        asyncio.create_task(self._process_task(task))
        return task

    def get_task(self, job_id: str) -> Optional[DownloadTask]:
        return self.tasks.get(job_id)

    def list_tasks(self) -> List[DownloadTask]:
        return sorted(list(self.tasks.values()), key=lambda t: t.created_at, reverse=True)

    def cancel_task(self, job_id: str) -> bool:
        task = self.tasks.get(job_id)
        if not task:
            return False

        if task.status in [DownloadStatus.COMPLETED, DownloadStatus.FAILED, DownloadStatus.CANCELED]:
            return False

        task.status = DownloadStatus.CANCELED
        task.cancel_event.set()
        task.completed_at = time.time()
        self._notify_subscribers(task, event_type="canceled")
        return True

    def clear_completed(self) -> int:
        to_remove = [
            jid
            for jid, task in self.tasks.items()
            if task.status in [DownloadStatus.COMPLETED, DownloadStatus.FAILED, DownloadStatus.CANCELED]
        ]
        for jid in to_remove:
            del self.tasks[jid]
        return len(to_remove)

    def _notify_subscribers(self, task: DownloadTask, event_type: str = "progress") -> None:
        data = {
            "event": event_type,
            "job_id": task.job_id,
            "status": task.status.value,
            "progress": round(task.progress, 4),
            "speed": task.speed,
            "eta": task.eta,
            "title": task.title,
            "artist": task.artist,
            "file_path": task.file_path,
            "error": task.error,
        }

        # Notify task-specific subscribers
        dead_subs = []
        for q in task._subscribers:
            try:
                q.put_nowait(data)
            except asyncio.QueueFull:
                pass
            except Exception:
                dead_subs.append(q)
        for d in dead_subs:
            task._subscribers.remove(d)

        # Notify global queue subscribers
        dead_global = []
        for gq in self._global_subscribers:
            try:
                gq.put_nowait(data)
            except asyncio.QueueFull:
                pass
            except Exception:
                dead_global.append(gq)
        for dg in dead_global:
            self._global_subscribers.remove(dg)

    async def subscribe(self, job_id: str) -> AsyncGenerator[Dict[str, Any], None]:
        task = self.tasks.get(job_id)
        if not task:
            yield {"event": "error", "message": f"Job {job_id} not found"}
            return

        q: asyncio.Queue = asyncio.Queue(maxsize=100)
        task._subscribers.append(q)

        # Emit initial state immediately
        yield {
            "event": "state",
            "job_id": task.job_id,
            "status": task.status.value,
            "progress": round(task.progress, 4),
            "speed": task.speed,
            "eta": task.eta,
            "title": task.title,
            "artist": task.artist,
            "file_path": task.file_path,
            "error": task.error,
        }

        try:
            while True:
                msg = await q.get()
                yield msg
                if msg.get("status") in [
                    DownloadStatus.COMPLETED.value,
                    DownloadStatus.FAILED.value,
                    DownloadStatus.CANCELED.value,
                ]:
                    break
        finally:
            if q in task._subscribers:
                task._subscribers.remove(q)

    async def subscribe_all(self) -> AsyncGenerator[Dict[str, Any], None]:
        q: asyncio.Queue = asyncio.Queue(maxsize=200)
        self._global_subscribers.append(q)

        try:
            while True:
                msg = await q.get()
                yield msg
        finally:
            if q in self._global_subscribers:
                self._global_subscribers.remove(q)

    async def _process_task(self, task: DownloadTask) -> None:
        if task.cancel_event.is_set() or task.status == DownloadStatus.CANCELED:
            return

        async with self.semaphore:
            if task.cancel_event.is_set() or task.status == DownloadStatus.CANCELED:
                return

            task.status = DownloadStatus.DOWNLOADING
            task.progress = 0.05
            self._notify_subscribers(task, event_type="downloading")

            options = DownloadOptions(
                output_dir=task.output_dir,
                format=task.format,
                quality=task.quality,
                skip_non_music=task.skip_non_music,
                prefer_chapters=task.prefer_chapters,
            )

            loop = asyncio.get_running_loop()

            def progress_callback(update: Any) -> None:
                if task.cancel_event.is_set():
                    return

                if isinstance(update, dict):
                    task.progress = float(update.get("progress", task.progress))
                    task.speed = update.get("speed")
                    task.eta = update.get("eta")
                elif isinstance(update, (int, float)):
                    task.progress = float(update)

                self._notify_subscribers(task, event_type="progress")

            try:
                # Run blocking yt-dlp execution in executor
                result = await loop.run_in_executor(
                    None,
                    self.downloader.download_track,
                    task.url_or_id,
                    options,
                    progress_callback,
                )
                if asyncio.iscoroutine(result):
                    result = await result

                if task.cancel_event.is_set():
                    task.status = DownloadStatus.CANCELED
                    task.completed_at = time.time()
                    self._notify_subscribers(task, event_type="canceled")
                    return

                if not result.success:
                    task.status = DownloadStatus.FAILED
                    task.error = result.error or "Download failed"
                    task.completed_at = time.time()
                    self._notify_subscribers(task, event_type="failed")
                    return

                task.file_path = result.file_path
                task.title = result.title or task.title

                # Fetch Cover Art bytes if provided
                cover_bytes: Optional[bytes] = None
                if task.cover_url:
                    try:
                        req = urllib.request.Request(
                            task.cover_url,
                            headers={"User-Agent": "Sloth/0.1.0"},
                        )
                        with urllib.request.urlopen(req, timeout=10) as resp:
                            cover_bytes = resp.read()
                    except Exception as e:
                        logger.warning(f"Could not download cover art: {e}")

                # Synced lyrics parsing
                synced_tuples = None
                if task.lrc_lyrics:
                    synced_tuples = parse_lrc_to_synced_tuples(task.lrc_lyrics)

                # Mutagen Metadata Tagging
                metadata = TrackMetadata(
                    title=task.title,
                    artist=task.artist,
                    album=task.album,
                    year=task.year,
                    isrc=task.isrc,
                    cover_art_bytes=cover_bytes,
                    plain_lyrics=task.plain_lyrics,
                    synced_lyrics=synced_tuples,
                )

                if os.path.exists(result.file_path):
                    tag_success = await loop.run_in_executor(
                        None,
                        AudioTagger.tag_file,
                        result.file_path,
                        metadata,
                    )
                    if not tag_success:
                        logger.warning(f"Metadata tagging was partially unsuccessful for {result.file_path}")

                    try:
                        task.file_size = os.path.getsize(result.file_path)
                    except OSError:
                        pass

                task.status = DownloadStatus.COMPLETED
                task.progress = 1.0
                task.completed_at = time.time()
                self._notify_subscribers(task, event_type="completed")

            except Exception as e:
                logger.error(f"Download task error for {task.job_id}: {e}", exc_info=True)
                task.status = DownloadStatus.FAILED
                task.error = str(e)
                task.completed_at = time.time()
                self._notify_subscribers(task, event_type="failed")
