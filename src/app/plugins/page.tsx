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
import { Button, Toggle, Badge } from '@/components/ui';
import { cn } from '@/lib/utils';

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
        repo: customUrl,
        downloadUrl: customUrl,
        addedAt: new Date().toISOString(),
      };

      installPlugin(customManifest);
      setCustomUrl('');
      setCustomModalOpen(false);
      setCustomError(null);
    } catch {
      setCustomError('Invalid plugin URL or manifest format.');
    }
  };

  return (
    <div data-testid="plugins-view" className="flex h-full flex-col font-sans select-none surface-background text-foreground">
      {/* Top Header Bar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b-(length:--border-width) border-border bg-muted px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md surface-primary border-(length:--border-width) border-border shadow-xs text-foreground font-bold text-xs">
            <Package size={16} />
          </div>
          <div>
            <h1 className="text-sm font-bold font-heading tracking-tight text-foreground">
              Plugin Marketplace & Extensions
            </h1>
            <p className="font-sans text-xs text-foreground/60">
              Sloth dynamic plugins • Community registry
            </p>
          </div>
        </div>

        {/* Center Tabs: Store | Installed */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'store'}
            onClick={() => setActiveTab('store')}
            className={cn(
              'px-4 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-all border-(length:--border-width) border-border shadow-shadow',
              activeTab === 'store'
                ? 'surface-primary text-foreground'
                : 'surface-input text-foreground hover:bg-foreground/5'
            )}
          >
            Store
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'installed'}
            onClick={() => setActiveTab('installed')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-all border-(length:--border-width) border-border shadow-shadow',
              activeTab === 'installed'
                ? 'surface-primary text-foreground'
                : 'surface-input text-foreground hover:bg-foreground/5'
            )}
          >
            <span>Installed</span>
            <span className="inline-flex items-center justify-center size-4 rounded-full bg-black text-white text-[10px] font-sans font-bold leading-none">
              {installedCount}
            </span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={() => setCustomModalOpen(true)}
            className="font-bold shadow-shadow gap-1.5 text-xs font-sans"
          >
            <Plus size={14} />
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
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/60"
                  />
                  <input
                    type="text"
                    placeholder="Search plugins by name, author, or keyword..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="surface-input border-border text-foreground shadow-shadow h-10 w-full rounded-md border-(length:--border-width) pl-10 pr-4 text-xs font-medium outline-none placeholder:text-foreground/40 font-sans"
                  />
                </div>

                {/* Category Chips */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {CATEGORY_CHIPS.map((chip) => {
                    const isSelected = selectedCategory === chip.id;
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => setSelectedCategory(chip.id)}
                        className={cn(
                          'px-3.5 py-1.5 rounded-md text-xs font-sans font-bold cursor-pointer transition-all border-(length:--border-width) border-border shadow-shadow',
                          isSelected
                            ? 'surface-primary text-foreground'
                            : 'surface-input text-foreground/80 hover:bg-foreground/5'
                        )}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Plugin Store Grid */}
              <div className="space-y-3">
                {filteredStorePlugins.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center rounded-lg border-(length:--border-width) border-border surface-input shadow-shadow">
                    <Package size={36} className="text-foreground/40 mb-2" />
                    <h3 className="text-sm font-bold font-heading text-foreground">No plugins match your filter</h3>
                    <p className="text-xs text-foreground/60 mt-1">
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
                        className="surface-input border-border shadow-shadow flex items-center justify-between gap-4 p-4 rounded-lg border-(length:--border-width)"
                      >
                        <div className="flex flex-col min-w-0 flex-1 gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-bold font-heading text-foreground inline-flex items-baseline gap-2">
                              <span>{plugin.name}</span>
                              <span className="text-xs font-normal text-foreground/60 font-sans">
                                by <span className="font-medium text-foreground/80">{plugin.author}</span>
                              </span>
                            </h3>
                            <Badge variant="pill" color="inverted" className="text-[11px] font-semibold">
                              v{plugin.version}
                            </Badge>
                            {plugin.verified && (
                              <Badge variant="pill" color="green" className="text-[11px] font-semibold gap-1">
                                <ShieldCheck size={11} />
                                Verified
                              </Badge>
                            )}
                            <Badge variant="pill" color="cyan" className="text-[11px] font-semibold capitalize">
                              {plugin.category}
                            </Badge>
                          </div>
                          <p className="text-xs text-foreground/70 line-clamp-2 leading-relaxed">
                            {plugin.description}
                          </p>
                        </div>

                        {/* Action: Install / Installed */}
                        <div className="shrink-0">
                          {isInstalling ? (
                            <Button size="sm" disabled className="w-28 font-sans text-xs font-bold shadow-shadow">
                              Installing...
                            </Button>
                          ) : isInstalled ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled
                              className="w-28 font-sans text-xs flex items-center justify-center gap-1.5 border-border border-(length:--border-width) shadow-xs font-bold"
                            >
                              <Check size={14} />
                              Installed
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleInstall(plugin)}
                              className="w-28 font-sans text-xs flex items-center justify-center gap-1.5 font-bold shadow-shadow"
                            >
                              <Download size={14} />
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
                  <h2 className="text-base font-bold font-heading text-foreground">
                    Installed Extensions ({installedCount})
                  </h2>
                  <p className="text-xs text-foreground/60">
                    Installed plugins run within Sloth's sandbox with access to audio feeds and SQLite cache.
                  </p>
                </div>
              </div>

              {installedCount === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center rounded-lg border-(length:--border-width) border-border surface-input shadow-shadow">
                  <Package size={36} className="text-foreground/40 mb-2" />
                  <h3 className="text-sm font-bold font-heading text-foreground">No plugins installed</h3>
                  <p className="text-xs text-foreground/60 mt-1 mb-4">
                    Explore the community store to enable streaming providers, lyrics, and widgets.
                  </p>
                  <Button size="sm" variant="default" onClick={() => setActiveTab('store')} className="font-bold shadow-shadow font-sans">
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
                        className={cn(
                          'flex items-center justify-between gap-4 p-4 rounded-lg border-(length:--border-width) border-border surface-input shadow-shadow transition-all',
                          !enabled && 'opacity-60'
                        )}
                      >
                        {/* Plugin Info */}
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md surface-primary border-(length:--border-width) border-border shadow-xs text-foreground font-sans font-bold text-xs uppercase">
                            {plugin.category.substring(0, 2)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold font-heading text-foreground">
                                {plugin.name}
                              </span>
                              <span className="text-xs text-foreground/60 font-sans">
                                by {plugin.author}
                              </span>
                              <Badge variant="pill" color="inverted" className="text-[11px] font-semibold">
                                v{plugin.version}
                              </Badge>
                              {plugin.loadTimeMs && (
                                <Badge variant="pill" color="purple" className="text-[11px] font-semibold">
                                  {plugin.loadTimeMs}ms
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-foreground/70 truncate mt-0.5">
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
                            variant="text"
                            onClick={() => handleReload(plugin.id)}
                            title="Reload plugin"
                            className="text-foreground/70 hover:text-foreground"
                          >
                            <RotateCw
                              size={15}
                              className={isReloading ? 'animate-spin text-primary' : ''}
                            />
                          </Button>

                          <Button
                            size="icon-sm"
                            variant="text"
                            onClick={() => handleUninstall(plugin.id)}
                            title="Uninstall plugin"
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={15} />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg border-(length:--border-width) border-border surface-background p-6 space-y-4 shadow-nav text-foreground">
            <div>
              <h3 className="text-base font-bold text-foreground">Add Custom Plugin</h3>
              <p className="text-xs text-foreground/60 mt-0.5">
                Install a community plugin by direct repository URL or manifest JSON.
              </p>
            </div>

            {customError && (
              <div className="p-2.5 rounded bg-red-100 border border-red-500 text-red-800 text-xs font-mono">
                {customError}
              </div>
            )}

            <form onSubmit={handleAddCustom} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-foreground">
                  Plugin Manifest or GitHub URL
                </label>
                <input
                  type="text"
                  placeholder="https://github.com/user/sloth-plugin/releases/download/v1.0.0/plugin.js"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="surface-input border-border text-foreground shadow-shadow mt-1 h-10 w-full rounded-md border-(length:--border-width) px-3 font-mono text-xs outline-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setCustomModalOpen(false)}
                  className="font-bold shadow-shadow"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="default"
                  disabled={!customUrl.trim()}
                  className="font-bold shadow-shadow"
                >
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
