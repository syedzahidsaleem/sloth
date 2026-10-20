/**
 * Sloth Album Detail Page
 * Author: Syed Zahid Saleem <syedzahidsaleem2@gmail.com>
 */

import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Play, Shuffle, Download, Disc3, Clock, Calendar, Check, Heart } from 'lucide-react';
import { TrackRow, Track, Button, Badge } from '@/components/ui';
import { useLibraryStore } from '@/stores/libraryStore';

export interface AlbumPageProps {
  albumId?: string;
  onPlayTrack?: (track: Track) => void;
  onPlayAll?: (tracks: Track[], startIndex?: number) => void;
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
    label: 'Mute',
    genre: 'Electronic / Dream Pop',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/cb/7b/a9/cb7ba903-b5f1-cc21-90db-7a81b7aa0997/724596951057.jpg/600x600bb.jpg',
    totalDurationSeconds: 4412,
    tracks: [
      { id: 'trk-1', title: 'Intro (feat. Zola Jesus)', artist: 'M83', album: "Hurry Up, We're Dreaming", durationSeconds: 322, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/cb/7b/a9/cb7ba903-b5f1-cc21-90db-7a81b7aa0997/724596951057.jpg/600x600bb.jpg', audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/24/09/79/2409794c-3d5d-af26-580e-7dc00ee4f207/mzaf_369629549966021675.plus.aac.p.m4a' },
      { id: 'trk-2', title: 'Midnight City', artist: 'M83', album: "Hurry Up, We're Dreaming", durationSeconds: 243, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/cb/7b/a9/cb7ba903-b5f1-cc21-90db-7a81b7aa0997/724596951057.jpg/600x600bb.jpg', audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/24/09/79/2409794c-3d5d-af26-580e-7dc00ee4f207/mzaf_369629549966021675.plus.aac.p.m4a', isFavorite: true },
      { id: 'trk-3', title: 'Reunion', artist: 'M83', album: "Hurry Up, We're Dreaming", durationSeconds: 235, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/cb/7b/a9/cb7ba903-b5f1-cc21-90db-7a81b7aa0997/724596951057.jpg/600x600bb.jpg', audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/24/09/79/2409794c-3d5d-af26-580e-7dc00ee4f207/mzaf_369629549966021675.plus.aac.p.m4a' },
      { id: 'trk-4', title: 'Wait', artist: 'M83', album: "Hurry Up, We're Dreaming", durationSeconds: 343, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/cb/7b/a9/cb7ba903-b5f1-cc21-90db-7a81b7aa0997/724596951057.jpg/600x600bb.jpg', audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/24/09/79/2409794c-3d5d-af26-580e-7dc00ee4f207/mzaf_369629549966021675.plus.aac.p.m4a' },
      { id: 'trk-5', title: 'Outro', artist: 'M83', album: "Hurry Up, We're Dreaming", durationSeconds: 247, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/cb/7b/a9/cb7ba903-b5f1-cc21-90db-7a81b7aa0997/724596951057.jpg/600x600bb.jpg', audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/24/09/79/2409794c-3d5d-af26-580e-7dc00ee4f207/mzaf_369629549966021675.plus.aac.p.m4a' },
    ],
  },
  'alb-starboy': {
    id: 'alb-starboy',
    title: 'Starboy',
    artist: 'The Weeknd',
    artistId: 'the-weeknd',
    releaseYear: 2016,
    label: 'XO / Republic Records',
    genre: 'R&B / Pop',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/b5/92/bb/b592bb72-52e3-e756-9b26-9f56d08f47ab/16UMGIM67864.rgb.jpg/600x600bb.jpg',
    totalDurationSeconds: 4116,
    tracks: [
      { id: 'sb-1', title: 'Starboy (feat. Daft Punk)', artist: 'The Weeknd, Daft Punk', album: 'Starboy', durationSeconds: 230, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/b5/92/bb/b592bb72-52e3-e756-9b26-9f56d08f47ab/16UMGIM67864.rgb.jpg/600x600bb.jpg', audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/11/71/d6/1171d6ad-3c96-e027-2af6-58028426588c/mzaf_15137631797407745471.plus.aac.p.m4a', isFavorite: true },
      { id: 'sb-2', title: 'Party Monster', artist: 'The Weeknd', album: 'Starboy', durationSeconds: 249, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/b5/92/bb/b592bb72-52e3-e756-9b26-9f56d08f47ab/16UMGIM67864.rgb.jpg/600x600bb.jpg' },
      { id: 'sb-3', title: 'I Feel It Coming (feat. Daft Punk)', artist: 'The Weeknd, Daft Punk', album: 'Starboy', durationSeconds: 269, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/b5/92/bb/b592bb72-52e3-e756-9b26-9f56d08f47ab/16UMGIM67864.rgb.jpg/600x600bb.jpg' },
    ],
  },
  'alb-random-access': {
    id: 'alb-random-access',
    title: 'Random Access Memories',
    artist: 'Daft Punk',
    artistId: 'daft-punk',
    releaseYear: 2013,
    label: 'Columbia',
    genre: 'Electronic / Disco',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/e8/43/5f/e8435ffa-b6b9-b171-40ab-4ff3959ab661/886443919266.jpg/600x600bb.jpg',
    totalDurationSeconds: 4464,
    tracks: [
      { id: 'ram-1', title: 'Give Life Back to Music', artist: 'Daft Punk', album: 'Random Access Memories', durationSeconds: 275, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/e8/43/5f/e8435ffa-b6b9-b171-40ab-4ff3959ab661/886443919266.jpg/600x600bb.jpg' },
      { id: 'ram-2', title: 'Instant Crush (feat. Julian Casablancas)', artist: 'Daft Punk', album: 'Random Access Memories', durationSeconds: 337, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/e8/43/5f/e8435ffa-b6b9-b171-40ab-4ff3959ab661/886443919266.jpg/600x600bb.jpg', audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/dc/1e/c2/dc1ec21b-96a0-470c-ee89-2b09346fa847/mzaf_7827098614541126525.plus.aac.p.m4a', isFavorite: true },
      { id: 'ram-3', title: 'Get Lucky (feat. Pharrell Williams)', artist: 'Daft Punk', album: 'Random Access Memories', durationSeconds: 369, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/e8/43/5f/e8435ffa-b6b9-b171-40ab-4ff3959ab661/886443919266.jpg/600x600bb.jpg' },
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
  const { isAlbumSaved, toggleSaveAlbum, isLiked, toggleLikeSong } = useLibraryStore();

  const album =
    SAMPLE_ALBUMS[albumId] ||
    Object.values(SAMPLE_ALBUMS).find(
      (a) => a.title.toLowerCase() === albumId.toLowerCase()
    ) ||
    SAMPLE_ALBUMS['alb-1'];

  const isSaved = isAlbumSaved(album.id) || isAlbumSaved(album.title);

  return (
    <div className="surface-background p-6 space-y-8 select-none" data-testid="album-page">
      {/* Album Top Header Hero */}
      <motion.div
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col md:flex-row items-center md:items-end gap-6 bg-muted/40 p-6 rounded-lg border-2 border-border shadow-shadow"
      >
        {/* Album Cover Art */}
        <div className="border-border size-48 md:size-56 shrink-0 overflow-hidden rounded-md border-2 bg-muted/80 shadow-shadow">
          <img
            src={album.coverUrl}
            alt={album.title}
            className="size-full object-cover select-none pointer-events-none"
          />
        </div>

        {/* Metadata Details */}
        <div className="flex flex-col justify-end gap-2 flex-1 text-center md:text-left min-w-0">
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
              onClick={() => onSelectArtist?.(album.artistId || album.artist)}
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

          {/* Action Row: Play All, Shuffle, Save Album, Download All */}
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
              variant={isSaved ? 'default' : 'secondary'}
              onClick={() =>
                toggleSaveAlbum({
                  id: album.id,
                  title: album.title,
                  artist: album.artist,
                  coverUrl: album.coverUrl,
                  releaseYear: album.releaseYear,
                })
              }
              data-testid="album-save-button"
              className="flex items-center gap-2"
            >
              <Heart size={14} className={isSaved ? 'fill-current' : ''} />
              <span>{isSaved ? 'Saved to Library' : 'Save Album'}</span>
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
              track={{
                ...track,
                isFavorite: isLiked(track.id),
              }}
              index={idx}
              isCurrent={track.id === currentTrackId}
              isPlaying={isPlaying && track.id === currentTrackId}
              onPlay={() => {
                if (onPlayAll) {
                  onPlayAll(album.tracks, idx);
                } else if (onPlayTrack) {
                  onPlayTrack(track);
                }
              }}
              onFavoriteToggle={() => toggleLikeSong(track)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
