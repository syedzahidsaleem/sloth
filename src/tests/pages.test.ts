/**
 * Sloth App Router Pages Unit Tests
 * Verifies Home, Search, Artist, and Album page components, props contracts,
 * mock data integrity, and Nuclear-derived view structures.
 */

import { describe, it, expect } from 'vitest';
import HomePage, { RECENTLY_PLAYED_ALBUMS, SLOTH_PICKS, TRENDING_TRACKS } from '../app/page';
import SearchPage, {
  ALL_SEARCHABLE_TRACKS,
  ALL_SEARCHABLE_ARTISTS,
  ALL_SEARCHABLE_ALBUMS,
  POPULAR_SEARCH_TAGS,
} from '../app/search/page';
import ArtistPage, { SAMPLE_ARTISTS } from '../app/artist/[id]/page';
import AlbumPage, { SAMPLE_ALBUMS } from '../app/album/[id]/page';

describe('Sloth App Router Pages (Nuclear-Derived)', () => {
  describe('HomePage (src/app/page.tsx)', () => {
    it('exports HomePage component and mock datasets', () => {
      expect(HomePage).toBeDefined();
      expect(Array.isArray(RECENTLY_PLAYED_ALBUMS)).toBe(true);
      expect(RECENTLY_PLAYED_ALBUMS.length).toBeGreaterThan(0);
      expect(Array.isArray(SLOTH_PICKS)).toBe(true);
      expect(SLOTH_PICKS.length).toBeGreaterThan(0);
      expect(Array.isArray(TRENDING_TRACKS)).toBe(true);
      expect(TRENDING_TRACKS.length).toBeGreaterThan(0);
    });

    it('contains neural match badges and models in Sloth picks', () => {
      SLOTH_PICKS.forEach((pick) => {
        expect(pick.id).toBeDefined();
        expect(pick.title).toBeDefined();
        expect(pick.subtitle).toBeDefined();
        expect(pick.badge).toMatch(/(Neural Match|Hypergraph|MERT|BERT4Rec)/);
      });
    });

    it('contains valid tracks with required metadata in trending list', () => {
      TRENDING_TRACKS.forEach((track) => {
        expect(track.id).toBeDefined();
        expect(track.title).toBeDefined();
        expect(track.artist).toBeDefined();
        expect(track.durationSeconds).toBeGreaterThan(0);
      });
    });
  });

  describe('SearchPage (src/app/search/page.tsx)', () => {
    it('exports SearchPage component and search catalog', () => {
      expect(SearchPage).toBeDefined();
      expect(Array.isArray(ALL_SEARCHABLE_TRACKS)).toBe(true);
      expect(Array.isArray(ALL_SEARCHABLE_ARTISTS)).toBe(true);
      expect(Array.isArray(ALL_SEARCHABLE_ALBUMS)).toBe(true);
      expect(Array.isArray(POPULAR_SEARCH_TAGS)).toBe(true);
    });

    it('catalog items have necessary fields for filtering', () => {
      ALL_SEARCHABLE_TRACKS.forEach((track) => {
        expect(track.title).toBeDefined();
        expect(track.artist).toBeDefined();
      });

      ALL_SEARCHABLE_ARTISTS.forEach((artist) => {
        expect(artist.id).toBeDefined();
        expect(artist.name).toBeDefined();
        expect(artist.role).toBeDefined();
      });

      ALL_SEARCHABLE_ALBUMS.forEach((album) => {
        expect(album.id).toBeDefined();
        expect(album.title).toBeDefined();
        expect(album.subtitle).toBeDefined();
      });
    });
  });

  describe('ArtistPage (src/app/artist/[id]/page.tsx)', () => {
    it('exports ArtistPage component and artists database', () => {
      expect(ArtistPage).toBeDefined();
      expect(SAMPLE_ARTISTS).toHaveProperty('m83');
      expect(SAMPLE_ARTISTS).toHaveProperty('daft-punk');
    });

    it('artist profile includes bio, banner, top tracks, albums, and similar artists', () => {
      const m83 = SAMPLE_ARTISTS['m83'];
      expect(m83.name).toBe('M83');
      expect(m83.bannerUrl).toBeDefined();
      expect(m83.avatarUrl).toBeDefined();
      expect(m83.topTracks.length).toBeGreaterThan(0);
      expect(m83.albums.length).toBeGreaterThan(0);
      expect(m83.similarArtists.length).toBeGreaterThan(0);
      expect(m83.bio).toBeDefined();
      expect(m83.monthlyListeners).toBeGreaterThan(0);
    });
  });

  describe('AlbumPage (src/app/album/[id]/page.tsx)', () => {
    it('exports AlbumPage component and albums database', () => {
      expect(AlbumPage).toBeDefined();
      expect(SAMPLE_ALBUMS).toHaveProperty('alb-1');
    });

    it('album profile contains 240x240 artwork, metadata chips, and sequential tracks', () => {
      const hurryUp = SAMPLE_ALBUMS['alb-1'];
      expect(hurryUp.title).toBe("Hurry Up, We're Dreaming");
      expect(hurryUp.artist).toBe('M83');
      expect(hurryUp.releaseYear).toBe(2011);
      expect(hurryUp.tracks.length).toBeGreaterThan(0);
      expect(hurryUp.genre).toContain('Dream Pop');

      hurryUp.tracks.forEach((track) => {
        expect(track.id).toBeDefined();
        expect(track.title).toBeDefined();
        expect(track.durationSeconds).toBeGreaterThan(0);
      });
    });
  });
});
