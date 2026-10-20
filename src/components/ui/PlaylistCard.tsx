/**
 * Sloth UI Component
 * Author: Syed Zahid Saleem <syedzahidsaleem2@gmail.com>
 */

import { FC, ReactNode } from 'react';
import { CassetteTape, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Box } from './Box';

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
  className?: string;
};

export const PlaylistCard: FC<PlaylistCardProps> = ({
  name,
  itemCount,
  subtitle,
  thumbnails = [],
  coverUrl,
  image,
  onClick,
  onPlay,
  className,
}) => {
  const resolvedSubtitle = subtitle ?? (itemCount !== undefined ? `${itemCount} tracks` : undefined);
  const resolvedThumbnails = thumbnails.length > 0 ? thumbnails : coverUrl ? [coverUrl] : [];

  return (
    <div
      role="button"
      tabIndex={0}
      data-testid="playlist-card"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        'surface-card border-border shadow-shadow hover:translate-x-shadow-x hover:translate-y-shadow-y group flex w-44 flex-col items-stretch gap-2 rounded-[4px] border-(length:--border-width) p-2 text-left transition-all hover:shadow-none select-none cursor-pointer',
        className,
      )}
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
  );
};
