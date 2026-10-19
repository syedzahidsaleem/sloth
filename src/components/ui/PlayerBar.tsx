import { FC } from 'react';
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
import { Button } from './Button';
import { Slider } from './Slider';

export type PlayerBarProps = {
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
  isLoading?: boolean;
  onSeek?: (seconds: number) => void;

  // Volume
  volume?: number;
  isMuted?: boolean;
  onVolumeChange?: (vol: number) => void;
  onMuteToggle?: () => void;

  // Extra controls
  isQueueOpen?: boolean;
  onQueueToggle?: () => void;
  isLyricsOpen?: boolean;
  onLyricsToggle?: () => void;

  className?: string;
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const PlayerBar: FC<PlayerBarProps> = ({
  title = 'No Track Selected',
  artist = 'Sloth Player',
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
  isLoading = false,
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
  const percentage =
    totalDurationSeconds > 0
      ? Math.min(Math.max((progressSeconds / totalDurationSeconds) * 100, 0), 100)
      : 0;

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isLoading || !onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * totalDurationSeconds);
  };

  return (
    <footer
      className={cn(
        'surface-bottombar border-border relative flex h-[72px] w-full flex-col border-t-(length:--border-width) px-4 select-none',
        className,
      )}
    >
      {/* Top Embedded Seek Bar */}
      <div
        onClick={handleSeekClick}
        className={cn(
          'border-border surface-seekbar-track absolute -top-(length:--border-width) left-0 right-0 h-2.5 cursor-pointer border-y-(length:--border-width) group transition-all hover:h-3.5',
          isLoading && 'cursor-wait',
        )}
      >
        {isLoading ? (
          <div className="bg-stripes-diagonal size-full opacity-80" />
        ) : (
          <div
            className="surface-seekbar relative h-full transition-all duration-100 group-hover:brightness-110"
            style={{ width: `${percentage}%` }}
          >
            <div className="border-border bg-foreground absolute right-0 top-1/2 -mt-1.5 h-3 w-3 -translate-y-1/2 rounded-full border-(length:--border-width) opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        )}
      </div>

      {/* Main Controls Grid */}
      <div className="grid h-full w-full grid-cols-[1fr_auto_1fr] items-center gap-4 pt-1">
        {/* Left: Now Playing */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="border-border bg-muted relative size-12 shrink-0 overflow-hidden rounded border-(length:--border-width)">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <div className="text-muted-foreground flex size-full items-center justify-center">
                <Music size={20} />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-foreground truncate text-sm font-bold">
              {title}
            </div>
            <div className="text-foreground/70 truncate text-xs">
              {artist}
            </div>
          </div>
          {onFavoriteToggle && (
            <Button
              size="icon-sm"
              variant="text"
              onClick={onFavoriteToggle}
              className={cn(
                'text-foreground/70 hover:text-foreground',
                isFavorite && 'text-accent-red hover:text-accent-red',
              )}
              aria-label="Toggle favorite"
            >
              <Heart size={16} className={isFavorite ? 'fill-current' : ''} />
            </Button>
          )}
        </div>

        {/* Center: Playback Controls & Timestamps */}
        <div className="flex flex-col items-center justify-center gap-1">
          <div className="flex items-center gap-2">
            <Button
              size="icon-sm"
              variant={isShuffle ? 'default' : 'text'}
              onClick={onShuffleToggle}
              aria-label="Shuffle"
            >
              <Shuffle size={14} />
            </Button>

            <Button
              size="icon-sm"
              variant="text"
              onClick={onPrevious}
              aria-label="Previous track"
            >
              <SkipBack size={16} />
            </Button>

            <Button
              size="icon"
              variant="default"
              onClick={onPlayPause}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="size-10 shadow-shadow active:scale-95"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} className="translate-x-0.5" />}
            </Button>

            <Button
              size="icon-sm"
              variant="text"
              onClick={onNext}
              aria-label="Next track"
            >
              <SkipForward size={16} />
            </Button>

            <Button
              size="icon-sm"
              variant={repeatMode !== 'off' ? 'default' : 'text'}
              onClick={onRepeatToggle}
              aria-label={`Repeat: ${repeatMode}`}
            >
              {repeatMode === 'one' ? <Repeat1 size={14} /> : <Repeat size={14} />}
            </Button>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-semibold tabular-nums text-foreground/60">
            <span>{formatTime(progressSeconds)}</span>
            <span>/</span>
            <span>{formatTime(totalDurationSeconds)}</span>
          </div>
        </div>

        {/* Right: Volume & Drawer Toggles */}
        <div className="flex items-center justify-end gap-3">
          <Button
            size="icon-sm"
            variant={isLyricsOpen ? 'default' : 'text'}
            onClick={onLyricsToggle}
            aria-label="Toggle Lyrics"
          >
            <Mic2 size={16} />
          </Button>

          <Button
            size="icon-sm"
            variant={isQueueOpen ? 'default' : 'text'}
            onClick={onQueueToggle}
            aria-label="Toggle Queue"
          >
            <ListMusic size={16} />
          </Button>

          {/* Volume slider */}
          <div className="flex items-center gap-2 w-32">
            <Button
              size="icon-sm"
              variant="text"
              onClick={onMuteToggle}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </Button>
            <div className="flex-1">
              <Slider
                value={isMuted ? 0 : volume}
                min={0}
                max={100}
                step={1}
                showValue={false}
                onValueChange={(val) => onVolumeChange?.(val)}
              />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
