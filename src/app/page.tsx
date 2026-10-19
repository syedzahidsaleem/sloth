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
    imageUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80',
  },
  {
    id: 'alb-2',
    title: 'Starboy',
    subtitle: 'The Weeknd • 2016',
    imageUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&q=80',
  },
  {
    id: 'alb-3',
    title: 'Odyssey',
    subtitle: 'HOME • 2014',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
  },
];

export const SLOTH_PICKS = [
  {
    id: 'pick-1',
    title: 'Midnight City',
    subtitle: 'M83 • Synthpop',
    imageUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80',
    badge: 'Neural Match (98%)',
  },
  {
    id: 'pick-2',
    title: 'Resonance',
    subtitle: 'HOME • Chillwave',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
    badge: 'Hypergraph GNN',
  },
  {
    id: 'pick-3',
    title: 'Veridis Quo',
    subtitle: 'Daft Punk • House',
    imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80',
    badge: 'MERT Timbre',
  },
  {
    id: 'pick-4',
    title: 'Starboy',
    subtitle: 'The Weeknd • Pop',
    imageUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&q=80',
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
    coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80',
    isFavorite: true,
  },
  {
    id: 'tr-2',
    title: 'Instant Crush',
    artist: 'Daft Punk ft. Julian Casablancas',
    album: 'Random Access Memories',
    durationSeconds: 337,
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80',
    isFavorite: false,
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
