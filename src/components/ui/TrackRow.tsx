/**
 * Sloth UI Component
 * Author: Syed Zahid Saleem <syedzahidsaleem2@gmail.com>
 */

import { FC, ReactNode, MouseEvent } from 'react';
import {
  Heart,
  Play,
  Pause,
  EllipsisVertical,
  Plus,
  Music,
  Download,
  ListOrdered,
  ListPlus,
  ListMusic,
  Share2,
  User,
  Disc,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import {
  TrackContextMenuRoot,
  TrackContextMenuTrigger,
  TrackContextMenuContent,
  TrackContextMenuHeader,
  TrackContextMenuAction,
  TrackContextMenuSubmenu,
  TrackContextMenuDivider,
} from './TrackContextMenu';
import { DownloadButton } from '@/features/download';
import { useLibraryStore } from '@/stores/libraryStore';
import { usePlaylistStore } from '@/stores/playlistStore';
import { useQueueStore } from '@/stores/queueStore';
import { useToastStore } from '@/stores/toastStore';

export type Track = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  durationSeconds: number;
  coverUrl?: string;
  isFavorite?: boolean;
  isDiscoverySlot?: boolean;
  badge?: string;
  audioUrl?: string;
  streamUrl?: string;
};

export type TrackRowProps = {
  track: Track;
  index?: number;
  isPlaying?: boolean;
  isCurrent?: boolean;
  onPlay?: (track: Track) => void;
  onPlayNext?: (track: Track) => void;
  onFavoriteToggle?: (track: Track) => void;
  onAddToQueue?: (track: Track) => void;
  onNavigateToArtist?: (artist: string) => void;
  onNavigateToAlbum?: (album: string) => void;
  onDownload?: (track: Track) => void;
  showDownload?: boolean;
  isInQueue?: boolean;
  onRemoveFromQueue?: (trackId: string) => void;
  contextMenuActions?: ReactNode;
  className?: string;
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const TrackRow: FC<TrackRowProps> = ({
  track,
  index,
  isPlaying = false,
  isCurrent = false,
  onPlay,
  onPlayNext,
  onFavoriteToggle,
  onAddToQueue,
  onNavigateToArtist,
  onNavigateToAlbum,
  onDownload,
  showDownload = true,
  isInQueue = false,
  onRemoveFromQueue,
  contextMenuActions,
  className,
}) => {
  const { isLiked, toggleLikeSong } = useLibraryStore();
  const { playlists, addTrackToPlaylist } = usePlaylistStore();
  const { playNext, addToQueue } = useQueueStore();
  const { showToast } = useToastStore();

  const isFavorite = track.isFavorite !== undefined ? track.isFavorite : isLiked(track.id);

  const handlePlayClick = (e: MouseEvent) => {
    e.stopPropagation();
    onPlay?.(track);
  };

  const handleFavoriteClick = (e?: MouseEvent) => {
    e?.stopPropagation();
    if (onFavoriteToggle) {
      onFavoriteToggle(track);
    } else {
      toggleLikeSong(track);
      showToast({
        title: isFavorite ? 'Removed from Liked Songs' : 'Saved to Liked Songs',
        variant: isFavorite ? 'info' : 'success',
      });
    }
  };

  const handleQueueClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (onAddToQueue) {
      onAddToQueue(track);
    } else {
      addToQueue(track);
      showToast({ title: `Added "${track.title}" to queue`, variant: 'info' });
    }
  };

  return (
    <TrackContextMenuRoot triggerOnContextMenu className="w-full">
      <div
        data-testid="track-row"
        onClick={() => onPlay?.(track)}
        className={cn(
          'group border-border bg-muted/40 hover:surface-card flex h-12 w-full cursor-pointer items-center gap-3 border-b-(length:--border-width) px-3 transition-colors select-none rounded-[4px]',
          isCurrent && 'surface-card border-primary/50 text-primary',
          className,
        )}
      >
        {/* Index or Play icon */}
        <div className="flex w-6 shrink-0 items-center justify-center text-xs font-semibold tabular-nums text-foreground/60">
          <span className={cn('group-hover:hidden', isCurrent && 'hidden')}>
            {index !== undefined ? index + 1 : ''}
          </span>
          <button
            type="button"
            onClick={handlePlayClick}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className={cn(
              'hover:text-foreground hidden group-hover:flex items-center justify-center transition-transform active:scale-95',
              isCurrent && 'flex text-primary',
            )}
          >
            {isPlaying ? <Pause size={14} className="fill-current" /> : <Play size={14} className="fill-current" />}
          </button>
        </div>

        {/* Thumbnail */}
        <div className="border-border relative size-9 shrink-0 overflow-hidden rounded-[4px] border-(length:--border-width) bg-background/50">
          {track.coverUrl ? (
            <img
              src={track.coverUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <div className="text-foreground/40 flex size-full items-center justify-center">
              <Music size={15} />
            </div>
          )}
        </div>

        {/* Title & Artist */}
        <div className="min-w-0 flex-1">
          <div className={cn('truncate text-sm font-semibold', isCurrent ? 'text-primary' : 'text-foreground')}>
            {track.title}
          </div>
          <div className="text-foreground/60 truncate text-xs">
            {track.artist}
          </div>
        </div>

        {/* Album */}
        {track.album && (
          <div className="text-foreground/60 hidden min-w-0 flex-1 truncate text-xs md:block">
            {track.album}
          </div>
        )}

        {/* Action buttons (hover visible) */}
        <div className="flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="text"
            className="opacity-0 transition-opacity group-hover:opacity-100"
            onClick={handleQueueClick}
            aria-label="Add to Queue"
          >
            <Plus size={15} />
          </Button>

          {showDownload && (
            <DownloadButton
              payload={{
                urlOrId: track.id,
                title: track.title,
                artist: track.artist,
                album: track.album,
                coverUrl: track.coverUrl,
              }}
              size="icon-sm"
              variant="ghost"
              className="opacity-0 transition-opacity group-hover:opacity-100 text-foreground/60 hover:text-foreground"
            />
          )}

          <Button
            size="icon-sm"
            variant="text"
            className={cn(
              'transition-opacity',
              isFavorite ? 'opacity-100 text-accent-red' : 'opacity-0 group-hover:opacity-100 text-foreground/60 hover:text-foreground',
            )}
            onClick={handleFavoriteClick}
            aria-label="Favorite"
          >
            <Heart size={15} className={isFavorite ? 'fill-current' : ''} />
          </Button>

          {/* Duration */}
          <div className="w-12 text-right text-xs font-mono tabular-nums text-foreground/70">
            {formatTime(track.durationSeconds)}
          </div>

          {/* Context Menu Trigger */}
          <TrackContextMenuTrigger>
            <div
              role="button"
              className="size-7 flex items-center justify-center rounded text-foreground/70 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              title="More options"
            >
              <EllipsisVertical size={15} />
            </div>
          </TrackContextMenuTrigger>
        </div>
      </div>

      <TrackContextMenuContent className="w-56 z-50">
        <TrackContextMenuHeader
          title={track.title}
          subtitle={track.artist}
          coverUrl={track.coverUrl}
        />

        {contextMenuActions ? (
          contextMenuActions
        ) : (
          <>
            <TrackContextMenuAction
              icon={<Play size={14} />}
              onClick={() => onPlay?.(track)}
            >
              Play now
            </TrackContextMenuAction>

            <TrackContextMenuAction
              icon={<ListOrdered size={14} />}
              onClick={() => {
                if (onPlayNext) onPlayNext(track);
                else playNext(track);
              }}
            >
              Play next
            </TrackContextMenuAction>

            <TrackContextMenuAction
              icon={<ListPlus size={14} />}
              onClick={() => {
                if (onAddToQueue) onAddToQueue(track);
                else addToQueue(track);
              }}
            >
              Add to queue
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
              icon={<Heart size={14} className={isFavorite ? 'fill-current text-accent-red' : ''} />}
              onClick={handleFavoriteClick}
            >
              {isFavorite ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
            </TrackContextMenuAction>

            {track.artist && (
              <TrackContextMenuAction
                icon={<User size={14} />}
                onClick={() => onNavigateToArtist?.(track.artist)}
              >
                Go to artist
              </TrackContextMenuAction>
            )}

            {track.album && (
              <TrackContextMenuAction
                icon={<Disc size={14} />}
                onClick={() => { const alb = track.album; if (alb) onNavigateToAlbum?.(alb); }}
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

            {isInQueue && onRemoveFromQueue && (
              <>
                <TrackContextMenuDivider />
                <TrackContextMenuAction
                  danger
                  icon={<Trash2 size={14} />}
                  onClick={() => onRemoveFromQueue(track.id)}
                >
                  Remove from queue
                </TrackContextMenuAction>
              </>
            )}

            {showDownload && onDownload && (
              <>
                <TrackContextMenuDivider />
                <TrackContextMenuAction
                  icon={<Download size={14} />}
                  onClick={() => onDownload(track)}
                >
                  Download track
                </TrackContextMenuAction>
              </>
            )}
          </>
        )}
      </TrackContextMenuContent>
    </TrackContextMenuRoot>
  );
};
