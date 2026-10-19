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

const SLIDE_DISTANCE = 16;
const SCALE_FACTOR = 0.98;

const routeVariants = {
  enter: {
    x: SLIDE_DISTANCE,
    scale: SCALE_FACTOR,
    opacity: 0,
    filter: 'blur(3px)',
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
    filter: 'blur(3px)',
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

export const SAMPLE_TRACKS: Track[] = [
  {
    id: '1',
    title: 'Midnight City',
    artist: 'M83',
    album: "Hurry Up, We're Dreaming",
    durationSeconds: 243,
    coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/24/09/79/2409794c-3d5d-af26-580e-7dc00ee4f207/mzaf_369629549966021675.plus.aac.p.m4a',
    isFavorite: true,
  },
  {
    id: '2',
    title: 'Starboy',
    artist: 'The Weeknd, Daft Punk',
    album: 'Starboy',
    durationSeconds: 230,
    coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/11/71/d6/1171d6ad-3c96-e027-2af6-58028426588c/mzaf_15137631797407745471.plus.aac.p.m4a',
    isFavorite: false,
  },
  {
    id: '3',
    title: 'Resonance',
    artist: 'HOME',
    album: 'Odyssey',
    durationSeconds: 212,
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/33/bb/1a/33bb1a1a-1448-3118-6891-639e61784145/mzaf_3810752549913623044.plus.aac.p.m4a',
    isFavorite: true,
  },
  {
    id: '4',
    title: 'Instant Crush',
    artist: 'Daft Punk ft. Julian Casablancas',
    album: 'Random Access Memories',
    durationSeconds: 337,
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/dc/1e/c2/dc1ec21b-96a0-470c-ee89-2b09346fa847/mzaf_7827098614541126525.plus.aac.p.m4a',
    isFavorite: false,
  },
  {
    id: '5',
    title: 'Veridis Quo',
    artist: 'Daft Punk',
    album: 'Discovery',
    durationSeconds: 344,
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/e0/cc/c4/e0ccc4af-ad90-59fe-9a7c-9c32d1a3c380/mzaf_2643765405421046671.plus.aac.p.m4a',
    isFavorite: true,
  },
  {
    id: '6',
    title: 'Days of Thunder',
    artist: 'The Midnight',
    album: 'Days of Thunder',
    durationSeconds: 329,
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/d6/cd/fe/d6cdfe48-ca9d-8c81-3e17-68b2a45a3d3f/mzaf_12365088739771920597.plus.aac.p.m4a',
    isFavorite: false,
  },
  {
    id: '7',
    title: 'Neon Drift (Discovery Gem)',
    artist: 'Lorn & Kavinsky',
    album: 'Underground Electronic Archives',
    durationSeconds: 274,
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&q=80',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/24/09/79/2409794c-3d5d-af26-580e-7dc00ee4f207/mzaf_369629549966021675.plus.aac.p.m4a',
    isFavorite: false,
    isDiscoverySlot: true,
    badge: 'New',
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
  const currentTrack = queue[currentTrackIndex] || {
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

  // Keyboard Shortcuts (Space, Ctrl+K, Ctrl+Q, Ctrl+F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (queue.length > 0) {
          setIsPlaying((prev) => !prev);
        }
      } else if (e.ctrlKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        askSloth.openModal();
      } else if (e.ctrlKey && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        setIsRightCollapsed((prev) => !prev);
      } else if (e.ctrlKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('[data-testid="search-box"]');
        searchInput?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [queue.length, askSloth]);

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
    let track = incomingTrack;

    // Resolve audio preview URL if missing
    if (!track.audioUrl) {
      try {
        const res = await fetch(
          `http://127.0.0.1:8001/api/resolve?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}`,
          { signal: AbortSignal.timeout(3000) }
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
          }
        }
      } catch {
        // Fallback to direct iTunes search
        try {
          const itunesRes = await fetch(
            `https://itunes.apple.com/search?term=${encodeURIComponent(`${track.title} ${track.artist}`)}&entity=song&limit=1`,
            { signal: AbortSignal.timeout(3000) }
          );
          if (itunesRes.ok) {
            const itunesData = await itunesRes.json();
            if (itunesData.results?.[0]?.previewUrl) {
              track = {
                ...track,
                audioUrl: itunesData.results[0].previewUrl,
                coverUrl:
                  (itunesData.results[0].artworkUrl100 || '').replace('100x100bb', '600x600bb') ||
                  track.coverUrl,
              };
            }
          }
        } catch {
          // Keep original track
        }
      }
    }

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

    if (audioRef.current && track.audioUrl) {
      audioRef.current.src = track.audioUrl;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        console.warn('Direct audio play error:', err);
      });
    }

    // Record into history
    setHistoryTracks((prev) => [track, ...prev.filter((t) => t.id !== track.id)]);
  }, []);

  const handleNextTrack = () => {
    if (queue.length === 0) return;
    if (isShuffle) {
      const nextIdx = Math.floor(Math.random() * queue.length);
      setCurrentTrackIndex(nextIdx);
    } else {
      setCurrentTrackIndex((prev) => (prev + 1) % queue.length);
    }
    setProgress(0);
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
    setQueue((prev) =>
      prev.map((t) => (t.id === track.id ? { ...t, isFavorite: !t.isFavorite } : t)),
    );
  };

  const handleSearchSubmit = () => {
    setActiveTab('search');
    setRoute({ view: 'search' });
  };

  return (
    <>
      <AppShell
        topbar={
          <TopBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
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
                className="h-full w-full overflow-hidden flex flex-col"
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
                progressSeconds={progress}
                onSeek={(sec) => setProgress(sec)}
              />
            )}

            {/* VIEW 8: SOURCES (Matches Screenshot 10) */}
            {route.view === 'sources' && <SourcesPage />}

            {/* VIEW 9: SEARCH */}
            {route.view === 'search' && (
              <SearchPage
                initialQuery={searchQuery}
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
              onRemoveTrack={(trackId) => setQueue((prev) => prev.filter((t) => t.id !== trackId))}
              onClearQueue={() => setQueue([])}
              onToggleCollapse={() => setIsRightCollapsed(!isRightCollapsed)}
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
          setProgress(Math.floor(e.currentTarget.currentTime));
        }}
        onDurationChange={(e) => {
          const dur = Math.floor(e.currentTarget.duration);
          if (dur > 0 && (!currentTrack.durationSeconds || currentTrack.durationSeconds === 0)) {
            setQueue((prev) =>
              prev.map((t, idx) => (idx === currentTrackIndex ? { ...t, durationSeconds: dur } : t))
            );
          }
        }}
        onEnded={() => {
          if (repeatMode === 'one') {
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(console.warn);
            }
          } else {
            handleNextTrack();
          }
        }}
      />
    </>
  );
}
