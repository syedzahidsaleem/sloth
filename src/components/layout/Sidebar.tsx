/**
 * Sloth UI — Complete Sidebar Component
 * Integrated Nav with Artists, Tracks, Playlists, Albums, User Custom Playlists & Preferences
 * Author: Syed Zahid Saleem <syedzahidsaleem2@gmail.com>
 */

import { FC, ReactNode } from 'react';
import {
  Gauge,
  Search,
  Disc,
  Music,
  User,
  ListMusic,
  History,
  MicVocal,
  Package,
  Settings,
  Plus,
} from 'lucide-react';
import { Track } from '@/components/ui/TrackRow';
import { usePlaylistStore } from '@/stores/playlistStore';
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
  currentTrack?: Track;
  onNavigate?: (route: { view: any; id?: string }) => void;
}

export const NAV_ITEMS = [
  { key: 'dashboard' as NavItemKey, label: 'Home', icon: Gauge },
  { key: 'search' as NavItemKey, label: 'Search', icon: Search },
  { key: 'favorite-tracks' as NavItemKey, label: 'Liked Songs', icon: Music },
  { key: 'favorite-artists' as NavItemKey, label: 'Artists', icon: User },
  { key: 'favorite-albums' as NavItemKey, label: 'Albums', icon: Disc },
  { key: 'playlists' as NavItemKey, label: 'Playlists', icon: ListMusic },
  { key: 'history' as NavItemKey, label: 'History', icon: History },
  { key: 'lyrics' as NavItemKey, label: 'Lyrics', icon: MicVocal },
  { key: 'plugins' as NavItemKey, label: 'Plugins', icon: Package },
];

export const Sidebar: FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenPreferences,
  isCompact = false,
  className,
  footerAddon,
  onNavigate,
}) => {
  const { playlists } = usePlaylistStore();

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
        'flex flex-1 flex-col justify-between h-full select-none font-sans overflow-hidden',
        className
      )}
      aria-label="Sidebar Navigation"
    >
      {/* 1. TOP NAV ITEMS (Home, Search, Liked Songs, Artists, Albums, Playlists, History, Lyrics, Plugins) */}
      <div className="flex flex-col gap-0.5 pb-2 shrink-0">
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
                  : 'border-transparent text-foreground hover:bg-foreground/10'
              )}
            >
              <div className="flex size-8 shrink-0 items-center justify-center">
                <Icon size={18} />
              </div>
              <span
                className={cn(
                  'text-sm whitespace-nowrap transition-opacity duration-150 pr-2 font-semibold',
                  isCompact ? 'opacity-0 w-0' : 'opacity-100'
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. PLAYLISTS SECTION (Direct full sidebar rows for user's playlists) */}
      {!isCompact && (
        <div className="flex flex-1 flex-col min-h-0 border-t-2 border-border/40 pt-3 pb-2">
          {/* Section Header with + create button */}
          <div className="flex items-center justify-between px-2 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground/60">
              Playlists
            </span>
            <button
              type="button"
              onClick={() => {
                if (onNavigate) {
                  onNavigate({ view: 'playlists' });
                } else {
                  onTabChange('playlists');
                }
              }}
              title="Create or view playlists"
              className="size-5 rounded flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-foreground/10 transition-colors cursor-pointer"
            >
              <Plus size={13} />
            </button>
          </div>

          {/* User Playlists list */}
          <div className="flex-1 overflow-y-auto space-y-0.5 px-1">
            {playlists.length === 0 ? (
              <div className="text-center py-6 text-foreground/40 text-xs font-medium">
                No playlists yet
              </div>
            ) : (
              playlists.map((pl) => {
                return (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={() => {
                      if (onNavigate) {
                        onNavigate({ view: 'playlists', id: pl.id });
                      } else {
                        onTabChange('playlists');
                      }
                    }}
                    className="flex w-full items-center gap-2 px-2 py-1.5 rounded hover:bg-foreground/10 transition-colors text-left cursor-pointer group"
                  >
                    <ListMusic size={14} className="text-foreground/50 group-hover:text-foreground shrink-0" />
                    <span className="text-xs font-medium truncate text-foreground/90 group-hover:text-foreground flex-1">
                      {pl.name}
                    </span>
                    <span className="text-[10px] text-foreground/40 font-mono">
                      {pl.tracks?.length || 0}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 3. BOTTOM CONTROLS (Preferences only) */}
      <div className="mt-auto pt-2 flex flex-col gap-1.5 shrink-0 border-t-2 border-border/60">
        {/* Preferences Button (Settings icon rotates 30° on hover) */}
        <button
          type="button"
          data-testid="sidebar-item-preferences"
          onClick={() => {
            if (onOpenPreferences) onOpenPreferences();
            else onTabChange('preferences');
          }}
          title={isCompact ? 'Preferences' : undefined}
          className={cn(
            'flex w-full items-center overflow-hidden rounded-md border-(length:--border-width) transition-colors cursor-pointer text-left group',
            isSelected('preferences')
              ? 'surface-primary border-border font-bold shadow-xs'
              : 'border-transparent text-foreground hover:bg-foreground/10'
          )}
        >
          <div className="flex size-8 shrink-0 items-center justify-center">
            <Settings
              size={18}
              className="transition-transform duration-200 group-hover:rotate-30"
            />
          </div>
          <span
            className={cn(
              'text-sm whitespace-nowrap transition-opacity duration-150 pr-2 font-medium',
              isCompact ? 'opacity-0 w-0' : 'opacity-100'
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

export default Sidebar;
