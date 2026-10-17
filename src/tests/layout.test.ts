import { describe, it, expect, beforeEach } from 'vitest';
import {
  SURFACES,
  TEXT_COLORS,
  ACCENTS,
  LAYOUT,
  RADII,
  FONTS,
  setAccentPalette,
  getCurrentAccent,
} from '../styles/tokens';
import { AppShell, Sidebar, PlayerBar, MainContent } from '../components/layout';

describe('Sloth Layout & Nuclear Design Tokens', () => {
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

  it('exports exact Nuclear surface OKLCH tokens', () => {
    expect(SURFACES.background).toContain('oklch(0.25 0.012 245)');
    expect(SURFACES.surface).toContain('oklch(0.29 0.012 245)');
    expect(SURFACES.surfaceRaised).toContain('oklch(0.33 0.012 245)');
    expect(SURFACES.border).toContain('oklch(0.38 0.012 245)');
  });

  it('exports high-contrast text color tokens', () => {
    expect(TEXT_COLORS.primary).toBeDefined();
    expect(TEXT_COLORS.secondary).toBeDefined();
    expect(TEXT_COLORS.muted).toBeDefined();
  });

  it('contains all 5 user-selectable accent palettes', () => {
    const expectedAccents = ['green', 'aqua', 'orange', 'violet', 'red'];
    expectedAccents.forEach((key) => {
      expect(ACCENTS).toHaveProperty(key);
      expect(ACCENTS[key as keyof typeof ACCENTS].oklch).toBeDefined();
      expect(ACCENTS[key as keyof typeof ACCENTS].hex).toBeDefined();
    });
  });

  it('enforces exact layout dimensions: 220px sidebar and 72px player bar', () => {
    expect(LAYOUT.sidebarWidth).toBe('220px');
    expect(LAYOUT.playerHeight).toBe('72px');
    expect(RADII.md).toBe('4px');
    expect(FONTS.sans).toContain('Inter');
    expect(FONTS.mono).toContain('JetBrains Mono');
  });

  it('manages document element data-accent attributes', () => {
    expect(getCurrentAccent()).toBe('green');
    setAccentPalette('violet');
    expect(document.documentElement.getAttribute('data-accent')).toBe('violet');
    expect(getCurrentAccent()).toBe('violet');

    setAccentPalette('orange');
    expect(getCurrentAccent()).toBe('orange');
  });

  it('exports all core layout components', () => {
    expect(AppShell).toBeDefined();
    expect(Sidebar).toBeDefined();
    expect(PlayerBar).toBeDefined();
    expect(MainContent).toBeDefined();
  });
});
