/**
 * Sloth QueuePanel Component
 * Slides in from the right viewport edge (AnimatePresence, x: "100%" -> 0).
 * Motion rule: x slide only (no scale/opacity on panel itself).
 * Respects prefers-reduced-motion. Draggable track list using dnd-kit sortable.
 */

import { FC } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { X, Trash2, ListMusic, Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QueueTrackItem } from '../types';
import { QueueTrack } from './QueueTrack';
import { UpNext } from './UpNext';

export interface QueuePanelProps {
  isOpen: boolean;
  onClose: () => void;
  queue: QueueTrackItem[];
  currentTrackId?: string;
  isPlaying?: boolean;
  onTrackSelect?: (track: QueueTrackItem) => void;
  onRemoveTrack?: (trackId: string) => void;
  onClearQueue?: () => void;
  onReorderQueue?: (newQueue: QueueTrackItem[]) => void;
  onAddPickToQueue?: (track: QueueTrackItem) => void;
  className?: string;
}

export const QueuePanel: FC<QueuePanelProps> = ({
  isOpen,
  onClose,
  queue,
  currentTrackId,
  isPlaying = false,
  onTrackSelect,
  onRemoveTrack,
  onClearQueue,
  onReorderQueue,
  onAddPickToQueue,
  className,
}) => {
  const shouldReduceMotion = useReducedMotion();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px drag intent prevents accidental drag on click
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorderQueue) return;

    const oldIndex = queue.findIndex((item) => item.id === active.id);
    const newIndex = queue.findIndex((item) => item.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(queue, oldIndex, newIndex);
      onReorderQueue(reordered);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          key="queue-panel"
          // Strictly x slide only — NO scale or opacity on panel itself
          initial={shouldReduceMotion ? { x: 0 } : { x: '100%' }}
          animate={{ x: 0 }}
          exit={shouldReduceMotion ? { x: 0 } : { x: '100%' }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { type: 'spring', damping: 28, stiffness: 300, mass: 0.8 }
          }
          className={cn(
            'fixed right-0 top-0 bottom-[72px] w-[340px] md:w-[380px]',
            'bg-[var(--surface)] border-l border-[var(--border)] z-30 select-none shadow-2xl',
            'flex flex-col overflow-hidden',
            className
          )}
          data-testid="queue-slide-panel"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 h-14 border-b border-[var(--border)] shrink-0">
            <div className="flex items-center gap-2">
              <ListMusic size={18} className="text-[var(--color-accent)]" />
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Play Queue</h2>
              <span className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-secondary)]">
                {queue.length}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {queue.length > 0 && onClearQueue && (
                <button
                  type="button"
                  onClick={onClearQueue}
                  className="p-1.5 rounded-[4px] text-[var(--text-muted)] hover:text-red-400 hover:bg-[var(--surface-raised)] transition-colors cursor-pointer outline-none"
                  title="Clear Queue"
                  aria-label="Clear Queue"
                  data-testid="queue-clear-button"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-[4px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors cursor-pointer outline-none"
                title="Close Queue"
                aria-label="Close Queue"
                data-testid="queue-close-button"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Queue Content Body with Draggable Sortable List */}
          <div className="flex-1 overflow-y-auto min-h-0 flex flex-col justify-between">
            {queue.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center p-8 text-center text-[var(--text-muted)] my-auto"
                data-testid="queue-empty-state"
              >
                <Music size={40} className="mb-2 opacity-40" />
                <p className="text-sm font-semibold text-[var(--text-secondary)]">Your queue is empty</p>
                <p className="text-xs text-[var(--text-muted)] mt-1 max-w-[200px]">
                  Play tracks or explore Sloth Picks below to populate your queue.
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={queue.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {queue.map((track) => (
                      <QueueTrack
                        key={track.id}
                        track={track}
                        isCurrent={track.id === currentTrackId}
                        isPlaying={isPlaying && track.id === currentTrackId}
                        onSelect={onTrackSelect}
                        onRemove={onRemoveTrack}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            )}

            {/* Algorithmic Up Next / Sloth Picks section */}
            <div className="border-t border-[var(--border)] bg-[var(--surface)] mt-auto shrink-0">
              <UpNext
                onAddPickToQueue={onAddPickToQueue}
                onPlayPickNow={onTrackSelect}
              />
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
