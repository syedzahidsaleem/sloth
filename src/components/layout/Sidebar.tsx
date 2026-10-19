import { FC, ReactNode } from 'react';
import {
  Gauge,
  Disc,
  Music,
  User,
  ListMusic,
  History,
  MicVocal,
  Cable,
  Package,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type NavItemKey =
  | 'dashboard'
  | 'favorite-albums'
  | 'favorite-tracks'
  | 'favorite-artists'
  | 'playlists'
  | 'history'
  | 'lyrics'
  | 'sources'
  | 'plugins'
  | 'preferences'
  // Compatibility keys
  | 'home'
  | 'search'
  | 'library'
  | 'settings';

export interface SidebarProps {
  activeTab: NavItemKey;
  onTabChange: (tab: NavItemKey) => void;
  onOpenPreferences?: () => void;
  isCompact?: boolean;
  className?: string;
  footerAddon?: ReactNode;
}

export const NAV_ITEMS = [
  { key: 'dashboard' as NavItemKey, label: 'Dashboard', icon: Gauge },
  { key: 'favorite-albums' as NavItemKey, label: 'Favorite albums', icon: Disc },
  { key: 'favorite-tracks' as NavItemKey, label: 'Favorite tracks', icon: Music },
  { key: 'favorite-artists' as NavItemKey, label: 'Favorite artists', icon: User },
  { key: 'playlists' as NavItemKey, label: 'Playlists', icon: ListMusic },
  { key: 'history' as NavItemKey, label: 'History', icon: History },
  { key: 'lyrics' as NavItemKey, label: 'Lyrics', icon: MicVocal },
  { key: 'sources' as NavItemKey, label: 'Sources', icon: Cable },
  { key: 'plugins' as NavItemKey, label: 'Plugins', icon: Package },
];

export const Sidebar: FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenPreferences,
  isCompact = false,
  className,
  footerAddon,
}) => {
  const isSelected = (key: NavItemKey) => {
    if (activeTab === key) return true;
    if (key === 'dashboard' && activeTab === 'home') return true;
    if (key === 'preferences' && (activeTab === 'settings' || activeTab === 'preferences')) return true;
    return false;
  };

  return (
    <nav
      data-testid="sidebar-navigation"
      className={cn(
        'flex flex-1 flex-col justify-between h-full select-none font-sans',
        className,
      )}
      aria-label="Sidebar Navigation"
    >
      {/* Navigation Links */}
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = isSelected(item.key);
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              type="button"
              data-testid={`sidebar-item-${item.key}`}
              onClick={() => onTabChange(item.key)}
              title={isCompact ? item.label : undefined}
              className={cn(
                'flex w-full items-center overflow-hidden rounded-md border-(length:--border-width) transition-colors cursor-pointer text-left',
                active
                  ? 'surface-primary border-border font-bold shadow-xs'
                  : 'border-transparent text-foreground hover:bg-foreground/10',
              )}
            >
              <div className="flex size-8 shrink-0 items-center justify-center">
                <Icon size={18} />
              </div>
              <span
                className={cn(
                  'text-sm whitespace-nowrap transition-opacity duration-150 pr-2',
                  isCompact ? 'opacity-0 w-0' : 'opacity-100',
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bottom Preferences Button (No separator line, matching Nuclear) */}
      <div className="mt-auto pt-2 flex flex-col gap-1">
        <button
          type="button"
          data-testid="sidebar-item-preferences"
          onClick={() => {
            if (onOpenPreferences) {
              onOpenPreferences();
            } else {
              onTabChange('preferences');
            }
          }}
          title={isCompact ? 'Preferences' : undefined}
          className={cn(
            'flex w-full items-center overflow-hidden rounded-md border-(length:--border-width) transition-colors cursor-pointer text-left',
            isSelected('preferences')
              ? 'surface-primary border-border font-bold shadow-xs'
              : 'border-transparent text-foreground hover:bg-foreground/10',
          )}
        >
          <div className="flex size-8 shrink-0 items-center justify-center">
            <Settings size={18} />
          </div>
          <span
            className={cn(
              'text-sm whitespace-nowrap transition-opacity duration-150 pr-2 font-medium',
              isCompact ? 'opacity-0 w-0' : 'opacity-100',
            )}
          >
            Preferences
          </span>
        </button>

        {footerAddon && !isCompact && <div className="pt-2">{footerAddon}</div>}
      </div>
    </nav>
  );
};
