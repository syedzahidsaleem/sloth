import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  AppShell,
  Sidebar,
  PlayerBar,
  TopBar,
  PlayerWorkspace,
  ConnectedQueuePanel,
  NavItemKey,
} from './components/layout';
import { Track } from './components/ui/TrackRow';
import { SettingsModal, SettingsTabId } from './components/settings/SettingsModal';

const SLIDE_DISTANCE = 24;
const SCALE_FACTOR = 0.96;

const routeVariants = {
  enter: {
    x: SLIDE_DISTANCE,
    scale: SCALE_FACTOR,
    opacity: 0,
    filter: 'blur(4px)',
  },
  center: {
    x: 0,
    scale: 1,
    opacity: 1,
    filter: 'blur(0px)',
  },
  exit: {
    x: -SLIDE_DISTANCE,
    scale: SCALE_FACTOR,
    opacity: 0,
    filter: 'blur(4px)',
  },
};

// Pages
import DashboardPage from './app/page';
import FavoriteAlbumsPage from './app/favorites/albums/page';
import FavoriteTracksPage from './app/favorites/tracks/page';
import FavoriteArtistsPage from './app/favorites/artists/page';
import SourcesPage from './app/sources/page';
import HistoryPage from './app/history/page';
import PlaylistsPage from './app/playlists/page';
import LyricsPage from './app/lyrics/page';
import SearchPage from './app/search/page';
import ArtistPage from './app/artist/[id]/page';
import AlbumPage from './app/album/[id]/page';
import PluginsPage from './app/plugins/page';

// Features & Modals
import { AskSlothModal, useAskSloth } from './features/ask-sloth';
import { GenreQuizModal } from './components/onboarding';
import { getSlothSettings, applyTheme } from './services/settingsStore';
import { ToastContainer } from './components/ui/ToastContainer';
import { useLibraryStore } from './stores/libraryStore';
import { useKeyboardShortcuts } from './hooks';

export const SAMPLE_TRACKS: Track[] = [
  {
    id: '1',
    title: 'Midnight City',
    artist: 'M83',
    album: "Hurry Up, We're Dreaming",
    durationSeconds: 243,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/cb/7b/a9/cb7ba903-b5f1-cc21-90db-7a81b7aa0997/724596951057.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/24/09/79/2409794c-3d5d-af26-580e-7dc00ee4f207/mzaf_369629549966021675.plus.aac.p.m4a',
    isFavorite: true,
  },
  {
    id: '2',
    title: 'Starboy',
    artist: 'The Weeknd, Daft Punk',
    album: 'Starboy',
    durationSeconds: 230,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/b5/92/bb/b592bb72-52e3-e756-9b26-9f56d08f47ab/16UMGIM67864.rgb.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/11/71/d6/1171d6ad-3c96-e027-2af6-58028426588c/mzaf_15137631797407745471.plus.aac.p.m4a',
    isFavorite: false,
  },
  {
    id: '3',
    title: 'Instant Crush',
    artist: 'Daft Punk ft. Julian Casablancas',
    album: 'Random Access Memories',
    durationSeconds: 337,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/e8/43/5f/e8435ffa-b6b9-b171-40ab-4ff3959ab661/886443919266.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/dc/1e/c2/dc1ec21b-96a0-470c-ee89-2b09346fa847/mzaf_7827098614541126525.plus.aac.p.m4a',
    isFavorite: true,
  },
  {
    id: '4',
    title: 'Veridis Quo',
    artist: 'Daft Punk',
    album: 'Discovery',
    durationSeconds: 344,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/fd/4a/77/fd4a77db-0ebc-d043-41a2-f32fa1bb0fb4/dj.qrikkdwj.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/e0/cc/c4/e0ccc4af-ad90-59fe-9a7c-9c32d1a3c380/mzaf_2643765405421046671.plus.aac.p.m4a',
    isFavorite: false,
  },
  {
    id: '5',
    title: 'One More Time',
    artist: 'Daft Punk',
    album: 'Discovery',
    durationSeconds: 320,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/fd/4a/77/fd4a77db-0ebc-d043-41a2-f32fa1bb0fb4/dj.qrikkdwj.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/24/09/79/2409794c-3d5d-af26-580e-7dc00ee4f207/mzaf_369629549966021675.plus.aac.p.m4a',
    isFavorite: true,
  },
  {
    id: '6',
    title: 'Levitating',
    artist: 'Dua Lipa',
    album: 'Future Nostalgia',
    durationSeconds: 203,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/6c/11/d6/6c11d681-aa3a-d59e-4c2e-f77e181026ab/190295092665.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/11/71/d6/1171d6ad-3c96-e027-2af6-58028426588c/mzaf_15137631797407745471.plus.aac.p.m4a',
    isFavorite: false,
  },
  {
    id: '7',
    title: 'BAARISHEIN',
    artist: 'Anuv Jain',
    album: 'Baarishein - Single',
    durationSeconds: 208,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/a7/46/2f/a7462f7e-6dde-b235-2f5e-90e31af919a7/7799192004134_cover.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/22/a0/7d/22a07d46-b904-0717-95da-ec335aac6407/mzaf_13582924850644616784.plus.aac.p.m4a',
    isFavorite: true,
  },
];

export default function App() {
  // Navigation & View state
  const [activeTab, setActiveTab] = useState<NavItemKey>('dashboard');
  const [route, setRoute] = useState<{
    view:
      | 'dashboard'
      | 'favorite-albums'
      | 'favorite-tracks'
      | 'favorite-artists'
      | 'playlists'
      | 'history'
      | 'lyrics'
      | 'sources'
      | 'preferences'
      | 'search'
      | 'artist'
      | 'album'
      | 'home'
      | 'library'
      | 'plugins';
    id?: string;
  }>({ view: 'dashboard' });

  const shouldReduce = useReducedMotion();

  // Sidebar Layout State (collapsible left & right)
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(220);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(280);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);

  // Search input state
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTabId>('appearance');
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Playback state (defaults to empty queue like screenshot 1)
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  const { isLiked, toggleLikeSong } = useLibraryStore();

  const rawTrack = queue[currentTrackIndex];
  const currentTrack: Track = rawTrack
    ? { ...rawTrack, isFavorite: isLiked(rawTrack.id) }
    : {
        id: 'none',
        title: 'No track playing',
        artist: 'Unknown artist',
        durationSeconds: 0,
        isFavorite: false,
      };

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');

  // Real HTML5 Audio Element
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // History tracking
  const [historyTracks, setHistoryTracks] = useState<Track[]>([]);

  // Engine recommendations & Autoplay queue
  const [recommendations, setRecommendations] = useState<Track[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState<boolean>(false);

  // Ask Sloth natural language command palette
  const askSloth = useAskSloth();

  // Handle Tab Switch
  const handleTabChange = (tab: NavItemKey) => {
    setActiveTab(tab);
    if (tab === 'preferences' || tab === 'settings') {
      setIsSettingsOpen(true);
      return;
    }
    if (tab === 'dashboard' || tab === 'home') {
      setRoute({ view: 'dashboard' });
    } else {
      setRoute({ view: tab as any });
    }
  };

  const openSettingsTab = (tab: SettingsTabId) => {
    setSettingsInitialTab(tab);
    setIsSettingsOpen(true);
  };



  // Initial Check & Theme Initialization
  useEffect(() => {
    const userSettings = getSlothSettings();
    applyTheme(userSettings.themeId || 'nuclear:default');
    if (!userSettings.onboardingCompleted) {
      setIsOnboardingOpen(false); // default clean start
    }
  }, []);

  // Expose test & regression hooks on window
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__SLOTH_NAV__ = {
        setRoute,
        setActiveTab,
        setIsPlaying,
        openSettings: () => setIsSettingsOpen(true),
        closeSettings: () => setIsSettingsOpen(false),
        openAskSloth: () => askSloth.openModal(),
        closeAskSloth: () => askSloth.closeModal(),
        setSearchQuery,
        setEmptyLibrary: () => setQueue([]),
        setPopulatedLibrary: () => setQueue(SAMPLE_TRACKS),
        toggleLeftSidebar: () => setIsLeftCollapsed((prev) => !prev),
        toggleRightSidebar: () => setIsRightCollapsed((prev) => !prev),
        getAudio: () => audioRef.current,
      };
    }
  }, [askSloth]);

  // Handle audio play/pause with real HTMLAudioElement
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      if (audioRef.current.paused && audioRef.current.src) {
        audioRef.current.play().catch((err) => {
          console.warn('Audio play prevented or interrupted:', err);
        });
      }
    } else {
      if (!audioRef.current.paused) {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Fetch engine recommendations based on currently playing track
  useEffect(() => {
    if (!currentTrack.title) return;
    let isCancelled = false;
    setIsLoadingRecommendations(true);

    const fetchRecommendations = async () => {
      try {
        const res = await fetch(
          `http://127.0.0.1:8001/api/engine/recommend/next?title=${encodeURIComponent(
            currentTrack.title
          )}&artist=${encodeURIComponent(currentTrack.artist || '')}&limit=15`
        );
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && data && Array.isArray(data.recommendations) && data.recommendations.length > 0) {
            setRecommendations(
              data.recommendations.map((r: any) => ({
                id: r.id || `rec-${Math.random()}`,
                title: r.title,
                artist: r.artist,
                album: r.album || 'Single',
                durationSeconds: r.durationSeconds || 210,
                coverUrl: r.coverUrl,
                audioUrl: r.audioUrl,
                isFavorite: false,
              }))
            );
            setIsLoadingRecommendations(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Recommendation fetch failed:', err);
      }
      if (!isCancelled) {
        setIsLoadingRecommendations(false);
      }
    };

    fetchRecommendations();
    return () => {
      isCancelled = true;
    };
  }, [currentTrack.title, currentTrack.artist]);

  // Sync volume and mute to real audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : Math.max(0, Math.min(1, volume / 100));
      audioRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Update audio source when currentTrack changes
  useEffect(() => {
    if (!audioRef.current) return;
    if (currentTrack.audioUrl) {
      if (audioRef.current.src !== currentTrack.audioUrl) {
        audioRef.current.src = currentTrack.audioUrl;
        audioRef.current.load();
      }
      if (isPlaying) {
        audioRef.current.play().catch((err) => {
          console.warn('Playback start error:', err);
        });
      }
    }
  }, [currentTrack.id, currentTrack.audioUrl, isPlaying]);

  // Fallback simulated progress timer ONLY when track lacks a stream URL
  useEffect(() => {
    if (!isPlaying || currentTrack.durationSeconds <= 0 || currentTrack.audioUrl) return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= currentTrack.durationSeconds) {
          if (repeatMode === 'one') return 0;
          handleNextTrack();
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack.durationSeconds, currentTrack.audioUrl, repeatMode]);

  const handlePlayTrack = useCallback(async (incomingTrack: Track) => {
    let track = { ...incomingTrack };

    // Update queue immediately so UI reflects track info and state without delay
    setQueue((prev) => {
      const existingIdx = prev.findIndex((t) => t.id === track.id);
      if (existingIdx !== -1) {
        const copy = [...prev];
        copy[existingIdx] = track;
        setCurrentTrackIndex(existingIdx);
        return copy;
      }
      setCurrentTrackIndex(prev.length);
      return [...prev, track];
    });

    setProgress(0);
    setIsPlaying(true);

    // Record into history
    setHistoryTracks((prev) => [track, ...prev.filter((t) => t.id !== track.id)]);

    // Check if track needs real full-length audio stream starting from 0:00
    const isPreview =
      !track.audioUrl ||
      track.audioUrl.includes('itunes.apple.com') ||
      track.audioUrl.includes('mzstatic') ||
      track.audioUrl.includes('AudioPreview');

    if (isPreview) {
      try {
        const query = `${track.title} ${track.artist}`.trim();
        const res = await fetch(
          `http://127.0.0.1:8001/api/stream/resolve?q=${encodeURIComponent(query)}`,
          { signal: AbortSignal.timeout(6000) }
        );
        if (res.ok) {
          const data = await res.json();
          if (data && data.audioUrl) {
            track = {
              ...track,
              audioUrl: data.audioUrl,
              durationSeconds: data.durationSeconds || track.durationSeconds,
              coverUrl: data.coverUrl || track.coverUrl,
            };
            setQueue((prev) =>
              prev.map((t) => (t.id === track.id ? { ...t, ...track } : t))
            );
          }
        }
      } catch (err) {
        console.warn('Full stream resolution error, fallback in place:', err);
      }
    }

    if (audioRef.current && track.audioUrl) {
      if (audioRef.current.src !== track.audioUrl) {
        audioRef.current.src = track.audioUrl;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        console.warn('Direct audio play error:', err);
      });
    }
  }, []);

  const handleNextTrack = () => {
    if (queue.length === 0) {
      if (recommendations.length > 0) {
        const nextTrack = recommendations[0];
        setRecommendations((prev) => prev.slice(1));
        handlePlayTrack(nextTrack);
      }
      return;
    }

    if (isShuffle) {
      const nextIdx = Math.floor(Math.random() * queue.length);
      setCurrentTrackIndex(nextIdx);
      setProgress(0);
      return;
    }

    // If at the end of the current queue:
    if (currentTrackIndex >= queue.length - 1) {
      if (repeatMode === 'all') {
        setCurrentTrackIndex(0);
        setProgress(0);
      } else if (recommendations.length > 0) {
        // Autoplay next recommended song based on previous track!
        const nextTrack = recommendations[0];
        setRecommendations((prev) => prev.slice(1));
        handlePlayTrack(nextTrack);
      } else {
        setCurrentTrackIndex(0);
        setProgress(0);
      }
    } else {
      setCurrentTrackIndex((prev) => prev + 1);
      setProgress(0);
    }
  };

  const handlePreviousTrack = () => {
    if (queue.length === 0) return;
    if (progress > 3) {
      setProgress(0);
      if (audioRef.current) audioRef.current.currentTime = 0;
    } else {
      setCurrentTrackIndex((prev) => (prev - 1 + queue.length) % queue.length);
      setProgress(0);
    }
  };

  const handleSeek = (sec: number) => {
    setProgress(sec);
    if (audioRef.current && isFinite(sec)) {
      audioRef.current.currentTime = sec;
    }
  };

  const handleRepeatToggle = () => {
    const nextMode: Record<string, 'off' | 'all' | 'one'> = {
      off: 'all',
      all: 'one',
      one: 'off',
    };
    setRepeatMode(nextMode[repeatMode] || 'off');
  };

  const handleFavoriteToggle = (track: Track) => {
    toggleLikeSong(track);
    setQueue((prev) =>
      prev.map((t) => (t.id === track.id ? { ...t, isFavorite: !isLiked(track.id) } : t)),
    );
  };

  const handleSearchSubmit = () => {
    setActiveTab('search');
    setRoute({ view: 'search' });
  };

  // Global Keyboard Shortcuts
  useKeyboardShortcuts({
    onPlayPause: () => {
      if (queue.length === 0) {
        handlePlayTrack(SAMPLE_TRACKS[0]);
      } else {
        setIsPlaying((prev) => !prev);
      }
    },
    onSeekRelative: (deltaSeconds) => {
      setProgress((prev) => {
        const next = Math.max(0, Math.min(currentTrack.durationSeconds || 300, prev + deltaSeconds));
        if (audioRef.current && isFinite(next)) {
          audioRef.current.currentTime = next;
        }
        return next;
      });
    },
    onVolumeChangeRelative: (deltaPercent) => {
      setVolume((prev) => Math.max(0, Math.min(100, prev + deltaPercent)));
      setIsMuted(false);
    },
    onPreviousTrack: handlePreviousTrack,
    onNextTrack: handleNextTrack,
    onMuteToggle: () => setIsMuted((prev) => !prev),
    onLyricsToggle: () => {
      if (route.view === 'lyrics') {
        setRoute({ view: 'dashboard' });
        setActiveTab('dashboard');
      } else {
        setRoute({ view: 'lyrics' });
        setActiveTab('lyrics' as any);
      }
    },
    onQueueToggle: () => setIsRightCollapsed((prev) => !prev),
    onAskSlothOpen: () => askSloth.openModal(),
    onSearchFocus: () => {
      setActiveTab('search');
      setRoute({ view: 'search' });
    },
    onShuffleToggle: () => setIsShuffle((prev) => !prev),
    onRepeatCycle: handleRepeatToggle,
    onEscape: () => {
      if (isSettingsOpen) setIsSettingsOpen(false);
      if (isOnboardingOpen) setIsOnboardingOpen(false);
      askSloth.closeModal();
    },
  });

  return (
    <>
      <AppShell
        topbar={
          <TopBar
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q);
              if (q.trim().length > 0 && route.view !== 'search') {
                setActiveTab('search');
                setRoute({ view: 'search' });
              }
            }}
            onSearchSubmit={handleSearchSubmit}
            onBack={() => handleTabChange('dashboard')}
            onForward={() => {}}
            onOpenSettings={() => openSettingsTab('appearance')}
            onOpenAskSloth={() => askSloth.openModal()}
            onOpenJam={() => openSettingsTab('integrations')}
          />
        }
        playerBar={
          <PlayerBar
            title={currentTrack.title}
            artist={currentTrack.artist}
            coverUrl={currentTrack.coverUrl}
            isFavorite={currentTrack.isFavorite}
            onFavoriteToggle={() => handleFavoriteToggle(currentTrack)}
            isPlaying={isPlaying}
            onPlayPause={() => {
              if (queue.length === 0) {
                // Populate demo track if queue was empty
                handlePlayTrack(SAMPLE_TRACKS[0]);
              } else {
                setIsPlaying(!isPlaying);
              }
            }}
            onNext={handleNextTrack}
            onPrevious={handlePreviousTrack}
            isShuffle={isShuffle}
            onShuffleToggle={() => setIsShuffle(!isShuffle)}
            repeatMode={repeatMode}
            onRepeatToggle={handleRepeatToggle}
            progressSeconds={progress}
            totalDurationSeconds={currentTrack.durationSeconds}
            onSeek={handleSeek}
            volume={volume}
            isMuted={isMuted}
            onVolumeChange={setVolume}
            onMuteToggle={() => setIsMuted(!isMuted)}
            isQueueOpen={!isRightCollapsed}
            onQueueToggle={() => setIsRightCollapsed((prev) => !prev)}
            isLyricsOpen={route.view === 'lyrics'}
            onLyricsToggle={() => {
              if (route.view === 'lyrics') {
                setRoute({ view: 'dashboard' });
                setActiveTab('dashboard');
              } else {
                setRoute({ view: 'lyrics' });
                setActiveTab('lyrics' as any);
              }
            }}
            onArtworkClick={() => {
              if (currentTrack.album) {
                setRoute({ view: 'album', id: currentTrack.album });
              }
            }}
            onTitleClick={() => {
              if (currentTrack.album) {
                setRoute({ view: 'album', id: currentTrack.album });
              }
            }}
            onArtistClick={() => {
              if (currentTrack.artist) {
                setRoute({ view: 'artist', id: currentTrack.artist });
              }
            }}
          />
        }
      >
        <PlayerWorkspace>
          {/* LEFT SIDEBAR: Collapsible, animated */}
          <PlayerWorkspace.LeftSidebar
            width={leftSidebarWidth}
            isCollapsed={isLeftCollapsed}
            onWidthChange={setLeftSidebarWidth}
            onToggle={() => setIsLeftCollapsed(!isLeftCollapsed)}
          >
            <Sidebar
              activeTab={activeTab}
              onTabChange={handleTabChange}
              onOpenPreferences={() => openSettingsTab('appearance')}
              isCompact={isLeftCollapsed}
            />
          </PlayerWorkspace.LeftSidebar>

          {/* MAIN VIEWPORT: Render active screen in ViewShell with Nuclear spring transition */}
          <PlayerWorkspace.Main>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={route.view + (route.id || '')}
                variants={shouldReduce ? undefined : routeVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 30,
                  mass: 0.8,
                }}
                className="will-change-[transform,filter] surface-background absolute inset-0 h-full w-full overflow-hidden flex flex-col"
              >
                {/* VIEW 1: DASHBOARD (Matches Screenshot 1) */}
            {(route.view === 'dashboard' || route.view === 'home') && (
              <DashboardPage
                onBrowsePlugins={() => {
                  setActiveTab('plugins');
                  setRoute({ view: 'plugins' });
                }}
                onPlayTrack={handlePlayTrack}
                tracks={SAMPLE_TRACKS}
                currentTrackId={currentTrack.id}
                isPlaying={isPlaying}
                onSelectAlbum={(albId) => setRoute({ view: 'album', id: albId })}
                onSelectArtist={(artId) => setRoute({ view: 'artist', id: artId })}
              />
            )}

            {/* VIEW 2: FAVORITE ALBUMS (Matches Screenshot 7) */}
            {route.view === 'favorite-albums' && (
              <FavoriteAlbumsPage
                albums={[]}
                onSelectAlbum={(albId) => setRoute({ view: 'album', id: albId })}
              />
            )}

            {/* VIEW 3: FAVORITE TRACKS */}
            {route.view === 'favorite-tracks' && (
              <FavoriteTracksPage
                tracks={queue.length > 0 ? queue : SAMPLE_TRACKS}
                currentTrackId={currentTrack.id}
                isPlaying={isPlaying}
                onPlayTrack={handlePlayTrack}
              />
            )}

            {/* VIEW 4: FAVORITE ARTISTS */}
            {route.view === 'favorite-artists' && (
              <FavoriteArtistsPage
                artists={[]}
                onSelectArtist={(artId) => setRoute({ view: 'artist', id: artId })}
              />
            )}

            {/* VIEW 5: PLAYLISTS */}
            {route.view === 'playlists' && (
              <PlaylistsPage
                onPlayPlaylist={() => handlePlayTrack(SAMPLE_TRACKS[0])}
                onSelectPlaylist={() => {}}
              />
            )}

            {/* VIEW 6: HISTORY */}
            {route.view === 'history' && (
              <HistoryPage
                historyTracks={historyTracks}
                currentTrackId={currentTrack.id}
                isPlaying={isPlaying}
                onPlayTrack={handlePlayTrack}
                onClearHistory={() => setHistoryTracks([])}
              />
            )}

            {/* VIEW 7: LYRICS */}
            {route.view === 'lyrics' && (
              <LyricsPage
                trackTitle={currentTrack.title}
                artistName={currentTrack.artist}
                albumName={currentTrack.album}
                durationSeconds={currentTrack.durationSeconds}
                progressSeconds={progress}
                onSeek={handleSeek}
              />
            )}

            {/* VIEW 8: SOURCES (Matches Screenshot 10) */}
            {route.view === 'sources' && <SourcesPage />}

            {/* VIEW 9: SEARCH */}
            {route.view === 'search' && (
              <SearchPage
                initialQuery={searchQuery}
                onQueryChange={setSearchQuery}
                onPlayTrack={handlePlayTrack}
                onPlayAll={(tracks) => {
                  setQueue(tracks);
                  setCurrentTrackIndex(0);
                  setProgress(0);
                  setIsPlaying(true);
                }}
                onAddAll={(tracks) => {
                  setQueue((prev) => [...prev, ...tracks.filter((t) => !prev.some((p) => p.id === t.id))]);
                }}
                onSelectArtist={(artId) => setRoute({ view: 'artist', id: artId })}
                onSelectAlbum={(albId) => setRoute({ view: 'album', id: albId })}
                onSelectPlaylist={(plId) => setRoute({ view: 'playlists', id: plId })}
                currentTrackId={currentTrack.id}
                isPlaying={isPlaying}
              />
            )}

            {/* VIEW 10: ARTIST DETAIL */}
            {route.view === 'artist' && (
              <ArtistPage
                artistId={route.id || 'm83'}
                onPlayTrack={handlePlayTrack}
                onPlayArtist={() => handlePlayTrack(SAMPLE_TRACKS[0])}
                onSelectAlbum={(albumId) => setRoute({ view: 'album', id: albumId })}
                onSelectArtist={(artistId) => setRoute({ view: 'artist', id: artistId })}
                currentTrackId={currentTrack.id}
                isPlaying={isPlaying}
              />
            )}

            {/* VIEW 11: ALBUM DETAIL */}
            {route.view === 'album' && (
              <AlbumPage
                albumId={route.id || 'alb-1'}
                onPlayTrack={handlePlayTrack}
                onPlayAll={(albumTracks) => {
                  setQueue(albumTracks);
                  setCurrentTrackIndex(0);
                  setProgress(0);
                  setIsPlaying(true);
                }}
                onSelectArtist={(artistId) => setRoute({ view: 'artist', id: artistId })}
                currentTrackId={currentTrack.id}
                isPlaying={isPlaying}
              />
            )}

            {/* VIEW 12: PLUGINS VIEW */}
            {route.view === 'plugins' && <PluginsPage />}
              </motion.div>
            </AnimatePresence>
          </PlayerWorkspace.Main>

          {/* RIGHT SIDEBAR: Collapsible queue panel */}
          <PlayerWorkspace.RightSidebar
            width={rightSidebarWidth}
            isCollapsed={isRightCollapsed}
            onWidthChange={setRightSidebarWidth}
            onToggle={() => setIsRightCollapsed(!isRightCollapsed)}
          >
            <ConnectedQueuePanel
              queue={queue}
              currentTrackId={currentTrack.id}
              isPlaying={isPlaying}
              isCollapsed={isRightCollapsed}
              onTrackSelect={handlePlayTrack}
              onTrackPlay={handlePlayTrack}
              onRemoveTrack={(trackId) => setQueue((prev) => prev.filter((t) => t.id !== trackId))}
              onClearQueue={() => setQueue([])}
              onToggleCollapse={() => setIsRightCollapsed(!isRightCollapsed)}
              onPlayNext={(track) => {
                const nextIdx = currentTrackIndex + 1;
                const without = queue.filter((t) => t.id !== track.id);
                without.splice(nextIdx, 0, track);
                setQueue(without);
              }}
              onReorderQueue={(fromIdx, toIdx) => {
                const updated = [...queue];
                const [moved] = updated.splice(fromIdx, 1);
                updated.splice(toIdx, 0, moved);
                setQueue(updated);
              }}
              onNavigateToArtist={(art) => setRoute({ view: 'artist', id: art })}
              onNavigateToAlbum={(alb) => setRoute({ view: 'album', id: alb })}
              onAddToLikedSongs={(track) => toggleLikeSong(track)}
              recommendations={recommendations}
              onAddRecommendationToQueue={(track) => setQueue((prev) => [...prev, track])}
              isLoadingRecommendations={isLoadingRecommendations}
            />
          </PlayerWorkspace.RightSidebar>
        </PlayerWorkspace>
      </AppShell>

      {/* 2-Column Settings Modal (Matches Screenshots 2, 3, 4, 5, 8, 9) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialTab={settingsInitialTab}
        onNavigateToPlugins={() => {
          setActiveTab('plugins');
          setRoute({ view: 'plugins' });
        }}
      />

      {/* Ask Sloth Command Palette Modal (Ctrl+K) */}
      <AskSlothModal
        isOpen={askSloth.isOpen}
        onClose={askSloth.closeModal}
        query={askSloth.query}
        onQueryChange={askSloth.setQuery}
        isLoading={askSloth.isLoading}
        results={askSloth.results}
        interpretation={askSloth.interpretation}
        parsedQuery={askSloth.parsedQuery}
        elapsedMs={askSloth.elapsedMs}
        selectedIndex={askSloth.selectedIndex}
        onSelectIndex={askSloth.setSelectedIndex}
        onPlayTrack={handlePlayTrack}
        currentTrackId={currentTrack.id}
        isPlaying={isPlaying}
      />

      {/* Coldstart Onboarding Modal */}
      <GenreQuizModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onComplete={() => setIsOnboardingOpen(false)}
      />

      {/* Hidden real audio element for genuine audio playback */}
      <audio
        ref={audioRef}
        preload="auto"
        onTimeUpdate={(e) => {
          setProgress(e.currentTarget.currentTime);
        }}
        onDurationChange={(e) => {
          const dur = e.currentTarget.duration;
          if (dur > 0 && isFinite(dur)) {
            setQueue((prev) =>
              prev.map((t, idx) => (idx === currentTrackIndex ? { ...t, durationSeconds: Math.round(dur) } : t))
            );
          }
        }}
        onLoadedMetadata={(e) => {
          const dur = e.currentTarget.duration;
          if (dur > 0 && isFinite(dur)) {
            setQueue((prev) =>
              prev.map((t, idx) => (idx === currentTrackIndex ? { ...t, durationSeconds: Math.round(dur) } : t))
            );
          }
        }}
        onEnded={() => {
          if (repeatMode === 'one') {
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(console.warn);
            }
            setProgress(0);
          } else {
            handleNextTrack();
          }
        }}
        onError={(e) => {
          console.warn('Audio element error:', e);
        }}
      />

      {/* Stacked bottom-right notifications */}
      <ToastContainer />
    </>
  );
}
