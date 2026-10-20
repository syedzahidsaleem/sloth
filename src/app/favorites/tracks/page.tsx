import { FC } from 'react';
import { Music2 } from 'lucide-react';
import { ViewShell } from '@/components/ui/ViewShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { TrackRow, Track } from '@/components/ui/TrackRow';
import { useLibraryStore } from '@/stores/libraryStore';

export interface FavoriteTracksPageProps {
  tracks?: Track[];
  currentTrackId?: string;
  isPlaying?: boolean;
  onPlayTrack?: (track: Track) => void;
  onFavoriteToggle?: (track: Track) => void;
}

export const FavoriteTracksPage: FC<FavoriteTracksPageProps> = ({
  tracks,
  currentTrackId,
  isPlaying,
  onPlayTrack,
  onFavoriteToggle,
}) => {
  const { likedSongs, toggleLikeSong } = useLibraryStore();

  const handleToggle = (track: Track) => {
    if (onFavoriteToggle) {
      onFavoriteToggle(track);
    } else {
      toggleLikeSong(track);
    }
  };

  const favoriteTracks: Track[] =
    tracks && tracks.length > 0
      ? tracks.filter((t) => t.isFavorite)
      : likedSongs.map((s) => ({
          id: s.id,
          title: s.title,
          artist: s.artist,
          album: s.album,
          coverUrl: s.coverUrl,
          durationSeconds: s.durationSeconds,
          isFavorite: true,
        }));

  return (
    <ViewShell data-testid="favorite-tracks-view" title="Favorite tracks">
      {favoriteTracks.length === 0 ? (
        <div className="flex h-full flex-1 flex-col items-center justify-center p-8">
          <EmptyState
            icon={<Music2 size={48} />}
            title="No favorite tracks yet"
            description="Tracks marked as favorite will appear here."
            className="flex-1"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-1 w-full pb-8">
          {favoriteTracks.map((track, i) => (
            <TrackRow
              key={track.id}
              track={track}
              index={i + 1}
              isCurrent={track.id === currentTrackId}
              isPlaying={isPlaying && track.id === currentTrackId}
              onPlay={onPlayTrack}
              onFavoriteToggle={() => handleToggle(track)}
            />
          ))}
        </div>
      )}
    </ViewShell>
  );
};

export default FavoriteTracksPage;
