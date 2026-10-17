/**
 * Sloth Sidebar Mood Arc UI Unit Tests
 * Verifies MoodSlider component exports, preset configurations ("Focus", "Wind Down", "Hype Up", "Chill"),
 * start/target coordinate bounds, and MoodArcState typing.
 */

import { describe, it, expect } from 'vitest';
import {
  MoodSlider,
  MOOD_ARC_PRESETS,
  MoodArcState,
} from '@/components/layout/MoodSlider';

describe('Sloth Mood Arc Sidebar UI', () => {
  it('exports MoodSlider component cleanly', () => {
    expect(MoodSlider).toBeDefined();
  });

  describe('Mood Arc Presets', () => {
    it('contains exactly 4 calibrated presets: Focus, Wind Down, Hype Up, Chill', () => {
      const presetIds = MOOD_ARC_PRESETS.map((p) => p.id);
      expect(presetIds).toEqual(['focus', 'wind_down', 'hype_up', 'chill']);
    });

    it('correctly configures Focus preset coordinates', () => {
      const focus = MOOD_ARC_PRESETS.find((p) => p.id === 'focus')!;
      expect(focus.label).toBe('Focus');
      expect(focus.start.valence).toBe(0.20);
      expect(focus.start.arousal).toBe(0.30);
      expect(focus.target.valence).toBe(0.10);
      expect(focus.target.arousal).toBe(0.40);
    });

    it('correctly configures Wind Down preset coordinates', () => {
      const windDown = MOOD_ARC_PRESETS.find((p) => p.id === 'wind_down')!;
      expect(windDown.label).toBe('Wind Down');
      expect(windDown.start.valence).toBe(0.40);
      expect(windDown.start.arousal).toBe(0.70);
      expect(windDown.target.valence).toBe(0.60);
      expect(windDown.target.arousal).toBe(0.10);
    });

    it('correctly configures Hype Up preset coordinates', () => {
      const hypeUp = MOOD_ARC_PRESETS.find((p) => p.id === 'hype_up')!;
      expect(hypeUp.label).toBe('Hype Up');
      expect(hypeUp.start.valence).toBe(0.30);
      expect(hypeUp.start.arousal).toBe(0.40);
      expect(hypeUp.target.valence).toBe(0.90);
      expect(hypeUp.target.arousal).toBe(0.95);
    });

    it('correctly configures Chill preset coordinates', () => {
      const chill = MOOD_ARC_PRESETS.find((p) => p.id === 'chill')!;
      expect(chill.label).toBe('Chill');
      expect(chill.start.valence).toBe(0.50);
      expect(chill.start.arousal).toBe(0.40);
      expect(chill.target.valence).toBe(0.70);
      expect(chill.target.arousal).toBe(0.25);
    });

    it('ensures all preset coordinates are strictly bounded in [0.0, 1.0]', () => {
      MOOD_ARC_PRESETS.forEach((preset) => {
        expect(preset.start.valence).toBeGreaterThanOrEqual(0.0);
        expect(preset.start.valence).toBeLessThanOrEqual(1.0);
        expect(preset.start.arousal).toBeGreaterThanOrEqual(0.0);
        expect(preset.start.arousal).toBeLessThanOrEqual(1.0);
        expect(preset.target.valence).toBeGreaterThanOrEqual(0.0);
        expect(preset.target.valence).toBeLessThanOrEqual(1.0);
        expect(preset.target.arousal).toBeGreaterThanOrEqual(0.0);
        expect(preset.target.arousal).toBeLessThanOrEqual(1.0);
      });
    });
  });

  describe('MoodArcState Contract', () => {
    it('instantiates valid MoodArcState objects', () => {
      const arc: MoodArcState = {
        startValence: 0.35,
        startArousal: 0.45,
        targetValence: 0.85,
        targetArousal: 0.90,
        isTargetActive: true,
        selectedPreset: 'hype_up',
      };

      expect(arc.startValence).toBe(0.35);
      expect(arc.targetValence).toBe(0.85);
      expect(arc.isTargetActive).toBe(true);
      expect(arc.selectedPreset).toBe('hype_up');
    });
  });
});
