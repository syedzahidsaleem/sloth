/**
 * Sloth Track Query Helpers
 * Parameterized queries and prepared statement execution for track entities.
 */

import { eq, like, desc, sql } from 'drizzle-orm';
import { db as defaultDb, SlothDatabase } from '../index';
import { tracks, Track, NewTrack } from '../schema';

/**
 * Inserts a new track into the database.
 */
export function createTrack(track: NewTrack, db: SlothDatabase = defaultDb): Track {
  const result = db.insert(tracks).values(track).returning().get();
  return result;
}

/**
 * Retrieves a track by its primary key ID using parameterized lookup.
 */
export function getTrackById(id: string, db: SlothDatabase = defaultDb): Track | null {
  const result = db.select().from(tracks).where(eq(tracks.id, id)).get();
  return result ?? null;
}

/**
 * Retrieves a track by its International Standard Recording Code (ISRC).
 */
export function getTrackByIsrc(isrc: string, db: SlothDatabase = defaultDb): Track | null {
  const result = db.select().from(tracks).where(eq(tracks.isrc, isrc)).get();
  return result ?? null;
}

/**
 * Searches tracks by title using a parameterized LIKE pattern.
 */
export function searchTracks(query: string, limit: number = 20, db: SlothDatabase = defaultDb): Track[] {
  const pattern = `%${query.trim()}%`;
  return db
    .select()
    .from(tracks)
    .where(like(tracks.title, pattern))
    .limit(limit)
    .all();
}

/**
 * Increments a track's play count and updates the last played timestamp.
 */
export function incrementPlayCount(
  id: string,
  timestamp: number = Math.floor(Date.now() / 1000),
  db: SlothDatabase = defaultDb
): Track | null {
  const result = db
    .update(tracks)
    .set({
      playCount: sql`${tracks.playCount} + 1`,
      lastPlayedAt: timestamp,
    })
    .where(eq(tracks.id, id))
    .returning()
    .get();

  return result ?? null;
}

/**
 * Increments a track's skip count.
 */
export function incrementSkipCount(id: string, db: SlothDatabase = defaultDb): Track | null {
  const result = db
    .update(tracks)
    .set({
      skipCount: sql`${tracks.skipCount} + 1`,
    })
    .where(eq(tracks.id, id))
    .returning()
    .get();

  return result ?? null;
}

/**
 * Updates neural acoustic embeddings (512-dim MERT and CLAP buffers).
 */
export function updateTrackEmbeddings(
  id: string,
  embeddings: { mert?: Buffer | null; clap?: Buffer | null },
  db: SlothDatabase = defaultDb
): Track | null {
  const updates: Partial<NewTrack> = {};
  if (embeddings.mert !== undefined) updates.mertEmbedding = embeddings.mert;
  if (embeddings.clap !== undefined) updates.clapEmbedding = embeddings.clap;

  if (Object.keys(updates).length === 0) {
    return getTrackById(id, db);
  }

  const result = db
    .update(tracks)
    .set(updates)
    .where(eq(tracks.id, id))
    .returning()
    .get();

  return result ?? null;
}

/**
 * Updates the resolved playable stream URL for a track.
 */
export function updateTrackSourceUrl(
  id: string,
  sourceUrl: string,
  db: SlothDatabase = defaultDb
): Track | null {
  const result = db
    .update(tracks)
    .set({ sourceUrl })
    .where(eq(tracks.id, id))
    .returning()
    .get();

  return result ?? null;
}

/**
 * Deletes a track by its primary key ID.
 */
export function deleteTrack(id: string, db: SlothDatabase = defaultDb): boolean {
  const result = db.delete(tracks).where(eq(tracks.id, id)).run();
  return result.changes > 0;
}

/**
 * Returns a paginated list of all tracks ordered by creation time descending.
 */
export function getAllTracks(
  limit: number = 100,
  offset: number = 0,
  db: SlothDatabase = defaultDb
): Track[] {
  return db
    .select()
    .from(tracks)
    .orderBy(desc(tracks.createdAt))
    .limit(limit)
    .offset(offset)
    .all();
}
