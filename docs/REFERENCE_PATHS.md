# Reference Repositories Path Mapping Matrix

All reference repositories reside externally at `D:\Coding\_hub\references\` and are strictly **READ-ONLY**.

---

## 1. NUCLEAR (`AGPL-3.0`)
**UI & Design System Source of Truth**  
Base Path: `D:\Coding\_hub\references\nuclear`

| Module | Reference Path | Purpose & Extraction Target |
| :--- | :--- | :--- |
| **UI Components** | `nuclear/packages/ui/src/components/` | Base buttons, inputs, sliders, cards, modals, table views, responsive layouts |
| **Player Views** | `nuclear/packages/player/src/components/` | Full-screen player, queue drawer, mini-player, volume bars, equalizer visuals |
| **Theme & Tokens** | `nuclear/packages/themes/src/` & `nuclear/packages/ui/src/` | OKLCH tokens, CSS custom properties, dark/light contrast rules |
| **Plugin Architecture** | `nuclear/packages/plugin-sdk/src/` | Source registry, streaming plugins, extension hooks, metadata contracts |
| **Player Core** | `nuclear/packages/player/src/services/` | Audio state management, local playback, stream resolution |
| **Storybook** | `nuclear/packages/storybook/` | Interactive component stories, visual regression references |

---

## 2. MELD (`GPL-3.0`)
**Recommendation Engine & Track Matching Source of Truth**  
Base Path: `D:\Coding\_hub\references\meld`

| Module | Reference Path | Purpose & Extraction Target |
| :--- | :--- | :--- |
| **Recommendation Engine** | `meld/app/src/main/kotlin/com/metrolist/music/playback/SpotifyRecommendationEngine.kt` | Hybrid recommendation scoring, collaborative filtering, radio seed expansion |
| **Recommendation Models** | `meld/app/src/main/kotlin/com/metrolist/music/models/SimilarRecommendation.kt` | Track similarity heuristics, acoustic vector calculations |
| **Track Match Pipeline** | `meld/app/src/main/kotlin/com/metrolist/music/db/entities/*MatchEntity.kt` & `qobuz/QobuzMatchOverride.kt` | ISRC cross-matching, duration fuzzy tolerance, title normalization |
| **Multi-Tier Cache Layer** | `meld/app/src/main/kotlin/com/metrolist/music/db/` | 3-tier cache (in-memory L1, indexed DB L2, disk streaming buffer L3) |
| **Source Providers** | `meld/app/src/main/kotlin/com/metrolist/music/qobuz/` & `innertube/` | Qobuz Hi-Res lossless stream resolver + YouTube music stream fallback |

---

## 3. METROLIST (`GPL-3.0`)
**InnerTube Client & Social Synchronization Source of Truth**  
Base Path: `D:\Coding\_hub\references\metrolist`

| Module | Reference Path | Purpose & Extraction Target |
| :--- | :--- | :--- |
| **YouTube InnerTube** | `metrolist/innertube/src/main/kotlin/com/metrolist/innertube/` | Clean YouTube Music API endpoints: search, browse, artist radio, next recommendations |
| **Lyrics Pipeline** | `metrolist/app/src/main/kotlin/com/metrolist/music/lyrics/` | Synchronized lyrics engine: LRCLib, BetterLyrics, KuGou, Musixmatch providers |
| **Listen Together** | `metrolist/app/src/main/kotlin/com/metrolist/music/listentogether/` | WebSocket real-time session synchronization, room management, playback delta sync |
| **Protocol Buffers** | `metrolist/app/src/main/proto/listentogether.proto` | Wire contract for low-latency multi-client state replication |
| **Clock Sync** | `metrolist/app/src/main/kotlin/com/metrolist/music/listentogether/ServerClock.kt` | Drift-free audio timestamp alignment across network peers |

---

## 4. SPOTUBE (`GPL-3.0`)
**Cross-Platform Audio & Offline Pipeline Source of Truth**  
Base Path: `D:\Coding\_hub\references\spotube`

| Module | Reference Path | Purpose & Extraction Target |
| :--- | :--- | :--- |
| **Audio Player Providers** | `spotube/lib/provider/` | Playback state machine, gapless transition, stream buffer management |
| **Download Pipeline** | `spotube/lib/services/` | yt-dlp / stream ffmpeg download engine, segmented download queue |
| **SponsorBlock Chapter Fix** | `spotube/lib/services/` | Skipping non-music intros, outros, silence, and filler segments |
| **Core Models** | `spotube/lib/models/` | Universal track, album, playlist, artist, and playback stream contracts |

---

## Usage in Engineering Prompts
When prompting any feature or module implementation:
1. Cite the relevant upstream module from this table.
2. Inspect the upstream implementation in `D:\Coding\_hub\references\<repo>\...`.
3. Adapt the algorithm or architecture cleanly into Sloth's TypeScript/Modern Web stack.
4. Add corresponding attribution entries to [`LICENSE-NOTICES`](../LICENSE-NOTICES).
