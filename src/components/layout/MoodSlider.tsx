/**
 * Sloth Sidebar Mood Arc — Nuclear-Derived Tactical Sliders & Latent Diffusion Controller
 * Controls Current Mood (Valence / Arousal) + Target Mood Arc (Valence / Arousal after N tracks).
 *
 * Art Direction & Rules:
 * - Nuclear flat UI with solid offset borders (NO glassmorphism, NO blur panels)
 * - OKLCH surface palette: --surface (#282d33), --surface-raised (#31383f), --border, --color-accent
 * - Motion strictly from "motion/react" with useReducedMotion check
 * - High-density information display: JetBrains Mono numeric values
 * - 4 Presets: "Focus", "Wind Down", "Hype Up", "Chill"
 */

import { FC, useState, useCallback, useId } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Compass, RotateCcw, Target, Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MoodCoordinates {
  valence: number; // 0.0 (sad) to 1.0 (happy)
  arousal: number; // 0.0 (calm) to 1.0 (energised)
}

export interface MoodArcState {
  startValence: number;
  startArousal: number;
  targetValence: number;
  targetArousal: number;
  isTargetActive: boolean;
  selectedPreset?: string;
}

export interface MoodSliderProps {
  initialValence?: number;
  initialArousal?: number;
  initialTargetValence?: number;
  initialTargetArousal?: number;
  onChange?: (coords: MoodCoordinates) => void;
  onArcChange?: (arc: MoodArcState) => void;
  onDiffusePlaylist?: (arc: MoodArcState) => void;
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

export interface MoodArcPreset {
  id: string;
  label: string;
  start: MoodCoordinates;
  target: MoodCoordinates;
}

export const MOOD_ARC_PRESETS: MoodArcPreset[] = [
  {
    id: 'focus',
    label: 'Focus',
    start: { valence: 0.20, arousal: 0.30 },
    target: { valence: 0.10, arousal: 0.40 },
  },
  {
    id: 'wind_down',
    label: 'Wind Down',
    start: { valence: 0.40, arousal: 0.70 },
    target: { valence: 0.60, arousal: 0.10 },
  },
  {
    id: 'hype_up',
    label: 'Hype Up',
    start: { valence: 0.30, arousal: 0.40 },
    target: { valence: 0.90, arousal: 0.95 },
  },
  {
    id: 'chill',
    label: 'Chill',
    start: { valence: 0.50, arousal: 0.40 },
    target: { valence: 0.70, arousal: 0.25 },
  },
];

export const MoodSlider: FC<MoodSliderProps> = ({
  initialValence = 0.50,
  initialArousal = 0.40,
  initialTargetValence = 0.70,
  initialTargetArousal = 0.25,
  onChange,
  onArcChange,
  onDiffusePlaylist,
  className,
}) => {
  const [startValence, setStartValence] = useState<number>(initialValence);
  const [startArousal, setStartArousal] = useState<number>(initialArousal);
  const [targetValence, setTargetValence] = useState<number>(initialTargetValence);
  const [targetArousal, setTargetArousal] = useState<number>(initialTargetArousal);
  const [isTargetActive, setIsTargetActive] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<string | undefined>('chill');
  const [isDiffusing, setIsDiffusing] = useState<boolean>(false);

  const prefersReduced = useReducedMotion();

  const startValenceId = useId();
  const startArousalId = useId();
  const targetValenceId = useId();
  const targetArousalId = useId();

  const startQuadrant = getMoodQuadrant(startValence, startArousal);
  const targetQuadrant = getMoodQuadrant(targetValence, targetArousal);

  const notifyState = useCallback(
    (
      sV: number,
      sA: number,
      tV: number,
      tA: number,
      targetActive: boolean,
      preset?: string
    ) => {
      onChange?.({ valence: sV, arousal: sA });
      onArcChange?.({
        startValence: sV,
        startArousal: sA,
        targetValence: tV,
        targetArousal: tA,
        isTargetActive: targetActive,
        selectedPreset: preset,
      });
    },
    [onChange, onArcChange]
  );

  const handleStartValenceChange = (val: number) => {
    const clamped = Math.max(0.0, Math.min(1.0, val));
    setStartValence(clamped);
    setActivePreset(undefined);
    notifyState(clamped, startArousal, targetValence, targetArousal, isTargetActive);
  };

  const handleStartArousalChange = (val: number) => {
    const clamped = Math.max(0.0, Math.min(1.0, val));
    setStartArousal(clamped);
    setActivePreset(undefined);
    notifyState(startValence, clamped, targetValence, targetArousal, isTargetActive);
  };

  const handleTargetValenceChange = (val: number) => {
    const clamped = Math.max(0.0, Math.min(1.0, val));
    setTargetValence(clamped);
    setActivePreset(undefined);
    notifyState(startValence, startArousal, clamped, targetArousal, isTargetActive);
  };

  const handleTargetArousalChange = (val: number) => {
    const clamped = Math.max(0.0, Math.min(1.0, val));
    setTargetArousal(clamped);
    setActivePreset(undefined);
    notifyState(startValence, startArousal, targetValence, clamped, isTargetActive);
  };

  const handleToggleTarget = () => {
    const next = !isTargetActive;
    setIsTargetActive(next);
    notifyState(startValence, startArousal, targetValence, targetArousal, next, activePreset);
  };

  const handlePresetSelect = (preset: MoodArcPreset) => {
    setStartValence(preset.start.valence);
    setStartArousal(preset.start.arousal);
    setTargetValence(preset.target.valence);
    setTargetArousal(preset.target.arousal);
    setIsTargetActive(true);
    setActivePreset(preset.id);
    notifyState(
      preset.start.valence,
      preset.start.arousal,
      preset.target.valence,
      preset.target.arousal,
      true,
      preset.id
    );
  };

  const handleReset = () => {
    setStartValence(0.5);
    setStartArousal(0.5);
    setTargetValence(0.5);
    setTargetArousal(0.5);
    setIsTargetActive(false);
    setActivePreset(undefined);
    notifyState(0.5, 0.5, 0.5, 0.5, false);
  };

  const handleDiffuse = async () => {
    setIsDiffusing(true);
    const arcState: MoodArcState = {
      startValence,
      startArousal,
      targetValence: isTargetActive ? targetValence : startValence,
      targetArousal: isTargetActive ? targetArousal : startArousal,
      isTargetActive,
      selectedPreset: activePreset,
    };

    try {
      await fetch('/api/engine/generator/diffuse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_valence: startValence,
          start_arousal: startArousal,
          target_valence: isTargetActive ? targetValence : startValence,
          target_arousal: isTargetActive ? targetArousal : startArousal,
          preset_name: activePreset,
          num_tracks: 20,
        }),
      }).catch(() => {});
    } catch {
      // Offline fallback
    }

    onDiffusePlaylist?.(arcState);
    setTimeout(() => setIsDiffusing(false), 600);
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-2 p-2.5 rounded-[4px] border border-[var(--border)]',
        'bg-[var(--surface-raised)]/90 text-[var(--text-primary)] font-sans select-none',
        className
      )}
      role="region"
      aria-label="Mood Arc Diffusion Controls"
      data-testid="mood-arc-controls"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5">
        <div className="flex items-center gap-1.5">
          <Compass size={12} className="text-[var(--color-accent)] shrink-0" aria-hidden="true" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] font-semibold">
            Mood Arc
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Target Toggle Button */}
          <button
            type="button"
            onClick={handleToggleTarget}
            title={isTargetActive ? 'Target mood enabled' : 'Enable target mood progression'}
            aria-pressed={isTargetActive}
            data-testid="mood-target-toggle"
            className={cn(
              'flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] text-[9px] font-mono uppercase tracking-tight border transition-colors cursor-pointer',
              isTargetActive
                ? 'bg-[var(--color-accent)] text-black border-[var(--color-accent)] font-bold'
                : 'bg-[var(--background)] text-[var(--text-muted)] border-[var(--border)] hover:text-white'
            )}
          >
            <Target size={9} />
            <span>Target</span>
          </button>

          {/* Reset */}
          <button
            type="button"
            onClick={handleReset}
            title="Reset mood to neutral"
            aria-label="Reset mood sliders"
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 min-size-6 flex items-center justify-center rounded-[4px] transition-colors cursor-pointer"
          >
            <RotateCcw size={12} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Active Mood Pill / Arc Visualizer */}
      <div className="flex items-center justify-between px-1.5 py-1 rounded-[3px] bg-[var(--background)] border border-[var(--border)]">
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-xs">{startQuadrant.emoji}</span>
          <span className={cn('font-semibold text-[10px] truncate', startQuadrant.colorClass)}>
            {startQuadrant.name}
          </span>
        </div>

        {isTargetActive ? (
          <div className="flex items-center gap-1 shrink-0 font-mono text-[9px] text-[var(--color-accent)]">
            <ArrowRight size={10} />
            <span>{targetQuadrant.emoji}</span>
            <span className="text-[var(--text-secondary)]">{targetValence.toFixed(2)}v</span>
          </div>
        ) : (
          <span className="text-[9px] font-mono text-[var(--text-muted)]">
            {startValence.toFixed(2)}v • {startArousal.toFixed(2)}a
          </span>
        )}
      </div>

      {/* Current Mood Section */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--text-muted)] font-semibold">
          Current (Start Track)
        </span>

        {/* Start Valence Slider */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)]">
            <label htmlFor={startValenceId} className="cursor-pointer flex items-center gap-1">
              <span className="text-[var(--text-muted)]">Valence:</span>
              <span className="text-[var(--text-primary)] font-semibold">
                {startValence < 0.4 ? 'Sad' : startValence > 0.6 ? 'Happy' : 'Balanced'}
              </span>
            </label>
            <span className="text-[9px] text-[var(--color-accent)] font-mono">
              {Math.round(startValence * 100)}%
            </span>
          </div>
          <input
            id={startValenceId}
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={startValence}
            onChange={(e) => handleStartValenceChange(parseFloat(e.target.value))}
            aria-label="Current Valence"
            className="w-full h-1.5 appearance-none bg-[var(--background)] rounded-[2px] border border-[var(--border)] cursor-pointer outline-none accent-[var(--color-accent)]"
          />
        </div>

        {/* Start Arousal Slider */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)]">
            <label htmlFor={startArousalId} className="cursor-pointer flex items-center gap-1">
              <span className="text-[var(--text-muted)]">Arousal:</span>
              <span className="text-[var(--text-primary)] font-semibold">
                {startArousal < 0.4 ? 'Calm' : startArousal > 0.6 ? 'Energised' : 'Moderate'}
              </span>
            </label>
            <span className="text-[9px] text-[var(--color-accent)] font-mono">
              {Math.round(startArousal * 100)}%
            </span>
          </div>
          <input
            id={startArousalId}
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={startArousal}
            onChange={(e) => handleStartArousalChange(parseFloat(e.target.value))}
            aria-label="Current Arousal"
            className="w-full h-1.5 appearance-none bg-[var(--background)] rounded-[2px] border border-[var(--border)] cursor-pointer outline-none accent-[var(--color-accent)]"
          />
        </div>
      </div>

      {/* Target Mood Section (Revealed when Target toggle is active) */}
      <AnimatePresence>
        {isTargetActive && (
          <motion.div
            initial={prefersReduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-1.5 pt-2 border-t border-[var(--border)]/70 overflow-hidden"
            data-testid="target-mood-sliders"
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--color-accent)] font-semibold">
                Target (after 20 tracks)
              </span>
              <span className="text-[8px] font-mono text-[var(--text-muted)]">
                lerp + N(0, 0.05)
              </span>
            </div>

            {/* Target Valence Slider */}
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)]">
                <label htmlFor={targetValenceId} className="cursor-pointer flex items-center gap-1">
                  <span className="text-[var(--text-muted)]">Target V:</span>
                  <span className="text-[var(--text-primary)] font-semibold">
                    {targetValence < 0.4 ? 'Somber' : targetValence > 0.6 ? 'Euphoric' : 'Neutral'}
                  </span>
                </label>
                <span className="text-[9px] text-[var(--color-accent)] font-mono">
                  {Math.round(targetValence * 100)}%
                </span>
              </div>
              <input
                id={targetValenceId}
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={targetValence}
                onChange={(e) => handleTargetValenceChange(parseFloat(e.target.value))}
                aria-label="Target Valence"
                className="w-full h-1.5 appearance-none bg-[var(--background)] rounded-[2px] border border-[var(--border)] cursor-pointer outline-none accent-[var(--color-accent)]"
              />
            </div>

            {/* Target Arousal Slider */}
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)]">
                <label htmlFor={targetArousalId} className="cursor-pointer flex items-center gap-1">
                  <span className="text-[var(--text-muted)]">Target A:</span>
                  <span className="text-[var(--text-primary)] font-semibold">
                    {targetArousal < 0.4 ? 'Deep Calm' : targetArousal > 0.6 ? 'Peak Hype' : 'Steady'}
                  </span>
                </label>
                <span className="text-[9px] text-[var(--color-accent)] font-mono">
                  {Math.round(targetArousal * 100)}%
                </span>
              </div>
              <input
                id={targetArousalId}
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={targetArousal}
                onChange={(e) => handleTargetArousalChange(parseFloat(e.target.value))}
                aria-label="Target Arousal"
                className="w-full h-1.5 appearance-none bg-[var(--background)] rounded-[2px] border border-[var(--border)] cursor-pointer outline-none accent-[var(--color-accent)]"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preset Buttons: "Focus", "Wind Down", "Hype Up", "Chill" */}
      <div className="flex items-center gap-1 pt-1 border-t border-[var(--border)]" role="group" aria-label="Mood Arc Presets">
        {MOOD_ARC_PRESETS.map((p) => {
          const isSelected = activePreset === p.id;
          return (
            <motion.button
              key={p.id}
              type="button"
              onClick={() => handlePresetSelect(p)}
              whileHover={prefersReduced ? undefined : { scale: 1.03 }}
              whileTap={prefersReduced ? undefined : { scale: 0.97 }}
              aria-pressed={isSelected}
              data-testid={`mood-preset-${p.id}`}
              className={cn(
                'flex-1 py-1 px-1 text-[9px] font-mono uppercase tracking-tight rounded-[2px] border transition-colors cursor-pointer text-center truncate',
                isSelected
                  ? 'bg-[var(--color-accent)] text-black border-[var(--color-accent)] font-bold'
                  : 'bg-[var(--background)] text-[var(--text-muted)] border-[var(--border)] hover:text-white hover:border-[var(--text-secondary)]'
              )}
            >
              {p.label}
            </motion.button>
          );
        })}
      </div>

      {/* Diffuse Playlist Action */}
      <button
        type="button"
        onClick={handleDiffuse}
        disabled={isDiffusing}
        data-testid="mood-diffuse-button"
        className="mt-0.5 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-[3px] bg-[var(--surface)] hover:bg-[var(--surface-raised)] border border-[var(--border)] hover:border-[var(--color-accent)]/60 text-xs font-semibold text-[var(--text-primary)] hover:text-[var(--color-accent)] transition-all cursor-pointer shadow-xs"
      >
        <Sparkles size={12} className={cn('text-[var(--color-accent)]', isDiffusing && 'animate-spin')} />
        <span>{isDiffusing ? 'Synthesizing Arc...' : 'Diffuse 20-Track Arc'}</span>
      </button>
    </div>
  );
};
