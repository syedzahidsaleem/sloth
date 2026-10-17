/**
 * Sloth ProgressBar Component
 * Thin (3px) seekable progress bar with real-time scrub using useMotionValue.
 * Hover timestamp overlay (elapsed / total). Flat line, no waveform.
 */

import {
  FC,
  useState,
  useRef,
  useCallback,
  useEffect,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { motion, useMotionValue, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';
import { progressBarVariants } from '../variants';

export interface ProgressBarProps {
  progressSeconds?: number;
  totalDurationSeconds?: number;
  onSeek?: (seconds: number) => void;
  isLoading?: boolean;
  className?: string;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const ProgressBar: FC<ProgressBarProps> = ({
  progressSeconds = 0,
  totalDurationSeconds = 0,
  onSeek,
  isLoading = false,
  className,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);

  const duration = Math.max(0, totalDurationSeconds);
  const progressRatio = duration > 0 ? Math.min(Math.max(progressSeconds / duration, 0), 1) : 0;
  const currentPercent = progressRatio * 100;

  // Real-time MotionValue for scrubbing without React re-render lag
  const scrubPercent = useMotionValue(currentPercent);

  useEffect(() => {
    if (!isDragging) {
      scrubPercent.set(currentPercent);
    }
  }, [currentPercent, isDragging, scrubPercent]);

  // Compute seek ratio from pointer X position
  const computeSeekRatio = useCallback((clientX: number): number => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    const relX = clientX - rect.left;
    return Math.min(Math.max(relX / rect.width, 0), 1);
  }, []);

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (isLoading || !onSeek || duration <= 0) return;
    e.preventDefault();
    setIsDragging(true);

    const ratio = computeSeekRatio(e.clientX);
    scrubPercent.set(ratio * 100);

    const onPointerMove = (moveEvent: PointerEvent) => {
      const moveRatio = computeSeekRatio(moveEvent.clientX);
      scrubPercent.set(moveRatio * 100);
      setHoverPosition(moveRatio * 100);
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      setIsDragging(false);

      const finalRatio = computeSeekRatio(upEvent.clientX);
      scrubPercent.set(finalRatio * 100);
      onSeek(finalRatio * duration);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const ratio = computeSeekRatio(e.clientX);
    setHoverPosition(ratio * 100);
  };

  const hoverTimeSeconds = hoverPosition !== null ? (hoverPosition / 100) * duration : 0;

  return (
    <div
      className={cn(progressBarVariants(), 'group relative select-none', className)}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => {
        setIsHovered(false);
        setHoverPosition(null);
      }}
      onPointerMove={handlePointerMove}
      data-testid="player-seek-bar-container"
    >
      {/* 3px Interactive Seek Track */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        className={cn(
          'relative w-full cursor-pointer bg-[var(--border)] transition-[height] duration-150',
          isHovered || isDragging ? 'h-[5px]' : 'h-[3px]',
          isLoading ? 'pointer-events-none opacity-50' : ''
        )}
        role="slider"
        aria-label="Track progress"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={progressSeconds}
        aria-valuetext={`${formatTime(progressSeconds)} of ${formatTime(duration)}`}
      >
        {/* Background track */}
        <div className="absolute inset-0 bg-[var(--border)]" />

        {/* Buffered / Fill Progress Line */}
        <motion.div
          className="absolute inset-y-0 left-0 bg-[var(--color-accent)] origin-left"
          style={{ width: `${isDragging ? scrubPercent.get() : currentPercent}%` }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.05, ease: 'linear' }}
          data-testid="player-progress-fill"
        />

        {/* Hover ghost position */}
        {isHovered && hoverPosition !== null && !isDragging && (
          <div
            className="absolute inset-y-0 left-0 bg-[var(--color-accent)]/20 pointer-events-none"
            style={{ width: `${hoverPosition}%` }}
          />
        )}

        {/* Scrubber thumb handle on hover or drag */}
        {(isHovered || isDragging) && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-3 rounded-full bg-[var(--color-accent)] border border-white shadow-sm pointer-events-none"
            style={{ left: `${isDragging ? scrubPercent.get() : currentPercent}%` }}
          />
        )}
      </div>

      {/* Hover Time Overlay — shows elapsed / total on hover */}
      {(isHovered || isDragging) && hoverPosition !== null && (
        <div
          className="absolute -top-7 -translate-x-1/2 px-1.5 py-0.5 rounded-[3px] bg-[var(--surface-raised)] border border-[var(--border)] text-[10px] font-mono text-[var(--text-primary)] pointer-events-none shadow-md whitespace-nowrap z-30"
          style={{ left: `${hoverPosition}%` }}
        >
          <span>{formatTime(hoverTimeSeconds)}</span>
          <span className="text-[var(--text-muted)] mx-1">/</span>
          <span className="text-[var(--text-secondary)]">{formatTime(duration)}</span>
        </div>
      )}
    </div>
  );
};
