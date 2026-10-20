import { FC, useState } from 'react';
import { Music, Trash2, Play, Pause, X, MoreHorizontal, Sparkles, Plus, Check } from 'lucide-react';
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
  recommendations?: Track[];
  onAddRecommendationToQueue?: (track: Track) => void;
  isLoadingRecommendations?: boolean;
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
  recommendations = [],
  onAddRecommendationToQueue,
  isLoadingRecommendations = false,
}) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'recommended'>('queue');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const currentTrack = queue.find((t) => t.id === currentTrackId) || queue[0];

  const handleAdd = (track: Track) => {
    onAddRecommendationToQueue?.(track);
    setAddedIds((prev) => new Set([...prev, track.id]));
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(track.id);
        return next;
      });
    }, 2000);
  };

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
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-col gap-2 px-2 pb-2 border-b-2 border-border/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-black/10 p-0.5 rounded-md border border-border/40">
            <button
              type="button"
              data-testid="queue-tab-button"
              onClick={() => setActiveTab('queue')}
              className={cn(
                'px-2.5 py-1 text-xs font-bold rounded cursor-pointer transition-colors',
                activeTab === 'queue'
                  ? 'bg-[var(--primary)] text-foreground shadow-[1px_1px_0px_var(--border)]'
                  : 'text-foreground/70 hover:text-foreground',
              )}
            >
              Queue ({queue.length})
            </button>
            <button
              type="button"
              data-testid="recommended-tab-button"
              onClick={() => setActiveTab('recommended')}
              className={cn(
                'px-2.5 py-1 text-xs font-bold rounded cursor-pointer transition-colors flex items-center gap-1',
                activeTab === 'recommended'
                  ? 'bg-[var(--primary)] text-foreground shadow-[1px_1px_0px_var(--border)]'
                  : 'text-foreground/70 hover:text-foreground',
              )}
            >
              <Sparkles size={12} />
              Recommended ({recommendations.length})
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {activeTab === 'queue' && onClearQueue && queue.length > 0 && (
              <Button
                size="icon-sm"
                variant="default"
                onClick={onClearQueue}
                className="size-7 rounded p-0 flex items-center justify-center border-2 border-border shadow-[2px_2px_0px_var(--border)]"
                title="Clear queue"
              >
                <Trash2 size={13} />
              </Button>
            )}
            <Button
              size="icon-sm"
              variant="default"
              className="size-7 rounded p-0 flex items-center justify-center border-2 border-border shadow-[2px_2px_0px_var(--border)]"
              title="Queue options"
            >
              <MoreHorizontal size={13} />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
        {activeTab === 'queue' ? (
          /* TAB 1: CURRENT PLAY QUEUE */
          queue.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <Music size={44} className="opacity-40 text-foreground" />
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
                  <div className="size-11 shrink-0 rounded overflow-hidden border border-border bg-black/10 relative">
                    {track.coverUrl ? (
                      <img
                        src={track.coverUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="size-full flex items-center justify-center text-foreground/40">
                        <Music size={16} />
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
          )
        ) : (
          /* TAB 2: ENGINE RECOMMENDATIONS */
          <div className="flex flex-col gap-2">
            <div className="px-1 py-1 text-[11px] font-medium text-foreground/70 flex items-center gap-1.5 border-b border-border/20 mb-1">
              <Sparkles size={12} className="text-[var(--primary)]" />
              <span>
                Based on <strong className="text-foreground">{currentTrack?.title || 'your taste'}</strong>
              </span>
            </div>

            {isLoadingRecommendations ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 p-6 text-center">
                <div className="size-5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-foreground/70 font-medium">Finding similar tracks...</span>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 p-6 text-center">
                <Sparkles size={36} className="opacity-30 text-foreground" />
                <div className="text-xs opacity-70 text-foreground">
                  Play a song to get engine recommendations
                </div>
              </div>
            ) : (
              recommendations.map((track) => {
                const isAdded = addedIds.has(track.id);

                return (
                  <div
                    key={track.id}
                    data-testid={`rec-item-${track.id}`}
                    className="group relative flex items-center gap-2.5 rounded-md p-2 border-2 border-border surface-muted hover:bg-black/5 hover:shadow-[2px_2px_0px_var(--border)] transition-all"
                  >
                    {/* Thumbnail */}
                    <div
                      className="size-11 shrink-0 rounded overflow-hidden border border-border bg-black/10 relative cursor-pointer"
                      onClick={() => onTrackSelect?.(track)}
                      title="Play now"
                    >
                      {track.coverUrl ? (
                        <img
                          src={track.coverUrl}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="size-full flex items-center justify-center text-foreground/40">
                          <Music size={16} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                        <Play size={14} className="fill-current" />
                      </div>
                    </div>

                    {/* Title & Artist */}
                    <div
                      className="min-w-0 flex-1 cursor-pointer"
                      onClick={() => onTrackSelect?.(track)}
                    >
                      <div className="truncate text-xs font-bold leading-snug">
                        {track.title}
                      </div>
                      <div className="truncate text-[11px] opacity-75 leading-tight mt-0.5">
                        {track.artist}
                      </div>
                    </div>

                    {/* Add to Queue Button */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleAdd(track)}
                        title={isAdded ? 'Added to queue' : 'Add to queue'}
                        className={cn(
                          'size-7 rounded flex items-center justify-center border-2 border-border cursor-pointer shadow-[1px_1px_0px_var(--border)] transition-transform active:scale-90',
                          isAdded
                            ? 'bg-emerald-500 text-white'
                            : 'bg-[var(--primary)] text-foreground hover:scale-105',
                        )}
                      >
                        {isAdded ? <Check size={12} strokeWidth={3} /> : <Plus size={14} strokeWidth={2.5} />}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Footer: Stream Verification status & button (Image 3 & Image 4) */}
      <div className="mt-auto flex items-center justify-between border-t-2 border-border/30 px-3 py-2 surface-muted">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border-2 border-foreground/80 inline-block shrink-0" />
          <span className="text-xs font-medium text-foreground">Verified Engine</span>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab(activeTab === 'queue' ? 'recommended' : 'queue')}
          className="px-2.5 py-0.5 rounded-md bg-[var(--primary)] text-foreground border-2 border-border font-bold text-xs shadow-[1px_1px_0px_var(--border)] hover:scale-105 active:scale-95 transition-transform cursor-pointer"
        >
          {activeTab === 'queue' ? 'See Recs' : 'Back to Queue'}
        </button>
      </div>
    </div>
  );
};
