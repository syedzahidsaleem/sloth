/**
 * Sloth Track Matching Pipeline
 * Implements ISRC exact resolution, Levenshtein/token fuzzy matching, duration boost,
 * and user override persistence in SQLite/local storage.
 */

import {
  TrackMeta,
  SourceSearchResult,
  TrackMatchResult,
  TrackOverride,
} from './types';

/**
 * Normalize text for string matching:
 * - Lowercase and strip accents (Unicode NFKD)
 * - Strip extraneous video/remaster noise
 * - Remove non-alphanumeric punctuation
 */
export function normalizeText(input: string): string {
  if (!input) return '';
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    // Strip common audio/video tag noise
    .replace(/\b(official\s*(music\s*)?video|official\s*audio|lyric\s*video|remaster(ed)?(\s*\d{4})?|deluxe(\s*edition)?|radio\s*edit|feat\.|ft\.)\b/gi, '')
    // Strip brackets and parentheses content if it contains video/audio tags
    .replace(/\[[^\]]*(audio|video|hq|hd|remaster)[^\]]*\]/gi, '')
    .replace(/\([^\)]*(audio|video|hq|hd|remaster)[^\)]*\)/gi, '')
    // Replace punctuation with spaces
    .replace(/[^a-z0-9\s]/g, ' ')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Standard Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const row = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) row[j] = j;

  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = temp;
    }
  }

  return row[n];
}

/**
 * Compute normalized Levenshtein similarity [0.0, 1.0]
 */
export function levenshteinSimilarity(a: string, b: string): number {
  const normA = normalizeText(a);
  const normB = normalizeText(b);
  if (normA === normB) return 1.0;
  if (!normA.length || !normB.length) return 0.0;

  const distance = levenshteinDistance(normA, normB);
  const maxLen = Math.max(normA.length, normB.length);
  return Math.max(0, 1 - distance / maxLen);
}

/**
 * Compute token Jaccard similarity [0.0, 1.0] for artist or title word permutations
 */
export function tokenSimilarity(a: string, b: string): number {
  const tokensA = new Set(normalizeText(a).split(' ').filter((w) => w.length > 0));
  const tokensB = new Set(normalizeText(b).split(' ').filter((w) => w.length > 0));
  if (tokensA.size === 0 && tokensB.size === 0) return 1.0;
  if (tokensA.size === 0 || tokensB.size === 0) return 0.0;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection++;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  return union === 0 ? 0.0 : intersection / union;
}

/**
 * Combined hybrid string similarity (50% token set + 50% character Levenshtein)
 */
export function hybridStringSimilarity(a: string, b: string): number {
  const tokenSim = tokenSimilarity(a, b);
  const levSim = levenshteinSimilarity(a, b);
  return 0.5 * tokenSim + 0.5 * levSim;
}

/**
 * Match a target track metadata against a candidate search result using multi-stage confidence scoring:
 * 1. Exact ISRC match -> confidence 1.0 (authoritative)
 * 2. Title + artist fuzzy match -> base confidence ~0.85 (hybrid Levenshtein + token Jaccard)
 * 3. Duration confirmation within ±2 seconds -> +0.10 boost
 * 4. Overall confidence < 0.75 -> flagged for manual user confirmation
 *
 * @param track Target track metadata
 * @param candidate Source search result candidate
 * @returns Detailed match result with breakdown and method tag
 */
export function matchTrack(
  track: TrackMeta,
  candidate: SourceSearchResult,
): TrackMatchResult {
  const cleanTrackIsrc = track.isrc?.trim().toUpperCase();
  const cleanCandidateIsrc = candidate.isrc?.trim().toUpperCase();

  // Rule 1: ISRC Exact Match
  if (cleanTrackIsrc && cleanCandidateIsrc && cleanTrackIsrc === cleanCandidateIsrc) {
    return {
      candidate,
      confidence: 1.0,
      method: 'isrc',
      requiresManualOverride: false,
      scoreBreakdown: {
        isrcExact: true,
        titleSimilarity: 1.0,
        artistSimilarity: 1.0,
        durationBoost: 0,
      },
    };
  }

  // Rule 2: Title and Artist Fuzzy Match
  const titleSim = hybridStringSimilarity(track.title, candidate.title);
  const artistSim = hybridStringSimilarity(track.artist, candidate.artist);

  // Weighted fuzzy base score
  // If title or artist match is too low, candidate is severely penalized
  let baseScore = 0.85 * (titleSim * 0.6 + artistSim * 0.4);
  if (titleSim < 0.45 || artistSim < 0.35) {
    baseScore *= 0.5;
  }

  // Rule 3: Duration Confirmation Boost / Penalty
  let durationBoost = 0;
  let durationDiff: number | undefined;

  if (track.durationSeconds && candidate.durationSeconds) {
    durationDiff = Math.abs(track.durationSeconds - candidate.durationSeconds);
    if (durationDiff <= 2) {
      durationBoost = 0.10; // Exact duration match (+0.10)
    } else if (durationDiff <= 5) {
      durationBoost = 0.05;
    } else if (durationDiff > 15) {
      durationBoost = -0.15; // Unlikely to be the same version/cut
    }
  }

  const finalConfidence = Math.min(1.0, Math.max(0.0, baseScore + durationBoost));

  // Rule 4: Confidence < 0.75 flags for manual override
  const requiresManualOverride = finalConfidence < 0.75;

  return {
    candidate,
    confidence: Number(finalConfidence.toFixed(4)),
    method: durationBoost > 0 ? 'duration_boost' : requiresManualOverride ? 'manual_flag' : 'fuzzy',
    requiresManualOverride,
    scoreBreakdown: {
      isrcExact: false,
      titleSimilarity: Number(titleSim.toFixed(3)),
      artistSimilarity: Number(artistSim.toFixed(3)),
      durationDiffSeconds: durationDiff,
      durationBoost,
    },
  };
}

/**
 * SQLite & In-Memory Match Overrides Storage Engine
 */
class MatchOverrideStore {
  private overrides: Map<string, TrackOverride> = new Map();
  private storageKey = 'sloth_track_overrides';

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(this.storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          for (const [id, item] of Object.entries(parsed)) {
            this.overrides.set(id, item as TrackOverride);
          }
        }
      } catch {
        // Fallback to memory
      }
    }
  }

  private persist() {
    if (typeof localStorage !== 'undefined') {
      try {
        const obj: Record<string, TrackOverride> = {};
        for (const [k, v] of this.overrides.entries()) {
          obj[k] = v;
        }
        localStorage.setItem(this.storageKey, JSON.stringify(obj));
      } catch {
        // Ignore quota errors
      }
    }
  }

  getOverride(trackId: string): TrackOverride | null {
    return this.overrides.get(trackId) || null;
  }

  setOverride(override: TrackOverride): void {
    this.overrides.set(override.trackId, override);
    this.persist();
  }

  removeOverride(trackId: string): boolean {
    const deleted = this.overrides.delete(trackId);
    if (deleted) this.persist();
    return deleted;
  }

  clearOverrides(): void {
    this.overrides.clear();
    this.persist();
  }

  getAllOverrides(): Record<string, TrackOverride> {
    const result: Record<string, TrackOverride> = {};
    for (const [k, v] of this.overrides.entries()) {
      result[k] = v;
    }
    return result;
  }
}

export const matchOverrides = new MatchOverrideStore();
