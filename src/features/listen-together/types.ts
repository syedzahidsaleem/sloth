/**
 * Sloth Listen Together Types & Protocols
 * Ported from Metrolist metroserver specification.
 */

export interface TrackInfo {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  thumbnail?: string;
  suggested_by?: string;
}

export interface Peer {
  user_id: string;
  username: string;
  is_host: boolean;
  is_connected: boolean;
  joined_at?: number;
  avatar_url?: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  message: string;
  timestamp_ms: number;
}

export interface RoomState {
  room_code: string;
  session_id?: string;
  host_id: string;
  users: Peer[];
  current_track: TrackInfo | null;
  is_playing: boolean;
  position: number; // in milliseconds
  last_update: number; // server timestamp in ms
  volume: number;
  queue: TrackInfo[];
  revision: number;
  created_at?: number;
}

export interface SyncPlaybackPayload {
  action: 'play' | 'pause' | 'seek' | 'change_track' | 'set_volume' | 'queue_add' | 'queue_remove' | 'queue_clear';
  position: number; // in ms
  is_playing: boolean;
  server_time: number; // in ms
  revision: number;
  user_id?: string;
  track_info?: TrackInfo;
  volume?: number;
}

export interface NtpSample {
  t0: number; // client send
  t1: number; // server receive
  t2: number; // server send
  t3: number; // client receive
  rtt: number; // round-trip time in ms
  offset: number; // clock offset in ms (server - client)
}

export interface DriftReport {
  driftMs: number;
  needsCorrection: boolean;
  expectedSeconds: number;
  currentSeconds: number;
}
