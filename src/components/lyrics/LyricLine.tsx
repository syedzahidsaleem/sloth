/**
 * Sloth LyricLine Component
 * Ported from Nuclear's lyrics display architecture and enhanced with Motion.
 *
 * Rules:
 * - Current line: color --color-accent, scale 1.04
 * - Next line: opacity 0.5
 * - Previous lines: opacity 0.25
 * - Word highlight: animate color word by word in karaoke mode
 * - All animations via "motion/react"
 * - prefers-reduced-motion: instant switch with 0ms transition and scale 1.0
 */

import React, { useMemo } from 'react';
import { motion, useReducedMotion, Variants } from 'motion/react';
import { SyncedLyricsLine } from '@/lyrics/parser';

export type LyricLineState = 'current' | 'previous' | 'next' | 'idle';

export interface LyricLineProps {
  line: SyncedLyricsLine;
  state: LyricLineState;
  karaokeMode?: boolean;
  currentPositionMs: number;
  lineDurationMs?: number;
  onSeek?: (timeMs: number) => void;
  className?: string;
}

export const LyricLine = React.forwardRef<HTMLDivElement, LyricLineProps>(
  (
    {
      line,
      state,
      karaokeMode = true,
      currentPositionMs,
      lineDurationMs = 3500,
      onSeek,
      className = '',
    },
    ref
  ) => {
    const prefersReducedMotion = useReducedMotion();
    const isCurrent = state === 'current';
    const isNext = state === 'next';
    const isPrevious = state === 'previous';

    // Word tokens for karaoke word-by-word animation
    const words = useMemo(() => {
      if (line.words && line.words.length > 0) {
        return line.words;
      }

      // Synthesize proportional word timings across line duration if no syllable tags
      const rawWords = line.text.trim().split(/\s+/).filter(Boolean);
      if (rawWords.length === 0) return [];

      const totalWords = rawWords.length;
      const wordSlice = lineDurationMs / totalWords;

      return rawWords.map((w, idx) => ({
        word: w,
        startMs: line.timeMs + idx * wordSlice,
        endMs: line.timeMs + (idx + 1) * wordSlice,
      }));
    }, [line.text, line.timeMs, line.words, lineDurationMs]);

    // Motion animation variants respecting prefers-reduced-motion
    const lineVariants: Variants = {
      current: {
        scale: prefersReducedMotion ? 1 : 1.04,
        opacity: 1,
        y: 0,
        transition: prefersReducedMotion
          ? { duration: 0 }
          : { type: 'spring' as const, stiffness: 350, damping: 28 },
      },
      next: {
        scale: 1,
        opacity: 0.5,
        y: 0,
        transition: prefersReducedMotion ? { duration: 0 } : { duration: 0.2 },
      },
      previous: {
        scale: 1,
        opacity: 0.25,
        y: 0,
        transition: prefersReducedMotion ? { duration: 0 } : { duration: 0.2 },
      },
      idle: {
        scale: 1,
        opacity: 0.2,
        y: 0,
        transition: prefersReducedMotion ? { duration: 0 } : { duration: 0.2 },
      },
    };

    const handleClick = () => {
      if (onSeek) {
        onSeek(line.timeMs);
      }
    };

    return (
      <motion.div
        ref={ref}
        variants={lineVariants}
        animate={state}
        initial={false}
        onClick={handleClick}
        className={`group relative w-full max-w-2xl py-3 px-4 rounded-[6px] text-center cursor-pointer transition-colors duration-150 select-none ${
          isCurrent
            ? 'text-[var(--color-accent)] font-extrabold tracking-tight text-xl sm:text-2xl md:text-3xl'
            : isNext
            ? 'text-[var(--text-secondary)] font-semibold text-lg sm:text-xl md:text-2xl hover:opacity-80'
            : isPrevious
            ? 'text-[var(--text-muted)] font-medium text-base sm:text-lg md:text-xl hover:opacity-60'
            : 'text-[var(--text-muted)]/70 font-normal text-sm sm:text-base md:text-lg hover:opacity-50'
        } ${className}`}
        style={{ transformOrigin: 'center center' }}
      >
        {karaokeMode && isCurrent && words.length > 0 ? (
          <span className="inline-flex flex-wrap justify-center gap-x-2 gap-y-1">
            {words.map((w, idx) => {
              const isWordPassed = currentPositionMs >= w.startMs;
              const isWordActive =
                currentPositionMs >= w.startMs &&
                (!w.endMs || currentPositionMs < w.endMs);

              return (
                <span
                  key={idx}
                  className={`transition-all duration-150 inline-block ${
                    isWordActive
                      ? 'text-[var(--color-accent)] font-extrabold brightness-125 drop-shadow-[0_0_8px_var(--color-accent)]'
                      : isWordPassed
                      ? 'text-[var(--color-accent)] font-bold'
                      : 'text-[var(--text-secondary)] opacity-60 font-medium'
                  }`}
                >
                  {w.word}
                </span>
              );
            })}
          </span>
        ) : (
          <span className="inline-block transition-colors">{line.text}</span>
        )}
      </motion.div>
    );
  }
);

LyricLine.displayName = 'LyricLine';
