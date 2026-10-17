import { FC, useState, useMemo, useEffect } from 'react';
import {
  Package,
  Download,
  Check,
  Search,
  RotateCw,
  Trash2,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import {
  PluginManifest,
  PluginCategory,
  COMMUNITY_REGISTRY,
  getInstalledPlugins,
  installPlugin,
  uninstallPlugin,
  togglePlugin,
  PLUGINS_EVENT,
  InstalledPlugin,
} from '@/services/pluginStore';
import { Button, Input, Badge, Toggle } from '@/components/ui';

type ActiveTab = 'store' | 'installed';

const CATEGORY_CHIPS: { id: PluginCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All Categories' },
  { id: 'streaming', label: 'Streaming Source' },
  { id: 'metadata', label: 'Metadata' },
  { id: 'lyrics', label: 'Lyrics Provider' },
  { id: 'playlists', label: 'Playlist Provider' },
  { id: 'dashboard', label: 'Dashboard Widget' },
  { id: 'scrobbling', label: 'Scrobbling' },
];

export const PluginsPage: FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('store');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PluginCategory | 'all'>('all');
  const [installedMap, setInstalledMap] = useState<Record<string, InstalledPlugin>>(getInstalledPlugins);
  const [installingIds, setInstallingIds] = useState<Record<string, boolean>>({});
  const [reloadingIds, setReloadingIds] = useState<Record<string, boolean>>({});
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setInstalledMap(getInstalledPlugins());
    };
    window.addEventListener(PLUGINS_EVENT, handleUpdate);
    return () => window.removeEventListener(PLUGINS_EVENT, handleUpdate);
  }, []);

  const installedList = useMemo(() => Object.values(installedMap), [installedMap]);
  const installedCount = installedList.length;

  // Filter marketplace plugins
  const filteredStorePlugins = useMemo(() => {
    return COMMUNITY_REGISTRY.filter((plugin) => {
      const matchesCategory =
        selectedCategory === 'all' ||
        plugin.category === selectedCategory ||
        (plugin.categories && plugin.categories.includes(selectedCategory));

      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return (
        plugin.name.toLowerCase().includes(q) ||
        plugin.description.toLowerCase().includes(q) ||
        plugin.author.toLowerCase().includes(q)
      );
    });
  }, [selectedCategory, searchQuery]);

  const handleInstall = async (manifest: PluginManifest) => {
    setInstallingIds((prev) => ({ ...prev, [manifest.id]: true }));
    // Simulate dynamic JS download and verification
    await new Promise((r) => setTimeout(r, 650));
    installPlugin(manifest);
    setInstallingIds((prev) => ({ ...prev, [manifest.id]: false }));
  };

  const handleUninstall = (pluginId: string) => {
    uninstallPlugin(pluginId);
  };

  const handleToggle = (pluginId: string, enabled: boolean) => {
    togglePlugin(pluginId, enabled);
  };

  const handleReload = async (pluginId: string) => {
    setReloadingIds((prev) => ({ ...prev, [pluginId]: true }));
    await new Promise((r) => setTimeout(r, 450));
    setReloadingIds((prev) => ({ ...prev, [pluginId]: false }));
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;

    try {
      const id = 'custom-' + Math.random().toString(36).substring(2, 7);
      const customManifest: PluginManifest = {
        id,
        name: 'Custom Plugin (' + id + ')',
        author: 'User Provided',
        description: 'Sourced from ' + customUrl,
        version: '1.0.0',
        category: 'streaming',
        categories: ['streaming'],
        repo: 'custom/' + id,
        downloadUrl: customUrl,
        loadTimeMs: 15,
        verified: false,
        addedAt: new Date().toISOString(),
      };
      installPlugin(customManifest);
      setCustomUrl('');
      setCustomModalOpen(false);
      setCustomError(null);
    } catch (err: any) {
      setCustomError(err.message || 'Failed to add custom plugin');
    }
  };

  return (
    <div className="flex h-full w-full min-h-0 flex-col bg-[var(--background)] select-none">
      {/* Top Header Bar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--color-accent)] font-bold text-xs">
            <Package size={14} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide text-[var(--text-primary)]">
              Plugin Marketplace & Extensions
            </h1>
            <p className="font-mono text-[11px] text-[var(--text-muted)]">
              Nuclear dynamic plugins • Community registry
            </p>
          </div>
        </div>

        {/* Center Tabs: Store | Installed */}
        <div className="flex items-center p-1 rounded-[4px] bg-[var(--background)] border border-[var(--border)]">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'store'}
            onClick={() => setActiveTab('store')}
            className={`px-3 py-1 rounded-[3px] text-xs font-medium cursor-pointer transition-colors ${
              activeTab === 'store'
                ? 'bg-[var(--surface-raised)] text-[var(--color-accent)] font-semibold shadow-xs'
                : 'text-[var(--text-muted)] hover:text-white'
            }`}
          >
            Store
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'installed'}
            onClick={() => setActiveTab('installed')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-[3px] text-xs font-medium cursor-pointer transition-colors ${
              activeTab === 'installed'
                ? 'bg-[var(--surface-raised)] text-[var(--color-accent)] font-semibold shadow-xs'
                : 'text-[var(--text-muted)] hover:text-white'
            }`}
          >
            <span>Installed</span>
            <Badge
              variant="pill"
              color={activeTab === 'installed' ? 'green' : 'secondary'}
              className="px-1.5 py-0 text-[10px] font-mono leading-none"
            >
              {installedCount}
            </Badge>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setCustomModalOpen(true)}
            className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-white"
          >
            <Plus size={13} />
            Add Plugin
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* TAB 1: STORE / MARKETPLACE */}
          {activeTab === 'store' && (
            <div className="space-y-6">
              {/* Filter & Search Bar */}
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Search
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  />
                  <input
                    type="text"
                    placeholder="Search plugins by name, author, or keyword..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 w-full rounded-[4px] border border-[var(--border)] bg-[var(--surface)] pl-10 pr-4 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--color-accent)] focus:outline-none"
                  />
                </div>

                {/* Category Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {CATEGORY_CHIPS.map((chip) => {
                    const isSelected = selectedCategory === chip.id;
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => setSelectedCategory(chip.id)}
                        className={`px-3 py-1 rounded-[3px] text-xs font-mono cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[var(--surface-raised)] border border-[var(--color-accent)] text-[var(--color-accent)] font-bold shadow-xs'
                            : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-white'
                        }`}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Plugin Store Grid (Nuclear PluginStoreItem Layout) */}
              <div className="space-y-3">
                {filteredStorePlugins.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center rounded-[6px] border border-[var(--border)] bg-[var(--surface)]">
                    <Package size={36} className="text-[var(--text-muted)] mb-2" />
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">No plugins match your filter</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Try searching with different terms or select "All Categories".
                    </p>
                  </div>
                ) : (
                  filteredStorePlugins.map((plugin) => {
                    const isInstalled = Boolean(installedMap[plugin.id]);
                    const isInstalling = Boolean(installingIds[plugin.id]);

                    return (
                      <div
                        key={plugin.id}
                        data-testid={`plugin-store-card-${plugin.id}`}
                        className="flex items-center justify-between gap-4 p-4 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border)]/80 transition-colors"
                      >
                        <div className="flex flex-col min-w-0 flex-1 gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-[var(--text-primary)] tracking-wide">
                              {plugin.name}
                            </h3>
                            <span className="font-mono text-[11px] text-[var(--text-muted)]">
                              by <span className="text-[var(--text-secondary)]">{plugin.author}</span>
                            </span>
                            <Badge variant="pill" color="secondary" className="font-mono text-[10px]">
                              v{plugin.version}
                            </Badge>
                            {plugin.verified && (
                              <Badge variant="pill" color="green" className="flex items-center gap-1 text-[10px]">
                                <ShieldCheck size={11} />
                                Verified
                              </Badge>
                            )}
                            <Badge variant="pill" color="cyan" className="font-mono text-[10px] capitalize">
                              {plugin.category}
                            </Badge>
                          </div>
                          <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
                            {plugin.description}
                          </p>
                        </div>

                        {/* Action: Install / Installed */}
                        <div className="shrink-0">
                          {isInstalling ? (
                            <Button size="sm" disabled className="w-24 font-mono text-xs">
                              Installing...
                            </Button>
                          ) : isInstalled ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled
                              className="w-24 font-mono text-xs flex items-center justify-center gap-1.5 text-emerald-400 border-emerald-500/30 bg-emerald-950/20"
                            >
                              <Check size={13} />
                              Installed
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleInstall(plugin)}
                              className="w-24 font-mono text-xs flex items-center justify-center gap-1.5"
                            >
                              <Download size={13} />
                              Install
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: INSTALLED PLUGINS */}
          {activeTab === 'installed' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[var(--text-primary)]">
                    Installed Extensions ({installedCount})
                  </h2>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Installed plugins run within Sloth's sandbox with access to audio feeds and SQLite cache.
                  </p>
                </div>
              </div>

              {installedCount === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center rounded-[6px] border border-[var(--border)] bg-[var(--surface)]">
                  <Package size={36} className="text-[var(--text-muted)] mb-2" />
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">No plugins installed</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">
                    Explore the community store to enable streaming providers, lyrics, and widgets.
                  </p>
                  <Button size="sm" onClick={() => setActiveTab('store')}>
                    Browse Plugin Store
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {installedList.map(({ manifest: plugin, enabled }) => {
                    const isReloading = Boolean(reloadingIds[plugin.id]);

                    return (
                      <div
                        key={plugin.id}
                        data-testid={`plugin-installed-row-${plugin.id}`}
                        className={`flex items-center justify-between gap-4 p-4 rounded-[6px] border bg-[var(--surface)] transition-all ${
                          enabled
                            ? 'border-[var(--border)]'
                            : 'border-[var(--border)]/40 opacity-60'
                        }`}
                      >
                        {/* Plugin Info */}
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--color-accent)] font-mono font-bold text-xs">
                            {plugin.category.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-[var(--text-primary)]">
                                {plugin.name}
                              </span>
                              <span className="font-mono text-[11px] text-[var(--text-muted)]">
                                by {plugin.author}
                              </span>
                              <Badge variant="pill" color="secondary" className="font-mono text-[10px]">
                                v{plugin.version}
                              </Badge>
                              {plugin.loadTimeMs && (
                                <Badge variant="pill" color="purple" className="font-mono text-[10px]">
                                  {plugin.loadTimeMs}ms
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                              {plugin.description}
                            </p>
                          </div>
                        </div>

                        {/* Controls: Enable Toggle + Reload + Remove */}
                        <div className="flex items-center gap-3 shrink-0">
                          <Toggle
                            label={`Toggle ${plugin.name}`}
                            checked={enabled}
                            onChange={(v) => handleToggle(plugin.id, v)}
                          />

                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => handleReload(plugin.id)}
                            title="Reload plugin"
                            className="text-[var(--text-muted)] hover:text-white"
                          >
                            <RotateCw
                              size={14}
                              className={isReloading ? 'animate-spin text-[var(--color-accent)]' : ''}
                            />
                          </Button>

                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => handleUninstall(plugin.id)}
                            title="Uninstall plugin"
                            className="text-red-400/80 hover:text-red-400 hover:bg-red-950/20"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Custom Plugin Modal */}
      {customModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4 shadow-xl">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Add Custom Plugin</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Install a community plugin by direct repository URL or manifest JSON.
              </p>
            </div>

            {customError && (
              <div className="p-2.5 rounded bg-red-950/30 border border-red-800/40 text-red-300 text-xs font-mono">
                {customError}
              </div>
            )}

            <form onSubmit={handleAddCustom} className="space-y-4">
              <div>
                <label className="text-[11px] font-mono text-[var(--text-secondary)]">
                  Plugin Manifest or GitHub URL
                </label>
                <Input
                  placeholder="https://github.com/user/sloth-plugin/releases/download/v1.0.0/plugin.js"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="mt-1 font-mono text-xs"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setCustomModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={!customUrl.trim()}>
                  Install Plugin
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PluginsPage;
