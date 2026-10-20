/**
 * Sloth Queue & Playback Store (Zustand)
 * Manages Zone A (Next Up) and Zone B (Recommendations),
 * Drag reordering, double-click playback, smart shuffle restoration,
 * repeat modes, and persistence to user_prefs queue_state.
 */

import { create } from 'zustand';
import { Track } from '@/components/ui/TrackRow';

export type RepeatMode = 'off' | 'all' | 'one';

export interface QueueStateData {
  items: Track[];
  recommendations: Track[];
  currentIndex: number;
  positionMs: number;
  shuffleEnabled: boolean;
  repeatMode: RepeatMode;
  originalOrder: Track[] | null;
  volume: number;
  isMuted: boolean;
}

export interface QueueStore extends QueueStateData {
  isPlaying: boolean;
  isLoadingRecommendations: boolean;
  previousQueue: Track[] | null; // For 5-second undo toast on queue replacement
  undoTimer: NodeJS.Timeout | null;

  // Setters & Actions
  setQueue: (tracks: Track[], startIndex?: number, saveUndo?: boolean) => void;
  playTrack: (track: Track) => Promise<void>;
  playTrackAtIndex: (index: number) => void;
  playNext: (track: Track) => void;
  playTracksNext: (tracks: Track[]) => void;
  addToQueue: (track: Track) => void;
  addTracksToQueue: (tracks: Track[]) => void;
  removeTrack: (trackId: string) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;
  restorePreviousQueue: () => void;

  // Playback Controls
  togglePlayPause: () => void;
  setIsPlaying: (playing: boolean) => void;
  setProgress: (seconds: number) => void;
  setPositionMs: (ms: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => Promise<void>;
  cycleRepeatMode: () => void;
  nextTrack: () => void;
  prevTrack: () => void;

  // Recommendations & Autoplay
  fetchSilentRecommendations: (currentTrack: Track) => Promise<void>;
  promoteRecommendationsToZoneA: () => void;

  // Persistence
  saveState: () => void;
  restoreState: () => void;
}

const STORAGE_KEY = 'sloth:queue_state';

/**
 * Fisher-Yates array shuffle fallback
 */
export function fisherYatesShuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const DEFAULT_STATE: QueueStateData = {
  items: [],
  recommendations: [],
  currentIndex: 0,
  positionMs: 0,
  shuffleEnabled: false,
  repeatMode: 'off',
  originalOrder: null,
  volume: 80,
  isMuted: false,
};

function readSavedState(): QueueStateData {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATE,
      ...parsed,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function persistState(state: QueueStateData) {
  if (typeof window === 'undefined') return;
  try {
    const payload = {
      items: state.items,
      recommendations: state.recommendations,
      currentIndex: state.currentIndex,
      positionMs: state.positionMs,
      shuffleEnabled: state.shuffleEnabled,
      repeatMode: state.repeatMode,
      originalOrder: state.originalOrder,
      volume: state.volume,
      isMuted: state.isMuted,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('Failed to persist queue state:', e);
  }
}

export const useQueueStore = create<QueueStore>((set, get) => {
  const initial = readSavedState();

  return {
    ...initial,
    isPlaying: false,
    isLoadingRecommendations: false,
    previousQueue: null,
    undoTimer: null,

    saveState: () => {
      persistState(get());
    },

    restoreState: () => {
      const saved = readSavedState();
      set({ ...saved });
    },

    setQueue: (tracks: Track[], startIndex = 0, saveUndo = true) => {
      const current = get();

      let timer = current.undoTimer;
      if (timer) clearTimeout(timer);

      let prevQ = current.previousQueue;
      if (saveUndo && current.items.length > 0) {
        prevQ = [...current.items];
        // 5-second undo timer
        timer = setTimeout(() => {
          set({ previousQueue: null, undoTimer: null });
        }, 5000);
      }

      const clampedIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));
      const nextState = {
        items: tracks,
        currentIndex: clampedIndex,
        positionMs: 0,
        isPlaying: tracks.length > 0,
        originalOrder: null,
        previousQueue: prevQ,
        undoTimer: timer,
      };

      set(nextState);
      persistState({ ...get(), ...nextState });

      const playing = tracks[clampedIndex];
      if (playing) {
        get().fetchSilentRecommendations(playing);
      }
    },

    restorePreviousQueue: () => {
      const { previousQueue, undoTimer } = get();
      if (!previousQueue || previousQueue.length === 0) return;
      if (undoTimer) clearTimeout(undoTimer);

      set({
        items: previousQueue,
        currentIndex: 0,
        previousQueue: null,
        undoTimer: null,
      });
      persistState(get());
    },

    playTrack: async (track: Track) => {
      const { items, currentIndex } = get();
      const existingIdx = items.findIndex((t) => t.id === track.id);

      if (existingIdx !== -1) {
        // Track exists in queue: update state to play this index
        const updated = [...items];
        updated[existingIdx] = { ...updated[existingIdx], ...track };
        set({
          items: updated,
          currentIndex: existingIdx,
          isPlaying: true,
          positionMs: 0,
        });
        persistState(get());
      } else {
        // Insert right after current track or append
        const insertAt = items.length === 0 ? 0 : currentIndex + 1;
        const newItems = [...items];
        newItems.splice(insertAt, 0, track);
        set({
          items: newItems,
          currentIndex: insertAt,
          isPlaying: true,
          positionMs: 0,
        });
        persistState(get());
      }

      get().fetchSilentRecommendations(track);
    },

    playTrackAtIndex: (index: number) => {
      const { items } = get();
      if (index < 0 || index >= items.length) return;
      set({
        currentIndex: index,
        isPlaying: true,
        positionMs: 0,
      });
      persistState(get());

      const track = items[index];
      if (track) {
        get().fetchSilentRecommendations(track);
      }
    },

    playNext: (track: Track) => {
      const { items, currentIndex } = get();
      const insertAt = items.length === 0 ? 0 : currentIndex + 1;
      const newItems = [...items.filter((t) => t.id !== track.id)];
      newItems.splice(insertAt, 0, track);
      set({ items: newItems });
      persistState(get());
    },

    playTracksNext: (tracks: Track[]) => {
      if (tracks.length === 0) return;
      const { items, currentIndex } = get();
      const insertAt = items.length === 0 ? 0 : currentIndex + 1;
      const trackIds = new Set(tracks.map((t) => t.id));
      const cleanItems = items.filter((t) => !trackIds.has(t.id));
      cleanItems.splice(insertAt, 0, ...tracks);
      set({ items: cleanItems });
      persistState(get());
    },

    addToQueue: (track: Track) => {
      const { items } = get();
      const without = items.filter((t) => t.id !== track.id);
      set({ items: [...without, track] });
      persistState(get());
    },

    addTracksToQueue: (tracks: Track[]) => {
      if (tracks.length === 0) return;
      const { items } = get();
      const trackIds = new Set(tracks.map((t) => t.id));
      const cleanItems = items.filter((t) => !trackIds.has(t.id));
      set({ items: [...cleanItems, ...tracks] });
      persistState(get());
    },

    removeTrack: (trackId: string) => {
      const { items, currentIndex } = get();
      const targetIdx = items.findIndex((t) => t.id === trackId);
      if (targetIdx === -1) return;

      const newItems = items.filter((t) => t.id !== trackId);
      let nextIndex = currentIndex;
      if (targetIdx < currentIndex) {
        nextIndex = Math.max(0, currentIndex - 1);
      } else if (targetIdx === currentIndex) {
        nextIndex = Math.min(currentIndex, Math.max(0, newItems.length - 1));
      }

      set({
        items: newItems,
        currentIndex: nextIndex,
        isPlaying: newItems.length > 0,
      });
      persistState(get());

      // If fewer than 3 tracks remain in Zone A, fetch Zone B
      if (newItems.length - nextIndex <= 3 && newItems[nextIndex]) {
        get().fetchSilentRecommendations(newItems[nextIndex]);
      }
    },

    reorderQueue: (fromIndex: number, toIndex: number) => {
      const { items, currentIndex } = get();
      if (
        fromIndex < 0 ||
        fromIndex >= items.length ||
        toIndex < 0 ||
        toIndex >= items.length ||
        fromIndex === toIndex
      ) {
        return;
      }

      const updated = [...items];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);

      // Track currently playing track position
      let newCurrentIndex = currentIndex;
      if (fromIndex === currentIndex) {
        newCurrentIndex = toIndex;
      } else if (fromIndex < currentIndex && toIndex >= currentIndex) {
        newCurrentIndex = currentIndex - 1;
      } else if (fromIndex > currentIndex && toIndex <= currentIndex) {
        newCurrentIndex = currentIndex + 1;
      }

      set({ items: updated, currentIndex: newCurrentIndex });
      persistState(get());
    },

    clearQueue: () => {
      const { recommendations } = get();
      // Remove all tracks from Zone A.
      // Zone B auto-repopulates into Zone A immediately if available, or cleared
      if (recommendations.length > 0) {
        set({
          items: [...recommendations],
          recommendations: [],
          currentIndex: 0,
          positionMs: 0,
          isPlaying: true,
        });
      } else {
        set({
          items: [],
          currentIndex: 0,
          positionMs: 0,
          isPlaying: false,
        });
      }
      persistState(get());
    },

    togglePlayPause: () => {
      const { isPlaying, items } = get();
      if (items.length === 0) return;
      set({ isPlaying: !isPlaying });
    },

    setIsPlaying: (playing: boolean) => {
      set({ isPlaying: playing });
    },

    setProgress: (seconds: number) => {
      set({ positionMs: Math.round(seconds * 1000) });
      persistState(get());
    },

    setPositionMs: (ms: number) => {
      set({ positionMs: Math.round(ms) });
      persistState(get());
    },

    setVolume: (volume: number) => {
      const clamped = Math.max(0, Math.min(100, volume));
      set({ volume: clamped, isMuted: false });
      persistState(get());
    },

    toggleMute: () => {
      const { isMuted } = get();
      set({ isMuted: !isMuted });
      persistState(get());
    },

    toggleShuffle: async () => {
      const { shuffleEnabled, items, currentIndex, originalOrder } = get();

      if (shuffleEnabled) {
        // Turn OFF shuffle: restore pre-shuffle original order
        if (originalOrder && originalOrder.length > 0) {
          const currentTrack = items[currentIndex];
          let restoredIndex = originalOrder.findIndex((t) => t.id === currentTrack?.id);
          if (restoredIndex === -1) restoredIndex = 0;

          set({
            shuffleEnabled: false,
            items: originalOrder,
            currentIndex: restoredIndex,
            originalOrder: null,
          });
          persistState(get());
        } else {
          set({ shuffleEnabled: false, originalOrder: null });
          persistState(get());
        }
      } else {
        // Turn ON shuffle:
        // Save full original order before shuffling
        const fullOriginal = [...items];
        const playedTracks = items.slice(0, currentIndex + 1);
        const remainingTracks = items.slice(currentIndex + 1);

        if (remainingTracks.length <= 1) {
          set({ shuffleEnabled: true, originalOrder: fullOriginal });
          persistState(get());
          return;
        }

        // Attempt smart weighted shuffle via FastAPI engine
        let shuffledRemaining: Track[] = [];
        try {
          const res = await fetch('http://127.0.0.1:8001/api/engine/shuffle-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tracks: remainingTracks,
              current_track_id: items[currentIndex]?.id,
            }),
            signal: AbortSignal.timeout(600),
          });

          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.shuffled_tracks) && data.shuffled_tracks.length === remainingTracks.length) {
              shuffledRemaining = data.shuffled_tracks;
            }
          }
        } catch {
          // Engine unavailable or timed out -> Fisher-Yates fallback
          shuffledRemaining = fisherYatesShuffle(remainingTracks);
        }

        if (shuffledRemaining.length === 0) {
          shuffledRemaining = fisherYatesShuffle(remainingTracks);
        }

        const newItems = [...playedTracks, ...shuffledRemaining];
        set({
          shuffleEnabled: true,
          originalOrder: fullOriginal,
          items: newItems,
        });
        persistState(get());
      }
    },

    cycleRepeatMode: () => {
      const modes: RepeatMode[] = ['off', 'all', 'one'];
      const current = get().repeatMode;
      const nextIndex = (modes.indexOf(current) + 1) % modes.length;
      const nextMode = modes[nextIndex];
      set({ repeatMode: nextMode });
      persistState(get());
    },

    nextTrack: () => {
      const { items, currentIndex, repeatMode, recommendations } = get();
      if (items.length === 0) return;

      if (repeatMode === 'one') {
        // Repeat one restarts track
        set({ positionMs: 0, isPlaying: true });
        return;
      }

      if (currentIndex < items.length - 1) {
        const nextIndex = currentIndex + 1;
        set({ currentIndex: nextIndex, positionMs: 0, isPlaying: true });
        persistState(get());

        // Check if fewer than 3 tracks remain in Zone A -> silent fetch Zone B
        if (items.length - nextIndex <= 3 && items[nextIndex]) {
          get().fetchSilentRecommendations(items[nextIndex]);
        }
      } else {
        // Reached end of Zone A
        if (recommendations.length > 0) {
          // Promote Zone B into Zone A seamlessly
          get().promoteRecommendationsToZoneA();
        } else if (repeatMode === 'all') {
          // Loop back to start
          set({ currentIndex: 0, positionMs: 0, isPlaying: true });
          persistState(get());
        } else {
          // End of playback
          set({ isPlaying: false, positionMs: 0 });
          persistState(get());
        }
      }
    },

    prevTrack: () => {
      const { items, currentIndex, positionMs } = get();
      if (items.length === 0) return;

      // If playing past 3 seconds (3000ms), restart current track
      if (positionMs > 3000) {
        set({ positionMs: 0 });
        return;
      }

      if (currentIndex > 0) {
        set({ currentIndex: currentIndex - 1, positionMs: 0, isPlaying: true });
        persistState(get());
      } else {
        set({ positionMs: 0 });
      }
    },

    fetchSilentRecommendations: async (currentTrack: Track) => {
      if (!currentTrack || !currentTrack.title) return;
      set({ isLoadingRecommendations: true });

      try {
        const res = await fetch(
          `http://127.0.0.1:8001/api/engine/recommend/next?title=${encodeURIComponent(
            currentTrack.title
          )}&artist=${encodeURIComponent(currentTrack.artist || '')}&limit=12`,
          { signal: AbortSignal.timeout(1000) }
        );

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.recommendations) && data.recommendations.length > 0) {
            const mapped: Track[] = data.recommendations.map((r: any) => ({
              id: r.id || `rec-${Math.random()}`,
              title: r.title,
              artist: r.artist,
              album: r.album || 'Single',
              durationSeconds: r.durationSeconds || 210,
              coverUrl: r.coverUrl,
              audioUrl: r.audioUrl,
              isFavorite: false,
            }));
            set({ recommendations: mapped, isLoadingRecommendations: false });
            persistState(get());
            return;
          }
        }
      } catch {
        // Silent failure: preserve existing recommendations
      }

      set({ isLoadingRecommendations: false });
    },

    promoteRecommendationsToZoneA: () => {
      const { items, recommendations } = get();
      if (recommendations.length === 0) return;

      const appendItems = [...recommendations];
      const newItems = [...items, ...appendItems];
      const nextIndex = items.length;

      set({
        items: newItems,
        recommendations: [],
        currentIndex: nextIndex,
        positionMs: 0,
        isPlaying: true,
      });
      persistState(get());

      // Trigger next batch of silent recommendations in background
      const newCurrent = newItems[nextIndex];
      if (newCurrent) {
        get().fetchSilentRecommendations(newCurrent);
      }
    },
  };
});
