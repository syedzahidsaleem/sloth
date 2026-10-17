/**
 * Sloth Universal Audio Source Plugin System — Type Contracts
 * Compatible with Nuclear's Plugin SDK and Meld's matching architectures.
 */

export interface TrackMeta {
  id: string;
  title: string;
  artist: string;
  album?: string;
  isrc?: string;
  durationSeconds?: number;
}

export interface SourceSearchResult {
  id: string;
  title: string;
  artist: string;
  album?: string;
  durationSeconds?: number;
  isrc?: string;
  sourceId: string;
  thumbnailUrl?: string;
  lossless?: boolean;
  bitrate?: number;
  bitDepth?: number;
  sampleRate?: number;
}

export interface SourceResolvedStream {
  url: string;
  sourceId: string;
  trackId: string;
  title: string;
  artist: string;
  mimeType: string;
  codec?: string;
  bitrate?: number;
  sampleRate?: number;
  bitDepth?: number;
  isLossless: boolean;
  expiresAt?: number;
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

export interface AudioSource {
  id: string;
  label: string;
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
