# Theme Persistence & Dark Mode Specification

## Overview
This specification details the theme persistence architecture and color gradient token system in Sloth, aligned with Nuclear's layout and theme engine.

## Problem Statement
Previously, switching between basic themes (Aurora, Arctic Moss, Ember, Lagoon) inadvertently cleared `data-theme="dark"` because `applyTheme` stripped the attribute on theme selection. Furthermore, basic theme stylesheets lacked dark gradient definitions for `--background-gradient` and `--card-gradient`, causing dark mode to display white/light surfaces because `@utility surface-background` defaulted to the light background gradient.

## Architecture

### 1. Persistent Dark Mode Retention in `settingsStore.ts`
When switching basic themes via `applyTheme(themeId)`:
- If `themeId === 'dark'`, `data-theme="dark"` is explicitly set.
- If `themeId === 'light'`, `data-theme` is removed.
- When selecting any basic theme (e.g. `nuclear:aurora`, `nuclear:arctic-moss`), the existing `data-theme="dark"` state is strictly preserved:
```ts
const wasDark = root.getAttribute('data-theme') === 'dark';
if (wasDark) {
  root.setAttribute('data-theme', 'dark');
} else {
  root.removeAttribute('data-theme');
}
```

### 2. Dark Gradient Tokens
Each theme stylesheet (`aurora.css`, `arctic-moss.css`, `ember.css`, `lagoon.css`) explicitly overrides gradient tokens under the `[data-theme="dark"][data-theme-id="..."]` selector:
- `--background-gradient`
- `--muted-gradient`
- `--card-gradient`
- `--popover-gradient`
- `--primary-gradient`

This ensures that surfaces utilizing gradients seamlessly transition between high-contrast dark depths and crisp light modes without visual color bleeding.
