"""
Sloth Listen-Together WebSocket Server
Ported from Metrolist metroserver (GPL-3.0) by MetrolistGroup
(C) 2026 MetrolistGroup / Adapted for Sloth

FastAPI WebSocket implementation of Metrolist's room state,
playback synchronization, peer lifecycle, NTP clock drift correction,
and session management.
"""

from __future__ import annotations

import asyncio
import json
import logging
import secrets
import time
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware

import sys
from pathlib import Path

# Ensure directory is on sys.path for direct script/importlib execution
_dir = Path(__file__).resolve().parent
if str(_dir) not in sys.path:
    sys.path.insert(0, str(_dir))

try:
    from .models import (
        ChatMessage,
        MessageTypes,
        Peer,
        PlaybackActions,
        RoomState,
        Session,
        SyncEvent,
        TrackInfo,
        UserInfo,
    )
    from .session_store import ConnectedUser, RateLimiter, Room, SessionStore
except (ImportError, ValueError):
    from models import (  # type: ignore
        ChatMessage,
        MessageTypes,
        Peer,
        PlaybackActions,
        RoomState,
        Session,
        SyncEvent,
        TrackInfo,
        UserInfo,
    )
    from session_store import ConnectedUser, RateLimiter, Room, SessionStore  # type: ignore

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("listen-together")

app = FastAPI(title="Sloth Listen Together Server", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

manager = SessionStore()


@app.get("/status")
async def get_status():
    return {
        "status": "online",
        "service": "Sloth Listen Together",
        "protocol": "metroserver-compatible",
        "active_rooms": len(manager.rooms),
        "active_sessions": len(manager.sessions_by_id),
        "active_users": len(manager.user_sessions),
        "timestamp_ms": int(time.time() * 1000),
    }


@app.get("/api/rooms/{room_code}")
async def get_room_info(room_code: str):
    room = manager.get_room(room_code)
    if not room:
        return {"error": "Room not found"}
    return room.serialize_state()


@app.get("/api/sessions/{session_id}")
async def get_session_info(session_id: str):
    room = manager.get_room(session_id)
    if not room:
        return {"error": "Session not found"}
    return room.serialize_state()


async def handle_client_message(
    user: ConnectedUser,
    msg_type: str,
    payload: Dict[str, Any],
    raw_data: Dict[str, Any],
):
    """
    Core message processor supporting both Metrolist envelope format
    and direct JSON shorthand messages.
    """
    server_now_ms = int(time.time() * 1000)

    # -------------------------------------------------------------
    # NTP Ping / Pong Synchronization
    # -------------------------------------------------------------
    if msg_type == MessageTypes.PING or msg_type == "ping":
        server_receive_time = int(time.time() * 1000)
        client_time = payload.get("client_time", raw_data.get("client_time", 0))
        sequence = payload.get("sequence", raw_data.get("sequence", 0))
        server_send_time = int(time.time() * 1000)

        await user.send(
            MessageTypes.PONG,
            {
                "client_time": client_time,
                "server_receive_time": server_receive_time,
                "server_send_time": server_send_time,
                "sequence": sequence,
            },
        )

    # -------------------------------------------------------------
    # Create Room
    # -------------------------------------------------------------
    elif msg_type == MessageTypes.CREATE_ROOM or msg_type == "create":
        username = (
            payload.get("username")
            or raw_data.get("username")
            or "Host"
        ).strip() or "Host"
        user.username = username
        session_id = payload.get("session_id") or raw_data.get("session_id")
        room = manager.create_room(user, session_id=session_id)

        await user.send(
            MessageTypes.ROOM_CREATED,
            {
                "room_code": room.room_code,
                "session_id": room.session_id,
                "user_id": user.user_id,
                "session_token": user.session_token,
            },
        )
        logger.info(f"Room created: {room.room_code} by {username} ({user.user_id})")

    # -------------------------------------------------------------
    # Join Room Request
    # -------------------------------------------------------------
    elif msg_type == MessageTypes.JOIN_ROOM or msg_type == "join":
        client_ip = user.client_ip
        allowed = await manager.rate_limiter.is_allowed(client_ip)
        if not allowed:
            await user.send(
                MessageTypes.JOIN_REJECTED,
                {"reason": "Rate limit exceeded. Maximum 10 join requests per minute."},
            )
            return

        room_code = (
            payload.get("room_code")
            or raw_data.get("room_code")
            or payload.get("session_id")
            or raw_data.get("session_id")
            or ""
        ).strip()
        username = (
            payload.get("username")
            or raw_data.get("username")
            or "Guest"
        ).strip() or "Guest"

        user.username = username
        room = manager.get_room(room_code)
        if not room:
            await user.send(MessageTypes.JOIN_REJECTED, {"reason": "Room not found"})
            return

        user.room_code = room.room_code

        if room.auto_approve:
            # Instant join
            room.users[user.user_id] = user
            manager.user_to_room[user.user_id] = room.room_code
            manager.user_sessions[user.session_token] = user

            await user.send(
                MessageTypes.JOIN_APPROVED,
                {
                    "room_code": room.room_code,
                    "session_id": room.session_id,
                    "user_id": user.user_id,
                    "session_token": user.session_token,
                    "state": room.serialize_state(),
                },
            )
            await room.broadcast(
                MessageTypes.USER_JOINED,
                {"user_id": user.user_id, "username": user.username},
                exclude_user_id=user.user_id,
            )
        else:
            # Enqueue request to host
            room.pending_requests[user.user_id] = user
            host_user = room.users.get(room.host_id)
            if host_user:
                await host_user.send(
                    MessageTypes.JOIN_REQUEST,
                    {"user_id": user.user_id, "username": user.username},
                )

    # -------------------------------------------------------------
    # Approve Join (Host only)
    # -------------------------------------------------------------
    elif msg_type == MessageTypes.APPROVE_JOIN:
        target_user_id = payload.get("user_id") or raw_data.get("user_id")
        room = manager.get_room(user.room_code or "")
        if not room or room.host_id != user.user_id:
            return

        applicant = room.pending_requests.pop(target_user_id, None)
        if applicant:
            room.users[applicant.user_id] = applicant
            manager.user_to_room[applicant.user_id] = room.room_code
            manager.user_sessions[applicant.session_token] = applicant

            await applicant.send(
                MessageTypes.JOIN_APPROVED,
                {
                    "room_code": room.room_code,
                    "session_id": room.session_id,
                    "user_id": applicant.user_id,
                    "session_token": applicant.session_token,
                    "state": room.serialize_state(),
                },
            )
            await room.broadcast(
                MessageTypes.USER_JOINED,
                {"user_id": applicant.user_id, "username": applicant.username},
                exclude_user_id=applicant.user_id,
            )

    # -------------------------------------------------------------
    # Reject Join (Host only)
    # -------------------------------------------------------------
    elif msg_type == MessageTypes.REJECT_JOIN:
        target_user_id = payload.get("user_id") or raw_data.get("user_id")
        reason = payload.get("reason", "Host rejected the join request")
        room = manager.get_room(user.room_code or "")
        if not room or room.host_id != user.user_id:
            return

        applicant = room.pending_requests.pop(target_user_id, None)
        if applicant:
            await applicant.send(MessageTypes.JOIN_REJECTED, {"reason": reason})

    # -------------------------------------------------------------
    # Reconnect
    # -------------------------------------------------------------
    elif msg_type == MessageTypes.RECONNECT:
        token = payload.get("session_token") or raw_data.get("session_token")
        prev_user = manager.user_sessions.get(token)
        if prev_user and prev_user.room_code:
            room = manager.get_room(prev_user.room_code)
            if room:
                prev_user.websocket = user.websocket
                prev_user.is_connected = True
                user.user_id = prev_user.user_id
                user.username = prev_user.username
                user.room_code = prev_user.room_code
                user.session_token = prev_user.session_token
                room.users[user.user_id] = prev_user
                room.disconnected_users.pop(user.user_id, None)

                await prev_user.send(
                    MessageTypes.RECONNECTED,
                    {
                        "room_code": room.room_code,
                        "session_id": room.session_id,
                        "user_id": prev_user.user_id,
                        "is_host": (prev_user.user_id == room.host_id),
                        "state": room.serialize_state(),
                    },
                )
                await room.broadcast(
                    MessageTypes.USER_RECONNECTED,
                    {"user_id": prev_user.user_id, "username": prev_user.username},
                    exclude_user_id=prev_user.user_id,
                )
                return

        await user.send(
            MessageTypes.ERROR,
            {"code": "RECONNECT_FAILED", "message": "Session expired or invalid"},
        )

    # -------------------------------------------------------------
    # Playback Action (or direct action types: play, pause, seek)
    # -------------------------------------------------------------
    elif (
        msg_type == MessageTypes.PLAYBACK_ACTION
        or msg_type in [
            PlaybackActions.PLAY,
            PlaybackActions.PAUSE,
            PlaybackActions.SEEK,
            PlaybackActions.CHANGE_TRACK,
            "play",
            "pause",
            "seek",
        ]
    ):
        room = manager.get_room(user.room_code or "")
        if not room:
            return

        action = (
            payload.get("action")
            or (msg_type if msg_type != MessageTypes.PLAYBACK_ACTION else "")
        )
        pos = payload.get("position", raw_data.get("position", room.state.position))

        room.state.revision += 1
        rev = room.state.revision

        if action in [PlaybackActions.PLAY, "play"]:
            room.state.is_playing = True
            room.state.position = pos
            room.state.last_update = server_now_ms

        elif action in [PlaybackActions.PAUSE, "pause"]:
            room.state.is_playing = False
            room.state.position = pos
            room.state.last_update = server_now_ms

        elif action in [PlaybackActions.SEEK, "seek"]:
            room.state.position = pos
            room.state.last_update = server_now_ms

        elif action == PlaybackActions.CHANGE_TRACK:
            raw_ti = payload.get("track_info", raw_data.get("track_info", {}))
            if raw_ti:
                room.state.current_track = TrackInfo(
                    id=raw_ti.get("id", ""),
                    title=raw_ti.get("title", ""),
                    artist=raw_ti.get("artist", ""),
                    album=raw_ti.get("album", ""),
                    duration=raw_ti.get("duration", 0),
                    thumbnail=raw_ti.get("thumbnail", ""),
                    suggested_by=raw_ti.get("suggested_by", ""),
                )
                room.state.position = 0
                room.state.is_playing = False
                room.state.last_update = server_now_ms

        elif action == PlaybackActions.QUEUE_ADD:
            raw_ti = payload.get("track_info", raw_data.get("track_info", {}))
            if raw_ti:
                ti = TrackInfo(
                    id=raw_ti.get("id", ""),
                    title=raw_ti.get("title", ""),
                    artist=raw_ti.get("artist", ""),
                    album=raw_ti.get("album", ""),
                    duration=raw_ti.get("duration", 0),
                    thumbnail=raw_ti.get("thumbnail", ""),
                    suggested_by=raw_ti.get("suggested_by", ""),
                )
                if payload.get("insert_next"):
                    room.state.queue.insert(0, ti)
                else:
                    room.state.queue.append(ti)

        elif action == PlaybackActions.QUEUE_REMOVE:
            track_id = payload.get("track_id") or raw_data.get("track_id")
            room.state.queue = [t for t in room.state.queue if t.id != track_id]

        elif action == PlaybackActions.QUEUE_CLEAR:
            room.state.queue = []

        elif action == PlaybackActions.SET_VOLUME:
            vol = payload.get("volume", raw_data.get("volume", 1.0))
            room.state.volume = float(vol)

        sync_payload = {
            **payload,
            "action": action,
            "position": room.state.position,
            "is_playing": room.state.is_playing,
            "server_time": server_now_ms,
            "revision": rev,
            "user_id": user.user_id,
        }
        await room.broadcast(MessageTypes.SYNC_PLAYBACK, sync_payload)

    # -------------------------------------------------------------
    # Chat Messages
    # -------------------------------------------------------------
    elif msg_type == MessageTypes.CHAT or msg_type == "chat":
        room = manager.get_room(user.room_code or "")
        if room:
            text = (payload.get("message") or raw_data.get("message") or "").strip()
            if text:
                chat_msg = room.add_chat(user, text)
                await room.broadcast(
                    MessageTypes.CHAT_MESSAGE,
                    chat_msg.model_dump(),
                )

    # -------------------------------------------------------------
    # Buffer Ready / Wait Synchronization
    # -------------------------------------------------------------
    elif msg_type == MessageTypes.BUFFER_READY:
        room = manager.get_room(user.room_code or "")
        track_id = payload.get("track_id") or raw_data.get("track_id")
        if room and track_id:
            room.buffering_users.discard(user.user_id)
            if not room.buffering_users:
                await room.broadcast(MessageTypes.BUFFER_COMPLETE, {"track_id": track_id})

    # -------------------------------------------------------------
    # Kick User (Host only)
    # -------------------------------------------------------------
    elif msg_type == MessageTypes.KICK_USER:
        target_user_id = payload.get("user_id") or raw_data.get("user_id")
        reason = payload.get("reason", "Kicked by host")
        room = manager.get_room(user.room_code or "")
        if room and room.host_id == user.user_id and target_user_id in room.users:
            target = room.users[target_user_id]
            await target.send(MessageTypes.KICKED, {"reason": reason})
            manager.remove_user(target)
            await room.broadcast(
                MessageTypes.USER_LEFT,
                {"user_id": target.user_id, "username": target.username},
            )

    # -------------------------------------------------------------
    # Transfer Host (Host only)
    # -------------------------------------------------------------
    elif msg_type == MessageTypes.TRANSFER_HOST:
        new_host_id = payload.get("new_host_id") or raw_data.get("new_host_id")
        room = manager.get_room(user.room_code or "")
        if room and room.host_id == user.user_id and new_host_id in room.users:
            new_host = room.users[new_host_id]
            room.host_id = new_host_id
            room.state.host_id = new_host_id
            await room.broadcast(
                MessageTypes.HOST_CHANGED,
                {"new_host_id": new_host_id, "new_host_name": new_host.username},
            )

    # -------------------------------------------------------------
    # Suggest Track
    # -------------------------------------------------------------
    elif msg_type == MessageTypes.SUGGEST_TRACK:
        room = manager.get_room(user.room_code or "")
        if room:
            suggestion_id = secrets.token_hex(6)
            track_info = payload.get("track_info", raw_data.get("track_info", {}))
            room.suggestions[suggestion_id] = {
                "suggestion_id": suggestion_id,
                "from_user_id": user.user_id,
                "from_username": user.username,
                "track_info": track_info,
            }
            host_user = room.users.get(room.host_id)
            if host_user:
                await host_user.send(
                    MessageTypes.SUGGESTION_RECEIVED,
                    {
                        "suggestion_id": suggestion_id,
                        "from_user_id": user.user_id,
                        "from_username": user.username,
                        "track_info": track_info,
                    },
                )

    # -------------------------------------------------------------
    # Leave Room
    # -------------------------------------------------------------
    elif msg_type == MessageTypes.LEAVE_ROOM or msg_type == "leave":
        room = manager.get_room(user.room_code or "")
        if room:
            manager.remove_user(user)
            await room.broadcast(
                MessageTypes.USER_LEFT,
                {"user_id": user.user_id, "username": user.username},
            )
            user.room_code = None


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    client_ip = websocket.client.host if websocket.client else "127.0.0.1"
    user_id = secrets.token_hex(8)
    user = ConnectedUser(
        user_id=user_id,
        username="Guest",
        websocket=websocket,
        client_ip=client_ip,
    )
    logger.info(f"WebSocket client connected: {user_id} from {client_ip}")

    try:
        while True:
            raw_text = await websocket.receive_text()
            try:
                data = json.loads(raw_text)
            except Exception:
                continue

            msg_type = data.get("type")
            payload = data.get("payload", {})

            await handle_client_message(user, msg_type, payload, data)

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {user.user_id}")
        manager.remove_user(user)
        room = manager.get_room(user.room_code or "")
        if room:
            await room.broadcast(
                MessageTypes.USER_DISCONNECTED,
                {"user_id": user.user_id, "username": user.username},
            )
    except Exception as e:
        logger.error(f"WebSocket error for {user.user_id}: {e}")
        manager.remove_user(user)


@app.websocket("/ws/session/{session_id}")
async def websocket_session_endpoint(websocket: WebSocket, session_id: str):
    """
    Dedicated session WebSocket endpoint.
    Accepts direct JSON commands and binds directly to a session room.
    """
    await websocket.accept()

    client_ip = websocket.client.host if websocket.client else "127.0.0.1"
    user_id = secrets.token_hex(8)
    user = ConnectedUser(
        user_id=user_id,
        username="Guest",
        websocket=websocket,
        client_ip=client_ip,
    )
    logger.info(f"WebSocket session client connected: {user_id} for session: {session_id}")

    try:
        while True:
            raw_text = await websocket.receive_text()
            try:
                data = json.loads(raw_text)
            except Exception:
                continue

            msg_type = data.get("type", "")
            payload = data.get("payload", {})

            # Default to joining this session if msg_type is join or empty
            if msg_type in [MessageTypes.JOIN_ROOM, "join"] and not payload.get("room_code"):
                payload["room_code"] = session_id
                data["room_code"] = session_id

            await handle_client_message(user, msg_type, payload, data)

    except WebSocketDisconnect:
        logger.info(f"WebSocket session disconnected: {user.user_id}")
        manager.remove_user(user)
        room = manager.get_room(user.room_code or "")
        if room:
            await room.broadcast(
                MessageTypes.USER_DISCONNECTED,
                {"user_id": user.user_id, "username": user.username},
            )
    except Exception as e:
        logger.error(f"WebSocket session error for {user.user_id}: {e}")
        manager.remove_user(user)
