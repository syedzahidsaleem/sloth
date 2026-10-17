"""
Sloth Listen-Together Models
Defines Pydantic schemas and dataclasses for rooms, peers, playback synchronization,
chat messages, and NTP timing events.
"""

from __future__ import annotations

import time
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class MessageTypes:
    # Client -> Server
    CREATE_ROOM = "create_room"
    JOIN_ROOM = "join_room"
    LEAVE_ROOM = "leave_room"
    APPROVE_JOIN = "approve_join"
    REJECT_JOIN = "reject_join"
    PLAYBACK_ACTION = "playback_action"
    BUFFER_READY = "buffer_ready"
    KICK_USER = "kick_user"
    TRANSFER_HOST = "transfer_host"
    PING = "ping"
    CHAT = "chat"
    REQUEST_SYNC = "request_sync"
    RECONNECT = "reconnect"
    SUGGEST_TRACK = "suggest_track"
    APPROVE_SUGGESTION = "approve_suggestion"
    REJECT_SUGGESTION = "reject_suggestion"

    # Server -> Client
    ROOM_CREATED = "room_created"
    JOIN_REQUEST = "join_request"
    JOIN_APPROVED = "join_approved"
    JOIN_REJECTED = "join_rejected"
    USER_JOINED = "user_joined"
    USER_LEFT = "user_left"
    SYNC_PLAYBACK = "sync_playback"
    BUFFER_WAIT = "buffer_wait"
    BUFFER_COMPLETE = "buffer_complete"
    ERROR = "error"
    PONG = "pong"
    HOST_CHANGED = "host_changed"
    KICKED = "kicked"
    SYNC_STATE = "sync_state"
    RECONNECTED = "reconnected"
    USER_RECONNECTED = "user_reconnected"
    USER_DISCONNECTED = "user_disconnected"
    CHAT_MESSAGE = "chat_message"
    SUGGESTION_RECEIVED = "suggestion_received"
    SUGGESTION_APPROVED = "suggestion_approved"
    SUGGESTION_REJECTED = "suggestion_rejected"


class PlaybackActions:
    PLAY = "play"
    PAUSE = "pause"
    SEEK = "seek"
    SKIP_NEXT = "skip_next"
    SKIP_PREV = "skip_prev"
    CHANGE_TRACK = "change_track"
    QUEUE_ADD = "queue_add"
    QUEUE_REMOVE = "queue_remove"
    QUEUE_CLEAR = "queue_clear"
    SYNC_QUEUE = "sync_queue"
    SET_VOLUME = "set_volume"


class TrackInfo(BaseModel):
    id: str
    title: str
    artist: str
    album: str = ""
    duration: int = 0
    thumbnail: str = ""
    suggested_by: str = ""


class Peer(BaseModel):
    user_id: str
    username: str
    is_host: bool = False
    is_connected: bool = True
    joined_at: int = Field(default_factory=lambda: int(time.time() * 1000))
    avatar_url: Optional[str] = None


class UserInfo(BaseModel):
    """Metrolist-compatible alias for Peer"""
    user_id: str
    username: str
    is_host: bool = False
    is_connected: bool = True


class ChatMessage(BaseModel):
    id: str
    user_id: str
    username: str
    message: str
    timestamp_ms: int = Field(default_factory=lambda: int(time.time() * 1000))


class SyncEvent(BaseModel):
    action: str
    position: int = 0
    server_time: int = Field(default_factory=lambda: int(time.time() * 1000))
    revision: int = 0
    user_id: Optional[str] = None
    track_info: Optional[TrackInfo] = None
    volume: Optional[float] = None


class RoomState(BaseModel):
    room_code: str
    host_id: str
    users: List[Peer] = Field(default_factory=list)
    current_track: Optional[TrackInfo] = None
    is_playing: bool = False
    position: int = 0
    last_update: int = Field(default_factory=lambda: int(time.time() * 1000))
    volume: float = 1.0
    queue: List[TrackInfo] = Field(default_factory=list)
    revision: int = 0


class Session(BaseModel):
    session_id: str
    room_code: str
    host_id: str
    created_at: int = Field(default_factory=lambda: int(time.time() * 1000))
    max_peers: int = 32
