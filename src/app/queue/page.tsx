/**
 * Sloth Play Queue Page
 * Author: Syed Zahid Saleem <syedzahidsaleem2@gmail.com>
 */

import { useState } from 'react';
import { Trash2, Music } from 'lucide-react';
import { TrackRow, Track, Button, Badge } from '@/components/ui';

export interface QueuePageProps {
  queue?: Track[];
  currentTrackId?: string;
  isPlaying?: boolean;
  onPlayTrack?: (track: Track) => void;
  onRemoveTrack?: (trackId: string) => void;
  onClearQueue?: () => void;
}

export default function QueuePage({
  queue = [],
  currentTrackId,
  isPlaying = false,
  onPlayTrack,
  onClearQueue,
}: QueuePageProps) {
  const [localQueue, setLocalQueue] = useState<Track[]>(queue);

  const handleClear = () => {
    setLocalQueue([]);
    onClearQueue?.();
  };

  return (
    <div className="surface-background p-6 space-y-6 select-none" data-testid="queue-page">
      {/* Header bar: Title + Count + Clear */}
      <div className="border-border flex items-center justify-between pb-3 border-b-(length:--border-width)">
        <div className="flex items-center gap-3">
          <h1 className="text-foreground text-2xl font-bold tracking-tight">
            Play Queue
          </h1>
          <Badge variant="pill" color="green" className="text-xs font-mono">
            {localQueue.length} tracks
          </Badge>
        </div>

        {localQueue.length > 0 && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleClear}
            className="flex items-center gap-1.5 text-accent-red hover:text-accent-red"
          >
            <Trash2 size={13} />
            <span>Clear Queue</span>
          </Button>
        )}
      </div>

      {/* Queue Tracklist */}
      {localQueue.length === 0 ? (
        <div className="surface-card border-border flex flex-col items-center justify-center p-12 text-center rounded-[4px] border-(length:--border-width)">
          <Music size={48} className="text-muted-foreground/30 mb-3" />
          <h3 className="text-foreground text-sm font-bold">Queue is empty</h3>
          <p className="text-muted-foreground mt-1 text-xs font-mono">
            Add tracks from Search, Albums, or Recommendations to queue them here.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {localQueue.map((track, idx) => (
            <TrackRow
              key={track.id}
              track={track}
              index={idx}
              isCurrent={track.id === currentTrackId}
              isPlaying={isPlaying && track.id === currentTrackId}
              onPlay={() => onPlayTrack?.(track)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
