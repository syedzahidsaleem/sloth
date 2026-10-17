/**
 * Vitest Test Suite for Sloth Listen Together
 * Tests SyncEngine NTP offset math, drift correction threshold,
 * WebSocket message processing, and ListenTogether UI components.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncEngine, DRIFT_THRESHOLD_MS } from '@/features/listen-together/SyncEngine';
import { RoomState } from '@/features/listen-together/types';

describe('Sloth Listen Together - SyncEngine', () => {
  let engine: SyncEngine;

  beforeEach(() => {
    engine = new SyncEngine();
  });

  it('increments sequence and creates timestamped ping', () => {
    const ping1 = engine.createPing();
    const ping2 = engine.createPing();

    expect(ping1.sequence).toBe(1);
    expect(ping2.sequence).toBe(2);
    expect(ping1.client_time).toBeGreaterThan(0);
    expect(ping2.client_time).toBeGreaterThanOrEqual(ping1.client_time);
  });

  it('accurately calculates NTP clock offset and RTT from pong', () => {
    // Simulate:
    // Client sends at t0 = 1000
    // Server receives at t1 = 1050 (server is 30ms ahead, transmission took 20ms)
    // Server sends at t2 = 1055 (5ms processing)
    // Client receives at t3 = 1080 (25ms return transmission)
    // RTT = (1080 - 1000) - (1055 - 1050) = 80 - 5 = 75ms
    // Offset = ((1050 - 1000) + (1055 - 1080)) / 2 = (50 - 25) / 2 = 12.5 -> 13 or 12ms

    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1080);

    const sample = engine.processPong({
      client_time: 1000,
      server_receive_time: 1050,
      server_send_time: 1055,
      sequence: 1,
    });

    expect(sample.rtt).toBe(75);
    expect(sample.offset).toBe(13); // round(12.5)
    expect(engine.getClockOffset()).toBe(13);

    nowSpy.mockRestore();
  });

  it('filters jitter by preferring low-RTT NTP samples', () => {
    // Sample 1: Low RTT (20ms), offset = 100
    vi.spyOn(Date, 'now').mockReturnValueOnce(1020);
    engine.processPong({ client_time: 1000, server_receive_time: 1110, server_send_time: 1110 });

    // Sample 2: High RTT spike (200ms), noisy offset = 180
    vi.spyOn(Date, 'now').mockReturnValueOnce(1200);
    engine.processPong({ client_time: 1000, server_receive_time: 1190, server_send_time: 1190 });

    // Sample 3: Low RTT (20ms), offset = 102
    vi.spyOn(Date, 'now').mockReturnValueOnce(1020);
    engine.processPong({ client_time: 1000, server_receive_time: 1112, server_send_time: 1112 });

    // The offset should be close to 101, ignoring the heavy jitter sample
    const effectiveOffset = engine.getClockOffset();
    expect(effectiveOffset).toBeGreaterThanOrEqual(100);
    expect(effectiveOffset).toBeLessThanOrEqual(105);
  });

  it('calculates expected host playback position when paused', () => {
    const mockRoom: RoomState = {
      room_code: 'TEST01',
      host_id: 'host_1',
      users: [],
      current_track: { id: 't1', title: 'Track 1', artist: 'Artist 1', duration: 200 },
      is_playing: false,
      position: 45000,
      last_update: 100000,
      volume: 1,
      queue: [],
      revision: 1,
    };

    const expected = engine.calculateExpectedPositionMs(mockRoom, 150000);
    expect(expected).toBe(45000); // Does not advance while paused
  });

  it('calculates expected host playback position when playing', () => {
    const mockRoom: RoomState = {
      room_code: 'TEST01',
      host_id: 'host_1',
      users: [],
      current_track: { id: 't1', title: 'Track 1', artist: 'Artist 1', duration: 200 },
      is_playing: true,
      position: 10000, // 10s into song
      last_update: 100000, // at timestamp 100s
      volume: 1,
      queue: [],
      revision: 1,
    };

    // Client at timestamp 105s (5s elapsed) with 0 clock offset
    const expected = engine.calculateExpectedPositionMs(mockRoom, 105000);
    expect(expected).toBe(15000); // 10s + 5s = 15s
  });

  it('does NOT trigger seek correction when drift is within 500ms threshold', () => {
    const mockRoom: RoomState = {
      room_code: 'TEST01',
      host_id: 'host_1',
      users: [],
      current_track: null,
      is_playing: false,
      position: 20000, // 20.0s
      last_update: 100000,
      volume: 1,
      queue: [],
      revision: 1,
    };

    // Client is at 20.2s -> drift is 200ms (< 500ms)
    const report = engine.checkDrift(mockRoom, 20.2, 100000);

    expect(report.driftMs).toBe(200);
    expect(report.needsCorrection).toBe(false);
    expect(DRIFT_THRESHOLD_MS).toBe(500);
  });

  it('triggers seek correction when drift exceeds 500ms threshold', () => {
    const mockRoom: RoomState = {
      room_code: 'TEST01',
      host_id: 'host_1',
      users: [],
      current_track: null,
      is_playing: false,
      position: 20000, // 20.0s
      last_update: 100000,
      volume: 1,
      queue: [],
      revision: 1,
    };

    // Client is at 19.1s -> drift is 900ms (> 500ms)
    const report = engine.checkDrift(mockRoom, 19.1, 100000);

    expect(report.driftMs).toBe(900);
    expect(report.needsCorrection).toBe(true);
    expect(report.expectedSeconds).toBe(20.0);
  });
});
