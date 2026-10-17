"""
Unit tests for Sloth Listen Together WebSocket Server & Protocol
"""

import asyncio
import json
import unittest
from starlette.testclient import TestClient

import sys
import importlib.util
from pathlib import Path

# Load module from server/listen-together/main.py
module_path = Path(__file__).resolve().parent.parent / "listen-together" / "main.py"
spec = importlib.util.spec_from_file_location("listen_together_main", str(module_path))
lt_module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = lt_module
spec.loader.exec_module(lt_module)

app = lt_module.app
manager = lt_module.manager
MessageTypes = lt_module.MessageTypes
PlaybackActions = lt_module.PlaybackActions
ConnectedUser = lt_module.ConnectedUser
Room = lt_module.Room
TrackInfo = lt_module.TrackInfo


class TestListenTogether(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        # Reset manager state before each test
        manager.rooms.clear()
        manager.user_sessions.clear()
        manager.user_to_room.clear()

    def test_status_endpoint(self):
        response = self.client.get("/status")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "online")
        self.assertEqual(data["protocol"], "metroserver-compatible")
        self.assertIn("timestamp_ms", data)

    def test_room_lifecycle_and_serialization(self):
        dummy_ws = None
        host_user = ConnectedUser("host_1", "HostUser", dummy_ws)
        room = manager.create_room(host_user)

        self.assertEqual(len(room.room_code), 6)
        self.assertEqual(room.host_id, "host_1")
        self.assertIn("host_1", room.users)

        serialized = room.serialize_state()
        self.assertEqual(serialized["room_code"], room.room_code)
        self.assertEqual(serialized["host_id"], "host_1")
        self.assertEqual(len(serialized["users"]), 1)
        self.assertTrue(serialized["users"][0]["is_host"])
        self.assertEqual(serialized["revision"], 0)

    def test_websocket_ping_pong_ntp(self):
        with self.client.websocket_connect("/ws") as ws:
            client_time = 123456789
            ping_msg = {
                "type": MessageTypes.PING,
                "payload": {"client_time": client_time, "sequence": 1},
            }
            ws.send_text(json.dumps(ping_msg))

            raw_resp = ws.receive_text()
            resp = json.loads(raw_resp)

            self.assertEqual(resp["type"], MessageTypes.PONG)
            payload = resp["payload"]
            self.assertEqual(payload["client_time"], client_time)
            self.assertEqual(payload["sequence"], 1)
            self.assertGreaterEqual(payload["server_send_time"], payload["server_receive_time"])

    def test_create_and_join_room_flow(self):
        with self.client.websocket_connect("/ws") as host_ws:
            # 1. Host creates room
            host_ws.send_text(
                json.dumps(
                    {
                        "type": MessageTypes.CREATE_ROOM,
                        "payload": {"username": "DJ Sloth"},
                    }
                )
            )
            raw = host_ws.receive_text()
            created_data = json.loads(raw)
            self.assertEqual(created_data["type"], MessageTypes.ROOM_CREATED)
            room_code = created_data["payload"]["room_code"]
            host_id = created_data["payload"]["user_id"]
            session_token = created_data["payload"]["session_token"]
            self.assertTrue(room_code)
            self.assertTrue(session_token)

            # 2. Guest connects and requests to join
            with self.client.websocket_connect("/ws") as guest_ws:
                guest_ws.send_text(
                    json.dumps(
                        {
                            "type": MessageTypes.JOIN_ROOM,
                            "payload": {"room_code": room_code, "username": "GuestListener"},
                        }
                    )
                )

                # Host receives join request
                host_notif = json.loads(host_ws.receive_text())
                self.assertEqual(host_notif["type"], MessageTypes.JOIN_REQUEST)
                guest_id = host_notif["payload"]["user_id"]
                self.assertEqual(host_notif["payload"]["username"], "GuestListener")

                # Host approves join
                host_ws.send_text(
                    json.dumps(
                        {
                            "type": MessageTypes.APPROVE_JOIN,
                            "payload": {"user_id": guest_id},
                        }
                    )
                )

                # Guest receives join approved with full room state
                guest_approved = json.loads(guest_ws.receive_text())
                self.assertEqual(guest_approved["type"], MessageTypes.JOIN_APPROVED)
                self.assertEqual(guest_approved["payload"]["room_code"], room_code)
                self.assertEqual(len(guest_approved["payload"]["state"]["users"]), 2)

                # Host receives user_joined notification
                host_user_joined = json.loads(host_ws.receive_text())
                self.assertEqual(host_user_joined["type"], MessageTypes.USER_JOINED)
                self.assertEqual(host_user_joined["payload"]["username"], "GuestListener")

                # 3. Host broadcasts playback action PLAY
                host_ws.send_text(
                    json.dumps(
                        {
                            "type": MessageTypes.PLAYBACK_ACTION,
                            "payload": {
                                "action": PlaybackActions.PLAY,
                                "position": 42000,
                            },
                        }
                    )
                )

                # Both host and guest receive sync_playback event with monotonic revision
                sync_host = json.loads(host_ws.receive_text())
                sync_guest = json.loads(guest_ws.receive_text())

                self.assertEqual(sync_host["type"], MessageTypes.SYNC_PLAYBACK)
                self.assertEqual(sync_guest["type"], MessageTypes.SYNC_PLAYBACK)
                self.assertEqual(sync_guest["payload"]["action"], PlaybackActions.PLAY)
                self.assertEqual(sync_guest["payload"]["position"], 42000)
                self.assertEqual(sync_guest["payload"]["revision"], 1)


if __name__ == "__main__":
    unittest.main()
