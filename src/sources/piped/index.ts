/**
 * Sloth Piped & Invidious Proxy Client
 * Ported from Spotube (GPL-3.0) by team-spotube
 * (C) 2026 Spotube contributors / Adapted for Sloth
 *
 * Implements Piped & Invidious proxy routing, dynamic instance health monitoring,
 * latency scoring, failover rotation, and audio stream extraction.
 */

export interface PipedInstance {
  apiBase: string;
  name: string;
  pingMs?: number;
  isDown?: boolean;
}

export interface PipedAudioStream {
  url: string;
  format: 'M4A' | 'WEBM';
  quality: string;
  bitrate: number;
  codec: string;
}

export interface PipedSourceMap {
  m4a: {
    high: string;
    medium: string;
    low: string;
  };
  webm: {
    high: string;
    medium: string;
    low: string;
  };
}

export interface PipedStreamManifest {
  id: string;
  title: string;
  uploader: string;
  uploaderUrl?: string;
  duration: number;
  thumbnailUrl: string;
  audioStreams: PipedAudioStream[];
  sourceMap?: PipedSourceMap;
}

export interface PipedSearchResultItem {
  type: 'stream' | 'channel' | 'playlist';
  url: string;
  title: string;
  thumbnail: string;
  uploaderName: string;
  uploaderUrl?: string;
  uploaderAvatar?: string;
  duration?: number;
  views?: number;
}

export const DEFAULT_PIPED_INSTANCES: PipedInstance[] = [
  { apiBase: 'https://pipedapi.kavin.rocks', name: 'Kavin Rocks (Official)' },
  { apiBase: 'https://api.piped.privacydev.net', name: 'PrivacyDev' },
  { apiBase: 'https://pipedapi.tokhmi.xyz', name: 'Tokhmi' },
  { apiBase: 'https://piped-api.garudalinux.org', name: 'Garuda Linux' },
  { apiBase: 'https://pipedapi.leptons.xyz', name: 'Leptons' },
];

export const DEFAULT_INVIDIOUS_INSTANCES = [
  'https://inv.tux.pizza',
  'https://invidious.nerdvpn.de',
  'https://yewtu.be',
  'https://vid.puffyan.us',
];

export class PipedClient {
  private instances: PipedInstance[];
  private activeIndex: number = 0;
  private timeoutMs: number;

  constructor(customInstances: PipedInstance[] = [], timeoutMs = 8000) {
    this.instances = customInstances.length > 0 ? customInstances : [...DEFAULT_PIPED_INSTANCES];
    this.timeoutMs = timeoutMs;
  }

  public getInstances(): PipedInstance[] {
    return [...this.instances];
  }

  public getActiveInstance(): PipedInstance {
    return this.instances[this.activeIndex] || this.instances[0];
  }

  /**
   * Rotates to the next healthy instance on failure or rate-limit
   */
  public rotateInstance(): PipedInstance {
    const current = this.getActiveInstance();
    current.isDown = true;

    for (let i = 0; i < this.instances.length; i++) {
      const candidateIndex = (this.activeIndex + 1 + i) % this.instances.length;
      if (!this.instances[candidateIndex].isDown) {
        this.activeIndex = candidateIndex;
        return this.instances[candidateIndex];
      }
    }

    // All marked down, reset and start from beginning
    this.instances.forEach((inst) => (inst.isDown = false));
    this.activeIndex = 0;
    return this.instances[0];
  }

  /**
   * Pings an instance to measure latency and verify health
   */
  public async pingInstance(instance: PipedInstance): Promise<number> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 4000);

      const resp = await fetch(`${instance.apiBase}/search?q=test&filter=music_songs`, {
        signal: controller.signal,
      });
      clearTimeout(id);

      if (resp.ok) {
        const ping = Date.now() - start;
        instance.pingMs = ping;
        instance.isDown = false;
        return ping;
      }
    } catch {
      // Instance unreachable
    }

    instance.isDown = true;
    instance.pingMs = 9999;
    return 9999;
  }

  /**
   * Ranks all instances by ping latency
   */
  public async refreshInstanceRankings(): Promise<void> {
    await Promise.all(this.instances.map((inst) => this.pingInstance(inst)));
    this.instances.sort((a, b) => (a.pingMs ?? 9999) - (b.pingMs ?? 9999));
    this.activeIndex = 0;
  }

  /**
   * Searches Piped for music songs or videos
   */
  public async search(query: string, filter: 'music_songs' | 'videos' | 'all' = 'music_songs'): Promise<PipedSearchResultItem[]> {
    let attempts = 0;

    while (attempts < this.instances.length) {
      const instance = this.getActiveInstance();
      const url = `${instance.apiBase}/search?q=${encodeURIComponent(query)}&filter=${filter}`;

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        const resp = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);

        if (resp.ok) {
          const data = await resp.json();
          const items = Array.isArray(data.items) ? data.items : [];
          return items.map((it: any) => ({
            type: it.type || 'stream',
            url: it.url,
            title: it.title,
            thumbnail: it.thumbnail,
            uploaderName: it.uploaderName,
            uploaderUrl: it.uploaderUrl,
            uploaderAvatar: it.uploaderAvatar,
            duration: it.duration,
            views: it.views,
          }));
        } else if (resp.status >= 400) {
          this.rotateInstance();
        }
      } catch {
        this.rotateInstance();
      }

      attempts++;
    }

    throw new Error(`All Piped instances failed searching for "${query}"`);
  }

  /**
   * Extracts playable audio streams and compiles a SourceMap (Spotube pattern)
   */
  public async streams(videoId: string): Promise<PipedStreamManifest> {
    let attempts = 0;

    while (attempts < this.instances.length) {
      const instance = this.getActiveInstance();
      const url = `${instance.apiBase}/streams/${encodeURIComponent(videoId)}`;

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        const resp = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);

        if (resp.ok) {
          const data = await resp.json();
          const rawAudioStreams = Array.isArray(data.audioStreams) ? data.audioStreams : [];

          const audioStreams: PipedAudioStream[] = rawAudioStreams.map((s: any) => ({
            url: s.url,
            format: (s.format || '').toUpperCase().includes('WEBM') ? 'WEBM' : 'M4A',
            quality: s.quality || 'medium',
            bitrate: Number(s.bitrate || 128000),
            codec: s.codec || 'unknown',
          }));

          const m4aList = audioStreams.filter((s) => s.format === 'M4A').sort((a, b) => b.bitrate - a.bitrate);
          const webmList = audioStreams.filter((s) => s.format === 'WEBM').sort((a, b) => b.bitrate - a.bitrate);

          // Construct Spotube-style high / medium / low quality map
          const sourceMap: PipedSourceMap = {
            m4a: {
              high: m4aList[0]?.url || '',
              medium: m4aList[Math.floor(m4aList.length / 2)]?.url || m4aList[0]?.url || '',
              low: m4aList[m4aList.length - 1]?.url || '',
            },
            webm: {
              high: webmList[0]?.url || '',
              medium: webmList[Math.floor(webmList.length / 2)]?.url || webmList[0]?.url || '',
              low: webmList[webmList.length - 1]?.url || '',
            },
          };

          return {
            id: videoId,
            title: data.title || '',
            uploader: data.uploader || '',
            uploaderUrl: data.uploaderUrl,
            duration: data.duration || 0,
            thumbnailUrl: data.thumbnailUrl || '',
            audioStreams,
            sourceMap,
          };
        } else {
          this.rotateInstance();
        }
      } catch {
        this.rotateInstance();
      }

      attempts++;
    }

    // Secondary fallback: Invidious
    return this.fallbackInvidious(videoId);
  }

  /**
   * Fallback resolution through Invidious API
   */
  private async fallbackInvidious(videoId: string): Promise<PipedStreamManifest> {
    for (const invBase of DEFAULT_INVIDIOUS_INSTANCES) {
      try {
        const url = `${invBase}/api/v1/videos/${encodeURIComponent(videoId)}`;
        const resp = await fetch(url);
        if (resp.ok) {
          const data = await resp.json();
          const adaptive = Array.isArray(data.adaptiveFormats) ? data.adaptiveFormats : [];
          const audioAdaptive = adaptive.filter((f: any) => f.type?.startsWith('audio/'));

          const audioStreams: PipedAudioStream[] = audioAdaptive.map((f: any) => ({
            url: f.url,
            format: f.type.includes('webm') ? 'WEBM' : 'M4A',
            quality: f.audioQuality || 'medium',
            bitrate: Number(f.bitrate || 128000),
            codec: f.encoding || 'unknown',
          }));

          return {
            id: videoId,
            title: data.title,
            uploader: data.author,
            duration: data.lengthSeconds,
            thumbnailUrl: data.videoThumbnails?.[0]?.url || '',
            audioStreams,
          };
        }
      } catch {
        // Try next Invidious instance
      }
    }

    throw new Error(`Failed to resolve stream for ${videoId} across Piped and Invidious`);
  }
}

import type {
  AudioSource,
  TrackMeta,
  SourceSearchResult,
  SourceResolvedStream,
  NuclearStreamCandidate,
  NuclearStream,
} from '../types';
import { matchTrack } from '../matcher';

export class PipedAudioSource implements AudioSource {
  public readonly id = 'piped';
  public readonly label = 'Piped Proxy';
  public readonly supportsLossless = false;

  public readonly name = 'Piped Proxy';
  public readonly kind = 'streaming' as const;

  private client: PipedClient;

  constructor(client?: PipedClient) {
    this.client = client ?? new PipedClient();
  }

  public async search(query: string): Promise<SourceSearchResult[]> {
    const rawItems = await this.client.search(query, 'music_songs');
    return rawItems
      .filter((i) => i.type === 'stream')
      .map((item) => {
        // Extract video ID from URL (e.g. /watch?v=xyz or xyz)
        const id = item.url.includes('v=')
          ? item.url.split('v=')[1].split('&')[0]
          : item.url.replace(/^\/watch\?v=/, '');

        return {
          id,
          title: item.title,
          artist: item.uploaderName,
          durationSeconds: item.duration,
          sourceId: this.id,
          thumbnailUrl: item.thumbnail,
          lossless: false,
        };
      });
  }

  public async resolve(track: TrackMeta): Promise<SourceResolvedStream> {
    let videoId = track.id;
    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      const candidates = await this.search(`${track.title} ${track.artist}`.trim());
      if (candidates.length === 0) {
        throw new Error(`Piped: No search candidates found for "${track.title}"`);
      }
      const matches = candidates.map((cand) => matchTrack(track, cand));
      matches.sort((a, b) => b.confidence - a.confidence);
      videoId = matches[0].candidate.id;
    }

    const manifest = await this.client.streams(videoId);
    const bestAudio = manifest.audioStreams[0];
    if (!bestAudio) {
      throw new Error(`Piped: No audio stream found for ${videoId}`);
    }

    return {
      url: bestAudio.url,
      sourceId: this.id,
      trackId: videoId,
      title: manifest.title || track.title,
      artist: manifest.uploader || track.artist,
      mimeType: bestAudio.format === 'WEBM' ? 'audio/webm' : 'audio/mp4',
      codec: bestAudio.codec,
      bitrate: bestAudio.bitrate,
      isLossless: false,
      expiresAt: Date.now() + 4 * 3600 * 1000,
    };
  }

  public getConfidence(track: TrackMeta, candidate?: SourceSearchResult): number {
    if (!candidate) return 0.80;
    return matchTrack(track, candidate).confidence;
  }

  public async ping(): Promise<{ online: boolean; latencyMs: number }> {
    const active = this.client.getActiveInstance();
    const start = Date.now();
    try {
      const resp = await fetch(`${active.apiBase}/trending?region=US`, { method: 'HEAD' });
      return { online: resp.ok, latencyMs: Date.now() - start };
    } catch {
      return { online: false, latencyMs: 999 };
    }
  }

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
    const manifest = await this.client.streams(candidateId);
    const stream = manifest.audioStreams[0];
    return {
      streamUrl: stream.url,
      source: this.id,
      format: stream.format,
      bitrate: stream.bitrate,
    };
  }
}

export const pipedSource = new PipedAudioSource();

