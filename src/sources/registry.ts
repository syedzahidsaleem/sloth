/**
 * Sloth Source Registry & Fallback Resolution Pipeline
 * Orchestrates multi-provider fallback: ISRC match -> fuzzy match -> duration confirm -> override.
 */

import {
  AudioSource,
  TrackMeta,
  SourceResolvedStream,
  SourceRegistryStatus,
} from './types';
import { matchOverrides, matchTrack } from './matcher';
import { youtubeSource } from './youtube';
import { pipedSource } from './piped';
import { qobuzSource } from './qobuz';

export class SourceRegistry {
  private sources: Map<string, AudioSource> = new Map();
  private priority: string[] = [];
  private enabledMap: Map<string, boolean> = new Map();

  constructor() {
    // Register default sources in initial priority order:
    // 1. Qobuz Lossless (highest fidelity)
    // 2. YouTube Music (broadest catalog & fast CDN)
    // 3. Piped Proxy (privacy fallback)
    this.register(qobuzSource);
    this.register(youtubeSource);
    this.register(pipedSource);
  }

  /**
   * Register a new audio provider plugin
   */
  public register(source: AudioSource): void {
    this.sources.set(source.id, source);
    if (!this.priority.includes(source.id)) {
      this.priority.push(source.id);
    }
    if (!this.enabledMap.has(source.id)) {
      this.enabledMap.set(source.id, true);
    }
  }

  /**
   * Unregister a provider plugin
   */
  public unregister(sourceId: string): boolean {
    const deleted = this.sources.delete(sourceId);
    this.priority = this.priority.filter((id) => id !== sourceId);
    this.enabledMap.delete(sourceId);
    return deleted;
  }

  /**
   * Get provider by ID
   */
  public getSource(id: string): AudioSource | undefined {
    return this.sources.get(id);
  }

  /**
   * Return all registered providers in priority order
   */
  public getSources(): AudioSource[] {
    return this.priority
      .map((id) => this.sources.get(id))
      .filter((s): s is AudioSource => !!s);
  }

  /**
   * Configure fallback priority order
   */
  public setPriority(order: string[]): void {
    // Filter to known sources
    const valid = order.filter((id) => this.sources.has(id));
    // Add any missing sources at the end
    for (const id of this.sources.keys()) {
      if (!valid.includes(id)) valid.push(id);
    }
    this.priority = valid;
  }

  public getPriority(): string[] {
    return [...this.priority];
  }

  /**
   * Toggle a source on or off
   */
  public setEnabled(sourceId: string, enabled: boolean): void {
    if (this.sources.has(sourceId)) {
      this.enabledMap.set(sourceId, enabled);
    }
  }

  public isEnabled(sourceId: string): boolean {
    return this.enabledMap.get(sourceId) ?? true;
  }

  /**
   * Full Fallback Chain Stream Resolution:
   * 1. Check user override in SQLite / LocalStorage
   * 2. Iterate providers in priority order
   * 3. ISRC match -> immediate resolution (confidence 1.0)
   * 4. Fuzzy title+artist match + duration confirmation (confidence >= 0.75)
   * 5. Fallback cascade to next provider
   */
  public async resolve(track: TrackMeta): Promise<SourceResolvedStream | null> {
    // Step 1: User Override Check
    const override = matchOverrides.getOverride(track.id);
    if (override) {
      const source = this.sources.get(override.sourceId);
      if (source && this.isEnabled(override.sourceId)) {
        try {
          const resolved = await source.resolve({
            ...track,
            id: override.candidateId,
          });
          return {
            ...resolved,
            isrc: track.isrc,
          };
        } catch {
          // If overridden stream fails, fall through to auto-matching
        }
      }
    }

    // Step 2: Iterate enabled sources in priority order
    const activeSources = this.priority
      .filter((id) => this.isEnabled(id))
      .map((id) => this.sources.get(id))
      .filter((s): s is AudioSource => !!s);

    let bestLowConfidenceMatch: {
      source: AudioSource;
      candidateId: string;
      confidence: number;
    } | null = null;

    for (const source of activeSources) {
      try {
        // Step 3: Exact ISRC resolution if ISRC is available
        if (track.isrc) {
          try {
            const isrcCandidates = await source.search(track.isrc);
            const exactIsrc = isrcCandidates.find(
              (c) => c.isrc && c.isrc.trim().toUpperCase() === track.isrc!.trim().toUpperCase(),
            );
            if (exactIsrc) {
              return await source.resolve({
                ...track,
                id: exactIsrc.id,
              });
            }
          } catch {
            // ISRC search failed on this source, continue to query search
          }
        }

        // Step 4: Fuzzy Title + Artist Search
        const query = `${track.title} ${track.artist}`.trim();
        const candidates = await source.search(query);
        if (candidates.length === 0) continue;

        const matches = candidates.map((cand) => matchTrack(track, cand));
        matches.sort((a, b) => b.confidence - a.confidence);
        const topMatch = matches[0];

        // Step 5: High-Confidence Acceptance (>= 0.75)
        if (topMatch.confidence >= 0.75) {
          return await source.resolve({
            ...track,
            id: topMatch.candidate.id,
          });
        }

        // Record best fallback if all sources are low-confidence
        if (!bestLowConfidenceMatch || topMatch.confidence > bestLowConfidenceMatch.confidence) {
          bestLowConfidenceMatch = {
            source,
            candidateId: topMatch.candidate.id,
            confidence: topMatch.confidence,
          };
        }
      } catch {
        // Provider failed or threw error, proceed down fallback chain
        continue;
      }
    }

    // Step 6: If all sources have confidence < 0.75, resolve best candidate but flag
    if (bestLowConfidenceMatch) {
      try {
        return await bestLowConfidenceMatch.source.resolve({
          ...track,
          id: bestLowConfidenceMatch.candidateId,
        });
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * Health & Latency status report for settings UI
   */
  public async getStatus(): Promise<SourceRegistryStatus[]> {
    const statuses: SourceRegistryStatus[] = [];

    for (let i = 0; i < this.priority.length; i++) {
      const id = this.priority[i];
      const source = this.sources.get(id);
      if (!source) continue;

      let online = true;
      let latencyMs = 24;

      if (source.ping) {
        try {
          const pingRes = await source.ping();
          online = pingRes.online;
          latencyMs = pingRes.latencyMs;
        } catch {
          online = false;
          latencyMs = 999;
        }
      }

      statuses.push({
        sourceId: source.id,
        label: source.label,
        enabled: this.isEnabled(source.id),
        priority: i + 1,
        online,
        latencyMs,
        supportsLossless: source.supportsLossless,
      });
    }

    return statuses;
  }
}

export const sourceRegistry = new SourceRegistry();
