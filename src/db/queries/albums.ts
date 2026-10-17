/**
 * Sloth Album Query Helpers
 * Parameterized queries and prepared statement execution for album entities.
 */

import { eq, like } from 'drizzle-orm';
import { db as defaultDb, SlothDatabase } from '../index';
import { albums, Album, NewAlbum } from '../schema';

/**
 * Inserts a new album into the database.
 */
export function createAlbum(album: NewAlbum, db: SlothDatabase = defaultDb): Album {
  const result = db.insert(albums).values(album).returning().get();
  return result;
}

/**
 * Retrieves an album by its primary key ID.
 */
export function getAlbumById(id: string, db: SlothDatabase = defaultDb): Album | null {
  const result = db.select().from(albums).where(eq(albums.id, id)).get();
  return result ?? null;
}

/**
 * Retrieves all albums belonging to a specific artist.
 */
export function getAlbumsByArtistId(artistId: string, db: SlothDatabase = defaultDb): Album[] {
  return db.select().from(albums).where(eq(albums.artistId, artistId)).all();
}

/**
 * Searches albums by title using parameterized LIKE.
 */
export function searchAlbums(query: string, limit: number = 20, db: SlothDatabase = defaultDb): Album[] {
  const pattern = `%${query.trim()}%`;
  return db
    .select()
    .from(albums)
    .where(like(albums.title, pattern))
    .limit(limit)
    .all();
}

/**
 * Retrieves all albums with optional limit.
 */
export function getAllAlbums(limit: number = 100, db: SlothDatabase = defaultDb): Album[] {
  return db.select().from(albums).limit(limit).all();
}

/**
 * Deletes an album by ID.
 */
export function deleteAlbum(id: string, db: SlothDatabase = defaultDb): boolean {
  const result = db.delete(albums).where(eq(albums.id, id)).run();
  return result.changes > 0;
}
