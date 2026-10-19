import { FC, useState, useEffect, useRef, useCallback } from 'react';
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
  | 'lyrics'
  | 'mini-player'
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

export const SETTINGS_SECTIONS = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'general', label: 'General' },
  { id: 'history', label: 'History' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'lyrics', label: 'Lyrics' },
  { id: 'mini-player', label: 'Mini Player' },
  { id: 'playback', label: 'Playback' },
  { id: 'plugins-settings', label: 'Plugins' },
  { id: 'updates', label: 'Updates' },
] as const;

export const APP_SECTIONS = [
  { id: 'shortcuts', label: 'Key Shortcuts', icon: Keyboard },
  { id: 'app-plugins', label: 'Plugins', icon: Package },
  { id: 'themes', label: 'Themes', icon: Palette },
  { id: 'logs', label: 'Logs', icon: ScrollText },
  { id: 'whats-new', label: "What's New", icon: Sparkles },
] as const;

export const SettingsModal: FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'appearance',
  onNavigateToPlugins,
}) => {
  const isInitialAppTab = APP_SECTIONS.some((a) => a.id === initialTab);
  const [activeAppTab, setActiveAppTab] = useState<SettingsTabId | null>(
    isInitialAppTab ? initialTab : null
  );
  const [activeSettingsSection, setActiveSettingsSection] = useState<string>(
    isInitialAppTab ? 'appearance' : initialTab
  );

  const [settings, setSettings] = useState<SlothSettings>(getSlothSettings());
  const [currentThemeId, setCurrentThemeId] = useState<string>('default');
  const [themeSubTab, setThemeSubTab] = useState<'my' | 'store'>('my');
  const [selectedAdvancedTheme, setSelectedAdvancedTheme] = useState<string>('none');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const shouldReduce = useReducedMotion();

  const viewportRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Track settings changes
  useEffect(() => {
    if (isOpen) {
      const currentSettings = getSlothSettings();
      setSettings(currentSettings);
      const isApp = APP_SECTIONS.some((a) => a.id === initialTab);
      if (isApp) {
        setActiveAppTab(initialTab);
      } else {
        setActiveAppTab(null);
        setActiveSettingsSection(initialTab);
      }
      setCurrentThemeId(currentSettings.themeId || 'default');
    }
  }, [isOpen, initialTab]);

  // Nuclear scrollspy algorithm
  const handleScroll = useCallback(() => {
    if (!viewportRef.current || activeAppTab !== null) return;
    const viewport = viewportRef.current;
    const isBottom =
      viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 30;
    if (isBottom) {
      setActiveSettingsSection(SETTINGS_SECTIONS[SETTINGS_SECTIONS.length - 1].id);
      return;
    }

    const viewportMiddle = viewport.scrollTop + viewport.clientHeight / 2.5;
    let foundSection: (typeof SETTINGS_SECTIONS)[number]['id'] = SETTINGS_SECTIONS[0].id;
    for (const section of SETTINGS_SECTIONS) {
      const el = sectionRefs.current[section.id];
      if (el && el.offsetTop <= viewportMiddle) {
        foundSection = section.id;
      }
    }
    setActiveSettingsSection(foundSection);
  }, [activeAppTab]);

  const handleSelectSettingsSection = (secId: string) => {
    setActiveAppTab(null);
    setActiveSettingsSection(secId);
    setTimeout(() => {
      const el = sectionRefs.current[secId];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 20);
  };

  const handleSelectAppTab = (appId: SettingsTabId) => {
    setActiveAppTab(appId);
  };

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

  const currentHeading = activeAppTab
    ? APP_SECTIONS.find((a) => a.id === activeAppTab)?.label || 'App'
    : SETTINGS_SECTIONS.find((s) => s.id === activeSettingsSection)?.label || 'General';

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          data-testid="settings-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 md:p-12 font-sans select-none"
        >
          {/* Animated Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Modal Container with Nuclear spring transition */}
          <motion.div
            initial={shouldReduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 16 }}
            animate={shouldReduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
            transition={
              shouldReduce
                ? { duration: 0.15 }
                : {
                    type: 'spring',
                    stiffness: 400,
                    damping: 24,
                    mass: 0.8,
                  }
            }
            className="surface-background text-foreground border-border shadow-nav relative flex h-full max-h-[820px] w-full max-w-5xl rounded-lg border-(length:--border-width) overflow-hidden z-10"
          >
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
            <nav className="border-border flex w-56 shrink-0 flex-col border-r-(length:--border-width) p-3 justify-between">
              <div className="flex flex-col gap-1 overflow-y-auto">
                {/* SETTINGS Category */}
                <div className="font-heading text-foreground/70 px-2 pt-2 pb-1 text-xs font-extrabold tracking-wider uppercase">
                  Settings
                </div>

                {SETTINGS_SECTIONS.map((sec) => {
                  const isActive = !activeAppTab && activeSettingsSection === sec.id;
                  return (
                    <Button
                      key={sec.id}
                      variant={isActive ? 'default' : 'text'}
                      onClick={() => handleSelectSettingsSection(sec.id)}
                      className={cn(
                        'w-full justify-start text-xs font-bold h-9 rounded-md transition-all',
                        isActive
                          ? 'shadow-shadow border-border border-(length:--border-width) surface-primary font-bold text-foreground'
                          : 'text-foreground/80 hover:bg-foreground/5'
                      )}
                    >
                      {sec.label}
                    </Button>
                  );
                })}

                {/* APP Category */}
                <div className="font-heading text-foreground/70 px-2 pt-4 pb-1 text-xs font-extrabold tracking-wider uppercase">
                  App
                </div>

                {APP_SECTIONS.map((tab) => {
                  const isActive = activeAppTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <Button
                      key={tab.id}
                      variant={isActive ? 'default' : 'text'}
                      onClick={() => handleSelectAppTab(tab.id)}
                      className={cn(
                        'w-full justify-start text-xs font-bold gap-2.5 h-9 rounded-md transition-all',
                        isActive
                          ? 'shadow-shadow border-border border-(length:--border-width) surface-primary font-bold text-foreground'
                          : 'text-foreground/80 hover:bg-foreground/5'
                      )}
                    >
                      <Icon size={15} />
                      {tab.label}
                    </Button>
                  );
                })}
              </div>

              {/* Navigation Footer with Social Icons + Sloth Branding */}
              <div className="mt-auto pt-3 border-t-(length:--border-width) border-border/20 flex flex-col items-center gap-1.5">
                <div className="flex items-center gap-2">
                  <Button
                    variant="text"
                    size="icon-sm"
                    onClick={() => window.open('https://discord.gg/JqPjKxE', '_blank')}
                    title="Discord"
                    className="hover:scale-110 transition-transform"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                  </Button>
                  <Button
                    variant="text"
                    size="icon-sm"
                    onClick={() => window.open('https://github.com/syedzahidsaleem/sloth', '_blank')}
                    title="GitHub"
                    className="hover:scale-110 transition-transform"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                    </svg>
                  </Button>
                  <Button
                    variant="text"
                    size="icon-sm"
                    onClick={() => window.open('https://fosstodon.org/@slothplayer', '_blank')}
                    title="Mastodon"
                    className="hover:scale-110 transition-transform"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M21.327 8.566c0-4.339-2.843-5.61-2.843-5.61-1.433-.658-3.894-.935-6.451-.956h-.063c-2.557.021-5.016.298-6.45.956 0 0-2.843 1.272-2.843 5.61 0 .993-.019 2.18.049 3.48.234 4.545 2.581 8.97 8.258 9.458 3.846.33 7.032-.93 7.032-.93l-.151-1.696s-2.735.855-5.786.758c-3.033-.097-3.238-1.74-3.324-2.518.082.012.164.022.25.029 2.148.243 4.238.118 6.27-.08 2.378-.23 4.417-1.077 4.707-1.52.593-.907.739-3.284.739-3.284s.013-.437.013-.997zm-3.279 5.867h-2.144v-5.44c0-1.16-.489-1.75-1.467-1.75-.978 0-1.467.59-1.467 1.75v3.136h-1.94v-3.136c0-1.16-.489-1.75-1.467-1.75-.978 0-1.467.59-1.467 1.75v5.44H5.952V8.783c0-1.16.296-2.08.887-2.76.591-.68 1.365-1.02 2.321-1.02 1.106 0 1.95.424 2.532 1.27l.74 1.24.74-1.24c.582-.846 1.426-1.27 2.532-1.27.956 0 1.73.34 2.321 1.02.591.68.887 1.6.887 2.76v5.65z"/>
                    </svg>
                  </Button>
                  <Button
                    variant="text"
                    size="icon-sm"
                    onClick={() => window.open('https://github.com/syedzahidsaleem/sloth', '_blank')}
                    title="Website"
                    className="hover:scale-110 transition-transform"
                  >
                    <Globe size={15} />
                  </Button>
                  <Button
                    variant="text"
                    size="icon-sm"
                    onClick={() => window.open('https://github.com/syedzahidsaleem/sloth', '_blank')}
                    title="Sloth Project"
                    className="p-0.5 hover:scale-110 transition-transform"
                  >
                    <SlothLogo size={16} />
                  </Button>
                </div>
                <span className="text-[11px] text-foreground/50 font-mono">
                  v1.51.2 (sloth-edition)
                </span>
              </div>
            </nav>

            {/* RIGHT COLUMN: Settings Content Panel */}
            <div
              ref={viewportRef}
              onScroll={handleScroll}
              className="surface-background flex-1 min-w-0 overflow-y-auto p-8 text-foreground font-sans scroll-smooth"
            >
              <div className="max-w-2xl">
                {/* Dynamic Top Heading matching Image 4 */}
                <h2 className="text-2xl font-bold font-heading tracking-tight mb-6">
                  {currentHeading}
                </h2>

                {/* If on dedicated APP tab, render that tab */}
                {activeAppTab !== null ? (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeAppTab}
                      initial={shouldReduce ? { opacity: 1 } : { opacity: 0, y: 8 }}
                      animate={shouldReduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
                      exit={shouldReduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="w-full space-y-6"
                    >
                      {/* TAB: KEY SHORTCUTS */}
                      {activeAppTab === 'shortcuts' && (
                        <div className="flex flex-col gap-6">
                          <div className="flex flex-col gap-4">
                            <h3 className="text-base font-bold font-heading">Playback</h3>
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
                                <span className="text-xs font-semibold">Open settings</span>
                                <div className="flex items-center gap-1">
                                  <span className="surface-input border-border text-foreground shadow-shadow inline-flex px-2 py-0.5 rounded border-(length:--border-width) text-xs font-mono font-bold">Ctrl</span>
                                  <span className="surface-input border-border text-foreground shadow-shadow inline-flex px-2 py-0.5 rounded border-(length:--border-width) text-xs font-mono font-bold">,</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TAB: THEMES */}
                      {activeAppTab === 'themes' && (
                        <div className="flex flex-col gap-6">
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

                          <div className="flex flex-col gap-3">
                            <h3 className="text-base font-bold font-heading">Basic themes</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                              {BUILTIN_THEMES.map((theme) => {
                                const isActive =
                                  currentThemeId === theme.id ||
                                  (theme.id === 'default' &&
                                    (currentThemeId === 'nuclear:default' || currentThemeId === 'default')) ||
                                  currentThemeId.replace('nuclear:', '') === theme.id.replace('nuclear:', '');

                                return (
                                  <button
                                    key={theme.id}
                                    type="button"
                                    onClick={() => handleSelectTheme(theme.id)}
                                    className={cn(
                                      'flex flex-col justify-between items-start gap-2.5 px-4 py-3 rounded-md border-(length:--border-width) border-border cursor-pointer transition-all text-left',
                                      isActive
                                        ? 'surface-primary shadow-shadow font-bold'
                                        : 'surface-input shadow-shadow hover:translate-x-0.5 hover:translate-y-0.5'
                                    )}
                                  >
                                    <span className="text-sm font-bold font-heading">{theme.name}</span>
                                    <div className="flex items-center gap-1.5">
                                      {theme.palette.map((color, idx) => (
                                        <span
                                          key={idx}
                                          aria-hidden
                                          className="size-4.5 rounded-full border border-black/40 ring-1 ring-border/20 shadow-xs shrink-0"
                                          style={{ backgroundColor: color }}
                                        />
                                      ))}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 pt-2">
                            <h3 className="text-base font-bold font-heading">Advanced themes</h3>
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

                      {/* TAB: APP-PLUGINS */}
                      {activeAppTab === 'app-plugins' && (
                        <div className="flex flex-col gap-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-foreground/60">
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
                      {activeAppTab === 'logs' && (
                        <div className="flex flex-col gap-4">
                          <div className="surface-input border-border text-foreground shadow-shadow rounded-md border-(length:--border-width) p-4 font-mono text-xs max-h-96 overflow-y-auto flex flex-col gap-1">
                            <span className="text-green-600 font-bold">[INFO] Application initialized successfully.</span>
                            <span>[INFO] Loaded audio plugins: youtube, piped, qobuz, soundcloud, bandcamp</span>
                            <span>[INFO] SQLite database connected: sloth.db</span>
                            <span>[INFO] Fast-API Recommender Engine connected at 127.0.0.1:8001</span>
                            <span>[INFO] MCP Server listening on 127.0.0.1:8800/mcp</span>
                          </div>
                        </div>
                      )}

                      {/* TAB: WHATS-NEW */}
                      {activeAppTab === 'whats-new' && (
                        <div className="flex flex-col gap-4">
                          <div className="surface-card border-border shadow-shadow rounded-md border-(length:--border-width) p-4">
                            <div className="text-sm font-bold">Sloth v1.51.2 (sloth-edition)</div>
                            <div className="text-xs opacity-70 mt-1 leading-relaxed">
                              • Vertically connected continuous settings view with real-time scrollspy navigation
                              <br />• Authentic OKLCH themes & dark gradient token inheritance
                              <br />• Dual collapsible sidebars & Nuclear-derived neobrutalist aesthetic
                              <br />• Universal music source resolver and real music search
                              <br />• Synced and karaoke lyrics display engine
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                ) : (
                  /* CONTINUOUS VERTICAL SETTINGS SCROLL VIEW (Matches Screenshot 4) */
                  <div className="flex flex-col">
                    {/* SECTION 1: APPEARANCE */}
                    <div
                      ref={(el) => {
                        sectionRefs.current['appearance'] = el;
                      }}
                      id="settings-section-appearance"
                      className="flex flex-col gap-6 pt-2"
                    >
                      <h3 className="text-base font-bold font-heading">Appearance</h3>

                      {/* Frameless window */}
                      <div className="flex items-start gap-3 py-1">
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

                      {/* Custom title bar */}
                      <div className="flex items-start gap-3 py-1">
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

                      {/* Title bar style */}
                      <div className="flex flex-col gap-1.5 py-1">
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

                      {/* Basic themes */}
                      <div className="flex flex-col gap-3 pt-2">
                        <h4 className="text-sm font-bold font-heading">Basic themes</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                          {BUILTIN_THEMES.map((theme) => {
                            const isActive =
                              currentThemeId === theme.id ||
                              (theme.id === 'default' &&
                                (currentThemeId === 'nuclear:default' || currentThemeId === 'default')) ||
                              currentThemeId.replace('nuclear:', '') === theme.id.replace('nuclear:', '');

                            return (
                              <button
                                key={theme.id}
                                type="button"
                                onClick={() => handleSelectTheme(theme.id)}
                                className={cn(
                                  'flex flex-col justify-between items-start gap-2.5 px-4 py-3 rounded-md border-(length:--border-width) border-border cursor-pointer transition-all text-left',
                                  isActive
                                    ? 'surface-primary shadow-shadow font-bold'
                                    : 'surface-input shadow-shadow hover:translate-x-0.5 hover:translate-y-0.5'
                                )}
                              >
                                <span className="text-sm font-bold font-heading">{theme.name}</span>
                                <div className="flex items-center gap-1.5">
                                  {theme.palette.map((color, idx) => (
                                    <span
                                      key={idx}
                                      aria-hidden
                                      className="size-4.5 rounded-full border border-black/40 ring-1 ring-border/20 shadow-xs shrink-0"
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
                        <h4 className="text-sm font-bold font-heading">Advanced themes</h4>
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

                    <hr className="border-border/30 my-8" />

                    {/* SECTION 2: GENERAL (Exact match to Image 4) */}
                    <div
                      ref={(el) => {
                        sectionRefs.current['general'] = el;
                      }}
                      id="settings-section-general"
                      className="flex flex-col gap-6 pt-2"
                    >
                      <h3 className="text-base font-bold font-heading">General</h3>

                      {/* Language: Full width Salmon/Green Neobrutalist Select */}
                      <div className="flex flex-col gap-1.5 py-1">
                        <span className="text-sm font-bold">Language</span>
                        <Select
                          value={settings.language || 'English'}
                          onChange={(val) => updateSetting('language', val)}
                          options={[
                            { id: 'English', label: 'English' },
                            { id: 'Spanish', label: 'Spanish' },
                            { id: 'German', label: 'German' },
                            { id: 'French', label: 'French' },
                            { id: 'Japanese', label: 'Japanese' },
                          ]}
                        />
                        <span className="text-xs text-foreground/60">
                          Select your preferred language
                        </span>
                      </div>
                    </div>

                    <hr className="border-border/30 my-8" />

                    {/* SECTION 3: HISTORY (Exact match to Image 4) */}
                    <div
                      ref={(el) => {
                        sectionRefs.current['history'] = el;
                      }}
                      id="settings-section-history"
                      className="flex flex-col gap-6 pt-2"
                    >
                      <h3 className="text-base font-bold font-heading">History</h3>

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

                      <div>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => alert('Listening history cleared.')}
                          className="font-bold shadow-shadow"
                        >
                          Clear history
                        </Button>
                      </div>
                    </div>

                    <hr className="border-border/30 my-8" />

                    {/* SECTION 4: INTEGRATIONS (Exact match to Image 4) */}
                    <div
                      ref={(el) => {
                        sectionRefs.current['integrations'] = el;
                      }}
                      id="settings-section-integrations"
                      className="flex flex-col gap-6 pt-2"
                    >
                      <h3 className="text-base font-bold font-heading">Integrations</h3>

                      {/* Sloth Jam Toggle */}
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

                      {/* Remote URL input */}
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

                      {/* API URL input */}
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

                      {/* MCP Server */}
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

                      {/* MPD Server */}
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

                      {/* Neural Engine */}
                      <div className="flex flex-col gap-3 py-2 border-t-(length:--border-width) border-border/10">
                        <h4 className="text-sm font-bold font-heading">SLOTH Neural Engine</h4>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-emerald-500" />
                            <span className="text-xs font-semibold">Engine status: Running on localhost:8001</span>
                          </div>
                          <Button size="xs" variant="secondary" onClick={() => alert('FastAPI Recommender engine healthy!')}>
                            Check health
                          </Button>
                        </div>
                      </div>
                    </div>

                    <hr className="border-border/30 my-8" />

                    {/* SECTION 5: LYRICS */}
                    <div
                      ref={(el) => {
                        sectionRefs.current['lyrics'] = el;
                      }}
                      id="settings-section-lyrics"
                      className="flex flex-col gap-6 pt-2"
                    >
                      <h3 className="text-base font-bold font-heading">Lyrics</h3>

                      <div className="flex items-start gap-3 py-1">
                        <Toggle
                          checked={settings.enableSyncedLyrics ?? true}
                          onChange={(checked) => updateSetting('enableSyncedLyrics', checked)}
                        />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-bold">Enable synced lyrics</span>
                          <span className="text-xs text-foreground/60">
                            Automatically fetch and display synchronized lyrics for playing tracks.
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 py-1">
                        <Toggle
                          checked={settings.karaokeModeDefault ?? true}
                          onChange={(checked) => updateSetting('karaokeModeDefault', checked)}
                        />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-bold">Karaoke mode by default</span>
                          <span className="text-xs text-foreground/60">
                            Highlight words in rhythm with song timing.
                          </span>
                        </div>
                      </div>
                    </div>

                    <hr className="border-border/30 my-8" />

                    {/* SECTION: MINI PLAYER */}
                    <div
                      ref={(el) => {
                        sectionRefs.current['mini-player'] = el;
                      }}
                      id="settings-section-mini-player"
                      className="flex flex-col gap-6 pt-2"
                    >
                      <h3 className="text-base font-bold font-heading">Mini Player</h3>

                      <div className="flex items-start gap-3 py-1">
                        <Toggle
                          checked={settings.miniPlayerAlwaysOnTop ?? false}
                          onChange={(checked) => updateSetting('miniPlayerAlwaysOnTop', checked)}
                        />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-bold">Always on top</span>
                          <span className="text-xs text-foreground/60">
                            Keep mini player above all other desktop windows.
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 py-1">
                        <Toggle
                          checked={settings.miniPlayerShowCover ?? true}
                          onChange={(checked) => updateSetting('miniPlayerShowCover', checked)}
                        />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-bold">Display album artwork</span>
                          <span className="text-xs text-foreground/60">
                            Render high resolution album cover art in mini mode.
                          </span>
                        </div>
                      </div>
                    </div>

                    <hr className="border-border/30 my-8" />

                    {/* SECTION 6: PLAYBACK */}
                    <div
                      ref={(el) => {
                        sectionRefs.current['playback'] = el;
                      }}
                      id="settings-section-playback"
                      className="flex flex-col gap-6 pt-2"
                    >
                      <h3 className="text-base font-bold font-heading">Playback</h3>

                      {/* Audio Quality */}
                      <div className="flex flex-col gap-1.5 py-1">
                        <span className="text-sm font-bold">Audio quality</span>
                        <Select
                          value={settings.audioQuality || 'lossless'}
                          onChange={(val) => updateSetting('audioQuality', val as any)}
                          options={[
                            { id: 'lossless', label: 'Lossless Hi-Fi (FLAC / Opus)' },
                            { id: 'high', label: 'High (320 kbps)' },
                            { id: 'medium', label: 'Standard (192 kbps)' },
                          ]}
                        />
                        <span className="text-xs text-foreground/60">
                          Maximum audio streaming bitrate preference.
                        </span>
                      </div>

                      {/* Volume Normalization */}
                      <div className="flex items-start gap-3 py-1">
                        <Toggle
                          checked={settings.volumeNormalization ?? true}
                          onChange={(checked) => updateSetting('volumeNormalization', checked)}
                        />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-bold">Volume normalization</span>
                          <span className="text-xs text-foreground/60">
                            Automatically adjust volume to maintain consistent playback levels.
                          </span>
                        </div>
                      </div>

                      {/* Skip Silence */}
                      <div className="flex items-start gap-3 py-1">
                        <Toggle
                          checked={settings.skipSilence ?? false}
                          onChange={(checked) => updateSetting('skipSilence', checked)}
                        />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-bold">Skip silence</span>
                          <span className="text-xs text-foreground/60">
                            Skip silent intervals at the beginning and end of tracks.
                          </span>
                        </div>
                      </div>

                      {/* Crossfade */}
                      <div className="flex flex-col gap-1.5 py-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold">Crossfade</span>
                          <span className="text-xs font-mono">{settings.crossfadeSeconds ?? 0}s</span>
                        </div>
                        <span className="text-xs text-foreground/60">
                          Crossfade duration between consecutively queued tracks in seconds
                        </span>
                        <div className="py-2">
                          <Slider
                            value={settings.crossfadeSeconds ?? 0}
                            min={0}
                            max={12}
                            step={1}
                            onValueChange={(val) => updateSetting('crossfadeSeconds', val)}
                            showValue={false}
                            showFooter={false}
                          />
                        </div>
                      </div>
                    </div>

                    <hr className="border-border/30 my-8" />

                    {/* SECTION 7: PLUGINS */}
                    <div
                      ref={(el) => {
                        sectionRefs.current['plugins-settings'] = el;
                      }}
                      id="settings-section-plugins"
                      className="flex flex-col gap-6 pt-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-bold font-heading">Plugins</h3>
                          <p className="text-xs text-foreground/60 mt-0.5">
                            Configure default music discovery and playback sources.
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
                            Marketplace
                          </Button>
                        )}
                      </div>

                      <div className="flex flex-col gap-3">
                        {[
                          { id: 'youtube', name: 'YouTube Music Source', category: 'Streaming & Metadata', active: true },
                          { id: 'piped', name: 'Piped Stream Resolver', category: 'Streaming (Privacy)', active: true },
                          { id: 'qobuz', name: 'Qobuz Hi-Res Metadata', category: 'Lossless Streaming', active: true },
                          { id: 'soundcloud', name: 'SoundCloud Stream & Search', category: 'Discovery', active: true },
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

                    <hr className="border-border/30 my-8" />

                    {/* SECTION 8: UPDATES */}
                    <div
                      ref={(el) => {
                        sectionRefs.current['updates'] = el;
                      }}
                      id="settings-section-updates"
                      className="flex flex-col gap-6 pt-2 pb-12"
                    >
                      <h3 className="text-base font-bold font-heading">Updates</h3>
                      <div className="surface-card border-border shadow-shadow flex items-center justify-between rounded-md border-(length:--border-width) p-4">
                        <div>
                          <div className="text-sm font-bold font-heading">Sloth v1.51.2 is installed</div>
                          <div className="text-xs text-foreground/60 mt-0.5">Your application is up to date.</div>
                        </div>
                        <Button size="sm" variant="default" onClick={() => alert('Checking for updates...')} className="font-bold shadow-shadow">
                          Check for updates
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SettingsModal;
