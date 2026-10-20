/**
 * Sloth LRCLib Lyrics Fetcher & Synchronized Parser
 * Ported from Metrolist (GPL-3.0) by MetrolistGroup
 * (C) 2026 MetrolistGroup / Adapted for Sloth
 *
 * Implements Metrolist's multi-step LRCLib query cascade, title/artist sanitization,
 * relaxed duration matching, and [mm:ss.xx] timestamp parsing.
 */

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

export interface SyncedLyricsLine {
  timeMs: number;
  text: string;
}

export interface ParsedLyrics {
  isSynced: boolean;
  lines: SyncedLyricsLine[];
  plainText: string;
  trackName?: string;
  artistName?: string;
  duration?: number;
}

export interface LyricsFetchOptions {
  title: string;
  artist: string;
  duration?: number;
  album?: string;
  baseUrl?: string;
}

/**
 * Regex patterns to clean noise from song titles (mirrored from Metrolist LrcLib.kt)
 */
export const TITLE_CLEANUP_PATTERNS: RegExp[] = [
  /\s*\(.*?(official|video|audio|lyrics|lyric|visualizer|hd|hq|4k|remaster|remix|live|acoustic|version|edit|extended|radio|clean|explicit).*?\)/gi,
  /\s*\[.*?(official|video|audio|lyrics|lyric|visualizer|hd|hq|4k|remaster|remix|live|acoustic|version|edit|extended|radio|clean|explicit).*?\]/gi,
  /\s*【.*?】/g,
  /\s*\|.*$/g,
  /\s*-\s*(official|video|audio|lyrics|lyric|visualizer).*$/gi,
  /\s*\(feat\..*?\)/gi,
  /\s*\(ft\..*?\)/gi,
  /\s*feat\..*$/gi,
  /\s*ft\..*$/gi,
];

/**
 * Separators used to isolate the primary artist
 */
export const ARTIST_SEPARATORS: string[] = [
  ' & ',
  ' and ',
  ', ',
  ' x ',
  ' X ',
  ' feat. ',
  ' feat ',
  ' ft. ',
  ' ft ',
  ' featuring ',
  ' with ',
];

/**
 * Regex to parse LRC timestamps: [mm:ss.xx] or [mm:ss.xxx]
 */
export const LRC_TIMESTAMP_REGEX = /\[(\d{1,2}):(\d{2})\.(\d{2,3})\]/g;
export const SINGLE_LRC_TIMESTAMP_REGEX = /^\[(\d{1,2}):(\d{2})\.(\d{2,3})\]/;

/**
 * Sanitizes song title for lyric search
 */
export function cleanTitle(title: string): string {
  let cleaned = title.trim();
  for (const pattern of TITLE_CLEANUP_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  return cleaned.trim();
}

/**
 * Extracts primary artist name
 */
export function cleanArtist(artist: string): string {
  let cleaned = artist.trim();
  for (const separator of ARTIST_SEPARATORS) {
    const lower = cleaned.toLowerCase();
    const sepLower = separator.toLowerCase();
    const index = lower.indexOf(sepLower);
    if (index !== -1) {
      cleaned = cleaned.substring(0, index);
      break;
    }
  }
  return cleaned.trim();
}

/**
 * Levenshtein distance between two strings
 */
export function levenshteinDistance(s1: string, s2: string): number {
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = Array.from({ length: len1 + 1 }, () => new Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * String similarity score from 0.0 to 1.0 (mirrored from Metrolist)
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.trim().toLowerCase();
  const s2 = str2.trim().toLowerCase();

  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.8;
  }

  const maxLength = Math.max(s1.length, s2.length);
  const dist = levenshteinDistance(s1, s2);
  return 1.0 - dist / maxLength;
}

/**
 * Converts timestamp string components (mm, ss, xx) into total milliseconds
 */
export function parseTimestampToMs(minutes: string, seconds: string, hundredths: string): number {
  const min = parseInt(minutes, 10);
  const sec = parseInt(seconds, 10);
  let ms = parseInt(hundredths, 10);

  // If 2 digits, it's centiseconds (multiply by 10)
  if (hundredths.length === 2) {
    ms *= 10;
  }

  return min * 60 * 1000 + sec * 1000 + ms;
}

/**
 * Filter out credits and metadata tags from lyrics
 */
export function filterLyricsCreditLines(text: string): string {
  const lines = text.split('\n');
  const filtered = lines.filter((line) => {
    let content = line.trim();

    // Strip leading timestamps or markers
    let stripping = true;
    while (stripping) {
      const prevLen = content.length;
      content = content
        .replace(/^\[\d{1,2}:\d{2}\.\d{2,3}\]/, '')
        .replace(/^\{agent:[^}]+\}/, '')
        .replace(/^\{bg\}/, '')
        .replace(/^\[bg:.*\]/, '')
        .replace(/^v\d+:/, '')
        .trim();
      stripping = content.length < prevLen;
    }

    const lower = content.toLowerCase();
    const isCredit =
      lower.startsWith('synced by') ||
      lower.startsWith('lyrics by') ||
      lower.startsWith('music by') ||
      lower.startsWith('arranged by') ||
      (lower.startsWith('[') && lower.endsWith(']') && lower.length < 40 && lower.includes('synced by'));

    return !isCredit;
  });

  return filtered.join('\n');
}

/**
 * Parses raw LRC text into structured SyncedLyricsLine items
 */
export function parseLrc(rawLrc: string): ParsedLyrics {
  const cleanedText = filterLyricsCreditLines(rawLrc);
  const rawLines = cleanedText.split('\n');

  const parsedLines: SyncedLyricsLine[] = [];
  const plainTextLines: string[] = [];

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for ID tags like [ar: Artist], [ti: Title], [offset: 0]
    if (/^\[(ti|ar|al|by|offset|length):.*\]$/i.test(trimmed)) {
      continue;
    }

    // Check for timestamps in the line: [00:12.34][00:45.67] Lyrics text
    const matches = Array.from(trimmed.matchAll(LRC_TIMESTAMP_REGEX));

    if (matches.length > 0) {
      // Remove all timestamps from the line to extract the lyric text
      let lyricText = trimmed.replace(LRC_TIMESTAMP_REGEX, '').trim();

      // Also clean up any syllable tags like <00:12.34>
      lyricText = lyricText.replace(/<\d{1,2}:\d{2}\.\d{2,3}>/g, '').trim();

      for (const match of matches) {
        const timeMs = parseTimestampToMs(match[1], match[2], match[3]);
        parsedLines.push({ timeMs, text: lyricText });
      }

      if (lyricText) {
        plainTextLines.push(lyricText);
      }
    } else {
      // Plain line without timestamps
      plainTextLines.push(trimmed);
    }
  }

  // Sort lines by timestamp ascending
  parsedLines.sort((a, b) => a.timeMs - b.timeMs);

  return {
    isSynced: parsedLines.length > 0,
    lines: parsedLines,
    plainText: plainTextLines.join('\n'),
  };
}

/**
 * Metrolist LRCLib Client
 */
export class MetrolistLyricsFetcher {
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
   * 5-Strategy search cascade from Metrolist LrcLib.kt
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
   * Fetches the single best matching lyrics item
   */
  public async getLyrics(options: LyricsFetchOptions): Promise<ParsedLyrics | null> {
    const { title, artist, duration = -1, album } = options;
    const tracks = await this.queryLyrics(title, artist, album);

    if (tracks.length === 0) return null;

    const cleanedT = cleanTitle(title);
    const cleanedA = cleanArtist(artist);

    let bestTrack: LrcLibTrack | null = null;
    let bestScore = -1;

    for (const track of tracks) {
      const raw = track.syncedLyrics || track.plainLyrics;
      if (!raw) continue;

      let score = 0;
      // High priority bonus for synced lyrics
      if (track.syncedLyrics) score += 2.0;

      // Title & artist string similarity (highest weight)
      const titleSim = calculateStringSimilarity(cleanedT, track.trackName);
      const artistSim = calculateStringSimilarity(cleanedA, track.artistName);
      score += titleSim * 2.5 + artistSim * 1.5;

      // Duration proximity (relaxed tolerance for music video intros/outros)
      if (duration > 0 && track.duration > 0) {
        const diff = Math.abs(track.duration - duration);
        if (diff <= 10) {
          score += 1.0;
        } else if (diff <= 40) {
          score += 0.5;
        } else {
          score -= Math.min(1.0, (diff - 40) / 100);
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestTrack = track;
      }
    }

    if (!bestTrack) return null;

    const rawLyrics = bestTrack.syncedLyrics || bestTrack.plainLyrics;
    if (!rawLyrics) return null;

    const parsed = parseLrc(rawLyrics);
    parsed.trackName = bestTrack.trackName;
    parsed.artistName = bestTrack.artistName;
    parsed.duration = bestTrack.duration;

    return parsed;
  }
}
