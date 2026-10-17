/**
 * Sloth Sync Queue Query Helpers
 * Offline-first sync mutation queue for cloud replication.
 */

import { eq, isNull, lte, and, sql } from 'drizzle-orm';
import { db as defaultDb, SlothDatabase } from '../index';
import { syncQueue, SyncQueueItem, NewSyncQueueItem } from '../schema';

/**
 * Enqueues a mutation operation into the sync queue.
 */
export function enqueueSyncItem(
  item: NewSyncQueueItem,
  db: SlothDatabase = defaultDb
): SyncQueueItem {
  const result = db.insert(syncQueue).values(item).returning().get();
  return result;
}

/**
 * Retrieves pending (unsynced) items from the queue ordered by row insertion.
 */
export function getPendingSyncQueue(
  limit: number = 50,
  db: SlothDatabase = defaultDb
): SyncQueueItem[] {
  return db
    .select()
    .from(syncQueue)
    .where(isNull(syncQueue.syncedAt))
    .limit(limit)
    .all();
}

/**
 * Marks a sync item as successfully synchronized.
 */
export function markSyncItemDone(
  id: string,
  syncedAt: number = Math.floor(Date.now() / 1000),
  db: SlothDatabase = defaultDb
): SyncQueueItem | null {
  const result = db
    .update(syncQueue)
    .set({ syncedAt })
    .where(eq(syncQueue.id, id))
    .returning()
    .get();

  return result ?? null;
}

/**
 * Deletes synchronized items older than a given timestamp to prune queue size.
 */
export function clearSyncedItems(
  olderThanTimestamp: number = Math.floor(Date.now() / 1000),
  db: SlothDatabase = defaultDb
): number {
  const result = db
    .delete(syncQueue)
    .where(
      and(
        sql`${syncQueue.syncedAt} IS NOT NULL`,
        lte(syncQueue.syncedAt, olderThanTimestamp)
      )
    )
    .run();

  return result.changes;
}

/**
 * Deletes a sync item by ID.
 */
export function deleteSyncItem(id: string, db: SlothDatabase = defaultDb): boolean {
  const result = db.delete(syncQueue).where(eq(syncQueue.id, id)).run();
  return result.changes > 0;
}
