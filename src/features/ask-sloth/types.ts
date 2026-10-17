/**
 * types.ts — Ask Sloth Natural Language Search Types
 */

import { Track } from '@/components/ui';

export interface AskSlothTrackResult {
  track_id: string;
  score: number;
  title: string;
  artist: string;
  artist_id?: string;
  album?: string;
  genres: string[];
  valence: number;
  arousal: number;
  bpm: number;
  key?: number;
  mode?: number;
}

export interface AskSlothParsedQuery {
  mood?: string;
  genres?: string[];
  activity?: string;
  filters?: {
    bpm_min?: number | null;
    bpm_max?: number | null;
  };
  text_embedding_query?: string;
  interpretation?: string;
}

export interface AskSlothResponse {
  query: string;
  interpretation: string;
  parsed_query: AskSlothParsedQuery;
  results: AskSlothTrackResult[];
  count: number;
  elapsed_ms: number;
}

export function resultToUITrack(res: AskSlothTrackResult): Track {
  return {
    id: res.track_id,
    title: res.title,
    artist: res.artist,
    album: res.album || 'Unknown Album',
    durationSeconds: 180 + (Math.abs(hashString(res.track_id)) % 140),
    coverUrl: `https://images.unsplash.com/photo-${1510000000000 + (Math.abs(hashString(res.track_id)) % 50000000)}?w=300&q=80`,
    badge: `${Math.round(res.bpm)} BPM • ${Math.round(res.score * 100)}% match`,
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
