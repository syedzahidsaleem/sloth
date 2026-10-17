/**
 * Sloth Database Migration Runner
 * Applies initial DDL schema and future schema migrations.
 */

import type Database from 'better-sqlite3';

export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS artists (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    mbid TEXT,
    bio TEXT,
    image_url TEXT,
    genre_tags TEXT
);
CREATE INDEX IF NOT EXISTS idx_artists_name ON artists(name);

CREATE TABLE IF NOT EXISTS albums (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    artist_id TEXT REFERENCES artists(id) ON DELETE SET NULL,
    release_year INTEGER,
    cover_url TEXT
);
CREATE INDEX IF NOT EXISTS idx_albums_artist_id ON albums(artist_id);
CREATE INDEX IF NOT EXISTS idx_albums_title ON albums(title);

CREATE TABLE IF NOT EXISTS tracks (
    id TEXT PRIMARY KEY NOT NULL,
    isrc TEXT,
    title TEXT NOT NULL,
    artist_id TEXT REFERENCES artists(id) ON DELETE SET NULL,
    album_id TEXT REFERENCES albums(id) ON DELETE SET NULL,
    duration_ms INTEGER,
    bpm REAL,
    key_sig TEXT,
    valence REAL,
    arousal REAL,
    mert_embedding BLOB,
    clap_embedding BLOB,
    play_count INTEGER NOT NULL DEFAULT 0,
    skip_count INTEGER NOT NULL DEFAULT 0,
    last_played_at INTEGER,
    source_url TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_tracks_isrc ON tracks(isrc);
CREATE INDEX IF NOT EXISTS idx_tracks_artist_id ON tracks(artist_id);
CREATE INDEX IF NOT EXISTS idx_tracks_album_id ON tracks(album_id);
CREATE INDEX IF NOT EXISTS idx_tracks_title ON tracks(title);

CREATE TABLE IF NOT EXISTS playlists (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    track_ids TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_playlists_name ON playlists(name);

CREATE TABLE IF NOT EXISTS listening_events (
    id TEXT PRIMARY KEY NOT NULL,
    track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    skip_at_ms INTEGER,
    source TEXT,
    context_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_listening_events_track_id ON listening_events(track_id);
CREATE INDEX IF NOT EXISTS idx_listening_events_started_at ON listening_events(started_at);

CREATE TABLE IF NOT EXISTS track_overrides (
    isrc TEXT PRIMARY KEY NOT NULL,
    matched_url TEXT NOT NULL,
    user_confirmed INTEGER NOT NULL DEFAULT 0,
    confidence_original REAL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS user_prefs (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    payload TEXT,
    synced_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_sync_queue_synced_at ON sync_queue(synced_at);

CREATE TABLE IF NOT EXISTS lyrics (
    track_id TEXT PRIMARY KEY NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    lrc_content TEXT,
    plain_content TEXT,
    source TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
`;

/**
 * Initializes the SQLite database schema if tables do not already exist.
 */
export function initSchema(sqlite: Database.Database): void {
  sqlite.exec(SCHEMA_SQL);
}
