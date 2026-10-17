/**
 * ask-sloth.test.ts — Unit tests for Ask Sloth Command Palette & NLP Search
 */

import { describe, it, expect } from 'vitest';
import {
  AskSlothModal,
  QUICK_PROMPT_SUGGESTIONS,
  resultToUITrack,
  AskSlothTrackResult,
} from '@/features/ask-sloth';

describe('Ask Sloth Command Palette System', () => {
  describe('Data Mapping & Types', () => {
    it('maps AskSlothTrackResult to standard UI Track model', () => {
      const mockResult: AskSlothTrackResult = {
        track_id: 'trk_jazz_42',
        score: 0.892,
        title: 'Midnight Rain',
        artist: 'Bill Evans Trio',
        artist_id: 'art_bill',
        album: 'Night Sessions',
        genres: ['Jazz', 'Ambient'],
        valence: 0.32,
        arousal: 0.28,
        bpm: 84.0,
        key: 3,
        mode: 1,
      };

      const uiTrack = resultToUITrack(mockResult);

      expect(uiTrack.id).toBe('trk_jazz_42');
      expect(uiTrack.title).toBe('Midnight Rain');
      expect(uiTrack.artist).toBe('Bill Evans Trio');
      expect(uiTrack.album).toBe('Night Sessions');
      expect(uiTrack.badge).toContain('84 BPM');
      expect(uiTrack.badge).toContain('89% match');
      expect(uiTrack.durationSeconds).toBeGreaterThan(0);
    });

    it('provides curated quick prompt suggestions for zero-query state', () => {
      expect(QUICK_PROMPT_SUGGESTIONS.length).toBeGreaterThanOrEqual(4);
      expect(QUICK_PROMPT_SUGGESTIONS[0]).toContain('jazz');
      expect(QUICK_PROMPT_SUGGESTIONS.some((s) => s.includes('BPM'))).toBe(true);
    });
  });

  describe('AskSlothModal Component Architecture', () => {
    it('exports AskSlothModal component function', () => {
      expect(AskSlothModal).toBeDefined();
      expect(typeof AskSlothModal).toBe('function');
    });
  });
});
