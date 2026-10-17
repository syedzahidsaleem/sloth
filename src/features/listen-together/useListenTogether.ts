/**
 * Sloth useListenTogether Hook
 * Manages WebSocket connection, Metrolist protocol messages, NTP ping/pong,
 * peer list, live chat, and playback synchronization with drift correction.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChatMessage,
  DriftReport,
  Peer,
  RoomState,
  SyncPlaybackPayload,
} from './types';
import { SyncEngine, syncEngine } from './SyncEngine';

const STORAGE_KEY_TOKEN = 'sloth_lt_token';
const STORAGE_KEY_ROOM = 'sloth_lt_room';
const STORAGE_KEY_USER = 'sloth_lt_user';
const DEFAULT_SERVER_URL = 'ws://127.0.0.1:8000/ws';

export interface UseListenTogetherOptions {
  serverUrl?: string;
  currentPlaybackSeconds?: number;
  isPlaying?: boolean;
  onSyncPlayback?: (payload: SyncPlaybackPayload) => void;
  onSeekCorrection?: (targetSeconds: number) => void;
  engine?: SyncEngine;
}

export function useListenTogether(options: UseListenTogetherOptions = {}) {
  const {
    serverUrl = DEFAULT_SERVER_URL,
    currentPlaybackSeconds = 0,
    isPlaying = false,
    onSyncPlayback,
    onSeekCorrection,
    engine = syncEngine,
  } = options;

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_TOKEN);
    } catch {
      return null;
    }
  });
  const [username, setUsername] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_USER) || 'SlothListener';
    } catch {
      return 'SlothListener';
    }
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [driftReport, setDriftReport] = useState<DriftReport | null>(null);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [pendingJoinRequests, setPendingJoinRequests] = useState<{ user_id: string; username: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentPlaybackRef = useRef(currentPlaybackSeconds);
  const isPlayingRef = useRef(isPlaying);
  const onSyncPlaybackRef = useRef(onSyncPlayback);
  const onSeekCorrectionRef = useRef(onSeekCorrection);

  currentPlaybackRef.current = currentPlaybackSeconds;
  isPlayingRef.current = isPlaying;
  onSyncPlaybackRef.current = onSyncPlayback;
  onSeekCorrectionRef.current = onSeekCorrection;

  const isHost = Boolean(roomState && userId && roomState.host_id === userId);
  const peers: Peer[] = roomState?.users || [];

  /**
   * Send JSON message down the WebSocket.
   */
  const send = useCallback((type: string, payload: Record<string, unknown> = {}) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  /**
   * Connect WebSocket.
   */
  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const ws = new WebSocket(serverUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setConnecting(false);
        setError(null);

        // Start NTP ping interval every 4 seconds
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            const ping = engine.createPing();
            ws.send(JSON.stringify({ type: 'ping', payload: ping }));
          }
        }, 4000);

        // Immediate first ping
        const firstPing = engine.createPing();
        ws.send(JSON.stringify({ type: 'ping', payload: firstPing }));

        // Attempt reconnect if session token exists
        const token = localStorage.getItem(STORAGE_KEY_TOKEN);
        if (token) {
          ws.send(JSON.stringify({ type: 'reconnect', payload: { session_token: token } }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const type = data.type;
          const payload = data.payload || {};

          switch (type) {
            case 'pong':
              engine.processPong(payload);
              break;

            case 'room_created': {
              const { room_code, user_id, session_token } = payload;
              setUserId(user_id);
              setSessionToken(session_token);
              localStorage.setItem(STORAGE_KEY_TOKEN, session_token);
              localStorage.setItem(STORAGE_KEY_ROOM, room_code);
              setRoomState({
                room_code,
                host_id: user_id,
                users: [{ user_id, username, is_host: true, is_connected: true }],
                current_track: null,
                is_playing: false,
                position: 0,
                last_update: Date.now(),
                volume: 1.0,
                queue: [],
                revision: 0,
              });
              setIsPendingApproval(false);
              break;
            }

            case 'join_approved': {
              const { room_code, user_id, session_token, state } = payload;
              setUserId(user_id);
              setSessionToken(session_token);
              localStorage.setItem(STORAGE_KEY_TOKEN, session_token);
              localStorage.setItem(STORAGE_KEY_ROOM, room_code);
              setRoomState(state);
              setIsPendingApproval(false);
              break;
            }

            case 'join_request': {
              setPendingJoinRequests((prev) => [...prev, { user_id: payload.user_id, username: payload.username }]);
              break;
            }

            case 'join_rejected': {
              setIsPendingApproval(false);
              setError(payload.reason || 'Join request rejected');
              break;
            }

            case 'user_joined': {
              setRoomState((prev) => {
                if (!prev) return null;
                const existing = prev.users.find((u) => u.user_id === payload.user_id);
                const updatedUsers = existing
                  ? prev.users.map((u) => (u.user_id === payload.user_id ? { ...u, is_connected: true } : u))
                  : [
                      ...prev.users,
                      {
                        user_id: payload.user_id,
                        username: payload.username,
                        is_host: false,
                        is_connected: true,
                      },
                    ];
                return { ...prev, users: updatedUsers };
              });
              break;
            }

            case 'user_left':
            case 'user_disconnected': {
              setRoomState((prev) => {
                if (!prev) return null;
                return {
                  ...prev,
                  users: prev.users.map((u) => (u.user_id === payload.user_id ? { ...u, is_connected: false } : u)),
                };
              });
              break;
            }

            case 'sync_playback': {
              const syncEvent: SyncPlaybackPayload = {
                action: payload.action,
                position: payload.position,
                is_playing: payload.is_playing ?? false,
                server_time: payload.server_time,
                revision: payload.revision,
                user_id: payload.user_id,
                track_info: payload.track_info,
                volume: payload.volume,
              };

              setRoomState((prev) => {
                if (!prev) return null;
                return {
                  ...prev,
                  is_playing: syncEvent.is_playing,
                  position: syncEvent.position,
                  last_update: syncEvent.server_time,
                  revision: syncEvent.revision,
                  volume: syncEvent.volume ?? prev.volume,
                  current_track: syncEvent.track_info || prev.current_track,
                };
              });

              if (onSyncPlaybackRef.current) {
                onSyncPlaybackRef.current(syncEvent);
              }
              break;
            }

            case 'chat_message': {
              const msg: ChatMessage = {
                id: payload.id,
                user_id: payload.user_id,
                username: payload.username,
                message: payload.message,
                timestamp_ms: payload.timestamp_ms || Date.now(),
              };
              setChatMessages((prev) => [...prev, msg]);
              break;
            }

            case 'host_changed': {
              setRoomState((prev) => {
                if (!prev) return null;
                return {
                  ...prev,
                  host_id: payload.new_host_id,
                  users: prev.users.map((u) => ({
                    ...u,
                    is_host: u.user_id === payload.new_host_id,
                  })),
                };
              });
              break;
            }

            case 'kicked': {
              setRoomState(null);
              setError(payload.reason || 'You were removed from the room');
              localStorage.removeItem(STORAGE_KEY_TOKEN);
              localStorage.removeItem(STORAGE_KEY_ROOM);
              break;
            }

            case 'reconnected': {
              setRoomState(payload.state);
              setUserId(payload.user_id);
              break;
            }

            case 'error': {
              setError(payload.message || 'Server error');
              break;
            }

            default:
              break;
          }
        } catch (e) {
          console.error('Error handling WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        setConnecting(false);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

        // Schedule auto-reconnect in 3s
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = () => {
        setError('WebSocket connection error');
        setConnected(false);
        setConnecting(false);
      };
    } catch (e) {
      setError(`Failed to connect: ${e}`);
      setConnecting(false);
    }
  }, [serverUrl, username, engine]);

  // Connect on initial mount
  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Periodic drift check for non-host clients when in an active room
  useEffect(() => {
    if (!roomState || isHost || !roomState.is_playing) {
      setDriftReport(null);
      return;
    }

    const interval = setInterval(() => {
      const report = engine.checkDrift(roomState, currentPlaybackRef.current);
      setDriftReport(report);

      if (report.needsCorrection && onSeekCorrectionRef.current) {
        onSeekCorrectionRef.current(report.expectedSeconds);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [roomState, isHost, engine]);

  // Actions
  const createRoom = useCallback(
    (customUsername?: string) => {
      const uName = customUsername || username;
      setUsername(uName);
      localStorage.setItem(STORAGE_KEY_USER, uName);
      send('create_room', { username: uName });
    },
    [send, username]
  );

  const joinRoom = useCallback(
    (roomCode: string, customUsername?: string) => {
      const uName = customUsername || username;
      setUsername(uName);
      localStorage.setItem(STORAGE_KEY_USER, uName);
      setIsPendingApproval(true);
      setError(null);
      send('join_room', { room_code: roomCode.trim().toUpperCase(), username: uName });
    },
    [send, username]
  );

  const leaveRoom = useCallback(() => {
    send('leave_room', {});
    setRoomState(null);
    setUserId(null);
    setSessionToken(null);
    setChatMessages([]);
    setPendingJoinRequests([]);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_ROOM);
  }, [send]);

  const sendPlaybackAction = useCallback(
    (
      action: 'play' | 'pause' | 'seek' | 'change_track' | 'set_volume',
      positionSeconds?: number,
      extra?: Record<string, unknown>
    ) => {
      const posMs = positionSeconds !== undefined ? Math.round(positionSeconds * 1000) : Math.round(currentPlaybackRef.current * 1000);
      send('playback_action', {
        action,
        position: posMs,
        ...extra,
      });
    },
    [send]
  );

  const sendChat = useCallback(
    (message: string) => {
      if (!message.trim()) return;
      send('chat', { message: message.trim() });
    },
    [send]
  );

  const approveJoin = useCallback(
    (targetUserId: string) => {
      send('approve_join', { user_id: targetUserId });
      setPendingJoinRequests((prev) => prev.filter((r) => r.user_id !== targetUserId));
    },
    [send]
  );

  const rejectJoin = useCallback(
    (targetUserId: string, reason?: string) => {
      send('reject_join', { user_id: targetUserId, reason: reason || 'Host rejected the join request' });
      setPendingJoinRequests((prev) => prev.filter((r) => r.user_id !== targetUserId));
    },
    [send]
  );

  const kickUser = useCallback(
    (targetUserId: string, reason?: string) => {
      send('kick_user', { user_id: targetUserId, reason: reason || 'Removed by host' });
    },
    [send]
  );

  const transferHost = useCallback(
    (newHostId: string) => {
      send('transfer_host', { new_host_id: newHostId });
    },
    [send]
  );

  return {
    connected,
    connecting,
    roomState,
    userId,
    sessionToken,
    username,
    isHost,
    peers,
    chatMessages,
    driftReport,
    isPendingApproval,
    pendingJoinRequests,
    error,
    clockOffsetMs: engine.getClockOffset(),
    createRoom,
    joinRoom,
    leaveRoom,
    sendPlaybackAction,
    sendChat,
    approveJoin,
    rejectJoin,
    kickUser,
    transferHost,
  };
}
