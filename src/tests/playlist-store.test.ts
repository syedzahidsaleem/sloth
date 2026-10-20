/**
 * Playlist Store Unit Tests
 * Tests CRUD, Add/Remove Track with 5-Second Undo, Track Reordering, and Thumbnails.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { usePlaylistStore } from '../stores/playlistStore';
import { useToastStore } from '../stores/toastStore';
import { Track } from '../components/ui/TrackRow';

const testTrack1: Track = {
  id: 't-1',
  title: 'Track One',
  artist: 'Artist A',
  coverUrl: 'https://example.com/cover1.jpg',
  durationSeconds: 180,
};

const testTrack2: Track = {
  id: 't-2',
  title: 'Track Two',
  artist: 'Artist B',
  coverUrl: 'https://example.com/cover2.jpg',
  durationSeconds: 210,
};

describe('usePlaylistStore (Zustand Playlist State)', () => {
  beforeEach(() => {
    usePlaylistStore.setState({ playlists: [], activePlaylistId: null });
    useToastStore.setState({ toasts: [] });
  });

  it('creates, updates, and deletes playlist', () => {
    const store = usePlaylistStore.getState();

    // Create
    const pl = store.createPlaylist('Synthwave Hits', 'Retro electronic music');
    expect(pl.name).toBe('Synthwave Hits');
    expect(usePlaylistStore.getState().playlists).toHaveLength(1);

    // Update
    store.updatePlaylist(pl.id, { name: 'Synthwave Classics' });
    expect(usePlaylistStore.getState().playlists[0].name).toBe('Synthwave Classics');

    // Delete
    store.deletePlaylist(pl.id);
    expect(usePlaylistStore.getState().playlists).toHaveLength(0);
  });

  it('adds and removes tracks with 5-second undo support', () => {
    const store = usePlaylistStore.getState();
    const pl = store.createPlaylist('Test Mix');

    // Add tracks
    store.addTrackToPlaylist(pl.id, testTrack1);
    store.addTrackToPlaylist(pl.id, testTrack2);

    let updated = usePlaylistStore.getState().getPlaylistById(pl.id);
    expect(updated?.trackIds).toEqual(['t-1', 't-2']);
    expect(updated?.thumbnails).toContain('https://example.com/cover1.jpg');

    // Duplicate prevention
    const dupe = store.addTrackToPlaylist(pl.id, testTrack1);
    expect(dupe).toBe(false);

    // Remove track 1 -> triggers undo toast
    store.removeTrackFromPlaylist(pl.id, 't-1');
    updated = usePlaylistStore.getState().getPlaylistById(pl.id);
    expect(updated?.trackIds).toEqual(['t-2']);

    const toasts = useToastStore.getState().toasts;
    const undoToast = toasts.find((t) => t.type === 'undo');
    expect(undoToast).toBeDefined();

    // Trigger undo
    undoToast?.onAction?.();
    updated = usePlaylistStore.getState().getPlaylistById(pl.id);
    expect(updated?.trackIds).toEqual(['t-1', 't-2']);
  });

  it('reorders tracks in playlist', () => {
    const store = usePlaylistStore.getState();
    const pl = store.createPlaylist('Order Mix', '', [testTrack1, testTrack2]);

    store.reorderTracks(pl.id, 0, 1);
    const updated = usePlaylistStore.getState().getPlaylistById(pl.id);
    expect(updated?.trackIds).toEqual(['t-2', 't-1']);
  });
});
