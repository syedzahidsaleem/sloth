/**
 * Sloth UI — Complete Sidebar Component
 * Integrated Nav, Filterable Library with Pins, Equalizer, Sources Status & Mood Arc
 * Author: Syed Zahid Saleem <syedzahidsaleem2@gmail.com>
 */

import { FC, ReactNode, useState, useEffect, useMemo } from 'react';
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
  Pin,
  X,
  Edit2,
  Trash2,
  Share2,
  Activity,
  Sliders,
} from 'lucide-react';
import { Track } from '@/components/ui/TrackRow';
import {
  TrackContextMenuRoot,
  TrackContextMenuTrigger,
  TrackContextMenuContent,
  TrackContextMenuAction,
  TrackContextMenuDivider,
} from '@/components/ui/TrackContextMenu';
import { usePlaylistStore } from '@/stores/playlistStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useToastStore } from '@/stores/toastStore';
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
  { key: 'history' as NavItemKey, label: 'History', icon: History },
  { key: 'lyrics' as NavItemKey, label: 'Lyrics', icon: MicVocal },
  { key: 'plugins' as NavItemKey, label: 'Plugins', icon: Package },
];

export type LibraryFilterType = 'playlists' | 'artists' | 'albums' | null;

interface LibraryListItem {
  id: string;
  type: 'playlist' | 'artist' | 'album';
  title: string;
  subtitle: string;
  coverUrl?: string;
}

export const Sidebar: FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenPreferences,
  isCompact = false,
  className,
  footerAddon,
  currentTrack,
  onNavigate,
}) => {
  const { playlists, deletePlaylist } = usePlaylistStore();
  const { followedArtists, savedAlbums, removeAlbum, toggleFollowArtist } = useLibraryStore();
  const { showToast } = useToastStore();

  // Library State
  const [activeFilter, setActiveFilter] = useState<LibraryFilterType>(null);
  const [filterSearch, setFilterSearch] = useState('');
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('sloth_pinned_sidebar');
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return ['fav-tracks', 'rec-playlist'];
  });

  // Mood Arc State
  const [isMoodArcOpen, setIsMoodArcOpen] = useState(false);
  const [valence, setValence] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('sloth_mood_arc');
        if (stored) return JSON.parse(stored).valence ?? 0.5;
      } catch {}
    }
    return 0.5;
  });
  const [arousal, setArousal] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('sloth_mood_arc');
        if (stored) return JSON.parse(stored).arousal ?? 0.5;
      } catch {}
    }
    return 0.5;
  });

  // Save pins to local storage
  const togglePin = (id: string) => {
    setPinnedIds((prev) => {
      const isPinned = prev.includes(id);
      const next = isPinned ? prev.filter((p) => p !== id) : [id, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('sloth_pinned_sidebar', JSON.stringify(next));
      }
      showToast({
        title: isPinned ? 'Unpinned from sidebar' : 'Pinned to top of sidebar',
        variant: 'info',
      });
      return next;
    });
  };

  // Debounced 400ms POST /engine/mood
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        await fetch('http://127.0.0.1:8001/engine/mood', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ valence, arousal }),
        });
        if (typeof window !== 'undefined') {
          localStorage.setItem('sloth_mood_arc', JSON.stringify({ valence, arousal }));
        }
      } catch {
        // Offline / fallback mode
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [valence, arousal]);

  // Aggregate Library Items
  const libraryItems: LibraryListItem[] = useMemo(() => {
    const items: LibraryListItem[] = [];

    // 1. Playlists
    playlists.forEach((p) => {
      items.push({
        id: `pl-${p.id}`,
        type: 'playlist',
        title: p.name,
        subtitle: `Playlist • ${p.tracks.length} tracks`,
        coverUrl: p.tracks[0]?.coverUrl,
      });
    });

    // 2. Artists
    followedArtists.forEach((a) => {
      items.push({
        id: `art-${a.id}`,
        type: 'artist',
        title: a.name,
        subtitle: 'Artist',
        coverUrl: a.imageUrl,
      });
    });

    // 3. Albums
    savedAlbums.forEach((alb) => {
      items.push({
        id: `alb-${alb.id}`,
        type: 'album',
        title: alb.title,
        subtitle: `Album • ${alb.artist}`,
        coverUrl: alb.coverUrl,
      });
    });

    return items;
  }, [playlists, followedArtists, savedAlbums]);

  // Filtered & Sorted (Pinned on top)
  const filteredLibraryItems = useMemo(() => {
    let list = libraryItems;

    // Filter by category pill
    if (activeFilter === 'playlists') list = list.filter((i) => i.type === 'playlist');
    else if (activeFilter === 'artists') list = list.filter((i) => i.type === 'artist');
    else if (activeFilter === 'albums') list = list.filter((i) => i.type === 'album');

    // Filter by search text
    if (filterSearch.trim()) {
      const q = filterSearch.toLowerCase();
      list = list.filter(
        (i) => i.title.toLowerCase().includes(q) || i.subtitle.toLowerCase().includes(q)
      );
    }

    // Sort: Pinned items first
    return [...list].sort((a, b) => {
      const aPinned = pinnedIds.includes(a.id);
      const bPinned = pinnedIds.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });
  }, [libraryItems, activeFilter, filterSearch, pinnedIds]);

  const isSelected = (key: NavItemKey) => {
    if (activeTab === key) return true;
    if (key === 'dashboard' && activeTab === 'home') return true;
    if (key === 'preferences' && (activeTab === 'settings' || activeTab === 'preferences')) return true;
    return false;
  };

  const handleItemClick = (item: LibraryListItem) => {
    if (item.type === 'playlist') {
      const plId = item.id.replace('pl-', '');
      if (onNavigate) {
        onNavigate({ view: 'playlists', id: plId });
      } else {
        onTabChange('playlists');
      }
    } else if (item.type === 'artist') {
      const artId = item.id.replace('art-', '');
      if (onNavigate) {
        onNavigate({ view: 'artist', id: artId });
      } else {
        onTabChange('favorite-artists');
      }
    } else if (item.type === 'album') {
      const albId = item.id.replace('alb-', '');
      if (onNavigate) {
        onNavigate({ view: 'album', id: albId });
      } else {
        onTabChange('favorite-albums');
      }
    }
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
      {/* 1. TOP NAV ITEMS */}
      <div className="flex flex-col gap-1 pb-2 shrink-0">
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

      {/* 2. "YOUR LIBRARY" SECTION */}
      {!isCompact && (
        <div className="flex flex-1 flex-col min-h-0 border-t-2 border-border pt-2 pb-2">
          {/* Section Header */}
          <div className="flex items-center justify-between px-1 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground/60">
              Your Library
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 px-1 pb-2 overflow-x-auto">
            {(['playlists', 'artists', 'albums'] as const).map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(isActive ? null : filter)}
                  className={cn(
                    'px-2 py-0.5 rounded text-[11px] font-bold border capitalize transition-all cursor-pointer',
                    isActive
                      ? 'surface-primary border-border text-foreground font-extrabold shadow-xs'
                      : 'border-border/60 surface-muted text-foreground/70 hover:text-foreground'
                  )}
                >
                  {filter}
                </button>
              );
            })}
          </div>

          {/* Mini Search Filter Input */}
          <div className="px-1 pb-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search library..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="h-6 w-full rounded border border-border surface-background text-foreground placeholder:text-foreground/40 px-2 text-[11px] outline-none"
              />
              {filterSearch && (
                <button
                  type="button"
                  onClick={() => setFilterSearch('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          </div>

          {/* Library Items List */}
          <div className="flex-1 overflow-y-auto space-y-0.5 px-1 divide-y divide-border/20">
            {filteredLibraryItems.length === 0 ? (
              <div className="text-center py-6 text-foreground/40 text-xs">
                No library items
              </div>
            ) : (
              filteredLibraryItems.map((item) => {
                const isPinned = pinnedIds.includes(item.id);
                const isItemPlaying =
                  currentTrack &&
                  (currentTrack.artist === item.title ||
                    currentTrack.album === item.title ||
                    item.title.toLowerCase() === currentTrack.title.toLowerCase());

                return (
                  <TrackContextMenuRoot key={item.id} triggerOnContextMenu className="w-full block">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleItemClick(item)}
                      className="flex items-center gap-2 p-1.5 rounded hover:bg-foreground/5 transition-colors cursor-pointer group text-left w-full"
                    >
                      {/* Thumbnail / Icon */}
                      <div className="size-8 rounded overflow-hidden shrink-0 border border-border/40 surface-muted flex items-center justify-center">
                        {item.coverUrl ? (
                          <img src={item.coverUrl} alt="" className="size-full object-cover" />
                        ) : item.type === 'artist' ? (
                          <User size={14} className="text-foreground/50" />
                        ) : item.type === 'album' ? (
                          <Disc size={14} className="text-foreground/50" />
                        ) : (
                          <ListMusic size={14} className="text-foreground/50" />
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0 pr-1">
                        <div className="text-xs font-semibold truncate text-foreground flex items-center gap-1.5">
                          <span className="truncate">{item.title}</span>
                          {isPinned && <Pin size={10} className="text-accent-green shrink-0 fill-current" />}
                        </div>
                        <div className="text-[10px] text-foreground/60 truncate">
                          {item.subtitle}
                        </div>
                      </div>

                      {/* Playing Animated Equalizer */}
                      {isItemPlaying && (
                        <div className="flex items-end gap-0.5 h-3 w-3 shrink-0 text-accent-green pr-1" title="Currently playing">
                          <span className="w-0.5 bg-current animate-pulse h-full" />
                          <span className="w-0.5 bg-current animate-pulse h-2/3" />
                          <span className="w-0.5 bg-current animate-pulse h-4/5" />
                        </div>
                      )}
                    </div>

                    <TrackContextMenuContent className="w-48 z-50">
                      <TrackContextMenuAction
                        icon={<Pin size={13} className={isPinned ? 'fill-current' : ''} />}
                        onClick={() => togglePin(item.id)}
                      >
                        {isPinned ? 'Unpin from top' : 'Pin to top'}
                      </TrackContextMenuAction>

                      {item.type === 'playlist' && (
                        <TrackContextMenuAction
                          icon={<Edit2 size={13} />}
                          onClick={() => handleItemClick(item)}
                        >
                          Edit playlist
                        </TrackContextMenuAction>
                      )}

                      <TrackContextMenuDivider />

                      <TrackContextMenuAction
                        danger
                        icon={<Trash2 size={13} />}
                        onClick={() => {
                          if (item.type === 'playlist') {
                            const plId = item.id.replace('pl-', '');
                            deletePlaylist(plId);
                            showToast({ title: `Deleted playlist "${item.title}"`, variant: 'info' });
                          } else if (item.type === 'album') {
                            const albId = item.id.replace('alb-', '');
                            removeAlbum(albId);
                            showToast({ title: `Removed album "${item.title}"`, variant: 'info' });
                          } else if (item.type === 'artist') {
                            const artId = item.id.replace('art-', '');
                            toggleFollowArtist({ id: artId, name: item.title });
                            showToast({ title: `Unfollowed "${item.title}"`, variant: 'info' });
                          }
                        }}
                      >
                        {item.type === 'playlist' ? 'Delete playlist' : 'Remove from library'}
                      </TrackContextMenuAction>
                    </TrackContextMenuContent>
                  </TrackContextMenuRoot>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 3. BOTTOM CONTROLS (Sources, Mood Arc, Preferences) */}
      <div className="mt-auto pt-2 flex flex-col gap-1.5 shrink-0 border-t-2 border-border/60">
        {!isCompact && (
          <>
            {/* Sources Status Indicator */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => onTabChange('sources')}
              className="flex items-center justify-between px-2 py-1 rounded surface-muted border border-border/50 text-[11px] font-medium cursor-pointer hover:border-border transition-colors group"
              title="Sources: YouTube (42ms) • Piped (58ms) • Metrolist (38ms) • Jamendo (65ms)"
            >
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-foreground/80 font-bold">Sources</span>
              </div>
              <span className="text-[10px] text-foreground/50 group-hover:text-foreground">
                All connected
              </span>
            </div>

            {/* Mood Arc Sliders (Valence & Arousal) */}
            <div className="rounded border border-border/50 surface-card p-2 text-xs space-y-1.5">
              <button
                type="button"
                onClick={() => setIsMoodArcOpen((prev) => !prev)}
                className="w-full flex items-center justify-between font-bold text-[11px] text-foreground/80 cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <Sliders size={13} className="text-accent-green" />
                  <span>Mood Arc Bias</span>
                </div>
                <span className="text-[10px] text-foreground/50 font-mono">
                  {Math.round(valence * 100)}% / {Math.round(arousal * 100)}%
                </span>
              </button>

              {isMoodArcOpen && (
                <div className="space-y-2 pt-1 border-t border-border/40">
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[10px] text-foreground/60 font-medium">
                      <span>Valence</span>
                      <span className="font-mono text-accent-green">{Math.round(valence * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={valence}
                      onChange={(e) => setValence(parseFloat(e.target.value))}
                      className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-accent-green"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[10px] text-foreground/60 font-medium">
                      <span>Arousal</span>
                      <span className="font-mono text-accent-green">{Math.round(arousal * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={arousal}
                      onChange={(e) => setArousal(parseFloat(e.target.value))}
                      className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-accent-green"
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

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
