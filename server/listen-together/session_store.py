"""
Sloth Listen-Together Session Store & Rate Limiter
Thread-safe in-memory room and peer state manager with IP sliding-window rate limiting.
"""

from __future__ import annotations

import asyncio
import json
import logging
import secrets
import string
import time
from collections import defaultdict, deque
from typing import Any, Dict, List, Optional, Set

from fastapi import WebSocket

try:
    from .models import ChatMessage, MessageTypes, Peer, RoomState, TrackInfo
except (ImportError, ValueError):
    from models import ChatMessage, MessageTypes, Peer, RoomState, TrackInfo  # type: ignore

logger = logging.getLogger("listen-together.store")


class RateLimiter:
    """
    Sliding-window rate limiter per client IP.
    Enforces max 10 join requests per 60 seconds per IP.
    """

    def __init__(self, max_requests: int = 10, window_seconds: float = 60.0):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._history: Dict[str, deque[float]] = defaultdict(deque)
        self._lock = asyncio.Lock()

    async def is_allowed(self, client_ip: str) -> bool:
        if not client_ip:
            return True

        now = time.time()
        async with self._lock:
            queue = self._history[client_ip]
            # Evict timestamps older than window
            cutoff = now - self.window_seconds
            while queue and queue[0] < cutoff:
                queue.popleft()

            if len(queue) >= self.max_requests:
                logger.warning(f"Rate limit exceeded for IP: {client_ip} ({len(queue)}/{self.max_requests})")
                return False

            queue.append(now)
            return True

    def reset(self, client_ip: Optional[str] = None):
        if client_ip:
            self._history.pop(client_ip, None)
        else:
            self._history.clear()


class ConnectedUser:
    """Represents an active WebSocket client session."""

    def __init__(
        self,
        user_id: str,
        username: str,
        websocket: WebSocket,
        client_ip: str = "127.0.0.1",
        session_token: Optional[str] = None,
    ):
        self.user_id = user_id
        self.username = username
        self.websocket = websocket
        self.client_ip = client_ip
        self.is_connected = True
        self.session_token = session_token or secrets.token_hex(16)
        self.room_code: Optional[str] = None
        self.joined_at = int(time.time() * 1000)

    async def send(self, msg_type: str, payload: Dict[str, Any]):
        """Send standardized Metrolist envelope to this client."""
        envelope = {
            "type": msg_type,
            "payload": payload,
        }
        try:
            if self.websocket:
                await self.websocket.send_text(json.dumps(envelope))
        except Exception as e:
            logger.warning(f"Error sending message to {self.user_id}: {e}")

    async def send_raw(self, data: Dict[str, Any]):
        """Send raw JSON message."""
        try:
            if self.websocket:
                await self.websocket.send_text(json.dumps(data))
        except Exception as e:
            logger.warning(f"Error sending raw message to {self.user_id}: {e}")


class Room:
    """Represents an active Listen-Together room session."""

    def __init__(self, room_code: str, host: ConnectedUser, session_id: Optional[str] = None):
        self.room_code = room_code.upper()
        self.session_id = session_id or room_code.lower()
        self.host_id = host.user_id
        self.users: Dict[str, ConnectedUser] = {host.user_id: host}
        self.disconnected_users: Dict[str, Peer] = {}
        self.pending_requests: Dict[str, ConnectedUser] = {}
        self.suggestions: Dict[str, Dict[str, Any]] = {}
        self.chat_history: List[ChatMessage] = []
        self.buffering_users: Set[str] = set()
        self.waiting_for_track_id: Optional[str] = None
        self.auto_approve: bool = False
        self.created_at = int(time.time() * 1000)

        now_ms = int(time.time() * 1000)
        self.state = RoomState(
            room_code=self.room_code,
            host_id=host.user_id,
            users=[
                Peer(
                    user_id=host.user_id,
                    username=host.username,
                    is_host=True,
                    is_connected=True,
                    joined_at=now_ms,
                )
            ],
            current_track=None,
            is_playing=False,
            position=0,
            last_update=now_ms,
            volume=1.0,
            queue=[],
            revision=0,
        )

    def get_user_infos(self) -> List[Peer]:
        """Collect current peer status list including temporarily disconnected peers."""
        peers: List[Peer] = []
        for uid, user in self.users.items():
            peers.append(
                Peer(
                    user_id=uid,
                    username=user.username,
                    is_host=(uid == self.host_id),
                    is_connected=True,
                    joined_at=user.joined_at,
                )
            )
        for uid, d_peer in self.disconnected_users.items():
            if uid not in self.users:
                peers.append(
                    Peer(
                        user_id=uid,
                        username=d_peer.username,
                        is_host=(uid == self.host_id),
                        is_connected=False,
                        joined_at=d_peer.joined_at,
                    )
                )
        return peers

    def serialize_state(self) -> Dict[str, Any]:
        """Serialize complete room state for client consumption."""
        user_peers = self.get_user_infos()
        current_t = self.state.current_track.model_dump() if self.state.current_track else None
        queue_list = [t.model_dump() for t in self.state.queue]

        return {
            "room_code": self.state.room_code,
            "session_id": self.session_id,
            "host_id": self.state.host_id,
            "users": [p.model_dump() for p in user_peers],
            "current_track": current_t,
            "is_playing": self.state.is_playing,
            "position": self.state.position,
            "last_update": self.state.last_update,
            "volume": self.state.volume,
            "queue": queue_list,
            "revision": self.state.revision,
            "created_at": self.created_at,
        }

    async def broadcast(
        self,
        msg_type: str,
        payload: Dict[str, Any],
        exclude_user_id: Optional[str] = None,
    ):
        """Broadcast an event to all connected users in this room."""
        tasks = []
        for uid, user in list(self.users.items()):
            if exclude_user_id and uid == exclude_user_id:
                continue
            tasks.append(user.send(msg_type, payload))
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    def add_chat(self, user: ConnectedUser, message: str) -> ChatMessage:
        """Record and return a chat message."""
        chat_msg = ChatMessage(
            id=secrets.token_hex(6),
            user_id=user.user_id,
            username=user.username,
            message=message,
            timestamp_ms=int(time.time() * 1000),
        )
        self.chat_history.append(chat_msg)
        if len(self.chat_history) > 100:
            self.chat_history.pop(0)
        return chat_msg


class SessionStore:
    """Thread-safe centralized session store."""

    def __init__(self):
        self.rooms: Dict[str, Room] = {}
        self.sessions_by_id: Dict[str, Room] = {}
        self.user_sessions: Dict[str, ConnectedUser] = {}
        self.user_to_room: Dict[str, str] = {}
        self.rate_limiter = RateLimiter(max_requests=10, window_seconds=60.0)

    def generate_room_code(self) -> str:
        for _ in range(100):
            code = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
            if code not in self.rooms:
                return code
        return secrets.token_hex(3).upper()

    def create_room(self, user: ConnectedUser, session_id: Optional[str] = None) -> Room:
        code = self.generate_room_code()
        sid = session_id or code.lower()
        room = Room(code, user, session_id=sid)
        self.rooms[code] = room
        self.sessions_by_id[sid] = room
        self.user_sessions[user.session_token] = user
        self.user_to_room[user.user_id] = code
        user.room_code = code
        return room

    def get_room(self, identifier: str) -> Optional[Room]:
        if not identifier:
            return None
        upper = identifier.upper()
        if upper in self.rooms:
            return self.rooms[upper]
        lower = identifier.lower()
        if lower in self.sessions_by_id:
            return self.sessions_by_id[lower]
        return None

    def remove_user(self, user: ConnectedUser):
        if not user.room_code:
            return
        room = self.rooms.get(user.room_code)
        if not room:
            return

        if user.user_id in room.users:
            del room.users[user.user_id]
            room.disconnected_users[user.user_id] = Peer(
                user_id=user.user_id,
                username=user.username,
                is_host=(user.user_id == room.host_id),
                is_connected=False,
                joined_at=user.joined_at,
            )

        if user.user_id in room.pending_requests:
            del room.pending_requests[user.user_id]

        if not room.users:
            # All users left, clean up room
            if room.room_code in self.rooms:
                del self.rooms[room.room_code]
            if room.session_id in self.sessions_by_id:
                del self.sessions_by_id[room.session_id]
            logger.info(f"Room {room.room_code} closed (empty)")

    def clear(self):
        """Reset state for tests."""
        self.rooms.clear()
        self.sessions_by_id.clear()
        self.user_sessions.clear()
        self.user_to_room.clear()
        self.rate_limiter.reset()
