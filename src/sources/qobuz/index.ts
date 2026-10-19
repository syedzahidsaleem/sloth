/**
 * Sloth Qobuz Hi-Res Lossless Audio Source Plugin
 * Ported from Meld (GPL-3.0) by MetrolistGroup
 * (C) 2026 MetrolistGroup / Adapted for Sloth
 *
 * Implements ISRC lookup, FLAC/Hi-Res (24-bit/96kHz, 24-bit/192kHz) resolution,
 * official API authentication via QOBUZ_APP_ID/QOBUZ_APP_SECRET, and public mirror fallbacks.
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

export interface QobuzConfig {
  appId?: string;
  appSecret?: string;
  userAuthToken?: string;
  mirrorBaseUrls?: string[];
  defaultCountry?: string;
}

export class QobuzAudioSource implements AudioSource {
  public readonly id = 'qobuz';
  public readonly label = 'Qobuz Hi-Res Lossless';
  public readonly supportsLossless = true;

  // Nuclear Plugin SDK compatibility
  public readonly name = 'Qobuz Hi-Res Lossless';
  public readonly kind = 'streaming' as const;

  private appId?: string;
  private appSecret?: string;
  private userAuthToken?: string;
  private mirrors: string[];
  private country: string;

  constructor(config: QobuzConfig = {}) {
    const globalProcess = typeof globalThis !== 'undefined' ? (globalThis as any).process : undefined;
    this.appId = config.appId || globalProcess?.env?.QOBUZ_APP_ID;
    this.appSecret = config.appSecret || globalProcess?.env?.QOBUZ_APP_SECRET;
    this.userAuthToken = config.userAuthToken;
    this.mirrors = config.mirrorBaseUrls || [
      'https://qobuz.squid.wtf',
      'https://qobuz.kennyy.com.br',
      'https://trypt-hifi-dl-456461932686.us-west1.run.app',
    ];
    this.country = config.defaultCountry || 'US';
  }

  /**
   * Search Qobuz catalog for tracks
   */
  public async search(query: string): Promise<SourceSearchResult[]> {
    // 1. Try official API if credentials exist
    if (this.appId) {
      try {
        return await this.searchOfficial(query);
      } catch {
        // Fall back to mirrors
      }
    }

    // 2. Query mirrors
    for (const mirror of this.mirrors) {
      try {
        const url = `${mirror}/api/get-music?q=${encodeURIComponent(query)}&offset=0`;
        const resp = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'Token-Country': this.country,
          },
        });

        if (!resp.ok) continue;
        const json = await resp.json();
        if (!json.success || !json.data?.tracks?.items) continue;

        const items: any[] = json.data.tracks.items;
        return items.map((t: any) => ({
          id: String(t.id),
          title: t.title,
          artist: t.performer?.name || t.artist?.name || 'Unknown Artist',
          album: t.album?.title,
          durationSeconds: t.duration,
          isrc: t.isrc,
          sourceId: this.id,
          thumbnailUrl: t.album?.image?.small || t.album?.image?.thumbnail,
          lossless: true,
          bitrate: t.maximum_bit_depth && t.maximum_bit_depth > 16 ? 9216000 : 1411200,
          bitDepth: t.maximum_bit_depth || 16,
          sampleRate: t.maximum_sampling_rate ? t.maximum_sampling_rate * 1000 : 44100,
        }));
      } catch {
        // Try next mirror
      }
    }

    return [];
  }

  /**
   * Official Qobuz Catalog Search
   */
  private async searchOfficial(query: string): Promise<SourceSearchResult[]> {
    const url = `https://www.qobuz.com/api.json/0.2/catalog/search?query=${encodeURIComponent(query)}&type=tracks&limit=15&app_id=${this.appId}`;
    const resp = await fetch(url, {
      headers: {
        'X-App-Id': this.appId!,
        ...(this.appSecret ? { 'X-App-Secret': this.appSecret } : {}),
        ...(this.userAuthToken ? { 'X-User-Auth-Token': this.userAuthToken } : {}),
      },
    });

    if (!resp.ok) throw new Error(`Qobuz official search HTTP ${resp.status}`);
    const data = await resp.json();
    const tracks: any[] = data.tracks?.items || [];

    return tracks.map((t: any) => ({
      id: String(t.id),
      title: t.title,
      artist: t.performer?.name || 'Unknown Artist',
      album: t.album?.title,
      durationSeconds: t.duration,
      isrc: t.isrc,
      sourceId: this.id,
      thumbnailUrl: t.album?.image?.small,
      lossless: true,
      bitrate: t.maximum_bit_depth > 16 ? 9216000 : 1411200,
      bitDepth: t.maximum_bit_depth || 16,
      sampleRate: t.maximum_sampling_rate ? t.maximum_sampling_rate * 1000 : 44100,
    }));
  }

  /**
   * Resolve audio stream with ISRC prioritization and quality cascade
   */
  public async resolve(track: TrackMeta): Promise<SourceResolvedStream> {
    let qobuzTrackId = track.id;
    let candidateIsrc = track.isrc;

    // If ID is not numeric, look up via ISRC or title+artist
    if (!/^\d+$/.test(qobuzTrackId)) {
      let candidates: SourceSearchResult[] = [];

      // Priority 1: ISRC lookup
      if (track.isrc) {
        candidates = await this.search(track.isrc);
      }

      // Priority 2: Title + Artist fallback
      if (candidates.length === 0) {
        candidates = await this.search(`${track.title} ${track.artist}`.trim());
      }

      if (candidates.length === 0) {
        throw new Error(`Qobuz: No matches found for "${track.title}" by "${track.artist}"`);
      }

      // Score candidates
      const matches = candidates.map((c) => matchTrack(track, c));
      matches.sort((a, b) => b.confidence - a.confidence);

      const best = matches[0];
      qobuzTrackId = best.candidate.id;
      candidateIsrc = best.candidate.isrc || candidateIsrc;
    }

    // Resolve stream via mirrors or official API
    for (const mirror of this.mirrors) {
      try {
        // Quality 27 = 24-bit / up to 192kHz Hi-Res FLAC
        // Quality 6  = 16-bit / 44.1kHz CD Lossless FLAC
        // Quality 5  = 320kbps MP3 fallback
        for (const quality of [27, 6, 5]) {
          const url = `${mirror}/api/download-music?track_id=${qobuzTrackId}&quality=${quality}`;
          const resp = await fetch(url, {
            headers: {
              Accept: 'application/json',
              'Token-Country': this.country,
              Referer: `${mirror}/`,
            },
          });

          if (!resp.ok) continue;
          const json = await resp.json();
          if (!json.success || !json.data?.url) continue;

          const streamUrl = json.data.url;
          const isHiRes = quality === 27;

          return {
            url: streamUrl,
            sourceId: this.id,
            trackId: qobuzTrackId,
            title: track.title,
            artist: track.artist,
            mimeType: quality === 5 ? 'audio/mpeg' : 'audio/flac',
            codec: quality === 5 ? 'mp3' : 'flac',
            bitrate: isHiRes ? 9216000 : quality === 6 ? 1411200 : 320000,
            sampleRate: isHiRes ? 96000 : 44100,
            bitDepth: isHiRes ? 24 : 16,
            isLossless: quality !== 5,
            isrc: candidateIsrc,
            expiresAt: Date.now() + 3600 * 1000,
          };
        }
      } catch {
        // Try next mirror
      }
    }

    throw new Error(`Qobuz: Failed to resolve lossless stream for trackId ${qobuzTrackId}`);
  }

  /**
   * Confidence evaluation
   */
  public getConfidence(track: TrackMeta, candidate?: SourceSearchResult): number {
    if (!candidate) {
      return track.isrc ? 1.0 : 0.85;
    }
    return matchTrack(track, candidate).confidence;
  }

  /**
   * Health check / Ping
   */
  public async ping(): Promise<{ online: boolean; latencyMs: number }> {
    const start = Date.now();
    for (const mirror of this.mirrors) {
      try {
        const resp = await fetch(mirror, { method: 'HEAD', mode: 'no-cors' });
        if (resp) {
          return { online: true, latencyMs: Date.now() - start };
        }
      } catch {
        // Continue
      }
    }
    return { online: false, latencyMs: 999 };
  }

  // --- Nuclear Compatibility ---
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
    const res = await this.resolve({
      id: candidateId,
      title: 'Unknown Title',
      artist: 'Unknown Artist',
    });
    return {
      streamUrl: res.url,
      source: this.id,
      format: res.mimeType,
      bitrate: res.bitrate,
    };
  }
}

export const qobuzSource = new QobuzAudioSource();
