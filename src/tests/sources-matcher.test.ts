import { describe, it, expect, beforeEach } from 'vitest';
import {
  normalizeText,
  levenshteinDistance,
  levenshteinSimilarity,
  tokenSimilarity,
  hybridStringSimilarity,
  matchTrack,
  matchOverrides,
} from '../sources/matcher';
import { SourceRegistry } from '../sources/registry';
import { AudioSource, TrackMeta, SourceSearchResult, SourceResolvedStream } from '../sources/types';

describe('Sloth Track Matching Pipeline & Overrides Store', () => {
  beforeEach(() => {
    matchOverrides.clearOverrides();
  });

  describe('Text Normalization & String Similarity', () => {
    it('normalizes accents, casing, and audio/video tag noise', () => {
      const dirty = 'Daft Punk - Instant Crush (Official Video) [Remastered 2021] feat. Julian Casablancas';
      const clean = normalizeText(dirty);
      expect(clean).toContain('daft punk');
      expect(clean).toContain('instant crush');
      expect(clean).not.toContain('official video');
      expect(clean).not.toContain('remastered');
    });

    it('computes exact Levenshtein distance and similarity', () => {
      expect(levenshteinDistance('hello', 'hello')).toBe(0);
      expect(levenshteinSimilarity('hello', 'hello')).toBe(1.0);
      expect(levenshteinSimilarity('Midnight City', 'Midnight City (Radio Edit)')).toBeGreaterThan(0.75);
    });

    it('handles Levenshtein distance boundary conditions with empty strings and single characters', () => {
      expect(levenshteinDistance('', '')).toBe(0);
      expect(levenshteinDistance('sloth', '')).toBe(5);
      expect(levenshteinDistance('', 'music')).toBe(5);
      expect(levenshteinDistance('a', 'b')).toBe(1);
      expect(levenshteinDistance('a', 'a')).toBe(0);
      expect(levenshteinSimilarity('', '')).toBe(1.0);
      expect(levenshteinSimilarity('a', '')).toBe(0.0);
      expect(levenshteinSimilarity('', 'song')).toBe(0.0);
    });

    it('handles token similarity boundary conditions with empty or non-alphanumeric inputs', () => {
      expect(tokenSimilarity('', '')).toBe(1.0);
      expect(tokenSimilarity('!!!', '???')).toBe(1.0);
      expect(tokenSimilarity('Sloth', '')).toBe(0.0);
      expect(tokenSimilarity('', 'Stream')).toBe(0.0);
      expect(tokenSimilarity('SingleWord', 'SingleWord')).toBe(1.0);
    });

    it('computes token similarity handling artist permutations', () => {
      const a = 'Daft Punk, The Weeknd';
      const b = 'The Weeknd & Daft Punk';
      const sim = tokenSimilarity(a, b);
      expect(sim).toBe(1.0);
    });

    it('blends token and character similarity in hybridStringSimilarity', () => {
      const score = hybridStringSimilarity('Starboy', 'Starboy (Official Audio)');
      expect(score).toBeGreaterThan(0.85);
    });
  });

  describe('Track Matching Pipeline Criteria', () => {
    it('Rule 1: produces confidence 1.0 on exact ISRC match', () => {
      const track: TrackMeta = {
        id: 'canonical-1',
        title: 'Midnight City',
        artist: 'M83',
        isrc: 'FR6V81100072',
        durationSeconds: 243,
      };

      const candidate: SourceSearchResult = {
        id: 'yt-12345',
        title: 'M83 - Midnight City (Alternative video title)',
        artist: 'Various Artists',
        isrc: 'FR6V81100072',
        sourceId: 'youtube',
        durationSeconds: 245,
      };

      const result = matchTrack(track, candidate);
      expect(result.confidence).toBe(1.0);
      expect(result.method).toBe('isrc');
      expect(result.requiresManualOverride).toBe(false);
      expect(result.scoreBreakdown?.isrcExact).toBe(true);
    });

    it('Rule 2: computes high confidence (~0.85) on title+artist fuzzy match', () => {
      const track: TrackMeta = {
        id: 'canonical-2',
        title: 'Starboy',
        artist: 'The Weeknd, Daft Punk',
        durationSeconds: 230,
      };

      const candidate: SourceSearchResult = {
        id: 'yt-starboy',
        title: 'Starboy (Official Music Video)',
        artist: 'The Weeknd ft. Daft Punk',
        sourceId: 'youtube',
        durationSeconds: 230,
      };

      const result = matchTrack(track, candidate);
      expect(result.confidence).toBeGreaterThanOrEqual(0.80);
      expect(result.requiresManualOverride).toBe(false);
    });

    it('Rule 3: applies duration ±2s boost (+0.10)', () => {
      const track: TrackMeta = {
        id: 'canonical-3',
        title: 'Resonance',
        artist: 'HOME',
        durationSeconds: 212,
      };

      const candidateExactDuration: SourceSearchResult = {
        id: 'yt-res-1',
        title: 'HOME - Resonance',
        artist: 'HOME',
        sourceId: 'youtube',
        durationSeconds: 213, // within ±2s
      };

      const candidateOffDuration: SourceSearchResult = {
        id: 'yt-res-2',
        title: 'HOME - Resonance',
        artist: 'HOME',
        sourceId: 'youtube',
        durationSeconds: 235, // 23s difference
      };

      const resBoosted = matchTrack(track, candidateExactDuration);
      const resPenalized = matchTrack(track, candidateOffDuration);

      expect(resBoosted.scoreBreakdown?.durationBoost).toBe(0.10);
      expect(resBoosted.confidence).toBeGreaterThan(resPenalized.confidence);
    });

    it('Rule 4: flags for manual override when confidence is < 0.75', () => {
      const track: TrackMeta = {
        id: 'canonical-4',
        title: 'Bohemian Rhapsody',
        artist: 'Queen',
        durationSeconds: 355,
      };

      const unrelatedCandidate: SourceSearchResult = {
        id: 'yt-unrelated',
        title: 'Hungarian Rhapsody No. 2',
        artist: 'Franz Liszt',
        sourceId: 'youtube',
        durationSeconds: 540,
      };

      const result = matchTrack(track, unrelatedCandidate);
      expect(result.confidence).toBeLessThan(0.75);
      expect(result.requiresManualOverride).toBe(true);
      expect(result.method).toBe('manual_flag');
    });
  });

  describe('Track Overrides Persistence', () => {
    it('sets, retrieves, and removes user track overrides', () => {
      expect(matchOverrides.getOverride('track-100')).toBeNull();

      matchOverrides.setOverride({
        trackId: 'track-100',
        sourceId: 'qobuz',
        candidateId: 'qobuz-99999',
        streamUrl: 'https://cdn.qobuz.com/stream-99999.flac',
        label: 'Qobuz Master Studio 24/96',
        isLossless: true,
        timestamp: Date.now(),
        manual: true,
      });

      const saved = matchOverrides.getOverride('track-100');
      expect(saved).not.toBeNull();
      expect(saved?.sourceId).toBe('qobuz');
      expect(saved?.candidateId).toBe('qobuz-99999');
      expect(saved?.isLossless).toBe(true);

      const all = matchOverrides.getAllOverrides();
      expect(Object.keys(all)).toHaveLength(1);

      const removed = matchOverrides.removeOverride('track-100');
      expect(removed).toBe(true);
      expect(matchOverrides.getOverride('track-100')).toBeNull();
    });
  });
});

describe('Sloth Source Registry & Fallback Chain', () => {
  let registry: SourceRegistry;

  const mockLosslessSource: AudioSource = {
    id: 'mock-lossless',
    label: 'Mock Lossless',
    supportsLossless: true,
    search: async (query: string) => {
      if (query.includes('FR6V81100072')) {
        return [
          {
            id: 'flac-1',
            title: 'Midnight City',
            artist: 'M83',
            isrc: 'FR6V81100072',
            durationSeconds: 243,
            sourceId: 'mock-lossless',
            lossless: true,
          },
        ];
      }
      return [];
    },
    resolve: async (t: TrackMeta): Promise<SourceResolvedStream> => ({
      url: `https://flac.example.com/${t.id}.flac`,
      sourceId: 'mock-lossless',
      trackId: t.id,
      title: t.title,
      artist: t.artist,
      mimeType: 'audio/flac',
      isLossless: true,
      bitrate: 1411200,
    }),
    getConfidence: () => 1.0,
  };

  const mockLossySource: AudioSource = {
    id: 'mock-lossy',
    label: 'Mock Lossy',
    supportsLossless: false,
    search: async (query: string) => [
      {
        id: 'yt-1',
        title: query,
        artist: 'Sample Artist',
        durationSeconds: 230,
        sourceId: 'mock-lossy',
        lossless: false,
      },
    ],
    resolve: async (t: TrackMeta): Promise<SourceResolvedStream> => ({
      url: `https://webm.example.com/${t.id}.opus`,
      sourceId: 'mock-lossy',
      trackId: t.id,
      title: t.title,
      artist: t.artist,
      mimeType: 'audio/webm',
      isLossless: false,
      bitrate: 160000,
    }),
    getConfidence: () => 0.85,
  };

  beforeEach(() => {
    registry = new SourceRegistry();
    matchOverrides.clearOverrides();
    // Unregister defaults and register our controlled test mocks
    ['qobuz', 'youtube', 'piped'].forEach((id) => registry.unregister(id));
    registry.register(mockLosslessSource);
    registry.register(mockLossySource);
  });

  it('manages source priority ordering', () => {
    expect(registry.getPriority()).toEqual(['mock-lossless', 'mock-lossy']);
    registry.setPriority(['mock-lossy', 'mock-lossless']);
    expect(registry.getPriority()).toEqual(['mock-lossy', 'mock-lossless']);
  });

  it('resolves ISRC match immediately from primary lossless source', async () => {
    const track: TrackMeta = {
      id: 'canon-1',
      title: 'Midnight City',
      artist: 'M83',
      isrc: 'FR6V81100072',
      durationSeconds: 243,
    };

    const resolved = await registry.resolve(track);
    expect(resolved).not.toBeNull();
    expect(resolved?.sourceId).toBe('mock-lossless');
    expect(resolved?.isLossless).toBe(true);
    expect(resolved?.url).toContain('.flac');
  });

  it('falls back to secondary source when primary has no candidate', async () => {
    const track: TrackMeta = {
      id: 'canon-2',
      title: 'Random Track',
      artist: 'Unknown Artist',
      durationSeconds: 230,
    };

    const resolved = await registry.resolve(track);
    expect(resolved).not.toBeNull();
    expect(resolved?.sourceId).toBe('mock-lossy');
    expect(resolved?.isLossless).toBe(false);
  });

  it('honors manual override ahead of normal search priority', async () => {
    matchOverrides.setOverride({
      trackId: 'canon-override',
      sourceId: 'mock-lossy',
      candidateId: 'pinned-custom-id',
      streamUrl: 'https://custom.stream/audio.mp3',
      label: 'User Pinned Version',
      timestamp: Date.now(),
      manual: true,
    });

    const track: TrackMeta = {
      id: 'canon-override',
      title: 'Midnight City',
      artist: 'M83',
      isrc: 'FR6V81100072', // Would otherwise hit mock-lossless!
    };

    const resolved = await registry.resolve(track);
    expect(resolved).not.toBeNull();
    expect(resolved?.sourceId).toBe('mock-lossy');
    expect(resolved?.trackId).toBe('pinned-custom-id');
  });
});
