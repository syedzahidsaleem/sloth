/**
 * Sloth Playlist Store (Zustand)
 * Manages full Playlist CRUD, track additions/removals with 5-second undo toast,
 * inline editing of title/description, track reordering, mosaic cover generation,
 * and persistent storage.
 */

import { create } from 'zustand';
import { Track } from '@/components/ui/TrackRow';
import { toast } from './toastStore';

export interface SlothPlaylist {
  id: string;
  name: string;
  description?: string;
  trackIds: string[];
  tracks?: Track[];
  thumbnails: string[];
  createdAt: number;
  updatedAt: number;
}

export interface PlaylistStore {
  playlists: SlothPlaylist[];
  activePlaylistId: string | null;

  // Actions
  createPlaylist: (name: string, description?: string, initialTracks?: Track[]) => SlothPlaylist;
  updatePlaylist: (id: string, updates: Partial<Pick<SlothPlaylist, 'name' | 'description'>>) => void;
  deletePlaylist: (id: string) => void;
  addTrackToPlaylist: (playlistId: string, track: Track) => boolean;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  reorderTracks: (playlistId: string, fromIndex: number, toIndex: number) => void;
  setActivePlaylistId: (id: string | null) => void;
  getPlaylistById: (id: string) => SlothPlaylist | undefined;
}

const PLAYLISTS_STORAGE_KEY = 'sloth:playlists';

function extractThumbnails(tracks?: Track[]): string[] {
  if (!tracks || tracks.length === 0) return [];
  const covers = tracks.map((t) => t.coverUrl).filter(Boolean) as string[];
  return Array.from(new Set(covers)).slice(0, 4);
}

function loadSavedPlaylists(): SlothPlaylist[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PLAYLISTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistPlaylists(playlists: SlothPlaylist[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(playlists));
  } catch (err) {
    console.warn('Failed to persist playlists:', err);
  }
}

export const usePlaylistStore = create<PlaylistStore>((set, get) => ({
  playlists: loadSavedPlaylists(),
  activePlaylistId: null,

  createPlaylist: (name, description = '', initialTracks = []) => {
    const id = `pl-${Date.now()}`;
    const newPlaylist: SlothPlaylist = {
      id,
      name: name.trim(),
      description: description.trim(),
      trackIds: initialTracks.map((t) => t.id),
      tracks: initialTracks,
      thumbnails: extractThumbnails(initialTracks),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const next = [newPlaylist, ...get().playlists];
    set({ playlists: next });
    persistPlaylists(next);
    toast.success('Created playlist', newPlaylist.name);
    return newPlaylist;
  },

  updatePlaylist: (id, updates) => {
    const next = get().playlists.map((pl) => {
      if (pl.id !== id) return pl;
      return {
        ...pl,
        ...updates,
        updatedAt: Date.now(),
      };
    });
    set({ playlists: next });
    persistPlaylists(next);
    toast.info('Playlist updated');
  },

  deletePlaylist: (id) => {
    const target = get().playlists.find((p) => p.id === id);
    const next = get().playlists.filter((p) => p.id !== id);
    set({ playlists: next });
    persistPlaylists(next);
    if (target) {
      toast.info('Deleted playlist', target.name);
    }
  },

  addTrackToPlaylist: (playlistId, track) => {
    const target = get().playlists.find((p) => p.id === playlistId);
    if (!target) return false;

    if (target.trackIds.includes(track.id)) {
      toast.info('Track already in playlist', track.title);
      return false;
    }

    const updatedTracks = [...(target.tracks || []), track];
    const next = get().playlists.map((pl) => {
      if (pl.id !== playlistId) return pl;
      return {
        ...pl,
        trackIds: [...pl.trackIds, track.id],
        tracks: updatedTracks,
        thumbnails: extractThumbnails(updatedTracks),
        updatedAt: Date.now(),
      };
    });

    set({ playlists: next });
    persistPlaylists(next);
    toast.success(`Added to ${target.name}`, track.title);
    return true;
  },

  removeTrackFromPlaylist: (playlistId, trackId) => {
    const target = get().playlists.find((p) => p.id === playlistId);
    if (!target) return;

    const removedTrack = target.tracks?.find((t) => t.id === trackId);
    const removedIndex = target.trackIds.indexOf(trackId);

    const updatedTrackIds = target.trackIds.filter((id) => id !== trackId);
    const updatedTracks = target.tracks?.filter((t) => t.id !== trackId) || [];

    const next = get().playlists.map((pl) => {
      if (pl.id !== playlistId) return pl;
      return {
        ...pl,
        trackIds: updatedTrackIds,
        tracks: updatedTracks,
        thumbnails: extractThumbnails(updatedTracks),
        updatedAt: Date.now(),
      };
    });

    set({ playlists: next });
    persistPlaylists(next);

    // 5-second undo toast
    if (removedTrack && removedIndex !== -1) {
      toast.undo(`Removed ${removedTrack.title}`, () => {
        // Undo removal
        const currentTarget = get().playlists.find((p) => p.id === playlistId);
        if (!currentTarget) return;

        const restoredTrackIds = [...currentTarget.trackIds];
        restoredTrackIds.splice(removedIndex, 0, removedTrack.id);

        const restoredTracks = [...(currentTarget.tracks || [])];
        restoredTracks.splice(removedIndex, 0, removedTrack);

        const restoredNext = get().playlists.map((pl) => {
          if (pl.id !== playlistId) return pl;
          return {
            ...pl,
            trackIds: restoredTrackIds,
            tracks: restoredTracks,
            thumbnails: extractThumbnails(restoredTracks),
            updatedAt: Date.now(),
          };
        });

        set({ playlists: restoredNext });
        persistPlaylists(restoredNext);
        toast.success(`Restored ${removedTrack.title}`);
      });
    }
  },

  reorderTracks: (playlistId, fromIndex, toIndex) => {
    const target = get().playlists.find((p) => p.id === playlistId);
    if (!target || !target.tracks) return;

    const newTracks = [...target.tracks];
    const [moved] = newTracks.splice(fromIndex, 1);
    newTracks.splice(toIndex, 0, moved);

    const newTrackIds = newTracks.map((t) => t.id);

    const next = get().playlists.map((pl) => {
      if (pl.id !== playlistId) return pl;
      return {
        ...pl,
        trackIds: newTrackIds,
        tracks: newTracks,
        updatedAt: Date.now(),
      };
    });

    set({ playlists: next });
    persistPlaylists(next);
  },

  setActivePlaylistId: (id) => {
    set({ activePlaylistId: id });
  },

  getPlaylistById: (id) => {
    return get().playlists.find((p) => p.id === id);
  },
}));
