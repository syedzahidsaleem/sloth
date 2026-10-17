/**
 * Sloth Audio Downloader Frontend Unit Tests
 * Tests downloadStore reactive updates, job state management,
 * useDownloadManager hook contracts, and UI components.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  downloadStore,
  DownloadButton,
  DownloadManager,
  useDownloadManager,
} from '../features/download';
import type { DownloadJob } from '../features/download/types';

describe('Sloth Audio Downloader Store & Hook', () => {
  beforeEach(() => {
    downloadStore.clearAll();
  });

  describe('DownloadStore State Management', () => {
    it('manages job lifecycle states in order', () => {
      const mockJob: DownloadJob = {
        jobId: 'job_test_1',
        urlOrId: 'youtube_abc123',
        title: 'Master of Puppets',
        artist: 'Metallica',
        album: 'Master of Puppets',
        format: 'flac',
        quality: 'high',
        status: 'queued',
        progress: 0,
        createdAt: 1000,
      };

      downloadStore.setJob(mockJob);
      expect(downloadStore.getJob('job_test_1')).toEqual(mockJob);
      expect(downloadStore.getJobByUrlOrId('youtube_abc123')).toEqual(mockJob);

      // Transition to downloading
      downloadStore.updateJob('job_test_1', {
        status: 'downloading',
        progress: 0.45,
        speed: '3.2MiB/s',
        eta: '00:04',
      });

      const updating = downloadStore.getJob('job_test_1');
      expect(updating?.status).toBe('downloading');
      expect(updating?.progress).toBe(0.45);
      expect(updating?.speed).toBe('3.2MiB/s');

      // Transition to completed
      downloadStore.updateJob('job_test_1', {
        status: 'completed',
        progress: 1.0,
        filePath: '/downloads/Master of Puppets - Metallica.flac',
        fileSize: 42000000,
      });

      const completed = downloadStore.getJob('job_test_1');
      expect(completed?.status).toBe('completed');
      expect(completed?.progress).toBe(1.0);
      expect(completed?.fileSize).toBe(42000000);
    });

    it('subscribes and receives notifications on state updates', () => {
      const listener = vi.fn();
      const unsubscribe = downloadStore.subscribe(listener);

      downloadStore.setJob({
        jobId: 'job_test_2',
        urlOrId: 'vid_456',
        title: 'Test Track',
        artist: 'Artist',
        format: 'mp3',
        quality: 'high',
        status: 'queued',
        progress: 0,
        createdAt: 2000,
      });

      expect(listener).toHaveBeenCalled();
      unsubscribe();
    });

    it('clears completed, failed, and canceled jobs', () => {
      downloadStore.setJob({
        jobId: 'job_c1',
        urlOrId: 'vid_c1',
        title: 'Completed',
        artist: 'A',
        format: 'mp3',
        quality: 'high',
        status: 'completed',
        progress: 1.0,
        createdAt: 100,
      });
      downloadStore.setJob({
        jobId: 'job_f1',
        urlOrId: 'vid_f1',
        title: 'Failed',
        artist: 'B',
        format: 'mp3',
        quality: 'high',
        status: 'failed',
        progress: 0.2,
        createdAt: 200,
      });
      downloadStore.setJob({
        jobId: 'job_active',
        urlOrId: 'vid_active',
        title: 'Active',
        artist: 'C',
        format: 'mp3',
        quality: 'high',
        status: 'downloading',
        progress: 0.5,
        createdAt: 300,
      });

      downloadStore.clearFinished();

      const snapshot = downloadStore.getSnapshot();
      expect(snapshot.length).toBe(1);
      expect(snapshot[0].jobId).toBe('job_active');
    });

    it('cancels active downloads', async () => {
      downloadStore.setJob({
        jobId: 'job_cancel',
        urlOrId: 'vid_cancel',
        title: 'Cancel Me',
        artist: 'A',
        format: 'opus',
        quality: 'medium',
        status: 'downloading',
        progress: 0.1,
        createdAt: 500,
      });

      await downloadStore.cancelDownload('job_cancel');
      const job = downloadStore.getJob('job_cancel');
      expect(job?.status).toBe('canceled');
    });
  });

  describe('Component Definitions', () => {
    it('exports DownloadButton and DownloadManager components', () => {
      expect(DownloadButton).toBeDefined();
      expect(typeof DownloadButton).toBe('function');
      expect(DownloadManager).toBeDefined();
      expect(typeof DownloadManager).toBe('function');
      expect(useDownloadManager).toBeDefined();
      expect(typeof useDownloadManager).toBe('function');
    });
  });
});
