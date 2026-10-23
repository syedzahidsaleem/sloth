import { describe, it, expect, beforeEach } from 'vitest';
import { useQueueStore } from '../stores/queueStore';
import { useToastStore } from '../stores/toastStore';

describe('Track Selection Logic (Step 15)', () => {
  beforeEach(() => {
    useQueueStore.getState().clearQueue();
    useToastStore.getState().clearToasts();
  });

  it('replaces queue and triggers 5-second undo toast when saveUndo is true', () => {
    const trackA = {
      id: 'a',
      title: 'Track A',
      artist: 'Artist A',
      durationSeconds: 200,
    };
    const trackB = {
      id: 'b',
      title: 'Track B',
      artist: 'Artist B',
      durationSeconds: 220,
    };
    const trackC = {
      id: 'c',
      title: 'Track C',
      artist: 'Artist C',
      durationSeconds: 240,
    };

    // Initially queue has track A
    useQueueStore.getState().setQueue([trackA], 0, false);
    expect(useQueueStore.getState().items).toHaveLength(1);

    // Replace queue with full album (tracks B & C) starting at index 1
    useQueueStore.getState().setQueue([trackB, trackC], 1, true);

    const state = useQueueStore.getState();
    expect(state.items).toHaveLength(2);
    expect(state.currentIndex).toBe(1);
    expect(state.items[state.currentIndex].id).toBe('c');
    expect(state.previousQueue).toEqual([trackA]);

    // Check that undo toast was created
    const toasts = useToastStore.getState().toasts;
    const undoToast = toasts.find((t) => t.type === 'undo');
    expect(undoToast).toBeDefined();
    expect(undoToast?.title).toContain('Queue replaced');
    expect(undoToast?.actionLabel).toBe('Undo');

    // Trigger undo action
    undoToast?.onAction?.();

    // Verify queue is restored
    const restored = useQueueStore.getState();
    expect(restored.items).toHaveLength(1);
    expect(restored.items[0].id).toBe('a');
  });

  it('appends tracks to queue without replacing existing queue', () => {
    const trackA = {
      id: 'a',
      title: 'Track A',
      artist: 'Artist A',
      durationSeconds: 200,
    };
    const trackB = {
      id: 'b',
      title: 'Track B',
      artist: 'Artist B',
      durationSeconds: 220,
    };

    useQueueStore.getState().setQueue([trackA], 0, false);
    expect(useQueueStore.getState().items).toHaveLength(1);

    useQueueStore.getState().addToQueue(trackB);
    const state = useQueueStore.getState();
    expect(state.items).toHaveLength(2);
    expect(state.items[0].id).toBe('a');
    expect(state.items[1].id).toBe('b');
  });
});
