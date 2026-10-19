import { FC } from 'react';
import { Music, Trash2, Play, Pause, X, MoreHorizontal } from 'lucide-react';
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
  onToggleCollapse?: () => void;
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
  onToggleCollapse,
}) => {
  const currentTrack = queue.find((t) => t.id === currentTrackId) || queue[0];

  // Collapsed state: Show the playing track thumbnail (Image 2)
  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-2 pt-1 pb-2">
        {currentTrack && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title={`${currentTrack.title} • ${currentTrack.artist}`}
            className="group relative size-10.5 rounded-md overflow-hidden border-2 border-border shadow-[2px_2px_0px_var(--border)] cursor-pointer hover:scale-105 active:scale-95 transition-transform"
          >
            {currentTrack.coverUrl ? (
              <img
                src={currentTrack.coverUrl}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <div className="size-full surface-primary flex items-center justify-center text-foreground">
                <Music size={16} />
              </div>
            )}
            {isPlaying && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white">
                <div className="size-2 rounded-full bg-[var(--primary)] animate-ping" />
              </div>
            )}
          </button>
        )}
      </div>
    );
  }

  // Expanded state (Image 3 & Image 4)
  return (
    <div
      data-testid="queue-panel"
      className="flex h-full flex-col overflow-hidden select-none font-sans"
    >
      {/* Top Header Actions */}
      <div className="flex items-center justify-between px-2 pb-2 border-b-2 border-border/20">
        <span className="text-xs font-bold uppercase tracking-wider text-foreground/80">
          Queue ({queue.length})
        </span>
        <div className="flex items-center gap-1.5">
          {onClearQueue && queue.length > 0 && (
            <Button
              size="icon-sm"
              variant="default"
              onClick={onClearQueue}
              className="size-7.5 rounded p-0 flex items-center justify-center border-2 border-border shadow-[2px_2px_0px_var(--border)]"
              title="Clear queue"
            >
              <Trash2 size={14} />
            </Button>
          )}
          <Button
            size="icon-sm"
            variant="default"
            className="size-7.5 rounded p-0 flex items-center justify-center border-2 border-border shadow-[2px_2px_0px_var(--border)]"
            title="Queue options"
          >
            <MoreHorizontal size={14} />
          </Button>
        </div>
      </div>

      {/* Queue items list */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
        {queue.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <Music size={48} className="opacity-40 text-foreground" />
            <div>
              <div className="text-sm font-bold text-foreground">Queue is empty</div>
              <div className="mt-1 text-xs opacity-60 text-foreground">
                Tracks you play will appear here.
              </div>
            </div>
          </div>
        ) : (
          queue.map((track, index) => {
            const isCurrent = track.id === currentTrackId;

            return (
              <div
                key={`${track.id}-${index}`}
                data-testid={`queue-item-${track.id}`}
                onClick={() => onTrackSelect?.(track)}
                className={cn(
                  'group relative flex items-center gap-3 rounded-md p-2 border-2 border-border cursor-pointer transition-all',
                  isCurrent
                    ? 'bg-[var(--primary)] text-foreground font-bold shadow-[2px_2px_0px_var(--border)]'
                    : 'surface-muted text-foreground hover:bg-black/5 hover:shadow-[2px_2px_0px_var(--border)]',
                )}
              >
                {/* Thumbnail */}
                <div className="size-12 shrink-0 rounded overflow-hidden border border-border bg-black/10 relative">
                  {track.coverUrl ? (
                    <img
                      src={track.coverUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center text-foreground/40">
                      <Music size={18} />
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                      {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    </div>
                  )}
                </div>

                {/* Title & Artist */}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-bold leading-snug">
                    {track.title}
                  </div>
                  <div className="truncate text-[11px] opacity-75 leading-tight mt-0.5">
                    {track.artist}
                  </div>
                </div>

                {/* Duration / Remove action */}
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs font-mono tabular-nums opacity-80 group-hover:hidden">
                    {formatSeconds(track.durationSeconds)}
                  </span>
                  {onRemoveTrack && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveTrack(track.id);
                      }}
                      className="hidden group-hover:flex size-5.5 items-center justify-center rounded border border-border surface-muted text-foreground hover:bg-red-500 hover:text-white cursor-pointer"
                      title="Remove from queue"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer: Stream Verification status & button (Image 3 & Image 4) */}
      <div className="mt-auto flex items-center justify-between border-t-2 border-border/30 px-3 py-2.5 surface-muted">
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-full border-2 border-foreground/80 inline-block shrink-0" />
          <span className="text-xs font-medium text-foreground">Unverified</span>
          <button
            type="button"
            className="size-4 rounded-full border border-foreground/50 flex items-center justify-center text-[10px] font-bold text-foreground/70 hover:text-foreground"
            title="Stream Verification info"
          >
            ?
          </button>
        </div>
        <button
          type="button"
          className="px-3.5 py-1 rounded-md bg-[var(--primary)] text-foreground border-2 border-border font-bold text-xs shadow-[2px_2px_0px_var(--border)] hover:scale-105 active:scale-95 transition-transform cursor-pointer"
        >
          Verify
        </button>
      </div>
    </div>
  );
};
