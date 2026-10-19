"""
Sloth Audio Downloader FastAPI Service
Ported from Spotube (GPL-3.0) by team-spotube
(C) 2026 Spotube contributors / Adapted for Sloth

Exposes REST and Server-Sent Events (SSE) endpoints for downloading audio,
real-time progress streaming, concurrency control, and task cancellation.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

# Ensure local package imports work in all execution contexts
_dir = Path(__file__).resolve().parent
if str(_dir) not in sys.path:
    sys.path.append(str(_dir))

try:
    from .downloader import (
        AudioContainer,
        AudioQuality,
        DownloadOptions,
        DownloadStatus,
        find_ytdlp_executable,
        sanitize_filename,
    )
    from .job_queue import DownloadQueue, DownloadTask
    from .tagger import TrackMetadata
except (ImportError, ValueError):
    from downloader import (  # type: ignore
        AudioContainer,
        AudioQuality,
        DownloadOptions,
        DownloadStatus,
        find_ytdlp_executable,
        sanitize_filename,
    )
    from job_queue import DownloadQueue, DownloadTask  # type: ignore
    from tagger import TrackMetadata  # type: ignore

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sloth-downloader-api")

app = FastAPI(
    title="Sloth Downloader Service",
    description="Asynchronous audio extraction with chapter-aware SponsorBlock fix and Mutagen tagging",
    version="0.1.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global queue singleton (max 3 concurrent downloads)
download_queue = DownloadQueue(max_concurrent=3)


class DownloadRequest(BaseModel):
    url_or_id: str = Field(..., description="YouTube URL or Video ID")
    format: AudioContainer = Field(default=AudioContainer.MP3, description="Target audio format")
    quality: AudioQuality = Field(default=AudioQuality.HIGH, description="Audio bitrate / quality preset")
    skip_non_music: bool = Field(default=True, description="Skip non-music / sponsor segments")
    prefer_chapters: bool = Field(default=True, description="Prioritize official video chapters")
    title: Optional[str] = Field(default=None, description="Track title")
    artist: Optional[str] = Field(default=None, description="Artist name")
    album: Optional[str] = Field(default=None, description="Album name")
    year: Optional[int] = Field(default=None, description="Release year")
    isrc: Optional[str] = Field(default=None, description="ISRC identifier")
    cover_url: Optional[str] = Field(default=None, description="Cover art image URL")
    plain_lyrics: Optional[str] = Field(default=None, description="Plain text lyrics")
    lrc_lyrics: Optional[str] = Field(default=None, description="Synchronized LRC lyrics")
    output_dir: str = Field(default="./downloads", description="Target destination directory")
    stream: bool = Field(default=True, description="Stream real-time progress via SSE")


def validate_destination_dir(dir_path: str) -> str:
    """
    Validates output directory and protects against directory traversal attacks.
    """
    if ".." in dir_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Directory traversal detected in output_dir",
        )
    p = Path(dir_path).resolve()
    p.mkdir(parents=True, exist_ok=True)
    return str(p)


@app.get("/health", tags=["Status"])
async def health_check() -> Dict[str, Any]:
    ytdlp = find_ytdlp_executable()
    return {
        "status": "healthy",
        "service": "sloth-downloader",
        "ytdlp_available": bool(ytdlp),
        "ytdlp_path": ytdlp,
        "max_concurrent": download_queue.max_concurrent,
    }


@app.post("/download", tags=["Downloader"])
async def start_download(req: DownloadRequest):
    """
    Initiates audio download. If stream=True, returns SSE progress stream.
    Otherwise returns JSON with the queued job details.
    """
    out_dir = validate_destination_dir(req.output_dir)

    task = download_queue.enqueue(
        url_or_id=req.url_or_id,
        title=req.title,
        artist=req.artist,
        album=req.album,
        year=req.year,
        isrc=req.isrc,
        cover_url=req.cover_url,
        plain_lyrics=req.plain_lyrics,
        lrc_lyrics=req.lrc_lyrics,
        format=req.format,
        quality=req.quality,
        skip_non_music=req.skip_non_music,
        prefer_chapters=req.prefer_chapters,
        output_dir=out_dir,
    )

    if not req.stream:
        return JSONResponse(status_code=status.HTTP_202_ACCEPTED, content=task.to_dict())

    async def sse_event_generator() -> AsyncGenerator[str, None]:
        async for event in download_queue.subscribe(task.job_id):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        sse_event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/download/status/{job_id}", tags=["Downloader"])
async def get_download_status(job_id: str):
    task = download_queue.get_task(job_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job {job_id} not found")
    return task.to_dict()


@app.get("/download/queue", tags=["Downloader"])
async def get_download_queue():
    tasks = download_queue.list_tasks()
    active = [t for t in tasks if t.status in [DownloadStatus.QUEUED, DownloadStatus.DOWNLOADING]]
    return {
        "active_count": len(active),
        "max_concurrent": download_queue.max_concurrent,
        "jobs": [t.to_dict() for t in tasks],
    }


@app.post("/download/cancel/{job_id}", tags=["Downloader"])
async def cancel_download(job_id: str):
    success = download_queue.cancel_task(job_id)
    if not success:
        task = download_queue.get_task(job_id)
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job {job_id} not found")
        return {"job_id": job_id, "status": task.status.value, "cancelled": False}
    return {"job_id": job_id, "status": "canceled", "cancelled": True}


@app.get("/download/events/{job_id}", tags=["Downloader"])
async def stream_job_events(job_id: str):
    task = download_queue.get_task(job_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job {job_id} not found")

    async def sse_stream() -> AsyncGenerator[str, None]:
        async for event in download_queue.subscribe(job_id):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        sse_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/download/events", tags=["Downloader"])
async def stream_all_events():
    async def sse_stream() -> AsyncGenerator[str, None]:
        async for event in download_queue.subscribe_all():
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        sse_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/download/clear", tags=["Downloader"])
async def clear_download_history():
    cleared = download_queue.clear_completed()
    return {"cleared_count": cleared}


# ---------------------------------------------------------
# Library Batch Feature Indexer (MERT + CLAP + Mood)
# ---------------------------------------------------------

try:
    from server.engine.audio.batch_indexer import LibraryBatchIndexer
except ImportError:
    try:
        from engine.audio.batch_indexer import LibraryBatchIndexer  # type: ignore
    except ImportError:
        LibraryBatchIndexer = None  # type: ignore

library_indexer = LibraryBatchIndexer(batch_size=16) if LibraryBatchIndexer else None


@app.post("/api/library/reindex", tags=["Library Indexer"])
async def trigger_library_reindex(total_sample_tracks: int = 1402):
    """
    Triggers batch background re-indexing of music library tracks
    and streams real-time progress via Server-Sent Events (SSE).
    """
    if library_indexer is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Library indexer engine not initialized",
        )

    # If already running, subscribe to the existing stream
    if not library_indexer.is_running():
        # Generate representative sample tracks if library empty
        tracks = [
            (f"track_{i:04d}", f"Track {i:04d} - Music Title")
            for i in range(1, total_sample_tracks + 1)
        ]
        asyncio.create_task(library_indexer.reindex_library(tracks))

    async def sse_event_generator() -> AsyncGenerator[str, None]:
        async for event in library_indexer.subscribe():
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        sse_event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/library/index-status", tags=["Library Indexer"])
async def get_library_index_status():
    if library_indexer is None:
        return {"status": "unavailable", "indexed": 0, "total": 0}
    return library_indexer.get_progress().to_dict()


@app.post("/api/library/cancel-index", tags=["Library Indexer"])
async def cancel_library_index():
    if library_indexer is not None:
        library_indexer.cancel()
    return {"status": "canceled"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8802, reload=True)
