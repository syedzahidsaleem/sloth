/**
 * Library Store & Toast Store Unit Tests
 * Tests Liked Songs, Followed Artists, Saved Albums optimistic toggles and Toast dispatching.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useLibraryStore } from '../stores/libraryStore';
import { useToastStore, toast } from '../stores/toastStore';
import { Track } from '../components/ui/TrackRow';

const sampleTrack: Track = {
  id: 'test-track-1',
  title: 'Starboy',
  artist: 'The Weeknd',
  album: 'Starboy',
  durationSeconds: 230,
};

describe('Sloth Library & Toast Store', () => {
  beforeEach(() => {
    useLibraryStore.setState({
      likedSongs: [],
      followedArtists: [],
      savedAlbums: [],
    });
    useToastStore.setState({ toasts: [] });
  });

  describe('Liked Songs', () => {
    it('toggles liking and unliking track with optimistic state', () => {
      const store = useLibraryStore.getState();
      expect(store.isLiked('test-track-1')).toBe(false);

      // Like track
      const liked = store.toggleLikeSong(sampleTrack);
      expect(liked).toBe(true);
      expect(useLibraryStore.getState().isLiked('test-track-1')).toBe(true);
      expect(useLibraryStore.getState().likedSongs).toHaveLength(1);

      // Unlike track
      const unliked = store.toggleLikeSong(sampleTrack);
      expect(unliked).toBe(false);
      expect(useLibraryStore.getState().isLiked('test-track-1')).toBe(false);
      expect(useLibraryStore.getState().likedSongs).toHaveLength(0);
    });
  });

  describe('Followed Artists', () => {
    it('toggles follow and unfollow artist', () => {
      const store = useLibraryStore.getState();
      const artist = { id: 'art-1', name: 'Daft Punk', imageUrl: 'https://example.com/dp.jpg' };

      expect(store.isFollowed('art-1')).toBe(false);
      expect(store.isFollowed('Daft Punk')).toBe(false);

      // Follow
      store.toggleFollowArtist(artist);
      expect(useLibraryStore.getState().isFollowed('art-1')).toBe(true);
      expect(useLibraryStore.getState().isFollowed('Daft Punk')).toBe(true);

      // Unfollow
      store.toggleFollowArtist(artist);
      expect(useLibraryStore.getState().isFollowed('art-1')).toBe(false);
    });
  });

  describe('Saved Albums', () => {
    it('toggles save and unsave album', () => {
      const store = useLibraryStore.getState();
      const album = { id: 'alb-1', title: 'Discovery', artist: 'Daft Punk' };

      expect(store.isAlbumSaved('alb-1')).toBe(false);
      expect(store.isAlbumSaved('Discovery')).toBe(false);

      // Save
      store.toggleSaveAlbum(album);
      expect(useLibraryStore.getState().isAlbumSaved('alb-1')).toBe(true);
      expect(useLibraryStore.getState().isAlbumSaved('Discovery')).toBe(true);

      // Unsave
      store.toggleSaveAlbum(album);
      expect(useLibraryStore.getState().isAlbumSaved('alb-1')).toBe(false);
    });
  });

  describe('Toast Notifications', () => {
    it('dispatches info, success, error and undo toasts', () => {
      toast.success('Track added');
      toast.info('Downloading');
      toast.error('Network offline');

      const toasts = useToastStore.getState().toasts;
      expect(toasts).toHaveLength(3);
      expect(toasts[0].type).toBe('success');
      expect(toasts[1].type).toBe('info');
      expect(toasts[2].type).toBe('error');
    });

    it('triggers action on undo toast', () => {
      let undone = false;
      toast.undo('Queue replaced', () => {
        undone = true;
      });

      const toasts = useToastStore.getState().toasts;
      const undoToast = toasts.find((t) => t.type === 'undo');
      expect(undoToast).toBeDefined();

      undoToast?.onAction?.();
      expect(undone).toBe(true);
    });
  });
});
