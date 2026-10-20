/**
 * Sloth UI Component
 * Author: Syed Zahid Saleem <syedzahidsaleem2@gmail.com>
 */

import { FC, ReactNode } from 'react';
import { User, Play, MoreHorizontal, Radio, UserPlus, UserCheck, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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

export type ArtistCardProps = {
  id?: string;
  name: string;
  role?: string;
  imageUrl?: string;
  image?: ReactNode;
  onClick?: () => void;
  onPlay?: () => void;
  onPlayTopTracks?: () => void;
  onFollowToggle?: () => void;
  isFollowed?: boolean;
  onStartRadio?: () => void;
  onCopyLink?: () => void;
  className?: string;
};

export const ArtistCard: FC<ArtistCardProps> = ({
  id,
  name,
  role = 'Artist',
  imageUrl,
  image,
  onClick,
  onPlay,
  onPlayTopTracks,
  onFollowToggle,
  isFollowed,
  onStartRadio,
  onCopyLink,
  className,
}) => {
  const { isFollowed: checkFollowed, isArtistFollowed, toggleFollowArtist } = useLibraryStore();
  const { showToast } = useToastStore();

  const artistId = id || name;
  const isFollowedArtist =
    isFollowed !== undefined
      ? isFollowed
      : typeof isArtistFollowed === 'function'
        ? isArtistFollowed(artistId)
        : typeof checkFollowed === 'function'
          ? checkFollowed(artistId)
          : false;

  const handleFollowToggle = () => {
    if (onFollowToggle) {
      onFollowToggle();
      return;
    }
    toggleFollowArtist({
      id: artistId,
      name,
      imageUrl,
    });
    showToast({
      title: isFollowedArtist ? `Unfollowed ${name}` : `Followed ${name}`,
      variant: isFollowedArtist ? 'info' : 'success',
    });
  };

  const handleCopyLink = () => {
    if (onCopyLink) {
      onCopyLink();
      return;
    }
    const link = `sloth://artist/${encodeURIComponent(artistId)}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(link);
    }
    showToast({ title: 'Artist link copied to clipboard', variant: 'success' });
  };

  return (
    <TrackContextMenuRoot triggerOnContextMenu className={cn('w-40 shrink-0', className)}>
      <div
        tabIndex={0}
        data-testid="artist-card"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        }}
        className="surface-card border-border shadow-shadow hover:translate-x-shadow-x hover:translate-y-shadow-y group relative flex w-full flex-col items-center rounded-[4px] border-(length:--border-width) p-3 text-center transition-all hover:shadow-none select-none cursor-pointer"
        onClick={onClick}
      >
        {/* ··· Menu Trigger button on hover */}
        <div className="absolute top-1.5 right-1.5 z-20">
          <TrackContextMenuTrigger>
            <div
              role="button"
              title="Artist options"
              data-testid={`artist-menu-trigger-${artistId}`}
              className="surface-primary border-border shadow-shadow flex size-6 items-center justify-center rounded-[4px] border-(length:--border-width) opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal size={13} />
            </div>
          </TrackContextMenuTrigger>
        </div>

        {/* Circular Image Container */}
        <div className="border-border bg-muted/60 relative aspect-square w-24 overflow-hidden rounded-full border-(length:--border-width)">
          {image ? (
            image
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              loading="lazy"
              decoding="async"
              className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
          ) : (
            <div className="text-muted-foreground/30 flex size-full items-center justify-center">
              <User size={40} className="stroke-1" />
            </div>
          )}

          {/* Hover Play Button */}
          {(onPlay || onPlayTopTracks) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onPlayTopTracks) onPlayTopTracks();
                else if (onPlay) onPlay();
              }}
              aria-label={`Play radio for ${name}`}
              className="surface-primary border-border shadow-shadow absolute inset-0 m-auto flex size-8 items-center justify-center rounded-full border-(length:--border-width) opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:scale-105 active:scale-95"
            >
              <Play size={14} className="fill-current translate-x-0.5" />
            </button>
          )}
        </div>

        {/* Metadata */}
        <div className="mt-2.5 w-full min-w-0">
          <div
            data-testid="artist-card-name"
            className="text-card-foreground truncate text-sm font-bold tracking-tight"
          >
            {name}
          </div>
          <div className="text-card-foreground/60 truncate text-xs font-medium">
            {role}
          </div>
        </div>
      </div>

      <TrackContextMenuContent className="w-52 z-50">
        <TrackContextMenuHeader
          title={name}
          subtitle={role}
          coverUrl={imageUrl}
        />
        {(onPlayTopTracks || onPlay) && (
          <TrackContextMenuAction
            icon={<Play size={14} />}
            onClick={() => {
              if (onPlayTopTracks) onPlayTopTracks();
              else if (onPlay) onPlay();
            }}
          >
            Play artist top tracks
          </TrackContextMenuAction>
        )}
        <TrackContextMenuAction
          icon={isFollowedArtist ? <UserCheck size={14} className="text-accent-green" /> : <UserPlus size={14} />}
          onClick={handleFollowToggle}
        >
          {isFollowedArtist ? 'Unfollow' : 'Follow artist'}
        </TrackContextMenuAction>
        {onStartRadio && (
          <TrackContextMenuAction
            icon={<Radio size={14} />}
            onClick={onStartRadio}
          >
            Start artist radio
          </TrackContextMenuAction>
        )}
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

export const ArtistCardSkeleton: FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      'surface-card border-border shadow-shadow flex w-40 animate-pulse flex-col items-center rounded-[4px] border-(length:--border-width) p-3',
      className,
    )}
  >
    <div className="border-border bg-muted/60 aspect-square w-24 rounded-full border-(length:--border-width)" />
    <div className="mt-2.5 w-full space-y-1.5 text-center">
      <div className="bg-muted/80 mx-auto h-3.5 w-3/4 rounded-[4px]" />
      <div className="bg-muted/50 mx-auto h-3 w-1/2 rounded-[4px]" />
    </div>
  </div>
);
