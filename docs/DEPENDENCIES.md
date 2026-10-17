# Sloth - Dependencies & Reference Architecture

## Reference Repositories (Read-Only, Not Bundled)

These external projects serve as engineering references and architectural blueprints located outside this workspace at `D:\Coding\_hub\references\`. They are never bundled directly, and any ported algorithms or architectural concepts are cited with appropriate attribution under [`LICENSE-NOTICES`](../LICENSE-NOTICES).

- **nuclear** (`AGPL-3.0`)
  - **Source Repository**: `https://github.com/nukeop/nuclear.git`
  - **Purpose**: UI component architecture, theme system, plugin SDK
- **meld** (`GPL-3.0`)
  - **Source Repository**: `https://github.com/FrancescoGrazioso/Meld.git`
  - **Purpose**: Recommendation scoring, Qobuz provider, track matching
- **metrolist** (`GPL-3.0`)
  - **Source Repository**: `https://github.com/MetrolistGroup/Metrolist.git`
  - **Purpose**: InnerTube client, lyrics pipeline, listen-together
- **spotube** (`GPL-3.0`)
  - **Source Repository**: `https://github.com/team-spotube/spotube.git`
  - **Purpose**: Download pipeline, SponsorBlock chapter fix

---

## Key Reference Extraction Paths

These paths are mapped to extract reference architecture and source-of-truth patterns in every build prompt:

### NUCLEAR (UI source of truth)
- `nuclear/packages/ui/src/components/` → all UI components
- `nuclear/packages/ui/src/styles/` (and `nuclear/packages/themes/src/`) → CSS variables, OKLCH tokens, theme system
- `nuclear/packages/main/src/` (and `nuclear/packages/player/src/`) → Electron main process (Tauri equivalent) & player runtime
- `nuclear/packages/core/src/` (and `nuclear/packages/plugin-sdk/src/`) → plugin system, source registry, types
- `nuclear/packages/scanner/src/` → local library scanner
- `nuclear/storybook/` (and `nuclear/packages/storybook/`) → component stories (visual reference)

### MELD (recommendation engine + track matching source of truth)
- `meld/app/src/main/java/.../recommendation/` (and `meld/app/src/main/kotlin/.../playback/SpotifyRecommendationEngine.kt`, `models/SimilarRecommendation.kt`) → scoring engine code
- `meld/app/src/main/java/.../matching/` (and `meld/app/src/main/kotlin/.../qobuz/QobuzMatchOverride.kt`, `db/entities/*MatchEntity.kt`) → ISRC + fuzzy match pipeline
- `meld/app/src/main/java/.../cache/` (and `meld/app/src/main/kotlin/.../db/`) → 3-tier cache layer
- `meld/app/src/main/java/.../providers/` (and `meld/app/src/main/kotlin/.../qobuz/QobuzAudioProvider.kt`) → Qobuz + YouTube source plugins

### METROLIST (InnerTube pipeline + listen-together source of truth)
- `metrolist/app/src/main/java/.../innertube/` (and `metrolist/innertube/src/main/kotlin/com/metrolist/innertube/`) → YouTube InnerTube client
- `metrolist/app/src/main/java/.../lyrics/` (and `metrolist/app/src/main/kotlin/com/metrolist/music/lyrics/`) → LRCLib + lyrics pipeline
- `metrolist/server/` (and `metrolist/app/src/main/kotlin/com/metrolist/music/listentogether/`, `app/src/main/proto/listentogether.proto`) → metroserver WebSocket backend & sync client

### SPOTUBE (cross-platform audio + download pipeline source of truth)
- `spotube/lib/provider/` → audio player providers & skip segments
- `spotube/lib/services/` → yt-dlp download, SponsorBlock fix, youtube engine
- `spotube/lib/models/` → track, playlist, artist models

---

## Direct Dependencies

*(Dependencies are strictly pinned with exact versions via `npm install --save-exact` and audited as the core stack is initialized).*

| Package | Version | Type | Purpose | Verified |
| :--- | :--- | :--- | :--- | :--- |
| `class-variance-authority` | `0.7.1` | Runtime | CVA variant schema for UI components | Yes |
| `clsx` | `2.1.1` | Runtime | Conditional className concatenation | Yes |
| `tailwind-merge` | `3.0.1` | Runtime | Conflict-free Tailwind className merging | Yes |
| `lucide-react` | `0.475.0` | Runtime | Vector icons (player controls, navigation, badges) | Yes |
| `motion` | `12.4.7` | Runtime | Spring physics & layout animations (`motion/react`) | Yes |
| `react` | `19.0.0` | Runtime | Core reactive UI engine | Yes |
| `react-dom` | `19.0.0` | Runtime | React DOM renderer | Yes |
| `@tailwindcss/vite` | `4.0.6` | Dev | Tailwind CSS v4 native Vite integration | Yes |
| `tailwindcss` | `4.0.6` | Dev | Next-generation CSS framework & tokens | Yes |
| `vite` | `6.1.0` | Dev | Lightning-fast ESM bundler & dev server | Yes |
| `typescript` | `5.7.3` | Dev | Strict static typing and inference | Yes |

---

## Attribution & Licensing Notice
Any code or logic adapted from referenced codebases requires explicit compliance with their respective licenses (`AGPL-3.0`, `GPL-3.0`). Detailed attributions and upstream copyright statements are tracked in [`LICENSE-NOTICES`](../LICENSE-NOTICES).
