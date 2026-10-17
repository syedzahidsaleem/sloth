/**
 * Sloth Library Indexer Row Component
 * Ported from Nuclear & Spotube / Adapted for Sloth
 *
 * Nuclear-style progress row:
 * Spinning icon + "Indexed 234/1402 tracks..." with SSE progress bar.
 */

'use client';

import { FC } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Database, Loader2, CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLibraryIndexer } from './useLibraryIndexer';
import { Button } from '@/components/ui/Button';

export interface LibraryIndexerRowProps {
  className?: string;
  totalTracks?: number;
}

export const LibraryIndexerRow: FC<LibraryIndexerRowProps> = ({
  className,
  totalTracks = 1402,
}) => {
  const prefersReduced = useReducedMotion();
  const { indexed, total, percent, currentTrack, status, isIndexing, startReindex, cancelReindex } =
    useLibraryIndexer();

  const handleStart = () => {
    startReindex(totalTracks);
  };

  return (
    <div
      className={cn(
        'w-full flex flex-col gap-3 p-4 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] select-none font-sans',
        className,
      )}
      aria-label="Music Library Feature Indexing"
    >
      {/* Title & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <Database size={15} className="text-[var(--color-accent)]" />
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              Acoustic Feature Index (MERT & CLAP)
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            Extracts 768-dim MERT timbre embeddings, 512-dim CLAP multimodal embeddings, and valence/arousal mood tags.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          {!isIndexing ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleStart}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles size={13} className="text-[var(--color-accent)]" />
              Re-index library
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={cancelReindex}
              className="flex items-center gap-1.5 text-red-400 hover:text-red-300 border border-red-500/30 cursor-pointer"
            >
              <X size={13} />
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Nuclear-style Live Progress Row */}
      <AnimatePresence>
        {isIndexing && (
          <motion.div
            initial={prefersReduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={prefersReduced ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col gap-2 pt-2 border-t border-[var(--border)]"
          >
            {/* Spinning icon + "Indexed 234/1402 tracks..." */}
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-[var(--text-primary)]">
                <Loader2
                  size={14}
                  className={cn(
                    'text-[var(--color-accent)] shrink-0',
                    !prefersReduced && 'animate-spin',
                  )}
                  aria-hidden="true"
                />
                <span className="font-semibold text-[11px] tracking-tight">
                  Indexed {indexed}/{total || totalTracks} tracks...
                </span>
              </div>
              <span className="text-[10px] text-[var(--color-accent)] font-bold">
                {percent}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-[var(--surface-raised)] rounded-full overflow-hidden border border-[var(--border)]">
              <div
                className="h-full bg-[var(--color-accent)] transition-[width] duration-150 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>

            {currentTrack && (
              <div className="truncate text-[10px] font-mono text-[var(--text-muted)]">
                Processing: {currentTrack}
              </div>
            )}
          </motion.div>
        )}

        {status === 'completed' && !isIndexing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 pt-2 border-t border-[var(--border)] text-xs font-mono text-[var(--color-accent)]"
          >
            <CheckCircle2 size={13} />
            <span>Library successfully indexed ({indexed || totalTracks} tracks). HNSW vector store ready.</span>
          </motion.div>
        )}

        {status === 'canceled' && !isIndexing && (
          <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)] text-xs font-mono text-[var(--text-muted)]">
            <AlertCircle size={13} />
            <span>Indexing canceled. {indexed} tracks indexed.</span>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
