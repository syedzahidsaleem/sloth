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

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sloth-engine-api")

app = FastAPI(
    title="Sloth AI Recommendation Engine",
    description="Heterogeneous Hypergraph Convolution, BERT4Rec Sequential, and Diffusion Audio Engine",
    version="0.1.0",
)

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
        "features": ["graph", "sequential", "generator", "coldstart", "audio"],
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
