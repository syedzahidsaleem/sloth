/**
 * Sloth NowPlayingBar Component
 * Fixed 72px bottom bar with 3-column grid: TrackInfo | Controls | SecondaryControls
 * Flat panel with background #282d33 and top border 1px #3d444c. NO glassmorphism.
 */

import { FC } from 'react';
import { cn } from '@/lib/utils';
import { PlayerStateProps } from '../types';
import { TrackInfo } from './TrackInfo';
import { Controls } from './Controls';
import { ProgressBar } from './ProgressBar';
import { VolumeControl } from './VolumeControl';
import { SecondaryControls } from './SecondaryControls';

export const NowPlayingBar: FC<PlayerStateProps> = ({
  currentTrack,
  isPlaying,
  onPlayPause,
  onNext,
  onPrevious,
  isShuffle,
  onShuffleToggle,
  repeatMode,
  onRepeatToggle,
  progressSeconds = 0,
  totalDurationSeconds = 0,
  onSeek,
  volume = 80,
  isMuted = false,
  onVolumeChange,
  onMuteToggle,
  isQueueOpen,
  onQueueToggle,
  isLyricsOpen,
  onLyricsToggle,
  isVisualizerOpen,
  onVisualizerToggle,
  onFavoriteToggle,
  className,
}) => {
  return (
    <footer
      className={cn(
        'relative h-[72px] w-full bg-[var(--surface)] border-t border-[var(--border)] select-none z-40',
        'flex flex-col justify-between',
        className
      )}
      data-testid="player-bottom-bar"
    >
      {/* Thin (3px) Seekable Progress Bar spanning the entire top edge */}
      <div className="absolute top-0 left-0 right-0 -translate-y-1/2 z-50">
        <ProgressBar
          progressSeconds={progressSeconds}
          totalDurationSeconds={totalDurationSeconds || currentTrack?.durationSeconds || 0}
          onSeek={onSeek}
        />
      </div>

      {/* Main 3-Column Content Layout (Track Info | Playback Controls | Secondary & Volume) */}
      <div className="grid h-full w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-4 gap-4">
        {/* Column 1: Now Playing Track Info */}
        <div className="min-w-0 justify-self-start">
          <TrackInfo
            track={currentTrack}
            isFavorite={currentTrack?.isFavorite}
            onFavoriteToggle={onFavoriteToggle}
          />
        </div>

        {/* Column 2: Centered Controls */}
        <div className="justify-self-center">
          <Controls
            isPlaying={isPlaying}
            onPlayPause={onPlayPause}
            onNext={onNext}
            onPrevious={onPrevious}
            isShuffle={isShuffle}
            onShuffleToggle={onShuffleToggle}
            repeatMode={repeatMode}
            onRepeatToggle={onRepeatToggle}
          />
        </div>

        {/* Column 3: Volume & Secondary Actions */}
        <div className="flex items-center gap-3 md:gap-4 justify-self-end">
          <VolumeControl
            volume={volume}
            isMuted={isMuted}
            onVolumeChange={onVolumeChange}
            onMuteToggle={onMuteToggle}
          />
          <div className="h-4 w-[1px] bg-[var(--border)]" />
          <SecondaryControls
            isQueueOpen={isQueueOpen}
            onQueueToggle={onQueueToggle}
            isLyricsOpen={isLyricsOpen}
            onLyricsToggle={onLyricsToggle}
            isVisualizerOpen={isVisualizerOpen}
            onVisualizerToggle={onVisualizerToggle}
          />
        </div>
      </div>
    </footer>
  );
};
