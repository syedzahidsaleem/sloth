/**
 * Sloth Track Overrides Query Helpers
 * User manual stream overrides mapped by ISRC.
 */

import { eq, desc } from 'drizzle-orm';
import { db as defaultDb, SlothDatabase } from '../index';
import { trackOverrides, TrackOverride, NewTrackOverride } from '../schema';

/**
 * Inserts or updates a user track override for an ISRC.
 */
export function upsertTrackOverride(
  override: NewTrackOverride,
  db: SlothDatabase = defaultDb
): TrackOverride {
  const result = db
    .insert(trackOverrides)
    .values(override)
    .onConflictDoUpdate({
      target: trackOverrides.isrc,
      set: {
        matchedUrl: override.matchedUrl,
        userConfirmed: override.userConfirmed ?? true,
        confidenceOriginal: override.confidenceOriginal,
      },
    })
    .returning()
    .get();

  return result;
}

/**
 * Retrieves a track override by ISRC.
 */
export function getTrackOverrideByIsrc(
  isrc: string,
  db: SlothDatabase = defaultDb
): TrackOverride | null {
  const result = db
    .select()
    .from(trackOverrides)
    .where(eq(trackOverrides.isrc, isrc))
    .get();
  return result ?? null;
}

/**
 * Deletes a track override by ISRC.
 */
export function deleteTrackOverride(isrc: string, db: SlothDatabase = defaultDb): boolean {
  const result = db.delete(trackOverrides).where(eq(trackOverrides.isrc, isrc)).run();
  return result.changes > 0;
}

/**
 * Retrieves all user track overrides ordered by creation date descending.
 */
export function getAllTrackOverrides(db: SlothDatabase = defaultDb): TrackOverride[] {
  return db
    .select()
    .from(trackOverrides)
    .orderBy(desc(trackOverrides.createdAt))
    .all();
}
