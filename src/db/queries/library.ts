/**
 * Sloth Library Query Helpers
 * Manages liked songs, followed artists, and saved albums.
 */

import { eq, desc } from 'drizzle-orm';
import { db as defaultDb, SlothDatabase } from '../index';
import {
  likedSongs,
  LikedSong,
  NewLikedSong,
  followedArtists,
  FollowedArtist,
  NewFollowedArtist,
  savedAlbums,
  SavedAlbum,
  NewSavedAlbum,
} from '../schema';

/**
 * 1. Liked Songs
 */
export function likeSong(
  song: NewLikedSong,
  db: SlothDatabase = defaultDb
): LikedSong {
  const result = db
    .insert(likedSongs)
    .values(song)
    .onConflictDoUpdate({
      target: likedSongs.trackId,
      set: {
        title: song.title,
        artist: song.artist,
        album: song.album,
        coverUrl: song.coverUrl,
        durationMs: song.durationMs,
        source: song.source,
        likedAt: song.likedAt ?? Math.floor(Date.now() / 1000),
      },
    })
    .returning()
    .get();

  return result;
}

export function unlikeSong(
  trackId: string,
  db: SlothDatabase = defaultDb
): boolean {
  const result = db.delete(likedSongs).where(eq(likedSongs.trackId, trackId)).run();
  return result.changes > 0;
}

export function isSongLiked(
  trackId: string,
  db: SlothDatabase = defaultDb
): boolean {
  const result = db
    .select({ trackId: likedSongs.trackId })
    .from(likedSongs)
    .where(eq(likedSongs.trackId, trackId))
    .get();
  return !!result;
}

export function getAllLikedSongs(
  limit: number = 1000,
  db: SlothDatabase = defaultDb
): LikedSong[] {
  return db
    .select()
    .from(likedSongs)
    .orderBy(desc(likedSongs.likedAt))
    .limit(limit)
    .all();
}

/**
 * 2. Followed Artists
 */
export function followArtist(
  artist: NewFollowedArtist,
  db: SlothDatabase = defaultDb
): FollowedArtist {
  const result = db
    .insert(followedArtists)
    .values(artist)
    .onConflictDoUpdate({
      target: followedArtists.artistId,
      set: {
        name: artist.name,
        imageUrl: artist.imageUrl,
        followedAt: artist.followedAt ?? Math.floor(Date.now() / 1000),
      },
    })
    .returning()
    .get();

  return result;
}

export function unfollowArtist(
  artistId: string,
  db: SlothDatabase = defaultDb
): boolean {
  const result = db.delete(followedArtists).where(eq(followedArtists.artistId, artistId)).run();
  return result.changes > 0;
}

export function isArtistFollowed(
  artistId: string,
  db: SlothDatabase = defaultDb
): boolean {
  const result = db
    .select({ artistId: followedArtists.artistId })
    .from(followedArtists)
    .where(eq(followedArtists.artistId, artistId))
    .get();
  return !!result;
}

export function getAllFollowedArtists(
  limit: number = 1000,
  db: SlothDatabase = defaultDb
): FollowedArtist[] {
  return db
    .select()
    .from(followedArtists)
    .orderBy(desc(followedArtists.followedAt))
    .limit(limit)
    .all();
}

/**
 * 3. Saved Albums
 */
export function saveAlbum(
  album: NewSavedAlbum,
  db: SlothDatabase = defaultDb
): SavedAlbum {
  const result = db
    .insert(savedAlbums)
    .values(album)
    .onConflictDoUpdate({
      target: savedAlbums.albumId,
      set: {
        title: album.title,
        artist: album.artist,
        coverUrl: album.coverUrl,
        releaseYear: album.releaseYear,
        savedAt: album.savedAt ?? Math.floor(Date.now() / 1000),
      },
    })
    .returning()
    .get();

  return result;
}

export function unsaveAlbum(
  albumId: string,
  db: SlothDatabase = defaultDb
): boolean {
  const result = db.delete(savedAlbums).where(eq(savedAlbums.albumId, albumId)).run();
  return result.changes > 0;
}

export function isAlbumSaved(
  albumId: string,
  db: SlothDatabase = defaultDb
): boolean {
  const result = db
    .select({ albumId: savedAlbums.albumId })
    .from(savedAlbums)
    .where(eq(savedAlbums.albumId, albumId))
    .get();
  return !!result;
}

export function getAllSavedAlbums(
  limit: number = 1000,
  db: SlothDatabase = defaultDb
): SavedAlbum[] {
  return db
    .select()
    .from(savedAlbums)
    .orderBy(desc(savedAlbums.savedAt))
    .limit(limit)
    .all();
}
