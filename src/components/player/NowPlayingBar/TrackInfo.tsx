/**
 * Sloth TrackInfo Component
 * Displays 40x40 album art (no glow, 4px radius), track title, and artist name.
 */

import { FC } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Music2, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlayerTrack } from '../types';

export interface TrackInfoProps {
  track?: PlayerTrack;
  isFavorite?: boolean;
  onFavoriteToggle?: () => void;
  onTitleClick?: () => void;
  onArtistClick?: () => void;
  className?: string;
}

export const TrackInfo: FC<TrackInfoProps> = ({
  track,
  isFavorite,
  onFavoriteToggle,
  onTitleClick,
  onArtistClick,
  className,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const title = track?.title || 'No track selected';
  const artist = track?.artist || 'Select a track to play';
  const coverUrl = track?.coverUrl;

  return (
    <div className={cn('flex items-center gap-3 min-w-0 max-w-[280px] lg:max-w-[340px]', className)}>
      {/* 40x40 Album Art with 4px radius and flat border, NO glow */}
      <div
        className="relative size-10 shrink-0 overflow-hidden rounded-[4px] border border-[var(--border)] bg-[var(--surface-raised)] select-none"
        data-testid="player-track-art"
      >
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title}
            className="size-full object-cover select-none pointer-events-none"
            loading="lazy"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-[var(--text-muted)]">
            <Music2 size={18} />
          </div>
        )}
      </div>

      {/* Metadata Text (Title & Artist) with overflow truncation */}
      <div className="min-w-0 flex-1 flex flex-col justify-center">
        <span
          onClick={onTitleClick}
          className={cn(
            'truncate text-sm font-semibold text-[var(--text-primary)] leading-tight',
            onTitleClick ? 'cursor-pointer hover:underline hover:text-white' : ''
          )}
          title={title}
          data-testid="player-track-title"
        >
          {title}
        </span>
        <span
          onClick={onArtistClick}
          className={cn(
            'truncate text-xs text-[var(--text-muted)] leading-tight mt-0.5',
            onArtistClick ? 'cursor-pointer hover:underline hover:text-[var(--text-secondary)]' : ''
          )}
          title={artist}
          data-testid="player-track-artist"
        >
          {artist}
        </span>
      </div>

      {/* Tactile Favorite Heart Button */}
      {onFavoriteToggle && (
        <motion.button
          type="button"
          onClick={onFavoriteToggle}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.88 }}
          className={cn(
            'shrink-0 p-1.5 rounded-[4px] transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)]',
            isFavorite
              ? 'text-[var(--color-accent)] hover:brightness-110'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
          )}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          title={isFavorite ? 'Favorited' : 'Favorite'}
          data-testid="player-favorite-button"
        >
          <Heart size={15} fill={isFavorite ? 'currentColor' : 'none'} />
        </motion.button>
      )}
    </div>
  );
};
