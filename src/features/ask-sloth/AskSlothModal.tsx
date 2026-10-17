/**
 * AskSlothModal.tsx — Nuclear-style Command Palette (Cmd+K / Ctrl+K)
 *
 * Design Architecture:
 * - Flat dark panel with 4px border radius (NO rounded-xl, NO blurred backdrop)
 * - Solid offset borders with OKLCH tokens (Surface: #282d33, Border: #31383f)
 * - Top border accent: 2px solid --color-accent
 * - Full-width input at top, interpretation text in --color-text-secondary
 * - Result rows: standard TrackRow component
 * - Accessible keyboard navigation (Arrow Up/Down, Enter to play, Esc to close)
 * - Motion animations strictly from "motion/react" respecting prefers-reduced-motion
 * - Awwwards UI standard score >= 88/100
 */

import { FC, useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Sparkles, X, CornerDownLeft, Loader2, Cpu } from 'lucide-react';
import { TrackRow, Track, Badge } from '@/components/ui';
import {
  AskSlothTrackResult,
  AskSlothParsedQuery,
  resultToUITrack,
} from './types';
import { QUICK_PROMPT_SUGGESTIONS } from './useAskSloth';

export interface AskSlothModalProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (q: string) => void;
  isLoading: boolean;
  results: AskSlothTrackResult[];
  interpretation?: string;
  parsedQuery?: AskSlothParsedQuery | null;
  elapsedMs?: number;
  selectedIndex: number;
  onSelectIndex: (idx: number) => void;
  onPlayTrack?: (track: Track) => void;
  currentTrackId?: string;
  isPlaying?: boolean;
}

export const AskSlothModal: FC<AskSlothModalProps> = ({
  isOpen,
  onClose,
  query,
  onQueryChange,
  isLoading,
  results,
  interpretation,
  parsedQuery,
  elapsedMs = 0,
  selectedIndex,
  onSelectIndex,
  onPlayTrack,
  currentTrackId,
  isPlaying = false,
}) => {
  const prefersReduced = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input automatically on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Handle keyboard list navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleListKeyDown = (e: KeyboardEvent) => {
      if (results.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        onSelectIndex((selectedIndex + 1) % results.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        onSelectIndex((selectedIndex - 1 + results.length) % results.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = results[selectedIndex];
        if (selected && onPlayTrack) {
          onPlayTrack(resultToUITrack(selected));
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleListKeyDown);
    return () => window.removeEventListener('keydown', handleListKeyDown);
  }, [isOpen, results, selectedIndex, onSelectIndex, onPlayTrack, onClose]);

  // Keep selected row in view
  useEffect(() => {
    if (listRef.current && results.length > 0) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement | undefined;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, results.length]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Ask Sloth Command Palette"
          data-testid="ask-sloth-modal"
          className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 select-none"
        >
          {/* Backdrop: Solid dark flat overlay without blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReduced ? 0 : 0.12 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80"
          />

          {/* Modal Panel: Flat dark panel with 4px border radius and top accent border */}
          <motion.div
            initial={
              prefersReduced
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.98, y: -8 }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              prefersReduced
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.98, y: -6 }
            }
            transition={{
              type: 'spring',
              stiffness: 420,
              damping: 28,
            }}
            className="relative z-10 w-full max-w-2xl bg-[var(--surface)] border border-[var(--border)] border-t-2 border-t-[var(--color-accent)] rounded-[4px] shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
          >
            {/* Top Bar: Search Input */}
            <div className="flex items-center gap-3 px-4 py-3 bg-[var(--surface)]">
              <div className="flex items-center justify-center text-[var(--color-accent)] shrink-0">
                <Sparkles size={18} />
              </div>
              <input
                ref={inputRef}
                type="text"
                data-testid="ask-sloth-input"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Ask Sloth... (e.g. 'rainy late night jazz' or '140 bpm synthwave')"
                className="flex-1 bg-transparent text-sm md:text-base font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none min-w-0"
              />
              {isLoading && (
                <Loader2
                  size={16}
                  className="animate-spin text-[var(--color-accent)] shrink-0"
                  data-testid="ask-sloth-loading-spinner"
                />
              )}
              {query && !isLoading && (
                <button
                  type="button"
                  onClick={() => onQueryChange('')}
                  className="text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer p-0.5"
                  title="Clear input"
                >
                  <X size={14} />
                </button>
              )}
              <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-[var(--border)]/60 text-[10px] font-mono text-[var(--text-muted)]">
                <kbd className="px-1.5 py-0.5 bg-[var(--surface-raised)] border border-[var(--border)] rounded-[3px] text-[var(--text-secondary)]">
                  ESC
                </kbd>
                <span>close</span>
              </div>
            </div>

            {/* Interpretation Banner */}
            {interpretation && (
              <div
                data-testid="ask-sloth-interpretation"
                className="px-4 py-2 bg-[var(--surface-raised)]/50 border-t border-b border-[var(--border)]/60 text-xs text-[var(--text-secondary)] font-mono flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2 min-w-0 truncate">
                  <span className="size-1.5 rounded-full bg-[var(--color-accent)] shrink-0" />
                  <span className="truncate">{interpretation}</span>
                </div>
                {parsedQuery?.filters && (parsedQuery.filters.bpm_min || parsedQuery.filters.bpm_max) && (
                  <Badge variant="pill" color="secondary" className="shrink-0 text-[10px] font-mono">
                    {parsedQuery.filters.bpm_min ? `≥${parsedQuery.filters.bpm_min}` : ''}
                    {parsedQuery.filters.bpm_min && parsedQuery.filters.bpm_max ? '-' : ''}
                    {parsedQuery.filters.bpm_max ? `≤${parsedQuery.filters.bpm_max}` : ''} BPM
                  </Badge>
                )}
              </div>
            )}

            {/* Quick Suggestion Pills (when input is empty or fresh) */}
            {!query && (
              <div className="p-4 space-y-2 border-t border-[var(--border)]/40 bg-[var(--background)]/40">
                <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                  Suggested Prompts
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PROMPT_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => onQueryChange(suggestion)}
                      className="px-2.5 py-1 text-xs font-medium rounded-[3px] bg-[var(--surface-raised)] hover:bg-[var(--surface-raised)]/80 border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--color-accent)]/50 transition-colors cursor-pointer text-left"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Results List */}
            <div
              ref={listRef}
              data-testid="ask-sloth-results-list"
              className="flex-1 min-h-0 overflow-y-auto max-h-[50vh] divide-y divide-[var(--border)]/40 bg-[var(--background)]"
            >
              {isLoading && results.length === 0 && (
                <div className="p-6 space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-12 w-full bg-[var(--surface-raised)]/40 animate-pulse rounded-[3px] border border-[var(--border)]/30"
                    />
                  ))}
                </div>
              )}

              {!isLoading && query && results.length === 0 && (
                <div className="p-8 text-center text-xs text-[var(--text-muted)] space-y-1">
                  <p>No matching tracks found for &quot;{query}&quot;.</p>
                  <p className="text-[11px]">Try searching by mood, acoustic tempo, or artist style.</p>
                </div>
              )}

              {results.map((item, idx) => {
                const uiTrack = resultToUITrack(item);
                const isSelected = idx === selectedIndex;
                const isItemPlaying = isPlaying && currentTrackId === item.track_id;

                return (
                  <div
                    key={item.track_id}
                    onMouseEnter={() => onSelectIndex(idx)}
                    className={`relative transition-colors ${
                      isSelected ? 'bg-[var(--surface-raised)]/90 ring-1 ring-inset ring-[var(--color-accent)]/40' : ''
                    }`}
                  >
                    <TrackRow
                      track={uiTrack}
                      index={idx + 1}
                      isPlaying={isItemPlaying}
                      isCurrent={currentTrackId === item.track_id}
                      onPlay={() => {
                        onPlayTrack?.(uiTrack);
                        onClose();
                      }}
                      className="border-none"
                    />
                  </div>
                );
              })}
            </div>

            {/* Bottom Status & Keycap Guide Bar */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--border)] bg-[var(--surface)] text-[11px] font-mono text-[var(--text-muted)]">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                  <Cpu size={12} className="text-[var(--color-accent)]" />
                  <span>CLAP + Gated Fusion</span>
                </span>
                {results.length > 0 && (
                  <>
                    <span>•</span>
                    <span>{results.length} results</span>
                    {elapsedMs > 0 && <span>({elapsedMs}ms)</span>}
                  </>
                )}
              </div>

              <div className="hidden sm:flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.2 bg-[var(--surface-raised)] border border-[var(--border)] rounded text-[10px]">
                    ↑↓
                  </kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.2 bg-[var(--surface-raised)] border border-[var(--border)] rounded text-[10px] flex items-center">
                    <CornerDownLeft size={10} />
                  </kbd>
                  play
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
