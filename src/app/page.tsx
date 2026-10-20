import { FC } from 'react';
import { Button } from '@/components/ui/Button';
import { ViewShell } from '@/components/ui/ViewShell';
import { CardsRow, CardsRowItem } from '@/components/ui/CardsRow';
import { TrackRow, Track } from '@/components/ui/TrackRow';

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
    id: 'alb-2',
    title: 'Starboy',
    subtitle: 'The Weeknd • 2016',
    imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/b5/92/bb/b592bb72-52e3-e756-9b26-9f56d08f47ab/16UMGIM67864.rgb.jpg/600x600bb.jpg',
  },
  {
    id: 'alb-3',
    title: 'Random Access Memories',
    subtitle: 'Daft Punk • 2013',
    imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/e8/43/5f/e8435ffa-b6b9-b171-40ab-4ff3959ab661/886443919266.jpg/600x600bb.jpg',
  },
  {
    id: 'alb-4',
    title: 'Future Nostalgia',
    subtitle: 'Dua Lipa • 2020',
    imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/6c/11/d6/6c11d681-aa3a-d59e-4c2e-f77e181026ab/190295092665.jpg/600x600bb.jpg',
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
  onSelectAlbum,
  tracks = [],
  currentTrackId,
  isPlaying,
}) => {
  const displayTracks = tracks.length > 0 ? tracks : TRENDING_TRACKS;

  return (
    <ViewShell
      data-testid="dashboard-view"
      title="Dashboard"
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
      <div className="flex flex-col gap-8 pb-12 w-full">
        {/* Welcome to Sloth Banner */}
        <div className="surface-card border-border shadow-shadow rounded-lg border-(length:--border-width) p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-extrabold tracking-tight text-foreground">
              Welcome to Sloth
            </h2>
            <p className="text-xs text-foreground/70 max-w-xl">
              Unified music streaming with 6-layer Gated Fusion, acoustic embeddings, and community plugins. Play music instantly below.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="default"
              size="sm"
              onClick={() => onPlayTrack?.(displayTracks[0])}
              className="font-bold"
            >
              ▶ Play Trending Mix
            </Button>
            {onBrowsePlugins && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onBrowsePlugins}
                className="font-bold"
              >
                Plugins Store
              </Button>
            )}
          </div>
        </div>

        {/* Sloth Picks / Neural Recommendations */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-foreground">Neural Recommendations</h3>
            <span className="text-xs font-mono text-foreground/50">BERT4Rec + LightHGCN + MERT</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {SLOTH_PICKS.map((pick) => (
              <div
                key={pick.id}
                className="surface-card border-border shadow-shadow group relative flex flex-col rounded-lg border-(length:--border-width) p-3 transition-transform hover:-translate-y-0.5 cursor-pointer"
                onClick={() => {
                  const match = displayTracks.find((t) => t.title.toLowerCase() === pick.title.toLowerCase()) || {
                    id: pick.id,
                    title: pick.title,
                    artist: pick.subtitle.split('•')[0]?.trim() || 'Artist',
                    durationSeconds: 240,
                    coverUrl: pick.imageUrl,
                    isFavorite: false,
                  };
                  onPlayTrack?.(match);
                }}
              >
                <div className="relative aspect-square w-full overflow-hidden rounded border-(length:--border-width) border-border mb-3">
                  <img
                    src={pick.imageUrl}
                    alt={pick.title}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute top-2 right-2 rounded bg-black/80 px-2 py-0.5 text-[10px] font-bold text-white border border-white/20">
                    {pick.badge}
                  </div>
                </div>
                <div className="text-sm font-bold text-foreground truncate">{pick.title}</div>
                <div className="text-xs text-foreground/60 truncate">{pick.subtitle}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recently Played / Featured Albums */}
        <CardsRow
          title="Featured Albums"
          items={RECENTLY_PLAYED_ALBUMS.map((item) => ({
            ...item,
            onClick: () => onSelectAlbum?.(item.id),
          }))}
        />

        {/* Recommended Tracks Table */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-foreground">Trending & Popular Tracks</h3>
            <span className="text-xs text-foreground/50">{displayTracks.length} tracks available</span>
          </div>
          <div className="flex flex-col gap-1">
            {displayTracks.map((track, i) => (
              <TrackRow
                key={track.id}
                track={track}
                index={i + 1}
                isCurrent={track.id === currentTrackId}
                isPlaying={isPlaying && track.id === currentTrackId}
                onPlay={onPlayTrack}
              />
            ))}
          </div>
        </div>
      </div>
    </ViewShell>
  );
};

export default DashboardPage;
