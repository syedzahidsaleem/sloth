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
    onClick={onClick}
    className={cn(
      'group border-border surface-card shadow-shadow hover:translate-x-shadow-x hover:translate-y-shadow-y flex w-40 cursor-pointer flex-col items-center rounded-lg border-(length:--border-width) p-3 text-center transition-all hover:shadow-none select-none',
      className,
    )}
  >
    {/* Circular Image Container */}
    <div className="relative aspect-square w-28 overflow-hidden rounded-full border-(length:--border-width) border-border bg-muted">
      {image ? (
        image
      ) : imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="text-muted-foreground/40 flex size-full items-center justify-center">
          <User size={48} className="stroke-1" />
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
          className="surface-primary border-border shadow-shadow absolute inset-0 m-auto flex size-9 items-center justify-center rounded-full border-(length:--border-width) opacity-0 transition-all duration-200 group-hover:opacity-100 hover:scale-110 active:scale-95"
        >
          <Play size={16} className="fill-current translate-x-0.5" />
        </button>
      )}
    </div>

    {/* Metadata */}
    <div className="mt-3 w-full min-w-0">
      <h3 className="text-foreground truncate text-sm font-bold tracking-tight">
        {name}
      </h3>
      <p className="text-foreground/70 truncate text-xs font-medium">
        {role}
      </p>
    </div>
  </div>
);
