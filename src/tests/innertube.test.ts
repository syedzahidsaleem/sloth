import { describe, it, expect } from 'vitest';
import {
  parseDurationText,
  extractRunsText,
  extractArtists,
  YouTubeCipherSolver,
  YOUTUBE_CLIENTS,
} from '../sources/youtube/innertube-client';

describe('Metrolist YouTube InnerTube Client Helpers & Cipher', () => {
  it('parses duration strings accurately', () => {
    expect(parseDurationText('3:45')).toBe(225);
    expect(parseDurationText('1:02:15')).toBe(3735);
    expect(parseDurationText('0:30')).toBe(30);
    expect(parseDurationText('')).toBeUndefined();
  });

  it('extracts runs text cleanly', () => {
    expect(extractRunsText({ runs: [{ text: 'Never ' }, { text: 'Gonna ' }, { text: 'Give You Up' }] })).toBe(
      'Never Gonna Give You Up'
    );
    expect(extractRunsText('Plain string')).toBe('Plain string');
    expect(extractRunsText(undefined)).toBe('');
  });

  it('extracts artists filtering delimiters', () => {
    const runs = [
      { text: 'Rick Astley', navigationEndpoint: { browseEndpoint: { browseId: 'UC123' } } },
      { text: ' & ' },
      { text: 'Featured Singer', navigationEndpoint: { browseEndpoint: { browseId: 'UC456' } } },
    ];

    const artists = extractArtists(runs);
    expect(artists.length).toBe(2);
    expect(artists[0].name).toBe('Rick Astley');
    expect(artists[0].id).toBe('UC123');
    expect(artists[1].name).toBe('Featured Singer');
  });

  it('contains expected client profiles with user agents and versioning', () => {
    expect(YOUTUBE_CLIENTS.WEB_REMIX.clientId).toBe('67');
    expect(YOUTUBE_CLIENTS.WEB_REMIX.clientName).toBe('WEB_REMIX');
    expect(YOUTUBE_CLIENTS.ANDROID_MUSIC.clientName).toBe('ANDROID_MUSIC');
    expect(YOUTUBE_CLIENTS.TVHTML5_SIMPLY_EMBEDDED_PLAYER.isEmbedded).toBe(true);
  });

  it('runs cipher solver operations', async () => {
    // Tests that decipher runs transformations and returns a decoded string
    const result = await YouTubeCipherSolver.decipher('abcdefg');
    expect(result).toBeDefined();
    expect(result.length).toBe(7);
  });
});
