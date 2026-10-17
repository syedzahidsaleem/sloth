/**
 * Sloth LyricsToggle Component
 * Neobrutalist tactile toggle button for PlayerBar secondary controls.
 */

import React from 'react';
import { MicVocal } from 'lucide-react';
import { playerControlVariants } from '../player/variants';

export interface LyricsToggleProps {
  isOpen: boolean;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
  title?: string;
}

export const LyricsToggle: React.FC<LyricsToggleProps> = ({
  isOpen,
  onToggle,
  disabled = false,
  className = '',
  title = 'Toggle Synchronized Lyrics',
}) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={isOpen}
      className={`${playerControlVariants({
        variant: isOpen ? 'accentToggle' : 'ghost',
        size: 'sm',
        active: isOpen,
      })} ${
        isOpen
          ? 'bg-[var(--surface-raised)] border border-[var(--color-accent)] shadow-xs'
          : 'hover:bg-[var(--surface-raised)] border border-transparent'
      } ${className}`}
    >
      <MicVocal
        size={16}
        className={`transition-colors ${
          isOpen ? 'text-[var(--color-accent)]' : 'text-[var(--text-muted)] group-hover:text-white'
        }`}
      />
    </button>
  );
};
