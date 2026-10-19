import { FC } from 'react';
import {
  Search,
  Headphones,
  BoomBox,
  Gauge,
  ListMusic,
  MicVocal,
} from 'lucide-react';
import { ViewShell } from '@/components/ui/ViewShell';
import { ScrollableArea } from '@/components/ui/ScrollableArea';
import { Badge } from '@/components/ui/Badge';
import { getInstalledPlugins } from '@/services/pluginStore';

export const SourcesPage: FC = () => {
  const installedPlugins = getInstalledPlugins();
  const pluginList = Object.values(installedPlugins);

  const metadataProviders = pluginList.filter((p) => p.manifest.category === 'metadata' || p.manifest.categories?.includes('metadata'));
  const streamingProviders = pluginList.filter((p) => p.manifest.category === 'streaming' || p.manifest.categories?.includes('streaming'));
  const discoveryProviders = pluginList.filter((p) => p.manifest.category === 'discovery' || p.manifest.categories?.includes('discovery'));
  const dashboardProviders = pluginList.filter((p) => p.manifest.category === 'dashboard' || p.manifest.categories?.includes('dashboard'));
  const playlistProviders = pluginList.filter((p) => p.manifest.category === 'playlists' || p.manifest.categories?.includes('playlists'));
  const lyricsProviders = pluginList.filter((p) => p.manifest.category === 'lyrics' || p.manifest.categories?.includes('lyrics'));

  const sections = [
    {
      id: 'metadata',
      title: 'Metadata',
      Icon: Search,
      description:
        'Metadata sources provide information about artists, albums, and tracks. Search results, artist pages, and album details come from the active metadata source.',
      providers: metadataProviders,
      color: 'blue' as const,
    },
    {
      id: 'streaming',
      title: 'Streaming',
      Icon: Headphones,
      description:
        'Streaming sources provide audio. When you play a track, the streaming source finds and delivers the audio stream.',
      providers: streamingProviders,
      color: 'red' as const,
    },
    {
      id: 'discovery',
      title: 'Discovery',
      Icon: BoomBox,
      description:
        "Discovery sources recommend new tracks based on what you're listening to. Enable music discovery by using the boombox icon in the bottom bar.",
      providers: discoveryProviders,
      color: 'orange' as const,
    },
    {
      id: 'dashboard',
      title: 'Dashboard',
      Icon: Gauge,
      description:
        'Dashboard sources provide personalized content like top tracks, new releases, and recommendations on the home screen.',
      providers: dashboardProviders,
      color: 'purple' as const,
    },
    {
      id: 'playlists',
      title: 'Playlists',
      Icon: ListMusic,
      description:
        'Playlist sources let you import playlists from external services by URL.',
      providers: playlistProviders,
      color: 'green' as const,
    },
    {
      id: 'lyrics',
      title: 'Lyrics',
      Icon: MicVocal,
      description:
        'Lyrics sources provide lyrics for the current track. Sloth gets lyrics from all lyrics sources at the same time and shows the best result. You can select the lyrics of a different source in the Lyrics view.',
      providers: lyricsProviders,
      color: 'yellow' as const,
    },
  ];

  return (
    <ViewShell data-testid="sources-view" title="Sources">
      <div className="flex h-full w-full items-start justify-center pt-2 pb-12">
        <ScrollableArea className="max-w-xl w-full flex-1 gap-4 overflow-hidden">
          {sections.map((section) => {
            const Icon = section.Icon;
            return (
              <div
                key={section.id}
                data-testid={`sources-section-${section.id}`}
                className="mb-6 px-2"
              >
                <h3 className="text-foreground mb-1 flex items-center gap-2 text-sm font-bold">
                  <Icon size={16} />
                  {section.title}
                </h3>
                <p className="text-foreground/70 mb-3 text-sm leading-relaxed">
                  {section.description}
                </p>
                {section.providers.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {section.providers.map((p) => (
                      <Badge
                        key={p.manifest.id}
                        variant="pill"
                        color={section.color}
                        className="cursor-pointer font-bold"
                      >
                        {p.manifest.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p
                    className="text-foreground/60 text-sm italic"
                    data-testid="no-providers-message"
                  >
                    No providers installed
                  </p>
                )}
              </div>
            );
          })}
        </ScrollableArea>
      </div>
    </ViewShell>
  );
};

export default SourcesPage;
