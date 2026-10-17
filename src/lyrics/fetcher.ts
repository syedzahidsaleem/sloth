/**
 * Sloth Lyrics Fetcher
 * Ported from Metrolist (GPL-3.0) by MetrolistGroup
 * (C) 2026 MetrolistGroup / Adapted for Sloth
 *
 * Implements Metrolist's multi-step LRCLib query cascade, title/artist sanitization,
 * relaxed duration matching, and SQLite persistence caching in `lyrics` table.
 */

import {
  cleanTitle,
  cleanArtist,
  calculateStringSimilarity,
  parseLrc,
  ParsedLyrics,
} from './parser';
import { getLyricsByTrackId, upsertLyrics } from '../db/queries/lyrics';

export interface LrcLibTrack {
  id: number;
  trackName: string;
  artistName: string;
  albumName?: string;
  duration: number;
  instrumental: boolean;
  plainLyrics?: string;
  syncedLyrics?: string;
}

export interface LyricsFetchOptions {
  trackId?: string;
  title: string;
  artist: string;
  duration?: number;
  album?: string;
  baseUrl?: string;
  bypassCache?: boolean;
}

export class LyricsFetcher {
  private baseUrl: string;

  constructor(baseUrl = 'https://lrclib.net') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Queries LRCLib search endpoint with parameters
   */
  private async queryParams(params: Record<string, string>): Promise<LrcLibTrack[]> {
    const url = new URL(`${this.baseUrl}/api/search`);
    for (const [key, value] of Object.entries(params)) {
      if (value) url.searchParams.set(key, value);
    }

    try {
      const response = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Sloth-Music-Player/1.0 (Metrolist-LRCLib-Port)',
        },
      });

      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  /**
   * 5-Strategy search cascade from Metrolist LrcLib.kt:
   * 1. Search with cleaned title and artist (+ optional album)
   * 2. Search with cleaned title only
   * 3. Combined query `q` with cleaned artist + cleaned title
   * 4. Combined query `q` with cleaned title
   * 5. Raw title and raw artist
   */
  public async queryLyrics(title: string, artist: string, album?: string): Promise<LrcLibTrack[]> {
    const cleanedT = cleanTitle(title);
    const cleanedA = cleanArtist(artist);

    // Strategy 1: Search with cleaned title and artist
    const params1: Record<string, string> = {
      track_name: cleanedT,
      artist_name: cleanedA,
    };
    if (album) params1.album_name = album;

    let results = (await this.queryParams(params1)).filter((t) => t.syncedLyrics || t.plainLyrics);
    if (results.length > 0) return results;

    // Strategy 2: Search with cleaned title only
    results = (await this.queryParams({ track_name: cleanedT })).filter((t) => t.syncedLyrics || t.plainLyrics);
    if (results.length > 0) return results;

    // Strategy 3: Combined q query with cleaned artist and title
    results = (await this.queryParams({ q: `${cleanedA} ${cleanedT}` })).filter((t) => t.syncedLyrics || t.plainLyrics);
    if (results.length > 0) return results;

    // Strategy 4: Combined q query with just cleaned title
    results = (await this.queryParams({ q: cleanedT })).filter((t) => t.syncedLyrics || t.plainLyrics);
    if (results.length > 0) return results;

    // Strategy 5: Raw title and artist if different from cleaned
    if (cleanedT !== title.trim() || cleanedA !== artist.trim()) {
      results = (await this.queryParams({ track_name: title.trim(), artist_name: artist.trim() })).filter(
        (t) => t.syncedLyrics || t.plainLyrics
      );
    }

    return results;
  }

  /**
   * Fetches the single best matching lyrics item with caching in SQLite
   */
  public async getLyrics(options: LyricsFetchOptions): Promise<ParsedLyrics | null> {
    const { trackId, title, artist, duration = -1, album, bypassCache = false } = options;

    // 1. Check local SQLite cache first (if trackId provided and not bypassing cache)
    if (trackId && !bypassCache) {
      try {
        const cached = getLyricsByTrackId(trackId);
        if (cached && (cached.lrcContent || cached.plainContent)) {
          const raw = cached.lrcContent || cached.plainContent || '';
          const parsed = parseLrc(raw);
          parsed.trackName = title;
          parsed.artistName = artist;
          return parsed;
        }
      } catch {
        // Fallback to network if DB query fails
      }
    }

    // 2. Query LRCLib API cascade
    const tracks = await this.queryLyrics(title, artist, album);
    if (tracks.length === 0) return null;

    const cleanedT = cleanTitle(title);
    const cleanedA = cleanArtist(artist);

    let bestTrack: LrcLibTrack | null = null;

    if (duration === -1) {
      // Pick best by string similarity and preference for synced lyrics
      let bestScore = -1;
      for (const track of tracks) {
        let score = 0;
        if (track.syncedLyrics) score += 1.0;

        const titleSim = calculateStringSimilarity(cleanedT, track.trackName);
        const artistSim = calculateStringSimilarity(cleanedA, track.artistName);
        score += (titleSim + artistSim) / 2.0;

        if (score > bestScore) {
          bestScore = score;
          bestTrack = track;
        }
      }
    } else {
      // Metrolist Relaxed duration matching: ±5 seconds
      const candidates = tracks.filter((t) => Math.abs(t.duration - duration) <= 5);
      if (candidates.length > 0) {
        // Prioritize synced lyrics, then closest duration
        candidates.sort((a, b) => {
          if (a.syncedLyrics && !b.syncedLyrics) return -1;
          if (!a.syncedLyrics && b.syncedLyrics) return 1;
          return Math.abs(a.duration - duration) - Math.abs(b.duration - duration);
        });
        bestTrack = candidates[0];
      } else {
        // Fallback to closest duration overall
        const sorted = [...tracks].sort((a, b) => Math.abs(a.duration - duration) - Math.abs(b.duration - duration));
        bestTrack = sorted[0];
      }
    }

    if (!bestTrack) return null;

    const rawLyrics = bestTrack.syncedLyrics || bestTrack.plainLyrics;
    if (!rawLyrics) return null;

    const parsed = parseLrc(rawLyrics);
    parsed.trackName = bestTrack.trackName;
    parsed.artistName = bestTrack.artistName;
    parsed.duration = bestTrack.duration;

    // 3. Cache result in SQLite if trackId is present
    if (trackId) {
      try {
        upsertLyrics({
          trackId,
          lrcContent: bestTrack.syncedLyrics || null,
          plainContent: bestTrack.plainLyrics || parsed.plainText || null,
          source: 'lrclib',
        });
      } catch {
        // Ignore cache write errors
      }
    }

    return parsed;
  }
}

// Export default singleton instance
export const lyricsFetcher = new LyricsFetcher();
