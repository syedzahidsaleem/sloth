# Sloth 🦥🎵

> A modern, high-performance music application built with deliberate aesthetics, resilient audio streaming, intelligent recommendations, and synchronized social listening.

---

## Architectural Blueprint

Sloth synergizes key architectural paradigms from leading open-source music clients:

- **Nuclear UI & Plugin SDK**: Modular UI components, OKLCH design tokens, dynamic theme engine, extensible source plugin registry, and local library scanner.
- **Meld Recommendation & Cache Architecture**: Recommendation scoring algorithms, 3-tier cache layer, Qobuz & YouTube providers, and ISRC + fuzzy track matching pipeline.
- **Metrolist InnerTube & Synchronization**: YouTube Music InnerTube pipeline, LRCLib lyrics synchronization, and WebSocket-driven "Listen Together" protocol.
- **Spotube Audio Engine**: Audio player orchestration, SponsorBlock chapter segment handling, and offline caching/download pipelines.

For detailed dependency tracking, see [`docs/DEPENDENCIES.md`](docs/DEPENDENCIES.md).
For architectural decisions, see [`docs/decisions/`](docs/decisions/).
For upstream license notices and attribution, see [`LICENSE-NOTICES`](LICENSE-NOTICES).

---

## Reference Repositories (External)

Reference sources are maintained out-of-tree at `D:\Coding\_hub\references\`:
- `nuclear/` — UI source of truth, theme tokens, plugin SDK
- `meld/` — Recommendation engine, matching pipeline, cache
- `metrolist/` — InnerTube client, lyrics pipeline, listen-together
- `spotube/` — Audio player engine, download pipeline, SponsorBlock

---

## Security & Secrets

Sloth strictly implements zero-leak secrets hygiene:
- `.env*` files are ignored by default (except `.env.example`).
- Sensitive keys are never committed or exposed to client-side bundles.
