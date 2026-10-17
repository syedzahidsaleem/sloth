import { describe, it, expect } from 'vitest';
import {
  cleanTitle,
  cleanArtist,
  levenshteinDistance,
  calculateStringSimilarity,
  parseTimestampToMs,
  filterLyricsCreditLines,
  parseLrc,
} from '../lyrics/metrolist-fetcher';

describe('Metrolist LRCLib Lyrics Fetcher & Parser', () => {
  it('cleans title metadata, brackets, video tags, and features', () => {
    expect(cleanTitle('Song Title (Official Video)')).toBe('Song Title');
    expect(cleanTitle('Another Track [Lyrics]')).toBe('Another Track');
    expect(cleanTitle('Remix Hit (Remastered 2026)')).toBe('Remix Hit');
    expect(cleanTitle('Collab (feat. Someone Else)')).toBe('Collab');
    expect(cleanTitle('Live Track - Official Visualizer')).toBe('Live Track');
    expect(cleanTitle('Japanese Title 【Official】')).toBe('Japanese Title');
  });

  it('extracts primary artist before separators', () => {
    expect(cleanArtist('Dua Lipa & Elton John')).toBe('Dua Lipa');
    expect(cleanArtist('Drake, 21 Savage')).toBe('Drake');
    expect(cleanArtist('Marshmello ft. Bastille')).toBe('Marshmello');
    expect(cleanArtist('Coldplay with BTS')).toBe('Coldplay');
    expect(cleanArtist('Solo Artist')).toBe('Solo Artist');
  });

  it('computes Levenshtein distance and string similarity', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    expect(levenshteinDistance('hello', 'hello')).toBe(0);

    expect(calculateStringSimilarity('same text', 'same text')).toBe(1.0);
    expect(calculateStringSimilarity('shape of you', 'Shape of You (Official)')).toBe(0.8);
    expect(calculateStringSimilarity('abc', 'xyz')).toBe(0.0);
  });

  it('parses timestamps to milliseconds accurately', () => {
    // 01:23.45 -> 1 min, 23 sec, 45 hundredths -> 60000 + 23000 + 450 = 83450 ms
    expect(parseTimestampToMs('01', '23', '45')).toBe(83450);
    // 00:05.123 -> 5 sec, 123 ms -> 5123 ms
    expect(parseTimestampToMs('00', '05', '123')).toBe(5123);
  });

  it('filters out lyrics credit lines', () => {
    const raw = `[00:00.00] Synced by Musixmatch
[00:05.00] Real lyric line
[00:10.00] Lyrics by John Doe
[00:15.00] Another lyric line`;

    const filtered = filterLyricsCreditLines(raw);
    expect(filtered).not.toContain('Synced by Musixmatch');
    expect(filtered).not.toContain('Lyrics by John Doe');
    expect(filtered).toContain('Real lyric line');
    expect(filtered).toContain('Another lyric line');
  });

  it('parses synchronized LRC lines with multiple timestamps and ordering', () => {
    const rawLrc = `[ti:Test Track]
[ar:Test Artist]
[00:10.00]First line
[00:20.50][00:30.00]Chorus line repeated
[00:15.25]Second line`;

    const parsed = parseLrc(rawLrc);
    expect(parsed.isSynced).toBe(true);
    expect(parsed.lines.length).toBe(4);

    // Verify lines are sorted chronologically
    expect(parsed.lines[0].timeMs).toBe(10000);
    expect(parsed.lines[0].text).toBe('First line');

    expect(parsed.lines[1].timeMs).toBe(15250);
    expect(parsed.lines[1].text).toBe('Second line');

    expect(parsed.lines[2].timeMs).toBe(20500);
    expect(parsed.lines[2].text).toBe('Chorus line repeated');

    expect(parsed.lines[3].timeMs).toBe(30000);
    expect(parsed.lines[3].text).toBe('Chorus line repeated');
  });
});
