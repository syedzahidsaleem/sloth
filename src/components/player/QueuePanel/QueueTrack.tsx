/**
 * Sloth QueueTrack Component
 * Draggable row using dnd-kit sortable.
 * High-density layout with 36x36 art, title, artist, duration, and remove action.
 */

import { FC, MouseEvent } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Music2, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QueueTrackItem } from '../types';
import { queueRowVariants } from '../variants';

export interface QueueTrackProps {
  track: QueueTrackItem;
  isCurrent?: boolean;
  isPlaying?: boolean;
  onSelect?: (track: QueueTrackItem) => void;
  onRemove?: (trackId: string) => void;
}

function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const QueueTrack: FC<QueueTrackProps> = ({
  track,
  isCurrent = false,
  isPlaying = false,
  onSelect,
  onRemove,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: track.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleRemove = (e: MouseEvent) => {
    e.stopPropagation();
    onRemove?.(track.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect?.(track)}
      className={cn(
        queueRowVariants({ state: isDragging ? 'dragging' : isCurrent ? 'active' : 'default' }),
        'group relative flex items-center gap-2.5 p-2 rounded-[4px] text-xs'
      )}
      data-testid={`queue-track-${track.id}`}
    >
      {/* Drag Handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 outline-none"
        aria-label="Reorder track"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={14} />
      </button>

      {/* 36x36 Album Art */}
      <div className="relative size-9 shrink-0 overflow-hidden rounded-[3px] border border-[var(--border)] bg-[var(--surface-raised)] select-none">
        {track.coverUrl ? (
          <img
            src={track.coverUrl}
            alt={track.title}
            className="size-full object-cover select-none pointer-events-none"
            loading="lazy"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-[var(--text-muted)]">
            <Music2 size={16} />
          </div>
        )}

        {/* Current Track Playing Indicator */}
        {isCurrent && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-[var(--color-accent)]">
            <Volume2 size={16} className={isPlaying ? 'animate-pulse' : ''} />
          </div>
        )}
      </div>

      {/* Track Metadata (Title & Artist) */}
      <div className="min-w-0 flex-1 flex flex-col justify-center">
        <span
          className={cn(
            'truncate font-medium text-xs leading-tight',
            isCurrent ? 'text-[var(--color-accent)] font-semibold' : 'text-[var(--text-primary)]'
          )}
          title={track.title}
        >
          {track.title}
        </span>
        <span className="truncate text-[11px] text-[var(--text-muted)] leading-tight mt-0.5" title={track.artist}>
          {track.artist}
        </span>
      </div>

      {/* Track Duration (Font-mono, tabular-nums) */}
      <span className="shrink-0 text-[11px] font-mono tabular-nums text-[var(--text-muted)] group-hover:hidden">
        {formatDuration(track.durationSeconds)}
      </span>

      {/* Remove Track Button (Revealed on row hover) */}
      {onRemove && (
        <button
          type="button"
          onClick={handleRemove}
          className="hidden group-hover:flex shrink-0 p-1 rounded-[3px] text-[var(--text-muted)] hover:text-red-400 hover:bg-[var(--surface)] transition-colors cursor-pointer outline-none"
          title="Remove from queue"
          aria-label="Remove from queue"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};
