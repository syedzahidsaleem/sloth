/**
 * Sloth Database Connection Manager
 * Manages SQLite connections via better-sqlite3 and Drizzle ORM.
 * Configures WAL mode, foreign key enforcement, and prepared query executions.
 */

import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { initSchema } from './migrations/migrate';

export * from './schema';
export * from './queries';

export type SlothDatabase = BetterSQLite3Database<typeof schema>;

export interface DatabaseConnection {
  db: SlothDatabase;
  sqlite: Database.Database;
  close: () => void;
}

/**
 * Creates a SQLite database connection with Drizzle ORM and runs initialization pragmas.
 * @param dbPath Database file path or ':memory:' for transient/test instances.
 * @param options.autoMigrate Whether to auto-run initSchema DDL (defaults to true).
 */
export function createDatabase(
  dbPath?: string,
  options: { autoMigrate?: boolean } = { autoMigrate: true }
): DatabaseConnection {
  const resolvedPath = dbPath ?? process.env.DATABASE_PATH ?? 'sloth.db';
  const sqlite = new Database(resolvedPath);

  // WAL mode and essential SQLite performance & integrity pragmas
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');
  sqlite.pragma('synchronous = NORMAL');

  if (options.autoMigrate !== false) {
    initSchema(sqlite);
  }

  const db = drizzle(sqlite, { schema });

  return {
    db,
    sqlite,
    close: () => sqlite.close(),
  };
}

let defaultConnection: DatabaseConnection | null = null;

/**
 * Retrieves or lazily creates the default singleton database connection.
 */
export function getDatabase(dbPath?: string): SlothDatabase {
  if (!defaultConnection) {
    defaultConnection = createDatabase(dbPath);
  }
  return defaultConnection.db;
}

/**
 * Closes the default singleton database connection (e.g. on shutdown or test cleanup).
 */
export function closeDatabase(): void {
  if (defaultConnection) {
    defaultConnection.close();
    defaultConnection = null;
  }
}

/**
 * Default singleton database instance.
 */
export const db: SlothDatabase = getDatabase();
