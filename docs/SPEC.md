# SPEC: Sloth Unified Music Streaming Platform Architecture

## Executive Summary
Sloth is a unified, high-density music streaming platform and desktop application combining multiple audio source backends, intelligent cross-source track matching, local library management, cognitive recommendations, synchronized lyrics, and synchronized group listening.

---

## 1. Plugin-Based Audio Source Architecture
All audio streaming backends are decoupled as pluggable modules under `src/sources/<source-name>/`:

```
src/sources/
├── types.ts              # Universal AudioSource, SearchResult, StreamManifest interfaces
├── registry.ts           # SourceRegistry with dynamic priority, failover, and health checks
├── youtube/              # YouTube InnerTube client (web_remix, android_music, tvhtml5)
├── piped/                # Piped & Invidious proxy client with instance latency rotation
├── qobuz/                # Qobuz Hi-Res FLAC stream and metadata provider
├── bandcamp/             # Bandcamp streaming plugin
├── soundcloud/           # SoundCloud client
└── local/                # Local filesystem audio playback (FLAC, MP3, Opus, M4A)
```

### Universal Plugin Interface
```typescript
export interface AudioSourcePlugin {
  readonly id: string;
  readonly name: string;
  readonly supportedQualities: AudioQuality[];
  readonly requiresAuth: boolean;

  search(query: string, options?: SearchOptions): Promise<TrackSearchResult[]>;
  resolveStream(trackId: string, preferredQuality?: AudioQuality): Promise<StreamManifest>;
  lookupISRC?(isrc: string): Promise<TrackMetadata | null>;
  getHealth(): Promise<{ status: 'healthy' | 'degraded' | 'offline'; latencyMs: number }>;
}
```

---

## 2. Track Matching Pipeline
When tracks are requested across differing providers (e.g., Spotify playlist imported to Qobuz or YouTube streams), Sloth executes a 3-tier cascade:

```
[ Incoming Track Request ]
            │
            ▼
┌───────────────────────────────┐
│ Tier 1: Canonical ISRC Match  │── (Exact Match Found) ──► [ Play Stream ]
└───────────────────────────────┘
            │ (No ISRC / Provider Miss)
            ▼
┌───────────────────────────────┐
│ Tier 2: Multi-Factor Fuzzy    │── (Confidence >= 0.85) ──► [ Play Stream ]
│ - Title & Artist Levenshtein  │
│ - Duration Match (±3s cutoff) │
│ - Clean Token Dice Similarity │
└───────────────────────────────┘
            │ (Low Confidence < 0.85)
            ▼
┌───────────────────────────────┐
│ Tier 3: User Override Storage │
│ - SQLite overrides table      │
│ - Manual search & link UI     │
└───────────────────────────────┘
```

---

## 3. SLOTH Recommendation Engine (Phase 3)
A hybrid multi-stage cognitive and graph neural recommendation architecture:

1. **LightHGCN (Hypergraph Convolution)**: 5-node heterogeneous hypergraph (`User`, `Track`, `Artist`, `Album`, `Playlist`) capturing high-order relational listening affinity.
2. **BERT4Rec (Sequential Recommendation)**: Bidirectional self-attention Transformer predicting immediate next-track transitions from session listening context.
3. **ACT-R Cognitive Memory Decay**: Models human listening memory using power-law decay $A(t) = \ln(n) - d \cdot \ln(\Delta t)$, spreading activation PMI, and partial acoustic similarity to balance repeat familiarity vs novel discovery.
4. **L-DiffRec (Latent Diffusion)**: Diffusion-based generative playlist synthesis conditioned on 6-signal context vector (`energy`, `danceability`, `valence`, `tempo`, `acousticness`, `mood`).
5. **IPS & SNIPS Debiasing**: Inverse Propensity Scoring correcting for popularity and exposure bias derived from track play count distributions.
6. **Thompson Sampling Bandit**: Beta-Bernoulli multi-armed bandit balancing exploration vs exploitation for cold-start tracks and new users.

---

## 4. Lyrics Pipeline
Multi-tiered fallback synchronized and plain lyrics resolution:

```
[ Current Track Playing ]
            │
            ▼
┌───────────────────────────────┐
│ 1. LRCLib (Synced [mm:ss.xx]) │── (Hit) ──► [ Render Animated Karaoke UI ]
└───────────────────────────────┘
            │ (Miss)
            ▼
┌───────────────────────────────┐
│ 2. KuGou Music Lyrics API     │── (Hit) ──► [ Decrypt & Sync LRC ]
└───────────────────────────────┘
            │ (Miss)
            ▼
┌───────────────────────────────┐
│ 3. SimpMusic / Musixmatch     │── (Hit) ──► [ Plain / Synced Text ]
└───────────────────────────────┘
            │ (Miss)
            ▼
┌───────────────────────────────┐
│ 4. Embedded ID3 (USLT / SYLT) │── (Local fallback from audio file tags)
└───────────────────────────────┘
```
- Includes real-time AI lyrics translation and romanization (`Translated`, `Romanized`, `Transcribed`) via Claude API while preserving synchronized timestamp boundaries.

---

## 5. Local SQLite Library (Drizzle ORM)
Full local persistence schema managing personal music libraries, playlists, and match overrides:

- **Tables**:
  - `tracks`: Canonical track metadata, ISRC, duration, local filepath, audio format, play counts.
  - `artists`: Artist discography, bio, avatars.
  - `albums`: Albums, release year, artwork cache paths.
  - `playlists`: User-created and imported playlists with track sequencing.
  - `playlist_tracks`: Many-to-many relationship with custom ordering and timestamps.
  - `history`: Fine-grained listening history for ACT-R decay and scrobbling.
  - `match_overrides`: User overrides mapping canonical track IDs to specific stream URLs.
  - `settings`: Application configuration, accent color, theme, audio buffer sizes.

---

## 6. Listen Together (WebSocket Protocol)
Real-time synchronized group listening engine powered by FastAPI WebSockets (`server/listen-together/`):
- **Room Management**: 6-character room codes, host DJ controls, peer participants.
- **Clock Drift Compensation**: Periodic NTP-style timestamp ping/pong calculating round-trip time and client-server clock offset.
- **Event Protocol**:
  - `PLAY`: Broadcasts track ID, position, and server start epoch timestamp.
  - `PAUSE`: Instant pause broadcast.
  - `SEEK`: Synchronized position update.
  - `QUEUE_UPDATE`: Collaborative playlist queue synchronization.
  - `CHAT`: Ephemeral chat messages and listener presence indicators.

---

## 7. Download Manager
High-fidelity offline download engine:
- Orchestrates `yt-dlp` using secure subprocess arrays (`shell=False`) with input sanitization.
- Formats: MP3 (320kbps), FLAC (lossless), Opus, M4A.
- **SponsorBlock Chapter Fix**: Extracts official creator chapters from video info JSON before crowd-sourced segments, preserving exact millisecond float timestamps to eliminate intro/outro clipping.
- Universal metadata tagging using `mutagen`: embeds cover art (`APIC`), ISRC (`TSRC`), and synchronized lyrics (`SYLT`).

---

## 8. MCP Server Exposing Player Controls
Local Model Context Protocol (MCP) server running over stdio/HTTP allowing external AI agents to monitor and control playback:
- **Tools**:
  - `player_play(track_id?)`: Start or resume playback.
  - `player_pause()`: Pause audio.
  - `player_next()` / `player_prev()`: Skip tracks.
  - `player_seek(seconds)`: Seek in track.
  - `player_get_state()`: Returns currently playing track, duration, position, queue, volume.
  - `player_queue_track(track_id)`: Enqueue track.
  - `library_search(query)`: Query local SQLite catalog.

---

## 9. "Ask Sloth" Natural Language Search
Intelligent natural language search and playlist generation powered by CLAP and MERT embeddings:
- Accepts complex aesthetic queries:
  - *"Upbeat synthwave for late-night programming with retro basslines"*
  - *"Melancholic indie acoustic folk similar to early Bon Iver"*
- **Resolution**:
  1. Computes 512-dim CLAP text embedding of prompt.
  2. Ranks catalog via cross-modal cosine similarity against audio embeddings.
  3. Feeds extracted context vector into L-DiffRec to synthesize a smooth 10-track playlist trajectory.
