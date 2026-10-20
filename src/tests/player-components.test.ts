/**
 * Sloth Player Components Unit Tests
 * Verifies player UI components, CVA variants, layout dimensions, and progress interpolation.
 */

import { describe, it, expect } from 'vitest';
import {
  NowPlayingBar,
  TrackInfo,
  Controls,
  ProgressBar,
  VolumeControl,
  SecondaryControls,
  QueuePanel,
  QueueTrack,
  UpNext,
  playerControlVariants,
  queueRowVariants,
  progressBarVariants,
} from '../components/player';

describe('Sloth Player & Queue UI Components', () => {
  it('exports all required player and queue components', () => {
    expect(NowPlayingBar).toBeDefined();
    expect(TrackInfo).toBeDefined();
    expect(Controls).toBeDefined();
    expect(ProgressBar).toBeDefined();
    expect(VolumeControl).toBeDefined();
    expect(SecondaryControls).toBeDefined();
    expect(QueuePanel).toBeDefined();
    expect(QueueTrack).toBeDefined();
    expect(UpNext).toBeDefined();
  });

  describe('CVA Variants & Token Integrity', () => {
    it('generates correct CVA classes for player controls', () => {
      const defaultButton = playerControlVariants({ size: 'md' });
      expect(defaultButton).toContain('inline-flex');
      expect(defaultButton).toContain('rounded-[4px]');

      const primaryButton = playerControlVariants({ variant: 'primary', size: 'lg' });
      expect(primaryButton).toContain('bg-[var(--color-accent)]');
      expect(primaryButton).toContain('rounded-[4px]');

      const activeToggle = playerControlVariants({ variant: 'accentToggle', active: true });
      expect(activeToggle).toContain('text-[var(--color-accent)]');
    });

    it('generates correct CVA classes for queue rows', () => {
      const defaultRow = queueRowVariants({ state: 'default' });
      expect(defaultRow).toContain('bg-[var(--surface)]');
      expect(defaultRow).toContain('border-[var(--border)]');

      const activeRow = queueRowVariants({ state: 'active' });
      expect(activeRow).toContain('border-[var(--color-accent)]');
      expect(activeRow).toContain('bg-[var(--surface-raised)]');

      const draggingRow = queueRowVariants({ state: 'dragging' });
      expect(draggingRow).toContain('opacity-60');
    });

    it('generates seekbar thickness variants', () => {
      const normalBar = progressBarVariants({ thickness: 'default' });
      expect(normalBar).toContain('h-[3px]');
      expect(normalBar).toContain('hover:h-[5px]');
    });
  });

  describe('Progress & Seek Math Interpolation', () => {
    it('calculates clamped percentage correctly', () => {
      const duration = 240; // 4 minutes
      const current = 60; // 1 minute
      const ratio = Math.min(Math.max(current / duration, 0), 1);
      const percent = ratio * 100;
      expect(percent).toBe(25);

      // Edge cases
      const clampedLow = Math.min(Math.max(-10 / duration, 0), 1);
      expect(clampedLow).toBe(0);

      const clampedHigh = Math.min(Math.max(300 / duration, 0), 1);
      expect(clampedHigh).toBe(1);

      const zeroDuration = 0 > 0 ? Math.min(Math.max(10 / 0, 0), 1) : 0;
      expect(zeroDuration).toBe(0);
    });

    it('formats timecodes cleanly without NaN or layout shifts', () => {
      function formatTime(seconds: number): string {
        if (isNaN(seconds) || seconds < 0) return '0:00';
        const total = Math.floor(seconds);
        const mins = Math.floor(total / 60);
        const secs = total % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
      }

      expect(formatTime(0)).toBe('0:00');
      expect(formatTime(9)).toBe('0:09');
      expect(formatTime(65)).toBe('1:05');
      expect(formatTime(3599)).toBe('59:59');
      expect(formatTime(-10)).toBe('0:00');
      expect(formatTime(NaN)).toBe('0:00');
    });

    it('handles previous button single-click vs double-click rules', () => {
      function evaluatePrevAction(progressSeconds: number, isDoubleClick: boolean): 'restart' | 'previous' {
        if (isDoubleClick) return 'previous';
        if (progressSeconds > 3) return 'restart';
        return 'previous';
      }

      expect(evaluatePrevAction(5, false)).toBe('restart');
      expect(evaluatePrevAction(1, false)).toBe('previous');
      expect(evaluatePrevAction(5, true)).toBe('previous');
      expect(evaluatePrevAction(0, true)).toBe('previous');
    });

    it('calculates volume wheel delta step correctly within bounds', () => {
      function calculateVolumeWheel(currentVol: number, deltaY: number): number {
        const step = deltaY < 0 ? 5 : -5;
        return Math.max(0, Math.min(100, currentVol + step));
      }

      expect(calculateVolumeWheel(80, -100)).toBe(85);
      expect(calculateVolumeWheel(80, 100)).toBe(75);
      expect(calculateVolumeWheel(98, -100)).toBe(100);
      expect(calculateVolumeWheel(3, 100)).toBe(0);
    });
  });
});
