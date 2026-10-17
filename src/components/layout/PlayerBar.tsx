import { FC, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  ListMusic,
  Mic2,
  Heart,
  Music,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PlayerBarProps {
  // Track info
  title?: string;
  artist?: string;
  coverUrl?: string;
  isFavorite?: boolean;
  onFavoriteToggle?: () => void;

  // Playback state
  isPlaying?: boolean;
  onPlayPause?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;

  // Shuffle & Repeat
  isShuffle?: boolean;
  onShuffleToggle?: () => void;
  repeatMode?: 'off' | 'all' | 'one';
  onRepeatToggle?: () => void;

  // Progress
  progressSeconds?: number;
  totalDurationSeconds?: number;
  onSeek?: (seconds: number) => void;

  // Volume
  volume?: number; // 0 - 100
  isMuted?: boolean;
  onVolumeChange?: (vol: number) => void;
  onMuteToggle?: () => void;

  // Extra features
  isQueueOpen?: boolean;
  onQueueToggle?: () => void;
  isLyricsOpen?: boolean;
  onLyricsToggle?: () => void;

  className?: string;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const PlayerBar: FC<PlayerBarProps> = ({
  title = 'No Track Selected',
  artist = 'Sloth Unified Player',
  coverUrl,
  isFavorite = false,
  onFavoriteToggle,

  isPlaying = false,
  onPlayPause,
  onNext,
  onPrevious,

  isShuffle = false,
  onShuffleToggle,
  repeatMode = 'off',
  onRepeatToggle,

  progressSeconds = 0,
  totalDurationSeconds = 180,
  onSeek,

  volume = 80,
  isMuted = false,
  onVolumeChange,
  onMuteToggle,

  isQueueOpen = false,
  onQueueToggle,
  isLyricsOpen = false,
  onLyricsToggle,

  className,
}) => {
  const prefersReduced = useReducedMotion();
  const [isHoveringSeek, setIsHoveringSeek] = useState(false);

  const percent = totalDurationSeconds > 0
    ? Math.min(100, Math.max(0, (progressSeconds / totalDurationSeconds) * 100))
    : 0;

  const effectiveVolume = isMuted ? 0 : volume;

  return (
    <footer
      className={cn(
        'h-[72px] min-h-[72px] max-h-[72px] w-full shrink-0 flex items-center justify-between px-4',
        'bg-[var(--surface)] text-[var(--text-primary)] border-t border-[var(--border)]',
        'select-none font-sans z-50',
        className,
      )}
      style={{ height: '72px' }}
      aria-label="Audio Player Controls"
    >
      {/* LEFT SECTION: 40x40 Album Art + Track Info + Favorite */}
      <div className="flex items-center gap-3 w-[260px] min-w-[200px] max-w-[300px] shrink-0">
        {/* 40x40 Artwork */}
        <div className="size-10 min-w-10 max-w-10 rounded-[4px] bg-[var(--surface-raised)] border border-[var(--border)] overflow-hidden shrink-0 flex items-center justify-center relative shadow-xs">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={`${title} cover`}
              className="size-full object-cover"
              loading="lazy"
            />
          ) : (
            <Music size={18} className="text-[var(--text-muted)]" aria-hidden="true" />
          )}
        </div>

        {/* Track Title & Artist */}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-xs font-semibold text-[var(--text-primary)] truncate leading-tight">
            {title}
          </span>
          <span className="text-[11px] text-[var(--text-secondary)] truncate leading-tight mt-0.5">
            {artist}
          </span>
        </div>

        {/* Favorite Button */}
        {onFavoriteToggle && (
          <button
            type="button"
            onClick={onFavoriteToggle}
            className="p-1.5 rounded-[3px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            aria-pressed={isFavorite}
          >
            <Heart
              size={15}
              className={cn(
                'transition-transform active:scale-90',
                isFavorite
                  ? 'fill-[var(--accent-red)] text-[var(--accent-red)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
              )}
            />
          </button>
        )}
      </div>

      {/* CENTER SECTION: Controls + Scrubber */}
      <div className="flex flex-col items-center justify-center gap-1.5 flex-1 max-w-[560px] px-4">
        {/* Transport Buttons */}
        <div className="flex items-center gap-3">
          {/* Shuffle */}
          <button
            type="button"
            onClick={onShuffleToggle}
            className={cn(
              'p-1.5 rounded-[3px] transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]',
              isShuffle
                ? 'text-[var(--color-accent)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
            )}
            title="Shuffle"
            aria-label="Shuffle"
            aria-pressed={isShuffle}
          >
            <Shuffle size={14} />
          </button>

          {/* Previous */}
          <button
            type="button"
            onClick={onPrevious}
            className="p-1.5 rounded-[3px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            title="Previous track"
            aria-label="Previous track"
          >
            <SkipBack size={16} />
          </button>

          {/* Play / Pause Primary Button */}
          <button
            type="button"
            onClick={onPlayPause}
            className={cn(
              'size-8 rounded-[4px] bg-[var(--color-accent)] text-[var(--color-accent-foreground)]',
              'flex items-center justify-center font-bold transition-transform cursor-pointer shadow-sm',
              'hover:scale-105 active:scale-95 outline-none',
              'focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface)]',
            )}
            title={isPlaying ? 'Pause' : 'Play'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={16} className="fill-current" />
            ) : (
              <Play size={16} className="fill-current ml-0.5" />
            )}
          </button>

          {/* Next */}
          <button
            type="button"
            onClick={onNext}
            className="p-1.5 rounded-[3px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            title="Next track"
            aria-label="Next track"
          >
            <SkipForward size={16} />
          </button>

          {/* Repeat */}
          <button
            type="button"
            onClick={onRepeatToggle}
            className={cn(
              'p-1.5 rounded-[3px] transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]',
              repeatMode !== 'off'
                ? 'text-[var(--color-accent)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
            )}
            title={`Repeat mode: ${repeatMode}`}
            aria-label={`Repeat mode: ${repeatMode}`}
          >
            {repeatMode === 'one' ? <Repeat1 size={14} /> : <Repeat size={14} />}
          </button>
        </div>

        {/* Progress Bar & Timecodes */}
        <div
          className="flex items-center gap-2 w-full"
          onMouseEnter={() => setIsHoveringSeek(true)}
          onMouseLeave={() => setIsHoveringSeek(false)}
        >
          <span className="text-[10px] font-mono text-[var(--text-muted)] min-w-[32px] text-right tabular-nums">
            {formatTime(progressSeconds)}
          </span>

          {/* Slider track */}
          <div
            className="relative flex-1 h-3 flex items-center cursor-pointer group"
            onClick={(e) => {
              if (!onSeek) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const ratio = Math.max(0, Math.min(1, clickX / rect.width));
              onSeek(ratio * totalDurationSeconds);
            }}
            role="slider"
            aria-label="Track progress"
            aria-valuemin={0}
            aria-valuemax={totalDurationSeconds}
            aria-valuenow={progressSeconds}
            tabIndex={0}
            onKeyDown={(e) => {
              if (!onSeek) return;
              if (e.key === 'ArrowRight') onSeek(Math.min(totalDurationSeconds, progressSeconds + 5));
              if (e.key === 'ArrowLeft') onSeek(Math.max(0, progressSeconds - 5));
            }}
          >
            <div className="w-full h-1 bg-[var(--surface-raised)] rounded-full overflow-hidden border border-[var(--border)]">
              <div
                className="h-full bg-[var(--color-accent)] transition-[width] duration-75"
                style={{ width: `${percent}%` }}
              />
            </div>
            {/* Scrubber thumb */}
            <div
              className={cn(
                'absolute size-2.5 rounded-full bg-white shadow-sm -ml-1 transition-opacity duration-100',
                isHoveringSeek ? 'opacity-100 scale-110' : 'opacity-0 group-hover:opacity-100',
              )}
              style={{ left: `${percent}%` }}
            />
          </div>

          <span className="text-[10px] font-mono text-[var(--text-muted)] min-w-[32px] text-left tabular-nums">
            {formatTime(totalDurationSeconds)}
          </span>
        </div>
      </div>

      {/* RIGHT SECTION: Visualizer + Lyrics + Queue + Volume */}
      <div className="flex items-center justify-end gap-3 w-[260px] min-w-[200px] shrink-0">
        {/* Visualizer Dots / EQ Bars */}
        <div
          className="flex items-end gap-0.5 h-3 px-1 border-r border-[var(--border)] pr-2"
          title="Audio visualizer indicator"
          aria-hidden="true"
        >
          {[0.4, 0.9, 0.6, 0.8].map((initialHeight, i) => (
            <motion.span
              key={i}
              className="w-1 rounded-[1px] bg-[var(--color-accent)]"
              animate={
                isPlaying && !prefersReduced
                  ? {
                      height: ['4px', '12px', '6px', '14px', '4px'],
                    }
                  : { height: `${initialHeight * 12}px` }
              }
              transition={
                isPlaying && !prefersReduced
                  ? {
                      duration: 0.6 + i * 0.15,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: i * 0.1,
                    }
                  : undefined
              }
              style={{ height: '4px' }}
            />
          ))}
        </div>

        {/* Lyrics Toggle */}
        {onLyricsToggle && (
          <button
            type="button"
            onClick={onLyricsToggle}
            className={cn(
              'p-1.5 rounded-[3px] transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]',
              isLyricsOpen
                ? 'text-[var(--color-accent)] bg-[var(--surface-raised)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
            )}
            title="Toggle lyrics"
            aria-label="Toggle lyrics"
            aria-pressed={isLyricsOpen}
          >
            <Mic2 size={15} />
          </button>
        )}

        {/* Queue Toggle */}
        {onQueueToggle && (
          <button
            type="button"
            onClick={onQueueToggle}
            className={cn(
              'p-1.5 rounded-[3px] transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]',
              isQueueOpen
                ? 'text-[var(--color-accent)] bg-[var(--surface-raised)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
            )}
            title="Toggle queue"
            aria-label="Toggle queue"
            aria-pressed={isQueueOpen}
          >
            <ListMusic size={15} />
          </button>
        )}

        {/* Volume Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onMuteToggle}
            className="p-1 rounded-[3px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            title={isMuted ? 'Unmute' : 'Mute'}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          <input
            type="range"
            min={0}
            max={100}
            value={effectiveVolume}
            onChange={(e) => onVolumeChange && onVolumeChange(Number(e.target.value))}
            className="w-16 h-1 accent-[var(--color-accent)] bg-[var(--surface-raised)] rounded-full appearance-none cursor-pointer"
            aria-label="Volume slider"
          />
          <span className="text-[10px] font-mono text-[var(--text-muted)] w-6 text-right tabular-nums">
            {effectiveVolume}
          </span>
        </div>
      </div>
    </footer>
  );
};
