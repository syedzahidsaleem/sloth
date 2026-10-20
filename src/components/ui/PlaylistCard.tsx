/**
 * Sloth UI Component
 * Author: Syed Zahid Saleem <syedzahidsaleem2@gmail.com>
 */

import { FC, ReactNode } from 'react';
import { CassetteTape, Play, MoreHorizontal, Edit2, Copy, Trash2, Share2 } from 'lucide-react';
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
import { usePlaylistStore } from '@/stores/playlistStore';
import { useToastStore } from '@/stores/toastStore';

export type PlaylistCardProps = {
  id?: string;
  name: string;
  itemCount?: number;
  subtitle?: string;
  thumbnails?: string[];
  coverUrl?: string;
  image?: ReactNode;
  onClick?: () => void;
  onPlay?: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onCopyLink?: () => void;
  className?: string;
};

export const PlaylistCard: FC<PlaylistCardProps> = ({
  id,
  name,
  itemCount,
  subtitle,
  thumbnails = [],
  coverUrl,
  image,
  onClick,
  onPlay,
  onEdit,
  onDuplicate,
  onDelete,
  onCopyLink,
  className,
}) => {
  const resolvedSubtitle = subtitle ?? (itemCount !== undefined ? `${itemCount} tracks` : undefined);
  const resolvedThumbnails = thumbnails.length > 0 ? thumbnails : coverUrl ? [coverUrl] : [];

  const { getPlaylistById, createPlaylist, deletePlaylist } = usePlaylistStore();
  const { showToast } = useToastStore();

  const handleDuplicate = () => {
    if (onDuplicate) {
      onDuplicate();
      return;
    }
    if (!id) return;
    const pl = getPlaylistById(id);
    if (pl) {
      createPlaylist(`${pl.name} (Copy)`, pl.description, pl.tracks);
      showToast({ title: `Duplicated "${pl.name}"`, variant: 'success' });
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
      return;
    }
    if (!id) return;
    const confirmed = typeof window !== 'undefined' ? window.confirm(`Delete playlist "${name}"?`) : true;
    if (confirmed) {
      deletePlaylist(id);
      showToast({ title: `Deleted playlist "${name}"`, variant: 'info' });
    }
  };

  const handleCopyLink = () => {
    if (onCopyLink) {
      onCopyLink();
      return;
    }
    const link = `sloth://playlist/${encodeURIComponent(id || name)}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(link);
    }
    showToast({ title: 'Playlist link copied to clipboard', variant: 'success' });
  };

  return (
    <TrackContextMenuRoot triggerOnContextMenu className={cn('w-44 shrink-0', className)}>
      <div
        tabIndex={0}
        data-testid="playlist-card"
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
          ) : resolvedThumbnails.length >= 4 ? (
            <div className="grid size-full grid-cols-2 grid-rows-2">
              {resolvedThumbnails.slice(0, 4).map((url, idx) => (
                <img
                  key={`${url}-${idx}`}
                  src={url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover"
                />
              ))}
            </div>
          ) : resolvedThumbnails.length > 0 ? (
            <img
              src={resolvedThumbnails[0]}
              alt={name}
              loading="lazy"
              decoding="async"
              className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
          ) : (
            <div className="text-muted-foreground/30 flex size-full items-center justify-center">
              <CassetteTape size={64} className="stroke-1" />
            </div>
          )}

          {/* ··· Menu Trigger button on hover */}
          <div className="absolute top-2 right-2 z-20">
            <TrackContextMenuTrigger>
              <div
                role="button"
                title="Playlist options"
                data-testid={`playlist-menu-trigger-${id || name}`}
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
              aria-label={`Play ${name}`}
              className="surface-primary border-border shadow-shadow absolute right-2 bottom-2 flex size-8 items-center justify-center rounded-[4px] border-(length:--border-width) opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:scale-105 active:scale-95"
            >
              <Play size={14} className="fill-current translate-x-0.5" />
            </button>
          )}
        </Box>

        <div className="min-w-0 px-0.5 pb-0.5">
          <div
            data-testid="playlist-card-title"
            className="text-card-foreground truncate text-sm font-bold tracking-tight"
          >
            {name}
          </div>
          {resolvedSubtitle && (
            <div className="text-card-foreground/60 truncate text-xs font-medium">
              {resolvedSubtitle}
            </div>
          )}
        </div>
      </div>

      <TrackContextMenuContent className="w-52 z-50">
        <TrackContextMenuHeader
          title={name}
          subtitle={resolvedSubtitle}
          coverUrl={resolvedThumbnails[0]}
        />
        {onPlay && (
          <TrackContextMenuAction
            icon={<Play size={14} />}
            onClick={onPlay}
          >
            Play playlist
          </TrackContextMenuAction>
        )}
        {onEdit && (
          <TrackContextMenuAction
            icon={<Edit2 size={14} />}
            onClick={onEdit}
          >
            Edit playlist details
          </TrackContextMenuAction>
        )}
        <TrackContextMenuAction
          icon={<Copy size={14} />}
          onClick={handleDuplicate}
        >
          Duplicate playlist
        </TrackContextMenuAction>
        <TrackContextMenuAction
          danger
          icon={<Trash2 size={14} />}
          onClick={handleDelete}
        >
          Delete playlist
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
