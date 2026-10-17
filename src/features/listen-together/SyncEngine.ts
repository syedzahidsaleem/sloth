/**
 * Sloth Listen-Together SyncEngine
 * Ported from Metrolist sync & drift correction architecture.
 *
 * Provides:
 * - NTP clock synchronization with network jitter filtering
 * - Continuous drift estimation against host position
 * - 500ms threshold drift correction
 */

import { DriftReport, NtpSample, RoomState } from './types';

export const DRIFT_THRESHOLD_MS = 500;
const MAX_NTP_SAMPLES = 8;

export class SyncEngine {
  private offsetMs: number = 0;
  private samples: NtpSample[] = [];
  private lastPingSentAt: number = 0;
  private pingSequence: number = 0;

  constructor() {
    this.reset();
  }

  /**
   * Reset engine offsets and sample buffer.
   */
  public reset(): void {
    this.offsetMs = 0;
    this.samples = [];
    this.lastPingSentAt = 0;
    this.pingSequence = 0;
  }

  /**
   * Generates a ping packet timestamped with client local time.
   */
  public createPing(): { client_time: number; sequence: number } {
    this.pingSequence += 1;
    this.lastPingSentAt = Date.now();
    return {
      client_time: this.lastPingSentAt,
      sequence: this.pingSequence,
    };
  }

  /**
   * Process pong response from server and compute clock offset.
   *
   * Formula:
   * t0 = client transmit
   * t1 = server receive
   * t2 = server send
   * t3 = client receive
   * RTT = (t3 - t0) - (t2 - t1)
   * Offset = ((t1 - t0) + (t2 - t3)) / 2
   */
  public processPong(payload: {
    client_time: number;
    server_receive_time: number;
    server_send_time: number;
    sequence?: number;
  }): NtpSample {
    const t0 = payload.client_time;
    const t1 = payload.server_receive_time;
    const t2 = payload.server_send_time;
    const t3 = Date.now();

    const serverProcessing = Math.max(0, t2 - t1);
    const rtt = Math.max(0, t3 - t0 - serverProcessing);
    const offset = Math.round(((t1 - t0) + (t2 - t3)) / 2);

    const sample: NtpSample = { t0, t1, t2, t3, rtt, offset };
    this.samples.push(sample);

    if (this.samples.length > MAX_NTP_SAMPLES) {
      this.samples.shift();
    }

    // Filter samples: Sort by lowest RTT (cleanest network route)
    // Filter out jitter spikes where RTT is significantly higher than minimum RTT
    const sortedByRtt = [...this.samples].sort((a, b) => a.rtt - b.rtt);
    const minRtt = sortedByRtt[0].rtt;
    const cleanSamples = sortedByRtt.filter(
      (s, idx) => idx === 0 || s.rtt <= Math.max(minRtt * 1.5, minRtt + 30)
    );
    const bestSamples = cleanSamples.slice(0, Math.min(3, cleanSamples.length));

    const sumOffset = bestSamples.reduce((acc, s) => acc + s.offset, 0);
    this.offsetMs = Math.round(sumOffset / bestSamples.length);

    return sample;
  }

  /**
   * Returns estimated current server time in milliseconds.
   */
  public getEstimatedServerTime(clientLocalTime: number = Date.now()): number {
    return clientLocalTime + this.offsetMs;
  }

  /**
   * Returns current clock offset in milliseconds (Server Time - Client Time).
   */
  public getClockOffset(): number {
    return this.offsetMs;
  }

  /**
   * Calculate host's exact expected position in ms given current clock.
   */
  public calculateExpectedPositionMs(
    roomState: RoomState,
    clientLocalTime: number = Date.now()
  ): number {
    if (!roomState.is_playing) {
      return roomState.position;
    }

    const estimatedServerNow = this.getEstimatedServerTime(clientLocalTime);
    const elapsedSinceUpdate = Math.max(0, estimatedServerNow - roomState.last_update);
    const expected = roomState.position + elapsedSinceUpdate;

    if (roomState.current_track?.duration) {
      const durationMs = roomState.current_track.duration * 1000;
      return Math.min(durationMs, expected);
    }

    return expected;
  }

  /**
   * Compare client's local playback position against host expected position.
   * Returns drift in ms and whether a seek correction is required (drift > 500ms).
   */
  public checkDrift(
    roomState: RoomState,
    currentLocalSeconds: number,
    clientLocalTime: number = Date.now()
  ): DriftReport {
    const expectedMs = this.calculateExpectedPositionMs(roomState, clientLocalTime);
    const currentMs = Math.round(currentLocalSeconds * 1000);

    const driftMs = Math.abs(expectedMs - currentMs);
    const needsCorrection = driftMs > DRIFT_THRESHOLD_MS;

    return {
      driftMs,
      needsCorrection,
      expectedSeconds: Number((expectedMs / 1000).toFixed(2)),
      currentSeconds: currentLocalSeconds,
    };
  }
}

export const syncEngine = new SyncEngine();
