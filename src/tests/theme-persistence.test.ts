import { describe, it, expect, beforeEach } from 'vitest';
import { applyTheme } from '../services/settingsStore';

describe('Theme Persistence and Dark Mode State', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    (globalThis as any).document = {
      documentElement: {
        setAttribute: (key: string, val: string) => {
          store[key] = val;
        },
        getAttribute: (key: string) => store[key] || null,
        removeAttribute: (key: string) => {
          delete store[key];
        },
      },
    };
  });

  it('preserves dark mode when switching to a basic theme like Aurora', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    applyTheme('nuclear:aurora');

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme-id')).toBe('nuclear:aurora');
    expect(document.documentElement.getAttribute('data-theme-variant')).toBe('aurora');
  });

  it('preserves dark mode when switching to Arctic Moss', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    applyTheme('nuclear:arctic-moss');

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme-id')).toBe('nuclear:arctic-moss');
    expect(document.documentElement.getAttribute('data-theme-variant')).toBe('arctic-moss');
  });

  it('preserves light mode when user is in light mode and switches themes', () => {
    document.documentElement.removeAttribute('data-theme');
    applyTheme('nuclear:lagoon');

    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    expect(document.documentElement.getAttribute('data-theme-id')).toBe('nuclear:lagoon');
    expect(document.documentElement.getAttribute('data-theme-variant')).toBe('lagoon');
  });

  it('explicitly activates dark mode when themeId is dark', () => {
    applyTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('explicitly removes dark mode when themeId is light', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    applyTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
  });
});
