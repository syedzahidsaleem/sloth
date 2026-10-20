/**
 * Sloth User Preferences Query Helpers
 * Key-value JSON preferences store.
 */

import { eq } from 'drizzle-orm';
import { db as defaultDb, SlothDatabase } from '../index';
import { userPrefs, UserPref } from '../schema';

/**
 * Sets or updates a user preference by key with automatic JSON serialization.
 */
export function setUserPref<T = unknown>(
  key: string,
  value: T,
  db: SlothDatabase = defaultDb
): UserPref {
  const result = db
    .insert(userPrefs)
    .values({ key, value: value as unknown as string })
    .onConflictDoUpdate({
      target: userPrefs.key,
      set: { value: value as unknown as string },
    })
    .returning()
    .get();

  return result;
}

/**
 * Retrieves a user preference by key.
 */
export function getUserPref<T = unknown>(
  key: string,
  defaultValue?: T,
  db: SlothDatabase = defaultDb
): T | null {
  const result = db.select().from(userPrefs).where(eq(userPrefs.key, key)).get();
  if (!result) {
    return defaultValue !== undefined ? defaultValue : null;
  }

  return (result.value as unknown) as T;
}

/**
 * Deletes a user preference by key.
 */
export function deleteUserPref(key: string, db: SlothDatabase = defaultDb): boolean {
  const result = db.delete(userPrefs).where(eq(userPrefs.key, key)).run();
  return result.changes > 0;
}

/**
 * Retrieves all user preferences as a key-value record.
 */
export function getAllUserPrefs(db: SlothDatabase = defaultDb): Record<string, unknown> {
  const rows = db.select().from(userPrefs).all();
  const output: Record<string, unknown> = {};

  for (const row of rows) {
    output[row.key] = row.value;
  }

  return output;
}

/**
 * -------------------------------------------------------------
 * Resume Position Helpers
 * -------------------------------------------------------------
 */

export function getResumePositions(db: SlothDatabase = defaultDb): Record<string, number> {
  return getUserPref<Record<string, number>>('resume_positions', {}, db) ?? {};
}

export function getResumePosition(trackId: string, db: SlothDatabase = defaultDb): number | null {
  const map = getResumePositions(db);
  return map[trackId] ?? null;
}

export function setResumePosition(trackId: string, positionMs: number, db: SlothDatabase = defaultDb): void {
  const map = getResumePositions(db);
  map[trackId] = positionMs;
  setUserPref('resume_positions', map, db);
}

export function clearResumePosition(trackId: string, db: SlothDatabase = defaultDb): void {
  const map = getResumePositions(db);
  if (trackId in map) {
    delete map[trackId];
    setUserPref('resume_positions', map, db);
  }
}

