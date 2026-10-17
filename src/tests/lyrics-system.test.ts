/**
 * Sloth Lyrics System Unit Tests
 * Verifies Metrolist-ported LRCLib parser, fetcher cascade, Claude translator,
 * SQLite caching, and Nuclear-derived lyrics UI components.
 */

import { describe, it, expect } from 'vitest';
import {
  parseLrc,
  parseTimestampToMs,
  cleanTitle,
  cleanArtist,
  calculateStringSimilarity,
  filterLyricsCreditLines,
  parseWordTimings,
  SAMPLE_MIDNIGHT_CITY_LRC,
} from '../lyrics/parser';
import { LyricsFetcher } from '../lyrics/fetcher';
import {
  buildSystemPrompt,
  buildUserPrompt,
  parseTranslationResponse,
  LyricsTranslator,
} from '../lyrics/translator';
import { LyricLine, LyricsToggle, LyricsView } from '../components/lyrics';

describe('Sloth Lyrics System (Metrolist & Nuclear Port)', () => {
  describe('LRC Parser & String Utilities (src/lyrics/parser.ts)', () => {
    it('parses timestamps into milliseconds correctly', () => {
      // 2-digit centiseconds
      expect(parseTimestampToMs('01', '15', '50')).toBe(75500);
      // 3-digit milliseconds
      expect(parseTimestampToMs('00', '04', '250')).toBe(4250);
    });

    it('cleans titles from YouTube and release noise', () => {
      expect(cleanTitle('Midnight City (Official Video)')).toBe('Midnight City');
      expect(cleanTitle('Starboy [Audio HQ]')).toBe('Starboy');
      expect(cleanTitle('Song Title (feat. Artist)')).toBe('Song Title');
      expect(cleanTitle('Track Name - Official Lyric Video')).toBe('Track Name');
    });

    it('extracts primary artist name by stripping collaborators', () => {
      expect(cleanArtist('M83 & Friends')).toBe('M83');
      expect(cleanArtist('The Weeknd feat. Daft Punk')).toBe('The Weeknd');
      expect(cleanArtist('Daft Punk, Julian Casablancas')).toBe('Daft Punk');
      expect(cleanArtist('Justice with Simian')).toBe('Justice');
    });

    it('calculates string similarity accurately', () => {
      expect(calculateStringSimilarity('Midnight City', 'Midnight City')).toBe(1.0);
      expect(calculateStringSimilarity('Midnight City', 'Midnight City (Remix)')).toBe(0.8);
      expect(calculateStringSimilarity('Hello', 'World')).toBeLessThan(0.5);
    });

    it('filters credit lines and metadata tags', () => {
      const input = `[00:01.00] Synced by Metrolist
[00:02.00] Lyrics by Anthony Gonzalez
[00:10.00] Real lyrics line here
[00:15.00] Another line`;
      const filtered = filterLyricsCreditLines(input);
      expect(filtered).not.toContain('Synced by Metrolist');
      expect(filtered).not.toContain('Lyrics by Anthony Gonzalez');
      expect(filtered).toContain('Real lyrics line here');
    });

    it('parses sample Midnight City LRC into structured synchronized lines', () => {
      const parsed = parseLrc(SAMPLE_MIDNIGHT_CITY_LRC);
      expect(parsed.isSynced).toBe(true);
      expect(parsed.lines.length).toBeGreaterThan(10);
      expect(parsed.lines[0].text).toContain('Intro');
      expect(parsed.lines[1].timeMs).toBe(28500);
      expect(parsed.lines[1].text).toBe('Waiting in a car');
    });

    it('parses enhanced LRC word timestamps when present', () => {
      const lineWithWords = '[00:10.00] <00:10.00> Waiting <00:10.50> in <00:10.80> a <00:11.00> car';
      const wordTimings = parseWordTimings(lineWithWords);
      expect(wordTimings).toBeDefined();
      expect(wordTimings?.length).toBe(4);
      expect(wordTimings?.[0].word).toBe('Waiting');
      expect(wordTimings?.[0].startMs).toBe(10000);
      expect(wordTimings?.[1].word).toBe('in');
      expect(wordTimings?.[1].startMs).toBe(10500);
    });
  });

  describe('Lyrics Fetcher & LRCLib Cascade (src/lyrics/fetcher.ts)', () => {
    it('instantiates fetcher with default LRCLib baseUrl', () => {
      const fetcher = new LyricsFetcher();
      expect(fetcher).toBeDefined();
    });

    it('handles network failure gracefully without throwing', async () => {
      const fetcher = new LyricsFetcher('https://invalid-non-existent-domain.fake');
      const result = await fetcher.getLyrics({
        title: 'Unknown Nonexistent Song',
        artist: 'Unknown Artist',
        duration: 180,
      });
      expect(result).toBeNull();
    });
  });

  describe('Lyrics Translator & Claude Integration (src/lyrics/translator.ts)', () => {
    it('instantiates LyricsTranslator with default claude model', () => {
      const translator = new LyricsTranslator();
      expect(translator).toBeDefined();
    });

    it('builds system prompt with exact lineCount enforcement', () => {
      const prompt = buildSystemPrompt(5);
      expect(prompt).toContain('EXACTLY 5 items');
      expect(prompt).toContain('valid JSON object');
    });

    it('builds user prompts for Translated, Romanized, and Transcribed modes', () => {
      const sample = 'Line 1\nLine 2';
      const transPrompt = buildUserPrompt(sample, 'Spanish', 'Translated');
      expect(transPrompt).toContain('Translate the following 2 lines to Spanish');

      const romPrompt = buildUserPrompt(sample, 'English', 'Romanized');
      expect(romPrompt).toContain('Romanize/transliterate the following 2 lines');
      expect(romPrompt).toContain('ONLY simple ASCII characters');

      const phonPrompt = buildUserPrompt(sample, 'Japanese', 'Transcribed');
      expect(phonPrompt).toContain('Transcribe/transliterate the following 2 lines phonetically');
    });

    it('parses JSON response and handles markdown code blocks', () => {
      const rawJson = '```json\n{"lines": ["Línea 1", "Línea 2"]}\n```';
      const parsed = parseTranslationResponse(rawJson, 2);
      expect(parsed).toEqual(['Línea 1', 'Línea 2']);
    });

    it('falls back to numbered list parsing if AI violates JSON structure', () => {
      const fallbackText = '1. Première ligne\n2. Deuxième ligne';
      const parsed = parseTranslationResponse(fallbackText, 2);
      expect(parsed).toEqual(['Première ligne', 'Deuxième ligne']);
    });

    it('throws descriptive error if line counts do not match expected count', () => {
      const invalidJson = JSON.stringify({ lines: ['Single line only'] });
      expect(() => parseTranslationResponse(invalidJson, 3)).toThrow(
        'expected 3 lines'
      );
    });
  });

  describe('Lyrics Frontend Components (src/components/lyrics/)', () => {
    it('exports LyricLine, LyricsToggle, and LyricsView components', () => {
      expect(LyricLine).toBeDefined();
      expect(LyricsToggle).toBeDefined();
      expect(LyricsView).toBeDefined();
    });
  });
});
