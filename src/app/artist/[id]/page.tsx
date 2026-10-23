/**
 * Sloth Artist Profile Page
 * Author: Syed Zahid Saleem <syedzahidsaleem2@gmail.com>
 */

import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Play, Heart, Disc3, Users, FileText, Music2 } from 'lucide-react';
import { TrackRow, AlbumCard, ArtistCard, Track, Button, Badge } from '@/components/ui';
import { useLibraryStore } from '@/stores/libraryStore';

export interface ArtistPageProps {
  artistId?: string;
  onPlayTrack?: (track: Track) => void;
  onPlayArtist?: (artistName: string) => void;
  onPlayTopTracks?: (tracks: Track[], startIndex?: number) => void;
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
    avatarUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/cb/7b/a9/cb7ba903-b5f1-cc21-90db-7a81b7aa0997/724596951057.jpg/600x600bb.jpg',
    bannerUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/cb/7b/a9/cb7ba903-b5f1-cc21-90db-7a81b7aa0997/724596951057.jpg/600x600bb.jpg',
    tags: ['Electronic', 'Shoegaze', 'Dream Pop', 'Ambient', 'French Synth'],
    monthlyListeners: 8450120,
    bio: `M83 is the musical project of French electronic artist Anthony Gonzalez, formed in 2001 in Antibes, France. The band's lush, cinematic sound draws heavily on 1980s synth-pop, dream pop, and shoegaze textures. 

Their breakthrough 2011 double album "Hurry Up, We're Dreaming" achieved worldwide critical and commercial acclaim, anchored by the iconic lead single "Midnight City". Gonzalez frequently scores blockbuster feature films including Oblivion and Knife + Heart, pairing grand orchestral movements with sweeping analog synthesizers.`,
    topTracks: [
      { id: 'm83-1', title: 'Midnight City', artist: 'M83', album: "Hurry Up, We're Dreaming", durationSeconds: 243, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/cb/7b/a9/cb7ba903-b5f1-cc21-90db-7a81b7aa0997/724596951057.jpg/600x600bb.jpg', audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/24/09/79/2409794c-3d5d-af26-580e-7dc00ee4f207/mzaf_369629549966021675.plus.aac.p.m4a', isFavorite: true },
      { id: 'm83-2', title: 'Wait', artist: 'M83', album: "Hurry Up, We're Dreaming", durationSeconds: 343, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/cb/7b/a9/cb7ba903-b5f1-cc21-90db-7a81b7aa0997/724596951057.jpg/600x600bb.jpg', audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/24/09/79/2409794c-3d5d-af26-580e-7dc00ee4f207/mzaf_369629549966021675.plus.aac.p.m4a' },
      { id: 'm83-3', title: 'Outro', artist: 'M83', album: "Hurry Up, We're Dreaming", durationSeconds: 247, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/cb/7b/a9/cb7ba903-b5f1-cc21-90db-7a81b7aa0997/724596951057.jpg/600x600bb.jpg', audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/24/09/79/2409794c-3d5d-af26-580e-7dc00ee4f207/mzaf_369629549966021675.plus.aac.p.m4a' },
      { id: 'm83-4', title: 'Reunion', artist: 'M83', album: "Hurry Up, We're Dreaming", durationSeconds: 235, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/cb/7b/a9/cb7ba903-b5f1-cc21-90db-7a81b7aa0997/724596951057.jpg/600x600bb.jpg', audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/24/09/79/2409794c-3d5d-af26-580e-7dc00ee4f207/mzaf_369629549966021675.plus.aac.p.m4a' },
    ],
    albums: [
      { id: 'alb-1', title: "Hurry Up, We're Dreaming", year: 2011, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/cb/7b/a9/cb7ba903-b5f1-cc21-90db-7a81b7aa0997/724596951057.jpg/600x600bb.jpg' },
    ],
    similarArtists: [
      { id: 'daft-punk', name: 'Daft Punk', imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/e8/43/5f/e8435ffa-b6b9-b171-40ab-4ff3959ab661/886443919266.jpg/600x600bb.jpg', role: 'Electronic Duo' },
      { id: 'the-weeknd', name: 'The Weeknd', imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/b5/92/bb/b592bb72-52e3-e756-9b26-9f56d08f47ab/16UMGIM67864.rgb.jpg/600x600bb.jpg', role: 'R&B / Pop' },
    ],
  },
  'daft-punk': {
    id: 'daft-punk',
    name: 'Daft Punk',
    avatarUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/e8/43/5f/e8435ffa-b6b9-b171-40ab-4ff3959ab661/886443919266.jpg/600x600bb.jpg',
    bannerUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/fd/4a/77/fd4a77db-0ebc-d043-41a2-f32fa1bb0fb4/dj.qrikkdwj.jpg/600x600bb.jpg',
    tags: ['Electronic', 'House', 'French Touch', 'Synthpop', 'Disco'],
    monthlyListeners: 19840200,
    bio: `Daft Punk were a French electronic music duo formed in Paris in 1993 by Thomas Bangalter and Guy-Manuel de Homem-Christo. Widely regarded as one of the most influential acts in dance music history and one of the most popular pop acts of the 2010s, they achieved mainstream popularity in the late 1990s as part of the French touch movement.`,
    topTracks: [
      { id: 'dp-1', title: 'Instant Crush (feat. Julian Casablancas)', artist: 'Daft Punk', album: 'Random Access Memories', durationSeconds: 337, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/e8/43/5f/e8435ffa-b6b9-b171-40ab-4ff3959ab661/886443919266.jpg/600x600bb.jpg', audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/dc/1e/c2/dc1ec21b-96a0-470c-ee89-2b09346fa847/mzaf_7827098614541126525.plus.aac.p.m4a', isFavorite: true },
      { id: 'dp-2', title: 'Veridis Quo', artist: 'Daft Punk', album: 'Discovery', durationSeconds: 344, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/fd/4a/77/fd4a77db-0ebc-d043-41a2-f32fa1bb0fb4/dj.qrikkdwj.jpg/600x600bb.jpg', audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/e0/cc/c4/e0ccc4af-ad90-59fe-9a7c-9c32d1a3c380/mzaf_2643765405421046671.plus.aac.p.m4a' },
      { id: 'dp-3', title: 'One More Time', artist: 'Daft Punk', album: 'Discovery', durationSeconds: 320, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/fd/4a/77/fd4a77db-0ebc-d043-41a2-f32fa1bb0fb4/dj.qrikkdwj.jpg/600x600bb.jpg', audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/24/09/79/2409794c-3d5d-af26-580e-7dc00ee4f207/mzaf_369629549966021675.plus.aac.p.m4a', isFavorite: true },
    ],
    albums: [
      { id: 'alb-random-access', title: 'Random Access Memories', year: 2013, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/e8/43/5f/e8435ffa-b6b9-b171-40ab-4ff3959ab661/886443919266.jpg/600x600bb.jpg' },
      { id: 'alb-discovery', title: 'Discovery', year: 2001, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/fd/4a/77/fd4a77db-0ebc-d043-41a2-f32fa1bb0fb4/dj.qrikkdwj.jpg/600x600bb.jpg' },
    ],
    similarArtists: [
      { id: 'm83', name: 'M83', imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/cb/7b/a9/cb7ba903-b5f1-cc21-90db-7a81b7aa0997/724596951057.jpg/600x600bb.jpg', role: 'French Electronic' },
      { id: 'the-weeknd', name: 'The Weeknd', imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/b5/92/bb/b592bb72-52e3-e756-9b26-9f56d08f47ab/16UMGIM67864.rgb.jpg/600x600bb.jpg', role: 'R&B / Pop' },
    ],
  },
};

type ArtistTab = 'tracks' | 'albums' | 'similar' | 'bio';

export default function ArtistPage({
  artistId = 'm83',
  onPlayTrack,
  onPlayArtist,
  onPlayTopTracks,
  onSelectAlbum,
  onSelectArtist,
  currentTrackId,
  isPlaying,
}: ArtistPageProps) {
  const shouldReduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<ArtistTab>('tracks');
  const [isBioExpanded, setIsBioExpanded] = useState(false);

  const { isFollowed, toggleFollowArtist, isLiked, toggleLikeSong } = useLibraryStore();

  const cleanKey = artistId.toLowerCase().replace(/\s+/g, '-');
  const artist =
    SAMPLE_ARTISTS[cleanKey] ||
    SAMPLE_ARTISTS[artistId] ||
    Object.values(SAMPLE_ARTISTS).find(
      (a) => a.name.toLowerCase() === artistId.toLowerCase()
    ) ||
    SAMPLE_ARTISTS.m83;

  const isFollowing = isFollowed(artist.id) || isFollowed(artist.name);

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
              variant={isFollowing ? 'default' : 'secondary'}
              onClick={() =>
                toggleFollowArtist({
                  id: artist.id,
                  name: artist.name,
                  imageUrl: artist.avatarUrl,
                })
              }
              data-testid="artist-follow-button"
              title={isFollowing ? 'Unfollow artist' : 'Follow artist'}
              aria-label={isFollowing ? 'Unfollow artist' : 'Follow artist'}
            >
              <Heart size={16} className={isFollowing ? 'fill-current' : ''} />
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
                  track={{
                    ...track,
                    isFavorite: isLiked(track.id),
                  }}
                  index={idx}
                  isCurrent={track.id === currentTrackId}
                  isPlaying={isPlaying && track.id === currentTrackId}
                  onPlay={() => {
                    if (onPlayTopTracks) {
                      onPlayTopTracks(artist.topTracks, idx);
                    } else if (onPlayTrack) {
                      onPlayTrack(track);
                    }
                  }}
                  onFavoriteToggle={() => toggleLikeSong(track)}
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
