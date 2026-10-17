/**
 * Vitest Test Suite for Sloth MCP Server
 * Tests player bridge, Nuclear discovery metadata, rate limiting,
 * tool execution, resources, and HTTP transport.
 */

import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import { PlayerBridge } from '@/mcp-server/playerBridge';
import { listMethods, methodDetails, describeType, executeCall } from '@/mcp-server/metadata';
import { McpRateLimiter, isLocalhost } from '@/mcp-server/rateLimiter';
import { SlothMcpHttpServer } from '@/mcp-server/httpServer';

describe('Sloth MCP - PlayerBridge', () => {
  let bridge: PlayerBridge;

  beforeEach(() => {
    bridge = new PlayerBridge();
  });

  it('manages playback state (play, pause, next, previous)', () => {
    const playRes = bridge.play();
    expect(playRes.success).toBe(true);
    expect(bridge.getState().isPlaying).toBe(true);
    expect(bridge.getState().status).toBe('playing');

    const pauseRes = bridge.pause();
    expect(pauseRes.success).toBe(true);
    expect(bridge.getState().isPlaying).toBe(false);
    expect(bridge.getState().status).toBe('paused');

    const nextRes = bridge.next();
    expect(nextRes.success).toBe(true);
    expect(bridge.getState().positionMs).toBe(0);

    const prevRes = bridge.previous();
    expect(prevRes.success).toBe(true);
  });

  it('seeks to millisecond position', () => {
    const seekRes = bridge.seek(45000);
    expect(seekRes.success).toBe(true);
    expect(seekRes.positionMs).toBe(45000);
    expect(bridge.getState().positionMs).toBe(45000);
  });

  it('clamps volume levels between 0 and 100', () => {
    bridge.setVolume(50);
    expect(bridge.getState().volume).toBe(50);

    bridge.setVolume(150);
    expect(bridge.getState().volume).toBe(100);

    bridge.setVolume(-20);
    expect(bridge.getState().volume).toBe(0);
  });

  it('retrieves queue and adds tracks to queue', () => {
    const initialQueue = bridge.getQueue();
    expect(initialQueue.length).toBeGreaterThan(0);

    const addRes = bridge.addToQueue('999');
    expect(addRes.success).toBe(true);
    expect(addRes.queueLength).toBe(initialQueue.length + 1);

    const updatedQueue = bridge.getQueue();
    expect(updatedQueue.some((t) => t.id === '999')).toBe(true);
  });

  it('searches catalog tracks by keyword', () => {
    const results = bridge.search('Midnight');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title.toLowerCase()).toContain('midnight');
  });

  it('sets mood using Russell circumplex model and returns closest tracks', () => {
    // High valence (0.9), Low arousal (0.2) -> Chill, joyful (e.g. Veridis Quo)
    const moodResult = bridge.setMood(0.85, 0.3);
    expect(moodResult.targetValence).toBe(0.85);
    expect(moodResult.targetArousal).toBe(0.3);
    expect(moodResult.recommendedTracks.length).toBeGreaterThan(0);
    expect(moodResult.message).toContain('SLOTH engine');

    // Nearest track should be Daft Punk - Veridis Quo (valence 0.82, arousal 0.35)
    expect(moodResult.recommendedTracks[0].title).toBe('Veridis Quo');
  });
});

describe('Sloth MCP - Nuclear Metadata & Discovery Compatibility', () => {
  it('lists methods for known domains', () => {
    const playback = listMethods('Playback');
    expect(playback.domain).toBe('Playback');
    expect(playback.methods).toContain('play');
    expect(playback.methods).toContain('pause');
    expect(playback.methods).toContain('seekTo');

    const queue = listMethods('Queue');
    expect(queue.methods).toContain('addToQueue');
    expect(queue.methods).toContain('getQueue');
  });

  it('returns method details with parameters and return types', () => {
    const details = methodDetails('Playback', 'seekTo');
    expect(details.name).toBe('seekTo');
    expect(details.params[0].name).toBe('seconds');
    expect(details.params[0].type).toBe('number');
  });

  it('describes complex data types', () => {
    const trackShape = describeType('Track');
    expect(trackShape.type).toBe('object');
    expect(trackShape.properties).toBeDefined();
  });

  it('executes call in Domain.method format', async () => {
    const res = await executeCall('Playback.setVolume', { volume: 65 });
    expect(res.volume).toBe(65);

    const queueRes = await executeCall('Queue.getQueue');
    expect(Array.isArray(queueRes)).toBe(true);
  });
});

describe('Sloth MCP - Security & Rate Limiting', () => {
  it('validates localhost addresses and rejects external hosts', () => {
    expect(isLocalhost('127.0.0.1', '127.0.0.1:8801')).toBe(true);
    expect(isLocalhost('::1', 'localhost:8801')).toBe(true);
    expect(isLocalhost('192.168.1.100', 'evil.com')).toBe(false);
    expect(isLocalhost('127.0.0.1', 'attacker.domain.com')).toBe(false);
  });

  it('rate limits requests exceeding 60 calls per minute', () => {
    const limiter = new McpRateLimiter(60, 60_000);
    const testIp = '127.0.0.1';

    for (let i = 0; i < 60; i++) {
      const check = limiter.isAllowed(testIp);
      expect(check.allowed).toBe(true);
    }

    // 61st call should be rejected
    const blocked = limiter.isAllowed(testIp);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });
});

describe('Sloth MCP - HTTP Server & JSON-RPC Protocol', () => {
  const TEST_PORT = 8899;
  let server: SlothMcpHttpServer;

  beforeAll(async () => {
    server = new SlothMcpHttpServer(TEST_PORT);
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('responds to /health check with active tools and resources', async () => {
    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/health`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe('online');
    expect(data.service).toBe('Sloth MCP Server');
    expect(data.tools).toContain('play');
    expect(data.tools).toContain('setMood');
    expect(data.tools).toContain('list_methods');
    expect(data.resources).toContain('sloth://queue');
  });

  it('handles JSON-RPC initialize request over POST /mcp', async () => {
    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { clientInfo: { name: 'Claude', version: '1.0' } },
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.jsonrpc).toBe('2.0');
    expect(data.id).toBe(1);
    expect(data.result.serverInfo.name).toBe('sloth-mcp');
  });

  it('handles tools/list request over POST /mcp', async () => {
    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
      }),
    });

    const data = await res.json();
    expect(data.result.tools.length).toBeGreaterThanOrEqual(11);
    const toolNames = data.result.tools.map((t: any) => t.name);
    expect(toolNames).toContain('play');
    expect(toolNames).toContain('pause');
    expect(toolNames).toContain('seek');
    expect(toolNames).toContain('setVolume');
    expect(toolNames).toContain('getQueue');
    expect(toolNames).toContain('addToQueue');
    expect(toolNames).toContain('search');
    expect(toolNames).toContain('getCurrentTrack');
    expect(toolNames).toContain('setMood');
    expect(toolNames).toContain('call');
  });

  it('executes tool call for setVolume and setMood over POST /mcp', async () => {
    const resVolume = await fetch(`http://127.0.0.1:${TEST_PORT}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'setVolume',
          arguments: { level: 75 },
        },
      }),
    });

    const volData = await resVolume.json();
    expect(volData.result.content[0].text).toContain('75');

    const resMood = await fetch(`http://127.0.0.1:${TEST_PORT}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'setMood',
          arguments: { valence: 0.7, arousal: 0.8 },
        },
      }),
    });

    const moodData = await resMood.json();
    expect(moodData.result.content[0].text).toContain('SLOTH engine');
  });

  it('reads resource sloth://queue over POST /mcp', async () => {
    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 5,
        method: 'resources/read',
        params: { uri: 'sloth://queue' },
      }),
    });

    const data = await res.json();
    expect(data.result.contents[0].uri).toBe('sloth://queue');
    const queue = JSON.parse(data.result.contents[0].text);
    expect(Array.isArray(queue)).toBe(true);
  });
});
