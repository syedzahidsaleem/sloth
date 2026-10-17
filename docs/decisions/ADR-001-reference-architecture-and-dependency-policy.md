# ADR-001: Reference Architecture & External Upstream Dependency Policy

## Status
Accepted

## Date
2026-10-17

## Context
Sloth is being engineered as a high-performance, resilient, and beautifully crafted music experience. Rather than reinventing proven audio algorithms and streaming interfaces from scratch, Sloth draws from four best-in-class open-source projects:

1. **Nuclear**: UI component architecture, modern OKLCH tokens / CSS variables theme system, plugin ecosystem, and local audio library scanner.
2. **Meld**: Recommendation engine scoring, multi-tier cache layer, Qobuz & YouTube source plugins, and ISRC + fuzzy track matching.
3. **Metrolist**: Reverse-engineered YouTube InnerTube client, LRCLib synchronized lyrics parser, and metroserver WebSocket listen-together backend.
4. **Spotube**: Cross-platform audio pipeline, SponsorBlock chapter segment skips, and yt-dlp download orchestration.

We need a systematic method to inspect and extract architectural patterns from these codebases without contaminating the Sloth codebase with unlicensed code, bloating git history, or breaking upstream open-source license agreements (GPL-3.0 and AGPL-3.0).

## Decision
1. **Isolated External Reference Store**:
   Maintain all four repositories in a dedicated, external read-only directory: `D:\Coding\_hub\references\`.
   These repositories are strictly never cloned into or committed into `D:\Coding\projects\sloth\`.
2. **Path Mapping Contracts**:
   Standardize extraction paths for every module prompt to ensure precision when referencing source implementations.
3. **Attribution & Licensing**:
   Track all upstream copyrights, repository sources, and applicable licenses in `LICENSE-NOTICES` and `docs/DEPENDENCIES.md`. Any adapted algorithms or data models will preserve required attribution comments and license notices.
4. **Dependency & Secret Verification**:
   All third-party runtime dependencies must be explicitly verified (`verify-dependencies`) with exact version pinning, and environment variables must strictly follow `.gitignore` hygiene (`secrets-hygiene`).

## Consequences
- Clean repository boundaries: `sloth` remains an autonomous, lightweight git repository.
- No risk of accidental commits of megabytes of foreign commit history or vendored reference files.
- Clear audit trail for licensing compliance.
- High developer velocity when referencing exact implementation patterns across the 4 upstream projects.
