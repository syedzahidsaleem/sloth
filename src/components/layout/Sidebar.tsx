import { FC, ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Home,
  Search,
  Library,
  ListMusic,
  Settings,
  Radio,
  Sliders,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AccentPalette, ACCENTS, setAccentPalette, getCurrentAccent } from '@/styles/tokens';

export type NavItemKey = 'home' | 'search' | 'library' | 'playlists' | 'settings';

export interface SidebarProps {
  activeTab: NavItemKey;
  onTabChange: (tab: NavItemKey) => void;
  currentAccent?: AccentPalette;
  onAccentChange?: (accent: AccentPalette) => void;
  connectedSources?: {
    name: string;
    status: 'online' | 'standby' | 'offline';
  }[];
  className?: string;
  footerAddon?: ReactNode;
}

const NAV_ITEMS: { key: NavItemKey; label: string; icon: typeof Home }[] = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'search', label: 'Search', icon: Search },
  { key: 'library', label: 'Library', icon: Library },
  { key: 'playlists', label: 'Playlists', icon: ListMusic },
  { key: 'settings', label: 'Settings', icon: Settings },
];

export const Sidebar: FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  currentAccent,
  onAccentChange,
  connectedSources = [
    { name: 'YouTube Music', status: 'online' },
    { name: 'Piped Engine', status: 'online' },
    { name: 'FastAPI Recommender', status: 'online' },
  ],
  className,
  footerAddon,
}) => {
  const prefersReduced = useReducedMotion();
  const selectedAccent = currentAccent ?? (typeof document !== 'undefined' ? getCurrentAccent() : 'green');

  const handleAccentSelect = (accent: AccentPalette) => {
    setAccentPalette(accent);
    if (onAccentChange) {
      onAccentChange(accent);
    }
  };

  return (
    <aside
      className={cn(
        'w-[220px] min-w-[220px] max-w-[220px] shrink-0 h-full flex flex-col justify-between',
        'bg-[var(--surface)] text-[var(--text-primary)] border-r border-[var(--border)]',
        'select-none p-3 overflow-hidden font-sans',
        className,
      )}
      style={{ width: '220px' }}
      aria-label="Sidebar Navigation"
    >
      {/* Brand & Top Area */}
      <div className="flex flex-col gap-4">
        {/* App Title / Logo */}
        <div className="flex items-center gap-2.5 px-2 py-1.5 border-b border-[var(--border)] pb-3">
          <div className="size-8 rounded-[4px] bg-[var(--color-accent)] text-[var(--color-accent-foreground)] flex items-center justify-center font-bold text-base shadow-sm">
            🦥
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-sm tracking-tight leading-none text-[var(--text-primary)]">
              SLOTH
            </span>
            <span className="text-[10px] font-mono tracking-wider text-[var(--text-muted)] uppercase mt-0.5">
              v0.1.0 • Desktop
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onTabChange(item.key)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'group relative flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-[4px]',
                  'transition-colors duration-150 outline-none text-left w-full cursor-pointer',
                  'focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface)]',
                  isActive
                    ? 'bg-[var(--surface-raised)] text-[var(--color-accent)] border border-[var(--border)] font-bold shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]/60 border border-transparent',
                )}
              >
                {/* Active Indicator Bar on left edge */}
                {isActive && (
                  <motion.span
                    layoutId={prefersReduced ? undefined : 'active-sidebar-pill'}
                    className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-[2px] bg-[var(--color-accent)]"
                    transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                  />
                )}
                <Icon
                  size={16}
                  className={cn(
                    'shrink-0 transition-transform duration-150',
                    isActive ? 'text-[var(--color-accent)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]',
                  )}
                  aria-hidden="true"
                />
                <span className="truncate flex-1 tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Area: Accent Palettes & Source Status */}
      <div className="flex flex-col gap-3 pt-3 border-t border-[var(--border)]">
        {/* Accent Palette Selector */}
        <div className="flex flex-col gap-1.5 px-2">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <Sliders size={10} aria-hidden="true" /> Accent
            </span>
            <span className="font-semibold text-[var(--color-accent)] capitalize">
              {selectedAccent}
            </span>
          </div>
          <div className="flex items-center gap-1.5" role="group" aria-label="Theme accent color options">
            {(Object.keys(ACCENTS) as AccentPalette[]).map((paletteKey) => {
              const def = ACCENTS[paletteKey];
              const isSelected = selectedAccent === paletteKey;

              return (
                <button
                  key={paletteKey}
                  type="button"
                  onClick={() => handleAccentSelect(paletteKey)}
                  title={def.label}
                  aria-label={`Select ${def.label} theme`}
                  aria-pressed={isSelected}
                  className={cn(
                    'size-5 rounded-[3px] transition-transform duration-100 cursor-pointer flex items-center justify-center border',
                    isSelected
                      ? 'scale-110 border-white ring-2 ring-[var(--color-accent)]/40 ring-offset-1 ring-offset-[var(--surface)]'
                      : 'border-black/30 hover:scale-105 opacity-80 hover:opacity-100',
                  )}
                  style={{ backgroundColor: def.hex }}
                >
                  {isSelected && (
                    <span className="size-1.5 rounded-full bg-black/80" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Connected Sources Status Badge */}
        <div className="flex flex-col gap-1 bg-[var(--background)] p-2 rounded-[4px] border border-[var(--border)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-wider text-[var(--text-muted)] uppercase flex items-center gap-1">
              <Radio size={10} className="text-[var(--color-accent)]" aria-hidden="true" />
              Sources
            </span>
            <span className="text-[9px] font-mono text-[var(--color-accent)] bg-[var(--surface-raised)] px-1 py-0.2 rounded-[2px] border border-[var(--border)]">
              ACTIVE
            </span>
          </div>

          <div className="flex flex-col gap-1 mt-1">
            {connectedSources.map((source) => (
              <div
                key={source.name}
                className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]"
              >
                <span className="truncate pr-1 text-[10px]">{source.name}</span>
                <span className="flex items-center gap-1 shrink-0">
                  <span
                    className={cn(
                      'size-1.5 rounded-full',
                      source.status === 'online'
                        ? 'bg-[var(--color-accent)] shadow-[0_0_6px_var(--color-accent)]'
                        : 'bg-[var(--text-muted)]',
                    )}
                    aria-hidden="true"
                  />
                  <span className="text-[9px] font-mono capitalize text-[var(--text-muted)]">
                    {source.status}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {footerAddon}
      </div>
    </aside>
  );
};
