import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PipedClient, DEFAULT_PIPED_INSTANCES } from '../sources/piped';

describe('Sloth Piped & Invidious Proxy Client', () => {
  let client: PipedClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    client = new PipedClient();
  });

  it('initializes with default instances and first active instance', () => {
    const instances = client.getInstances();
    expect(instances.length).toBeGreaterThan(0);
    expect(client.getActiveInstance().apiBase).toBe(DEFAULT_PIPED_INSTANCES[0].apiBase);
  });

  it('rotates instances on failure', () => {
    const firstInstance = client.getActiveInstance();
    const rotated = client.rotateInstance();
    expect(rotated.apiBase).not.toBe(firstInstance.apiBase);
    expect(client.getActiveInstance().apiBase).toBe(rotated.apiBase);
  });

  it('ranks instances by ping latency', async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('pipedapi.kavin.rocks')) {
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({ ok: false, status: 500 });
    });
    global.fetch = mockFetch;

    await client.refreshInstanceRankings();

    const ranked = client.getInstances();
    expect(ranked[0].isDown).toBe(false);
  });

  it('extracts streams and generates Spotube-compatible sourceMap', async () => {
    const mockStreamsResponse = {
      title: 'Bohemian Rhapsody',
      uploader: 'Queen Official',
      duration: 355,
      thumbnailUrl: 'https://example.com/thumb.jpg',
      audioStreams: [
        { url: 'https://cdn.example.com/audio-high.m4a', format: 'M4A', bitrate: 160000, quality: 'high', codec: 'mp4a.40.2' },
        { url: 'https://cdn.example.com/audio-low.m4a', format: 'M4A', bitrate: 64000, quality: 'low', codec: 'mp4a.40.2' },
        { url: 'https://cdn.example.com/audio.webm', format: 'WEBM', bitrate: 128000, quality: 'medium', codec: 'opus' },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockStreamsResponse),
    });

    const manifest = await client.streams('fJ9rUzIMcZQ');

    expect(manifest.id).toBe('fJ9rUzIMcZQ');
    expect(manifest.title).toBe('Bohemian Rhapsody');
    expect(manifest.audioStreams.length).toBe(3);
    expect(manifest.sourceMap).toBeDefined();
    expect(manifest.sourceMap?.m4a.high).toBe('https://cdn.example.com/audio-high.m4a');
    expect(manifest.sourceMap?.m4a.low).toBe('https://cdn.example.com/audio-low.m4a');
    expect(manifest.sourceMap?.webm.high).toBe('https://cdn.example.com/audio.webm');
  });

  it('searches for music tracks successfully', async () => {
    const mockSearchResponse = {
      items: [
        {
          type: 'stream',
          url: '/watch?v=fJ9rUzIMcZQ',
          title: 'Bohemian Rhapsody',
          thumbnail: 'https://example.com/thumb.jpg',
          uploaderName: 'Queen',
          duration: 355,
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSearchResponse),
    });

    const results = await client.search('Queen Bohemian Rhapsody');
    expect(results.length).toBe(1);
    expect(results[0].title).toBe('Bohemian Rhapsody');
    expect(results[0].uploaderName).toBe('Queen');
  });
});
