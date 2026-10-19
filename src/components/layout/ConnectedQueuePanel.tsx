import { FC } from 'react';
import { Music, Trash2, Play, Pause, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Track } from '@/components/ui/TrackRow';
import { cn } from '@/lib/utils';

export type ConnectedQueuePanelProps = {
  queue: Track[];
  currentTrackId?: string;
  isPlaying?: boolean;
  isCollapsed?: boolean;
  onTrackSelect?: (track: Track) => void;
  onRemoveTrack?: (trackId: string) => void;
  onClearQueue?: () => void;
};

const formatSeconds = (sec?: number) => {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const ConnectedQueuePanel: FC<ConnectedQueuePanelProps> = ({
  queue,
  currentTrackId,
  isPlaying = false,
  isCollapsed = false,
  onTrackSelect,
  onRemoveTrack,
  onClearQueue,
}) => {
  if (queue.length === 0) {
    return (
      <div
        data-testid="queue-empty-state"
        className={cn(
          'flex h-full flex-col items-center justify-center gap-4 p-8 text-center transition-opacity duration-150 select-none',
          isCollapsed ? 'opacity-0' : 'opacity-100',
        )}
      >
        <Music size={64} className="opacity-40 text-foreground" />
        <div>
          <div className="text-lg font-bold text-foreground">Queue is empty</div>
          <div className="mt-1 text-xs opacity-60 text-foreground">
            Tracks you play or add will appear here.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="queue-panel"
      className={cn(
        'flex h-full flex-col overflow-hidden select-none font-sans',
        isCollapsed ? 'opacity-0' : 'opacity-100',
      )}
    >
      {/* Queue Header if not collapsed */}
      <div className="flex items-center justify-between px-3 py-2 border-b-(length:--border-width) border-border/20">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Queue ({queue.length})
        </span>
        {onClearQueue && (
          <Button
            size="xs"
            variant="text"
            onClick={onClearQueue}
            className="h-6 text-[11px] gap-1 px-1.5"
            title="Clear queue"
          >
            <Trash2 size={12} />
            Clear
          </Button>
        )}
      </div>

      {/* Queue Track List */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
        {queue.map((track, index) => {
          const isCurrent = track.id === currentTrackId;

          return (
            <div
              key={`${track.id}-${index}`}
              data-testid={`queue-item-${track.id}`}
              onClick={() => onTrackSelect?.(track)}
              className={cn(
                'group relative flex items-center gap-2.5 rounded-md p-1.5 border-(length:--border-width) cursor-pointer transition-all',
                isCurrent
                  ? 'surface-primary border-border font-bold shadow-xs'
                  : 'surface-muted border-border/40 hover:border-border hover:shadow-xs',
              )}
            >
              {/* Thumbnail */}
              <div className="size-9 shrink-0 rounded overflow-hidden border border-border bg-foreground/5 relative">
                {track.coverUrl ? (
                  <img
                    src={track.coverUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="size-full flex items-center justify-center text-foreground/40">
                    <Music size={14} />
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                    {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  </div>
                )}
              </div>

              {/* Title & Artist */}
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold leading-tight text-foreground">
                  {track.title}
                </div>
                <div className="truncate text-[11px] opacity-70 leading-tight mt-0.5 text-foreground">
                  {track.artist}
                </div>
              </div>

              {/* Duration or remove button */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] font-mono tabular-nums opacity-60 text-foreground group-hover:hidden">
                  {formatSeconds(track.durationSeconds)}
                </span>
                {onRemoveTrack && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveTrack(track.id);
                    }}
                    className="hidden group-hover:flex size-5 items-center justify-center rounded hover:bg-foreground/10 text-foreground/60 hover:text-foreground cursor-pointer"
                    title="Remove from queue"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
