import { FC, useRef, useState } from 'react';
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
  Music2,
  Heart,
  ListMusic,
  MicVocal,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { cn } from '@/lib/utils';

export interface PlayerBarProps {
  title?: string;
  artist?: string;
  coverUrl?: string;
  isFavorite?: boolean;
  onFavoriteToggle?: () => void;
  isPlaying?: boolean;
  onPlayPause?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  isShuffle?: boolean;
  onShuffleToggle?: () => void;
  repeatMode?: 'off' | 'all' | 'one';
  onRepeatToggle?: () => void;
  progressSeconds?: number;
  totalDurationSeconds?: number;
  onSeek?: (seconds: number) => void;
  volume?: number; // 0 - 100
  isMuted?: boolean;
  onVolumeChange?: (vol: number) => void;
  onMuteToggle?: () => void;
  isQueueOpen?: boolean;
  onQueueToggle?: () => void;
  isLyricsOpen?: boolean;
  onLyricsToggle?: () => void;
  onArtworkClick?: () => void;
  onTitleClick?: () => void;
  onArtistClick?: () => void;
  className?: string;
}

const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const PlayerBar: FC<PlayerBarProps> = ({
  title = 'No track playing',
  artist = 'Unknown artist',
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
  totalDurationSeconds = 0,
  onSeek,
  volume = 80,
  isMuted = false,
  onVolumeChange,
  onMuteToggle,
  isQueueOpen = false,
  onQueueToggle,
  isLyricsOpen = false,
  onLyricsToggle,
  onArtworkClick,
  onTitleClick,
  onArtistClick,
  className = '',
}) => {
  const percent =
    totalDurationSeconds > 0
      ? Math.min(100, Math.max(0, (progressSeconds / totalDurationSeconds) * 100))
      : 0;

  const remainingSeconds = Math.max(0, totalDurationSeconds - progressSeconds);

  const seekRef = useRef<HTMLDivElement>(null);
  const lastPrevClickRef = useRef<number>(0);

  // Hover timestamp tooltip preview on seekbar
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPercent, setHoverPercent] = useState<number | null>(null);

  const calculateAndSeek = (clientX: number) => {
    if (!onSeek || totalDurationSeconds <= 0 || !seekRef.current) return;
    const rect = seekRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * totalDurationSeconds);
  };

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    calculateAndSeek(e.clientX);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek || totalDurationSeconds <= 0) return;
    calculateAndSeek(e.clientX);

    const onMouseMove = (moveEvent: MouseEvent) => {
      calculateAndSeek(moveEvent.clientX);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleSeekMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!seekRef.current || totalDurationSeconds <= 0) return;
    const rect = seekRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(ratio * totalDurationSeconds);
    setHoverPercent(ratio * 100);
  };

  const handleSeekMouseLeave = () => {
    setHoverTime(null);
    setHoverPercent(null);
  };

  // Previous button double-click vs single-click logic
  const handlePrevClick = () => {
    const now = Date.now();
    const isDoubleClick = now - lastPrevClickRef.current < 400;
    lastPrevClickRef.current = now;

    if (isDoubleClick) {
      onPrevious?.();
      return;
    }

    if (progressSeconds > 3 && onSeek) {
      onSeek(0);
    } else {
      onPrevious?.();
    }
  };

  return (
    <footer
      data-testid="player-bar"
      className={cn(
        'surface-bottombar border-border relative flex flex-col w-full shrink-0 select-none font-sans z-40',
        className,
      )}
      aria-label="Audio Player Controls"
    >
      {/* 1. Full-Width Top Progress / Seek Bar with Hover Timestamp Preview */}
      <div
        ref={seekRef}
        data-testid="player-seek-bar"
        className="border-border surface-seekbar-track relative h-4 w-full cursor-pointer border-t-(length:--border-width) select-none"
        onClick={handleSeekClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleSeekMouseMove}
        onMouseLeave={handleSeekMouseLeave}
      >
        {/* Floating Timestamp Tooltip Preview */}
        {hoverTime !== null && hoverPercent !== null && (
          <div
            style={{ left: `${hoverPercent}%` }}
            className="pointer-events-none absolute -top-7 -translate-x-1/2 z-30 px-1.5 py-0.5 rounded bg-black/90 text-white text-[10px] font-mono border border-border/40 shadow-sm whitespace-nowrap"
          >
            {formatTime(hoverTime)}
          </div>
        )}

        {/* Timecodes: elapsed left, remaining right */}
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-row items-center justify-between px-2 text-[11px] font-mono leading-none font-medium pt-0.5">
          <span className="tabular-nums text-foreground">{formatTime(progressSeconds)}</span>
          <span className="tabular-nums text-foreground">-{formatTime(remainingSeconds)}</span>
        </div>

        {/* Progress Bar Fill */}
        <div
          className="surface-seekbar h-full transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* 2. Main 3-Column Player Controls Bar */}
      <div className="grid h-14 w-full grid-cols-[1fr_auto_1fr] items-center px-4 gap-4">
        {/* LEFT COLUMN: Square Artwork + Track Info + Favorite */}
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              'border-border bg-muted size-11 shrink-0 overflow-hidden rounded-md border-(length:--border-width)',
              onArtworkClick && 'cursor-pointer hover:opacity-90 active:scale-95 transition-transform'
            )}
            onClick={onArtworkClick}
            title={title ? `View ${title}` : undefined}
          >
            {coverUrl ? (
              <img
                src={coverUrl}
                alt=""
                className="size-full object-cover select-none"
                data-testid="player-now-playing-thumbnail"
              />
            ) : (
              <div
                className="text-foreground/40 flex size-full items-center justify-center"
                data-testid="player-now-playing-placeholder"
              >
                <Music2 size={20} />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div
              className={cn('truncate text-sm font-bold text-foreground', {
                'cursor-pointer hover:underline': onTitleClick,
              })}
              data-testid="now-playing-title"
              onClick={onTitleClick}
            >
              {title}
            </div>
            <div
              className={cn('truncate text-xs opacity-70 text-foreground', {
                'cursor-pointer hover:underline': onArtistClick,
              })}
              data-testid="player-now-playing-artist"
              onClick={onArtistClick}
            >
              {artist}
            </div>
          </div>

          {onFavoriteToggle && (
            <Button
              size="icon-sm"
              variant="text"
              onClick={onFavoriteToggle}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              aria-pressed={isFavorite}
              className="shrink-0"
              data-testid="player-favorite-button"
            >
              <Heart
                size={16}
                className={cn(
                  'transition-transform active:scale-90',
                  isFavorite ? 'fill-accent-red text-accent-red' : 'text-foreground/50 hover:text-foreground',
                )}
              />
            </Button>
          )}
        </div>

        {/* CENTER COLUMN: Shuffle, Previous, Play, Next, Repeat */}
        <div className="flex items-center justify-center gap-2">
          {/* Shuffle Button */}
          <Button
            size="icon"
            variant={isShuffle ? 'default' : 'text'}
            onClick={onShuffleToggle}
            data-testid="player-shuffle-button"
            title={isShuffle ? 'Shuffle enabled' : 'Shuffle disabled'}
            aria-label="Shuffle"
            aria-pressed={isShuffle}
          >
            <Shuffle size={16} />
          </Button>

          {/* Previous Button (Single-click / double-click logic) */}
          <Button
            size="icon"
            variant="text"
            onClick={handlePrevClick}
            data-testid="player-prev-button"
            title="Previous track"
            aria-label="Previous track"
          >
            <SkipBack size={16} />
          </Button>

          {/* Play/Pause Button — Hot pink pill with 2px black border & drop shadow */}
          <Button
            size="icon"
            variant="default"
            onClick={onPlayPause}
            data-testid={isPlaying ? 'player-pause-button' : 'player-play-button'}
            title={isPlaying ? 'Pause' : 'Play'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="size-10"
          >
            {isPlaying ? (
              <Pause size={18} className="fill-current" />
            ) : (
              <Play size={18} className="fill-current translate-x-0.5" />
            )}
          </Button>

          {/* Next Button */}
          <Button
            size="icon"
            variant="text"
            onClick={onNext}
            data-testid="player-next-button"
            title="Next track"
            aria-label="Next track"
          >
            <SkipForward size={16} />
          </Button>

          {/* Repeat Button */}
          <Button
            size="icon"
            variant={repeatMode !== 'off' ? 'default' : 'text'}
            onClick={onRepeatToggle}
            data-testid="player-repeat-button"
            title={`Repeat: ${repeatMode}`}
            aria-label="Repeat"
            aria-pressed={repeatMode !== 'off'}
          >
            {repeatMode === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
          </Button>
        </div>

        {/* RIGHT COLUMN: Lyrics Toggle + Queue Toggle + Volume Icon & Horizontal Slider */}
        <div className="flex items-center justify-end gap-2">
          {onLyricsToggle && (
            <Button
              size="icon-sm"
              variant={isLyricsOpen ? 'default' : 'secondary'}
              onClick={onLyricsToggle}
              data-testid="player-lyrics-button"
              title={isLyricsOpen ? 'Hide lyrics (Ctrl+L)' : 'Show lyrics (Ctrl+L)'}
              aria-label="Lyrics"
              aria-pressed={isLyricsOpen}
              className={cn(
                'size-8 transition-all cursor-pointer font-bold',
                isLyricsOpen
                  ? 'surface-primary border-(length:--border-width) border-border text-foreground shadow-shadow translate-x-shadow-x translate-y-shadow-y'
                  : 'hover:border-(length:--border-width) hover:border-border text-foreground/80 hover:text-foreground'
              )}
            >
              <MicVocal size={16} />
            </Button>
          )}

          {onQueueToggle && (
            <Button
              size="icon-sm"
              variant={isQueueOpen ? 'default' : 'text'}
              onClick={onQueueToggle}
              data-testid="player-queue-button"
              title={isQueueOpen ? 'Close Queue' : 'Open Queue'}
              aria-label="Queue"
              aria-pressed={isQueueOpen}
              className={cn('size-8 transition-transform active:scale-95', {
                'border-2 border-border shadow-[2px_2px_0px_var(--border)]': isQueueOpen,
              })}
            >
              <ListMusic size={16} />
            </Button>
          )}

          <Button
            size="icon-sm"
            variant="text"
            onClick={onMuteToggle}
            data-testid="player-mute-button"
            title={isMuted ? 'Unmute' : 'Mute'}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </Button>

          {/* Volume slider with mouse wheel support */}
          <div
            className="w-24 cursor-pointer"
            data-testid="player-volume-slider"
            title="Volume (scroll to adjust)"
            onWheel={(e) => {
              e.preventDefault();
              const step = e.deltaY < 0 ? 5 : -5;
              onVolumeChange?.(Math.max(0, Math.min(100, (volume ?? 80) + step)));
            }}
          >
            <Slider
              value={isMuted ? 0 : volume}
              min={0}
              max={100}
              step={1}
              onValueChange={(val) => onVolumeChange?.(val)}
              showValue={false}
              showFooter={false}
            />
          </div>
        </div>
      </div>
    </footer>
  );
};
