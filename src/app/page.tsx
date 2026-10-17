/**
 * Sloth Dashboard / Home Page (src/app/page.tsx)
 * Nuclear-derived content-first layout:
 * - Top-right: Source status indicator (green dot when all sources OK)
 * - "Recently Played" horizontal scroll row of AlbumCards
 * - "Sloth Picks for You" row (algorithmic hypergraph recommendations)
 * - "Trending & New Releases" row
 * - "Top Tracks" high-density list
 * Flat UI, NO hero banner, NO glassmorphism.
 */

import { motion, useReducedMotion, Variants } from 'motion/react';
import { Sparkles, Clock, TrendingUp, CheckCircle2, Play } from 'lucide-react';
import { AlbumCard, TrackRow, Track } from '@/components/ui';

export interface DashboardPageProps {
  onPlayTrack?: (track: Track) => void;
  onPlayAlbum?: (albumTitle: string) => void;
  onSelectArtist?: (artistId: string) => void;
  onSelectAlbum?: (albumId: string) => void;
  currentTrackId?: string;
  isPlaying?: boolean;
}

export const RECENTLY_PLAYED_ALBUMS = [
  {
    id: 'alb-1',
    title: "Hurry Up, We're Dreaming",
    subtitle: 'M83 • 2011',
    coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80',
    artistId: 'm83',
  },
  {
    id: 'alb-2',
    title: 'Starboy',
    subtitle: 'The Weeknd • 2016',
    coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&q=80',
    artistId: 'the-weeknd',
  },
  {
    id: 'alb-3',
    title: 'Odyssey',
    subtitle: 'HOME • 2014',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
    artistId: 'home',
  },
  {
    id: 'alb-4',
    title: 'Random Access Memories',
    subtitle: 'Daft Punk • 2013',
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80',
    artistId: 'daft-punk',
  },
  {
    id: 'alb-5',
    title: 'Discovery',
    subtitle: 'Daft Punk • 2001',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80',
    artistId: 'daft-punk',
  },
];

export const SLOTH_PICKS = [
  {
    id: 'pick-alb-1',
    title: 'Days of Thunder',
    subtitle: 'The Midnight • Synthwave',
    badge: '98% Neural Match',
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&q=80',
    artistId: 'the-midnight',
  },
  {
    id: 'pick-alb-2',
    title: 'Cross',
    subtitle: 'Justice • Electro House',
    badge: 'Hypergraph #1',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
    artistId: 'justice',
  },
  {
    id: 'pick-alb-3',
    title: 'OutRun',
    subtitle: 'Kavinsky • French Electro',
    badge: 'MERT Acoustic',
    coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&q=80',
    artistId: 'kavinsky',
  },
  {
    id: 'pick-alb-4',
    title: 'Endless Fantasy',
    subtitle: 'Anamanaguchi • Chiptune',
    badge: 'BERT4Rec Next',
    coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80',
    artistId: 'anamanaguchi',
  },
];

export const TRENDING_TRACKS: Track[] = [
  {
    id: 'trend-1',
    title: 'Midnight City',
    artist: 'M83',
    album: "Hurry Up, We're Dreaming",
    durationSeconds: 243,
    coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80',
    isFavorite: true,
  },
  {
    id: 'trend-2',
    title: 'Starboy',
    artist: 'The Weeknd, Daft Punk',
    album: 'Starboy',
    durationSeconds: 230,
    coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&q=80',
    isFavorite: false,
  },
  {
    id: 'trend-3',
    title: 'Resonance',
    artist: 'HOME',
    album: 'Odyssey',
    durationSeconds: 212,
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
    isFavorite: true,
  },
  {
    id: 'trend-4',
    title: 'Instant Crush',
    artist: 'Daft Punk, Julian Casablancas',
    album: 'Random Access Memories',
    durationSeconds: 337,
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80',
    isFavorite: false,
  },
  {
    id: 'trend-5',
    title: 'Veridis Quo',
    artist: 'Daft Punk',
    album: 'Discovery',
    durationSeconds: 344,
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80',
    isFavorite: true,
  },
];

export default function HomePage({
  onPlayTrack,
  onPlayAlbum,
  onSelectArtist,
  onSelectAlbum,
  currentTrackId,
  isPlaying,
}: DashboardPageProps) {
  const shouldReduceMotion = useReducedMotion();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.06,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.25, ease: 'easeOut' },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6 space-y-8 select-none"
      data-testid="home-dashboard"
    >
      {/* Header bar: Title + Source Status Indicator */}
      <motion.div variants={itemVariants} className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Dashboard
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Unified music streaming with local SQLite persistence & neural scoring
          </p>
        </div>

        {/* Source Status Indicator at top-right (Green dot when operational) */}
        <div
          className="flex items-center gap-2 px-2.5 py-1 rounded-[4px] bg-[var(--surface)] border border-[var(--border)] text-xs font-mono"
          data-testid="sources-status-indicator"
        >
          <span className="relative flex size-2">
            <span className="animate-ping absolute inline-flex size-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[var(--text-secondary)]">All Sources Operational</span>
          <CheckCircle2 size={13} className="text-emerald-400 ml-0.5" />
        </div>
      </motion.div>

      {/* Section 1: "Recently Played" horizontal scroll row of AlbumCards */}
      <motion.section variants={itemVariants} className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-[var(--color-accent)]" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Recently Played</h2>
          </div>
          <span className="text-xs text-[var(--text-muted)] font-mono">5 Albums</span>
        </div>

        <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-thin">
          {RECENTLY_PLAYED_ALBUMS.map((album) => (
            <div key={album.id} className="shrink-0">
              <AlbumCard
                title={album.title}
                subtitle={album.subtitle}
                coverUrl={album.coverUrl}
                onClick={() => onSelectAlbum?.(album.id)}
                onPlay={() => onPlayAlbum?.(album.title)}
              />
            </div>
          ))}
        </div>
      </motion.section>

      {/* Section 2: "Sloth Picks for You" row (Algorithmic recommendations) */}
      <motion.section variants={itemVariants} className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[var(--color-accent)]" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Sloth Picks for You</h2>
          </div>
          <span className="text-xs text-[var(--color-accent)] font-mono">Heterogeneous Hypergraph</span>
        </div>

        <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-thin">
          {SLOTH_PICKS.map((pick) => (
            <div key={pick.id} className="shrink-0">
              <AlbumCard
                title={pick.title}
                subtitle={pick.subtitle}
                coverUrl={pick.coverUrl}
                badge={
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[var(--surface-raised)] border border-[var(--color-accent)]/40 text-[var(--color-accent)] shadow-sm">
                    {pick.badge}
                  </span>
                }
                onClick={() => {
                  if (onSelectArtist) onSelectArtist(pick.artistId);
                  else if (onSelectAlbum) onSelectAlbum(pick.id);
                }}
                onPlay={() => onPlayAlbum?.(pick.title)}
              />
            </div>
          ))}
        </div>
      </motion.section>

      {/* Section 3: "Trending & Top Tracks" High-Density List */}
      <motion.section variants={itemVariants} className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-[var(--color-accent)]" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Trending Tracks</h2>
          </div>
          <button
            type="button"
            onClick={() => onPlayTrack?.(TRENDING_TRACKS[0])}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[var(--surface-raised)] hover:bg-[var(--surface-raised)]/80 border border-[var(--border)] text-xs text-[var(--text-primary)] cursor-pointer transition-colors"
          >
            <Play size={12} fill="currentColor" />
            <span>Play Top Tracks</span>
          </button>
        </div>

        <div className="space-y-1">
          {TRENDING_TRACKS.map((track, idx) => (
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
      </motion.section>
    </motion.div>
  );
}
