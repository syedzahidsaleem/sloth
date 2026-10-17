/**
 * Sloth Listening Event Query Helpers
 * Parameterized queries and prepared statement execution for listening event telemetry.
 */

import { eq, desc, gte } from 'drizzle-orm';
import { db as defaultDb, SlothDatabase } from '../index';
import { listeningEvents, ListeningEvent, NewListeningEvent } from '../schema';

/**
 * Records a listening event session.
 */
export function recordListeningEvent(
  event: NewListeningEvent,
  db: SlothDatabase = defaultDb
): ListeningEvent {
  const result = db.insert(listeningEvents).values(event).returning().get();
  return result;
}

/**
 * Retrieves listening history ordered by startedAt descending.
 */
export function getListeningHistory(
  limit: number = 50,
  db: SlothDatabase = defaultDb
): ListeningEvent[] {
  return db
    .select()
    .from(listeningEvents)
    .orderBy(desc(listeningEvents.startedAt))
    .limit(limit)
    .all();
}

/**
 * Retrieves all listening events for a specific track.
 */
export function getTrackListeningEvents(
  trackId: string,
  limit: number = 50,
  db: SlothDatabase = defaultDb
): ListeningEvent[] {
  return db
    .select()
    .from(listeningEvents)
    .where(eq(listeningEvents.trackId, trackId))
    .orderBy(desc(listeningEvents.startedAt))
    .limit(limit)
    .all();
}

/**
 * Retrieves events recorded after a specific unix epoch timestamp.
 */
export function getRecentListeningEvents(
  sinceTimestamp: number,
  db: SlothDatabase = defaultDb
): ListeningEvent[] {
  return db
    .select()
    .from(listeningEvents)
    .where(gte(listeningEvents.startedAt, sinceTimestamp))
    .orderBy(desc(listeningEvents.startedAt))
    .all();
}

/**
 * Retrieves a single listening event by ID.
 */
export function getListeningEventById(
  id: string,
  db: SlothDatabase = defaultDb
): ListeningEvent | null {
  const result = db
    .select()
    .from(listeningEvents)
    .where(eq(listeningEvents.id, id))
    .get();
  return result ?? null;
}

/**
 * Updates an event when playback finishes or is skipped.
 */
export function updateListeningEvent(
  id: string,
  updates: { endedAt?: number; skipAtMs?: number },
  db: SlothDatabase = defaultDb
): ListeningEvent | null {
  const result = db
    .update(listeningEvents)
    .set(updates)
    .where(eq(listeningEvents.id, id))
    .returning()
    .get();

  return result ?? null;
}
