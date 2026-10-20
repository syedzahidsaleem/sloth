import { FC, useState, useRef } from 'react';
import {
  Music,
  Trash2,
  Play,
  Pause,
  X,
  MoreHorizontal,
  Sparkles,
  Plus,
  Check,
  GripVertical,
  ListPlus,
  ListOrdered,
  Heart,
  User,
  Disc,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Track } from '@/components/ui/TrackRow';
import {
  TrackContextMenuRoot,
  TrackContextMenuTrigger,
  TrackContextMenuContent,
  TrackContextMenuAction,
  TrackContextMenuDivider,
  TrackContextMenuHeader,
} from '@/components/ui/TrackContextMenu';
import { useQueueStore } from '@/stores/queueStore';
import { cn } from '@/lib/utils';

export type ConnectedQueuePanelProps = {
  queue?: Track[];
  currentTrackId?: string;
  isPlaying?: boolean;
  isCollapsed?: boolean;
  onTrackSelect?: (track: Track) => void;
  onTrackPlay?: (track: Track) => void;
  onRemoveTrack?: (trackId: string) => void;
  onReorderQueue?: (fromIndex: number, toIndex: number) => void;
  onClearQueue?: () => void;
  onSaveAsPlaylist?: (name: string, trackIds: string[]) => void;
  onToggleCollapse?: () => void;
  onPlayNext?: (track: Track) => void;
  onAddToLikedSongs?: (track: Track) => void;
  onNavigateToArtist?: (artistName: string) => void;
  onNavigateToAlbum?: (albumTitle: string) => void;
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
  queue: propQueue,
  currentTrackId: propCurrentTrackId,
  isPlaying: propIsPlaying,
  isCollapsed = false,
  onTrackSelect,
  onTrackPlay,
  onRemoveTrack,
  onReorderQueue,
  onClearQueue,
  onSaveAsPlaylist,
  onToggleCollapse,
  onPlayNext,
  onAddToLikedSongs,
  onNavigateToArtist,
  onNavigateToAlbum,
  recommendations: propRecommendations,
  onAddRecommendationToQueue,
  isLoadingRecommendations: propIsLoadingRecs,
}) => {
  // Store fallback integration
  const store = useQueueStore();
  const queue = propQueue ?? store.items;
  const currentTrackId =
    propCurrentTrackId ?? (store.items[store.currentIndex]?.id || '');
  const isPlaying = propIsPlaying ?? store.isPlaying;
  const recommendations = propRecommendations ?? store.recommendations;
  const isLoadingRecommendations =
    propIsLoadingRecs ?? store.isLoadingRecommendations;

  const [activeTab, setActiveTab] = useState<'queue' | 'recommended'>('queue');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Save as Playlist Modal State
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState('My Queue Playlist');

  const currentTrack =
    queue.find((t) => t.id === currentTrackId) || queue[0];

  const handleAddRec = (track: Track) => {
    if (onAddRecommendationToQueue) {
      onAddRecommendationToQueue(track);
    } else {
      store.addToQueue(track);
    }
    setAddedIds((prev) => new Set([...prev, track.id]));
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(track.id);
        return next;
      });
    }, 2000);
  };

  const handlePlayDirect = (track: Track, index: number) => {
    if (onTrackPlay) {
      onTrackPlay(track);
    } else if (onTrackSelect) {
      onTrackSelect(track);
    } else {
      store.playTrackAtIndex(index);
    }
  };

  const handleRemove = (trackId: string) => {
    if (onRemoveTrack) {
      onRemoveTrack(trackId);
    } else {
      store.removeTrack(trackId);
    }
  };

  const handleClear = () => {
    if (onClearQueue) {
      onClearQueue();
    } else {
      store.clearQueue();
    }
  };

  const handleSavePlaylist = () => {
    if (!playlistName.trim()) return;
    const trackIds = queue.map((t) => t.id);
    if (onSaveAsPlaylist) {
      onSaveAsPlaylist(playlistName.trim(), trackIds);
    } else {
      // Store in localStorage saved playlists
      try {
        const existingRaw = localStorage.getItem('sloth:playlists');
        const existing = existingRaw ? JSON.parse(existingRaw) : [];
        const newPl = {
          id: `pl-${Date.now()}`,
          name: playlistName.trim(),
          description: `Created from queue (${queue.length} tracks)`,
          trackIds,
          createdAt: Date.now(),
        };
        localStorage.setItem(
          'sloth:playlists',
          JSON.stringify([newPl, ...existing])
        );
      } catch (err) {
        console.warn('Failed to save playlist:', err);
      }
    }
    setIsPlaylistModalOpen(false);
  };

  // Drag and Drop reordering handlers
  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) return;
    setDragOverIdx(idx);
  };

  const handleDrop = (idx: number) => {
    if (draggedIdx !== null && draggedIdx !== idx) {
      if (onReorderQueue) {
        onReorderQueue(draggedIdx, idx);
      } else {
        store.reorderQueue(draggedIdx, idx);
      }
    }
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  // Collapsed state: Show current thumbnail
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
            {activeTab === 'queue' && queue.length > 0 && (
              <>
                <Button
                  size="icon-sm"
                  variant="default"
                  onClick={() => setIsPlaylistModalOpen(true)}
                  className="size-7 rounded p-0 flex items-center justify-center border-2 border-border shadow-[2px_2px_0px_var(--border)]"
                  title="Save queue as playlist"
                  data-testid="save-queue-playlist-button"
                >
                  <ListPlus size={13} />
                </Button>

                <Button
                  size="icon-sm"
                  variant="default"
                  onClick={handleClear}
                  className="size-7 rounded p-0 flex items-center justify-center border-2 border-border shadow-[2px_2px_0px_var(--border)]"
                  title="Clear queue"
                  data-testid="clear-queue-button"
                >
                  <Trash2 size={13} />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
        {activeTab === 'queue' ? (
          /* TAB 1: ZONE A (NEXT UP) */
          queue.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <Music size={44} className="opacity-40 text-foreground" />
              <div>
                <div className="text-sm font-bold text-foreground">
                  Queue is empty
                </div>
                <div className="mt-1 text-xs opacity-60 text-foreground">
                  Tracks you play will appear here.
                </div>
              </div>
            </div>
          ) : (
            queue.map((track, index) => {
              const isCurrent = track.id === currentTrackId;
              const isDragging = draggedIdx === index;
              const isDragOver = dragOverIdx === index;

              return (
                <div
                  key={`${track.id}-${index}`}
                  data-testid={`queue-item-${track.id}`}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={() => handleDrop(index)}
                  onDragEnd={handleDragEnd}
                  onDoubleClick={() => handlePlayDirect(track, index)}
                  className={cn(
                    'group relative flex items-center gap-2 rounded-md p-1.5 border-2 border-border transition-all cursor-default select-none',
                    isCurrent
                      ? 'bg-[var(--primary)] text-foreground font-bold shadow-[2px_2px_0px_var(--border)]'
                      : 'surface-muted text-foreground hover:bg-black/5 hover:shadow-[2px_2px_0px_var(--border)]',
                    isDragging && 'opacity-40 border-dashed',
                    isDragOver && 'border-t-4 border-t-[var(--primary)]'
                  )}
                >
                  {/* Left Drag Handle (revealed on hover) */}
                  <div
                    title="Drag to reorder"
                    className="cursor-grab active:cursor-grabbing text-foreground/40 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                  >
                    <GripVertical size={13} />
                  </div>

                  {/* Thumbnail / Play Button on Hover */}
                  <div className="size-10 shrink-0 rounded overflow-hidden border border-border bg-black/10 relative">
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

                    {/* Playing indicator or Hover Play button */}
                    {isCurrent ? (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                        {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayDirect(track, index);
                        }}
                        title="Play track"
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                      >
                        <Play size={12} className="fill-current" />
                      </button>
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

                  {/* Duration & More (...) menu button */}
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs font-mono tabular-nums opacity-80 group-hover:hidden">
                      {formatSeconds(track.durationSeconds)}
                    </span>

                    {/* ··· Context Menu Button */}
                    <div className="hidden group-hover:flex items-center gap-1">
                      <TrackContextMenuRoot>
                        <TrackContextMenuTrigger>
                          <div
                            role="button"
                            title="Track options"
                            data-testid={`queue-item-menu-${track.id}`}
                            className="size-6 flex items-center justify-center rounded border border-border surface-muted text-foreground hover:bg-black/10 cursor-pointer"
                          >
                            <MoreHorizontal size={13} />
                          </div>
                        </TrackContextMenuTrigger>

                        <TrackContextMenuContent className="w-48 z-50">
                          <TrackContextMenuHeader
                            title={track.title}
                            subtitle={track.artist}
                            coverUrl={track.coverUrl}
                          />

                          <TrackContextMenuAction
                            icon={<ListOrdered size={14} />}
                            onClick={() => {
                              if (onPlayNext) onPlayNext(track);
                              else store.playNext(track);
                            }}
                          >
                            Play next
                          </TrackContextMenuAction>

                          <TrackContextMenuAction
                            icon={<Heart size={14} />}
                            onClick={() => {
                              if (onAddToLikedSongs) onAddToLikedSongs(track);
                            }}
                          >
                            Save to Liked Songs
                          </TrackContextMenuAction>

                          {track.artist && (
                            <TrackContextMenuAction
                              icon={<User size={14} />}
                              onClick={() => {
                                onNavigateToArtist?.(track.artist);
                              }}
                            >
                              Go to artist
                            </TrackContextMenuAction>
                          )}

                          {track.album && (
                            <TrackContextMenuAction
                              icon={<Disc size={14} />}
                              onClick={() => {
                                onNavigateToAlbum?.(track.album);
                              }}
                            >
                              Go to album
                            </TrackContextMenuAction>
                          )}

                          <TrackContextMenuDivider />

                          <TrackContextMenuAction
                            icon={<Trash2 size={14} />}
                            onClick={() => handleRemove(track.id)}
                          >
                            Remove from queue
                          </TrackContextMenuAction>
                        </TrackContextMenuContent>
                      </TrackContextMenuRoot>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(track.id);
                        }}
                        className="size-6 flex items-center justify-center rounded border border-border surface-muted text-foreground hover:bg-red-500 hover:text-white cursor-pointer"
                        title="Remove from queue"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : (
          /* TAB 2: ZONE B (RECOMMENDATIONS) */
          <div className="flex flex-col gap-2">
            <div className="px-1 py-1 text-[11px] font-medium text-foreground/70 flex items-center gap-1.5 border-b border-border/20 mb-1">
              <Sparkles size={12} className="text-[var(--primary)]" />
              <span>
                Based on{' '}
                <strong className="text-foreground">
                  {currentTrack?.title || 'your taste'}
                </strong>
              </span>
            </div>

            {isLoadingRecommendations ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 p-6 text-center">
                <div className="size-5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-foreground/70 font-medium">
                  Finding similar tracks...
                </span>
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
                      onClick={() => handlePlayDirect(track, 0)}
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
                      onClick={() => handlePlayDirect(track, 0)}
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
                        onClick={() => handleAddRec(track)}
                        title={isAdded ? 'Added to queue' : 'Add to queue'}
                        className={cn(
                          'size-7 rounded flex items-center justify-center border-2 border-border cursor-pointer shadow-[1px_1px_0px_var(--border)] transition-transform active:scale-90',
                          isAdded
                            ? 'bg-emerald-500 text-white'
                            : 'bg-[var(--primary)] text-foreground hover:scale-105',
                        )}
                      >
                        {isAdded ? (
                          <Check size={12} strokeWidth={3} />
                        ) : (
                          <Plus size={14} strokeWidth={2.5} />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Save Queue as Playlist Modal */}
      {isPlaylistModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-lg border-2 border-border surface-primary p-4 shadow-[4px_4px_0px_var(--border)] font-sans">
            <div className="flex items-center justify-between border-b-2 border-border/20 pb-2 mb-3">
              <h3 className="text-sm font-bold text-foreground">
                Save Queue as Playlist
              </h3>
              <button
                type="button"
                onClick={() => setIsPlaylistModalOpen(false)}
                className="size-6 flex items-center justify-center rounded border border-border surface-muted text-foreground hover:bg-black/10 cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-foreground/70 mb-1">
                Playlist Name
              </label>
              <input
                type="text"
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                autoFocus
                className="w-full px-2.5 py-1.5 text-xs rounded border-2 border-border bg-black/10 text-foreground outline-none focus:border-[var(--primary)]"
                placeholder="Name this playlist"
              />
              <div className="text-[11px] opacity-60 text-foreground mt-1">
                {queue.length} tracks will be saved in current order.
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPlaylistModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSavePlaylist}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Footer: Stream Verification status & button */}
      <div className="mt-auto flex items-center justify-between border-t-2 border-border/30 px-3 py-2 surface-muted">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border-2 border-foreground/80 inline-block shrink-0" />
          <span className="text-xs font-medium text-foreground">
            Verified Engine
          </span>
        </div>
        <button
          type="button"
          onClick={() =>
            setActiveTab(activeTab === 'queue' ? 'recommended' : 'queue')
          }
          className="px-2.5 py-0.5 rounded-md bg-[var(--primary)] text-foreground border-2 border-border font-bold text-xs shadow-[1px_1px_0px_var(--border)] hover:scale-105 active:scale-95 transition-transform cursor-pointer"
        >
          {activeTab === 'queue' ? 'See Recs' : 'Back to Queue'}
        </button>
      </div>
    </div>
  );
};
