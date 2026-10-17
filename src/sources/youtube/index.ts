/**
 * Sloth YouTube Audio Source Plugin
 * Wraps the Metrolist-derived InnerTube client into the universal AudioSource interface.
 */

import {
  AudioSource,
  TrackMeta,
  SourceSearchResult,
  SourceResolvedStream,
  NuclearStreamCandidate,
  NuclearStream,
} from '../types';
import { matchTrack } from '../matcher';
import {
  InnerTubeClient,
  YTSongItem,
} from './innertube-client';

export class YouTubeAudioSource implements AudioSource {
  public readonly id = 'youtube';
  public readonly label = 'YouTube Music';
  public readonly supportsLossless = false;

  // Nuclear Plugin SDK compatibility
  public readonly name = 'YouTube Music';
  public readonly kind = 'streaming' as const;

  private client: InnerTubeClient;

  constructor(client?: InnerTubeClient) {
    this.client = client ?? new InnerTubeClient();
  }

  /**
   * Search YouTube Music catalog
   */
  public async search(query: string): Promise<SourceSearchResult[]> {
    const rawResult = await this.client.search(query);
    const results: SourceSearchResult[] = [];

    // Check topResult
    if (rawResult.topResult && 'artists' in rawResult.topResult) {
      const top = rawResult.topResult as YTSongItem;
      results.push({
        id: top.id,
        title: top.title,
        artist: top.artists.map((a) => a.name).join(', '),
        album: top.album?.name,
        durationSeconds: top.duration,
        sourceId: this.id,
        thumbnailUrl: top.thumbnails?.[0]?.url,
        lossless: false,
      });
    }

    // Process summary shelves
    for (const summary of rawResult.summaries) {
      for (const item of summary.items) {
        if ('artists' in item && item.id) {
          const song = item as YTSongItem;
          // Avoid duplicate top result
          if (results.some((r) => r.id === song.id)) continue;

          results.push({
            id: song.id,
            title: song.title,
            artist: (song.artists || []).map((a) => a.name).join(', '),
            album: song.album?.name,
            durationSeconds: song.duration,
            sourceId: this.id,
            thumbnailUrl: song.thumbnails?.[0]?.url,
            lossless: false,
          });
        }
      }
    }

    return results;
  }

  /**
   * Resolve a playable audio stream for the given track metadata
   */
  public async resolve(track: TrackMeta): Promise<SourceResolvedStream> {
    // If track.id is a YouTube video ID (11 chars, alphanumeric with - or _)
    let videoId = track.id;
    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      // Perform targeted search: title + artist
      const query = `${track.title} ${track.artist}`.trim();
      const candidates = await this.search(query);
      if (candidates.length === 0) {
        throw new Error(`YouTube Music: No search candidates found for "${track.title}" by "${track.artist}"`);
      }

      // Rank candidates using matcher
      const matches = candidates.map((cand) => matchTrack(track, cand));
      matches.sort((a, b) => b.confidence - a.confidence);

      videoId = matches[0].candidate.id;
    }

    const stream = await this.client.resolveStreamUrl(videoId);

    return {
      url: stream.url,
      sourceId: this.id,
      trackId: videoId,
      title: track.title,
      artist: track.artist,
      mimeType: stream.mimeType.split(';')[0] || 'audio/webm',
      codec: stream.mimeType.includes('codecs="')
        ? stream.mimeType.split('codecs="')[1].split('"')[0]
        : 'opus',
      bitrate: stream.bitrate,
      isLossless: false,
      expiresAt: Date.now() + 6 * 3600 * 1000, // 6h URL expiry
    };
  }

  /**
   * Calculate confidence score for matching
   */
  public getConfidence(track: TrackMeta, candidate?: SourceSearchResult): number {
    if (!candidate) return 0.85; // Default YouTube confidence
    return matchTrack(track, candidate).confidence;
  }

  /**
   * Ping / Health check
   */
  public async ping(): Promise<{ online: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      await fetch('https://music.youtube.com/', { method: 'HEAD', mode: 'no-cors' });
      return { online: true, latencyMs: Date.now() - start };
    } catch {
      return { online: false, latencyMs: 999 };
    }
  }

  // --- Nuclear Compatibility Methods ---
  public async searchForTrack(
    artist: string,
    title: string,
    album?: string,
  ): Promise<NuclearStreamCandidate[]> {
    const query = [title, artist, album].filter(Boolean).join(' ');
    const results = await this.search(query);
    return results.map((r) => ({
      id: r.id,
      title: r.title,
      artist: r.artist,
      duration: r.durationSeconds,
      source: this.id,
      thumbnail: r.thumbnailUrl,
    }));
  }

  public async getStreamUrl(candidateId: string): Promise<NuclearStream> {
    const stream = await this.client.resolveStreamUrl(candidateId);
    return {
      streamUrl: stream.url,
      source: this.id,
      format: stream.mimeType,
      bitrate: stream.bitrate,
    };
  }
}

export const youtubeSource = new YouTubeAudioSource();
