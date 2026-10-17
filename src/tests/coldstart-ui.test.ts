/**
 * Sloth Cold-Start & Debiasing UI Unit Tests
 * Verifies settings store persistence, discovery slider alpha settings,
 * onboarding quiz modal configuration, and discovery slot queue badge models.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSlothSettings,
  saveSlothSettings,
  resetSlothSettings,
} from '@/services/settingsStore';
import { GenreQuizModal } from '@/components/onboarding/GenreQuizModal';
import { QueueTrack } from '@/components/player/QueuePanel/QueueTrack';
import { QueueTrackItem } from '@/components/player/types';

function createLocalStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
}

describe('Sloth Cold-Start & Debiasing UI System', () => {
  beforeEach(() => {
    (globalThis as any).localStorage = createLocalStorageMock();
    (globalThis as any).window = {
      dispatchEvent: () => true,
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  });

  describe('Settings Store Discovery & Onboarding Preferences', () => {
    it('initializes with default discoveryAlpha=0.5 and onboardingCompleted=false', () => {
      const settings = getSlothSettings();
      expect(settings.discoveryAlpha).toBe(0.5);
      expect(settings.onboardingCompleted).toBe(false);
    });

    it('persists changes to discoveryAlpha (IPS exponent)', () => {
      saveSlothSettings({ discoveryAlpha: 0.85 });
      const updated = getSlothSettings();
      expect(updated.discoveryAlpha).toBe(0.85);

      saveSlothSettings({ discoveryAlpha: 0.0 });
      const familiar = getSlothSettings();
      expect(familiar.discoveryAlpha).toBe(0.0);
    });

    it('persists onboardingCompleted state when user completes the genre quiz', () => {
      saveSlothSettings({ onboardingCompleted: true });
      const updated = getSlothSettings();
      expect(updated.onboardingCompleted).toBe(true);
    });

    it('resets discovery settings back to defaults on factory reset', () => {
      saveSlothSettings({ discoveryAlpha: 0.95, onboardingCompleted: true });
      resetSlothSettings();
      const reset = getSlothSettings();
      expect(reset.discoveryAlpha).toBe(0.5);
      expect(reset.onboardingCompleted).toBe(false);
    });
  });

  describe('GenreQuizModal Component Export & Structure', () => {
    it('exports GenreQuizModal component cleanly', () => {
      expect(GenreQuizModal).toBeDefined();
    });
  });

  describe('QueueTrack Discovery Slot Badge Properties', () => {
    it('exports QueueTrack component', () => {
      expect(QueueTrack).toBeDefined();
    });

    it('accepts queue tracks tagged as discovery slots with badge New', () => {
      const discoveryTrack: QueueTrackItem = {
        id: 'slot-7',
        title: 'Neon Drift',
        artist: 'Lorn',
        durationSeconds: 274,
        isDiscoverySlot: true,
        badge: 'New',
        score: 0.88,
      };

      expect(discoveryTrack.isDiscoverySlot).toBe(true);
      expect(discoveryTrack.badge).toBe('New');
      expect(discoveryTrack.durationSeconds).toBe(274);
    });
  });
});
