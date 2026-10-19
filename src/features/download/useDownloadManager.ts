/**
 * Sloth Download Manager Hook & Reactive Store
 * Ported from Spotube (GPL-3.0) by team-spotube / Adapted for Sloth
 *
 * Implements centralized state for all active and completed downloads,
 * Server-Sent Events (SSE) streaming for sub-second progress updates,
 * task cancellation, retry mechanisms, and reactive notifications.
 */

'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type {
  DownloadContainer,
  DownloadJob,
  DownloadQuality,
  DownloadServerEvent,
  DownloadTrackPayload,
} from './types';

const API_BASE =
  typeof window !== 'undefined' && (window as any).__SLOTH_DOWNLOADER_URL__
    ? (window as any).__SLOTH_DOWNLOADER_URL__
    : (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_DOWNLOADER_URL) ||
      'http://127.0.0.1:8802';

// In-memory global store to synchronize between buttons and sidebar panels
class DownloadStore {
  private jobs: Map<string, DownloadJob> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();
  private listeners: Set<() => void> = new Set();
  private globalSseConnected: boolean = false;
  private cachedSnapshot: DownloadJob[] = [];
  private isDirty: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initGlobalSse();
    }
  }

  private notify() {
    this.isDirty = true;
    for (const listener of this.listeners) {
      listener();
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getSnapshot = (): DownloadJob[] => {
    if (this.isDirty) {
      this.cachedSnapshot = Array.from(this.jobs.values()).sort((a, b) => b.createdAt - a.createdAt);
      this.isDirty = false;
    }
    return this.cachedSnapshot;
  };

  public getJob(jobId: string): DownloadJob | undefined {
    return this.jobs.get(jobId);
  }

  public getJobByUrlOrId(urlOrId: string): DownloadJob | undefined {
    for (const job of this.jobs.values()) {
      if (job.urlOrId === urlOrId) {
        return job;
      }
    }
    return undefined;
  }

  public setJob(job: DownloadJob) {
    this.jobs.set(job.jobId, job);
    this.notify();
  }

  public updateJob(jobId: string, updates: Partial<DownloadJob>) {
    const existing = this.jobs.get(jobId);
    if (!existing) return;
    this.jobs.set(jobId, { ...existing, ...updates });
    this.notify();
  }

  public removeJob(jobId: string) {
    this.jobs.delete(jobId);
    this.abortControllers.delete(jobId);
    this.notify();
  }

  public clearAll() {
    for (const controller of this.abortControllers.values()) {
      controller.abort();
    }
    this.jobs.clear();
    this.abortControllers.clear();
    this.notify();
  }

  public clearFinished() {
    for (const [id, job] of Array.from(this.jobs.entries())) {
      if (job.status === 'completed' || job.status === 'failed' || job.status === 'canceled') {
        this.jobs.delete(id);
        this.abortControllers.delete(id);
      }
    }
    this.notify();

    // Call server clear endpoint
    try {
      fetch(`${API_BASE}/download/clear`, { method: 'POST' }).catch(() => {});
    } catch {
      // offline silent catch
    }
  }

  private initGlobalSse() {
    if (this.globalSseConnected) return;
    try {
      if (typeof EventSource !== 'undefined') {
        const es = new EventSource(`${API_BASE}/download/events`);
        es.onmessage = (event) => {
          try {
            const data: DownloadServerEvent = JSON.parse(event.data);
            if (data.job_id && this.jobs.has(data.job_id)) {
              this.updateJob(data.job_id, {
                status: data.status,
                progress: data.progress,
                speed: data.speed,
                eta: data.eta,
                filePath: data.file_path,
                error: data.error,
                completedAt:
                  data.status === 'completed' || data.status === 'failed' || data.status === 'canceled'
                    ? Date.now()
                    : undefined,
              });
            }
          } catch {
            // parse error ignore
          }
        };
        es.onerror = () => {
          es.close();
          this.globalSseConnected = false;
        };
        this.globalSseConnected = true;
      }
    } catch {
      // ignore offline event source
    }
  }

  public async startDownload(payload: DownloadTrackPayload): Promise<string> {
    const tempId = `dl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const format: DownloadContainer = payload.format || 'mp3';
    const quality: DownloadQuality = payload.quality || 'high';

    const newJob: DownloadJob = {
      jobId: tempId,
      urlOrId: payload.urlOrId,
      title: payload.title,
      artist: payload.artist,
      album: payload.album,
      year: payload.year,
      isrc: payload.isrc,
      coverUrl: payload.coverUrl,
      format,
      quality,
      status: 'queued',
      progress: 0,
      createdAt: Date.now(),
    };

    this.setJob(newJob);

    const abortController = new AbortController();
    this.abortControllers.set(tempId, abortController);

    try {
      const response = await fetch(`${API_BASE}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          url_or_id: payload.urlOrId,
          title: payload.title,
          artist: payload.artist,
          album: payload.album,
          year: payload.year,
          track_number: payload.trackNumber,
          isrc: payload.isrc,
          cover_url: payload.coverUrl,
          plain_lyrics: payload.plainLyrics,
          lrc_lyrics: payload.lrcLyrics,
          format,
          quality,
          skip_non_music: payload.skipNonMusic ?? true,
          prefer_chapters: payload.preferChapters ?? true,
          stream: true,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Readable stream not supported on response body');
      }

      // Stream SSE chunks
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            const jsonText = trimmed.replace(/^data:\s*/, '');
            try {
              const eventData: DownloadServerEvent = JSON.parse(jsonText);
              const realJobId = eventData.job_id || tempId;

              // If job ID changed from temp to server ID, remap
              if (realJobId !== tempId && !this.jobs.has(realJobId)) {
                this.jobs.delete(tempId);
                this.abortControllers.set(realJobId, abortController);
                this.jobs.set(realJobId, {
                  ...newJob,
                  jobId: realJobId,
                });
              }

              this.updateJob(realJobId, {
                status: eventData.status,
                progress: eventData.progress,
                speed: eventData.speed,
                eta: eventData.eta,
                filePath: eventData.file_path,
                error: eventData.error,
                completedAt:
                  eventData.status === 'completed' || eventData.status === 'failed' || eventData.status === 'canceled'
                    ? Date.now()
                    : undefined,
              });
            } catch {
              // ignore malformed chunk
            }
          }
        }
      }

      return tempId;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        this.updateJob(tempId, {
          status: 'canceled',
          completedAt: Date.now(),
        });
      } else {
        this.updateJob(tempId, {
          status: 'failed',
          error: err.message || 'Download error',
          completedAt: Date.now(),
        });
      }
      return tempId;
    }
  }

  public async cancelDownload(jobId: string): Promise<boolean> {
    const controller = this.abortControllers.get(jobId);
    if (controller) {
      controller.abort();
    }

    this.updateJob(jobId, {
      status: 'canceled',
      completedAt: Date.now(),
    });

    try {
      await fetch(`${API_BASE}/download/cancel/${jobId}`, {
        method: 'POST',
      });
      return true;
    } catch {
      return false;
    }
  }
}

// Global Singleton Store
export const downloadStore = new DownloadStore();

/**
 * React hook to interact with the Sloth Download Manager.
 */
export function useDownloadManager() {
  const jobs = useSyncExternalStore(
    downloadStore.subscribe.bind(downloadStore),
    downloadStore.getSnapshot.bind(downloadStore),
    () => [] as DownloadJob[],
  );

  const activeJobs = jobs.filter((j) => j.status === 'downloading' || j.status === 'queued');
  const completedJobs = jobs.filter((j) => j.status === 'completed');
  const failedJobs = jobs.filter((j) => j.status === 'failed' || j.status === 'canceled');

  const startDownload = useCallback((payload: DownloadTrackPayload) => {
    return downloadStore.startDownload(payload);
  }, []);

  const cancelDownload = useCallback((jobId: string) => {
    return downloadStore.cancelDownload(jobId);
  }, []);

  const clearCompleted = useCallback(() => {
    downloadStore.clearFinished();
  }, []);

  const getJobByUrlOrId = useCallback((urlOrId: string) => {
    return downloadStore.getJobByUrlOrId(urlOrId);
  }, []);

  const retryDownload = useCallback(
    async (jobId: string) => {
      const job = downloadStore.getJob(jobId);
      if (!job) return;
      downloadStore.removeJob(jobId);
      await downloadStore.startDownload({
        urlOrId: job.urlOrId,
        title: job.title,
        artist: job.artist,
        album: job.album,
        year: job.year,
        isrc: job.isrc,
        coverUrl: job.coverUrl,
        format: job.format,
        quality: job.quality,
      });
    },
    [],
  );

  return {
    jobs,
    activeJobs,
    completedJobs,
    failedJobs,
    activeCount: activeJobs.length,
    completedCount: completedJobs.length,
    startDownload,
    cancelDownload,
    clearCompleted,
    retryDownload,
    getJobByUrlOrId,
  };
}
