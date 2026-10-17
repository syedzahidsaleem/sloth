-- Sloth Database Schema Initialization
-- Defines canonical tables for audio streaming, acoustic embeddings, listening history,
-- playlists, source overrides, sync queue, user preferences, and lyrics.

PRAGMA foreign_keys = ON;

-- 1. Artists
CREATE TABLE IF NOT EXISTS artists (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    mbid TEXT,
    bio TEXT,
    image_url TEXT,
    genre_tags TEXT
);
CREATE INDEX IF NOT EXISTS idx_artists_name ON artists(name);

-- 2. Albums
CREATE TABLE IF NOT EXISTS albums (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    artist_id TEXT REFERENCES artists(id) ON DELETE SET NULL,
    release_year INTEGER,
    cover_url TEXT
);
CREATE INDEX IF NOT EXISTS idx_albums_artist_id ON albums(artist_id);
CREATE INDEX IF NOT EXISTS idx_albums_title ON albums(title);

-- 3. Tracks (with MERT & CLAP 512-dim embedding BLOBs)
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

-- 4. Playlists
CREATE TABLE IF NOT EXISTS playlists (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    track_ids TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_playlists_name ON playlists(name);

-- 5. Listening Events (Full telemetry for ACT-R decay and hypergraph affinity)
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

-- 6. Track Overrides (ISRC to validated source URL with confidence)
CREATE TABLE IF NOT EXISTS track_overrides (
    isrc TEXT PRIMARY KEY NOT NULL,
    matched_url TEXT NOT NULL,
    user_confirmed INTEGER NOT NULL DEFAULT 0,
    confidence_original REAL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 7. User Preferences (Key-value store)
CREATE TABLE IF NOT EXISTS user_prefs (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
);

-- 8. Sync Queue (Offline-first mutation buffer)
CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    payload TEXT,
    synced_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_sync_queue_synced_at ON sync_queue(synced_at);

-- 9. Lyrics (LRC and plain text with source attribution)
CREATE TABLE IF NOT EXISTS lyrics (
    track_id TEXT PRIMARY KEY NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    lrc_content TEXT,
    plain_content TEXT,
    source TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
