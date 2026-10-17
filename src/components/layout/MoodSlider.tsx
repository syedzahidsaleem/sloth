/**
 * Sloth Sidebar Mood Slider — Nuclear-Derived Tactical Sliders
 * Controls Valence (Sad ↔ Happy) and Arousal (Calm ↔ Energised) in Russell's Circumplex Space.
 *
 * Art Direction & Rules:
 * - OKLCH surfaces: --surface (#282d33), --surface-raised (#31383f), --border, --color-accent
 * - Flat UI with solid borders (NO glassmorphism, NO blur panels)
 * - Motion imported strictly from "motion/react" with useReducedMotion check
 * - High-density information display: JetBrains Mono numeric values
 * - WCAG AA Accessible: Keyboard step navigation, full ARIA slider attributes
 */

import { FC, useState, useCallback, useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Compass, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MoodCoordinates {
  valence: number; // 0.0 (sad) to 1.0 (happy)
  arousal: number; // 0.0 (calm) to 1.0 (energised)
}

export interface MoodSliderProps {
  initialValence?: number;
  initialArousal?: number;
  onChange?: (coords: MoodCoordinates) => void;
  className?: string;
}

interface MoodQuadrant {
  name: string;
  emoji: string;
  colorClass: string;
}

function getMoodQuadrant(valence: number, arousal: number): MoodQuadrant {
  if (valence >= 0.5 && arousal >= 0.5) {
    return { name: 'Euphoric / Joyful', emoji: '⚡', colorClass: 'text-[var(--color-accent)]' };
  }
  if (valence < 0.5 && arousal >= 0.5) {
    return { name: 'Tense / Dramatic', emoji: '🔥', colorClass: 'text-amber-400' };
  }
  if (valence >= 0.5 && arousal < 0.5) {
    return { name: 'Chill / Serene', emoji: '🍃', colorClass: 'text-emerald-400' };
  }
  return { name: 'Somber / Melancholy', emoji: '🌧️', colorClass: 'text-sky-400' };
}

const PRESETS: { label: string; coords: MoodCoordinates }[] = [
  { label: 'Chill', coords: { valence: 0.75, arousal: 0.25 } },
  { label: 'Focus', coords: { valence: 0.60, arousal: 0.40 } },
  { label: 'Energy', coords: { valence: 0.85, arousal: 0.85 } },
  { label: 'Deep', coords: { valence: 0.30, arousal: 0.30 } },
];

export const MoodSlider: FC<MoodSliderProps> = ({
  initialValence = 0.65,
  initialArousal = 0.70,
  onChange,
  className,
}) => {
  const [valence, setValence] = useState<number>(initialValence);
  const [arousal, setArousal] = useState<number>(initialArousal);
  const prefersReduced = useReducedMotion();

  const valenceId = useId();
  const arousalId = useId();

  const quadrant = getMoodQuadrant(valence, arousal);

  const handleValenceChange = useCallback(
    (newVal: number) => {
      const clamped = Math.max(0.0, Math.min(1.0, newVal));
      setValence(clamped);
      onChange?.({ valence: clamped, arousal });
    },
    [arousal, onChange]
  );

  const handleArousalChange = useCallback(
    (newVal: number) => {
      const clamped = Math.max(0.0, Math.min(1.0, newVal));
      setArousal(clamped);
      onChange?.({ valence, arousal: clamped });
    },
    [valence, onChange]
  );

  const handlePresetSelect = useCallback(
    (preset: MoodCoordinates) => {
      setValence(preset.valence);
      setArousal(preset.arousal);
      onChange?.(preset);
    },
    [onChange]
  );

  const handleReset = useCallback(() => {
    handlePresetSelect({ valence: 0.5, arousal: 0.5 });
  }, [handlePresetSelect]);

  return (
    <div
      className={cn(
        'flex flex-col gap-2 p-2.5 rounded-[4px] border border-[var(--border)]',
        'bg-[var(--surface-raised)]/80 text-[var(--text-primary)] font-sans select-none',
        className
      )}
      role="region"
      aria-label="Mood Guidance Controls"
    >
      {/* Header with Circumplex State */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5">
        <div className="flex items-center gap-1.5">
          <Compass size={12} className="text-[var(--color-accent)] shrink-0" aria-hidden="true" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] font-semibold">
            Target Mood
          </span>
        </div>
        <button
          type="button"
          onClick={handleReset}
          title="Reset to neutral (0.5, 0.5)"
          aria-label="Reset mood sliders"
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 rounded-[2px] transition-colors cursor-pointer"
        >
          <RotateCcw size={10} aria-hidden="true" />
        </button>
      </div>

      {/* Active Mood Quadrant Pill */}
      <div className="flex items-center justify-between px-1.5 py-1 rounded-[3px] bg-[var(--background)] border border-[var(--border)]">
        <span className="text-[10px] flex items-center gap-1">
          <span className="text-xs">{quadrant.emoji}</span>
          <span className={cn('font-semibold tracking-tight text-[10px]', quadrant.colorClass)}>
            {quadrant.name}
          </span>
        </span>
        <span className="text-[9px] font-mono text-[var(--text-muted)]">
          {valence.toFixed(2)}v • {arousal.toFixed(2)}a
        </span>
      </div>

      {/* Slider 1: Valence (Sad ↔ Happy) */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)]">
          <label htmlFor={valenceId} className="cursor-pointer flex items-center gap-1">
            <span className="text-[var(--text-muted)]">Valence:</span>
            <span className="text-[var(--text-primary)] font-semibold">
              {valence < 0.4 ? 'Sad' : valence > 0.6 ? 'Happy' : 'Balanced'}
            </span>
          </label>
          <span className="text-[9px] text-[var(--color-accent)] font-mono">
            {Math.round(valence * 100)}%
          </span>
        </div>

        {/* Custom tactile range slider */}
        <div className="relative flex items-center w-full h-4">
          <input
            id={valenceId}
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={valence}
            onChange={(e) => handleValenceChange(parseFloat(e.target.value))}
            aria-label="Valence (Sad to Happy)"
            aria-valuemin={0}
            aria-valuemax={1}
            aria-valuenow={valence}
            aria-valuetext={`${Math.round(valence * 100)} percent valence`}
            className="w-full h-1.5 appearance-none bg-[var(--background)] rounded-[2px] border border-[var(--border)] cursor-pointer outline-none accent-[var(--color-accent)] focus-visible:ring-1 focus-visible:ring-[var(--color-accent)]"
          />
        </div>

        <div className="flex items-center justify-between text-[8px] font-mono text-[var(--text-muted)] uppercase tracking-tight -mt-0.5">
          <span>Sad</span>
          <span>Happy</span>
        </div>
      </div>

      {/* Slider 2: Arousal (Calm ↔ Energised) */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)]">
          <label htmlFor={arousalId} className="cursor-pointer flex items-center gap-1">
            <span className="text-[var(--text-muted)]">Arousal:</span>
            <span className="text-[var(--text-primary)] font-semibold">
              {arousal < 0.4 ? 'Calm' : arousal > 0.6 ? 'Energised' : 'Moderate'}
            </span>
          </label>
          <span className="text-[9px] text-[var(--color-accent)] font-mono">
            {Math.round(arousal * 100)}%
          </span>
        </div>

        {/* Custom tactile range slider */}
        <div className="relative flex items-center w-full h-4">
          <input
            id={arousalId}
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={arousal}
            onChange={(e) => handleArousalChange(parseFloat(e.target.value))}
            aria-label="Arousal (Calm to Energised)"
            aria-valuemin={0}
            aria-valuemax={1}
            aria-valuenow={arousal}
            aria-valuetext={`${Math.round(arousal * 100)} percent arousal`}
            className="w-full h-1.5 appearance-none bg-[var(--background)] rounded-[2px] border border-[var(--border)] cursor-pointer outline-none accent-[var(--color-accent)] focus-visible:ring-1 focus-visible:ring-[var(--color-accent)]"
          />
        </div>

        <div className="flex items-center justify-between text-[8px] font-mono text-[var(--text-muted)] uppercase tracking-tight -mt-0.5">
          <span>Calm</span>
          <span>Energised</span>
        </div>
      </div>

      {/* Preset Quick-Buttons */}
      <div className="flex items-center gap-1 pt-1 border-t border-[var(--border)]" role="group" aria-label="Mood Presets">
        {PRESETS.map((p) => {
          const isSelected =
            Math.abs(valence - p.coords.valence) < 0.1 && Math.abs(arousal - p.coords.arousal) < 0.1;

          return (
            <motion.button
              key={p.label}
              type="button"
              onClick={() => handlePresetSelect(p.coords)}
              whileHover={prefersReduced ? undefined : { scale: 1.04 }}
              whileTap={prefersReduced ? undefined : { scale: 0.96 }}
              aria-pressed={isSelected}
              className={cn(
                'flex-1 py-0.5 px-1 text-[9px] font-mono uppercase tracking-tight rounded-[2px] border transition-colors cursor-pointer text-center',
                isSelected
                  ? 'bg-[var(--color-accent)] text-[var(--color-accent-foreground)] border-[var(--color-accent)] font-bold'
                  : 'bg-[var(--background)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)]'
              )}
            >
              {p.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
