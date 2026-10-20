/**
 * Sloth UpNext ("Sloth Picks") Component
 * Algorithmic recommendation queue powered by LightHGCN & BERT4Rec neural scoring.
 */

import { FC } from 'react';
import { Sparkles, Plus, Play, Music2 } from 'lucide-react';
import { QueueTrackItem } from '../types';

export interface UpNextProps {
  picks?: QueueTrackItem[];
  onAddPickToQueue?: (track: QueueTrackItem) => void;
  onPlayPickNow?: (track: QueueTrackItem) => void;
  className?: string;
}

const DEFAULT_SLOTH_PICKS: QueueTrackItem[] = [
  {
    id: 'pick-001',
    title: 'Outro',
    artist: 'M83',
    album: "Hurry Up, We're Dreaming",
    durationSeconds: 244,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/cb/7b/a9/cb7ba903-b5f1-cc21-90db-7a81b7aa0997/724596951057.jpg/600x600bb.jpg',
    score: 0.98,
    recommendationSource: 'Sloth Recommendation Engine',
  },
  {
    id: 'pick-002',
    title: 'Veridis Quo',
    artist: 'Daft Punk',
    album: 'Discovery',
    durationSeconds: 345,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/fd/4a/77/fd4a77db-0ebc-d043-41a2-f32fa1bb0fb4/dj.qrikkdwj.jpg/600x600bb.jpg',
    score: 0.95,
    recommendationSource: 'Sloth Recommendation Engine',
  },
  {
    id: 'pick-003',
    title: 'Starboy',
    artist: 'The Weeknd, Daft Punk',
    album: 'Starboy',
    durationSeconds: 230,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/b5/92/bb/b592bb72-52e3-e756-9b26-9f56d08f47ab/16UMGIM67864.rgb.jpg/600x600bb.jpg',
    score: 0.92,
    recommendationSource: 'Sloth Recommendation Engine',
  },
];

export const UpNext: FC<UpNextProps> = ({
  picks = DEFAULT_SLOTH_PICKS,
  onAddPickToQueue,
  onPlayPickNow,
  className,
}) => {
  return (
    <div className={className} data-testid="queue-upnext-section">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          <Sparkles size={13} className="text-[var(--color-accent)]" />
          <span>Sloth Picks</span>
        </div>
        <span className="text-[10px] text-[var(--color-accent)] font-mono">Neural Engine</span>
      </div>

      <div className="flex flex-col gap-1 p-2">
        {picks.map((pick) => (
          <div
            key={pick.id}
            className="group flex items-center justify-between p-2 rounded-[4px] bg-[var(--surface-raised)]/60 hover:bg-[var(--surface-raised)] border border-[var(--border)] text-xs transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {/* Art */}
              <div className="relative size-8 shrink-0 overflow-hidden rounded-[3px] border border-[var(--border)] bg-[var(--surface)] select-none">
                {pick.coverUrl ? (
                  <img
                    src={pick.coverUrl}
                    alt={pick.title}
                    className="size-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-[var(--text-muted)]">
                    <Music2 size={14} />
                  </div>
                )}
              </div>

              {/* Title & Artist & Badge */}
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <span className="truncate font-medium text-xs text-[var(--text-primary)] leading-tight">
                  {pick.title}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="truncate text-[10px] text-[var(--text-muted)] leading-tight">
                    {pick.artist}
                  </span>
                  {pick.score && (
                    <span className="shrink-0 px-1 py-0.2 rounded text-[9px] font-mono bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
                      {Math.round(pick.score * 100)}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1 ml-2">
              {onPlayPickNow && (
                <button
                  type="button"
                  onClick={() => onPlayPickNow(pick)}
                  className="p-1 rounded-[3px] text-[var(--text-secondary)] hover:text-[var(--color-accent)] hover:bg-[var(--surface)] transition-colors cursor-pointer outline-none"
                  title="Play now"
                  aria-label="Play now"
                >
                  <Play size={13} fill="currentColor" />
                </button>
              )}
              {onAddPickToQueue && (
                <button
                  type="button"
                  onClick={() => onAddPickToQueue(pick)}
                  className="p-1 rounded-[3px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors cursor-pointer outline-none"
                  title="Add to queue"
                  aria-label="Add to queue"
                >
                  <Plus size={13} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
