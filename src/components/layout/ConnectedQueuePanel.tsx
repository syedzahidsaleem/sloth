/**
 * Sloth UI — Connected Queue Panel Component
 * Spotify-Style Unified Queue with Now Playing, Up Next, Live Drag Reordering,
 * Double-click Playback, Context Menus, and Autoplay Integration.
 * Author: Syed Zahid Saleem <syedzahidsaleem2@gmail.com>
 */

import { FC, useState } from 'react';
import {
  Music,
  Trash2,
  Play,
  X,
  MoreHorizontal,
  GripVertical,
  ListPlus,
  ListOrdered,
  Heart,
  User,
  Disc,
  Share2,
  ListMusic,
  Radio,
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
  TrackContextMenuSubmenu,
} from '@/components/ui/TrackContextMenu';
import { useQueueStore } from '@/stores/queueStore';
import { usePlaylistStore } from '@/stores/playlistStore';
import { useToastStore } from '@/stores/toastStore';
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
}) => {
  const store = useQueueStore();
  const { playlists, addTrackToPlaylist } = usePlaylistStore();
  const { showToast } = useToastStore();

  const queue = propQueue ?? store.items;
  const currentTrackId =
    propCurrentTrackId ?? (store.items[store.currentIndex]?.id || '');
  const isPlaying = propIsPlaying ?? store.isPlaying;

  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Save as Playlist Modal State
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState('My Queue Playlist');

  const currentIndex = queue.findIndex((t) => t.id === currentTrackId);
  const currentTrack =
    currentIndex !== -1 ? queue[currentIndex] : queue[0];
  const upcomingTracks =
    currentIndex !== -1 ? queue.slice(currentIndex + 1) : queue;

  const handlePlayDirect = (track: Track, globalIndex: number) => {
    if (onTrackPlay) {
      onTrackPlay(track);
    } else if (onTrackSelect) {
      onTrackSelect(track);
    } else {
      store.playTrackAtIndex(globalIndex);
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
    showToast({ title: `Saved queue as playlist "${playlistName.trim()}"`, variant: 'success' });
  };

  // Drag and Drop reordering handlers (maps upcoming relative index to global queue index)
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
      const globalFrom = currentIndex !== -1 ? currentIndex + 1 + draggedIdx : draggedIdx;
      const globalTo = currentIndex !== -1 ? currentIndex + 1 + idx : idx;
      if (onReorderQueue) {
        onReorderQueue(globalFrom, globalTo);
      } else {
        store.reorderQueue(globalFrom, globalTo);
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
      {/* Top Header: Queue Title & Actions */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b-2 border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
            Queue
          </h2>
          <span className="text-xs font-mono text-foreground/60">
            ({queue.length})
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {queue.length > 0 && (
            <>
              <Button
                size="icon-sm"
                variant="default"
                onClick={() => setIsPlaylistModalOpen(true)}
                className="size-7 rounded p-0 flex items-center justify-center border-2 border-border shadow-[2px_2px_0px_var(--border)] cursor-pointer hover:scale-105 active:scale-95"
                title="Save queue as playlist"
                data-testid="save-queue-playlist-button"
              >
                <ListPlus size={13} />
              </Button>

              <Button
                size="icon-sm"
                variant="default"
                onClick={handleClear}
                className="size-7 rounded p-0 flex items-center justify-center border-2 border-border shadow-[2px_2px_0px_var(--border)] cursor-pointer hover:scale-105 active:scale-95"
                title="Clear queue"
                data-testid="clear-queue-button"
              >
                <Trash2 size={13} />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Scrollable Queue View */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-3">
        {queue.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <Music size={44} className="opacity-40 text-foreground" />
            <div>
              <div className="text-sm font-bold text-foreground">
                Queue is empty
              </div>
              <div className="mt-1 text-xs opacity-60 text-foreground">
                Play a song to start intelligent autoplay queue.
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* 1. NOW PLAYING CARD */}
            {currentTrack && (
              <div className="flex flex-col gap-1.5 shrink-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/60 px-1">
                  Now Playing
                </span>

                <div
                  data-testid={`queue-item-${currentTrack.id}`}
                  className="flex items-center gap-2.5 p-2 rounded-md border-2 border-border bg-[var(--primary)] text-foreground font-bold shadow-[2px_2px_0px_var(--border)]"
                >
                  {/* Artwork with Playing Equalizer */}
                  <div className="size-11 shrink-0 rounded overflow-hidden border border-border bg-black/10 relative">
                    {currentTrack.coverUrl ? (
                      <img
                        src={currentTrack.coverUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="size-full flex items-center justify-center text-foreground/40">
                        <Music size={16} />
                      </div>
                    )}
                    {isPlaying && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                        <div className="flex items-end gap-0.5 h-3.5 w-3.5 text-white">
                          <span className="w-0.5 bg-current animate-pulse h-full" />
                          <span className="w-0.5 bg-current animate-pulse h-2/3" />
                          <span className="w-0.5 bg-current animate-pulse h-4/5" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Title & Artist */}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-extrabold leading-snug">
                      {currentTrack.title}
                    </div>
                    <div className="truncate text-[11px] opacity-80 leading-tight mt-0.5 font-medium">
                      {currentTrack.artist}
                    </div>
                  </div>

                  <span className="text-xs font-mono tabular-nums opacity-90 pr-1">
                    {formatSeconds(currentTrack.durationSeconds)}
                  </span>
                </div>
              </div>
            )}

            {/* 2. NEXT IN QUEUE */}
            <div className="flex flex-col gap-1.5 flex-1 min-h-0">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/60">
                  Next in Queue
                </span>
                <span className="text-[10px] font-mono text-foreground/50">
                  {upcomingTracks.length} upcoming
                </span>
              </div>

              {upcomingTracks.length === 0 ? (
                <div className="text-center py-6 text-foreground/40 text-xs">
                  No upcoming tracks in queue
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {upcomingTracks.map((track, relativeIndex) => {
                    const globalIndex = currentIndex !== -1 ? currentIndex + 1 + relativeIndex : relativeIndex;
                    const isDragging = draggedIdx === relativeIndex;
                    const isDragOver = dragOverIdx === relativeIndex;

                    return (
                      <div
                        key={`${track.id}-${globalIndex}`}
                        data-testid={`queue-item-${track.id}`}
                        draggable
                        onDragStart={() => handleDragStart(relativeIndex)}
                        onDragOver={(e) => handleDragOver(e, relativeIndex)}
                        onDrop={() => handleDrop(relativeIndex)}
                        onDragEnd={handleDragEnd}
                        onDoubleClick={() => handlePlayDirect(track, globalIndex)}
                        className={cn(
                          'group relative flex items-center gap-2 rounded-md p-1.5 border-2 border-border transition-all cursor-default select-none surface-muted text-foreground hover:bg-black/5 hover:shadow-[2px_2px_0px_var(--border)]',
                          isDragging && 'opacity-40 border-dashed',
                          isDragOver && 'border-t-4 border-t-[var(--primary)]'
                        )}
                      >
                        {/* Drag Handle on hover */}
                        <div
                          title="Drag to reorder"
                          className="cursor-grab active:cursor-grabbing text-foreground/40 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                        >
                          <GripVertical size={13} />
                        </div>

                        {/* Thumbnail / Hover Play Button */}
                        <div className="size-9 shrink-0 rounded overflow-hidden border border-border bg-black/10 relative">
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

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayDirect(track, globalIndex);
                            }}
                            title="Play track"
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                          >
                            <Play size={12} className="fill-current" />
                          </button>
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

                        {/* Duration & More (...) menu */}
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs font-mono tabular-nums opacity-80 group-hover:hidden">
                            {formatSeconds(track.durationSeconds)}
                          </span>

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

                                {playlists.length > 0 && (
                                  <TrackContextMenuSubmenu
                                    icon={<ListMusic size={14} />}
                                    label="Add to playlist"
                                  >
                                    {playlists.map((pl) => (
                                      <TrackContextMenuAction
                                        key={pl.id}
                                        onClick={() => {
                                          addTrackToPlaylist(pl.id, track);
                                          showToast({
                                            title: `Added "${track.title}" to ${pl.name}`,
                                            variant: 'success',
                                          });
                                        }}
                                      >
                                        {pl.name}
                                      </TrackContextMenuAction>
                                    ))}
                                  </TrackContextMenuSubmenu>
                                )}

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
                                      const albumName = track.album;
                                      if (albumName) onNavigateToAlbum?.(albumName);
                                    }}
                                  >
                                    Go to album
                                  </TrackContextMenuAction>
                                )}

                                <TrackContextMenuAction
                                  icon={<Share2 size={14} />}
                                  onClick={() => {
                                    if (typeof navigator !== 'undefined' && navigator.clipboard) {
                                      navigator.clipboard.writeText(`sloth://track/${track.id}`);
                                    }
                                    showToast({ title: 'Track link copied to clipboard', variant: 'success' });
                                  }}
                                >
                                  Copy share link
                                </TrackContextMenuAction>

                                <TrackContextMenuDivider />

                                <TrackContextMenuAction
                                  danger
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
                  })}
                </div>
              )}
            </div>
          </>
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
                variant="secondary"
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

      {/* Footer: Spotify-style Autoplay Radio Indicator */}
      <div className="mt-auto flex items-center justify-between border-t-2 border-border/30 px-3 py-2 surface-muted shrink-0">
        <div className="flex items-center gap-1.5">
          <Radio size={13} className="text-accent-green" />
          <span className="text-xs font-bold text-foreground">
            Autoplay Active
          </span>
        </div>
        <span className="text-[10px] font-mono text-foreground/60">
          Vibe-Matched Queue
        </span>
      </div>
    </div>
  );
};

export default ConnectedQueuePanel;
