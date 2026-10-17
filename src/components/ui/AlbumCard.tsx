import { FC, ReactNode } from 'react';
import { Disc3, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    onClick={onClick}
    className={cn(
      'group border-border surface-card shadow-shadow hover:translate-x-shadow-x hover:translate-y-shadow-y flex w-44 cursor-pointer flex-col rounded-lg border-(length:--border-width) p-2.5 text-left transition-all hover:shadow-none select-none',
      className,
    )}
  >
    {/* Cover Art Container */}
    <div className="relative aspect-square w-full overflow-hidden rounded-md border-(length:--border-width) border-border bg-muted">
      {image ? (
        image
      ) : coverUrl ? (
        <img
          src={coverUrl}
          alt={title}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="text-muted-foreground/40 flex size-full items-center justify-center">
          <Disc3 size={64} className="stroke-1" />
        </div>
      )}

      {badge && (
        <div className="absolute top-2 left-2 z-10">
          {badge}
        </div>
      )}

      {/* Hover Play Button */}
      {onPlay && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          aria-label={`Play ${title}`}
          className="surface-primary border-border shadow-shadow absolute right-2.5 bottom-2.5 flex size-9 items-center justify-center rounded-full border-(length:--border-width) opacity-0 transition-all duration-200 group-hover:opacity-100 hover:scale-110 active:scale-95"
        >
          <Play size={16} className="fill-current translate-x-0.5" />
        </button>
      )}
    </div>

    {/* Metadata */}
    <div className="mt-2.5 min-w-0">
      <h3 className="text-foreground truncate text-sm font-bold tracking-tight">
        {title}
      </h3>
      {subtitle && (
        <p className="text-foreground/70 truncate text-xs font-medium">
          {subtitle}
        </p>
      )}
    </div>
  </div>
);

export const AlbumCardSkeleton: FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      'border-border surface-card shadow-shadow flex w-44 animate-pulse flex-col rounded-lg border-(length:--border-width) p-2.5',
      className,
    )}
  >
    <div className="border-border bg-muted/60 aspect-square w-full rounded-md border-(length:--border-width)" />
    <div className="mt-2.5 space-y-1.5">
      <div className="bg-muted/80 h-3.5 w-3/4 rounded-sm" />
      <div className="bg-muted/50 h-3 w-1/2 rounded-sm" />
    </div>
  </div>
);
