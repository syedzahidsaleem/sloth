/**
 * Sloth LRC Lyrics Parser & String Utilities
 * Ported from Metrolist (GPL-3.0) and optimized for Sloth
 *
 * Provides LRC timestamp parsing, line/word synchronization,
 * credit line stripping, and title/artist normalization.
 */

export interface WordTiming {
  word: string;
  startMs: number;
  endMs?: number;
}

export interface SyncedLyricsLine {
  timeMs: number;
  text: string;
  words?: WordTiming[];
}

export interface ParsedLyrics {
  isSynced: boolean;
  lines: SyncedLyricsLine[];
  plainText: string;
  trackName?: string;
  artistName?: string;
  duration?: number;
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
 * Regex to parse standard LRC timestamps: [mm:ss.xx] or [mm:ss.xxx]
 */
export const LRC_TIMESTAMP_REGEX = /\[(\d{1,2}):(\d{2})\.(\d{2,3})\]/g;
export const SINGLE_LRC_TIMESTAMP_REGEX = /^\[(\d{1,2}):(\d{2})\.(\d{2,3})\]/;

/**
 * Syllable or word-level timestamp: <mm:ss.xx> or <mm:ss.xxx>
 */
export const WORD_TIMESTAMP_REGEX = /<(\d{1,2}):(\d{2})\.(\d{2,3})>/g;

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
 * Filter out credits and metadata tags from lyrics (from Metrolist)
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
 * Parses word-level timestamps inside a line if enhanced LRC format is present:
 * [00:10.00] <00:10.00> Hello <00:10.50> World <00:11.00>
 */
export function parseWordTimings(line: string): WordTiming[] | undefined {
  if (!WORD_TIMESTAMP_REGEX.test(line)) {
    // Generate synthetic word timings across line duration if requested
    const words = line.replace(LRC_TIMESTAMP_REGEX, '').trim().split(/\s+/);
    if (words.length <= 1 || !words[0]) return undefined;
    return undefined;
  }

  WORD_TIMESTAMP_REGEX.lastIndex = 0;
  const segments: WordTiming[] = [];
  const parts = line.split(WORD_TIMESTAMP_REGEX);
  // Format: [pre, mm, ss, xx, word, mm, ss, xx, word...]

  for (let i = 1; i < parts.length; i += 4) {
    const min = parts[i];
    const sec = parts[i + 1];
    const xx = parts[i + 2];
    const wordText = (parts[i + 3] || '').trim();

    if (min && sec && xx) {
      const timing = parseTimestampToMs(min, sec, xx);
      if (wordText) {
        segments.push({
          word: wordText,
          startMs: timing,
        });
      }
    }
  }

  // Calculate approximate end times
  for (let i = 0; i < segments.length - 1; i++) {
    segments[i].endMs = segments[i + 1].startMs;
  }

  return segments.length > 0 ? segments : undefined;
}

/**
 * Parses raw LRC text into structured SyncedLyricsLine items
 */
export function parseLrc(rawLrc: string): ParsedLyrics {
  if (!rawLrc || typeof rawLrc !== 'string') {
    return { isSynced: false, lines: [], plainText: '' };
  }

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

      // Check for word-level timings
      const wordTimings = parseWordTimings(trimmed);

      // Clean up syllable tags from display text
      lyricText = lyricText.replace(/<\d{1,2}:\d{2}\.\d{2,3}>/g, '').trim();

      for (const match of matches) {
        const timeMs = parseTimestampToMs(match[1], match[2], match[3]);
        parsedLines.push({
          timeMs,
          text: lyricText,
          words: wordTimings,
        });
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

export const SAMPLE_MIDNIGHT_CITY_LRC = `[00:00.00] (Instrumental Synthesizer Intro)
[00:28.50] Waiting in a car
[00:32.40] Waiting for a ride in the dark
[00:36.20] The night city grows
[00:40.10] Look and see her eyes, they glow
[00:44.00] Waiting in a car
[00:47.80] Waiting for a ride in the dark
[00:51.60] The night city grows
[00:55.50] Look and see her eyes, they glow
[01:00.00] Waiting in a car
[01:03.80] Waiting for a ride in the dark
[01:07.50] The night city grows
[01:11.40] Look and see her eyes, they glow
[01:15.50] The city is my church
[01:19.40] It wraps me in the blinding twilight
[01:23.20] Waiting in a car
[01:27.00] Waiting for a ride in the dark
[01:31.00] The night city grows
[01:35.00] Look and see her eyes, they glow
[01:40.00] (Electronic Saxophone Solo)
[02:15.00] The city is my church
[02:19.00] It wraps me in the blinding twilight
[02:23.00] Waiting in a car
[02:27.00] Waiting for a ride in the dark`;

