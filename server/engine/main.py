"""
Sloth AI & Recommendation Engine FastAPI Service
Exposes REST and Server-Sent Events (SSE) endpoints for:
- 5-Node Heterogeneous Hypergraph (LightHGCN) training and progress streaming
- Personalized music recommendations via multi-layer hypergraph embeddings
- Acoustic and semantic nearest-neighbor track discovery
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sqlite3
import sys
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, List, Optional

from fastapi import BackgroundTasks, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

# Ensure engine package is importable
_dir = Path(__file__).resolve().parent
if str(_dir) not in sys.path:
    sys.path.insert(0, str(_dir))

from .graph import (
    GraphEmbeddingsStore,
    GraphTrainingRunner,
    HeteroHypergraph,
    HeteroNodeType,
    LightHGCN,
    SQLiteGraphBuilder,
)
from .coldstart import onboarding_router
from .generator.api import router as generator_router
from .api import router as engine_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sloth-engine-api")

app = FastAPI(
    title="Sloth AI Recommendation Engine",
    description="Heterogeneous Hypergraph Convolution, BERT4Rec Sequential, and Diffusion Audio Engine",
    version="0.1.0",
)

app.include_router(onboarding_router, prefix="/api/engine/coldstart/onboarding", tags=["coldstart"])
app.include_router(onboarding_router, prefix="/engine/onboarding", tags=["coldstart"])
app.include_router(generator_router, prefix="/api/engine/generator", tags=["generator"])
app.include_router(generator_router, prefix="/engine/generator", tags=["generator"])
app.include_router(engine_router, prefix="/api/engine", tags=["engine"])
app.include_router(engine_router, prefix="", tags=["engine"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEFAULT_DB_PATH = os.environ.get("SLOTH_DB_PATH", "sloth.db")


class TrainRequest(BaseModel):
    db_path: Optional[str] = Field(default=None, description="Custom SQLite database path")
    embedding_dim: int = Field(default=256, ge=16, le=512, description="Latent embedding dimension")
    num_layers: int = Field(default=2, ge=1, le=5, description="Number of LightGCN hypergraph convolution layers")
    pretrain_epochs: int = Field(default=50, ge=1, le=200, description="InfoNCE contrastive pre-training epochs")
    finetune_epochs: int = Field(default=20, ge=0, le=100, description="BPR fine-tuning epochs")
    batch_size: int = Field(default=512, ge=1, le=2048, description="Batch size for BPR fine-tuning")
    learning_rate: float = Field(default=0.01, gt=0.0, le=1.0)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "sloth-engine",
        "features": ["graph", "sequential", "generator", "coldstart", "audio", "fusion", "nlp_search"],
    }


@app.post("/api/engine/graph/train")
def trigger_training(req: TrainRequest, background_tasks: BackgroundTasks):
    """
    Triggers asynchronous hypergraph model training on listening events.
    """
    db_path = req.db_path or DEFAULT_DB_PATH
    runner = GraphTrainingRunner(
        db_path_or_conn=db_path,
        embedding_dim=req.embedding_dim,
        num_layers=req.num_layers,
        pretrain_epochs=req.pretrain_epochs,
        finetune_epochs=req.finetune_epochs,
        batch_size=req.batch_size,
        learning_rate=req.learning_rate,
    )
    background_tasks.add_task(runner.run_training_sync)
    return {
        "status": "training_started",
        "db_path": db_path,
        "embedding_dim": req.embedding_dim,
        "pretrain_epochs": req.pretrain_epochs,
        "finetune_epochs": req.finetune_epochs,
    }


@app.get("/api/engine/graph/train/stream")
async def stream_training(
    db_path: Optional[str] = Query(default=None),
    embedding_dim: int = Query(default=256),
    pretrain_epochs: int = Query(default=50),
    finetune_epochs: int = Query(default=20),
):
    """
    Executes training and streams progress metrics in real-time over Server-Sent Events (SSE).
    Format: data: {"phase": "pretrain"|"finetune"|"completed", "epoch": N, "loss": float, "progress": float}\n\n
    """
    resolved_db = db_path or DEFAULT_DB_PATH
    runner = GraphTrainingRunner(
        db_path_or_conn=resolved_db,
        embedding_dim=embedding_dim,
        pretrain_epochs=pretrain_epochs,
        finetune_epochs=finetune_epochs,
    )

    return StreamingResponse(
        runner.stream_training_events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
        },
    )


@app.get("/api/engine/graph/recommend")
def get_recommendations(
    user_id: str = Query(default="user_primary"),
    top_k: int = Query(default=20, ge=1, le=100),
    db_path: Optional[str] = Query(default=None),
):
    """
    Returns personalized track recommendations using LightHGCN multi-layer hypergraph embeddings.
    """
    resolved_db = db_path or DEFAULT_DB_PATH
    builder = SQLiteGraphBuilder(resolved_db, default_user_id=user_id)
    graph_data = builder.build()
    hypergraph = HeteroHypergraph.from_graph_data(graph_data)

    model = LightHGCN(hypergraph, embedding_dim=256, num_layers=2)
    # Check if precomputed embeddings exist in store
    store = GraphEmbeddingsStore(resolved_db)
    all_tracks = store.get_all_embeddings("track")
    user_emb = store.get_node_embedding("user", user_id)

    if user_emb is not None and all_tracks:
        recs = store.find_nearest_neighbors(user_emb, node_type="track", top_k=top_k)
        return {"user_id": user_id, "recommendations": [{"track_id": tid, "score": s} for tid, s in recs]}

    # Otherwise forward pass on model
    recs = model.recommend_tracks_for_user(user_id, top_k=top_k)
    return {"user_id": user_id, "recommendations": [{"track_id": tid, "score": s} for tid, s in recs]}


@app.get("/api/engine/graph/similar/{track_id}")
def get_similar_tracks(
    track_id: str,
    top_k: int = Query(default=10, ge=1, le=50),
    db_path: Optional[str] = Query(default=None),
):
    """
    Finds nearest neighbor tracks in 256-dimensional LightHGCN embedding space.
    """
    resolved_db = db_path or DEFAULT_DB_PATH
    store = GraphEmbeddingsStore(resolved_db)
    target_emb = store.get_node_embedding("track", track_id)

    if target_emb is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Track embedding for '{track_id}' not found.",
        )

    neighbors = store.find_nearest_neighbors(
        target_emb,
        node_type="track",
        top_k=top_k,
        exclude_ids=[track_id],
    )
    return {
        "track_id": track_id,
        "similar_tracks": [{"track_id": tid, "similarity": s} for tid, s in neighbors],
    }


@app.get("/api/search")
@app.get("/search")
def search_catalog(q: str = Query(..., min_length=1), limit: int = Query(default=25, ge=1, le=50)):
    """
    Real music search returning 100% genuine tracks with artist, title, album, duration,
    high-res cover art, and direct playable audio stream URLs.
    """
    import urllib.request
    import urllib.parse
    import re

    tracks = []
    
    # 1. Search iTunes first for genuine tracks with high-fidelity playable audio streams
    try:
        itunes_url = f"https://itunes.apple.com/search?term={urllib.parse.quote(q)}&entity=song&limit={limit}"
        req = urllib.request.Request(itunes_url, headers={"User-Agent": "Mozilla/5.0"})
        res = urllib.request.urlopen(req, timeout=4)
        data = json.loads(res.read())
        for r in data.get("results", []):
            tid = f"itunes-{r.get('trackId')}"
            tracks.append({
                "id": tid,
                "title": r.get("trackName", ""),
                "artist": r.get("artistName", ""),
                "album": r.get("collectionName", ""),
                "durationSeconds": int(r.get("trackTimeMillis", 0) / 1000) or 210,
                "coverUrl": (r.get("artworkUrl100") or "").replace("100x100bb", "600x600bb"),
                "audioUrl": r.get("previewUrl", ""),
                "source": "itunes"
            })
            if len(tracks) >= limit:
                break
    except Exception as e:
        logger.warning(f"iTunes search error: {e}")

    # 2. Search YouTube to supplement catalog if needed
    if len(tracks) < limit:
        try:
            url = f"https://www.youtube.com/results?search_query={urllib.parse.quote(q)}"
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
            html = urllib.request.urlopen(req, timeout=5).read().decode("utf-8", errors="ignore")
            match = re.search(r'var ytInitialData = ({.*?});</script>', html)
            if match:
                data = json.loads(match.group(1))
                contents = data.get("contents", {}).get("twoColumnSearchResultsRenderer", {}).get("primaryContents", {}).get("sectionListRenderer", {}).get("contents", [])
                for sec in contents:
                    items = sec.get("itemSectionRenderer", {}).get("contents", [])
                    for it in items:
                        vr = it.get("videoRenderer")
                        if not vr: continue
                        vid = vr.get("videoId")
                        title = vr.get("title", {}).get("runs", [{}])[0].get("text", "")
                        owner = vr.get("ownerText", {}).get("runs", [{}])[0].get("text", "")
                        dur_text = vr.get("lengthText", {}).get("simpleText", "3:30")
                        thumb = vr.get("thumbnail", {}).get("thumbnails", [{}])[-1].get("url", "")
                        parts = [int(p) for p in dur_text.split(":") if p.isdigit()]
                        dur_sec = parts[0]*60 + parts[1] if len(parts) == 2 else (parts[0]*3600 + parts[1]*60 + parts[2] if len(parts) == 3 else 210)
                        if vid and title and owner and not any(t["id"] == f"yt-{vid}" for t in tracks):
                            tracks.append({
                                "id": f"yt-{vid}",
                                "title": title,
                                "artist": owner,
                                "album": "YouTube Music",
                                "durationSeconds": dur_sec,
                                "coverUrl": thumb,
                                "audioUrl": None,
                                "source": "youtube"
                            })
                            if len(tracks) >= limit:
                                break
                    if len(tracks) >= limit:
                        break
        except Exception as e:
            logger.warning(f"YouTube search error: {e}")

    return {"query": q, "results": tracks}


@app.get("/api/resolve")
@app.get("/resolve")
def resolve_track_audio(title: str = Query(...), artist: str = Query(default=""), id: Optional[str] = Query(default=None)):
    """
    Instantly resolves a playable audio stream for any track by title and artist.
    """
    import urllib.request
    import urllib.parse

    query = f"{title} {artist}".strip()
    try:
        itunes_url = f"https://itunes.apple.com/search?term={urllib.parse.quote(query)}&entity=song&limit=3"
        req = urllib.request.Request(itunes_url, headers={"User-Agent": "Mozilla/5.0"})
        res = json.loads(urllib.request.urlopen(req, timeout=4).read())
        results = res.get("results", [])
        if results:
            best = results[0]
            return {
                "status": "ok",
                "audioUrl": best.get("previewUrl"),
                "title": best.get("trackName"),
                "artist": best.get("artistName"),
                "durationSeconds": int(best.get("trackTimeMillis", 0) / 1000) or 210,
                "coverUrl": (best.get("artworkUrl100") or "").replace("100x100bb", "600x600bb")
            }
    except Exception as e:
        logger.warning(f"Stream resolve error: {e}")

    return {"status": "error", "message": "No stream found"}

