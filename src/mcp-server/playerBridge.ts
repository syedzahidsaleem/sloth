/**
 * Sloth Player Bridge
 * Connects the MCP server to Sloth's playback state, SQLite database,
 * and audio recommendation engine.
 */

import { PlaybackState, Track } from './types';
import { db as sqliteDb } from '../db';
import { searchTracks as searchSqliteTracks, getTrackById as getSqliteTrackById } from '../db/queries/tracks';

export const CATALOG_TRACKS: Track[] = [
  {
    id: '1',
    title: 'Midnight City',
    artist: 'M83',
    album: "Hurry Up, We're Dreaming",
    durationSeconds: 243,
    durationMs: 243000,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/cb/7b/a9/cb7ba903-b5f1-cc21-90db-7a81b7aa0997/724596951057.jpg/600x600bb.jpg',
    isFavorite: true,
    valence: 0.72,
    arousal: 0.85,
  },
  {
    id: '2',
    title: 'Starboy',
    artist: 'The Weeknd, Daft Punk',
    album: 'Starboy',
    durationSeconds: 230,
    durationMs: 230000,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/b5/92/bb/b592bb72-52e3-e756-9b26-9f56d08f47ab/16UMGIM67864.rgb.jpg/600x600bb.jpg',
    isFavorite: false,
    valence: 0.58,
    arousal: 0.76,
  },
  {
    id: '3',
    title: 'One More Time',
    artist: 'Daft Punk',
    album: 'Discovery',
    durationSeconds: 320,
    durationMs: 320000,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/fd/4a/77/fd4a77db-0ebc-d043-41a2-f32fa1bb0fb4/dj.qrikkdwj.jpg/600x600bb.jpg',
    isFavorite: true,
    valence: 0.80,
    arousal: 0.85,
  },
  {
    id: '4',
    title: 'Instant Crush',
    artist: 'Daft Punk ft. Julian Casablancas',
    album: 'Random Access Memories',
    durationSeconds: 337,
    durationMs: 337000,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/e8/43/5f/e8435ffa-b6b9-b171-40ab-4ff3959ab661/886443919266.jpg/600x600bb.jpg',
    isFavorite: false,
    valence: 0.49,
    arousal: 0.68,
  },
  {
    id: '5',
    title: 'Veridis Quo',
    artist: 'Daft Punk',
    album: 'Discovery',
    durationSeconds: 344,
    durationMs: 344000,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/fd/4a/77/fd4a77db-0ebc-d043-41a2-f32fa1bb0fb4/dj.qrikkdwj.jpg/600x600bb.jpg',
    isFavorite: true,
    valence: 0.82,
    arousal: 0.35,
  },
  {
    id: '6',
    title: 'Levitating',
    artist: 'Dua Lipa',
    album: 'Future Nostalgia',
    durationSeconds: 203,
    durationMs: 203000,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/6c/11/d6/6c11d681-aa3a-d59e-4c2e-f77e181026ab/190295092665.jpg/600x600bb.jpg',
    isFavorite: false,
    valence: 0.75,
    arousal: 0.82,
  },
  {
    id: '7',
    title: 'BAARISHEIN',
    artist: 'Anuv Jain',
    album: 'Baarishein - Single',
    durationSeconds: 208,
    durationMs: 208000,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/a7/46/2f/a7462f7e-6dde-b235-2f5e-90e31af919a7/7799192004134_cover.jpg/600x600bb.jpg',
    isFavorite: true,
    valence: 0.45,
    arousal: 0.35,
  },
];

export class PlayerBridge {
  private queue: Track[] = [...CATALOG_TRACKS];
  private queueIndex: number = 0;
  private isPlaying: boolean = false;
  private positionMs: number = 42000;
  private volume: number = 80; // 0 - 100
  private isMuted: boolean = false;
  private isShuffle: boolean = false;
  private repeatMode: 'off' | 'all' | 'one' = 'off';

  constructor() {
    this.queueIndex = 0;
  }

  public getState(): PlaybackState {
    const currentTrack = this.getCurrentTrack();
    return {
      status: this.isPlaying ? 'playing' : 'paused',
      isPlaying: this.isPlaying,
      positionMs: this.positionMs,
      durationMs: currentTrack?.durationMs || (currentTrack?.durationSeconds ? currentTrack.durationSeconds * 1000 : 0),
      volume: this.volume,
      isMuted: this.isMuted,
      isShuffle: this.isShuffle,
      repeatMode: this.repeatMode,
      currentTrack,
    };
  }

  public play(): { success: boolean; state: PlaybackState } {
    this.isPlaying = true;
    if (this.queue.length === 0) {
      this.queue = [...CATALOG_TRACKS];
      this.queueIndex = 0;
    }
    return { success: true, state: this.getState() };
  }

  public pause(): { success: boolean; state: PlaybackState } {
    this.isPlaying = false;
    return { success: true, state: this.getState() };
  }

  public next(): { success: boolean; state: PlaybackState } {
    if (this.queue.length === 0) {
      return { success: false, state: this.getState() };
    }

    if (this.isShuffle) {
      this.queueIndex = Math.floor(Math.random() * this.queue.length);
    } else {
      this.queueIndex = (this.queueIndex + 1) % this.queue.length;
    }
    this.positionMs = 0;
    return { success: true, state: this.getState() };
  }

  public previous(): { success: boolean; state: PlaybackState } {
    if (this.queue.length === 0) {
      return { success: false, state: this.getState() };
    }

    if (this.positionMs > 3000) {
      this.positionMs = 0;
    } else {
      this.queueIndex = (this.queueIndex - 1 + this.queue.length) % this.queue.length;
      this.positionMs = 0;
    }
    return { success: true, state: this.getState() };
  }

  public seek(positionMs: number): { success: boolean; positionMs: number } {
    this.positionMs = Math.max(0, positionMs);
    return { success: true, positionMs: this.positionMs };
  }

  public setVolume(level: number): { success: boolean; volume: number } {
    this.volume = Math.min(100, Math.max(0, Math.round(level)));
    return { success: true, volume: this.volume };
  }

  public getQueue(): Track[] {
    return [...this.queue];
  }

  public addToQueue(trackId: string): { success: boolean; track: Track | null; queueLength: number } {
    let track: Track | null = null;

    // 1. Check in-memory catalog
    const foundCatalog = CATALOG_TRACKS.find((t) => t.id === trackId || t.title.toLowerCase() === trackId.toLowerCase());
    if (foundCatalog) {
      track = foundCatalog;
    } else {
      // 2. Check SQLite database
      try {
        const dbTrack = getSqliteTrackById(trackId, sqliteDb);
        if (dbTrack) {
          track = {
            id: dbTrack.id,
            title: dbTrack.title,
            artist: `Artist #${dbTrack.artistId}`,
            durationSeconds: Math.round((dbTrack.durationMs || 180000) / 1000),
            durationMs: dbTrack.durationMs || 180000,
            valence: dbTrack.valence || undefined,
            arousal: dbTrack.arousal || undefined,
          };
        }
      } catch {
        // Fallback gracefully
      }
    }

    if (track) {
      this.queue.push(track);
      return { success: true, track, queueLength: this.queue.length };
    }

    // If not found by exact ID, fallback create entry from ID
    const customTrack: Track = {
      id: trackId,
      title: `Track #${trackId}`,
      artist: 'Unknown Artist',
      durationSeconds: 180,
      durationMs: 180000,
    };
    this.queue.push(customTrack);
    return { success: true, track: customTrack, queueLength: this.queue.length };
  }

  public search(query: string): Track[] {
    const q = query.trim().toLowerCase();
    if (!q) return [...CATALOG_TRACKS];

    // Search catalog
    const catalogMatches = CATALOG_TRACKS.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        (t.album && t.album.toLowerCase().includes(q))
    );

    // Search SQLite database
    let dbMatches: Track[] = [];
    try {
      const results = searchSqliteTracks(query, 10, sqliteDb);
      dbMatches = results.map((dbt) => ({
        id: dbt.id,
        title: dbt.title,
        artist: `Artist #${dbt.artistId}`,
        durationSeconds: Math.round((dbt.durationMs || 180000) / 1000),
        durationMs: dbt.durationMs || 180000,
        valence: dbt.valence || undefined,
        arousal: dbt.arousal || undefined,
      }));
    } catch {
      // Database not yet populated or optional
    }

    const combined = [...catalogMatches];
    for (const d of dbMatches) {
      if (!combined.some((t) => t.id === d.id)) {
        combined.push(d);
      }
    }

    return combined;
  }

  public getCurrentTrack(): Track | null {
    if (this.queue.length === 0) return null;
    return this.queue[this.queueIndex] || this.queue[0];
  }

  public getTrackById(id: string): Track | null {
    const fromQueue = this.queue.find((t) => t.id === id);
    if (fromQueue) return fromQueue;

    const fromCatalog = CATALOG_TRACKS.find((t) => t.id === id);
    if (fromCatalog) return fromCatalog;

    try {
      const dbt = getSqliteTrackById(id, sqliteDb);
      if (dbt) {
        return {
          id: dbt.id,
          title: dbt.title,
          artist: `Artist #${dbt.artistId}`,
          durationSeconds: Math.round((dbt.durationMs || 180000) / 1000),
          durationMs: dbt.durationMs || 180000,
          valence: dbt.valence || undefined,
          arousal: dbt.arousal || undefined,
        };
      }
    } catch {
      // Ignore
    }

    return null;
  }

  /**
   * Set mood coordinates (valence, arousal) in Russell's circumplex model.
   * Ranks tracks by Euclidean proximity: sqrt((v - targetV)^2 + (a - targetA)^2)
   * Enqueues top recommendations into Sloth's queue.
   */
  public setMood(valence: number, arousal: number): {
    targetValence: number;
    targetArousal: number;
    recommendedTracks: Track[];
    message: string;
  } {
    const targetV = Math.max(0, Math.min(1, valence));
    const targetA = Math.max(0, Math.min(1, arousal));

    // Compute proximity for all tracks with valence/arousal metadata
    const scored = CATALOG_TRACKS.map((track) => {
      const v = track.valence ?? 0.5;
      const a = track.arousal ?? 0.5;
      const dist = Math.sqrt(Math.pow(v - targetV, 2) + Math.pow(a - targetA, 2));
      return { track, dist };
    });

    scored.sort((a, b) => a.dist - b.dist);
    const topMatches = scored.slice(0, 4).map((s) => s.track);

    // Enqueue recommended tracks
    for (const t of topMatches) {
      if (!this.queue.some((q) => q.id === t.id)) {
        this.queue.push(t);
      }
    }

    return {
      targetValence: targetV,
      targetArousal: targetA,
      recommendedTracks: topMatches,
      message: `SLOTH engine recommended ${topMatches.length} tracks for mood (valence=${targetV.toFixed(2)}, arousal=${targetA.toFixed(2)})`,
    };
  }

  public clearQueue(): void {
    this.queue = [];
    this.queueIndex = 0;
    this.isPlaying = false;
  }

  public toggle(): { success: boolean; state: PlaybackState } {
    return this.isPlaying ? this.pause() : this.play();
  }

  public stop(): { success: boolean; state: PlaybackState } {
    this.isPlaying = false;
    this.positionMs = 0;
    return { success: true, state: this.getState() };
  }

  public setMuted(muted: boolean): { success: boolean; isMuted: boolean } {
    this.isMuted = muted;
    return { success: true, isMuted: this.isMuted };
  }

  public setShuffle(enabled: boolean): { success: boolean; isShuffle: boolean } {
    this.isShuffle = enabled;
    return { success: true, isShuffle: this.isShuffle };
  }

  public setRepeatMode(mode: 'off' | 'all' | 'one'): { success: boolean; repeatMode: string } {
    this.repeatMode = mode;
    return { success: true, repeatMode: this.repeatMode };
  }
}

export const playerBridge = new PlayerBridge();
