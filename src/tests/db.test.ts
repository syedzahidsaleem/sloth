/**
 * Sloth Local Database Unit Tests
 * Tests SQLite layer with Drizzle ORM, schema tables, foreign key constraints,
 * and parameterized query helpers across all 9 domains.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createDatabase,
  DatabaseConnection,
  createTrack,
  getTrackById,
  getTrackByIsrc,
  searchTracks,
  incrementPlayCount,
  incrementSkipCount,
  updateTrackEmbeddings,
  updateTrackSourceUrl,
  deleteTrack,
  getAllTracks,
  createArtist,
  getArtistById,
  getArtistByName,
  searchArtists,
  getAllArtists,
  updateArtist,
  deleteArtist,
  createAlbum,
  getAlbumById,
  getAlbumsByArtistId,
  searchAlbums,
  getAllAlbums,
  deleteAlbum,
  createPlaylist,
  getPlaylistById,
  getAllPlaylists,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  reorderPlaylistTracks,
  updatePlaylistMetadata,
  deletePlaylist,
  recordListeningEvent,
  getListeningHistory,
  getTrackListeningEvents,
  getRecentListeningEvents,
  getListeningEventById,
  updateListeningEvent,
  upsertTrackOverride,
  getTrackOverrideByIsrc,
  deleteTrackOverride,
  getAllTrackOverrides,
  setUserPref,
  getUserPref,
  deleteUserPref,
  getAllUserPrefs,
  enqueueSyncItem,
  getPendingSyncQueue,
  markSyncItemDone,
  clearSyncedItems,
  deleteSyncItem,
  upsertLyrics,
  getLyricsByTrackId,
  deleteLyrics,
  likeSong,
  unlikeSong,
  isSongLiked,
  getAllLikedSongs,
  followArtist,
  unfollowArtist,
  isArtistFollowed,
  getAllFollowedArtists,
  saveAlbum,
  unsaveAlbum,
  isAlbumSaved,
  getAllSavedAlbums,
  getResumePositions,
  getResumePosition,
  setResumePosition,
  clearResumePosition,
} from '../db';

describe('Sloth Local Database Layer (SQLite + Drizzle ORM)', () => {
  let conn: DatabaseConnection;

  beforeEach(() => {
    // Spin up an isolated in-memory SQLite database for each test suite
    conn = createDatabase(':memory:');
  });

  afterEach(() => {
    conn.close();
  });

  describe('1. Artists Domain Queries', () => {
    it('creates and retrieves artist by ID and name', () => {
      const artist = createArtist(
        {
          id: 'art-001',
          name: 'Daft Punk',
          mbid: '056e4f3e-d505-4dad-8ec1-d04f521cbb56',
          bio: 'French electronic music duo formed in 1993.',
          imageUrl: 'https://example.com/daftpunk.jpg',
          genreTags: ['electronic', 'french house', 'disco'],
        },
        conn.db
      );

      expect(artist.id).toBe('art-001');
      expect(artist.name).toBe('Daft Punk');
      expect(artist.genreTags).toEqual(['electronic', 'french house', 'disco']);

      const fetchedById = getArtistById('art-001', conn.db);
      expect(fetchedById).not.toBeNull();
      expect(fetchedById?.name).toBe('Daft Punk');

      const fetchedByName = getArtistByName('Daft Punk', conn.db);
      expect(fetchedByName).not.toBeNull();
      expect(fetchedByName?.id).toBe('art-001');
    });

    it('searches, updates, and deletes artists', () => {
      createArtist({ id: 'art-002', name: 'Justice', genreTags: ['electro'] }, conn.db);
      createArtist({ id: 'art-003', name: 'Kavinsky', genreTags: ['synthwave'] }, conn.db);

      const searchRes = searchArtists('Just', 10, conn.db);
      expect(searchRes).toHaveLength(1);
      expect(searchRes[0].name).toBe('Justice');

      const updated = updateArtist('art-002', { bio: 'French electronic music duo.' }, conn.db);
      expect(updated?.bio).toBe('French electronic music duo.');

      const all = getAllArtists(10, conn.db);
      expect(all.length).toBeGreaterThanOrEqual(2);

      const deleted = deleteArtist('art-003', conn.db);
      expect(deleted).toBe(true);
      expect(getArtistById('art-003', conn.db)).toBeNull();
    });
  });

  describe('2. Albums Domain Queries', () => {
    it('creates and retrieves albums by ID and artist ID', () => {
      createArtist({ id: 'art-001', name: 'Daft Punk' }, conn.db);

      const album = createAlbum(
        {
          id: 'alb-001',
          title: 'Random Access Memories',
          artistId: 'art-001',
          releaseYear: 2013,
          coverUrl: 'https://example.com/ram.jpg',
        },
        conn.db
      );

      expect(album.id).toBe('alb-001');
      expect(album.title).toBe('Random Access Memories');

      const fetched = getAlbumById('alb-001', conn.db);
      expect(fetched?.releaseYear).toBe(2013);

      const byArtist = getAlbumsByArtistId('art-001', conn.db);
      expect(byArtist).toHaveLength(1);
      expect(byArtist[0].title).toBe('Random Access Memories');
    });

    it('searches and deletes albums', () => {
      createAlbum({ id: 'alb-002', title: 'Discovery' }, conn.db);
      createAlbum({ id: 'alb-003', title: 'Human After All' }, conn.db);

      const found = searchAlbums('Disco', 10, conn.db);
      expect(found).toHaveLength(1);
      expect(found[0].id).toBe('alb-002');

      const all = getAllAlbums(10, conn.db);
      expect(all.length).toBe(2);

      const deleted = deleteAlbum('alb-002', conn.db);
      expect(deleted).toBe(true);
      expect(getAlbumById('alb-002', conn.db)).toBeNull();
    });
  });

  describe('3. Tracks Domain Queries', () => {
    it('creates a track with neural embeddings and acoustic features', () => {
      createArtist({ id: 'art-001', name: 'Daft Punk' }, conn.db);
      createAlbum({ id: 'alb-001', title: 'RAM', artistId: 'art-001' }, conn.db);

      const dummyMert = Buffer.from(new Float32Array([0.12, 0.45, -0.89]).buffer);
      const dummyClap = Buffer.from(new Float32Array([0.91, -0.23, 0.04]).buffer);

      const track = createTrack(
        {
          id: 'trk-001',
          isrc: 'USQX91300108',
          title: 'Get Lucky',
          artistId: 'art-001',
          albumId: 'alb-001',
          durationMs: 248000,
          bpm: 116.0,
          keySig: 'F#m',
          valence: 0.86,
          arousal: 0.77,
          mertEmbedding: dummyMert,
          clapEmbedding: dummyClap,
          sourceUrl: 'https://youtube.com/watch?v=5NV6Rdv1a3I',
        },
        conn.db
      );

      expect(track.id).toBe('trk-001');
      expect(track.isrc).toBe('USQX91300108');
      expect(track.title).toBe('Get Lucky');
      expect(track.playCount).toBe(0);
      expect(track.skipCount).toBe(0);

      // Verify retrieval by ID and binary embedding preservation
      const retrieved = getTrackById('trk-001', conn.db);
      expect(retrieved).not.toBeNull();
      expect(Buffer.isBuffer(retrieved?.mertEmbedding)).toBe(true);
      expect(retrieved?.mertEmbedding?.equals(dummyMert)).toBe(true);
      expect(retrieved?.clapEmbedding?.equals(dummyClap)).toBe(true);

      // Verify retrieval by ISRC
      const byIsrc = getTrackByIsrc('USQX91300108', conn.db);
      expect(byIsrc?.id).toBe('trk-001');
    });

    it('searches tracks with parameterized queries', () => {
      createTrack({ id: 'trk-010', title: 'Instant Crush' }, conn.db);
      createTrack({ id: 'trk-011', title: 'Lose Yourself to Dance' }, conn.db);

      const searchRes = searchTracks('Crush', 5, conn.db);
      expect(searchRes).toHaveLength(1);
      expect(searchRes[0].id).toBe('trk-010');
    });

    it('increments play count and updates last played timestamp', () => {
      createTrack({ id: 'trk-020', title: 'Giorgio by Moroder' }, conn.db);

      const updated = incrementPlayCount('trk-020', 1700000000, conn.db);
      expect(updated?.playCount).toBe(1);
      expect(updated?.lastPlayedAt).toBe(1700000000);

      const secondPlay = incrementPlayCount('trk-020', 1700000100, conn.db);
      expect(secondPlay?.playCount).toBe(2);
      expect(secondPlay?.lastPlayedAt).toBe(1700000100);
    });

    it('increments skip count', () => {
      createTrack({ id: 'trk-030', title: 'Contact' }, conn.db);

      const updated = incrementSkipCount('trk-030', conn.db);
      expect(updated?.skipCount).toBe(1);
      const secondSkip = incrementSkipCount('trk-030', conn.db);
      expect(secondSkip?.skipCount).toBe(2);
    });

    it('updates neural embeddings and source stream URL', () => {
      createTrack({ id: 'trk-040', title: 'Within' }, conn.db);

      const newClap = Buffer.from([10, 20, 30, 40]);
      const updated = updateTrackEmbeddings('trk-040', { clap: newClap }, conn.db);
      expect(updated?.clapEmbedding?.equals(newClap)).toBe(true);

      const withUrl = updateTrackSourceUrl('trk-040', 'https://sloth.stream/within', conn.db);
      expect(withUrl?.sourceUrl).toBe('https://sloth.stream/within');
    });

    it('deletes track and lists all tracks paginated', () => {
      createTrack({ id: 'trk-050', title: 'Track A' }, conn.db);
      createTrack({ id: 'trk-051', title: 'Track B' }, conn.db);

      const list = getAllTracks(10, 0, conn.db);
      expect(list.length).toBeGreaterThanOrEqual(2);

      const deleted = deleteTrack('trk-050', conn.db);
      expect(deleted).toBe(true);
      expect(getTrackById('trk-050', conn.db)).toBeNull();
    });
  });

  describe('4. Playlists Domain Queries', () => {
    it('creates, retrieves, and mutates playlist track items', () => {
      const playlist = createPlaylist(
        {
          id: 'pl-001',
          name: 'Late Night Coding',
          description: 'Focus and synth beats',
          trackIds: ['trk-1', 'trk-2'],
        },
        conn.db
      );

      expect(playlist.id).toBe('pl-001');
      expect(playlist.trackIds).toEqual(['trk-1', 'trk-2']);

      // Add track
      const added = addTrackToPlaylist('pl-001', 'trk-3', conn.db);
      expect(added?.trackIds).toEqual(['trk-1', 'trk-2', 'trk-3']);

      // Idempotent duplicate check
      const dupeAdded = addTrackToPlaylist('pl-001', 'trk-3', conn.db);
      expect(dupeAdded?.trackIds).toEqual(['trk-1', 'trk-2', 'trk-3']);

      // Remove track
      const removed = removeTrackFromPlaylist('pl-001', 'trk-2', conn.db);
      expect(removed?.trackIds).toEqual(['trk-1', 'trk-3']);

      // Reorder tracks
      const reordered = reorderPlaylistTracks('pl-001', ['trk-3', 'trk-1'], conn.db);
      expect(reordered?.trackIds).toEqual(['trk-3', 'trk-1']);

      // Update metadata
      const updatedMeta = updatePlaylistMetadata(
        'pl-001',
        { name: 'Late Night Chill' },
        conn.db
      );
      expect(updatedMeta?.name).toBe('Late Night Chill');

      const allPlaylists = getAllPlaylists(conn.db);
      expect(allPlaylists).toHaveLength(1);

      // Delete playlist
      const deleted = deletePlaylist('pl-001', conn.db);
      expect(deleted).toBe(true);
      expect(getPlaylistById('pl-001', conn.db)).toBeNull();
    });
  });

  describe('5. Listening Events Domain Queries', () => {
    it('records and queries listening events with context telemetry', () => {
      createTrack({ id: 'trk-100', title: 'Solar Fields - Sol' }, conn.db);

      const event = recordListeningEvent(
        {
          id: 'evt-001',
          trackId: 'trk-100',
          startedAt: 1710000000,
          endedAt: 1710000240,
          skipAtMs: null,
          source: 'youtube',
          contextJson: { client: 'desktop', volume: 85, shuffle: true },
        },
        conn.db
      );

      expect(event.id).toBe('evt-001');
      expect(event.contextJson).toEqual({ client: 'desktop', volume: 85, shuffle: true });

      const history = getListeningHistory(10, conn.db);
      expect(history).toHaveLength(1);
      expect(history[0].trackId).toBe('trk-100');

      const trackEvents = getTrackListeningEvents('trk-100', 10, conn.db);
      expect(trackEvents).toHaveLength(1);

      const recent = getRecentListeningEvents(1709999999, conn.db);
      expect(recent).toHaveLength(1);

      const single = getListeningEventById('evt-001', conn.db);
      expect(single?.source).toBe('youtube');

      const updated = updateListeningEvent('evt-001', { skipAtMs: 120000 }, conn.db);
      expect(updated?.skipAtMs).toBe(120000);
    });

    it('enforces foreign key integrity when inserting listening event', () => {
      // track_id does not exist, SQLite foreign key constraint should reject
      expect(() => {
        recordListeningEvent(
          {
            id: 'evt-bad',
            trackId: 'nonexistent-track',
            startedAt: 1710000000,
          },
          conn.db
        );
      }).toThrow(/FOREIGN KEY/i);
    });
  });

  describe('6. Track Overrides Domain Queries', () => {
    it('upserts and retrieves user stream overrides by ISRC', () => {
      const override = upsertTrackOverride(
        {
          isrc: 'USAT29900609',
          matchedUrl: 'https://youtube.com/watch?v=override1',
          userConfirmed: true,
          confidenceOriginal: 0.82,
        },
        conn.db
      );

      expect(override.isrc).toBe('USAT29900609');
      expect(override.matchedUrl).toBe('https://youtube.com/watch?v=override1');
      expect(override.userConfirmed).toBe(true);

      // Upsert update
      const updated = upsertTrackOverride(
        {
          isrc: 'USAT29900609',
          matchedUrl: 'https://youtube.com/watch?v=override2',
          userConfirmed: true,
          confidenceOriginal: 0.95,
        },
        conn.db
      );
      expect(updated.matchedUrl).toBe('https://youtube.com/watch?v=override2');
      expect(updated.confidenceOriginal).toBe(0.95);

      const retrieved = getTrackOverrideByIsrc('USAT29900609', conn.db);
      expect(retrieved?.matchedUrl).toBe('https://youtube.com/watch?v=override2');

      const all = getAllTrackOverrides(conn.db);
      expect(all).toHaveLength(1);

      const deleted = deleteTrackOverride('USAT29900609', conn.db);
      expect(deleted).toBe(true);
      expect(getTrackOverrideByIsrc('USAT29900609', conn.db)).toBeNull();
    });
  });

  describe('7. User Preferences Domain Queries', () => {
    it('manages key-value preferences with JSON support', () => {
      setUserPref('audio.volume', 75, conn.db);
      setUserPref('ui.accent', { name: 'Emerald', hex: '#10b981' }, conn.db);
      setUserPref('player.normalize', true, conn.db);

      const volume = getUserPref<number>('audio.volume', undefined, conn.db);
      expect(volume).toBe(75);

      const accent = getUserPref<{ name: string; hex: string }>('ui.accent', undefined, conn.db);
      expect(accent).toEqual({ name: 'Emerald', hex: '#10b981' });

      const fallback = getUserPref<string>('missing.key', 'defaultVal', conn.db);
      expect(fallback).toBe('defaultVal');

      const allPrefs = getAllUserPrefs(conn.db);
      expect(allPrefs['audio.volume']).toBe(75);
      expect(allPrefs['player.normalize']).toBe(true);

      const deleted = deleteUserPref('audio.volume', conn.db);
      expect(deleted).toBe(true);
      expect(getUserPref('audio.volume', undefined, conn.db)).toBeNull();
    });
  });

  describe('8. Sync Queue Domain Queries', () => {
    it('enqueues mutations, retrieves pending items, and clears synced items', () => {
      const item1 = enqueueSyncItem(
        {
          id: 'sq-1',
          entityType: 'playlist',
          entityId: 'pl-001',
          operation: 'create',
          payload: { name: 'Chill Beats' },
        },
        conn.db
      );

      const item2 = enqueueSyncItem(
        {
          id: 'sq-2',
          entityType: 'listening_event',
          entityId: 'evt-001',
          operation: 'create',
          payload: { trackId: 'trk-1' },
        },
        conn.db
      );

      expect(item1.id).toBe('sq-1');
      expect(item2.id).toBe('sq-2');

      const pending = getPendingSyncQueue(10, conn.db);
      expect(pending).toHaveLength(2);

      // Mark first item as synced
      const synced = markSyncItemDone('sq-1', 1700000000, conn.db);
      expect(synced?.syncedAt).toBe(1700000000);

      const remainingPending = getPendingSyncQueue(10, conn.db);
      expect(remainingPending).toHaveLength(1);
      expect(remainingPending[0].id).toBe('sq-2');

      // Clear synced items older than or equal to timestamp
      const purged = clearSyncedItems(1700000500, conn.db);
      expect(purged).toBe(1);

      // Delete single item
      const deleted = deleteSyncItem('sq-2', conn.db);
      expect(deleted).toBe(true);
      expect(getPendingSyncQueue(10, conn.db)).toHaveLength(0);
    });
  });

  describe('9. Lyrics Domain Queries', () => {
    it('upserts and retrieves LRC and plain lyrics by track ID', () => {
      createTrack({ id: 'trk-300', title: 'Harder, Better, Faster, Stronger' }, conn.db);

      const sampleLrc = `[00:15.20]Work it make it do it makes us\n[00:19.40]Harder better faster stronger`;
      const samplePlain = `Work it make it do it makes us\nHarder better faster stronger`;

      const lyricsItem = upsertLyrics(
        {
          trackId: 'trk-300',
          lrcContent: sampleLrc,
          plainContent: samplePlain,
          source: 'lrclib',
        },
        conn.db
      );

      expect(lyricsItem.trackId).toBe('trk-300');
      expect(lyricsItem.source).toBe('lrclib');

      const fetched = getLyricsByTrackId('trk-300', conn.db);
      expect(fetched?.lrcContent).toBe(sampleLrc);
      expect(fetched?.plainContent).toBe(samplePlain);

      // Test upsert update
      const updatedLyrics = upsertLyrics(
        {
          trackId: 'trk-300',
          lrcContent: sampleLrc,
          plainContent: samplePlain,
          source: 'syncedlyrics',
        },
        conn.db
      );
      expect(updatedLyrics.source).toBe('syncedlyrics');

      const deleted = deleteLyrics('trk-300', conn.db);
      expect(deleted).toBe(true);
      expect(getLyricsByTrackId('trk-300', conn.db)).toBeNull();
    });
  });

  describe('10. Library Domain Queries (Liked Songs, Followed Artists, Saved Albums, Resume Positions)', () => {
    it('manages liked songs', () => {
      expect(isSongLiked('trk-999', conn.db)).toBe(false);

      const liked = likeSong(
        {
          trackId: 'trk-999',
          title: 'Starboy',
          artist: 'The Weeknd',
          album: 'Starboy',
          source: 'youtube',
          durationMs: 230000,
        },
        conn.db
      );

      expect(liked.trackId).toBe('trk-999');
      expect(liked.title).toBe('Starboy');
      expect(isSongLiked('trk-999', conn.db)).toBe(true);

      const all = getAllLikedSongs(10, conn.db);
      expect(all).toHaveLength(1);
      expect(all[0].trackId).toBe('trk-999');

      const unliked = unlikeSong('trk-999', conn.db);
      expect(unliked).toBe(true);
      expect(isSongLiked('trk-999', conn.db)).toBe(false);
    });

    it('manages followed artists', () => {
      expect(isArtistFollowed('art-555', conn.db)).toBe(false);

      const followed = followArtist(
        {
          artistId: 'art-555',
          name: 'The Weeknd',
          imageUrl: 'https://example.com/weeknd.jpg',
        },
        conn.db
      );

      expect(followed.artistId).toBe('art-555');
      expect(followed.name).toBe('The Weeknd');
      expect(isArtistFollowed('art-555', conn.db)).toBe(true);

      const all = getAllFollowedArtists(10, conn.db);
      expect(all).toHaveLength(1);
      expect(all[0].artistId).toBe('art-555');

      const unfollowed = unfollowArtist('art-555', conn.db);
      expect(unfollowed).toBe(true);
      expect(isArtistFollowed('art-555', conn.db)).toBe(false);
    });

    it('manages saved albums', () => {
      expect(isAlbumSaved('alb-777', conn.db)).toBe(false);

      const saved = saveAlbum(
        {
          albumId: 'alb-777',
          title: 'After Hours',
          artist: 'The Weeknd',
          releaseYear: 2020,
        },
        conn.db
      );

      expect(saved.albumId).toBe('alb-777');
      expect(saved.title).toBe('After Hours');
      expect(isAlbumSaved('alb-777', conn.db)).toBe(true);

      const all = getAllSavedAlbums(10, conn.db);
      expect(all).toHaveLength(1);
      expect(all[0].albumId).toBe('alb-777');

      const unsaved = unsaveAlbum('alb-777', conn.db);
      expect(unsaved).toBe(true);
      expect(isAlbumSaved('alb-777', conn.db)).toBe(false);
    });

    it('manages track playback resume positions', () => {
      expect(getResumePosition('trk-resume-1', conn.db)).toBeNull();

      setResumePosition('trk-resume-1', 45200, conn.db);
      expect(getResumePosition('trk-resume-1', conn.db)).toBe(45200);

      const all = getResumePositions(conn.db);
      expect(all['trk-resume-1']).toBe(45200);

      clearResumePosition('trk-resume-1', conn.db);
      expect(getResumePosition('trk-resume-1', conn.db)).toBeNull();
    });
  });
});
