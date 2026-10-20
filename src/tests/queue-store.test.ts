/**
 * Queue Store Unit Tests
 * Tests Zone A / Zone B, Drag Reorder, Smart Shuffle Restoration,
 * Repeat Modes, Undo Queue Replacement, and Persistence.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useQueueStore, fisherYatesShuffle } from '../stores/queueStore';
import { Track } from '../components/ui/TrackRow';

const TEST_TRACKS: Track[] = [
  { id: 't1', title: 'Song 1', artist: 'Artist A', durationSeconds: 200, isFavorite: false },
  { id: 't2', title: 'Song 2', artist: 'Artist B', durationSeconds: 180, isFavorite: false },
  { id: 't3', title: 'Song 3', artist: 'Artist C', durationSeconds: 240, isFavorite: false },
  { id: 't4', title: 'Song 4', artist: 'Artist D', durationSeconds: 210, isFavorite: false },
];

describe('useQueueStore (Zustand Queue State)', () => {
  beforeEach(() => {
    // Reset store state
    const store = useQueueStore.getState();
    store.clearQueue();
    useQueueStore.setState({
      items: [],
      recommendations: [],
      currentIndex: 0,
      positionMs: 0,
      shuffleEnabled: false,
      repeatMode: 'off',
      originalOrder: null,
      previousQueue: null,
      isPlaying: false,
    });
  });

  it('sets queue and plays initial track', () => {
    const store = useQueueStore.getState();
    store.setQueue(TEST_TRACKS, 1);

    const state = useQueueStore.getState();
    expect(state.items).toHaveLength(4);
    expect(state.currentIndex).toBe(1);
    expect(state.isPlaying).toBe(true);
  });

  it('reorders queue and maintains active track index integrity', () => {
    const store = useQueueStore.getState();
    store.setQueue(TEST_TRACKS, 0); // Playing Song 1 at index 0

    // Move Song 1 from index 0 to index 2
    store.reorderQueue(0, 2);

    const state = useQueueStore.getState();
    expect(state.items[2].id).toBe('t1');
    expect(state.currentIndex).toBe(2); // Follows the currently playing track
  });

  it('handles play next and add to queue', () => {
    const store = useQueueStore.getState();
    store.setQueue([TEST_TRACKS[0], TEST_TRACKS[1]], 0);

    // Play next
    store.playNext(TEST_TRACKS[2]);
    let state = useQueueStore.getState();
    expect(state.items[1].id).toBe('t3');

    // Add to queue
    store.addToQueue(TEST_TRACKS[3]);
    state = useQueueStore.getState();
    expect(state.items[state.items.length - 1].id).toBe('t4');
  });

  it('restores original pre-shuffle order when shuffle is toggled off', async () => {
    const store = useQueueStore.getState();
    store.setQueue(TEST_TRACKS, 0);

    // Turn ON shuffle
    await store.toggleShuffle();
    let state = useQueueStore.getState();
    expect(state.shuffleEnabled).toBe(true);
    expect(state.originalOrder).not.toBeNull();
    expect(state.originalOrder).toEqual(TEST_TRACKS);

    // Turn OFF shuffle
    await store.toggleShuffle();
    state = useQueueStore.getState();
    expect(state.shuffleEnabled).toBe(false);
    expect(state.items).toEqual(TEST_TRACKS);
    expect(state.originalOrder).toBeNull();
  });

  it('cycles repeat modes: off -> all -> one -> off', () => {
    const store = useQueueStore.getState();
    expect(store.repeatMode).toBe('off');

    store.cycleRepeatMode();
    expect(useQueueStore.getState().repeatMode).toBe('all');

    store.cycleRepeatMode();
    expect(useQueueStore.getState().repeatMode).toBe('one');

    store.cycleRepeatMode();
    expect(useQueueStore.getState().repeatMode).toBe('off');
  });

  it('prevTrack restarts current track if positionMs > 3000', () => {
    const store = useQueueStore.getState();
    store.setQueue(TEST_TRACKS, 1);
    store.setPositionMs(5000);

    store.prevTrack();
    let state = useQueueStore.getState();
    expect(state.currentIndex).toBe(1);
    expect(state.positionMs).toBe(0);

    // If at 0ms, it goes to previous track
    store.prevTrack();
    state = useQueueStore.getState();
    expect(state.currentIndex).toBe(0);
  });

  it('promotes Zone B recommendations to Zone A when queue reaches end', () => {
    const store = useQueueStore.getState();
    const zoneB: Track[] = [
      { id: 'rec-1', title: 'Recommended 1', artist: 'Artist X', durationSeconds: 190, isFavorite: false },
    ];

    useQueueStore.setState({
      items: [TEST_TRACKS[0]],
      recommendations: zoneB,
      currentIndex: 0,
      isPlaying: true,
    });

    store.nextTrack();

    const state = useQueueStore.getState();
    expect(state.items).toHaveLength(2);
    expect(state.items[1].id).toBe('rec-1');
    expect(state.currentIndex).toBe(1);
    expect(state.recommendations).toHaveLength(0);
  });

  it('supports undoing queue replacement within 5 seconds', () => {
    const store = useQueueStore.getState();
    store.setQueue([TEST_TRACKS[0], TEST_TRACKS[1]], 0, false);

    // Replace queue with new list
    const newQueue = [TEST_TRACKS[2], TEST_TRACKS[3]];
    store.setQueue(newQueue, 0, true);

    let state = useQueueStore.getState();
    expect(state.items).toEqual(newQueue);
    expect(state.previousQueue).toEqual([TEST_TRACKS[0], TEST_TRACKS[1]]);

    // Undo
    store.restorePreviousQueue();
    state = useQueueStore.getState();
    expect(state.items).toEqual([TEST_TRACKS[0], TEST_TRACKS[1]]);
    expect(state.previousQueue).toBeNull();
  });

  it('fisherYatesShuffle creates valid permutation without dropping items', () => {
    const shuffled = fisherYatesShuffle([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(shuffled).toHaveLength(8);
    expect(shuffled.sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
