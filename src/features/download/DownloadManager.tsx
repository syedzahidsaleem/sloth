/**
 * Sloth Download Manager Panel
 * Ported from Nuclear & Spotube (GPL-3.0) / Adapted for Sloth
 *
 * Information-dense sidebar panel showing active and completed downloads.
 * Collapses completely when queue is empty. Features live speed, ETA,
 * individual task cancellation, and batch clearing.
 */

'use client';

import { FC, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  DownloadCloud,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle2,
  RotateCw,
  Trash2,
  HardDrive,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDownloadManager } from './useDownloadManager';
import type { DownloadJob } from './types';

export interface DownloadManagerProps {
  className?: string;
  defaultExpanded?: boolean;
}

export const DownloadManager: FC<DownloadManagerProps> = ({
  className,
  defaultExpanded = true,
}) => {
  const prefersReduced = useReducedMotion();
  const { jobs, activeJobs, cancelDownload, retryDownload, clearCompleted } =
    useDownloadManager();
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);

  // If there are no downloads at all, collapse to nothing to preserve sidebar density
  if (jobs.length === 0) {
    return null;
  }

  const activeCount = activeJobs.length;
  const totalCount = jobs.length;

  return (
    <div
      className={cn(
        'w-full flex flex-col bg-[var(--background)] border border-[var(--border)] rounded-[4px] overflow-hidden select-none text-xs font-sans',
        className,
      )}
      aria-label="Download Manager"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-[var(--surface)] border-b border-[var(--border)]">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 text-left text-[11px] font-semibold text-[var(--text-primary)] hover:text-[var(--color-accent)] transition-colors cursor-pointer"
        >
          <DownloadCloud size={13} className="text-[var(--color-accent)] shrink-0" />
          <span className="tracking-tight uppercase font-mono text-[10px]">Downloads</span>
          <span className="text-[9px] font-mono px-1 py-0.2 rounded-[2px] bg-[var(--surface-raised)] text-[var(--color-accent)] border border-[var(--border)]">
            {activeCount > 0 ? `${activeCount} active` : `${totalCount}`}
          </span>
          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        <div className="flex items-center gap-1">
          {jobs.length > 0 && activeCount === 0 && (
            <button
              type="button"
              onClick={clearCompleted}
              title="Clear finished downloads"
              aria-label="Clear finished downloads"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 rounded-[2px] hover:bg-[var(--surface-raised)] transition-colors cursor-pointer"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Expandable Task List */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="download-list"
            initial={prefersReduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={prefersReduced ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={prefersReduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="flex flex-col max-h-[220px] overflow-y-auto divide-y divide-[var(--border)]"
          >
            {jobs.map((job) => (
              <DownloadRow
                key={job.jobId}
                job={job}
                onCancel={() => cancelDownload(job.jobId)}
                onRetry={() => retryDownload(job.jobId)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface DownloadRowProps {
  job: DownloadJob;
  onCancel: () => void;
  onRetry: () => void;
}

const DownloadRow: FC<DownloadRowProps> = ({ job, onCancel, onRetry }) => {
  const percent = Math.min(100, Math.round(job.progress * 100));
  const isDownloading = job.status === 'downloading';
  const isQueued = job.status === 'queued';
  const isCompleted = job.status === 'completed';
  const isFailed = job.status === 'failed' || job.status === 'canceled';

  return (
    <div className="flex flex-col gap-1 p-2 bg-[var(--background)] hover:bg-[var(--surface-raised)]/40 transition-colors">
      {/* Track Meta & Status Action */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-[11px] text-[var(--text-primary)] leading-tight">
            {job.title}
          </div>
          <div className="truncate text-[10px] text-[var(--text-muted)] flex items-center gap-1 font-mono">
            <span>{job.artist}</span>
            <span>•</span>
            <span className="uppercase text-[9px] text-[var(--color-accent)] font-bold">
              {job.format}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="shrink-0 flex items-center gap-1">
          {isDownloading && (
            <button
              type="button"
              onClick={onCancel}
              title="Cancel download"
              aria-label={`Cancel download of ${job.title}`}
              className="text-[var(--text-muted)] hover:text-red-400 p-0.5 rounded-[2px] transition-colors cursor-pointer"
            >
              <X size={12} />
            </button>
          )}

          {isQueued && (
            <button
              type="button"
              onClick={onCancel}
              title="Remove from queue"
              aria-label={`Remove ${job.title} from queue`}
              className="text-[var(--text-muted)] hover:text-red-400 p-0.5 rounded-[2px] transition-colors cursor-pointer"
            >
              <X size={12} />
            </button>
          )}

          {isCompleted && (
            <span title="Completed" className="text-[var(--color-accent)] p-0.5">
              <CheckCircle2 size={12} />
            </span>
          )}

          {isFailed && (
            <button
              type="button"
              onClick={onRetry}
              title="Retry download"
              aria-label={`Retry ${job.title}`}
              className="text-[#ff5555] hover:text-white p-0.5 rounded-[2px] transition-colors cursor-pointer"
            >
              <RotateCw size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar & Sub-metrics */}
      {(isDownloading || isQueued) && (
        <div className="flex flex-col gap-0.5 mt-0.5">
          {/* Progress Bar */}
          <div className="w-full h-1 bg-[var(--surface-raised)] rounded-full overflow-hidden border border-[var(--border)]">
            <div
              className="h-full bg-[var(--color-accent)] transition-[width] duration-150 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>

          {/* Sub-text: percentage, speed, ETA */}
          <div className="flex items-center justify-between text-[9px] font-mono text-[var(--text-muted)]">
            <span>{isQueued ? 'Waiting in queue...' : `${percent}%`}</span>
            {isDownloading && job.speed && (
              <span className="truncate">{job.speed}</span>
            )}
            {isDownloading && job.eta && (
              <span className="truncate">ETA {job.eta}</span>
            )}
          </div>
        </div>
      )}

      {/* File Size badge when completed */}
      {isCompleted && job.fileSize && (
        <div className="flex items-center gap-1 text-[9px] font-mono text-[var(--text-muted)]">
          <HardDrive size={9} />
          <span>{(job.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
        </div>
      )}

      {/* Error message when failed */}
      {isFailed && job.error && (
        <div className="truncate text-[9px] font-mono text-red-400">
          {job.error}
        </div>
      )}
    </div>
  );
};
