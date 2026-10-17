/**
 * Sloth Audio Downloader Types & Data Contracts
 * Ported from Spotube (GPL-3.0) by team-spotube / Adapted for Sloth
 */

export type DownloadContainer = 'mp3' | 'flac' | 'opus' | 'm4a';
export type DownloadQuality = 'high' | 'medium' | 'low';
export type DownloadStatus = 'queued' | 'downloading' | 'completed' | 'failed' | 'canceled';

export interface DownloadTrackPayload {
  urlOrId: string;
  title: string;
  artist: string;
  album?: string;
  year?: number;
  trackNumber?: number;
  isrc?: string;
  coverUrl?: string;
  plainLyrics?: string;
  lrcLyrics?: string;
  format?: DownloadContainer;
  quality?: DownloadQuality;
  skipNonMusic?: boolean;
  preferChapters?: boolean;
}

export interface DownloadJob {
  jobId: string;
  urlOrId: string;
  title: string;
  artist: string;
  album?: string;
  year?: number;
  isrc?: string;
  coverUrl?: string;
  format: DownloadContainer;
  quality: DownloadQuality;
  status: DownloadStatus;
  progress: number; // 0.0 to 1.0
  speed?: string | null;
  eta?: string | null;
  filePath?: string | null;
  fileSize?: number | null;
  error?: string | null;
  createdAt: number;
  completedAt?: number | null;
}

export interface DownloadServerEvent {
  event: 'queued' | 'downloading' | 'progress' | 'completed' | 'failed' | 'canceled' | 'state';
  job_id: string;
  status: DownloadStatus;
  progress: number;
  speed?: string | null;
  eta?: string | null;
  title?: string;
  artist?: string;
  file_path?: string | null;
  error?: string | null;
}

export interface DownloadQueueResponse {
  active_count: number;
  max_concurrent: number;
  jobs: Array<{
    job_id: string;
    url_or_id: string;
    title: string;
    artist: string;
    album?: string;
    year?: number;
    isrc?: string;
    cover_url?: string;
    format: string;
    quality: string;
    status: string;
    progress: number;
    speed?: string | null;
    eta?: string | null;
    file_path?: string | null;
    file_size?: number | null;
    error?: string | null;
    created_at: number;
    completed_at?: number | null;
  }>;
}
