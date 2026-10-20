/**
 * Sloth UI Component
 * Author: Syed Zahid Saleem <syedzahidsaleem2@gmail.com>
 */

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Badge, Button } from '@/components/ui';

export interface ChangelogItem {
  version: string;
  date: string;
  type: 'feature' | 'improvement' | 'fix' | 'plugin';
  title: string;
  description: string;
  items: string[];
}

const CHANGELOG: ChangelogItem[] = [
  {
    version: 'v0.1.0-alpha.4',
    date: 'October 18, 2026',
    type: 'feature',
    title: 'Transplanted Nuclear UI Design System',
    description: 'Complete visual parity transplant with verbatim OKLCH tokens, 4px border radius, and neobrutalist tactile depth.',
    items: [
      'Transplanted Nuclear design tokens into nuclear-tokens.css and themes',
      'Transplanted Button, Input, Slider, Toggle, Badge, Modal, ContextMenu, TrackRow',
      'Implemented AlbumCard, ArtistCard, PlaylistCard with 2x2 mosaic thumbnails',
      'Strict 220px Sidebar and 72px PlayerBar with tactile controls',
      'Added full-screen Playlists, Queue, Lyrics, and Logs views',
    ],
  },
  {
    version: 'v0.1.0-alpha.3',
    date: 'October 17, 2026',
    type: 'feature',
    title: 'SLOTH Neural Engine & Gated Fusion',
    description: 'Autonomous recommendation engine combining LightGCN hypergraph, BERT4Rec transformer, ACT-R memory, and L-DiffRec playlist diffusion.',
    items: [
      'FastAPI recommendation engine on port 8001 with sub-200ms p95 latency',
      'Thompson Sampling cold-start genre bandits and IPS debiasing',
      'Ask Sloth natural language command palette with CLAP embeddings and FAISS search',
      'SponsorBlock yt-dlp downloader daemon on port 8802',
    ],
  },
  {
    version: 'v0.1.0-alpha.2',
    date: 'October 16, 2026',
    type: 'improvement',
    title: 'Audio Pipeline & Local SQLite Storage',
    description: 'Unified source plugins with ISRC matching and offline local SQLite database.',
    items: [
      'YouTube Music and Piped stream resolution with automatic fallback',
      'Drizzle ORM schema with WAL mode and foreign key constraints',
      'Synchronized LRC lyrics parser with karaoke line highlighting',
    ],
  },
];

const TYPE_COLORS: Record<ChangelogItem['type'], 'green' | 'yellow' | 'red' | 'cyan'> = {
  feature: 'green',
  improvement: 'yellow',
  fix: 'red',
  plugin: 'cyan',
};

export default function WhatsNewPage() {
  const [showAll, setShowAll] = useState(false);

  const visibleEntries = showAll ? CHANGELOG : CHANGELOG.slice(0, 2);

  return (
    <div className="surface-background p-6 space-y-6 select-none" data-testid="whats-new-page">
      <div className="border-border flex items-center justify-between pb-3 border-b-(length:--border-width)">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">
            What&apos;s New
          </h1>
          <p className="text-muted-foreground mt-0.5 text-xs font-mono">
            Latest releases, features, and engine improvements in Sloth
          </p>
        </div>

        <Badge variant="pill" color="purple" className="text-xs font-mono">
          Sloth Desktop
        </Badge>
      </div>

      <div className="flex w-full flex-col pr-4 pl-2">
        {visibleEntries.map((entry, index) => (
          <div key={entry.version} className="flex gap-4" data-testid="changelog-entry">
            {/* Timeline line + node */}
            <div className="flex w-4 flex-col items-center gap-1">
              <div
                className={`w-0.5 flex-1 ${index === 0 ? 'bg-transparent' : 'bg-border'}`}
              />
              <div
                className={`size-3 rounded-full border-(length:--border-width) border-border ${
                  index === 0 ? 'bg-primary' : 'bg-muted'
                }`}
              />
              <div
                className={`w-0.5 flex-1 ${
                  index === visibleEntries.length - 1 ? 'bg-transparent' : 'bg-border'
                }`}
              />
            </div>

            {/* Entry Content Card */}
            <div className="surface-card border-border shadow-shadow my-3 flex flex-1 flex-col gap-2.5 p-5 rounded-[4px] border-(length:--border-width)">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="pill" color={TYPE_COLORS[entry.type]} className="text-[10px] font-mono uppercase">
                    {entry.type}
                  </Badge>
                  <span className="text-foreground text-sm font-bold font-mono">
                    {entry.version}
                  </span>
                </div>

                <div className="text-muted-foreground flex items-center gap-1 font-mono text-[11px]">
                  <Calendar size={12} />
                  <span>{entry.date}</span>
                </div>
              </div>

              <div>
                <h3 className="text-foreground text-base font-bold tracking-tight">
                  {entry.title}
                </h3>
                <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                  {entry.description}
                </p>
              </div>

              <ul className="mt-1 space-y-1 border-t-(length:--border-width) border-border/60 pt-2.5">
                {entry.items.map((item, idx) => (
                  <li
                    key={idx}
                    className="text-foreground/80 flex items-start gap-2 text-xs font-mono"
                  >
                    <span className="text-primary mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}

        {!showAll && CHANGELOG.length > 2 && (
          <div className="pt-2 text-center">
            <Button
              size="sm"
              variant="text"
              onClick={() => setShowAll(true)}
              className="text-primary text-xs"
            >
              See older releases ({CHANGELOG.length - 2} more)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
