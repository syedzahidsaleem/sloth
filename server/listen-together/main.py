"""
Sloth Listen-Together WebSocket Server
Ported from Metrolist metroserver (GPL-3.0) by MetrolistGroup
(C) 2026 MetrolistGroup / Adapted for Sloth

FastAPI WebSocket implementation of Metrolist's room state,
playback synchronization, peer lifecycle, and NTP clock drift correction.
"""

from __future__ import annotations

import asyncio
import json
import logging
import secrets
import string
import time
from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional, Set

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

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


@dataclass
class TrackInfo:
    id: str
    title: str
    artist: str
    album: str = ""
    duration: int = 0
    thumbnail: str = ""
    suggested_by: str = ""


@dataclass
class UserInfo:
    user_id: str
    username: str
    is_host: bool
    is_connected: bool = True


@dataclass
class RoomState:
    room_code: str
    host_id: str
    users: List[UserInfo] = field(default_factory=list)
    current_track: Optional[TrackInfo] = None
    is_playing: bool = False
    position: int = 0
    last_update: int = 0
    volume: float = 1.0
    queue: List[TrackInfo] = field(default_factory=list)
    revision: int = 0


class ConnectedUser:
    def __init__(self, user_id: str, username: str, websocket: WebSocket):
        self.user_id = user_id
        self.username = username
        self.websocket = websocket
        self.is_connected = True
        self.session_token = secrets.token_hex(16)
        self.room_code: Optional[str] = None

    async def send(self, msg_type: str, payload: Dict[str, Any]):
        envelope = {
            "type": msg_type,
            "payload": payload,
        }
        try:
            await self.websocket.send_text(json.dumps(envelope))
        except Exception as e:
            logger.warning(f"Error sending message to {self.user_id}: {e}")


class Room:
    def __init__(self, room_code: str, host: ConnectedUser):
        self.room_code = room_code
        self.host_id = host.user_id
        self.users: Dict[str, ConnectedUser] = {host.user_id: host}
        self.disconnected_users: Dict[str, UserInfo] = {}
        self.pending_requests: Dict[str, ConnectedUser] = {}
        self.suggestions: Dict[str, Dict[str, Any]] = {}
        self.buffering_users: Set[str] = set()
        self.waiting_for_track_id: Optional[str] = None
        self.auto_approve: bool = False

        now_ms = int(time.time() * 1000)
        self.state = RoomState(
            room_code=room_code,
            host_id=host.user_id,
            users=[UserInfo(user_id=host.user_id, username=host.username, is_host=True)],
            current_track=None,
            is_playing=False,
            position=0,
            last_update=now_ms,
            volume=1.0,
            queue=[],
            revision=0,
        )

    def get_user_infos(self) -> List[UserInfo]:
        infos: List[UserInfo] = []
        for uid, user in self.users.items():
            infos.append(UserInfo(user_id=uid, username=user.username, is_host=(uid == self.host_id), is_connected=True))
        for uid, d_user in self.disconnected_users.items():
            if uid not in self.users:
                infos.append(UserInfo(user_id=uid, username=d_user.username, is_host=(uid == self.host_id), is_connected=False))
        return infos

    def serialize_state(self) -> Dict[str, Any]:
        return {
            "room_code": self.state.room_code,
            "host_id": self.state.host_id,
            "users": [asdict(u) for u in self.get_user_infos()],
            "current_track": asdict(self.state.current_track) if self.state.current_track else None,
            "is_playing": self.state.is_playing,
            "position": self.state.position,
            "last_update": self.state.last_update,
            "volume": self.state.volume,
            "queue": [asdict(t) for t in self.state.queue],
            "revision": self.state.revision,
        }

    async def broadcast(self, msg_type: str, payload: Dict[str, Any], exclude_user_id: Optional[str] = None):
        tasks = []
        for uid, user in self.users.items():
            if exclude_user_id and uid == exclude_user_id:
                continue
            tasks.append(user.send(msg_type, payload))
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)


class RoomManager:
    def __init__(self):
        self.rooms: Dict[str, Room] = {}
        self.user_sessions: Dict[str, ConnectedUser] = {}  # session_token -> ConnectedUser
        self.user_to_room: Dict[str, str] = {}  # user_id -> room_code

    def generate_room_code(self) -> str:
        for _ in range(100):
            code = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
            if code not in self.rooms:
                return code
        return secrets.token_hex(3).upper()

    def create_room(self, user: ConnectedUser) -> Room:
        code = self.generate_room_code()
        room = Room(code, user)
        self.rooms[code] = room
        self.user_sessions[user.session_token] = user
        self.user_to_room[user.user_id] = code
        user.room_code = code
        return room

    def get_room(self, code: str) -> Optional[Room]:
        return self.rooms.get(code.upper())

    def remove_user(self, user: ConnectedUser):
        if not user.room_code:
            return
        room = self.rooms.get(user.room_code)
        if not room:
            return

        if user.user_id in room.users:
            del room.users[user.user_id]
            room.disconnected_users[user.user_id] = UserInfo(
                user_id=user.user_id, username=user.username, is_host=(user.user_id == room.host_id), is_connected=False
            )

        if user.user_id in room.pending_requests:
            del room.pending_requests[user.user_id]

        if not room.users:
            # All users left, clean up room
            if room.room_code in self.rooms:
                del self.rooms[room.room_code]
                logger.info(f"Room {room.room_code} closed (empty)")


manager = RoomManager()


@app.get("/status")
async def get_status():
    return {
        "status": "online",
        "service": "Sloth Listen Together",
        "protocol": "metroserver-compatible",
        "active_rooms": len(manager.rooms),
        "active_sessions": len(manager.user_sessions),
        "timestamp_ms": int(time.time() * 1000),
    }


@app.get("/api/rooms/{room_code}")
async def get_room_info(room_code: str):
    room = manager.get_room(room_code)
    if not room:
        return {"error": "Room not found"}
    return room.serialize_state()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    user_id = secrets.token_hex(8)
    user = ConnectedUser(user_id=user_id, username="Guest", websocket=websocket)
    logger.info(f"WebSocket client connected: {user_id}")

    try:
        while True:
            raw_text = await websocket.receive_text()
            try:
                data = json.loads(raw_text)
            except Exception:
                continue

            msg_type = data.get("type")
            payload = data.get("payload", {})

            # -------------------------------------------------------------
            # NTP Ping / Pong Synchronization
            # -------------------------------------------------------------
            if msg_type == MessageTypes.PING:
                server_receive_time = int(time.time() * 1000)
                client_time = payload.get("client_time", 0)
                sequence = payload.get("sequence", 0)
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
            elif msg_type == MessageTypes.CREATE_ROOM:
                username = payload.get("username", "Host").strip() or "Host"
                user.username = username
                room = manager.create_room(user)

                await user.send(
                    MessageTypes.ROOM_CREATED,
                    {
                        "room_code": room.room_code,
                        "user_id": user.user_id,
                        "session_token": user.session_token,
                    },
                )
                logger.info(f"Room created: {room.room_code} by {username} ({user.user_id})")

            # -------------------------------------------------------------
            # Join Room Request
            # -------------------------------------------------------------
            elif msg_type == MessageTypes.JOIN_ROOM:
                room_code = payload.get("room_code", "").strip().upper()
                username = payload.get("username", "Guest").strip() or "Guest"
                user.username = username
                user.room_code = room_code

                room = manager.get_room(room_code)
                if not room:
                    await user.send(MessageTypes.JOIN_REJECTED, {"reason": "Room not found"})
                    continue

                if room.auto_approve:
                    # Instant join
                    room.users[user.user_id] = user
                    manager.user_to_room[user.user_id] = room_code
                    manager.user_sessions[user.session_token] = user

                    await user.send(
                        MessageTypes.JOIN_APPROVED,
                        {
                            "room_code": room.room_code,
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
                target_user_id = payload.get("user_id")
                room = manager.get_room(user.room_code or "")
                if not room or room.host_id != user.user_id:
                    continue

                applicant = room.pending_requests.pop(target_user_id, None)
                if applicant:
                    room.users[applicant.user_id] = applicant
                    manager.user_to_room[applicant.user_id] = room.room_code
                    manager.user_sessions[applicant.session_token] = applicant

                    await applicant.send(
                        MessageTypes.JOIN_APPROVED,
                        {
                            "room_code": room.room_code,
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
                target_user_id = payload.get("user_id")
                reason = payload.get("reason", "Host rejected the join request")
                room = manager.get_room(user.room_code or "")
                if not room or room.host_id != user.user_id:
                    continue

                applicant = room.pending_requests.pop(target_user_id, None)
                if applicant:
                    await applicant.send(MessageTypes.JOIN_REJECTED, {"reason": reason})

            # -------------------------------------------------------------
            # Reconnect
            # -------------------------------------------------------------
            elif msg_type == MessageTypes.RECONNECT:
                token = payload.get("session_token")
                prev_user = manager.user_sessions.get(token)
                if prev_user and prev_user.room_code:
                    room = manager.get_room(prev_user.room_code)
                    if room:
                        # Transfer socket to existing user session
                        prev_user.websocket = websocket
                        prev_user.is_connected = True
                        user = prev_user
                        room.users[user.user_id] = user
                        room.disconnected_users.pop(user.user_id, None)

                        await user.send(
                            MessageTypes.RECONNECTED,
                            {
                                "room_code": room.room_code,
                                "user_id": user.user_id,
                                "is_host": (user.user_id == room.host_id),
                                "state": room.serialize_state(),
                            },
                        )
                        await room.broadcast(
                            MessageTypes.USER_RECONNECTED,
                            {"user_id": user.user_id, "username": user.username},
                            exclude_user_id=user.user_id,
                        )
                        continue

                await user.send(MessageTypes.ERROR, {"code": "RECONNECT_FAILED", "message": "Session expired or invalid"})

            # -------------------------------------------------------------
            # Playback Action
            # -------------------------------------------------------------
            elif msg_type == MessageTypes.PLAYBACK_ACTION:
                room = manager.get_room(user.room_code or "")
                if not room:
                    continue

                action = payload.get("action")
                server_now_ms = int(time.time() * 1000)
                room.state.revision += 1
                rev = room.state.revision

                if action == PlaybackActions.PLAY:
                    room.state.is_playing = True
                    room.state.position = payload.get("position", room.state.position)
                    room.state.last_update = server_now_ms

                elif action == PlaybackActions.PAUSE:
                    room.state.is_playing = False
                    room.state.position = payload.get("position", room.state.position)
                    room.state.last_update = server_now_ms

                elif action == PlaybackActions.SEEK:
                    room.state.position = payload.get("position", room.state.position)
                    room.state.last_update = server_now_ms

                elif action == PlaybackActions.CHANGE_TRACK:
                    raw_ti = payload.get("track_info", {})
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
                    raw_ti = payload.get("track_info", {})
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
                    track_id = payload.get("track_id")
                    room.state.queue = [t for t in room.state.queue if t.id != track_id]

                elif action == PlaybackActions.QUEUE_CLEAR:
                    room.state.queue = []

                elif action == PlaybackActions.SET_VOLUME:
                    room.state.volume = float(payload.get("volume", 1.0))

                # Forward synchronization event with monotonic revision and server time
                sync_payload = {
                    **payload,
                    "server_time": server_now_ms,
                    "revision": rev,
                }
                await room.broadcast(MessageTypes.SYNC_PLAYBACK, sync_payload)

            # -------------------------------------------------------------
            # Buffer Ready / Wait Synchronization
            # -------------------------------------------------------------
            elif msg_type == MessageTypes.BUFFER_READY:
                room = manager.get_room(user.room_code or "")
                track_id = payload.get("track_id")
                if room and track_id:
                    room.buffering_users.discard(user.user_id)
                    if not room.buffering_users:
                        # All clients buffered, unpause playback
                        await room.broadcast(MessageTypes.BUFFER_COMPLETE, {"track_id": track_id})

            # -------------------------------------------------------------
            # Kick User (Host only)
            # -------------------------------------------------------------
            elif msg_type == MessageTypes.KICK_USER:
                target_user_id = payload.get("user_id")
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
                new_host_id = payload.get("new_host_id")
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
                    track_info = payload.get("track_info", {})
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
            elif msg_type == MessageTypes.LEAVE_ROOM:
                room = manager.get_room(user.room_code or "")
                if room:
                    manager.remove_user(user)
                    await room.broadcast(
                        MessageTypes.USER_LEFT,
                        {"user_id": user.user_id, "username": user.username},
                    )
                    user.room_code = None

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
