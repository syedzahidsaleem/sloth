/**
 * Sloth UI Component
 * Author: Syed Zahid Saleem <syedzahidsaleem2@gmail.com>
 */

import { FC, ReactNode } from 'react';
import { CassetteTape, Play, MoreHorizontal, ListOrdered, ListPlus, Heart, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Box } from './Box';
import {
  TrackContextMenuRoot,
  TrackContextMenuTrigger,
  TrackContextMenuContent,
  TrackContextMenuHeader,
  TrackContextMenuAction,
  TrackContextMenuDivider,
} from './TrackContextMenu';
import { useLibraryStore } from '@/stores/libraryStore';
import { useToastStore } from '@/stores/toastStore';

export type AlbumCardProps = {
  id?: string;
  title: string;
  subtitle?: string;
  coverUrl?: string;
  image?: ReactNode;
  badge?: ReactNode;
  onClick?: () => void;
  onPlay?: () => void;
  onPlayNext?: () => void;
  onAddToQueue?: () => void;
  onSaveToggle?: () => void;
  isSaved?: boolean;
  onCopyLink?: () => void;
  className?: string;
};

export const AlbumCard: FC<AlbumCardProps> = ({
  id,
  title,
  subtitle,
  coverUrl,
  image,
  badge,
  onClick,
  onPlay,
  onPlayNext,
  onAddToQueue,
  onSaveToggle,
  isSaved,
  onCopyLink,
  className,
}) => {
  const { isAlbumSaved, saveAlbum, removeAlbum } = useLibraryStore();
  const { showToast } = useToastStore();

  const albumId = id || title;
  const isSavedAlbum = isSaved !== undefined ? isSaved : isAlbumSaved(albumId);

  const handleSaveToggle = () => {
    if (onSaveToggle) {
      onSaveToggle();
      return;
    }
    if (isSavedAlbum) {
      removeAlbum(albumId);
      showToast({ title: 'Removed album from library', variant: 'info' });
    } else {
      saveAlbum({
        id: albumId,
        title,
        artist: subtitle || 'Unknown Artist',
        coverUrl,
      });
      showToast({ title: 'Saved album to library', variant: 'success' });
    }
  };

  const handleCopyLink = () => {
    if (onCopyLink) {
      onCopyLink();
      return;
    }
    const link = `sloth://album/${encodeURIComponent(albumId)}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(link);
    }
    showToast({ title: 'Album link copied to clipboard', variant: 'success' });
  };

  return (
    <TrackContextMenuRoot triggerOnContextMenu className={cn('w-44 shrink-0', className)}>
      <div
        role="button"
        tabIndex={0}
        data-testid="card"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        }}
        className="surface-card border-border shadow-shadow hover:translate-x-shadow-x hover:translate-y-shadow-y group flex w-full flex-col items-stretch gap-2 rounded-[4px] border-(length:--border-width) p-2 text-left transition-all hover:shadow-none select-none cursor-pointer"
        onClick={onClick}
      >
        <Box
          variant="primary"
          shadow="none"
          className="surface-card border-border relative aspect-square w-full items-center justify-center overflow-hidden rounded-[4px] border-(length:--border-width) p-0"
        >
          {image ? (
            image
          ) : coverUrl ? (
            <img
              src={coverUrl}
              alt={title}
              loading="lazy"
              decoding="async"
              className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
          ) : (
            <div className="text-muted-foreground/30 flex size-full items-center justify-center">
              <CassetteTape size={64} className="stroke-1" />
            </div>
          )}

          {badge && (
            <div className="absolute top-1.5 left-1.5 z-10">
              {badge}
            </div>
          )}

          {/* ··· Menu Trigger button on hover */}
          <div className="absolute top-2 right-2 z-20">
            <TrackContextMenuTrigger>
              <div
                role="button"
                title="Album options"
                data-testid={`album-menu-trigger-${albumId}`}
                className="surface-primary border-border shadow-shadow flex size-7 items-center justify-center rounded-[4px] border-(length:--border-width) opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal size={14} />
              </div>
            </TrackContextMenuTrigger>
          </div>

          {onPlay && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPlay();
              }}
              aria-label={`Play ${title}`}
              className="surface-primary border-border shadow-shadow absolute right-2 bottom-2 flex size-8 items-center justify-center rounded-[4px] border-(length:--border-width) opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:scale-105 active:scale-95"
            >
              <Play size={14} className="fill-current translate-x-0.5" />
            </button>
          )}
        </Box>

        {(title || subtitle) && (
          <div className="min-w-0 px-0.5 pb-0.5">
            {title && (
              <div
                data-testid="card-title"
                className="text-card-foreground truncate text-sm font-bold tracking-tight"
              >
                {title}
              </div>
            )}
            {subtitle && (
              <div className="text-card-foreground/60 truncate text-xs font-medium">
                {subtitle}
              </div>
            )}
          </div>
        )}
      </div>

      <TrackContextMenuContent className="w-52 z-50">
        <TrackContextMenuHeader
          title={title}
          subtitle={subtitle || 'Album'}
          coverUrl={coverUrl}
        />
        {onPlay && (
          <TrackContextMenuAction
            icon={<Play size={14} />}
            onClick={onPlay}
          >
            Play album
          </TrackContextMenuAction>
        )}
        {onPlayNext && (
          <TrackContextMenuAction
            icon={<ListOrdered size={14} />}
            onClick={onPlayNext}
          >
            Play next
          </TrackContextMenuAction>
        )}
        {onAddToQueue && (
          <TrackContextMenuAction
            icon={<ListPlus size={14} />}
            onClick={onAddToQueue}
          >
            Add to queue
          </TrackContextMenuAction>
        )}
        <TrackContextMenuAction
          icon={<Heart size={14} className={isSavedAlbum ? 'fill-current text-accent-red' : ''} />}
          onClick={handleSaveToggle}
        >
          {isSavedAlbum ? 'Remove from library' : 'Save album to library'}
        </TrackContextMenuAction>
        <TrackContextMenuDivider />
        <TrackContextMenuAction
          icon={<Share2 size={14} />}
          onClick={handleCopyLink}
        >
          Copy link
        </TrackContextMenuAction>
      </TrackContextMenuContent>
    </TrackContextMenuRoot>
  );
};

export const AlbumCardSkeleton: FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      'surface-card border-border shadow-shadow flex w-44 animate-pulse flex-col rounded-[4px] border-(length:--border-width) p-2',
      className,
    )}
  >
    <div className="border-border bg-muted/60 aspect-square w-full rounded-[4px] border-(length:--border-width)" />
    <div className="mt-2 space-y-1.5 px-0.5">
      <div className="bg-muted/80 h-3.5 w-3/4 rounded-[4px]" />
      <div className="bg-muted/50 h-3 w-1/2 rounded-[4px]" />
    </div>
  </div>
);
