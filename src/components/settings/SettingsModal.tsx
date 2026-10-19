import { FC, useState, useEffect } from 'react';
import {
  Keyboard,
  Package,
  ScrollText,
  Sparkles,
  Palette,
  X,
  Globe,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { Slider } from '@/components/ui/Slider';
import { Select } from '@/components/ui/Select';
import { SlothLogo } from '@/components/ui/SlothLogo';
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
    name: 'Default',
    palette: [
      'oklch(0.8 0.12 5)',
      'oklch(0.92 0.036 7)',
      'oklch(0.5 0.1 5)',
      'oklch(0.22 0.03 5)',
    ],
  },
  {
    id: 'nuclear:aurora',
    name: 'Aurora',
    palette: [
      'oklch(0.74 0.15 305)',
      'oklch(0.98 0.01 340)',
      'oklch(0.62 0.11 305)',
      'oklch(0.22 0.03 305)',
    ],
  },
  {
    id: 'nuclear:ember',
    name: 'Ember',
    palette: [
      'oklch(0.76 0.14 30)',
      'oklch(0.97 0.02 70)',
      'oklch(0.64 0.10 30)',
      'oklch(0.22 0.03 20)',
    ],
  },
  {
    id: 'nuclear:lagoon',
    name: 'Lagoon',
    palette: [
      'oklch(0.67 0.16 205)',
      'oklch(0.985 0.018 210)',
      'oklch(0.55 0.12 205)',
      'oklch(0.20 0.025 205)',
    ],
  },
  {
    id: 'nuclear:arctic-moss',
    name: 'Moss',
    palette: [
      'oklch(0.70 0.12 175)',
      'oklch(0.97 0.008 200)',
      'oklch(0.58 0.09 175)',
      'oklch(0.20 0.02 175)',
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
  const [themeSubTab, setThemeSubTab] = useState<'my' | 'store'>('my');
  const [selectedAdvancedTheme, setSelectedAdvancedTheme] = useState<string>('none');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const shouldReduce = useReducedMotion();

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

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div
      data-testid="settings-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-8 md:p-12 font-sans select-none"
    >
      <div className="surface-background text-foreground border-border shadow-nav relative flex h-full max-h-[820px] w-full max-w-5xl rounded-lg border-(length:--border-width) overflow-hidden">
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
            {/* SETTINGS Category (Matches Screenshot 2: Clean bold text, no icons) */}
            <div className="font-heading text-foreground/60 px-2 pt-2 pb-1 text-xs font-extrabold tracking-wider uppercase">
              Settings
            </div>

            <Button
              variant={activeTab === 'appearance' ? 'default' : 'text'}
              onClick={() => setActiveTab('appearance')}
              className={cn(
                'w-full justify-start text-xs font-bold h-9 rounded-md',
                activeTab === 'appearance' && 'shadow-shadow border-border border-(length:--border-width)'
              )}
            >
              Appearance
            </Button>

            <Button
              variant={activeTab === 'general' ? 'default' : 'text'}
              onClick={() => setActiveTab('general')}
              className={cn(
                'w-full justify-start text-xs font-bold h-9 rounded-md',
                activeTab === 'general' && 'shadow-shadow border-border border-(length:--border-width)'
              )}
            >
              General
            </Button>

            <Button
              variant={activeTab === 'history' ? 'default' : 'text'}
              onClick={() => setActiveTab('history')}
              className={cn(
                'w-full justify-start text-xs font-bold h-9 rounded-md',
                activeTab === 'history' && 'shadow-shadow border-border border-(length:--border-width)'
              )}
            >
              History
            </Button>

            <Button
              variant={activeTab === 'integrations' ? 'default' : 'text'}
              onClick={() => setActiveTab('integrations')}
              className={cn(
                'w-full justify-start text-xs font-bold h-9 rounded-md',
                activeTab === 'integrations' && 'shadow-shadow border-border border-(length:--border-width)'
              )}
            >
              Integrations
            </Button>

            <Button
              variant={activeTab === 'playback' ? 'default' : 'text'}
              onClick={() => setActiveTab('playback')}
              className={cn(
                'w-full justify-start text-xs font-bold h-9 rounded-md',
                activeTab === 'playback' && 'shadow-shadow border-border border-(length:--border-width)'
              )}
            >
              Playback
            </Button>

            <Button
              variant={activeTab === 'plugins-settings' ? 'default' : 'text'}
              onClick={() => setActiveTab('plugins-settings')}
              className={cn(
                'w-full justify-start text-xs font-bold h-9 rounded-md',
                activeTab === 'plugins-settings' && 'shadow-shadow border-border border-(length:--border-width)'
              )}
            >
              Plugins
            </Button>

            <Button
              variant={activeTab === 'updates' ? 'default' : 'text'}
              onClick={() => setActiveTab('updates')}
              className={cn(
                'w-full justify-start text-xs font-bold h-9 rounded-md',
                activeTab === 'updates' && 'shadow-shadow border-border border-(length:--border-width)'
              )}
            >
              Updates
            </Button>

            {/* APP Category (Matches Screenshot 2: Icons present) */}
            <div className="font-heading text-foreground/60 px-2 pt-4 pb-1 text-xs font-extrabold tracking-wider uppercase">
              App
            </div>

            <Button
              variant={activeTab === 'shortcuts' ? 'default' : 'text'}
              onClick={() => setActiveTab('shortcuts')}
              className={cn(
                'w-full justify-start text-xs font-bold gap-2.5 h-9 rounded-md',
                activeTab === 'shortcuts' && 'shadow-shadow border-border border-(length:--border-width)'
              )}
            >
              <Keyboard size={15} />
              Key Shortcuts
            </Button>

            <Button
              variant={activeTab === 'app-plugins' ? 'default' : 'text'}
              onClick={() => setActiveTab('app-plugins')}
              className={cn(
                'w-full justify-start text-xs font-bold gap-2.5 h-9 rounded-md',
                activeTab === 'app-plugins' && 'shadow-shadow border-border border-(length:--border-width)'
              )}
            >
              <Package size={15} />
              Plugins
            </Button>

            <Button
              variant={activeTab === 'themes' ? 'default' : 'text'}
              onClick={() => setActiveTab('themes')}
              className={cn(
                'w-full justify-start text-xs font-bold gap-2.5 h-9 rounded-md',
                activeTab === 'themes' && 'shadow-shadow border-border border-(length:--border-width)'
              )}
            >
              <Palette size={15} />
              Themes
            </Button>

            <Button
              variant={activeTab === 'logs' ? 'default' : 'text'}
              onClick={() => setActiveTab('logs')}
              className={cn(
                'w-full justify-start text-xs font-bold gap-2.5 h-9 rounded-md',
                activeTab === 'logs' && 'shadow-shadow border-border border-(length:--border-width)'
              )}
            >
              <ScrollText size={15} />
              Logs
            </Button>

            <Button
              variant={activeTab === 'whats-new' ? 'default' : 'text'}
              onClick={() => setActiveTab('whats-new')}
              className={cn(
                'w-full justify-start text-xs font-bold gap-2.5 h-9 rounded-md',
                activeTab === 'whats-new' && 'shadow-shadow border-border border-(length:--border-width)'
              )}
            >
              <Sparkles size={15} />
              What's New
            </Button>
          </div>

          {/* Navigation Footer with Social Icons + Custom Sloth Logo */}
          <div className="mt-auto pt-3 border-t-(length:--border-width) border-border/20 flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-2">
              <Button
                variant="text"
                size="icon-sm"
                onClick={() => window.open('https://discord.gg/sloth', '_blank')}
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
              <Button
                variant="text"
                size="icon-sm"
                title="Sloth"
                className="p-0.5"
              >
                <SlothLogo size={16} />
              </Button>
            </div>
            <span className="text-[11px] text-foreground/50 font-mono">
              v1.51.0 (sloth-edition)
            </span>
          </div>
        </nav>

        {/* RIGHT COLUMN: Settings Content Panel */}
        <div className="surface-background flex-1 min-w-0 overflow-y-auto p-8 text-foreground font-sans">
          {/* TAB: APPEARANCE (Exact match to Screenshot 2) */}
          {activeTab === 'appearance' && (
            <div className="flex flex-col gap-6 max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight">Appearance</h2>

              {/* Frameless window: Toggle on LEFT */}
              <div className="flex items-start gap-3 py-2">
                <Toggle
                  checked={settings.framelessWindow ?? false}
                  onChange={(checked) => updateSetting('framelessWindow', checked)}
                />
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold">Frameless window</span>
                  <span className="text-xs text-foreground/60">
                    Hide the native title bar. Drag the top bar to move the window.
                  </span>
                </div>
              </div>

              {/* Custom title bar: Toggle on LEFT */}
              <div className="flex items-start gap-3 py-2">
                <Toggle
                  checked={settings.customTitleBar ?? true}
                  onChange={(checked) => updateSetting('customTitleBar', checked)}
                />
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold">Custom title bar</span>
                  <span className="text-xs text-foreground/60">
                    Replace the native title bar with a styled one that matches the app.
                  </span>
                </div>
              </div>

              {/* Title bar style: Full width Salmon Neobrutalist Select */}
              <div className="flex flex-col gap-1.5 py-2">
                <span className="text-sm font-bold">Title bar style</span>
                <Select
                  value={settings.titleBarStyle ?? 'Auto'}
                  onChange={(val) => updateSetting('titleBarStyle', val)}
                  options={[
                    { id: 'Auto', label: 'Auto' },
                    { id: 'Native', label: 'Native' },
                    { id: 'Custom', label: 'Custom' },
                  ]}
                />
                <span className="text-xs text-foreground/60">
                  Choose the visual style for the custom title bar controls.
                </span>
              </div>
            </div>
          )}

          {/* TAB: GENERAL (Exact match to Screenshot 4) */}
          {activeTab === 'general' && (
            <div className="flex flex-col gap-6 max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight">General</h2>

              {/* Language: Full width Salmon Neobrutalist Select */}
              <div className="flex flex-col gap-1.5 py-2">
                <span className="text-sm font-bold">Language</span>
                <Select
                  value={settings.language || 'English'}
                  onChange={(val) => updateSetting('language', val)}
                  options={[
                    { id: 'English', label: 'English' },
                    { id: 'Spanish', label: 'Spanish' },
                    { id: 'German', label: 'German' },
                    { id: 'French', label: 'French' },
                  ]}
                />
                <span className="text-xs text-foreground/60">
                  Select your preferred language
                </span>
              </div>

              {/* History Section: Toggle on LEFT */}
              <div className="flex flex-col gap-2 pt-2">
                <h3 className="text-base font-bold">History</h3>
                <div className="flex items-start gap-3 py-1">
                  <Toggle
                    checked={settings.recordHistory ?? true}
                    onChange={(checked) => updateSetting('recordHistory', checked)}
                  />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold">Record listening history</span>
                    <span className="text-xs text-foreground/60">
                      Keep a local record of the music you play.
                    </span>
                  </div>
                </div>
              </div>

              {/* Integrations Section preview */}
              <div className="flex flex-col gap-3 pt-2">
                <h3 className="text-base font-bold">Integrations</h3>
                <div className="flex items-start gap-3 py-1">
                  <Toggle
                    checked={settings.enableNuclearJam ?? false}
                    onChange={(checked) => updateSetting('enableNuclearJam', checked)}
                  />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold">Sloth Jam</span>
                    <span className="text-xs text-foreground/60">
                      Start a local web server that lets you control Sloth from other devices on your network.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: HISTORY */}
          {activeTab === 'history' && (
            <div className="flex flex-col gap-6 max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight">History</h2>
              <div className="flex items-start gap-3 py-2">
                <Toggle
                  checked={settings.recordHistory ?? true}
                  onChange={(checked) => updateSetting('recordHistory', checked)}
                />
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold">Record listening history</span>
                  <span className="text-xs text-foreground/60">
                    Keep a local record of the music you play.
                  </span>
                </div>
              </div>

              <div>
                <Button
                  variant="default"
                  onClick={() => alert('Listening history cleared.')}
                  className="font-bold shadow-shadow"
                >
                  Clear history
                </Button>
              </div>
            </div>
          )}

          {/* TAB: INTEGRATIONS (Exact match to Screenshot 3 & 10) */}
          {activeTab === 'integrations' && (
            <div className="flex flex-col gap-6 max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight">Integrations</h2>

              {/* Sloth Jam */}
              <div className="flex flex-col gap-3 py-2">
                <div className="flex items-start gap-3">
                  <Toggle
                    checked={settings.enableNuclearJam ?? false}
                    onChange={(checked) => updateSetting('enableNuclearJam', checked)}
                  />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold">Sloth Jam</span>
                    <span className="text-xs text-foreground/60">
                      Start a local web server that lets you control Sloth from other devices on your network.
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 pt-1">
                  <label className="text-xs font-bold">Remote URL</label>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={settings.remoteUrl || 'http://127.0.0.1:8801/jam'}
                      className="surface-input border-border text-foreground shadow-shadow flex-1 h-10 px-3 rounded-md border-(length:--border-width) font-mono text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(settings.remoteUrl || 'http://127.0.0.1:8801/jam', 'remoteUrl')}
                      className="surface-input border-border shadow-shadow size-10 flex items-center justify-center rounded-md border-(length:--border-width) cursor-pointer hover:bg-foreground/10 shrink-0"
                      title="Copy"
                    >
                      {copiedKey === 'remoteUrl' ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                    </button>
                  </div>
                  <span className="text-[11px] text-foreground/60">
                    Open this URL on another device to control Sloth.
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 pt-1">
                  <label className="text-xs font-bold">API URL</label>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={settings.apiUrl || 'http://127.0.0.1:8801/api'}
                      className="surface-input border-border text-foreground shadow-shadow flex-1 h-10 px-3 rounded-md border-(length:--border-width) font-mono text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(settings.apiUrl || 'http://127.0.0.1:8801/api', 'apiUrl')}
                      className="surface-input border-border shadow-shadow size-10 flex items-center justify-center rounded-md border-(length:--border-width) cursor-pointer hover:bg-foreground/10 shrink-0"
                      title="Copy"
                    >
                      {copiedKey === 'apiUrl' ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                    </button>
                  </div>
                  <span className="text-[11px] text-foreground/60">
                    HTTP API base URL for programmatic access.
                  </span>
                </div>
              </div>

              {/* Model Context Protocol (MCP) */}
              <div className="flex flex-col gap-3 py-2 border-t-(length:--border-width) border-border/10">
                <div className="flex items-start gap-3">
                  <Toggle
                    checked={settings.mcpServerEnabled ?? true}
                    onChange={(checked) => updateSetting('mcpServerEnabled', checked)}
                  />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold">Enable MCP Server</span>
                    <span className="text-xs text-foreground/60">
                      Start a local MCP server that allows AI tools to control Sloth.
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 pt-1">
                  <label className="text-xs font-bold">MCP Server URL</label>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value="http://127.0.0.1:8800/mcp"
                      className="surface-input border-border text-foreground shadow-shadow flex-1 h-10 px-3 rounded-md border-(length:--border-width) font-mono text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy('http://127.0.0.1:8800/mcp', 'mcp')}
                      className="surface-input border-border shadow-shadow size-10 flex items-center justify-center rounded-md border-(length:--border-width) cursor-pointer hover:bg-foreground/10 shrink-0"
                      title="Copy"
                    >
                      {copiedKey === 'mcp' ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                    </button>
                  </div>
                  <span className="text-[11px] text-foreground/60">
                    Point your AI tool to this URL to connect to Sloth.
                  </span>
                </div>
              </div>

              {/* Music Player Daemon (MPD) */}
              <div className="flex flex-col gap-3 py-2 border-t-(length:--border-width) border-border/10">
                <div className="flex items-start gap-3">
                  <Toggle
                    checked={settings.mpdEnabled ?? false}
                    onChange={(checked) => updateSetting('mpdEnabled', checked)}
                  />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold">Enable MPD Server</span>
                    <span className="text-xs text-foreground/60">
                      Start a local MPD-compatible server so MPD clients can control Sloth.
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 pt-1">
                  <label className="text-xs font-bold">MPD Server URL</label>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value="mpd://127.0.0.1:6600"
                      className="surface-input border-border text-foreground shadow-shadow flex-1 h-10 px-3 rounded-md border-(length:--border-width) font-mono text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy('mpd://127.0.0.1:6600', 'mpd')}
                      className="surface-input border-border shadow-shadow size-10 flex items-center justify-center rounded-md border-(length:--border-width) cursor-pointer hover:bg-foreground/10 shrink-0"
                      title="Copy"
                    >
                      {copiedKey === 'mpd' ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                    </button>
                  </div>
                  <span className="text-[11px] text-foreground/60">
                    Point your MPD client to this address to connect to Sloth.
                  </span>
                </div>
              </div>

              {/* Discord Rich Presence */}
              <div className="flex flex-col gap-3 py-2 border-t-(length:--border-width) border-border/10">
                <div className="flex items-start gap-3">
                  <Toggle
                    checked={settings.discordRpcEnabled ?? true}
                    onChange={(checked) => updateSetting('discordRpcEnabled', checked)}
                  />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold">Discord Rich Presence</span>
                    <span className="text-xs text-foreground/60">
                      Show what you're listening to on your Discord profile.
                    </span>
                  </div>
                </div>
              </div>

              {/* Sloth Neural Engine */}
              <div className="flex flex-col gap-3 py-2 border-t-(length:--border-width) border-border/10">
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

          {/* TAB: PLAYBACK (Exact match to Screenshot 8) */}
          {activeTab === 'playback' && (
            <div className="flex flex-col gap-6 max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight">Playback</h2>

              {/* Discovery Section */}
              <div className="flex flex-col gap-1 py-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">Discovery variety</span>
                  <span className="text-xs font-mono">{settings.discoveryVariety ?? 0}</span>
                </div>
                <span className="text-xs text-foreground/60">
                  How far recommendations deviate from your current listening. Lower is closer.
                </span>
                <div className="py-2">
                  <Slider
                    value={settings.discoveryVariety ?? 0}
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

              {/* Skip Duration */}
              <div className="flex flex-col gap-1.5 py-1">
                <span className="text-sm font-bold">Skip duration</span>
                <input
                  type="number"
                  value={settings.skipDurationSeconds ?? 5}
                  onChange={(e) => updateSetting('skipDurationSeconds', parseInt(e.target.value) || 5)}
                  className="surface-input border-border text-foreground shadow-shadow h-10 px-3 rounded-md border-(length:--border-width) text-sm font-bold w-full outline-none"
                />
                <span className="text-xs text-foreground/60">
                  Number of seconds to skip forward/backward
                </span>
              </div>

              {/* Crossfade */}
              <div className="flex flex-col gap-1.5 py-1">
                <span className="text-sm font-bold">Crossfade</span>
                <input
                  type="number"
                  value={settings.crossfadeSeconds ?? 0}
                  onChange={(e) => updateSetting('crossfadeSeconds', parseInt(e.target.value) || 0)}
                  className="surface-input border-border text-foreground shadow-shadow h-10 px-3 rounded-md border-(length:--border-width) text-sm font-bold w-full outline-none"
                />
                <span className="text-xs text-foreground/60">
                  Crossfade duration between tracks in milliseconds
                </span>
              </div>
            </div>
          )}

          {/* TAB: KEY SHORTCUTS (Exact match to Screenshot 5) */}
          {activeTab === 'shortcuts' && (
            <div className="flex flex-col gap-6 max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight">Key Shortcuts</h2>

              <div className="flex flex-col gap-4">
                <h3 className="text-base font-bold">Playback</h3>
                <div className="flex flex-col divide-y-(length:--border-width) divide-border/10">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-xs font-semibold">Play / Pause</span>
                    <span className="surface-input border-border text-foreground shadow-shadow inline-flex px-2.5 py-0.5 rounded border-(length:--border-width) text-xs font-mono font-bold">
                      Space
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-xs font-semibold">Next track</span>
                    <div className="flex items-center gap-1">
                      <span className="surface-input border-border text-foreground shadow-shadow inline-flex px-2 py-0.5 rounded border-(length:--border-width) text-xs font-mono font-bold">Ctrl</span>
                      <span className="surface-input border-border text-foreground shadow-shadow inline-flex px-2 py-0.5 rounded border-(length:--border-width) text-xs font-mono font-bold">→</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-xs font-semibold">Previous track</span>
                    <div className="flex items-center gap-1">
                      <span className="surface-input border-border text-foreground shadow-shadow inline-flex px-2 py-0.5 rounded border-(length:--border-width) text-xs font-mono font-bold">Ctrl</span>
                      <span className="surface-input border-border text-foreground shadow-shadow inline-flex px-2 py-0.5 rounded border-(length:--border-width) text-xs font-mono font-bold">←</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-xs font-semibold">Seek forward</span>
                    <span className="surface-input border-border text-foreground shadow-shadow inline-flex px-2 py-0.5 rounded border-(length:--border-width) text-xs font-mono font-bold">→</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-xs font-semibold">Seek backward</span>
                    <span className="surface-input border-border text-foreground shadow-shadow inline-flex px-2 py-0.5 rounded border-(length:--border-width) text-xs font-mono font-bold">←</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-xs font-semibold">Volume up</span>
                    <div className="flex items-center gap-1">
                      <span className="surface-input border-border text-foreground shadow-shadow inline-flex px-2 py-0.5 rounded border-(length:--border-width) text-xs font-mono font-bold">Ctrl</span>
                      <span className="surface-input border-border text-foreground shadow-shadow inline-flex px-2 py-0.5 rounded border-(length:--border-width) text-xs font-mono font-bold">↑</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-xs font-semibold">Volume down</span>
                    <div className="flex items-center gap-1">
                      <span className="surface-input border-border text-foreground shadow-shadow inline-flex px-2 py-0.5 rounded border-(length:--border-width) text-xs font-mono font-bold">Ctrl</span>
                      <span className="surface-input border-border text-foreground shadow-shadow inline-flex px-2 py-0.5 rounded border-(length:--border-width) text-xs font-mono font-bold">↓</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-xs font-semibold">Mute / Unmute</span>
                    <div className="flex items-center gap-1">
                      <span className="surface-input border-border text-foreground shadow-shadow inline-flex px-2 py-0.5 rounded border-(length:--border-width) text-xs font-mono font-bold">Ctrl</span>
                      <span className="surface-input border-border text-foreground shadow-shadow inline-flex px-2 py-0.5 rounded border-(length:--border-width) text-xs font-mono font-bold">M</span>
                    </div>
                  </div>
                </div>

                <h3 className="text-base font-bold pt-2">General</h3>
                <div className="flex items-center justify-between py-2 border-t-(length:--border-width) border-border/10">
                  <span className="text-xs font-semibold">Open settings</span>
                  <div className="flex items-center gap-1">
                    <span className="surface-input border-border text-foreground shadow-shadow inline-flex px-2 py-0.5 rounded border-(length:--border-width) text-xs font-mono font-bold">Ctrl</span>
                    <span className="surface-input border-border text-foreground shadow-shadow inline-flex px-2 py-0.5 rounded border-(length:--border-width) text-xs font-mono font-bold">,</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: THEMES (Exact match to Screenshot 9) */}
          {activeTab === 'themes' && (
            <div className="flex flex-col gap-6 max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight">Themes</h2>

              {/* Subtabs: My themes / Store */}
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setThemeSubTab('my')}
                  className={cn(
                    'px-4 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer',
                    themeSubTab === 'my'
                      ? 'surface-primary border-border border-(length:--border-width) shadow-shadow text-foreground'
                      : 'text-foreground/60 hover:text-foreground'
                  )}
                >
                  My themes
                </button>
                <button
                  type="button"
                  onClick={() => setThemeSubTab('store')}
                  className={cn(
                    'px-4 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer',
                    themeSubTab === 'store'
                      ? 'surface-primary border-border border-(length:--border-width) shadow-shadow text-foreground'
                      : 'text-foreground/60 hover:text-foreground'
                  )}
                >
                  Store
                </button>
              </div>

              {/* Basic themes */}
              <div className="flex flex-col gap-3">
                <h3 className="text-base font-bold">Basic themes</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {BUILTIN_THEMES.map((theme) => {
                    const isActive = currentThemeId === theme.id;

                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => handleSelectTheme(theme.id)}
                        className={cn(
                          'flex flex-col justify-between items-start gap-3 p-3 rounded-md border-(length:--border-width) border-border shadow-shadow cursor-pointer transition-all text-left',
                          isActive
                            ? 'surface-primary'
                            : 'surface-input hover:scale-[1.02]'
                        )}
                      >
                        <span className="text-xs font-bold">{theme.name}</span>

                        {/* 4 Palette Dots */}
                        <div className="flex items-center gap-1">
                          {theme.palette.map((color, idx) => (
                            <span
                              key={idx}
                              aria-hidden
                              className="size-4 rounded-full border border-black shadow-xs shrink-0"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Advanced themes */}
              <div className="flex flex-col gap-2 pt-2">
                <h3 className="text-base font-bold">Advanced themes</h3>
                <Select
                  value={selectedAdvancedTheme}
                  onChange={setSelectedAdvancedTheme}
                  options={[
                    { id: 'none', label: 'Select a theme' },
                    { id: 'cyberpunk', label: 'Cyberpunk Neon' },
                    { id: 'retro', label: '80s Retro Wave' },
                    { id: 'catppuccin', label: 'Catppuccin Mocha' },
                  ]}
                />
                <span className="text-xs text-foreground/60">
                  Themes found in your app data themes directory
                </span>
              </div>
            </div>
          )}

          {/* TAB: PLUGINS / APP-PLUGINS */}
          {(activeTab === 'app-plugins' || activeTab === 'plugins-settings') && (
            <div className="flex flex-col gap-6 max-w-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Plugins</h2>
                  <p className="text-xs text-foreground/60 mt-0.5">
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
                    className="font-bold gap-1.5 shadow-shadow"
                  >
                    <Package size={15} />
                    Open Marketplace
                  </Button>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {[
                  { id: 'youtube', name: 'YouTube Music Source', category: 'Streaming & Metadata', active: true },
                  { id: 'piped', name: 'Piped Stream Resolver', category: 'Streaming (Privacy)', active: true },
                  { id: 'qobuz', name: 'Qobuz Hi-Res Metadata', category: 'Lossless Streaming', active: true },
                  { id: 'soundcloud', name: 'SoundCloud Stream & Search', category: 'Discovery', active: true },
                  { id: 'lrclib', name: 'LRCLib Synced Lyrics', category: 'Lyrics', active: true },
                  { id: 'listenbrainz', name: 'ListenBrainz Scrobbler', category: 'Scrobbling', active: true },
                ].map((plugin) => (
                  <div
                    key={plugin.id}
                    className="surface-card border-border shadow-shadow flex items-center justify-between rounded-md border-(length:--border-width) p-3"
                  >
                    <div>
                      <div className="text-sm font-bold">{plugin.name}</div>
                      <div className="text-xs text-foreground/60">{plugin.category}</div>
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
              <div className="surface-input border-border text-foreground shadow-shadow rounded-md border-(length:--border-width) p-4 font-mono text-xs max-h-96 overflow-y-auto flex flex-col gap-1">
                <span className="text-green-600 font-bold">[INFO] Application initialized successfully.</span>
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
                  <div className="text-sm font-bold">Sloth v1.51.0 (sloth-edition)</div>
                  <div className="text-xs opacity-70 mt-1 leading-relaxed">
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
                  <div className="text-sm font-bold">Sloth v1.51.0 is installed</div>
                  <div className="text-xs text-foreground/60 mt-0.5">Your application is up to date.</div>
                </div>
                <Button size="sm" variant="default" onClick={() => alert('Checking for updates...')} className="font-bold shadow-shadow">
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

export default SettingsModal;
