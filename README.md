# Sloth 🦥🎵

> A modern, high-performance music application built with deliberate aesthetics, resilient audio streaming, intelligent recommendations, and synchronized social listening.

🚀 **Live Production App**: [https://syedzahidsaleem.github.io/sloth/](https://syedzahidsaleem.github.io/sloth/)

---

## Architectural Highlights

Sloth synergizes key architectural paradigms from leading modern music clients:

- **Nuclear-Inspired Tactile UI**: Modular layout components, OKLCH design tokens, dynamic theme engine, extensible source plugin registry, and local library scanner.
- **Smart Recommendations & Dynamic Autoplay**: Cultural & genre clustering, Spotify-style seed-matched queue population, and automatic circumplex mood bias adaptation.
- **InnerTube & Synchronized Lyrics**: YouTube Music InnerTube pipeline, real-time synchronized LRCLib lyrics with word/line karaoke highlighting, and WebSocket-driven "Listen Together" protocol.
- **Resilient Audio Engine**: Audio player orchestration, smooth seekbar synchronization, SponsorBlock chapter segment handling, and offline caching pipelines.

For upstream license notices and attribution, see [`LICENSE-NOTICES`](LICENSE-NOTICES).

---

## Tech Stack

- **Frontend / Client**: Next.js App Router / React 19, TypeScript (strict mode), Tailwind CSS v4, Motion (`motion/react`)
- **Desktop Runtime**: Tauri v2
- **Database**: SQLite with Drizzle ORM
- **Engine Server**: Python FastAPI (engine server for recommendations, audio extraction, scoring)
- **Component Architecture**: Class Variance Authority (CVA) with Neobrutalist tactile depth

---

## Security & Secrets

Sloth strictly implements zero-leak secrets hygiene:
- `.env*` files are ignored by default (except `.env.example`).
- Sensitive keys are never committed or exposed to client-side bundles.
