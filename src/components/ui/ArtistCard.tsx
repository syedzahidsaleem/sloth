/**
 * Ensure any repository we take reference from or code from isn't referenced or spoken about anywhere either in files or readme or code
 * Original: packages/ui/src/components/Card/Card.tsx
 * Adapted for Sloth by syedzahidsaleem2@gmail.com
 * Changes: [styling system, data layer, routing, circular artist portrait, radio play action]
 */

import { FC, ReactNode } from 'react';
import { User, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ArtistCardProps = {
  name: string;
  role?: string;
  imageUrl?: string;
  image?: ReactNode;
  onClick?: () => void;
  onPlay?: () => void;
  className?: string;
};

export const ArtistCard: FC<ArtistCardProps> = ({
  name,
  role = 'Artist',
  imageUrl,
  image,
  onClick,
  onPlay,
  className,
}) => (
  <div
    role="button"
    tabIndex={0}
    data-testid="artist-card"
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick?.();
      }
    }}
    className={cn(
      'surface-card border-border shadow-shadow hover:translate-x-shadow-x hover:translate-y-shadow-y group flex w-40 flex-col items-center rounded-[4px] border-(length:--border-width) p-3 text-center transition-all hover:shadow-none select-none cursor-pointer',
      className,
    )}
    onClick={onClick}
  >
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
      {onPlay && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
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
);

export const ArtistCardSkeleton: FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      'surface-card border-border shadow-shadow flex w-40 animate-pulse flex-col items-center rounded-[4px] border-(length:--border-width) p-3',
      className,
    )}
  >
    <div className="border-border bg-muted/60 aspect-square w-24 rounded-full border-(length:--border-width)" />
    <div className="mt-2.5 w-full space-y-1.5">
      <div className="bg-muted/80 mx-auto h-3.5 w-3/4 rounded-[4px]" />
      <div className="bg-muted/50 mx-auto h-3 w-1/2 rounded-[4px]" />
    </div>
  </div>
);
