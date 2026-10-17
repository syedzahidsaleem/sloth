/**
 * Sloth Playlist Query Helpers
 * Parameterized queries and prepared statement execution for playlists.
 */

import { eq, desc } from 'drizzle-orm';
import { db as defaultDb, SlothDatabase } from '../index';
import { playlists, Playlist, NewPlaylist } from '../schema';

/**
 * Inserts a new playlist into the database.
 */
export function createPlaylist(playlist: NewPlaylist, db: SlothDatabase = defaultDb): Playlist {
  const result = db.insert(playlists).values(playlist).returning().get();
  return result;
}

/**
 * Retrieves a playlist by its primary key ID.
 */
export function getPlaylistById(id: string, db: SlothDatabase = defaultDb): Playlist | null {
  const result = db.select().from(playlists).where(eq(playlists.id, id)).get();
  return result ?? null;
}

/**
 * Retrieves all playlists ordered by updatedAt descending.
 */
export function getAllPlaylists(db: SlothDatabase = defaultDb): Playlist[] {
  return db.select().from(playlists).orderBy(desc(playlists.updatedAt)).all();
}

/**
 * Appends a track ID to a playlist's track list (preserving order).
 */
export function addTrackToPlaylist(
  playlistId: string,
  trackId: string,
  db: SlothDatabase = defaultDb
): Playlist | null {
  const playlist = getPlaylistById(playlistId, db);
  if (!playlist) return null;

  const currentTracks = playlist.trackIds || [];
  if (currentTracks.includes(trackId)) {
    return playlist; // Avoid duplicates or maintain idempotency
  }

  const updatedTracks = [...currentTracks, trackId];
  const now = Math.floor(Date.now() / 1000);

  const result = db
    .update(playlists)
    .set({
      trackIds: updatedTracks,
      updatedAt: now,
    })
    .where(eq(playlists.id, playlistId))
    .returning()
    .get();

  return result ?? null;
}

/**
 * Removes a track ID from a playlist.
 */
export function removeTrackFromPlaylist(
  playlistId: string,
  trackId: string,
  db: SlothDatabase = defaultDb
): Playlist | null {
  const playlist = getPlaylistById(playlistId, db);
  if (!playlist) return null;

  const updatedTracks = (playlist.trackIds || []).filter((id) => id !== trackId);
  const now = Math.floor(Date.now() / 1000);

  const result = db
    .update(playlists)
    .set({
      trackIds: updatedTracks,
      updatedAt: now,
    })
    .where(eq(playlists.id, playlistId))
    .returning()
    .get();

  return result ?? null;
}

/**
 * Reorders the tracks in a playlist.
 */
export function reorderPlaylistTracks(
  playlistId: string,
  trackIds: string[],
  db: SlothDatabase = defaultDb
): Playlist | null {
  const now = Math.floor(Date.now() / 1000);
  const result = db
    .update(playlists)
    .set({
      trackIds,
      updatedAt: now,
    })
    .where(eq(playlists.id, playlistId))
    .returning()
    .get();

  return result ?? null;
}

/**
 * Updates playlist name and/or description.
 */
export function updatePlaylistMetadata(
  playlistId: string,
  updates: { name?: string; description?: string },
  db: SlothDatabase = defaultDb
): Playlist | null {
  const now = Math.floor(Date.now() / 1000);
  const result = db
    .update(playlists)
    .set({
      ...updates,
      updatedAt: now,
    })
    .where(eq(playlists.id, playlistId))
    .returning()
    .get();

  return result ?? null;
}

/**
 * Deletes a playlist by ID.
 */
export function deletePlaylist(playlistId: string, db: SlothDatabase = defaultDb): boolean {
  const result = db.delete(playlists).where(eq(playlists.id, playlistId)).run();
  return result.changes > 0;
}
