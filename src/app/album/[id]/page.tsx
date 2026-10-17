/**
 * Sloth Album Page (src/app/album/[id]/page.tsx)
 * Nuclear-derived layout:
 * - Header: 240x240 cover art + album title, artist, year, label, duration metadata
 * - Action row: Play All, Shuffle, Add to Playlist, Download All
 * - Tracklist: Sequential TrackRow list with track numbers
 */

import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Play, Shuffle, Download, Disc3, Clock, Calendar, Check } from 'lucide-react';
import { TrackRow, Track } from '@/components/ui';

export interface AlbumPageProps {
  albumId?: string;
  onPlayTrack?: (track: Track) => void;
  onPlayAll?: (tracks: Track[]) => void;
  onSelectArtist?: (artistId: string) => void;
  currentTrackId?: string;
  isPlaying?: boolean;
}

export interface AlbumDetail {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  releaseYear: number;
  label: string;
  coverUrl: string;
  totalDurationSeconds: number;
  genre: string;
  tracks: Track[];
}

export const SAMPLE_ALBUMS: Record<string, AlbumDetail> = {
  'alb-1': {
    id: 'alb-1',
    title: "Hurry Up, We're Dreaming",
    artist: 'M83',
    artistId: 'm83',
    releaseYear: 2011,
    label: 'Naïve / Mute',
    genre: 'Electronic / Dream Pop',
    coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&q=80',
    totalDurationSeconds: 4412,
    tracks: [
      { id: 'trk-1', title: 'Intro (feat. Zola Jesus)', artist: 'M83', album: "Hurry Up, We're Dreaming", durationSeconds: 322, coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=120&q=80' },
      { id: 'trk-2', title: 'Midnight City', artist: 'M83', album: "Hurry Up, We're Dreaming", durationSeconds: 243, coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=120&q=80', isFavorite: true },
      { id: 'trk-3', title: 'Reunion', artist: 'M83', album: "Hurry Up, We're Dreaming", durationSeconds: 235, coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=120&q=80' },
      { id: 'trk-4', title: 'Wait', artist: 'M83', album: "Hurry Up, We're Dreaming", durationSeconds: 343, coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=120&q=80' },
      { id: 'trk-5', title: 'Raconte-Moi Une Histoire', artist: 'M83', album: "Hurry Up, We're Dreaming", durationSeconds: 244, coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=120&q=80' },
      { id: 'trk-6', title: 'Claudia Lewis', artist: 'M83', album: "Hurry Up, We're Dreaming", durationSeconds: 271, coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=120&q=80' },
      { id: 'trk-7', title: 'Outro', artist: 'M83', album: "Hurry Up, We're Dreaming", durationSeconds: 247, coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=120&q=80' },
    ],
  },
};

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const hrs = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (hrs > 0) {
    return `${hrs} hr ${remainingMins} min`;
  }
  return `${mins} min`;
}

export default function AlbumPage({
  albumId = 'alb-1',
  onPlayTrack,
  onPlayAll,
  onSelectArtist,
  currentTrackId,
  isPlaying,
}: AlbumPageProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isDownloaded, setIsDownloaded] = useState(false);

  const album = SAMPLE_ALBUMS[albumId] || SAMPLE_ALBUMS['alb-1'];

  return (
    <div className="p-6 space-y-8 select-none" data-testid="album-page">
      {/* Top Album Card: 240x240 artwork + Title + Metadata Chips + Actions */}
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col md:flex-row items-start gap-6 p-6 rounded-[6px] bg-[var(--surface)] border border-[var(--border)]"
      >
        {/* 240x240 Cover Artwork (no glow, flat offset border) */}
        <div className="relative size-48 md:size-60 shrink-0 overflow-hidden rounded-[6px] border border-[var(--border)] bg-[var(--surface-raised)] shadow-md">
          <img
            src={album.coverUrl}
            alt={album.title}
            className="size-full object-cover select-none pointer-events-none"
          />
        </div>

        {/* Album Details & Metadata */}
        <div className="min-w-0 flex-1 flex flex-col justify-between self-stretch">
          <div className="space-y-2">
            <span className="text-xs uppercase font-mono tracking-widest text-[var(--color-accent)] font-semibold">
              Album
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-[var(--text-primary)]">
              {album.title}
            </h1>
            <div className="flex items-center gap-2 text-base text-[var(--text-secondary)]">
              <span>by</span>
              <button
                type="button"
                onClick={() => onSelectArtist?.(album.artistId)}
                className="font-semibold text-[var(--text-primary)] hover:text-[var(--color-accent)] hover:underline cursor-pointer"
              >
                {album.artist}
              </button>
            </div>

            {/* Metadata Badges / Stat Chips */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] bg-[var(--surface-raised)] border border-[var(--border)] text-xs text-[var(--text-secondary)] font-mono">
                <Calendar size={12} className="text-[var(--text-muted)]" />
                <span>{album.releaseYear}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] bg-[var(--surface-raised)] border border-[var(--border)] text-xs text-[var(--text-secondary)] font-mono">
                <Disc3 size={12} className="text-[var(--text-muted)]" />
                <span>{album.tracks.length} tracks</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] bg-[var(--surface-raised)] border border-[var(--border)] text-xs text-[var(--text-secondary)] font-mono">
                <Clock size={12} className="text-[var(--text-muted)]" />
                <span>{formatDuration(album.totalDurationSeconds)}</span>
              </span>
              <span className="px-2.5 py-1 rounded-[4px] bg-[var(--surface-raised)] border border-[var(--border)] text-xs text-[var(--text-secondary)]">
                {album.genre}
              </span>
            </div>
          </div>

          {/* Action Row: Play All, Shuffle, Add to Playlist, Download All */}
          <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-[var(--border)] mt-4">
            <button
              type="button"
              onClick={() => onPlayAll?.(album.tracks)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-[6px] bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-semibold text-sm hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-sm"
              data-testid="album-play-all-button"
            >
              <Play size={16} fill="currentColor" />
              <span>Play All</span>
            </button>
            <button
              type="button"
              onClick={() => onPlayAll?.([...album.tracks].sort(() => Math.random() - 0.5))}
              className="flex items-center gap-2 px-4 py-2.5 rounded-[6px] bg-[var(--surface-raised)] hover:bg-[var(--surface-raised)]/80 border border-[var(--border)] text-sm text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <Shuffle size={15} />
              <span>Shuffle</span>
            </button>
            <button
              type="button"
              onClick={() => setIsDownloaded(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-[6px] bg-[var(--surface-raised)] hover:bg-[var(--surface-raised)]/80 border border-[var(--border)] text-sm text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              {isDownloaded ? <Check size={15} className="text-emerald-400" /> : <Download size={15} />}
              <span>{isDownloaded ? 'Downloaded' : 'Download All'}</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Sequential Tracklist */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Tracklist</h2>
          <span className="text-xs text-[var(--text-muted)] font-mono">
            {album.tracks.length} Tracks • {formatDuration(album.totalDurationSeconds)}
          </span>
        </div>

        <div className="space-y-1">
          {album.tracks.map((track, idx) => (
            <TrackRow
              key={track.id}
              track={track}
              index={idx + 1}
              isCurrent={track.id === currentTrackId}
              isPlaying={isPlaying && track.id === currentTrackId}
              onPlay={() => onPlayTrack?.(track)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
