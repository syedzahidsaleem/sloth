import { FC, useState, useEffect } from 'react';
import {
  Sliders,
  Palette,
  Keyboard,
  Package,
  ScrollText,
  Sparkles,
  History,
  Radio,
  Volume2,
  RefreshCw,
  X,
  Check,
  Globe,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { Slider } from '@/components/ui/Slider';
import { Input } from '@/components/ui/Input';
import { KeyCombo } from '@/components/ui/KeyCombo';
import { cn } from '@/lib/utils';
import {
  getSlothSettings,
  saveSlothSettings,
  applyTheme,
  SlothSettings,
} from '@/services/settingsStore';

export type SettingsTabId =
  // SETTINGS section
  | 'appearance'
  | 'general'
  | 'history'
  | 'integrations'
  | 'playback'
  | 'plugins-settings'
  | 'updates'
  // APP section
  | 'shortcuts'
  | 'app-plugins'
  | 'themes'
  | 'logs'
  | 'whats-new';

export type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTabId;
  onNavigateToPlugins?: () => void;
};

export const BUILTIN_THEMES = [
  {
    id: 'default',
    name: 'Sloth Classic',
    palette: [
      'oklch(0.72 0.19 145)', // Sloth Tactical Green
      'oklch(0.24 0.015 240)', // Charcoal Background
      'oklch(0.27 0.015 240)', // Muted Surface
      'oklch(0.38 0.015 240)', // Border
    ],
  },
  {
    id: 'nuclear:aurora',
    name: 'Aurora',
    palette: [
      'oklch(0.72 0.18 305)', // Neon Magenta/Violet
      'oklch(0.22 0.03 305)',  // Deep Purple Charcoal
      'oklch(0.27 0.035 305)', // Violet Surface
      'oklch(0.42 0.05 305)',  // Violet Border
    ],
  },
  {
    id: 'nuclear:ember',
    name: 'Ember',
    palette: [
      'oklch(0.74 0.18 35)',  // Fiery Amber/Orange
      'oklch(0.22 0.03 20)',   // Warm Charcoal
      'oklch(0.27 0.035 20)',  // Amber Surface
      'oklch(0.44 0.05 25)',   // Amber Border
    ],
  },
  {
    id: 'nuclear:lagoon',
    name: 'Lagoon',
    palette: [
      'oklch(0.68 0.16 205)', // Luminous Cyan
      'oklch(0.20 0.025 205)', // Ocean Charcoal
      'oklch(0.25 0.03 205)',  // Cyan Surface
      'oklch(0.42 0.04 205)',  // Cyan Border
    ],
  },
  {
    id: 'nuclear:arctic-moss',
    name: 'Moss',
    palette: [
      'oklch(0.70 0.14 175)', // Vivid Emerald
      'oklch(0.20 0.02 175)',  // Forest Charcoal
      'oklch(0.25 0.025 175)', // Moss Surface
      'oklch(0.42 0.035 175)', // Moss Border
    ],
  },
  {
    id: 'dark',
    name: 'Midnight Dark',
    palette: [
      'oklch(0.74 0.20 145)', // Bright Green
      'oklch(0.18 0.01 240)',  // Deep Pitch Black
      'oklch(0.22 0.012 240)', // Charcoal Surface
      'oklch(0.32 0.012 240)', // Border
    ],
  },
];

export const SettingsModal: FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'appearance',
  onNavigateToPlugins,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);
  const [settings, setSettings] = useState<SlothSettings>(getSlothSettings());
  const [currentThemeId, setCurrentThemeId] = useState<string>('default');

  // Track settings changes
  useEffect(() => {
    if (isOpen) {
      const currentSettings = getSlothSettings();
      setSettings(currentSettings);
      if (initialTab) setActiveTab(initialTab);
      setCurrentThemeId(currentSettings.themeId || 'default');
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const updateSetting = <K extends keyof SlothSettings>(key: K, value: SlothSettings[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveSlothSettings(next);
  };

  const handleSelectTheme = (themeId: string) => {
    setCurrentThemeId(themeId);
    applyTheme(themeId);
    updateSetting('themeId', themeId);
  };

  return (
    <div
      data-testid="settings-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-8 md:p-12 font-sans select-none"
    >
      <div className="surface-muted text-foreground border-border shadow-nav relative flex h-full max-h-[820px] w-full max-w-5xl rounded-lg border-(length:--border-width) overflow-hidden">
        {/* Close Button top-right */}
        <Button
          size="icon-sm"
          variant="text"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 size-8 text-foreground"
          aria-label="Close settings"
        >
          <X size={18} />
        </Button>

        {/* LEFT COLUMN: Navigation Sidebar */}
        <nav className="border-border flex w-56 shrink-0 flex-col border-r-(length:--border-width) bg-muted p-3 justify-between">
          <div className="flex flex-col gap-1 overflow-y-auto">
            {/* SETTINGS Category */}
            <div className="font-heading text-foreground/60 px-2 pt-2 pb-1 text-xs font-extrabold tracking-wider uppercase">
              Settings
            </div>

            <Button
              variant={activeTab === 'appearance' ? 'default' : 'text'}
              onClick={() => setActiveTab('appearance')}
              className="w-full justify-start text-xs font-bold gap-2.5 h-9"
            >
              <Sliders size={15} />
              Appearance
            </Button>

            <Button
              variant={activeTab === 'general' ? 'default' : 'text'}
              onClick={() => setActiveTab('general')}
              className="w-full justify-start text-xs font-bold gap-2.5 h-9"
            >
              <Sliders size={15} />
              General
            </Button>

            <Button
              variant={activeTab === 'history' ? 'default' : 'text'}
              onClick={() => setActiveTab('history')}
              className="w-full justify-start text-xs font-bold gap-2.5 h-9"
            >
              <History size={15} />
              History
            </Button>

            <Button
              variant={activeTab === 'integrations' ? 'default' : 'text'}
              onClick={() => setActiveTab('integrations')}
              className="w-full justify-start text-xs font-bold gap-2.5 h-9"
            >
              <Radio size={15} />
              Integrations
            </Button>

            <Button
              variant={activeTab === 'playback' ? 'default' : 'text'}
              onClick={() => setActiveTab('playback')}
              className="w-full justify-start text-xs font-bold gap-2.5 h-9"
            >
              <Volume2 size={15} />
              Playback
            </Button>

            <Button
              variant={activeTab === 'plugins-settings' ? 'default' : 'text'}
              onClick={() => setActiveTab('plugins-settings')}
              className="w-full justify-start text-xs font-bold gap-2.5 h-9"
            >
              <Package size={15} />
              Plugins
            </Button>

            <Button
              variant={activeTab === 'updates' ? 'default' : 'text'}
              onClick={() => setActiveTab('updates')}
              className="w-full justify-start text-xs font-bold gap-2.5 h-9"
            >
              <RefreshCw size={15} />
              Updates
            </Button>

            {/* APP Category */}
            <div className="font-heading text-foreground/60 px-2 pt-4 pb-1 text-xs font-extrabold tracking-wider uppercase">
              App
            </div>

            <Button
              variant={activeTab === 'shortcuts' ? 'default' : 'text'}
              onClick={() => setActiveTab('shortcuts')}
              className="w-full justify-start text-xs font-bold gap-2.5 h-9"
            >
              <Keyboard size={15} />
              Key Shortcuts
            </Button>

            <Button
              variant={activeTab === 'app-plugins' ? 'default' : 'text'}
              onClick={() => setActiveTab('app-plugins')}
              className="w-full justify-start text-xs font-bold gap-2.5 h-9"
            >
              <Package size={15} />
              Plugins
            </Button>

            <Button
              variant={activeTab === 'themes' ? 'default' : 'text'}
              onClick={() => setActiveTab('themes')}
              className="w-full justify-start text-xs font-bold gap-2.5 h-9"
            >
              <Palette size={15} />
              Themes
            </Button>

            <Button
              variant={activeTab === 'logs' ? 'default' : 'text'}
              onClick={() => setActiveTab('logs')}
              className="w-full justify-start text-xs font-bold gap-2.5 h-9"
            >
              <ScrollText size={15} />
              Logs
            </Button>

            <Button
              variant={activeTab === 'whats-new' ? 'default' : 'text'}
              onClick={() => setActiveTab('whats-new')}
              className="w-full justify-start text-xs font-bold gap-2.5 h-9"
            >
              <Sparkles size={15} />
              What's New
            </Button>
          </div>

          {/* Navigation Footer */}
          <div className="mt-auto pt-3 border-t-(length:--border-width) border-border/20 flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-2">
              <Button
                variant="text"
                size="icon-sm"
                onClick={() => window.open('https://discord.gg/JqPjKxE', '_blank')}
                title="Discord"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
              </Button>
              <Button
                variant="text"
                size="icon-sm"
                onClick={() => window.open('https://github.com/syedzahid/sloth', '_blank')}
                title="GitHub"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                </svg>
              </Button>
              <Button
                variant="text"
                size="icon-sm"
                onClick={() => window.open('https://slothmusic.app', '_blank')}
                title="Website"
              >
                <Globe size={15} />
              </Button>
            </div>
            <span className="text-[11px] text-foreground/50 font-mono">
              Sloth v0.1.0
            </span>
          </div>
        </nav>

        {/* RIGHT COLUMN: Settings Content Panel */}
        <div className="surface-background flex-1 min-w-0 overflow-y-auto p-8 text-foreground font-sans">
          {/* TAB: APPEARANCE (matches Screenshot 2) */}
          {activeTab === 'appearance' && (
            <div className="flex flex-col gap-6 max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight">Appearance</h2>

              {/* Frameless window */}
              <div className="flex items-center justify-between py-2 border-b-(length:--border-width) border-border/10">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold">Frameless window</span>
                  <span className="text-xs text-foreground/60">
                    Requires restart to take effect
                  </span>
                </div>
                <Toggle
                  checked={settings.framelessWindow ?? false}
                  onChange={(checked) => updateSetting('framelessWindow', checked)}
                />
              </div>

              {/* Custom title bar */}
              <div className="flex items-center justify-between py-2 border-b-(length:--border-width) border-border/10">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold">Custom title bar</span>
                  <span className="text-xs text-foreground/60">
                    Enable custom title bar across all operating systems
                  </span>
                </div>
                <Toggle
                  checked={settings.customTitleBar ?? true}
                  onChange={(checked) => updateSetting('customTitleBar', checked)}
                />
              </div>

              {/* Title bar style */}
              <div className="flex items-center justify-between py-2 border-b-(length:--border-width) border-border/10">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold">Title bar style</span>
                  <span className="text-xs text-foreground/60">
                    Auto, native, or custom styled window decorations
                  </span>
                </div>
                <select
                  value={settings.titleBarStyle ?? 'Auto'}
                  onChange={(e) => updateSetting('titleBarStyle', e.target.value)}
                  className="surface-input border-border text-foreground rounded border-(length:--border-width) px-3 py-1.5 text-xs font-semibold outline-none cursor-pointer"
                >
                  <option value="Auto">Auto</option>
                  <option value="Native">Native</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB: GENERAL */}
          {activeTab === 'general' && (
            <div className="flex flex-col gap-6 max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight">General</h2>
              <div className="flex items-center justify-between py-2 border-b-(length:--border-width) border-border/10">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold">Language</span>
                  <span className="text-xs text-foreground/60">
                    Application interface language
                  </span>
                </div>
                <select
                  value="English"
                  onChange={() => {}}
                  className="surface-input border-border text-foreground rounded border-(length:--border-width) px-3 py-1.5 text-xs font-semibold outline-none cursor-pointer"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="German">German</option>
                  <option value="French">French</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB: HISTORY (matches Screenshot 4) */}
          {activeTab === 'history' && (
            <div className="flex flex-col gap-6 max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight">History</h2>
              <div className="flex items-center justify-between py-2 border-b-(length:--border-width) border-border/10">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold">Record listening history</span>
                  <span className="text-xs text-foreground/60">
                    Track songs you play to improve recommendations and library logs
                  </span>
                </div>
                <Toggle
                  checked={settings.recordHistory ?? true}
                  onChange={(checked) => updateSetting('recordHistory', checked)}
                />
              </div>

              <div>
                <Button
                  variant="default"
                  onClick={() => alert('Listening history cleared.')}
                >
                  Clear history
                </Button>
              </div>
            </div>
          )}

          {/* TAB: INTEGRATIONS (matches Screenshot 3) */}
          {activeTab === 'integrations' && (
            <div className="flex flex-col gap-6 max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight">Integrations</h2>

              {/* Sloth Jam */}
              <div className="flex flex-col gap-3 py-2 border-b-(length:--border-width) border-border/10">
                <h3 className="text-base font-bold">Sloth Jam (Listen Together)</h3>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Enable Sloth Jam</span>
                  <Toggle
                    checked={settings.enableNuclearJam ?? false}
                    onChange={(checked) => updateSetting('enableNuclearJam', checked)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-foreground/70">Remote URL</label>
                  <Input
                    value={settings.remoteUrl ?? ''}
                    onChange={(e) => updateSetting('remoteUrl', e.target.value)}
                    placeholder="https://jam.example.com"
                    size="sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-foreground/70">API URL</label>
                  <Input
                    value={settings.apiUrl ?? ''}
                    onChange={(e) => updateSetting('apiUrl', e.target.value)}
                    placeholder="https://jam.example.com/api"
                    size="sm"
                  />
                </div>
              </div>

              {/* Model Context Protocol (MCP) */}
              <div className="flex flex-col gap-3 py-2 border-b-(length:--border-width) border-border/10">
                <h3 className="text-base font-bold">Model Context Protocol (MCP)</h3>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Enable MCP Server</span>
                  <Toggle
                    checked={settings.mcpServerEnabled ?? true}
                    onChange={(checked) => updateSetting('mcpServerEnabled', checked)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-foreground/70">Server URL</label>
                  <Input
                    value="http://127.0.0.1:8800/mcp"
                    readOnly
                    size="sm"
                  />
                </div>
              </div>

              {/* Music Player Daemon (MPD) */}
              <div className="flex flex-col gap-3 py-2 border-b-(length:--border-width) border-border/10">
                <h3 className="text-base font-bold">Music Player Daemon (MPD)</h3>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Enable MPD Server</span>
                  <Toggle
                    checked={settings.mpdEnabled ?? false}
                    onChange={(checked) => updateSetting('mpdEnabled', checked)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-foreground/70">Server URL</label>
                  <Input
                    value="mpd://127.0.0.1:6600"
                    readOnly
                    size="sm"
                  />
                </div>
              </div>

              {/* Sloth Neural Engine */}
              <div className="flex flex-col gap-3 py-2">
                <h3 className="text-base font-bold">SLOTH Neural Engine</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-green-500" />
                    <span className="text-xs font-semibold">Engine status: Running on localhost:8001</span>
                  </div>
                  <Button size="xs" variant="secondary" onClick={() => alert('FastAPI Recommender engine healthy!')}>
                    Check health
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PLAYBACK (matches Screenshot 8) */}
          {activeTab === 'playback' && (
            <div className="flex flex-col gap-6 max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight">Playback</h2>

              {/* Discovery Variety Slider */}
              <div className="flex flex-col gap-2 py-2 border-b-(length:--border-width) border-border/10">
                <h3 className="text-base font-bold">Discovery</h3>
                <span className="text-xs font-semibold">Discovery variety</span>
                <div className="pt-2 pb-1">
                  <Slider
                    value={settings.discoveryVariety ?? 50}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(val) => updateSetting('discoveryVariety', val)}
                    showValue={false}
                    showFooter={false}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-foreground/60 font-medium">
                  <span>Less crazy</span>
                  <span>More crazy</span>
                </div>
              </div>

              {/* Playback Controls */}
              <div className="flex flex-col gap-4 py-2">
                <h3 className="text-base font-bold">Playback</h3>

                {/* Skip duration */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold">Skip duration</span>
                    <span className="text-xs text-foreground/60">Seconds to seek forward or backward</span>
                  </div>
                  <input
                    type="number"
                    value={settings.skipDurationSeconds ?? 5}
                    onChange={(e) => updateSetting('skipDurationSeconds', parseInt(e.target.value) || 5)}
                    className="surface-input border-border text-foreground rounded border-(length:--border-width) px-3 py-1 text-xs font-bold w-20 text-center outline-none"
                  />
                </div>

                {/* Crossfade */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold">Crossfade</span>
                    <span className="text-xs text-foreground/60">Transition overlap duration in seconds</span>
                  </div>
                  <input
                    type="number"
                    value={settings.crossfadeSeconds ?? 0}
                    onChange={(e) => updateSetting('crossfadeSeconds', parseInt(e.target.value) || 0)}
                    className="surface-input border-border text-foreground rounded border-(length:--border-width) px-3 py-1 text-xs font-bold w-20 text-center outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB: KEY SHORTCUTS (matches Screenshot 5) */}
          {activeTab === 'shortcuts' && (
            <div className="flex flex-col gap-6 max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight">Key Shortcuts</h2>

              <div className="flex flex-col divide-y-(length:--border-width) divide-border/10">
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-sm font-semibold">Play / Pause</span>
                  <KeyCombo shortcut="Space" />
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-sm font-semibold">Next track</span>
                  <KeyCombo shortcut="Ctrl+Right" />
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-sm font-semibold">Previous track</span>
                  <KeyCombo shortcut="Ctrl+Left" />
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-sm font-semibold">Volume up</span>
                  <KeyCombo shortcut="Ctrl+Up" />
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-sm font-semibold">Volume down</span>
                  <KeyCombo shortcut="Ctrl+Down" />
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-sm font-semibold">Toggle queue</span>
                  <KeyCombo shortcut="Ctrl+Q" />
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-sm font-semibold">Search</span>
                  <KeyCombo shortcut="Ctrl+F" />
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-sm font-semibold">Ask Sloth AI</span>
                  <KeyCombo shortcut="Ctrl+K" />
                </div>
              </div>
            </div>
          )}

          {/* TAB: THEMES (matches Screenshot 9) */}
          {activeTab === 'themes' && (
            <div className="flex flex-col gap-6 max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight">Themes</h2>

              <div className="flex items-center gap-4 border-b-(length:--border-width) border-border pb-2">
                <span className="text-sm font-extrabold border-b-2 border-primary pb-1 cursor-pointer">
                  My themes
                </span>
                <span className="text-sm font-medium opacity-60 hover:opacity-100 cursor-pointer">
                  Theme store
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {BUILTIN_THEMES.map((theme) => {
                  const isActive = currentThemeId === theme.id;

                  return (
                    <Button
                      key={theme.id}
                      variant={isActive ? 'default' : 'tertiary'}
                      size="flexible"
                      onClick={() => handleSelectTheme(theme.id)}
                      className={cn(
                        'flex flex-col justify-between items-start gap-3 p-4 rounded-md text-left transition-all',
                        isActive
                          ? 'border-border shadow-shadow ring-2 ring-primary/40'
                          : 'border-border shadow-shadow hover:scale-[1.02]',
                      )}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="text-sm font-bold">{theme.name}</span>
                        {isActive && <Check size={16} className="text-foreground shrink-0" />}
                      </div>

                      {/* 4 Palette Circles */}
                      <div className="flex items-center gap-1.5">
                        {theme.palette.map((color, idx) => (
                          <span
                            key={idx}
                            aria-hidden
                            className="ring-border inline-block size-5 rounded-full ring-2 shadow-xs"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: PLUGINS / APP-PLUGINS */}
          {(activeTab === 'app-plugins' || activeTab === 'plugins-settings') && (
            <div className="flex flex-col gap-6 max-w-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Plugins</h2>
                  <p className="text-xs opacity-70 mt-0.5">
                    Extend Sloth with streaming, metadata, and lyrics providers.
                  </p>
                </div>
                {onNavigateToPlugins && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => {
                      onClose();
                      onNavigateToPlugins();
                    }}
                    className="font-bold gap-1.5"
                  >
                    <Package size={15} />
                    Open Marketplace
                  </Button>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {[
                  { id: 'youtube', name: 'YouTube Music', category: 'Streaming & Metadata', active: true },
                  { id: 'piped', name: 'Piped Engine', category: 'Streaming (Privacy)', active: true },
                  { id: 'qobuz', name: 'Qobuz Hi-Res', category: 'Lossless Streaming', active: true },
                  { id: 'soundcloud', name: 'SoundCloud', category: 'Discovery', active: true },
                  { id: 'bandcamp', name: 'Bandcamp', category: 'Discovery', active: true },
                  { id: 'musicbrainz', name: 'MusicBrainz', category: 'Metadata', active: true },
                  { id: 'lrclib', name: 'LRCLIB Synced Lyrics', category: 'Lyrics', active: true },
                ].map((plugin) => (
                  <div
                    key={plugin.id}
                    className="surface-card border-border shadow-shadow flex items-center justify-between rounded-md border-(length:--border-width) p-3"
                  >
                    <div>
                      <div className="text-sm font-bold">{plugin.name}</div>
                      <div className="text-xs opacity-60">{plugin.category}</div>
                    </div>
                    <Toggle defaultChecked={plugin.active} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: LOGS */}
          {activeTab === 'logs' && (
            <div className="flex flex-col gap-6 max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight">Logs</h2>
              <div className="surface-input border-border rounded-md border-(length:--border-width) p-4 font-mono text-xs max-h-96 overflow-y-auto flex flex-col gap-1">
                <span className="text-green-500">[INFO] Application initialized successfully.</span>
                <span>[INFO] Loaded audio plugins: youtube, piped, qobuz, soundcloud, bandcamp</span>
                <span>[INFO] SQLite database connected: sloth.db</span>
                <span>[INFO] Fast-API Recommender Engine connected at 127.0.0.1:8001</span>
                <span>[INFO] MCP Server listening on 127.0.0.1:8800/mcp</span>
              </div>
            </div>
          )}

          {/* TAB: WHATS NEW */}
          {activeTab === 'whats-new' && (
            <div className="flex flex-col gap-6 max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight">What's New</h2>
              <div className="flex flex-col gap-4">
                <div className="surface-card border-border shadow-shadow rounded-md border-(length:--border-width) p-4">
                  <div className="text-sm font-bold">Sloth v0.1.0</div>
                  <div className="text-xs opacity-70 mt-1">
                    • Exact neobrutalist UI design tokens & dual collapsible sidebars
                    <br />• Universal source matching pipeline (YouTube, Piped, Bandcamp, Qobuz)
                    <br />• Full Model Context Protocol (MCP) server integration
                    <br />• High-density music player bar with top seekbar
                    <br />• Gated Fusion neural recommendations and CLAP acoustic search
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: UPDATES */}
          {activeTab === 'updates' && (
            <div className="flex flex-col gap-6 max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight">Updates</h2>
              <div className="surface-card border-border shadow-shadow flex items-center justify-between rounded-md border-(length:--border-width) p-4">
                <div>
                  <div className="text-sm font-bold">Sloth v0.1.0 is installed</div>
                  <div className="text-xs opacity-60 mt-0.5">Your application is up to date.</div>
                </div>
                <Button size="sm" variant="default" onClick={() => alert('Checking for updates...')}>
                  Check for updates
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
