/**
 * Sloth Global Keyboard Shortcuts Hook
 * Provides system-wide hotkeys:
 * - Space: Play / Pause toggle
 * - ArrowLeft / ArrowRight: Seek -5s / +5s (Shift for 15s)
 * - ArrowUp / ArrowDown: Volume +5% / -5%
 * - Ctrl+ArrowLeft / Ctrl+ArrowRight: Previous / Next track
 * - Ctrl+M: Mute / Unmute toggle
 * - Ctrl+L: Toggle Lyrics view
 * - Ctrl+Q: Toggle Queue panel
 * - Ctrl+K: Open Ask Sloth command palette
 * - Ctrl+F: Focus Search input
 * - Ctrl+S: Toggle Shuffle
 * - Ctrl+R: Cycle Repeat mode
 * - Escape: Close active modals / blur inputs
 */

import { useEffect } from 'react';

export interface KeyboardShortcutHandlers {
  onPlayPause?: () => void;
  onSeekRelative?: (deltaSeconds: number) => void;
  onVolumeChangeRelative?: (deltaPercent: number) => void;
  onPreviousTrack?: () => void;
  onNextTrack?: () => void;
  onMuteToggle?: () => void;
  onLyricsToggle?: () => void;
  onQueueToggle?: () => void;
  onAskSlothOpen?: () => void;
  onSearchFocus?: () => void;
  onShuffleToggle?: () => void;
  onRepeatCycle?: () => void;
  onEscape?: () => void;
}

/** Default seek interval in seconds for ArrowLeft / ArrowRight */
export const SHORTCUT_SEEK_STEP_SECONDS = 5;

/** Fast seek interval in seconds when holding Shift */
export const SHORTCUT_SEEK_FAST_SECONDS = 15;

/** Volume adjustment delta percentage for ArrowUp / ArrowDown */
export const SHORTCUT_VOLUME_STEP_PERCENT = 5;

export function createKeyboardShortcutListener(handlers: KeyboardShortcutHandlers) {
  return (e: KeyboardEvent) => {
    // Check if user is typing in an input, textarea, or contentEditable element
    const target = e.target as HTMLElement | null;
    const tagName = (target as any)?.tagName?.toLowerCase?.();
    const isInput =
      tagName === 'input' ||
      tagName === 'textarea' ||
      (typeof HTMLInputElement !== 'undefined' && target instanceof HTMLInputElement) ||
      (typeof HTMLTextAreaElement !== 'undefined' && target instanceof HTMLTextAreaElement) ||
      Boolean(target?.isContentEditable);

    // Handle Escape even if focused on an input
    if (e.key === 'Escape') {
      if (isInput && target) {
        target.blur();
      }
      handlers.onEscape?.();
      return;
    }

    // Ignore other shortcuts when focused in text input (unless Ctrl combo)
    if (isInput && !e.ctrlKey && !e.metaKey) {
      return;
    }

    const ctrlOrMeta = e.ctrlKey || e.metaKey;

    // Space: Play/Pause
    if (e.code === 'Space' && !isInput) {
      e.preventDefault();
      handlers.onPlayPause?.();
      return;
    }

    // Ctrl + ArrowLeft / Right: Previous / Next track
    if (ctrlOrMeta && e.key === 'ArrowLeft') {
      e.preventDefault();
      handlers.onPreviousTrack?.();
      return;
    }
    if (ctrlOrMeta && e.key === 'ArrowRight') {
      e.preventDefault();
      handlers.onNextTrack?.();
      return;
    }

    // ArrowLeft / ArrowRight: Seek
    if (!ctrlOrMeta && e.key === 'ArrowLeft' && !isInput) {
      e.preventDefault();
      const delta = e.shiftKey ? -SHORTCUT_SEEK_FAST_SECONDS : -SHORTCUT_SEEK_STEP_SECONDS;
      handlers.onSeekRelative?.(delta);
      return;
    }
    if (!ctrlOrMeta && e.key === 'ArrowRight' && !isInput) {
      e.preventDefault();
      const delta = e.shiftKey ? SHORTCUT_SEEK_FAST_SECONDS : SHORTCUT_SEEK_STEP_SECONDS;
      handlers.onSeekRelative?.(delta);
      return;
    }

    // ArrowUp / ArrowDown: Volume
    if (!ctrlOrMeta && e.key === 'ArrowUp' && !isInput) {
      e.preventDefault();
      handlers.onVolumeChangeRelative?.(SHORTCUT_VOLUME_STEP_PERCENT);
      return;
    }
    if (!ctrlOrMeta && e.key === 'ArrowDown' && !isInput) {
      e.preventDefault();
      handlers.onVolumeChangeRelative?.(-SHORTCUT_VOLUME_STEP_PERCENT);
      return;
    }

    // Ctrl + M: Mute
    if (ctrlOrMeta && e.key.toLowerCase() === 'm') {
      e.preventDefault();
      handlers.onMuteToggle?.();
      return;
    }

    // Ctrl + L: Lyrics
    if (ctrlOrMeta && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      handlers.onLyricsToggle?.();
      return;
    }

    // Ctrl + Q: Queue
    if (ctrlOrMeta && e.key.toLowerCase() === 'q') {
      e.preventDefault();
      handlers.onQueueToggle?.();
      return;
    }

    // Ctrl + K: Ask Sloth
    if (ctrlOrMeta && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      handlers.onAskSlothOpen?.();
      return;
    }

    // Ctrl + F: Search focus
    if (ctrlOrMeta && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      handlers.onSearchFocus?.();
      const searchInput = document.querySelector<HTMLInputElement>('[data-testid="search-box"]');
      searchInput?.focus();
      return;
    }

    // Ctrl + S: Shuffle
    if (ctrlOrMeta && e.key.toLowerCase() === 's') {
      e.preventDefault();
      handlers.onShuffleToggle?.();
      return;
    }

    // Ctrl + R: Repeat cycle
    if (ctrlOrMeta && e.key.toLowerCase() === 'r') {
      e.preventDefault();
      handlers.onRepeatCycle?.();
      return;
    }
  };
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = createKeyboardShortcutListener(handlers);
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
