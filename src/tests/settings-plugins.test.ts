import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSlothSettings,
  saveSlothSettings,
  resetSlothSettings,
  EQUALIZER_PRESETS,
} from '@/services/settingsStore';
import {
  COMMUNITY_REGISTRY,
  getInstalledPlugins,
  installPlugin,
  uninstallPlugin,
  togglePlugin,
} from '@/services/pluginStore';

function createLocalStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
}

describe('Sloth Settings & Preferences System', () => {
  beforeEach(() => {
    (globalThis as any).localStorage = createLocalStorageMock();
    (globalThis as any).window = {
      dispatchEvent: () => true,
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  });

  it('loads factory default settings when localStorage is empty', () => {
    const settings = getSlothSettings();
    expect(settings.language).toBe('en_US');
    expect(settings.crossfadeSeconds).toBe(3);
    expect(settings.volumeNormalization).toBe(true);
    expect(settings.skipSilence).toBe(false);
    expect(settings.audioQuality).toBe('lossless');
    expect(settings.equalizer.enabled).toBe(true);
    expect(settings.equalizer.preset).toBe('Flat');
    expect(settings.accent).toBe('green');
    expect(settings.sourcePriorities).toEqual(['youtube', 'piped', 'qobuz', 'fastapi']);
  });

  it('updates and persists general settings', () => {
    saveSlothSettings({
      language: 'es_ES',
      libraryPath: '/mnt/storage/music',
      downloadFolder: '/mnt/storage/downloads',
    });

    const updated = getSlothSettings();
    expect(updated.language).toBe('es_ES');
    expect(updated.libraryPath).toBe('/mnt/storage/music');
    expect(updated.downloadFolder).toBe('/mnt/storage/downloads');
  });

  it('updates playback crossfade and audio quality preference', () => {
    saveSlothSettings({
      crossfadeSeconds: 7,
      audioQuality: 'lossy',
      volumeNormalization: false,
    });

    const updated = getSlothSettings();
    expect(updated.crossfadeSeconds).toBe(7);
    expect(updated.audioQuality).toBe('lossy');
    expect(updated.volumeNormalization).toBe(false);
  });

  it('applies equalizer presets and custom band modifications', () => {
    saveSlothSettings({
      equalizer: {
        enabled: true,
        preAmp: 3,
        preset: 'Bass Boost',
        bands: { ...EQUALIZER_PRESETS['Bass Boost'] },
      },
    });

    let updated = getSlothSettings();
    expect(updated.equalizer.preset).toBe('Bass Boost');
    expect(updated.equalizer.preAmp).toBe(3);
    expect(updated.equalizer.bands[32]).toBe(6);
    expect(updated.equalizer.bands[64]).toBe(5);

    // Custom tweak band
    saveSlothSettings({
      equalizer: {
        ...updated.equalizer,
        bands: {
          ...updated.equalizer.bands,
          32: 10,
        },
      },
    });

    updated = getSlothSettings();
    expect(updated.equalizer.bands[32]).toBe(10);
  });

  it('updates integrations including Last.fm, ListenBrainz, and MCP server', () => {
    saveSlothSettings({
      lastFmEnabled: true,
      lastFmUsername: 'slothlistener',
      lastFmSessionKey: 'secret_session_key_123',
      listenBrainzEnabled: true,
      listenBrainzToken: 'lb_token_abc',
      mcpServerEnabled: true,
      mcpServerPort: 8800,
    });

    const updated = getSlothSettings();
    expect(updated.lastFmEnabled).toBe(true);
    expect(updated.lastFmUsername).toBe('slothlistener');
    expect(updated.listenBrainzEnabled).toBe(true);
    expect(updated.listenBrainzToken).toBe('lb_token_abc');
    expect(updated.mcpServerPort).toBe(8800);
  });

  it('resets all settings back to default', () => {
    saveSlothSettings({
      language: 'ja_JP',
      crossfadeSeconds: 12,
      accent: 'red',
    });

    expect(getSlothSettings().language).toBe('ja_JP');

    const reset = resetSlothSettings();
    expect(reset.language).toBe('en_US');
    expect(reset.crossfadeSeconds).toBe(3);
    expect(reset.accent).toBe('green');
  });
});

describe('Sloth Plugin System & Store', () => {
  beforeEach(() => {
    (globalThis as any).localStorage = createLocalStorageMock();
    (globalThis as any).window = {
      dispatchEvent: () => true,
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  });

  it('exposes valid community registry plugins with Nuclear categories', () => {
    expect(COMMUNITY_REGISTRY.length).toBeGreaterThanOrEqual(8);

    const categories = new Set(COMMUNITY_REGISTRY.map((p) => p.category));
    expect(categories.has('streaming')).toBe(true);
    expect(categories.has('metadata')).toBe(true);
    expect(categories.has('lyrics')).toBe(true);
    expect(categories.has('playlists')).toBe(true);
    expect(categories.has('dashboard')).toBe(true);
    expect(categories.has('scrobbling')).toBe(true);
  });

  it('initializes with default preloaded plugins in localStorage', () => {
    const installed = getInstalledPlugins();
    expect(installed['youtube-music']).toBeDefined();
    expect(installed['piped-engine']).toBeDefined();
    expect(installed['lrclib-lyrics']).toBeDefined();
    expect(installed['youtube-music'].enabled).toBe(true);
  });

  it('installs a new plugin from the registry', () => {
    const qobuzManifest = COMMUNITY_REGISTRY.find((p) => p.id === 'qobuz-metadata')!;
    expect(qobuzManifest).toBeDefined();

    installPlugin(qobuzManifest);

    const installed = getInstalledPlugins();
    expect(installed['qobuz-metadata']).toBeDefined();
    expect(installed['qobuz-metadata'].manifest.name).toBe('Qobuz Hi-Res Metadata');
    expect(installed['qobuz-metadata'].enabled).toBe(true);
  });

  it('toggles plugin enabled status', () => {
    expect(getInstalledPlugins()['youtube-music'].enabled).toBe(true);

    togglePlugin('youtube-music', false);
    expect(getInstalledPlugins()['youtube-music'].enabled).toBe(false);

    togglePlugin('youtube-music', true);
    expect(getInstalledPlugins()['youtube-music'].enabled).toBe(true);
  });

  it('uninstalls a plugin cleanly', () => {
    expect(getInstalledPlugins()['piped-engine']).toBeDefined();

    const success = uninstallPlugin('piped-engine');
    expect(success).toBe(true);
    expect(getInstalledPlugins()['piped-engine']).toBeUndefined();
  });

  it('persists mini player and lyrics display settings', () => {
    saveSlothSettings({
      miniPlayerAlwaysOnTop: true,
      miniPlayerShowCover: false,
      enableSyncedLyrics: true,
      karaokeModeDefault: false,
      cleanLyricHeaders: true,
      autoScrollLyrics: true,
      preferSyncedLyrics: true,
      lyricsFontSize: 20,
      miniPlayerAmbientGlow: false,
      miniPlayerShowBackground: true,
      miniPlayerShowQueue: true,
      miniPlayerSyncAccent: false,
      miniPlayerLanguage: 'Spanish',
      discoveryVariety: 25,
      crossfadeMs: 2500,
    });

    const updated = getSlothSettings();
    expect(updated.miniPlayerAlwaysOnTop).toBe(true);
    expect(updated.miniPlayerShowCover).toBe(false);
    expect(updated.enableSyncedLyrics).toBe(true);
    expect(updated.karaokeModeDefault).toBe(false);
    expect(updated.cleanLyricHeaders).toBe(true);
    expect(updated.autoScrollLyrics).toBe(true);
    expect(updated.preferSyncedLyrics).toBe(true);
    expect(updated.lyricsFontSize).toBe(20);
    expect(updated.miniPlayerAmbientGlow).toBe(false);
    expect(updated.miniPlayerShowBackground).toBe(true);
    expect(updated.miniPlayerShowQueue).toBe(true);
    expect(updated.miniPlayerSyncAccent).toBe(false);
    expect(updated.miniPlayerLanguage).toBe('Spanish');
    expect(updated.discoveryVariety).toBe(25);
    expect(updated.crossfadeMs).toBe(2500);
  });
});
