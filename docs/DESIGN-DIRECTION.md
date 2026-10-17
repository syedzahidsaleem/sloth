# Sloth — Design Direction & Component Architecture

## Design Identity & Art Direction
Sloth adopts the bold, tactile aesthetic of Nuclear's modern design system, elevated with modern web engineering:
- **Design Philosophy**: Tactile Neobrutalism meets high-density streaming client.
- **Color Model**: Native CSS OKLCH tokens supporting real-time palette swapping (Default, Aurora, Ember, Lagoon).
- **Default Theme**: Dark Mode with deep, low-chroma surfaces (`oklch(0.22 0.03 5)`) and balanced high-contrast text (`oklch(0.9 0.008 5)`).
- **Borders & Shadows**: Neobrutalist hard offset borders (`--border-width: 2px` in light, `1px` in dark) with interactive spring translate hover states (`translate-x-shadow-x translate-y-shadow-y`).
- **Motion Principles**: Fluid spring physics powered by `motion/react` (`stiffness: 400`, `damping: 24`, `mass: 0.8`), interruptible gestures, and strict adherence to `prefers-reduced-motion`.

---

## Layout Specifications
- **App Shell**: `grid h-screen w-screen grid-rows-[auto_1fr_auto] overflow-hidden`
- **Top Header Bar**: Height 56px (`h-14`), border bottom 2px, surface topbar.
- **Left Sidebar**: Collapsible with spring transition (`width: 64px` collapsed ↔ `240px` expanded), border right 2px.
- **Main Content Area**: Scrollable viewport with responsive bento grid and track list.
- **Bottom Player Bar**: Height 80px (`h-20`), border top 2px, surface bottombar with embedded top seekbar (`surface-seekbar-track` / `surface-seekbar` / `bg-stripes-diagonal`).

---

## Component Port Registry (Nuclear → Sloth CVA Architecture)

Every component has been ported directly from Nuclear's source code, adapted to Tailwind CSS v4, Class Variance Authority (CVA), and strict TypeScript typing:

| Component | Upstream Source in Nuclear | Adaptations & Architecture |
| :--- | :--- | :--- |
| **Button** | `nuclear/packages/ui/src/components/Button/` | Adapted to CVA with variants: `default`, `secondary`, `tertiary`, `noShadow`, `text`, `ghost`; sizes: `default`, `sm`, `xs`, `lg`, `icon`, `icon-sm`, `flexible`; intent: `danger`. Tactile offset hover translations. |
| **Box** | `nuclear/packages/ui/src/components/Box/` | Adapted to CVA with surface variants: `primary`, `secondary`, `tertiary`, `warning`; shadow modes: `default`, `none`. |
| **Badge** | `nuclear/packages/ui/src/components/Badge/` | Adapted to CVA with styles: `dot`, `pill`; OKLCH palette colors: `green`, `cyan`, `orange`, `red`, `yellow`, `purple`, `blue`, `secondary`, `inverted`; optional pulse animation. |
| **Input** | `nuclear/packages/ui/src/components/Input/` | Adapted to CVA with variants: `text`, `number`, `password`, `borderless`; tones: `primary`, `secondary`; sizes: `sm`, `default`, `lg`; start/end addon slots, accessible error and description associations. |
| **Toggle** | `nuclear/packages/ui/src/components/Toggle/` | Ported to headless switch with `motion/react` spring sliding thumb, rounded-full border track, and optional checked/unchecked thumb icons. |
| **Slider** | `nuclear/packages/ui/src/components/Slider/` | Multi-mode range slider with custom thumb, track fill, mouse wheel acceleration, header label with live value, start/end bounds, accessible keyboard stepping. |
| **Tabs** | `nuclear/packages/ui/src/components/Tabs/` | Composable compound architecture (`Tabs.Root`, `Tabs.List`, `Tabs.Tab`, `Tabs.Panels`, `Tabs.Panel`) with convenience array items mode, using Button variants. |
| **Modal (Dialog)** | `nuclear/packages/ui/src/components/Dialog/` | Full-screen accessible overlay with `motion/react` spring scale & backdrop blur, header, description, close icon, and action bar. |
| **ContextMenu (Popover)** | `nuclear/packages/ui/src/components/TrackContextMenu/` & `Popover/` | Floating dropdown and right-click context menu with spring physics, action items, danger highlights, and separators. |
| **AlbumCard** | `nuclear/packages/ui/src/components/Card/` | Aspect-square cover art container, cassette/disc placeholder, hover-activated quick-play action button, title, artist, format badge, and skeleton loader. |
| **ArtistCard** | `nuclear/packages/ui/src/components/Card/` | Circular avatar container, artist portrait, quick radio play overlay button, name, and genre/role tags. |
| **TrackRow** | `nuclear/packages/ui/src/components/TrackTable/` | Table row with track thumbnail, track title, artist, album, duration timestamp, hover play/pause toggle, favorite heart toggle, add to queue button, and context menu trigger. |
| **Sidebar** | `nuclear/packages/ui/src/components/SidebarNavigation/` & `PlayerWorkspace/` | Spring-animated collapsible sidebar drawer with navigation items, badge alerts, section headers, and collapse toggle button. |
| **PlayerBar** | `nuclear/packages/ui/src/components/PlayerBar/` | 3-column layout: left now-playing metadata card with cover art and favorite button, center controls (shuffle, prev, play/pause, next, repeat, discovery) and time codes, top embedded seekbar with animated loading stripes, right volume slider and drawer toggles. |

---

## Token Reference (`src/styles/tokens.css`)
- Direct extraction of all 54 CSS custom properties from `nuclear/packages/tailwind-config/global.css`.
- Complete support for multi-theme switching: `:root`, `[data-theme='dark']`, `:root[data-theme-id='nuclear:aurora']`, `:root[data-theme-id='nuclear:ember']`, `:root[data-theme-id='nuclear:lagoon']`.
