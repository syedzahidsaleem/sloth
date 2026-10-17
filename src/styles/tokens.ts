/**
 * Sloth Design Tokens — Typed JavaScript & OKLCH Constants
 * Derived directly from Nuclear's visual design system.
 */

export const SURFACES = {
  background: 'oklch(0.25 0.012 245)',     // #1e2327
  surface: 'oklch(0.29 0.012 245)',        // #282d33
  surfaceRaised: 'oklch(0.33 0.012 245)',  // #31383f
  border: 'oklch(0.38 0.012 245)',         // #3d444c
} as const;

export const TEXT_COLORS = {
  primary: 'oklch(0.93 0.005 240)',        // #e8eaed
  secondary: 'oklch(0.70 0.008 240)',      // #9aa0a6
  muted: 'oklch(0.52 0.015 250)',          // #666c7a
} as const;

export type AccentPalette = 'green' | 'aqua' | 'orange' | 'violet' | 'red';

export interface AccentDefinition {
  id: AccentPalette;
  label: string;
  oklch: string;
  foregroundOklch: string;
  hex: string;
}

export const ACCENTS: Record<AccentPalette, AccentDefinition> = {
  green: {
    id: 'green',
    label: 'Sloth Green (Default)',
    oklch: 'oklch(0.74 0.20 145)',
    foregroundOklch: 'oklch(0.15 0.02 145)',
    hex: '#4ade80',
  },
  aqua: {
    id: 'aqua',
    label: 'Cyber Aqua',
    oklch: 'oklch(0.80 0.15 200)',
    foregroundOklch: 'oklch(0.15 0.02 200)',
    hex: '#22d3ee',
  },
  orange: {
    id: 'orange',
    label: 'Sunset Orange',
    oklch: 'oklch(0.74 0.19 50)',
    foregroundOklch: 'oklch(0.15 0.02 50)',
    hex: '#fb923c',
  },
  violet: {
    id: 'violet',
    label: 'Electric Violet',
    oklch: 'oklch(0.72 0.18 293)',
    foregroundOklch: 'oklch(0.15 0.02 293)',
    hex: '#a78bfa',
  },
  red: {
    id: 'red',
    label: 'Crimson Pulse',
    oklch: 'oklch(0.69 0.18 22)',
    foregroundOklch: 'oklch(0.98 0 0)',
    hex: '#f87171',
  },
} as const;

export const LAYOUT = {
  sidebarWidth: '220px',
  playerHeight: '72px',
  topbarHeight: '48px',
} as const;

export const RADII = {
  sm: '2px',
  md: '4px',
  lg: '6px',
} as const;

export const FONTS = {
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
} as const;

export const TOKENS = {
  surfaces: SURFACES,
  text: TEXT_COLORS,
  accents: ACCENTS,
  layout: LAYOUT,
  radii: RADII,
  fonts: FONTS,
} as const;

/**
 * Apply the selected accent palette to the DOM root.
 */
export function setAccentPalette(accent: AccentPalette): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-accent', accent);
}

/**
 * Retrieve the current accent palette from the DOM root.
 */
export function getCurrentAccent(): AccentPalette {
  if (typeof document === 'undefined') return 'green';
  const val = document.documentElement.getAttribute('data-accent') as AccentPalette | null;
  return val && val in ACCENTS ? val : 'green';
}
