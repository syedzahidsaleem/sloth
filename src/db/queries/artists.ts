/**
 * Sloth Artist Query Helpers
 * Parameterized queries and prepared statement execution for artist entities.
 */

import { eq, like } from 'drizzle-orm';
import { db as defaultDb, SlothDatabase } from '../index';
import { artists, Artist, NewArtist } from '../schema';

/**
 * Inserts a new artist into the database.
 */
export function createArtist(artist: NewArtist, db: SlothDatabase = defaultDb): Artist {
  const result = db.insert(artists).values(artist).returning().get();
  return result;
}

/**
 * Retrieves an artist by their primary key ID.
 */
export function getArtistById(id: string, db: SlothDatabase = defaultDb): Artist | null {
  const result = db.select().from(artists).where(eq(artists.id, id)).get();
  return result ?? null;
}

/**
 * Retrieves an artist by exact name match.
 */
export function getArtistByName(name: string, db: SlothDatabase = defaultDb): Artist | null {
  const result = db.select().from(artists).where(eq(artists.name, name)).get();
  return result ?? null;
}

/**
 * Searches artists by name prefix or substring using parameterized LIKE.
 */
export function searchArtists(query: string, limit: number = 20, db: SlothDatabase = defaultDb): Artist[] {
  const pattern = `%${query.trim()}%`;
  return db
    .select()
    .from(artists)
    .where(like(artists.name, pattern))
    .limit(limit)
    .all();
}

/**
 * Retrieves all artists ordered by name.
 */
export function getAllArtists(limit: number = 100, db: SlothDatabase = defaultDb): Artist[] {
  return db.select().from(artists).limit(limit).all();
}

/**
 * Updates an artist entity by ID.
 */
export function updateArtist(
  id: string,
  updates: Partial<Omit<NewArtist, 'id'>>,
  db: SlothDatabase = defaultDb
): Artist | null {
  const result = db
    .update(artists)
    .set(updates)
    .where(eq(artists.id, id))
    .returning()
    .get();

  return result ?? null;
}

/**
 * Deletes an artist by ID.
 */
export function deleteArtist(id: string, db: SlothDatabase = defaultDb): boolean {
  const result = db.delete(artists).where(eq(artists.id, id)).run();
  return result.changes > 0;
}
