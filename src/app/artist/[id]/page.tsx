/**
 * Ensure any repository we take reference from or code from isn't referenced or spoken about anywhere either in files or readme or code
 * Original: packages/player/src/views/Artist/Artist.tsx
 * Adapted for Sloth by syedzahidsaleem2@gmail.com
 * Changes: [styling system, data layer, routing, top tracks, albums grid, similar artists, biography]
 */

import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Play, Heart, Disc3, Users, FileText, Music2 } from 'lucide-react';
import { TrackRow, AlbumCard, ArtistCard, Track, Button, Badge } from '@/components/ui';

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
      { id: 'm83-6', title: 'My Tears Are Becoming a Sea', artist: 'M83', album: "Hurry Up, We're Dreaming", durationSeconds: 151, coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=120&q=80' },
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
    <div className="surface-background relative min-h-full pb-12 select-none" data-testid="artist-page">
      {/* Top Banner with gradient fade to page surface */}
      <div className="border-border relative h-64 md:h-80 w-full overflow-hidden border-b-(length:--border-width)">
        <img
          src={artist.bannerUrl}
          alt={artist.name}
          className="size-full object-cover select-none pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

        {/* Artist Profile Header Overlay */}
        <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Circular Avatar */}
            <div className="border-border size-24 md:size-28 shrink-0 overflow-hidden rounded-full border-2 bg-muted/60 shadow-shadow">
              <img
                src={artist.avatarUrl}
                alt={artist.name}
                className="size-full object-cover"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Badge variant="pill" color="purple" className="w-fit text-[10px] font-mono">
                Verified Artist
              </Badge>
              <h1 className="text-foreground text-4xl md:text-5xl font-extrabold tracking-tight">
                {artist.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                {artist.tags.map((tag) => (
                  <Badge key={tag} variant="pill" color="cyan" className="text-[10px]">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              size="default"
              variant="default"
              onClick={() => onPlayArtist?.(artist.name)}
              className="flex items-center gap-2"
            >
              <Play size={15} className="fill-current" />
              <span>Play Artist</span>
            </Button>
            <Button
              size="icon"
              variant={isFavorited ? 'default' : 'secondary'}
              onClick={() => setIsFavorited(!isFavorited)}
              aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart size={16} className={isFavorited ? 'fill-current' : ''} />
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-6 mt-6">
        <div className="border-border flex items-center gap-2 border-b-(length:--border-width) pb-2">
          <Button
            size="sm"
            variant={activeTab === 'tracks' ? 'default' : 'text'}
            onClick={() => setActiveTab('tracks')}
            className="flex items-center gap-1.5"
          >
            <Music2 size={13} />
            <span>Top Tracks</span>
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'albums' ? 'default' : 'text'}
            onClick={() => setActiveTab('albums')}
            className="flex items-center gap-1.5"
          >
            <Disc3 size={13} />
            <span>Albums</span>
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'similar' ? 'default' : 'text'}
            onClick={() => setActiveTab('similar')}
            className="flex items-center gap-1.5"
          >
            <Users size={13} />
            <span>Similar Artists</span>
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'bio' ? 'default' : 'text'}
            onClick={() => setActiveTab('bio')}
            className="flex items-center gap-1.5"
          >
            <FileText size={13} />
            <span>Biography</span>
          </Button>
        </div>

        {/* Tab Contents */}
        <div className="mt-6">
          {/* TAB 1: Top Tracks */}
          {activeTab === 'tracks' && (
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-1"
            >
              {artist.topTracks.map((track, idx) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={idx}
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
              initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
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
              initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-4 overflow-x-auto pb-4 [scrollbar-width:none]"
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
              initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="surface-card border-border shadow-shadow max-w-3xl p-5 rounded-[4px] border-(length:--border-width) space-y-4"
            >
              <div className="border-border flex items-center justify-between pb-2 border-b-(length:--border-width)">
                <span className="text-primary font-mono text-xs uppercase">
                  Source: Last.fm & MusicBrainz
                </span>
                <span className="text-muted-foreground font-mono text-xs">
                  {artist.monthlyListeners.toLocaleString()} monthly listeners
                </span>
              </div>
              <p
                className={`text-foreground/80 text-sm leading-relaxed whitespace-pre-line ${
                  isBioExpanded ? '' : 'line-clamp-4'
                }`}
              >
                {artist.bio}
              </p>
              <Button
                size="sm"
                variant="text"
                onClick={() => setIsBioExpanded(!isBioExpanded)}
                className="text-primary font-semibold"
              >
                {isBioExpanded ? 'Show less' : 'Read more biography'}
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
