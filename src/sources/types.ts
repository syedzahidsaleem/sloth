/**
 * Sloth Universal Audio Source Plugin System — Type Contracts
 * Compatible with Nuclear's Plugin SDK and Meld's matching architectures.
 */

/**
 * Metadata descriptor for a canonical music track.
 * Used across the application to uniquely identify and match tracks against audio backends.
 */
export interface TrackMeta {
  /** Canonical track identifier (UUID, local DB ID, or catalog ID) */
  id: string;
  /** Primary track title without extraneous audio/video noise */
  title: string;
  /** Primary performing artist or ensemble name */
  artist: string;
  /** Album name if known */
  album?: string;
  /** International Standard Recording Code (12 alphanumeric characters) */
  isrc?: string;
  /** Track playback length in seconds */
  durationSeconds?: number;
}

/**
 * A candidate search result returned by an audio source provider.
 */
export interface SourceSearchResult {
  /** Provider-specific stream or video/audio identifier */
  id: string;
  /** Track title as indexed by the audio source */
  title: string;
  /** Artist name as indexed by the audio source */
  artist: string;
  /** Album or release name if provided by source */
  album?: string;
  /** Track duration in seconds as reported by the source */
  durationSeconds?: number;
  /** ISRC code if cataloged by the provider */
  isrc?: string;
  /** Identifier of the source plugin that discovered this result */
  sourceId: string;
  /** Artwork or thumbnail preview URL */
  thumbnailUrl?: string;
  /** Flag indicating whether the source can deliver uncompressed or FLAC streams */
  lossless?: boolean;
  /** Stream bitrate in kbps (e.g. 128, 256, 320, 1411) */
  bitrate?: number;
  /** Audio bit depth (e.g. 16, 24) */
  bitDepth?: number;
  /** Audio sample rate in Hz (e.g. 44100, 48000, 96000) */
  sampleRate?: number;
}

/**
 * Playable audio stream resolution payload.
 */
export interface SourceResolvedStream {
  /** Fully qualified URI or signed playback stream URL */
  url: string;
  /** ID of the provider plugin that resolved this stream */
  sourceId: string;
  /** Canonical Sloth track identifier */
  trackId: string;
  /** Resolved track title */
  title: string;
  /** Resolved artist name */
  artist: string;
  /** Audio MIME type (e.g., 'audio/webm; codecs="opus"', 'audio/mp4') */
  mimeType: string;
  /** Audio codec (e.g., 'opus', 'aac', 'flac') */
  codec?: string;
  /** Bitrate in kbps */
  bitrate?: number;
  /** Sample rate in Hz */
  sampleRate?: number;
  /** Bit depth */
  bitDepth?: number;
  /** Whether the stream is lossless */
  isLossless: boolean;
  /** Unix timestamp (ms) after which the signed stream URL becomes invalid */
  expiresAt?: number;
  /** Canonical ISRC identifier */
  isrc?: string;
}

/**
 * Nuclear Plugin SDK Streaming Compatibility Types
 */
export interface NuclearStreamCandidate {
  id: string;
  title: string;
  artist: string;
  duration?: number;
  source: string;
  thumbnail?: string;
}

export interface NuclearStream {
  streamUrl: string;
  source: string;
  format?: string;
  bitrate?: number;
}

/**
 * Universal interface for audio providers (YouTube, SoundCloud, Bandcamp, local, etc.).
 */
export interface AudioSource {
  /** Unique provider slug (e.g. 'youtube', 'soundcloud') */
  id: string;
  /** Human-readable display label */
  label: string;
  /** Whether this provider natively supports lossless audio streaming */
  supportsLossless: boolean;

  /**
   * Search provider catalog for track candidates.
   */
  search(query: string): Promise<SourceSearchResult[]>;

  /**
   * Resolve a playable audio stream for the given track.
   */
  resolve(track: TrackMeta): Promise<SourceResolvedStream>;

  /**
   * Calculate confidence score (0.0 to 1.0) for a given track against the provider.
   */
  getConfidence(track: TrackMeta, candidate?: SourceSearchResult): number;

  /**
   * Check connection health and measure latency in milliseconds.
   */
  ping?(): Promise<{ online: boolean; latencyMs: number }>;

  // --- Nuclear Plugin SDK Compatibility Layer ---
  name?: string;
  kind?: 'streaming';
  searchForTrack?(
    artist: string,
    title: string,
    album?: string,
  ): Promise<NuclearStreamCandidate[]>;
  getStreamUrl?(candidateId: string): Promise<NuclearStream>;
}

export type MatchConfidenceMethod =
  | 'override'
  | 'isrc'
  | 'fuzzy'
  | 'duration_boost'
  | 'manual_flag';

export interface TrackMatchResult {
  candidate: SourceSearchResult;
  confidence: number;
  method: MatchConfidenceMethod;
  requiresManualOverride: boolean;
  scoreBreakdown?: {
    isrcExact: boolean;
    titleSimilarity: number;
    artistSimilarity: number;
    durationDiffSeconds?: number;
    durationBoost: number;
  };
}

export interface TrackOverride {
  trackId: string;
  sourceId: string;
  candidateId: string;
  streamUrl?: string;
  label?: string;
  isLossless?: boolean;
  timestamp: number;
  manual: boolean;
}

export interface SourceRegistryStatus {
  sourceId: string;
  label: string;
  enabled: boolean;
  priority: number;
  online: boolean;
  latencyMs: number;
  supportsLossless: boolean;
}
