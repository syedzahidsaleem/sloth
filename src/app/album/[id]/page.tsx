/**
 * Ensure any repository we take reference from or code from isn't referenced or spoken about anywhere either in files or readme or code
 * Original: packages/player/src/views/Album/Album.tsx
 * Adapted for Sloth by syedzahidsaleem2@gmail.com
 * Changes: [styling system, data layer, routing, album detail header, stat chips, tracklist]
 */

import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Play, Shuffle, Download, Disc3, Clock, Calendar, Check } from 'lucide-react';
import { TrackRow, Track, Button, Badge } from '@/components/ui';

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
    <div className="surface-background p-6 space-y-8 select-none" data-testid="album-page">
      {/* Top Album Card: Artwork + Title + Metadata Chips + Actions */}
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="surface-card border-border shadow-shadow flex flex-col md:flex-row items-start gap-6 p-6 rounded-[4px] border-(length:--border-width)"
      >
        {/* Cover Artwork */}
        <div className="border-border shadow-shadow relative size-48 md:size-56 shrink-0 overflow-hidden rounded-[4px] border-(length:--border-width) bg-muted/60">
          <img
            src={album.coverUrl}
            alt={album.title}
            className="size-full object-cover select-none pointer-events-none"
          />
        </div>

        {/* Album Details & Metadata */}
        <div className="min-w-0 flex-1 flex flex-col justify-between self-stretch">
          <div className="space-y-2">
            <Badge variant="pill" color="purple" className="text-[10px] font-mono">
              Album
            </Badge>
            <h1 className="text-foreground text-3xl md:text-5xl font-extrabold tracking-tight">
              {album.title}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>by</span>
              <button
                type="button"
                onClick={() => onSelectArtist?.(album.artistId)}
                className="font-bold text-foreground hover:text-primary hover:underline cursor-pointer"
              >
                {album.artist}
              </button>
            </div>

            {/* Metadata Badges / Stat Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Badge variant="pill" color="cyan" className="text-xs font-mono">
                <Calendar size={12} className="mr-1" />
                {album.releaseYear}
              </Badge>
              <Badge variant="pill" color="green" className="text-xs font-mono">
                <Disc3 size={12} className="mr-1" />
                {album.tracks.length} tracks
              </Badge>
              <Badge variant="pill" color="orange" className="text-xs font-mono">
                <Clock size={12} className="mr-1" />
                {formatDuration(album.totalDurationSeconds)}
              </Badge>
              <Badge variant="pill" color="purple" className="text-xs">
                {album.genre}
              </Badge>
            </div>
          </div>

          {/* Action Row: Play All, Shuffle, Add to Playlist, Download All */}
          <div className="border-border flex flex-wrap items-center gap-2.5 pt-5 border-t-(length:--border-width) mt-4">
            <Button
              size="default"
              variant="default"
              onClick={() => onPlayAll?.(album.tracks)}
              className="flex items-center gap-2"
              data-testid="album-play-all-button"
            >
              <Play size={15} className="fill-current" />
              <span>Play All</span>
            </Button>
            <Button
              size="default"
              variant="secondary"
              onClick={() => onPlayAll?.([...album.tracks].sort(() => Math.random() - 0.5))}
              className="flex items-center gap-2"
            >
              <Shuffle size={14} />
              <span>Shuffle</span>
            </Button>
            <Button
              size="default"
              variant="secondary"
              onClick={() => setIsDownloaded(true)}
              className="flex items-center gap-2"
            >
              {isDownloaded ? <Check size={14} className="text-accent-green" /> : <Download size={14} />}
              <span>{isDownloaded ? 'Downloaded' : 'Download All'}</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Sequential Tracklist */}
      <div className="space-y-3">
        <div className="border-border flex items-center justify-between pb-2 border-b-(length:--border-width)">
          <h2 className="text-foreground text-base font-bold tracking-tight">Tracklist</h2>
          <span className="text-muted-foreground font-mono text-xs">
            {album.tracks.length} Tracks • {formatDuration(album.totalDurationSeconds)}
          </span>
        </div>

        <div className="space-y-1">
          {album.tracks.map((track, idx) => (
            <TrackRow
              key={track.id}
              track={track}
              index={idx}
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
