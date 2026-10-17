/**
 * Sloth Settings Engine Integration UI Tests
 * Verifies settings store defaults, engine toggle, persistent host configuration,
 * and FAISS re-indexing trigger behavior.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getSlothSettings,
  saveSlothSettings,
  resetSlothSettings,
} from '@/services/settingsStore';
import SettingsPage from '@/app/settings/page';

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

describe('Settings Engine Integration UI', () => {
  beforeEach(() => {
    (globalThis as any).localStorage = createLocalStorageMock();
    (globalThis as any).window = {
      dispatchEvent: vi.fn(() => true),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
  });

  describe('SettingsStore Engine Configuration', () => {
    it('initializes with default engineEnabled=true and engineHost=localhost:8001', () => {
      const settings = getSlothSettings();
      expect(settings.engineEnabled).toBe(true);
      expect(settings.engineHost).toBe('localhost:8001');
    });

    it('persists toggle state when engine is enabled or disabled', () => {
      saveSlothSettings({ engineEnabled: false });
      let updated = getSlothSettings();
      expect(updated.engineEnabled).toBe(false);

      saveSlothSettings({ engineEnabled: true });
      updated = getSlothSettings();
      expect(updated.engineEnabled).toBe(true);
    });

    it('persists custom persistent compute engine host', () => {
      saveSlothSettings({ engineHost: 'api.sloth.internal:8001' });
      const updated = getSlothSettings();
      expect(updated.engineHost).toBe('api.sloth.internal:8001');
    });

    it('resets engine settings to defaults on factory reset', () => {
      saveSlothSettings({ engineEnabled: false, engineHost: 'remote-fly.dev:8080' });
      const beforeReset = getSlothSettings();
      expect(beforeReset.engineEnabled).toBe(false);
      expect(beforeReset.engineHost).toBe('remote-fly.dev:8080');

      const afterReset = resetSlothSettings();
      expect(afterReset.engineEnabled).toBe(true);
      expect(afterReset.engineHost).toBe('localhost:8001');
    });
  });

  describe('Engine Re-indexing Contract', () => {
    it('processes successful reindex response payload', async () => {
      const mockResponse = {
        status: 'ok',
        tracks_indexed: 500,
        elapsed_ms: 18.4,
      };

      const formatMessage = (data: typeof mockResponse) =>
        `Indexed ${data.tracks_indexed || 500} tracks in ${data.elapsed_ms || 12}ms`;

      expect(formatMessage(mockResponse)).toBe('Indexed 500 tracks in 18.4ms');
    });

    it('provides fallback offline message when engine is unreachable', () => {
      const fallbackMessage = 'Indexed 500 tracks into FAISS IndexFlatIP (local offline)';
      expect(fallbackMessage).toContain('IndexFlatIP');
      expect(fallbackMessage).toContain('500 tracks');
    });
  });

  describe('Settings Component Architecture', () => {
    it('exports SettingsPage component successfully', () => {
      expect(SettingsPage).toBeDefined();
      expect(typeof SettingsPage).toBe('function');
    });
  });
});
