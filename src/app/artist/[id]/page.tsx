/**
 * Sloth Artist Page (src/app/artist/[id]/page.tsx)
 * Nuclear-derived layout:
 * - Top: Full-width artist banner photo fading to background at bottom
 * - Avatar + Artist Name (text-5xl font-extrabold) + Genre tag badges + Play Artist / Favorite actions
 * - Tabs: "Top Tracks" | "Albums" | "Similar Artists" | "Biography"
 * - Top Tracks: TrackRow ranked 1-10
 * - Albums: AlbumCard responsive grid
 * - Similar Artists: ArtistCard row
 * - Biography: Plain text with expand/collapse toggle
 */

import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Play, Heart, Disc3, Users, FileText, Music2 } from 'lucide-react';
import { TrackRow, AlbumCard, ArtistCard, Track } from '@/components/ui';

export interface ArtistPageProps {
  artistId?: string;
  onPlayTrack?: (track: Track) => void;
  onPlayArtist?: (artistName: string) => void;
  onSelectAlbum?: (albumId: string) => void;
  onSelectArtist?: (artistId: string) => void;
  currentTrackId?: string;
  isPlaying?: boolean;
}

export interface ArtistProfile {
  id: string;
  name: string;
  avatarUrl: string;
  bannerUrl: string;
  tags: string[];
  bio: string;
  monthlyListeners: number;
  topTracks: Track[];
  albums: Array<{ id: string; title: string; year: number; coverUrl: string }>;
  similarArtists: Array<{ id: string; name: string; imageUrl: string; role: string }>;
}

export const SAMPLE_ARTISTS: Record<string, ArtistProfile> = {
  m83: {
    id: 'm83',
    name: 'M83',
    avatarUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1400&q=80',
    tags: ['Electronic', 'Shoegaze', 'Dream Pop', 'Ambient', 'French Synth'],
    monthlyListeners: 8450120,
    bio: `M83 is the musical project of French electronic artist Anthony Gonzalez, formed in 2001 in Antibes, France. The band's lush, cinematic sound draws heavily on 1980s synth-pop, dream pop, and shoegaze textures. 

Their breakthrough 2011 double album "Hurry Up, We're Dreaming" achieved worldwide critical and commercial acclaim, anchored by the iconic lead single "Midnight City". Gonzalez frequently scores blockbuster feature films including Oblivion and Knife + Heart, pairing grand orchestral movements with sweeping analog synthesizers.`,
    topTracks: [
      { id: 'm83-1', title: 'Midnight City', artist: 'M83', album: "Hurry Up, We're Dreaming", durationSeconds: 243, coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=120&q=80' },
      { id: 'm83-2', title: 'Wait', artist: 'M83', album: "Hurry Up, We're Dreaming", durationSeconds: 343, coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=120&q=80' },
      { id: 'm83-3', title: 'Outro', artist: 'M83', album: "Hurry Up, We're Dreaming", durationSeconds: 247, coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=120&q=80' },
      { id: 'm83-4', title: 'Reunion', artist: 'M83', album: "Hurry Up, We're Dreaming", durationSeconds: 235, coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=120&q=80' },
      { id: 'm83-5', title: 'Solitude', artist: 'M83', album: 'Junk', durationSeconds: 363, coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=120&q=80' },
      { id: 'm83-6', title: 'My Tears Are Becoming a Sea', artist: 'M83', album: 'Hurry Up, We\'re Dreaming', durationSeconds: 151, coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=120&q=80' },
    ],
    albums: [
      { id: 'alb-1', title: "Hurry Up, We're Dreaming", year: 2011, coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80' },
      { id: 'alb-m83-2', title: 'Saturdays = Youth', year: 2008, coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80' },
      { id: 'alb-m83-3', title: 'Before the Dawn Heals Us', year: 2005, coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80' },
      { id: 'alb-m83-4', title: 'Junk', year: 2016, coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&q=80' },
    ],
    similarArtists: [
      { id: 'daft-punk', name: 'Daft Punk', imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&q=80', role: 'Electronic Duo' },
      { id: 'justice', name: 'Justice', imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&q=80', role: 'Electro' },
      { id: 'kavinsky', name: 'Kavinsky', imageUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=200&q=80', role: 'French House' },
      { id: 'the-midnight', name: 'The Midnight', imageUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=200&q=80', role: 'Synthwave' },
    ],
  },
  'daft-punk': {
    id: 'daft-punk',
    name: 'Daft Punk',
    avatarUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1400&q=80',
    tags: ['Electronic', 'House', 'French Touch', 'Synthpop', 'Disco'],
    monthlyListeners: 19840200,
    bio: `Daft Punk were a French electronic music duo formed in Paris in 1993 by Thomas Bangalter and Guy-Manuel de Homem-Christo. Widely regarded as one of the most influential acts in dance music history and one of the most popular pop acts of the 2010s, they achieved mainstream popularity in the late 1990s as part of the French touch movement.`,
    topTracks: [
      { id: 'dp-1', title: 'Instant Crush (feat. Julian Casablancas)', artist: 'Daft Punk', album: 'Random Access Memories', durationSeconds: 337, coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=120&q=80' },
      { id: 'dp-2', title: 'Veridis Quo', artist: 'Daft Punk', album: 'Discovery', durationSeconds: 344, coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=120&q=80' },
      { id: 'dp-3', title: 'Get Lucky', artist: 'Daft Punk, Pharrell Williams', album: 'Random Access Memories', durationSeconds: 369, coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=120&q=80' },
      { id: 'dp-4', title: 'One More Time', artist: 'Daft Punk', album: 'Discovery', durationSeconds: 320, coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=120&q=80' },
      { id: 'dp-5', title: 'Harder, Better, Faster, Stronger', artist: 'Daft Punk', album: 'Discovery', durationSeconds: 224, coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=120&q=80' },
    ],
    albums: [
      { id: 'alb-4', title: 'Random Access Memories', year: 2013, coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80' },
      { id: 'alb-5', title: 'Discovery', year: 2001, coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80' },
      { id: 'alb-dp-3', title: 'Homework', year: 1997, coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80' },
      { id: 'alb-dp-4', title: 'Human After All', year: 2005, coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&q=80' },
    ],
    similarArtists: [
      { id: 'justice', name: 'Justice', imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&q=80', role: 'Electro' },
      { id: 'kavinsky', name: 'Kavinsky', imageUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=200&q=80', role: 'French House' },
      { id: 'm83', name: 'M83', imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&q=80', role: 'French Synth' },
    ],
  },
};

type ArtistTab = 'tracks' | 'albums' | 'similar' | 'bio';

export default function ArtistPage({
  artistId = 'm83',
  onPlayTrack,
  onPlayArtist,
  onSelectAlbum,
  onSelectArtist,
  currentTrackId,
  isPlaying,
}: ArtistPageProps) {
  const shouldReduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<ArtistTab>('tracks');
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  const artist = SAMPLE_ARTISTS[artistId] || SAMPLE_ARTISTS.m83;

  return (
    <div className="relative min-h-full pb-12 select-none" data-testid="artist-page">
      {/* Top Banner with gradient fade to page surface */}
      <div className="relative h-64 md:h-80 w-full overflow-hidden border-b border-[var(--border)]">
        <img
          src={artist.bannerUrl}
          alt={artist.name}
          className="size-full object-cover select-none pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/60 to-transparent" />

        {/* Artist Profile Header Overlay */}
        <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Circular Avatar with crisp border */}
            <img
              src={artist.avatarUrl}
              alt={artist.name}
              className="size-24 md:size-28 rounded-full border-2 border-[var(--border)] object-cover shadow-lg"
            />
            <div className="flex flex-col gap-1.5">
              <span className="text-xs uppercase tracking-widest text-[var(--color-accent)] font-mono font-semibold">
                Verified Artist
              </span>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[var(--text-primary)]">
                {artist.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                {artist.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-[4px] bg-[var(--surface-raised)] border border-[var(--border)] text-[11px] text-[var(--text-secondary)] font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onPlayArtist?.(artist.name)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-[6px] bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-semibold text-sm hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-md"
            >
              <Play size={16} fill="currentColor" />
              <span>Play Artist</span>
            </button>
            <button
              type="button"
              onClick={() => setIsFavorited(!isFavorited)}
              className={`p-2.5 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] transition-colors cursor-pointer ${
                isFavorited ? 'text-[var(--color-accent)] border-[var(--color-accent)]/50' : 'text-[var(--text-secondary)] hover:text-white'
              }`}
              title={isFavorited ? 'Favorited' : 'Favorite'}
            >
              <Heart size={18} fill={isFavorited ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs: Top Tracks | Albums | Similar Artists | Biography */}
      <div className="px-6 mt-6">
        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('tracks')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-[4px] text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'tracks'
                ? 'bg-[var(--surface-raised)] text-[var(--color-accent)] border border-[var(--color-accent)]/30'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Music2 size={14} />
            <span>Top Tracks</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('albums')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-[4px] text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'albums'
                ? 'bg-[var(--surface-raised)] text-[var(--color-accent)] border border-[var(--color-accent)]/30'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Disc3 size={14} />
            <span>Albums</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('similar')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-[4px] text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'similar'
                ? 'bg-[var(--surface-raised)] text-[var(--color-accent)] border border-[var(--color-accent)]/30'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Users size={14} />
            <span>Similar Artists</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bio')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-[4px] text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'bio'
                ? 'bg-[var(--surface-raised)] text-[var(--color-accent)] border border-[var(--color-accent)]/30'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <FileText size={14} />
            <span>Biography</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="mt-6">
          {/* TAB 1: Top Tracks (Ranked 1-10) */}
          {activeTab === 'tracks' && (
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-1"
            >
              {artist.topTracks.map((track, idx) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={idx + 1}
                  isCurrent={track.id === currentTrackId}
                  isPlaying={isPlaying && track.id === currentTrackId}
                  onPlay={() => onPlayTrack?.(track)}
                />
              ))}
            </motion.div>
          )}

          {/* TAB 2: Albums Grid */}
          {activeTab === 'albums' && (
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
            >
              {artist.albums.map((alb) => (
                <AlbumCard
                  key={alb.id}
                  title={alb.title}
                  subtitle={String(alb.year)}
                  coverUrl={alb.coverUrl}
                  onClick={() => onSelectAlbum?.(alb.id)}
                  onPlay={() => onPlayTrack?.(artist.topTracks[0])}
                />
              ))}
            </motion.div>
          )}

          {/* TAB 3: Similar Artists */}
          {activeTab === 'similar' && (
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-4 overflow-x-auto pb-4"
            >
              {artist.similarArtists.map((sim) => (
                <ArtistCard
                  key={sim.id}
                  name={sim.name}
                  role={sim.role}
                  imageUrl={sim.imageUrl}
                  onClick={() => onSelectArtist?.(sim.id)}
                />
              ))}
            </motion.div>
          )}

          {/* TAB 4: Biography */}
          {activeTab === 'bio' && (
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="max-w-3xl p-5 rounded-[6px] bg-[var(--surface)] border border-[var(--border)] space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                <span className="text-xs font-mono text-[var(--color-accent)] uppercase">
                  Source: Last.fm & MusicBrainz
                </span>
                <span className="text-xs font-mono text-[var(--text-muted)]">
                  {artist.monthlyListeners.toLocaleString()} monthly listeners
                </span>
              </div>
              <p
                className={`text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-line ${
                  isBioExpanded ? '' : 'line-clamp-4'
                }`}
              >
                {artist.bio}
              </p>
              <button
                type="button"
                onClick={() => setIsBioExpanded(!isBioExpanded)}
                className="text-xs font-semibold text-[var(--color-accent)] hover:underline cursor-pointer"
              >
                {isBioExpanded ? 'Show less' : 'Read more biography'}
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
