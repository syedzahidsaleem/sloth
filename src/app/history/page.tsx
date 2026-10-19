import { FC } from 'react';
import { History as HistoryIcon, Trash2 } from 'lucide-react';
import { ViewShell } from '@/components/ui/ViewShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { TrackRow, Track } from '@/components/ui/TrackRow';

export interface HistoryPageProps {
  historyTracks?: Track[];
  currentTrackId?: string;
  isPlaying?: boolean;
  onPlayTrack?: (track: Track) => void;
  onClearHistory?: () => void;
}

export const HistoryPage: FC<HistoryPageProps> = ({
  historyTracks = [],
  currentTrackId,
  isPlaying,
  onPlayTrack,
  onClearHistory,
}) => {
  return (
    <ViewShell
      data-testid="history-view"
      title="History"
      headerActions={
        historyTracks.length > 0 && onClearHistory ? (
          <Button
            size="xs"
            variant="secondary"
            onClick={onClearHistory}
            className="gap-1.5 font-bold"
          >
            <Trash2 size={13} />
            Clear history
          </Button>
        ) : undefined
      }
    >
      {historyTracks.length === 0 ? (
        <div className="flex h-full flex-1 flex-col items-center justify-center p-8">
          <EmptyState
            icon={<HistoryIcon size={48} />}
            title="No listening history yet"
            description="Tracks you play will be recorded here."
            className="flex-1"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-1 w-full pb-8">
          {historyTracks.map((track, i) => (
            <TrackRow
              key={`${track.id}-${i}`}
              track={track}
              index={i + 1}
              isCurrent={track.id === currentTrackId}
              isPlaying={isPlaying && track.id === currentTrackId}
              onPlay={onPlayTrack}
            />
          ))}
        </div>
      )}
    </ViewShell>
  );
};

export default HistoryPage;
