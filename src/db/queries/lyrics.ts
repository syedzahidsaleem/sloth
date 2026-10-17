/**
 * Sloth Lyrics Query Helpers
 * Parameterized queries for synchronized LRC and plain-text lyrics.
 */

import { eq } from 'drizzle-orm';
import { db as defaultDb, SlothDatabase } from '../index';
import { lyrics, LyricsItem, NewLyricsItem } from '../schema';

/**
 * Upserts LRC or plain lyrics for a track.
 */
export function upsertLyrics(
  item: NewLyricsItem,
  db: SlothDatabase = defaultDb
): LyricsItem {
  const result = db
    .insert(lyrics)
    .values(item)
    .onConflictDoUpdate({
      target: lyrics.trackId,
      set: {
        lrcContent: item.lrcContent,
        plainContent: item.plainContent,
        source: item.source,
      },
    })
    .returning()
    .get();

  return result;
}

/**
 * Retrieves lyrics cached for a given track ID.
 */
export function getLyricsByTrackId(
  trackId: string,
  db: SlothDatabase = defaultDb
): LyricsItem | null {
  const result = db
    .select()
    .from(lyrics)
    .where(eq(lyrics.trackId, trackId))
    .get();

  return result ?? null;
}

/**
 * Deletes cached lyrics for a track ID.
 */
export function deleteLyrics(
  trackId: string,
  db: SlothDatabase = defaultDb
): boolean {
  const result = db.delete(lyrics).where(eq(lyrics.trackId, trackId)).run();
  return result.changes > 0;
}
