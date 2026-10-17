/**
 * Sloth Download Button Component
 * Ported from Spotube (GPL-3.0) by team-spotube / Adapted for Sloth
 *
 * Compact icon button with circular SVG progress ring, smooth motion
 * transitions, accessibility labeling, and prefers-reduced-motion guard.
 */

'use client';

import React, { FC, MouseEvent } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Download, Check, AlertCircle, Loader2, X } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { useDownloadManager } from './useDownloadManager';
import type { DownloadTrackPayload } from './types';

const downloadButtonVariants = cva(
  [
    'relative inline-flex items-center justify-center font-medium select-none',
    'transition-colors duration-150 outline-none cursor-pointer',
    'border border-[var(--border)] rounded-[4px]',
    'focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]',
  ],
  {
    variants: {
      size: {
        sm: 'size-7 text-xs',
        md: 'size-8 text-sm',
        lg: 'size-9 text-base',
        'icon-sm': 'size-6 p-0 text-[11px]',
      },
      variant: {
        default: 'bg-[var(--surface-raised)] text-[var(--text-primary)] hover:bg-[var(--surface)]',
        ghost: 'bg-transparent border-transparent hover:bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
        accent: 'bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-semibold border-transparent hover:opacity-90',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
    },
  },
);

export interface DownloadButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof downloadButtonVariants> {
  payload: DownloadTrackPayload;
  onDownloaded?: (filePath?: string) => void;
  showProgressText?: boolean;
}

export const DownloadButton: FC<DownloadButtonProps> = ({
  payload,
  size = 'md',
  variant = 'default',
  className,
  onDownloaded,
  showProgressText = false,
  ...props
}) => {
  const prefersReduced = useReducedMotion();
  const { getJobByUrlOrId, startDownload, cancelDownload, retryDownload } = useDownloadManager();

  const job = getJobByUrlOrId(payload.urlOrId);
  const status = job?.status;
  const progress = job?.progress ?? 0;
  const percent = Math.min(100, Math.round(progress * 100));

  const handleClick = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    if (!job) {
      await startDownload(payload);
    } else if (status === 'downloading' || status === 'queued') {
      await cancelDownload(job.jobId);
    } else if (status === 'failed' || status === 'canceled') {
      await retryDownload(job.jobId);
    }
  };

  // SVG Circular progress math
  const radius = size === 'icon-sm' ? 8 : size === 'sm' ? 10 : 12;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={
        !job
          ? `Download ${payload.title} by ${payload.artist}`
          : status === 'downloading'
            ? `Cancel download of ${payload.title} (${percent}%)`
            : status === 'completed'
              ? `Downloaded: ${payload.title}`
              : `Retry downloading ${payload.title}`
      }
      title={
        !job
          ? `Download ${payload.title}`
          : status === 'downloading'
            ? `Downloading: ${percent}% (Click to cancel)`
            : status === 'completed'
              ? 'Download complete'
              : `Download failed (Click to retry)`
      }
      className={cn(downloadButtonVariants({ size, variant }), className)}
      {...props}
    >
      <AnimatePresence mode="wait">
        {!job && (
          <motion.span
            key="idle"
            initial={prefersReduced ? {} : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={prefersReduced ? {} : { opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-center"
          >
            <Download size={size === 'icon-sm' ? 13 : 15} />
          </motion.span>
        )}

        {status === 'queued' && (
          <motion.span
            key="queued"
            initial={prefersReduced ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReduced ? {} : { opacity: 0 }}
            className="flex items-center justify-center text-[var(--color-accent)]"
          >
            <Loader2
              size={size === 'icon-sm' ? 13 : 15}
              className={cn(!prefersReduced && 'animate-spin')}
            />
          </motion.span>
        )}

        {status === 'downloading' && (
          <motion.div
            key="downloading"
            initial={prefersReduced ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReduced ? {} : { opacity: 0 }}
            className="relative flex items-center justify-center group/ring"
          >
            {/* SVG Circular Progress Ring */}
            <svg
              className="size-full -rotate-90 pointer-events-none"
              viewBox="0 0 32 32"
              aria-hidden="true"
            >
              {/* Background track circle */}
              <circle
                cx="16"
                cy="16"
                r={radius}
                className="stroke-[var(--border)] fill-none"
                strokeWidth={2.5}
              />
              {/* Animated Progress Circle */}
              <circle
                cx="16"
                cy="16"
                r={radius}
                className="stroke-[var(--color-accent)] fill-none transition-[stroke-dashoffset] duration-150 ease-out"
                strokeWidth={2.5}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>

            {/* Cancel 'X' icon visible on hover */}
            <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/ring:opacity-100 transition-opacity">
              <X size={size === 'icon-sm' ? 10 : 12} className="text-[var(--text-primary)]" />
            </span>

            {/* Default progress percent if text requested */}
            {showProgressText && (
              <span className="sr-only">{percent}%</span>
            )}
          </motion.div>
        )}

        {status === 'completed' && (
          <motion.span
            key="completed"
            initial={prefersReduced ? {} : { opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={prefersReduced ? {} : { opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            className="flex items-center justify-center text-[var(--color-accent)] font-bold"
          >
            <Check size={size === 'icon-sm' ? 13 : 15} strokeWidth={2.5} />
          </motion.span>
        )}

        {(status === 'failed' || status === 'canceled') && (
          <motion.span
            key="failed"
            initial={prefersReduced ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReduced ? {} : { opacity: 0 }}
            className="flex items-center justify-center text-[#ff5555]"
          >
            <AlertCircle size={size === 'icon-sm' ? 13 : 15} />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
};
