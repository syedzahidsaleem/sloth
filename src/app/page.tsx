import { FC, useMemo } from 'react';
import { Play, Heart, Radio, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ViewShell } from '@/components/ui/ViewShell';
import { CardsRow, CardsRowItem } from '@/components/ui/CardsRow';
import { TrackRow, Track } from '@/components/ui/TrackRow';
import { ArtistCard } from '@/components/ui/ArtistCard';
import { useLibraryStore } from '@/stores/libraryStore';
import { FALLBACK_DAILY_MIXES, DailyMix } from '@/services/engineClient';

export interface DashboardPageProps {
  onBrowsePlugins?: () => void;
  onPlayTrack?: (track: Track) => void;
  onSelectArtist?: (artistId: string) => void;
  onSelectAlbum?: (albumId: string) => void;
  tracks?: Track[];
  currentTrackId?: string;
  isPlaying?: boolean;
}

export const RECENTLY_PLAYED_ALBUMS: CardsRowItem[] = [
  {
    id: 'alb-1',
    title: "Hurry Up, We're Dreaming",
    subtitle: 'M83 • 2011',
    imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/cb/7b/a9/cb7ba903-b5f1-cc21-90db-7a81b7aa0997/724596951057.jpg/600x600bb.jpg',
  },
  {
    id: 'alb-starboy',
    title: 'Starboy',
    subtitle: 'The Weeknd • 2016',
    imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/b5/92/bb/b592bb72-52e3-e756-9b26-9f56d08f47ab/16UMGIM67864.rgb.jpg/600x600bb.jpg',
  },
  {
    id: 'alb-random-access',
    title: 'Random Access Memories',
    subtitle: 'Daft Punk • 2013',
    imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/e8/43/5f/e8435ffa-b6b9-b171-40ab-4ff3959ab661/886443919266.jpg/600x600bb.jpg',
  },
  {
    id: 'alb-future-nostalgia',
    title: 'Future Nostalgia',
    subtitle: 'Dua Lipa • 2020',
    imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/6c/11/d6/6c11d681-aa3a-d59e-4c2e-f77e181026ab/190295092665.jpg/600x600bb.jpg',
  },
];

export const FEATURED_ARTISTS = [
  {
    id: 'm83',
    name: 'M83',
    role: 'Synthpop & Electronic',
    imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/cb/7b/a9/cb7ba903-b5f1-cc21-90db-7a81b7aa0997/724596951057.jpg/600x600bb.jpg',
  },
  {
    id: 'daft-punk',
    name: 'Daft Punk',
    role: 'Electronic Duo',
    imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/e8/43/5f/e8435ffa-b6b9-b171-40ab-4ff3959ab661/886443919266.jpg/600x600bb.jpg',
  },
  {
    id: 'the-weeknd',
    name: 'The Weeknd',
    role: 'R&B / Pop',
    imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/b5/92/bb/b592bb72-52e3-e756-9b26-9f56d08f47ab/16UMGIM67864.rgb.jpg/600x600bb.jpg',
  },
  {
    id: 'dua-lipa',
    name: 'Dua Lipa',
    role: 'Dance Pop',
    imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/6c/11/d6/6c11d681-aa3a-d59e-4c2e-f77e181026ab/190295092665.jpg/600x600bb.jpg',
  },
  {
    id: 'anuv-jain',
    name: 'Anuv Jain',
    role: 'Indie Acoustic',
    imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/a7/46/2f/a7462f7e-6dde-b235-2f5e-90e31af919a7/7799192004134_cover.jpg/600x600bb.jpg',
  },
];

export const SLOTH_PICKS = [
  {
    id: 'pick-1',
    title: 'Midnight City',
    subtitle: 'M83 • Synthpop',
    imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/cb/7b/a9/cb7ba903-b5f1-cc21-90db-7a81b7aa0997/724596951057.jpg/600x600bb.jpg',
    badge: 'Neural Match (98%)',
  },
  {
    id: 'pick-2',
    title: 'Instant Crush',
    subtitle: 'Daft Punk • Electronic',
    imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/e8/43/5f/e8435ffa-b6b9-b171-40ab-4ff3959ab661/886443919266.jpg/600x600bb.jpg',
    badge: 'Hypergraph GNN',
  },
  {
    id: 'pick-3',
    title: 'Veridis Quo',
    subtitle: 'Daft Punk • House',
    imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/fd/4a/77/fd4a77db-0ebc-d043-41a2-f32fa1bb0fb4/dj.qrikkdwj.jpg/600x600bb.jpg',
    badge: 'MERT Timbre',
  },
  {
    id: 'pick-4',
    title: 'Starboy',
    subtitle: 'The Weeknd • Pop',
    imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/b5/92/bb/b592bb72-52e3-e756-9b26-9f56d08f47ab/16UMGIM67864.rgb.jpg/600x600bb.jpg',
    badge: 'BERT4Rec Next',
  },
];

export const TRENDING_TRACKS: Track[] = [
  {
    id: 'tr-1',
    title: 'Midnight City',
    artist: 'M83',
    album: "Hurry Up, We're Dreaming",
    durationSeconds: 243,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/cb/7b/a9/cb7ba903-b5f1-cc21-90db-7a81b7aa0997/724596951057.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/24/09/79/2409794c-3d5d-af26-580e-7dc00ee4f207/mzaf_369629549966021675.plus.aac.p.m4a',
    isFavorite: true,
  },
  {
    id: 'tr-2',
    title: 'Instant Crush',
    artist: 'Daft Punk ft. Julian Casablancas',
    album: 'Random Access Memories',
    durationSeconds: 337,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/e8/43/5f/e8435ffa-b6b9-b171-40ab-4ff3959ab661/886443919266.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/dc/1e/c2/dc1ec21b-96a0-470c-ee89-2b09346fa847/mzaf_7827098614541126525.plus.aac.p.m4a',
    isFavorite: false,
  },
  {
    id: 'tr-3',
    title: 'Starboy',
    artist: 'The Weeknd, Daft Punk',
    album: 'Starboy',
    durationSeconds: 230,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/b5/92/bb/b592bb72-52e3-e756-9b26-9f56d08f47ab/16UMGIM67864.rgb.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/11/71/d6/1171d6ad-3c96-e027-2af6-58028426588c/mzaf_15137631797407745471.plus.aac.p.m4a',
    isFavorite: false,
  },
  {
    id: 'tr-4',
    title: 'BAARISHEIN',
    artist: 'Anuv Jain',
    album: 'Baarishein - Single',
    durationSeconds: 208,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/a7/46/2f/a7462f7e-6dde-b235-2f5e-90e31af919a7/7799192004134_cover.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/22/a0/7d/22a07d46-b904-0717-95da-ec335aac6407/mzaf_13582924850644616784.plus.aac.p.m4a',
    isFavorite: true,
  },
];

export const DashboardPage: FC<DashboardPageProps> = ({
  onBrowsePlugins,
  onPlayTrack,
  onSelectArtist,
  onSelectAlbum,
  tracks = [],
  currentTrackId,
  isPlaying,
}) => {
  const { isLiked, toggleLikeSong } = useLibraryStore();
  const displayTracks = tracks.length > 0 ? tracks : TRENDING_TRACKS;

  // Time-based greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Quick 6 shortcut items
  const quickShortcuts = [
    {
      id: 'sc-liked',
      title: 'Liked Songs',
      coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&auto=format&fit=crop&q=80',
      icon: <Heart size={20} className="fill-accent-red text-accent-red" />,
      onClick: () => onPlayTrack?.(displayTracks[0]),
    },
    {
      id: 'sc-dm1',
      title: 'Daily Mix 1',
      coverUrl: FALLBACK_DAILY_MIXES[0].coverUrl,
      onClick: () => onPlayTrack?.(FALLBACK_DAILY_MIXES[0].tracks[0]),
    },
    {
      id: 'sc-dm2',
      title: 'Daily Mix 2',
      coverUrl: FALLBACK_DAILY_MIXES[1].coverUrl,
      onClick: () => onPlayTrack?.(FALLBACK_DAILY_MIXES[1].tracks[0]),
    },
    {
      id: 'sc-m83',
      title: 'M83 Radio',
      coverUrl: FEATURED_ARTISTS[0].imageUrl,
      icon: <Radio size={18} className="text-[var(--primary)]" />,
      onClick: () => onSelectArtist?.('M83'),
    },
    {
      id: 'sc-daftpunk',
      title: 'Daft Punk',
      coverUrl: FEATURED_ARTISTS[1].imageUrl,
      onClick: () => onSelectArtist?.('Daft Punk'),
    },
    {
      id: 'sc-weeknd',
      title: 'The Weeknd',
      coverUrl: FEATURED_ARTISTS[2].imageUrl,
      onClick: () => onSelectArtist?.('The Weeknd'),
    },
  ];

  return (
    <ViewShell
      data-testid="dashboard-view"
      title={greeting}
      headerActions={
        <div className="flex items-center gap-2">
          {onBrowsePlugins && (
            <Button
              size="xs"
              variant="default"
              onClick={onBrowsePlugins}
              className="font-bold text-xs gap-1.5"
            >
              Browse Plugins
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-8 pb-12 w-full font-sans select-none">
        {/* ROW 1: Time-Based Greeting + 6 Quick Shortcuts Grid */}
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {quickShortcuts.map((sc) => (
              <div
                key={sc.id}
                onClick={sc.onClick}
                className="group relative flex items-center gap-3 overflow-hidden rounded-md border-2 border-border surface-muted hover:surface-card hover:shadow-[3px_3px_0px_var(--border)] transition-all cursor-pointer p-0 pr-3"
              >
                <div className="size-14 shrink-0 overflow-hidden border-r-2 border-border bg-black/20 flex items-center justify-center">
                  {sc.icon ? (
                    sc.icon
                  ) : (
                    <img
                      src={sc.coverUrl}
                      alt={sc.title}
                      className="size-full object-cover pointer-events-none select-none"
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-foreground truncate">
                    {sc.title}
                  </div>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity size-8 rounded-full bg-[var(--primary)] text-foreground flex items-center justify-center shadow-[1px_1px_0px_var(--border)] shrink-0">
                  <Play size={13} className="fill-current translate-x-0.5" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ROW 2: Jump Back In */}
        <CardsRow
          title="Jump Back In"
          subtitle="Recently played albums and sessions"
          items={RECENTLY_PLAYED_ALBUMS.map((item) => ({
            ...item,
            onClick: () => onSelectAlbum?.(item.id),
          }))}
        />

        {/* ROW 3: Top Mixes (Daily Mixes 1 - 6) */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground">Top Mixes</h3>
              <p className="text-xs opacity-60 text-foreground">Fresh daily mixes tailored to your taste</p>
            </div>
            <span className="text-xs font-mono opacity-50 text-foreground">Updated Today</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {FALLBACK_DAILY_MIXES.map((mix: DailyMix) => (
              <div
                key={mix.id}
                onClick={() => onPlayTrack?.(mix.tracks[0])}
                className="group relative flex flex-col p-2.5 rounded-md border-2 border-border surface-muted hover:surface-card hover:shadow-[3px_3px_0px_var(--border)] transition-all cursor-pointer"
              >
                <div className="relative aspect-square w-full rounded overflow-hidden border border-border bg-black/20 mb-2">
                  <img
                    src={mix.coverUrl}
                    alt={mix.title}
                    className="size-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                    <div className="size-9 rounded-full bg-[var(--primary)] text-foreground flex items-center justify-center shadow-[2px_2px_0px_var(--border)]">
                      <Play size={14} className="fill-current translate-x-0.5" />
                    </div>
                  </div>
                </div>

                <div className="text-xs font-bold text-foreground truncate">{mix.title}</div>
                <div className="text-[11px] opacity-70 text-foreground truncate mt-0.5">{mix.genre}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ROW 4: More of What You Like (Neural Gated Fusion) */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground">More of What You Like</h3>
              <p className="text-xs opacity-60 text-foreground">Synthesized via LightHGCN + MERT acoustic embeddings</p>
            </div>
            <span className="text-xs font-mono text-[var(--primary)] flex items-center gap-1">
              <Sparkles size={12} />
              AI Matched
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {displayTracks.slice(0, 4).map((track) => (
              <div
                key={`pick-${track.id}`}
                onClick={() => onPlayTrack?.(track)}
                className="surface-card border-border shadow-[2px_2px_0px_var(--border)] group relative flex flex-col rounded-md border-2 p-3 transition-transform hover:-translate-y-0.5 cursor-pointer"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded border border-border mb-2.5">
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    className="size-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute top-2 right-2 rounded bg-black/80 px-2 py-0.5 text-[10px] font-bold text-white border border-white/20">
                    Neural Match (98%)
                  </div>
                </div>
                <div className="text-xs font-bold text-foreground truncate">{track.title}</div>
                <div className="text-[11px] opacity-70 text-foreground truncate mt-0.5">{track.artist}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ROW 5: Recently Played Artists */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground">Recently Played Artists</h3>
            <span className="text-xs opacity-50 text-foreground">Top Affinities</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {FEATURED_ARTISTS.map((artist) => (
              <ArtistCard
                key={artist.id}
                name={artist.name}
                role={artist.role}
                imageUrl={artist.imageUrl}
                onClick={() => onSelectArtist?.(artist.name || artist.id)}
              />
            ))}
          </div>
        </div>

        {/* ROW 6: Based on Recent Listening */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground">Based on Recent Listening</h3>
              <p className="text-xs opacity-60 text-foreground">Tracks with similar tempo, valence, and key signature</p>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            {displayTracks.map((track, i) => (
              <TrackRow
                key={track.id}
                track={{
                  ...track,
                  isFavorite: isLiked(track.id),
                }}
                index={i}
                isCurrent={track.id === currentTrackId}
                isPlaying={isPlaying && track.id === currentTrackId}
                onPlay={onPlayTrack}
                onFavoriteToggle={() => toggleLikeSong(track)}
              />
            ))}
          </div>
        </div>

        {/* ROW 7: New Releases & Discovery */}
        <CardsRow
          title="New Releases & Discovery"
          subtitle="Explore the latest album drops"
          items={RECENTLY_PLAYED_ALBUMS.map((item) => ({
            ...item,
            onClick: () => onSelectAlbum?.(item.title || item.id),
          }))}
        />
      </div>
    </ViewShell>
  );
};

export default DashboardPage;
