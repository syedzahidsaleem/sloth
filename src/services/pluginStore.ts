/**
 * Sloth Plugin System & Store
 * Nuclear-derived plugin architecture with dynamic marketplace and registry.
 */

export type PluginCategory =
  | 'streaming'
  | 'metadata'
  | 'lyrics'
  | 'playlists'
  | 'dashboard'
  | 'scrobbling'
  | 'discovery';

export interface PluginManifest {
  id: string;
  name: string;
  author: string;
  description: string;
  version: string;
  category: PluginCategory;
  categories?: PluginCategory[];
  icon?: string;
  repo: string;
  downloadUrl: string;
  loadTimeMs?: number;
  addedAt: string;
  verified?: boolean;
}

export interface InstalledPlugin {
  manifest: PluginManifest;
  enabled: boolean;
  installedAt: number;
}

export const COMMUNITY_REGISTRY: PluginManifest[] = [
  {
    id: 'youtube-music',
    name: 'YouTube Music Source',
    author: 'Sloth Core',
    description: 'High-bitrate audio streaming and global catalog search via InnerTube API.',
    version: '1.4.2',
    category: 'streaming',
    categories: ['streaming'],
    repo: 'slothplayer/plugin-youtube-music',
    downloadUrl: 'https://registry.slothplayer.org/plugins/youtube-music.js',
    loadTimeMs: 14,
    verified: true,
    addedAt: '2026-01-10T00:00:00Z',
  },
  {
    id: 'piped-engine',
    name: 'Piped Stream Resolver',
    author: 'Team Piped',
    description: 'Privacy-respecting multi-instance audio extractor with automatic fallback.',
    version: '2.1.0',
    category: 'streaming',
    categories: ['streaming'],
    repo: 'slothplayer/plugin-piped',
    downloadUrl: 'https://registry.slothplayer.org/plugins/piped.js',
    loadTimeMs: 18,
    verified: true,
    addedAt: '2026-01-15T00:00:00Z',
  },
  {
    id: 'qobuz-metadata',
    name: 'Qobuz Hi-Res Metadata',
    author: 'Meld Audio',
    description: 'Studio master 24-bit/192kHz metadata, official ISRC cross-referencing, and cover art.',
    version: '1.0.8',
    category: 'metadata',
    categories: ['metadata'],
    repo: 'meld/plugin-qobuz-metadata',
    downloadUrl: 'https://registry.slothplayer.org/plugins/qobuz-metadata.js',
    loadTimeMs: 22,
    verified: true,
    addedAt: '2026-02-01T00:00:00Z',
  },
  {
    id: 'lrclib-lyrics',
    name: 'LRCLib Synced Lyrics',
    author: 'Community',
    description: 'Millisecond-accurate word-level LRC synced lyrics with fuzzy matching.',
    version: '1.1.2',
    category: 'lyrics',
    categories: ['lyrics'],
    repo: 'community/sloth-lrclib',
    downloadUrl: 'https://registry.slothplayer.org/plugins/lrclib.js',
    loadTimeMs: 9,
    verified: true,
    addedAt: '2026-02-12T00:00:00Z',
  },
  {
    id: 'listenbrainz-scrobble',
    name: 'ListenBrainz Scrobbler',
    author: 'MetaBrainz',
    description: 'Open source music scrobbling, collaborative listening history, and recommendations.',
    version: '0.9.4',
    category: 'scrobbling',
    categories: ['scrobbling'],
    repo: 'metabrainz/sloth-listenbrainz',
    downloadUrl: 'https://registry.slothplayer.org/plugins/listenbrainz.js',
    loadTimeMs: 12,
    verified: true,
    addedAt: '2026-02-20T00:00:00Z',
  },
  {
    id: 'mert-visualizer',
    name: 'MERT Latent Visualizer',
    author: 'Cambridge ML',
    description: 'Real-time acoustic neural manifold and 768-dim latent vector projection widget.',
    version: '0.5.1',
    category: 'dashboard',
    categories: ['dashboard', 'discovery'],
    repo: 'cambridge/sloth-mert-vis',
    downloadUrl: 'https://registry.slothplayer.org/plugins/mert-vis.js',
    loadTimeMs: 31,
    verified: true,
    addedAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 'soundcloud-stream',
    name: 'SoundCloud Stream & Search',
    author: 'SoundPulse',
    description: 'Explore underground electronic releases, live DJ sets, and artist playlists.',
    version: '1.3.0',
    category: 'streaming',
    categories: ['streaming'],
    repo: 'soundpulse/sloth-soundcloud',
    downloadUrl: 'https://registry.slothplayer.org/plugins/soundcloud.js',
    loadTimeMs: 16,
    verified: false,
    addedAt: '2026-03-10T00:00:00Z',
  },
  {
    id: 'bandcamp-explorer',
    name: 'Bandcamp Catalog Provider',
    author: 'CampDevs',
    description: 'Browse independent record labels, discover new releases, and stream previews.',
    version: '2.0.1',
    category: 'playlists',
    categories: ['playlists', 'discovery'],
    repo: 'campdevs/sloth-bandcamp',
    downloadUrl: 'https://registry.slothplayer.org/plugins/bandcamp.js',
    loadTimeMs: 25,
    verified: true,
    addedAt: '2026-03-15T00:00:00Z',
  },
  {
    id: 'musicbrainz-tagger',
    name: 'MusicBrainz Tagger',
    author: 'MetaBrainz',
    description: 'Acoustic fingerprint matching via Chromaprint & AcoustID for complete album tagging.',
    version: '1.2.4',
    category: 'metadata',
    categories: ['metadata'],
    repo: 'metabrainz/sloth-acoustid',
    downloadUrl: 'https://registry.slothplayer.org/plugins/musicbrainz.js',
    loadTimeMs: 19,
    verified: true,
    addedAt: '2026-03-20T00:00:00Z',
  },
];

const DEFAULT_INSTALLED_IDS = ['youtube-music', 'piped-engine', 'lrclib-lyrics'];

const PLUGINS_STORAGE_KEY = 'sloth_installed_plugins_v1';
const PLUGINS_EVENT = 'sloth_plugins_changed';

export function getInstalledPlugins(): Record<string, InstalledPlugin> {
  if (typeof window === 'undefined') {
    const initial: Record<string, InstalledPlugin> = {};
    for (const m of COMMUNITY_REGISTRY) {
      if (DEFAULT_INSTALLED_IDS.includes(m.id)) {
        initial[m.id] = { manifest: m, enabled: true, installedAt: 1710000000000 };
      }
    }
    return initial;
  }

  try {
    const raw = localStorage.getItem(PLUGINS_STORAGE_KEY);
    if (!raw) {
      const initial: Record<string, InstalledPlugin> = {};
      for (const m of COMMUNITY_REGISTRY) {
        if (DEFAULT_INSTALLED_IDS.includes(m.id)) {
          initial[m.id] = { manifest: m, enabled: true, installedAt: Date.now() };
        }
      }
      localStorage.setItem(PLUGINS_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveInstalledPlugins(
  plugins: Record<string, InstalledPlugin>
): Record<string, InstalledPlugin> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PLUGINS_STORAGE_KEY, JSON.stringify(plugins));
      window.dispatchEvent(new CustomEvent(PLUGINS_EVENT, { detail: plugins }));
    } catch (err) {
      console.error('Failed to save plugins to localStorage:', err);
    }
  }
  return plugins;
}

export function installPlugin(manifest: PluginManifest): InstalledPlugin {
  const current = getInstalledPlugins();
  const entry: InstalledPlugin = {
    manifest,
    enabled: true,
    installedAt: Date.now(),
  };
  current[manifest.id] = entry;
  saveInstalledPlugins(current);
  return entry;
}

export function uninstallPlugin(pluginId: string): boolean {
  const current = getInstalledPlugins();
  if (current[pluginId]) {
    delete current[pluginId];
    saveInstalledPlugins(current);
    return true;
  }
  return false;
}

export function togglePlugin(pluginId: string, enabled: boolean): boolean {
  const current = getInstalledPlugins();
  if (current[pluginId]) {
    current[pluginId].enabled = enabled;
    saveInstalledPlugins(current);
    return true;
  }
  return false;
}

export { PLUGINS_EVENT };
