/**
 * Sloth UI Component
 * Author: Syed Zahid Saleem <syedzahidsaleem2@gmail.com>
 */

import { FC, ReactNode } from 'react';
import { CassetteTape, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Box } from './Box';

export type AlbumCardProps = {
  title: string;
  subtitle?: string;
  coverUrl?: string;
  image?: ReactNode;
  badge?: ReactNode;
  onClick?: () => void;
  onPlay?: () => void;
  className?: string;
};

export const AlbumCard: FC<AlbumCardProps> = ({
  title,
  subtitle,
  coverUrl,
  image,
  badge,
  onClick,
  onPlay,
  className,
}) => (
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
);

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
