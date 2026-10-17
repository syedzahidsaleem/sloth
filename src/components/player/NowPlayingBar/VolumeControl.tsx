/**
 * Sloth VolumeControl Component
 * Speaker icon + Slider component. Mute on icon click.
 */

import { FC } from 'react';
import { Volume2, Volume1, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/Slider';
import { playerControlVariants } from '../variants';

export interface VolumeControlProps {
  volume?: number; // 0 to 100
  isMuted?: boolean;
  onVolumeChange?: (vol: number) => void;
  onMuteToggle?: () => void;
  disabled?: boolean;
  className?: string;
}

export const VolumeControl: FC<VolumeControlProps> = ({
  volume = 80,
  isMuted = false,
  onVolumeChange,
  onMuteToggle,
  disabled = false,
  className,
}) => {
  const currentVolume = isMuted ? 0 : volume;

  const renderIcon = () => {
    if (isMuted || currentVolume === 0) {
      return <VolumeX size={16} className="text-[var(--text-muted)]" />;
    }
    if (currentVolume < 50) {
      return <Volume1 size={16} className="text-[var(--text-secondary)]" />;
    }
    return <Volume2 size={16} className="text-[var(--text-secondary)]" />;
  };

  return (
    <div className={cn('flex items-center gap-2 select-none', className)}>
      {/* Mute/Unmute Toggle Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={onMuteToggle}
        className={cn(
          playerControlVariants({ size: 'sm' }),
          'cursor-pointer hover:text-[var(--text-primary)]'
        )}
        title={isMuted ? 'Unmute' : 'Mute'}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
        data-testid="player-mute-button"
      >
        {renderIcon()}
      </button>

      {/* Horizontal Volume Slider */}
      <div className="w-20 md:w-24" data-testid="player-volume-slider">
        <Slider
          value={currentVolume}
          min={0}
          max={100}
          step={1}
          disabled={disabled}
          showValue={false}
          onValueChange={(val) => {
            if (isMuted && val > 0 && onMuteToggle) {
              onMuteToggle();
            }
            onVolumeChange?.(val);
          }}
          className="py-1"
        />
      </div>
    </div>
  );
};
