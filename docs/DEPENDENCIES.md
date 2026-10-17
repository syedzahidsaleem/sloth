# Sloth - Dependencies & Reference Architecture

## Reference Repositories (Read-Only, Not Bundled)

These external projects serve as engineering references and architectural blueprints located outside this workspace (at `D:\Coding\_hub\references\`). They are never bundled directly, and any ported algorithms or architectural concepts are cited with appropriate attribution under `LICENSE-NOTICES`.

- **nuclear** (`AGPL-3.0`)
  - **Source Repository**: `https://github.com/nukeop/nuclear.git`
  - **Purpose**: UI component architecture, theme system (CSS variables / OKLCH tokens), plugin SDK, local library scanner, Storybook visual specifications.
- **meld** (`GPL-3.0`)
  - **Source Repository**: `https://github.com/FrancescoGrazioso/Meld.git`
  - **Purpose**: Recommendation scoring engine, Qobuz & YouTube source provider plugins, ISRC + fuzzy track matching pipeline, 3-tier cache layer.
- **metrolist** (`GPL-3.0`)
  - **Source Repository**: `https://github.com/MetrolistGroup/Metrolist.git`
  - **Purpose**: YouTube InnerTube client, LRCLib lyrics pipeline, metroserver WebSocket listen-together backend.
- **spotube** (`GPL-3.0`)
  - **Source Repository**: `https://github.com/team-spotube/spotube.git`
  - **Purpose**: Cross-platform audio player architecture, yt-dlp download pipeline, SponsorBlock chapter fix integration.

---

## Direct Dependencies

*(Dependencies will be strictly pinned with exact versions via `npm install --save-exact` and audited as the core stack is initialized).*

| Package | Version | Type | Purpose | Verified |
| :--- | :--- | :--- | :--- | :--- |
| — | — | — | — | — |

---

## Attribution & Licensing Notice
Any code or logic adapted from referenced codebases requires explicit compliance with their respective licenses (`AGPL-3.0`, `GPL-3.0`). Detailed attributions and upstream copyright statements are tracked in [`LICENSE-NOTICES`](../LICENSE-NOTICES).
