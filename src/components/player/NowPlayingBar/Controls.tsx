/**
 * Sloth Player Controls Component
 * Controls ordering: shuffle / prev / play-pause / next / repeat
 * Animated icon swap play↔pause via Motion layoutId.
 * Active accent color on repeat/shuffle. Respects prefers-reduced-motion.
 */

import { FC } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RepeatMode } from '../types';
import { playerControlVariants } from '../variants';

export interface ControlsProps {
  isPlaying?: boolean;
  onPlayPause?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;

  isShuffle?: boolean;
  onShuffleToggle?: () => void;
  repeatMode?: RepeatMode;
  onRepeatToggle?: () => void;

  disabled?: boolean;
  className?: string;
}

export const Controls: FC<ControlsProps> = ({
  isPlaying = false,
  onPlayPause,
  onNext,
  onPrevious,
  isShuffle = false,
  onShuffleToggle,
  repeatMode = 'off',
  onRepeatToggle,
  disabled = false,
  className,
}) => {
  const shouldReduceMotion = useReducedMotion();

  const getRepeatTitle = () => {
    switch (repeatMode) {
      case 'one':
        return 'Repeat: Track (One)';
      case 'all':
        return 'Repeat: All';
      default:
        return 'Repeat: Off';
    }
  };

  return (
    <div className={cn('flex items-center justify-center gap-2 sm:gap-2.5', className)}>
      {/* 1. Shuffle Button */}
      <motion.button
        type="button"
        disabled={disabled}
        onClick={onShuffleToggle}
        whileTap={shouldReduceMotion || disabled ? undefined : { scale: 0.92 }}
        className={cn(
          playerControlVariants({ size: 'md' }),
          isShuffle
            ? 'text-[var(--color-accent)] bg-[var(--surface-raised)] border border-[var(--color-accent)]/30'
            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
        )}
        title={isShuffle ? 'Shuffle: On' : 'Shuffle: Off'}
        aria-label="Toggle shuffle"
        aria-pressed={isShuffle}
        data-testid="player-shuffle-button"
      >
        <Shuffle size={16} />
      </motion.button>

      {/* 2. Previous Track */}
      <motion.button
        type="button"
        disabled={disabled}
        onClick={onPrevious}
        whileTap={shouldReduceMotion || disabled ? undefined : { scale: 0.92 }}
        className={cn(
          playerControlVariants({ size: 'md' }),
          'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
        )}
        title="Previous track"
        aria-label="Previous track"
        data-testid="player-previous-button"
      >
        <SkipBack size={18} />
      </motion.button>

      {/* 3. Central Play / Pause Button with Motion layoutId */}
      <motion.button
        type="button"
        disabled={disabled}
        onClick={onPlayPause}
        whileTap={shouldReduceMotion || disabled ? undefined : { scale: 0.92 }}
        className={cn(
          'size-9 md:size-10 rounded-[4px] border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-primary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] flex items-center justify-center transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] cursor-pointer select-none shadow-sm'
        )}
        title={isPlaying ? 'Pause' : 'Play'}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        data-testid={isPlaying ? 'player-pause-button' : 'player-play-button'}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isPlaying ? (
            <motion.span
              key="pause"
              layoutId="play-pause-icon"
              initial={shouldReduceMotion ? { opacity: 1 } : { scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="flex items-center justify-center"
            >
              <Pause size={18} fill="currentColor" />
            </motion.span>
          ) : (
            <motion.span
              key="play"
              layoutId="play-pause-icon"
              initial={shouldReduceMotion ? { opacity: 1 } : { scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="flex items-center justify-center ml-0.5"
            >
              <Play size={18} fill="currentColor" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* 4. Next Track */}
      <motion.button
        type="button"
        disabled={disabled}
        onClick={onNext}
        whileTap={shouldReduceMotion || disabled ? undefined : { scale: 0.92 }}
        className={cn(
          playerControlVariants({ size: 'md' }),
          'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
        )}
        title="Next track"
        aria-label="Next track"
        data-testid="player-next-button"
      >
        <SkipForward size={18} />
      </motion.button>

      {/* 5. Repeat Button */}
      <motion.button
        type="button"
        disabled={disabled}
        onClick={onRepeatToggle}
        whileTap={shouldReduceMotion || disabled ? undefined : { scale: 0.92 }}
        className={cn(
          playerControlVariants({ size: 'md' }),
          repeatMode !== 'off'
            ? 'text-[var(--color-accent)] bg-[var(--surface-raised)] border border-[var(--color-accent)]/30'
            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
        )}
        title={getRepeatTitle()}
        aria-label="Toggle repeat mode"
        aria-pressed={repeatMode !== 'off'}
        data-testid="player-repeat-button"
      >
        {repeatMode === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
      </motion.button>
    </div>
  );
};
