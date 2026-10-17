/**
 * Sloth MCP Server Type Definitions
 * Compatible with Nuclear MCP schemas and Sloth internal audio engine.
 */

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  durationSeconds?: number;
  durationMs?: number;
  coverUrl?: string;
  sourceUrl?: string;
  isFavorite?: boolean;
  valence?: number;
  arousal?: number;
}

export interface QueueItem {
  id: string;
  track: Track;
  addedAt: number;
  position: number;
}

export interface PlaybackState {
  status: 'playing' | 'paused' | 'stopped';
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  volume: number; // 0 - 100
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  currentTrack: Track | null;
}

export interface MoodRecommendationResult {
  targetValence: number;
  targetArousal: number;
  tracks: Track[];
  message: string;
}

export interface MethodParamMeta {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
}

export interface MethodMeta {
  name: string;
  description: string;
  params: MethodParamMeta[];
  returns: string;
}

export interface DomainMeta {
  domain: string;
  description: string;
  methods: string[];
}
