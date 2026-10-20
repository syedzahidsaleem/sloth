/**
 * Sloth Library Store (Zustand)
 * Manages Liked Songs, Followed Artists, and Saved Albums with optimistic updates,
 * reactive state propagation across all cards and rows, and persistent storage.
 */

import { create } from 'zustand';
import { Track } from '@/components/ui/TrackRow';
import { toast } from '@/stores/toastStore';

export interface LikedSongItem {
  id: string;
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  durationSeconds: number;
  likedAt: number;
}

export interface FollowedArtistItem {
  id: string;
  name: string;
  imageUrl?: string;
  followedAt: number;
}

export interface SavedAlbumItem {
  id: string;
  title: string;
  artist: string;
  coverUrl?: string;
  releaseYear?: number;
  savedAt: number;
}

export interface LibraryStore {
  likedSongs: LikedSongItem[];
  followedArtists: FollowedArtistItem[];
  savedAlbums: SavedAlbumItem[];

  // Queries
  isLiked: (trackId: string) => boolean;
  isFollowed: (artistId: string) => boolean;
  isArtistFollowed: (artistId: string) => boolean;
  isAlbumSaved: (albumId: string) => boolean;

  // Mutations
  toggleLikeSong: (track: Track) => boolean;
  toggleFollowArtist: (artist: { id: string; name: string; imageUrl?: string }) => boolean;
  toggleSaveAlbum: (album: { id: string; title: string; artist?: string; coverUrl?: string; releaseYear?: number }) => boolean;
  saveAlbum: (album: { id: string; title: string; artist?: string; coverUrl?: string; releaseYear?: number }) => void;
  removeAlbum: (albumId: string) => void;

  // Bulk
  setLikedSongs: (songs: LikedSongItem[]) => void;
  setFollowedArtists: (artists: FollowedArtistItem[]) => void;
  setSavedAlbums: (albums: SavedAlbumItem[]) => void;
}

const LIKED_STORAGE_KEY = 'sloth:liked_songs';
const FOLLOWED_STORAGE_KEY = 'sloth:followed_artists';
const ALBUMS_STORAGE_KEY = 'sloth:saved_albums';

function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Failed to persist ${key}:`, err);
  }
}

export const useLibraryStore = create<LibraryStore>((set, get) => {
  const initialLiked = loadFromStorage<LikedSongItem[]>(LIKED_STORAGE_KEY, []);
  const initialArtists = loadFromStorage<FollowedArtistItem[]>(FOLLOWED_STORAGE_KEY, []);
  const initialAlbums = loadFromStorage<SavedAlbumItem[]>(ALBUMS_STORAGE_KEY, []);

  return {
    likedSongs: initialLiked,
    followedArtists: initialArtists,
    savedAlbums: initialAlbums,

    isLiked: (trackId: string) => {
      return get().likedSongs.some((s) => s.id === trackId);
    },

    isFollowed: (artistId: string) => {
      const clean = artistId.toLowerCase().trim();
      return get().followedArtists.some(
        (a) => a.id.toLowerCase().trim() === clean || a.name.toLowerCase().trim() === clean
      );
    },

    isArtistFollowed: (artistId: string) => {
      return get().isFollowed(artistId);
    },

    isAlbumSaved: (albumId: string) => {
      const clean = albumId.toLowerCase().trim();
      return get().savedAlbums.some(
        (a) => a.id.toLowerCase().trim() === clean || a.title.toLowerCase().trim() === clean
      );
    },

    saveAlbum: (album) => {
      const { isAlbumSaved } = get();
      if (!isAlbumSaved(album.id)) {
        get().toggleSaveAlbum(album);
      }
    },

    removeAlbum: (albumId: string) => {
      const { isAlbumSaved } = get();
      if (isAlbumSaved(albumId)) {
        get().toggleSaveAlbum({ id: albumId, title: albumId });
      }
    },

    toggleLikeSong: (track: Track) => {
      const { likedSongs, isLiked } = get();
      const alreadyLiked = isLiked(track.id);

      let nextList: LikedSongItem[];
      if (alreadyLiked) {
        nextList = likedSongs.filter((s) => s.id !== track.id);
        toast.info('Removed from Liked Songs', track.title);
      } else {
        const newItem: LikedSongItem = {
          id: track.id,
          title: track.title,
          artist: track.artist,
          album: track.album,
          coverUrl: track.coverUrl,
          durationSeconds: track.durationSeconds || 210,
          likedAt: Date.now(),
        };
        nextList = [newItem, ...likedSongs];
        toast.success('Saved to Liked Songs', track.title);
      }

      set({ likedSongs: nextList });
      saveToStorage(LIKED_STORAGE_KEY, nextList);
      return !alreadyLiked;
    },

    toggleFollowArtist: (artist) => {
      const { followedArtists, isFollowed } = get();
      const alreadyFollowed = isFollowed(artist.id);

      let nextList: FollowedArtistItem[];
      if (alreadyFollowed) {
        nextList = followedArtists.filter(
          (a) => a.id !== artist.id && a.name.toLowerCase() !== artist.name.toLowerCase()
        );
        toast.info('Unfollowed artist', artist.name);
      } else {
        const newItem: FollowedArtistItem = {
          id: artist.id || `art-${Date.now()}`,
          name: artist.name,
          imageUrl: artist.imageUrl,
          followedAt: Date.now(),
        };
        nextList = [newItem, ...followedArtists];
        toast.success('Following artist', artist.name);
      }

      set({ followedArtists: nextList });
      saveToStorage(FOLLOWED_STORAGE_KEY, nextList);
      return !alreadyFollowed;
    },

    toggleSaveAlbum: (album) => {
      const { savedAlbums, isAlbumSaved } = get();
      const alreadySaved = isAlbumSaved(album.id);

      let nextList: SavedAlbumItem[];
      if (alreadySaved) {
        nextList = savedAlbums.filter(
          (a) => a.id !== album.id && a.title.toLowerCase() !== album.title.toLowerCase()
        );
        toast.info('Removed from Saved Albums', album.title);
      } else {
        const newItem: SavedAlbumItem = {
          id: album.id || `alb-${Date.now()}`,
          title: album.title,
          artist: album.artist || 'Unknown Artist',
          coverUrl: album.coverUrl,
          releaseYear: album.releaseYear,
          savedAt: Date.now(),
        };
        nextList = [newItem, ...savedAlbums];
        toast.success('Saved album to Library', album.title);
      }

      set({ savedAlbums: nextList });
      saveToStorage(ALBUMS_STORAGE_KEY, nextList);
      return !alreadySaved;
    },

    setLikedSongs: (songs) => {
      set({ likedSongs: songs });
      saveToStorage(LIKED_STORAGE_KEY, songs);
    },

    setFollowedArtists: (artists) => {
      set({ followedArtists: artists });
      saveToStorage(FOLLOWED_STORAGE_KEY, artists);
    },

    setSavedAlbums: (albums) => {
      set({ savedAlbums: albums });
      saveToStorage(ALBUMS_STORAGE_KEY, albums);
    },
  };
});
