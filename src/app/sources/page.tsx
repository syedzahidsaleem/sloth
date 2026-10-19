import { FC, useState } from 'react';
import {
  Search,
  Headphones,
  Radio,
  Gauge,
  ListMusic,
  MicVocal,
  Check,
} from 'lucide-react';
import { ViewShell } from '@/components/ui/ViewShell';
import { ScrollableArea } from '@/components/ui/ScrollableArea';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

export const SourcesPage: FC = () => {
  const [activeMetadata, setActiveMetadata] = useState('youtube');
  const [activeStreaming, setActiveStreaming] = useState('youtube');
  const [activeDiscovery, setActiveDiscovery] = useState('bandcamp');

  const metadataProviders = [
    { id: 'youtube', name: 'YouTube Music', desc: 'Comprehensive track and album metadata' },
    { id: 'musicbrainz', name: 'MusicBrainz', desc: 'Open music encyclopedia' },
    { id: 'discogs', name: 'Discogs', desc: 'Community-built database of audio recordings' },
  ];

  const streamingProviders = [
    { id: 'youtube', name: 'YouTube Music', desc: 'High quality audio stream extraction' },
    { id: 'piped', name: 'Piped Engine', desc: 'Privacy-focused alternative frontend stream' },
    { id: 'invidious', name: 'Invidious', desc: 'Decentralized video and audio stream' },
  ];

  const discoveryProviders = [
    { id: 'bandcamp', name: 'Bandcamp', desc: 'Independent artists and underground releases' },
    { id: 'soundcloud', name: 'SoundCloud', desc: 'Creator music streams and remixes' },
  ];

  return (
    <ViewShell data-testid="sources-view" title="Sources">
      <div className="flex h-full w-full items-start justify-center pb-12">
        <ScrollableArea className="max-w-[560px] w-full flex-1 flex flex-col gap-6">
          {/* Metadata Section */}
          <div className="surface-card border-border shadow-shadow rounded-lg border-(length:--border-width) p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-md bg-foreground/10 flex items-center justify-center text-foreground">
                <Search size={18} />
              </div>
              <h3 className="text-base font-bold text-foreground">Metadata</h3>
            </div>
            <div className="flex flex-col gap-2">
              {metadataProviders.map((p) => {
                const isActive = activeMetadata === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setActiveMetadata(p.id)}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-md border-(length:--border-width) cursor-pointer transition-all',
                      isActive
                        ? 'surface-primary border-border font-bold shadow-xs'
                        : 'surface-muted border-border/40 hover:border-border',
                    )}
                  >
                    <div>
                      <div className="text-sm font-bold text-foreground">{p.name}</div>
                      <div className="text-xs text-foreground/70">{p.desc}</div>
                    </div>
                    {isActive && <Check size={16} className="text-foreground shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Streaming Section */}
          <div className="surface-card border-border shadow-shadow rounded-lg border-(length:--border-width) p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-md bg-foreground/10 flex items-center justify-center text-foreground">
                <Headphones size={18} />
              </div>
              <h3 className="text-base font-bold text-foreground">Streaming</h3>
            </div>
            <div className="flex flex-col gap-2">
              {streamingProviders.map((p) => {
                const isActive = activeStreaming === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setActiveStreaming(p.id)}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-md border-(length:--border-width) cursor-pointer transition-all',
                      isActive
                        ? 'surface-primary border-border font-bold shadow-xs'
                        : 'surface-muted border-border/40 hover:border-border',
                    )}
                  >
                    <div>
                      <div className="text-sm font-bold text-foreground">{p.name}</div>
                      <div className="text-xs text-foreground/70">{p.desc}</div>
                    </div>
                    {isActive && <Check size={16} className="text-foreground shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Discovery Section */}
          <div className="surface-card border-border shadow-shadow rounded-lg border-(length:--border-width) p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-md bg-foreground/10 flex items-center justify-center text-foreground">
                <Radio size={18} />
              </div>
              <h3 className="text-base font-bold text-foreground">Discovery</h3>
            </div>
            <div className="flex flex-col gap-2">
              {discoveryProviders.map((p) => {
                const isActive = activeDiscovery === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setActiveDiscovery(p.id)}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-md border-(length:--border-width) cursor-pointer transition-all',
                      isActive
                        ? 'surface-primary border-border font-bold shadow-xs'
                        : 'surface-muted border-border/40 hover:border-border',
                    )}
                  >
                    <div>
                      <div className="text-sm font-bold text-foreground">{p.name}</div>
                      <div className="text-xs text-foreground/70">{p.desc}</div>
                    </div>
                    {isActive && <Check size={16} className="text-foreground shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Info Sections: Dashboard, Playlists, Lyrics */}
          <div className="surface-muted border-border shadow-shadow rounded-lg border-(length:--border-width) p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Gauge size={20} className="text-purple-500" />
              <div>
                <div className="text-sm font-bold text-foreground">Dashboard</div>
                <div className="text-xs text-foreground/60">Widgets and picks powered by active plugins</div>
              </div>
            </div>
            <Badge variant="pill" color="purple">Active</Badge>
          </div>

          <div className="surface-muted border-border shadow-shadow rounded-lg border-(length:--border-width) p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ListMusic size={20} className="text-green-500" />
              <div>
                <div className="text-sm font-bold text-foreground">Playlists</div>
                <div className="text-xs text-foreground/60">Local and imported cloud playlists synced</div>
              </div>
            </div>
            <Badge variant="pill" color="green">Active</Badge>
          </div>

          <div className="surface-muted border-border shadow-shadow rounded-lg border-(length:--border-width) p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MicVocal size={20} className="text-yellow-500" />
              <div>
                <div className="text-sm font-bold text-foreground">Lyrics</div>
                <div className="text-xs text-foreground/60">Real-time synchronized LRC lyrics provider</div>
              </div>
            </div>
            <Badge variant="pill" color="yellow">Active</Badge>
          </div>
        </ScrollableArea>
      </div>
    </ViewShell>
  );
};

export default SourcesPage;
