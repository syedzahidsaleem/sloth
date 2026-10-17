/**
 * Sloth Lyrics & Translation Query Helpers
 * Parameterized queries for synchronized LRC, plain-text lyrics, and AI translations.
 */

import { eq } from 'drizzle-orm';
import { db as defaultDb, SlothDatabase } from '../index';
import {
  lyrics,
  lyricsTranslations,
  LyricsItem,
  NewLyricsItem,
  LyricsTranslationItem,
  NewLyricsTranslationItem,
} from '../schema';

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

/**
 * Upserts a translated lyrics item for a track.
 */
export function upsertLyricsTranslation(
  item: NewLyricsTranslationItem,
  db: SlothDatabase = defaultDb
): LyricsTranslationItem {
  const compositeId = item.id || `${item.trackId}_${item.lang}_${item.mode || 'Translated'}`;
  const record = { ...item, id: compositeId };

  const result = db
    .insert(lyricsTranslations)
    .values(record)
    .onConflictDoUpdate({
      target: lyricsTranslations.id,
      set: {
        content: item.content,
      },
    })
    .returning()
    .get();

  return result;
}

/**
 * Retrieves cached translation for a track, target language, and mode.
 */
export function getLyricsTranslation(
  trackId: string,
  lang: string,
  mode: string = 'Translated',
  db: SlothDatabase = defaultDb
): LyricsTranslationItem | null {
  const compositeId = `${trackId}_${lang}_${mode}`;
  const result = db
    .select()
    .from(lyricsTranslations)
    .where(eq(lyricsTranslations.id, compositeId))
    .get();

  return result ?? null;
}

/**
 * Retrieves all cached translations for a track ID.
 */
export function getLyricsTranslationsByTrackId(
  trackId: string,
  db: SlothDatabase = defaultDb
): LyricsTranslationItem[] {
  const results = db
    .select()
    .from(lyricsTranslations)
    .where(eq(lyricsTranslations.trackId, trackId))
    .all();

  return results;
}

/**
 * Deletes cached translation for a track.
 */
export function deleteLyricsTranslation(
  trackId: string,
  lang: string,
  mode: string = 'Translated',
  db: SlothDatabase = defaultDb
): boolean {
  const compositeId = `${trackId}_${lang}_${mode}`;
  const result = db
    .delete(lyricsTranslations)
    .where(eq(lyricsTranslations.id, compositeId))
    .run();

  return result.changes > 0;
}
