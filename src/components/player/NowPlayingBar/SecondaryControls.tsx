/**
 * Sloth SecondaryControls Component
 * Controls for Queue panel toggle, lyrics overlay toggle, and visualizer dots toggle.
 */

import { FC } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ListMusic, Mic2, Sliders } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playerControlVariants } from '../variants';
import { ListenTogetherBar } from '@/features/listen-together';

export interface SecondaryControlsProps {
  isQueueOpen?: boolean;
  onQueueToggle?: () => void;
  isLyricsOpen?: boolean;
  onLyricsToggle?: () => void;
  isVisualizerOpen?: boolean;
  onVisualizerToggle?: () => void;
  disabled?: boolean;
  className?: string;
}

export const SecondaryControls: FC<SecondaryControlsProps> = ({
  isQueueOpen = false,
  onQueueToggle,
  isLyricsOpen = false,
  onLyricsToggle,
  isVisualizerOpen = false,
  onVisualizerToggle,
  disabled = false,
  className,
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className={cn('flex items-center gap-1 sm:gap-1.5', className)}>
      {/* 1. Lyrics Toggle Button */}
      {onLyricsToggle && (
        <motion.button
          type="button"
          disabled={disabled}
          onClick={onLyricsToggle}
          whileTap={shouldReduceMotion || disabled ? undefined : { scale: 0.92 }}
          className={cn(
            playerControlVariants({ size: 'sm' }),
            isLyricsOpen
              ? 'text-[var(--color-accent)] bg-[var(--surface-raised)] border border-[var(--color-accent)]/30'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
          )}
          title={isLyricsOpen ? 'Close lyrics' : 'Open lyrics'}
          aria-label="Toggle lyrics"
          aria-pressed={isLyricsOpen}
          data-testid="player-lyrics-toggle"
        >
          <Mic2 size={16} />
        </motion.button>
      )}

      {/* 2. Visualizer Dots Toggle Button */}
      {onVisualizerToggle && (
        <motion.button
          type="button"
          disabled={disabled}
          onClick={onVisualizerToggle}
          whileTap={shouldReduceMotion || disabled ? undefined : { scale: 0.92 }}
          className={cn(
            playerControlVariants({ size: 'sm' }),
            isVisualizerOpen
              ? 'text-[var(--color-accent)] bg-[var(--surface-raised)] border border-[var(--color-accent)]/30'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
          )}
          title={isVisualizerOpen ? 'Disable visualizer' : 'Enable visualizer'}
          aria-label="Toggle audio visualizer"
          aria-pressed={isVisualizerOpen}
          data-testid="player-visualizer-toggle"
        >
          <Sliders size={16} />
        </motion.button>
      )}

      {/* 3. Listen Together Live Indicator & Drawer */}
      <ListenTogetherBar />

      {/* 4. Queue Drawer Toggle Button */}
      {onQueueToggle && (
        <motion.button
          type="button"
          disabled={disabled}
          onClick={onQueueToggle}
          whileTap={shouldReduceMotion || disabled ? undefined : { scale: 0.92 }}
          className={cn(
            playerControlVariants({ size: 'sm' }),
            isQueueOpen
              ? 'text-[var(--color-accent)] bg-[var(--surface-raised)] border border-[var(--color-accent)]/30'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
          )}
          title={isQueueOpen ? 'Close play queue' : 'Open play queue'}
          aria-label="Toggle play queue"
          aria-pressed={isQueueOpen}
          data-testid="player-queue-toggle"
        >
          <ListMusic size={16} />
        </motion.button>
      )}
    </div>
  );
};
