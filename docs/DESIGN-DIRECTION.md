# Sloth — Design Direction & Nuclear-Derived Visual Architecture

## 1. Visual Identity & Design Philosophy
Sloth's aesthetic is derived from Nuclear's tactile, high-density music player layout, modernised for web and desktop standards:
- **Design Lineage**: Nuclear-inspired structural layout with flat, information-dense neobrutalist surfaces.
- **Surface Philosophy**: **Flat UI — NO glassmorphism, NO frosted panels, NO backdrop blur overlays anywhere**. Depth is achieved strictly through crisp contrast, solid offset borders, and deliberate background-to-surface layer stepping.
- **Density**: Compact, information-dense interfaces designed for efficient browsing of extensive discographies, track tables, and playback queues.
- **Awwwards Quality Standard**: Minimum self-audit score of **88/100** before returning any UI code.

---

## 2. Structural Layout Architecture
Strictly mirrors Nuclear's core layout grid:
- **Left Sidebar**: Fixed width **220px** (`w-[220px]`). Dark navigation pane hosting primary views (Discover, Queue, Library, Playlists, Settings, Listen Together).
- **Main Content Area**: Fluid scrollable viewport (`flex-1 overflow-y-auto`) hosting album bento grids, artist portraits, and high-density track tables.
- **Bottom Player Bar**: Fixed height **72px** (`h-[72px]`). Persistent bottom controls bar hosting now-playing metadata (left), transport playback controls & seekbar (center), and volume/queue/lyrics toggles (right).

```
┌──────────────┬─────────────────────────────────────────────────────────┐
│              │                                                         │
│              │                                                         │
│   Sidebar    │                   Main Content Area                     │
│   (220px)    │                (Scrollable Viewport)                    │
│              │                                                         │
│              │                                                         │
├──────────────┴─────────────────────────────────────────────────────────┤
│                     Bottom Player Bar (72px)                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Color System (OKLCH Tokens)
All colors are modeled in native CSS OKLCH color space for perceptual uniformity and vibrant accent reproduction:

### Core Surfaces
- **App Background**: `#1e2327` (`oklch(0.24 0.015 240)`)
- **Surface**: `#282d33` (`oklch(0.29 0.015 240)`)
- **Raised Surface**: `#31383f` (`oklch(0.33 0.015 240)`)
- **Border**: `oklch(0.38 0.015 240)` (crisp 1px solid separators)

### Typography Colors
- **Text Primary**: `oklch(0.96 0.005 240)` (high contrast)
- **Text Secondary**: `oklch(0.72 0.010 240)` (subdued metadata)
- **Text Muted**: `oklch(0.52 0.010 240)` (timestamps and track numbers)

### Dynamic User-Swappable Accent
- Managed via the `--color-accent` CSS custom property:
  - **Default (Nuclear Green)**: `oklch(0.72 0.19 145)`
  - **Lagoon (Cyan)**: `oklch(0.75 0.15 210)`
  - **Ember (Orange/Red)**: `oklch(0.70 0.19 40)`
  - **Aurora (Purple)**: `oklch(0.70 0.20 300)`

---

## 4. Typography System
- **UI & Headings**: **Inter**
  - Weights: `400` (Regular), `500` (Medium), `600` (SemiBold), `700` (Bold)
  - Features: `font-feature-settings: "cv02", "cv03", "cv04", "cv11"`
- **Metadata, Timestamps & Code**: **JetBrains Mono**
  - Monospaced numerals for track timecodes (`03:45`), sample rates (`24-bit / 96kHz`), bitrates, and ISRC tags.

---

## 5. Component Architecture (Tailwind CSS v4 + CVA)
Every component is written as a functional React component typed strictly in TypeScript with Class Variance Authority (CVA):
- `Button`: Primary, secondary, tertiary, ghost, and icon variants with solid tactile active states.
- `TrackRow`: Compact table rows with hover-reveal play controls, favorite toggles, and mono duration stamps.
- `AlbumCard`: Aspect-square cover art container with hover action buttons, no blur filters.
- `ArtistCard`: Circular avatar presentation with discography badges.
- `PlayerBar`: 72px persistent 3-column player with embedded progress seekbar and volume slider.
- `Sidebar`: 220px fixed left navigation pane with active state accent badges.

---

## 6. Motion & Animation Standards
- **Motion Engine**: Exclusively imported from `"motion/react"` (`import { motion, AnimatePresence } from "motion/react"`).
- **Reduced Motion**: Every animated component checks `useReducedMotion()` or CSS `@media (prefers-reduced-motion: reduce)` to disable transitions when requested by the OS.
- **Physics**: Snappy springs (`stiffness: 400`, `damping: 28`) for list transitions and player drawer expansions.
