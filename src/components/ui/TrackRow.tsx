import { FC, ReactNode, MouseEvent } from 'react';
import { Heart, Play, Pause, MoreVertical, Plus, Music, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import { ContextMenu, ContextMenuItem, ContextMenuSeparator } from './ContextMenu';
import { DownloadButton } from '@/features/download';

export type Track = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  durationSeconds: number;
  coverUrl?: string;
  isFavorite?: boolean;
};

export type TrackRowProps = {
  track: Track;
  index?: number;
  isPlaying?: boolean;
  isCurrent?: boolean;
  onPlay?: (track: Track) => void;
  onFavoriteToggle?: (track: Track) => void;
  onAddToQueue?: (track: Track) => void;
  onDownload?: (track: Track) => void;
  showDownload?: boolean;
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
  onFavoriteToggle,
  onAddToQueue,
  onDownload,
  showDownload = true,
  contextMenuActions,
  className,
}) => {
  const handlePlayClick = (e: MouseEvent) => {
    e.stopPropagation();
    onPlay?.(track);
  };

  const handleFavoriteClick = (e: MouseEvent) => {
    e.stopPropagation();
    onFavoriteToggle?.(track);
  };

  const handleQueueClick = (e: MouseEvent) => {
    e.stopPropagation();
    onAddToQueue?.(track);
  };

  return (
    <div
      role="row"
      data-testid="track-row"
      onClick={() => onPlay?.(track)}
      className={cn(
        'group border-border bg-muted/60 hover:surface-card flex h-14 w-full cursor-pointer items-center gap-3 border-b-(length:--border-width) px-3 transition-colors select-none',
        isCurrent && 'surface-card border-primary/50',
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
            'hover:text-foreground hidden group-hover:flex items-center justify-center transition-transform active:scale-90',
            isCurrent && 'flex text-foreground',
          )}
        >
          {isPlaying ? <Pause size={14} className="fill-current" /> : <Play size={14} className="fill-current" />}
        </button>
      </div>

      {/* Thumbnail */}
      <div className="border-border relative size-10 shrink-0 overflow-hidden rounded-md border-(length:--border-width) bg-background/50">
        {track.coverUrl ? (
          <img
            src={track.coverUrl}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <div className="text-foreground/40 flex size-full items-center justify-center">
            <Music size={16} />
          </div>
        )}
      </div>

      {/* Title & Artist */}
      <div className="min-w-0 flex-1">
        <div className={cn('truncate text-sm font-bold', isCurrent ? 'text-primary' : 'text-foreground')}>
          {track.title}
        </div>
        <div className="text-foreground/60 truncate text-xs font-medium">
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
        {onAddToQueue && (
          <Button
            size="icon-sm"
            variant="text"
            className="opacity-0 transition-opacity group-hover:opacity-100"
            onClick={handleQueueClick}
            aria-label="Add to Queue"
          >
            <Plus size={15} />
          </Button>
        )}

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

        {onFavoriteToggle && (
          <Button
            size="icon-sm"
            variant="text"
            className={cn(
              'transition-opacity',
              track.isFavorite ? 'opacity-100 text-accent-red' : 'opacity-0 group-hover:opacity-100 text-foreground/60 hover:text-foreground',
            )}
            onClick={handleFavoriteClick}
            aria-label="Favorite"
          >
            <Heart size={15} className={track.isFavorite ? 'fill-current' : ''} />
          </Button>
        )}

        {/* Duration */}
        <div className="w-12 text-right text-xs font-medium tabular-nums text-foreground/70">
          {formatTime(track.durationSeconds)}
        </div>

        {/* Context Menu */}
        <ContextMenu
          triggerOn="click"
          trigger={
            <Button
              size="icon-sm"
              variant="text"
              className="opacity-0 transition-opacity group-hover:opacity-100 text-foreground/70 hover:text-foreground"
              aria-label="More options"
            >
              <MoreVertical size={15} />
            </Button>
          }
        >
          {contextMenuActions ? (
            contextMenuActions
          ) : (
            <>
              <ContextMenuItem
                icon={<Play size={14} />}
                label="Play Now"
                onClick={() => onPlay?.(track)}
              />
              <ContextMenuItem
                icon={<Plus size={14} />}
                label="Add to Queue"
                onClick={() => onAddToQueue?.(track)}
              />
              <ContextMenuSeparator />
              <ContextMenuItem
                icon={<Heart size={14} />}
                label={track.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                onClick={() => onFavoriteToggle?.(track)}
              />
              {onDownload && (
                <>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    icon={<Download size={14} />}
                    label="Download Track"
                    onClick={() => onDownload?.(track)}
                  />
                </>
              )}
            </>
          )}
        </ContextMenu>
      </div>
    </div>
  );
};
