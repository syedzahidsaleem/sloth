"""
Sloth Unified Production Server
Combines recommendation engine, Listen Together WebSockets, and audio downloader
into a single production FastAPI service for deployment on Render, Railway, or Docker.
"""

from __future__ import annotations

import importlib
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sloth-unified-server")

# Load submodules
engine_module = importlib.import_module("server.engine.main")
listen_together_module = importlib.import_module("server.listen-together.main")
downloader_module = importlib.import_module("server.downloader.main")

app: FastAPI = engine_module.app

# Configure metadata
app.title = "Sloth Unified Music Engine & Sync Service"
app.description = "Production backend for recommendations, audio extraction, and real-time Listen Together WebSockets"
app.version = "1.0.0"

# Merge routes from Listen Together (WebSockets + room management)
existing_paths = {getattr(r, "path", None) for r in app.routes}
for route in listen_together_module.app.routes:
    p = getattr(route, "path", None)
    if p and p not in existing_paths:
        app.routes.append(route)
        existing_paths.add(p)

# Merge routes from Downloader
for route in downloader_module.app.routes:
    p = getattr(route, "path", None)
    if p and p not in existing_paths:
        app.routes.append(route)
        existing_paths.add(p)

# Ensure CORS allows all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info(f"Sloth Unified Server initialized with {len(app.routes)} routes")
