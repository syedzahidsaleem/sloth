/**
 * Sloth Player & Queue Type Definitions
 */

export interface PlayerTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  durationSeconds: number;
  coverUrl?: string;
  sourceUrl?: string;
  isFavorite?: boolean;
}

export interface QueueTrackItem extends PlayerTrack {
  addedAt?: number;
  score?: number;
  recommendationSource?: string;
}

export type RepeatMode = 'off' | 'all' | 'one';

export interface PlayerStateProps {
  currentTrack?: PlayerTrack;
  isPlaying?: boolean;
  onPlayPause?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;

  isShuffle?: boolean;
  onShuffleToggle?: () => void;
  repeatMode?: RepeatMode;
  onRepeatToggle?: () => void;

  progressSeconds?: number;
  totalDurationSeconds?: number;
  onSeek?: (seconds: number) => void;

  volume?: number;
  isMuted?: boolean;
  onVolumeChange?: (vol: number) => void;
  onMuteToggle?: () => void;

  isQueueOpen?: boolean;
  onQueueToggle?: () => void;
  isLyricsOpen?: boolean;
  onLyricsToggle?: () => void;
  isVisualizerOpen?: boolean;
  onVisualizerToggle?: () => void;

  onFavoriteToggle?: () => void;
  className?: string;
}
