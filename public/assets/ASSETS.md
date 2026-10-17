# Sloth Static Assets Directory & License Manifest

## Overview
This directory stores public static media, brand identities, fallback artwork, and icons used across the Sloth client.

---

## Asset Directory Structure
```
public/assets/
├── ASSETS.md             # This manifest and licensing record
├── brand/                # Sloth brand logos, app icons, and favicons
│   ├── icon.svg          # Master vector app mark
│   ├── logo.svg          # Sloth horizontal logo
│   └── favicon.ico       # Standard 32x32 favicon
├── placeholders/         # Fallback covers and avatars
│   ├── album-cover.svg   # Default vinyl / disc fallback for missing cover art
│   ├── artist-avatar.svg # Default artist portrait silhouette
│   └── playlist.svg      # Default playlist cover placeholder
└── icons/                # UI custom vector glyphs (when not using Lucide-React)
```

---

## Asset Guidelines
1. **Format Priority**: Prefer SVG for all iconography and brand assets.
2. **Lossless Raster Assets**: WebP or PNG for high-resolution photography placeholders, compressed to under 100KB.
3. **No External CDN Dependencies**: All fallback graphics must resolve locally to maintain full offline playback capability.
4. **Theme Alignment**: All SVG placeholders adapt dynamically to `--color-accent` and `--color-surface` CSS variables.
