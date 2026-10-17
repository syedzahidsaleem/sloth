/**
 * Sloth User Settings Store & Types
 * Nuclear-derived preferences and configuration.
 * Persists to localStorage on client, with typed schemas and reactive state listener.
 */

import { AccentPalette, setAccentPalette } from '@/styles/tokens';

export type AudioQualityPreference = 'lossy' | 'lossless';
export type FontSizePreference = 'compact' | 'normal' | 'large';

export interface EqualizerBands {
  32: number;
  64: number;
  125: number;
  250: number;
  500: number;
  1000: number;
  2000: number;
  4000: number;
  8000: number;
  16000: number;
}

export type EqualizerPreset =
  | 'Flat'
  | 'Bass Boost'
  | 'Vocal Boost'
  | 'Electronic'
  | 'Rock'
  | 'Acoustic';

export const EQUALIZER_PRESETS: Record<EqualizerPreset, EqualizerBands> = {
  Flat: { 32: 0, 64: 0, 125: 0, 250: 0, 500: 0, 1000: 0, 2000: 0, 4000: 0, 8000: 0, 16000: 0 },
  'Bass Boost': { 32: 6, 64: 5, 125: 4, 250: 2, 500: 0, 1000: 0, 2000: 0, 4000: 1, 8000: 2, 16000: 3 },
  'Vocal Boost': { 32: -2, 64: -1, 125: 0, 250: 2, 500: 4, 1000: 5, 2000: 4, 4000: 2, 8000: 1, 16000: 0 },
  Electronic: { 32: 5, 64: 4, 125: 2, 250: 0, 500: -2, 1000: 2, 2000: 1, 4000: 3, 8000: 4, 16000: 5 },
  Rock: { 32: 4, 64: 3, 125: 1, 250: -1, 500: -2, 1000: 0, 2000: 2, 4000: 4, 8000: 4, 16000: 4 },
  Acoustic: { 32: 3, 64: 2, 125: 1, 250: 1, 500: 2, 1000: 2, 2000: 3, 4000: 3, 8000: 2, 16000: 1 },
};

export interface SlothSettings {
  // General
  language: string;
  libraryPath: string;
  downloadFolder: string;

  // Playback
  crossfadeSeconds: number; // 0 to 12s
  volumeNormalization: boolean;
  skipSilence: boolean;
  audioQuality: AudioQualityPreference;
  equalizer: {
    enabled: boolean;
    preAmp: number; // -12 to +12 dB
    preset: EqualizerPreset;
    bands: EqualizerBands;
  };

  // Sources
  sourcePriorities: string[]; // ['youtube', 'piped', 'qobuz', 'fastapi']

  // Appearance
  accent: AccentPalette;
  fontSize: FontSizePreference;
  showTrackNumbers: boolean;

  // Integrations
  lastFmEnabled: boolean;
  lastFmUsername: string;
  lastFmSessionKey: string;
  listenBrainzEnabled: boolean;
  listenBrainzToken: string;
  discordRpcEnabled: boolean;
  mcpServerEnabled: boolean;
  mcpServerPort: number;
}

export const DEFAULT_SETTINGS: SlothSettings = {
  language: 'en_US',
  libraryPath: '~/Music/Sloth',
  downloadFolder: '~/Downloads/Sloth',

  crossfadeSeconds: 3,
  volumeNormalization: true,
  skipSilence: false,
  audioQuality: 'lossless',
  equalizer: {
    enabled: true,
    preAmp: 0,
    preset: 'Flat',
    bands: { ...EQUALIZER_PRESETS.Flat },
  },

  sourcePriorities: ['youtube', 'piped', 'qobuz', 'fastapi'],

  accent: 'green',
  fontSize: 'normal',
  showTrackNumbers: true,

  lastFmEnabled: false,
  lastFmUsername: '',
  lastFmSessionKey: '',
  listenBrainzEnabled: false,
  listenBrainzToken: '',
  discordRpcEnabled: true,
  mcpServerEnabled: true,
  mcpServerPort: 8800,
};

const SETTINGS_STORAGE_KEY = 'sloth_user_settings_v1';
const SETTINGS_CHANGE_EVENT = 'sloth_settings_changed';

/**
 * Load settings from storage with safe fallback.
 */
export function getSlothSettings(): SlothSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }

  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      equalizer: {
        ...DEFAULT_SETTINGS.equalizer,
        ...(parsed.equalizer || {}),
        bands: {
          ...DEFAULT_SETTINGS.equalizer.bands,
          ...(parsed.equalizer?.bands || {}),
        },
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save settings and notify listeners.
 */
export function saveSlothSettings(newSettings: Partial<SlothSettings>): SlothSettings {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_SETTINGS, ...newSettings };
  }

  const current = getSlothSettings();
  const updated: SlothSettings = {
    ...current,
    ...newSettings,
    equalizer: newSettings.equalizer
      ? {
          ...current.equalizer,
          ...newSettings.equalizer,
          bands: {
            ...current.equalizer.bands,
            ...(newSettings.equalizer.bands || {}),
          },
        }
      : current.equalizer,
  };

  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    // Apply accent update if accent changed
    if (newSettings.accent && newSettings.accent !== current.accent) {
      setAccentPalette(newSettings.accent);
    }
    window.dispatchEvent(new CustomEvent(SETTINGS_CHANGE_EVENT, { detail: updated }));
  } catch (err) {
    console.error('Failed to save settings to localStorage:', err);
  }

  return updated;
}

/**
 * Reset settings to factory defaults.
 */
export function resetSlothSettings(): SlothSettings {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    setAccentPalette('green');
    window.dispatchEvent(new CustomEvent(SETTINGS_CHANGE_EVENT, { detail: DEFAULT_SETTINGS }));
  }
  return DEFAULT_SETTINGS;
}

export { SETTINGS_CHANGE_EVENT };
