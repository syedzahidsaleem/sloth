# Sloth — Project Rules & Configuration

## Project Identity
- **Project**: Sloth — unified music streaming platform
- **App Name**: "Sloth" throughout the entire codebase — NO "Harmonia", NO other legacy names.

---

## Technical Stack
- **Frontend / Client**: Next.js 15 App Router, TypeScript (strict mode), Tailwind CSS v4, Motion (import ONLY from `"motion/react"`)
- **Desktop Runtime**: Tauri v2
- **Database**: SQLite with Drizzle ORM
- **Engine Server**: Python FastAPI (engine server for recommendations, audio extraction, scoring)
- **Component Architecture**: Class Variance Authority (CVA) for all component variants

---

## Design System & Art Direction
- **Lineage**: Nuclear-derived layout and visual hierarchy.
- **Layout**: Fixed left dark sidebar (220px), scrollable main content viewport, fixed bottom player bar (72px).
- **Surfaces & Colors (OKLCH)**:
  - Background: `#1e2327` (`oklch(0.24 0.015 240)`)
  - Surface: `#282d33` (`oklch(0.29 0.015 240)`)
  - Raised Surface: `#31383f` (`oklch(0.33 0.015 240)`)
  - Accent Color: User-selectable via CSS custom property `--color-accent` (default green: `oklch(0.72 0.19 145)`).
- **Visual Style**:
  - Flat UI — **NO glassmorphism, NO frosted panels under any circumstances**.
  - Neobrutalist tactile depth: Solid offset borders and crisp separation over translucent blur.
  - Compact, information-dense, high-density music streaming layout.
- **Typography**:
  - UI & Headings: **Inter** (weights 400, 500, 600, 700)
  - Metadata, Timecodes & Code: **JetBrains Mono**
- **Quality Standard**: Minimum `awwwards-ui-design` score of **88/100** before returning any UI code.
- **RESTRICTION**: **DO NOT use fable-design-system under any circumstances.**

---

## Motion & Accessibility
- **Animation Imports**: `import { motion, AnimatePresence } from "motion/react"` — **NEVER import from "framer-motion"**.
- **Accessibility**: `prefers-reduced-motion` check required on every animated component; respect OS accessibility settings.

---

## Architecture & Source Plugins
- **Plugin Architecture**: Audio sources isolated under `src/sources/<source-name>/` conforming to universal source plugin interfaces.
- **Track Matching Pipeline**: ISRC canonical resolution → Fuzzy token/Levenshtein matching → User override persistence.

---

## Security & Secrets
- **Secrets Management**: **NEVER commit `.env.local`**.
- All API keys, tokens, and credentials belong strictly in `.env.local`.
- Use `.env.example` with empty dummy values for version control.

---

## Active MCP Servers
- `filesystem`
- `playwright`
- `github`
- `blender`
- `context7`
- `cloudinary`
- `sequential-thinking`
- `vercel`
