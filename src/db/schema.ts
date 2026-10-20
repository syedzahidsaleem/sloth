/**
 * Sloth Local Database Schema — Drizzle ORM (SQLite)
 * High-density local persistence for canonical tracks, embeddings, playlists,
 * listening events, ISRC overrides, preferences, sync queue, and lyrics.
 */

import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * 1. Artists Table
 */
export const artists = sqliteTable('artists', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  mbid: text('mbid'),
  bio: text('bio'),
  imageUrl: text('image_url'),
  genreTags: text('genre_tags', { mode: 'json' }).$type<string[]>(),
});

/**
 * 2. Albums Table
 */
export const albums = sqliteTable('albums', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  artistId: text('artist_id').references(() => artists.id),
  releaseYear: integer('release_year'),
  coverUrl: text('cover_url'),
});

/**
 * 3. Tracks Table
 * Canonical track metadata with acoustic tags and 512-dim neural embeddings (MERT & CLAP)
 */
export const tracks = sqliteTable('tracks', {
  id: text('id').primaryKey(),
  isrc: text('isrc'),
  title: text('title').notNull(),
  artistId: text('artist_id').references(() => artists.id),
  albumId: text('album_id').references(() => albums.id),
  durationMs: integer('duration_ms'),
  bpm: real('bpm'),
  keySig: text('key_sig'),
  valence: real('valence'),
  arousal: real('arousal'),
  mertEmbedding: blob('mert_embedding', { mode: 'buffer' }),
  clapEmbedding: blob('clap_embedding', { mode: 'buffer' }),
  playCount: integer('play_count').default(0).notNull(),
  skipCount: integer('skip_count').default(0).notNull(),
  lastPlayedAt: integer('last_played_at'),
  sourceUrl: text('source_url'),
  createdAt: integer('created_at').default(sql`(unixepoch())`).notNull(),
});

/**
 * 4. Playlists Table
 */
export const playlists = sqliteTable('playlists', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  trackIds: text('track_ids', { mode: 'json' }).$type<string[]>().default(sql`'[]'`).notNull(),
  createdAt: integer('created_at').default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at').default(sql`(unixepoch())`).notNull(),
});

/**
 * 5. Listening Events Table
 * Logs full listening activity for ACT-R decay, scrobbling, and hypergraph affinity
 */
export const listeningEvents = sqliteTable('listening_events', {
  id: text('id').primaryKey(),
  trackId: text('track_id').references(() => tracks.id).notNull(),
  startedAt: integer('started_at').notNull(),
  endedAt: integer('ended_at'),
  skipAtMs: integer('skip_at_ms'),
  source: text('source'),
  contextJson: text('context_json', { mode: 'json' }).$type<Record<string, unknown>>(),
});

/**
 * 6. Track Overrides Table
 * User overrides mapping canonical ISRC to a confirmed stream URL
 */
export const trackOverrides = sqliteTable('track_overrides', {
  isrc: text('isrc').primaryKey(),
  matchedUrl: text('matched_url').notNull(),
  userConfirmed: integer('user_confirmed', { mode: 'boolean' }).default(false).notNull(),
  confidenceOriginal: real('confidence_original'),
  createdAt: integer('created_at').default(sql`(unixepoch())`).notNull(),
});

/**
 * 7. User Preferences Table
 */
export const userPrefs = sqliteTable('user_prefs', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }).notNull(),
});

/**
 * 8. Sync Queue Table
 * Offline mutation queue for cloud sync
 */
export const syncQueue = sqliteTable('sync_queue', {
  id: text('id').primaryKey(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  operation: text('operation').notNull(), // 'create' | 'update' | 'delete'
  payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>(),
  syncedAt: integer('synced_at'),
});

/**
 * 9. Lyrics Table
 * Cached synchronized LRC and plain lyrics
 */
export const lyrics = sqliteTable('lyrics', {
  trackId: text('track_id').primaryKey().references(() => tracks.id),
  lrcContent: text('lrc_content'),
  plainContent: text('plain_content'),
  source: text('source'),
  createdAt: integer('created_at').default(sql`(unixepoch())`).notNull(),
});

/**
 * 10. Lyrics Translations Table
 * Cached AI translations and transliterations per track and target language
 */
export const lyricsTranslations = sqliteTable('lyrics_translations', {
  id: text('id').primaryKey(), // `${trackId}_${lang}_${mode}`
  trackId: text('track_id').notNull().references(() => tracks.id),
  lang: text('lang').notNull(),
  mode: text('mode').default('Translated').notNull(),
  content: text('content').notNull(), // JSON array string of lines or translated LRC text
  createdAt: integer('created_at').default(sql`(unixepoch())`).notNull(),
});

/**
 * 11. Liked Songs Table
 * User favorite tracks with metadata and timestamp
 */
export const likedSongs = sqliteTable('liked_songs', {
  trackId: text('track_id').primaryKey(),
  title: text('title'),
  artist: text('artist'),
  album: text('album'),
  coverUrl: text('cover_url'),
  durationMs: integer('duration_ms'),
  source: text('source'),
  likedAt: integer('liked_at').default(sql`(unixepoch())`).notNull(),
});

/**
 * 12. Followed Artists Table
 * Followed artists with metadata and timestamp
 */
export const followedArtists = sqliteTable('followed_artists', {
  artistId: text('artist_id').primaryKey(),
  name: text('name').notNull(),
  imageUrl: text('image_url'),
  followedAt: integer('followed_at').default(sql`(unixepoch())`).notNull(),
});

/**
 * 13. Saved Albums Table
 * User saved albums with metadata and timestamp
 */
export const savedAlbums = sqliteTable('saved_albums', {
  albumId: text('album_id').primaryKey(),
  title: text('title').notNull(),
  artist: text('artist'),
  coverUrl: text('cover_url'),
  releaseYear: integer('release_year'),
  savedAt: integer('saved_at').default(sql`(unixepoch())`).notNull(),
});

// Infer model types
export type Track = typeof tracks.$inferSelect;
export type NewTrack = typeof tracks.$inferInsert;

export type Artist = typeof artists.$inferSelect;
export type NewArtist = typeof artists.$inferInsert;

export type Album = typeof albums.$inferSelect;
export type NewAlbum = typeof albums.$inferInsert;

export type Playlist = typeof playlists.$inferSelect;
export type NewPlaylist = typeof playlists.$inferInsert;

export type ListeningEvent = typeof listeningEvents.$inferSelect;
export type NewListeningEvent = typeof listeningEvents.$inferInsert;

export type TrackOverride = typeof trackOverrides.$inferSelect;
export type NewTrackOverride = typeof trackOverrides.$inferInsert;

export type UserPref = typeof userPrefs.$inferSelect;
export type NewUserPref = typeof userPrefs.$inferInsert;

export type SyncQueueItem = typeof syncQueue.$inferSelect;
export type NewSyncQueueItem = typeof syncQueue.$inferInsert;

export type LyricsItem = typeof lyrics.$inferSelect;
export type NewLyricsItem = typeof lyrics.$inferInsert;

export type LyricsTranslationItem = typeof lyricsTranslations.$inferSelect;
export type NewLyricsTranslationItem = typeof lyricsTranslations.$inferInsert;

export type LikedSong = typeof likedSongs.$inferSelect;
export type NewLikedSong = typeof likedSongs.$inferInsert;

export type FollowedArtist = typeof followedArtists.$inferSelect;
export type NewFollowedArtist = typeof followedArtists.$inferInsert;

export type SavedAlbum = typeof savedAlbums.$inferSelect;
export type NewSavedAlbum = typeof savedAlbums.$inferInsert;

