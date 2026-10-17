import { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  Disc,
  ChevronLeft,
} from 'lucide-react';
import {
  Button,
  Input,
  TrackRow,
  Track,
  Modal,
} from './components/ui';
import {
  AppShell,
  Sidebar,
  MainContent,
  NavItemKey,
} from './components/layout';
import { NowPlayingBar, QueuePanel } from './components/player';
import HomePage from './app/page';
import SearchPage from './app/search/page';
import ArtistPage from './app/artist/[id]/page';
import AlbumPage from './app/album/[id]/page';
import SettingsPage from './app/settings/page';
import PluginsPage from './app/plugins/page';
import { LyricsView } from './components/lyrics';
import { parseLrc, SAMPLE_MIDNIGHT_CITY_LRC } from './lyrics/parser';
import { GenreQuizModal } from './components/onboarding';
import { getSlothSettings } from './services/settingsStore';
import {
  AccentPalette,
  setAccentPalette,
  getCurrentAccent,
} from './styles/tokens';

const SAMPLE_TRACKS: Track[] = [
  {
    id: '1',
    title: 'Midnight City',
    artist: 'M83',
    album: "Hurry Up, We're Dreaming",
    durationSeconds: 243,
    coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80',
    isFavorite: true,
  },
  {
    id: '2',
    title: 'Starboy',
    artist: 'The Weeknd, Daft Punk',
    album: 'Starboy',
    durationSeconds: 230,
    coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&q=80',
    isFavorite: false,
  },
  {
    id: '3',
    title: 'Resonance',
    artist: 'HOME',
    album: 'Odyssey',
    durationSeconds: 212,
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
    isFavorite: true,
  },
  {
    id: '4',
    title: 'Instant Crush',
    artist: 'Daft Punk ft. Julian Casablancas',
    album: 'Random Access Memories',
    durationSeconds: 337,
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80',
    isFavorite: false,
  },
  {
    id: '5',
    title: 'Veridis Quo',
    artist: 'Daft Punk',
    album: 'Discovery',
    durationSeconds: 344,
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80',
    isFavorite: true,
  },
  {
    id: '6',
    title: 'Days of Thunder',
    artist: 'The Midnight',
    album: 'Days of Thunder',
    durationSeconds: 329,
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&q=80',
    isFavorite: false,
  },
  {
    id: '7',
    title: 'Neon Drift (Discovery Gem)',
    artist: 'Lorn & Kavinsky',
    album: 'Underground Electronic Archives',
    durationSeconds: 274,
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&q=80',
    isFavorite: false,
    isDiscoverySlot: true,
    badge: 'New',
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<NavItemKey>('home');
  const [route, setRoute] = useState<{
    view: 'home' | 'search' | 'artist' | 'album' | 'library' | 'playlists' | 'plugins' | 'settings';
    id?: string;
  }>({ view: 'home' });
  const [currentAccent, setCurrentAccent] = useState<AccentPalette>('green');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  const handleTabChange = (tab: NavItemKey) => {
    setActiveTab(tab);
    setRoute({ view: tab });
  };

  // Playback state
  const [tracks, setTracks] = useState<Track[]>(SAMPLE_TRACKS);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const currentTrack = tracks[currentTrackIndex] || SAMPLE_TRACKS[0];

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(42);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);

  // Search input state
  const [searchQuery, setSearchQuery] = useState('');

  // Sync initial accent and check onboarding on mount
  useEffect(() => {
    const acc = getCurrentAccent();
    setCurrentAccent(acc);
    setAccentPalette(acc);

    const userSettings = getSlothSettings();
    if (!userSettings.onboardingCompleted) {
      setIsOnboardingOpen(true);
    }
  }, []);

  // Simulated progress timer when playing
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= currentTrack.durationSeconds) {
          // Track ended, handle repeat or next
          if (repeatMode === 'one') return 0;
          handleNextTrack();
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack.durationSeconds, repeatMode]);

  const handleAccentChange = (accent: AccentPalette) => {
    setCurrentAccent(accent);
    setAccentPalette(accent);
  };

  const handleFavoriteToggle = (track: Track) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === track.id ? { ...t, isFavorite: !t.isFavorite } : t)),
    );
  };

  const handlePlayTrack = (track: Track) => {
    const idx = tracks.findIndex((t) => t.id === track.id);
    if (idx !== -1) {
      setCurrentTrackIndex(idx);
    }
    setProgress(0);
    setIsPlaying(true);
  };

  const handleNextTrack = () => {
    if (isShuffle) {
      const nextIdx = Math.floor(Math.random() * tracks.length);
      setCurrentTrackIndex(nextIdx);
    } else {
      setCurrentTrackIndex((prev) => (prev + 1) % tracks.length);
    }
    setProgress(0);
  };

  const handlePreviousTrack = () => {
    if (progress > 3) {
      setProgress(0);
    } else {
      setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
      setProgress(0);
    }
  };

  const handleRepeatToggle = () => {
    const nextMode: Record<string, 'off' | 'all' | 'one'> = {
      off: 'all',
      all: 'one',
      one: 'off',
    };
    setRepeatMode(nextMode[repeatMode]);
  };


  return (
    <>
    <AppShell
      topbar={
        <div className="h-12 px-4 flex items-center justify-between bg-[var(--surface)] select-none">
          {/* Back button + Search Bar */}
          <div className="flex items-center gap-3">
            {(route.view === 'artist' || route.view === 'album') && (
              <button
                type="button"
                onClick={() => {
                  setRoute({ view: 'home' });
                  setActiveTab('home');
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-[4px] bg-[var(--surface-raised)] hover:bg-[var(--surface-raised)]/80 border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-white cursor-pointer transition-colors"
                title="Back to Dashboard"
              >
                <ChevronLeft size={14} />
                <span>Back</span>
              </button>
            )}

            <div className="w-72 md:w-80">
              <Input
                placeholder="Search tracks, artists, albums..."
                size="sm"
                value={searchQuery}
                onFocus={() => {
                  setRoute({ view: 'search' });
                  setActiveTab('search');
                }}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (route.view !== 'search') {
                    setRoute({ view: 'search' });
                    setActiveTab('search');
                  }
                }}
                startAddon={<Search size={14} className="text-[var(--text-muted)]" />}
                className="bg-[var(--background)] border-[var(--border)]"
              />
            </div>
          </div>

          {/* Quick Stats & System Badges */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-[3px] bg-[var(--background)] border border-[var(--border)] text-[10px] font-mono text-[var(--text-secondary)]">
              <span className="size-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
              <span>OKLCH DESIGN TOKENS</span>
            </div>

            <Button
              size="xs"
              variant="secondary"
              onClick={() => setIsModalOpen(true)}
              className="font-mono text-[11px]"
            >
              <Sparkles size={12} className="mr-1 text-[var(--color-accent)]" />
              Token Specs
            </Button>
          </div>
        </div>
      }
      sidebar={
        <Sidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          currentAccent={currentAccent}
          onAccentChange={handleAccentChange}
        />
      }
      mainContent={
        <MainContent>
          {isLyricsOpen ? (
            <LyricsView
              trackTitle={currentTrack.title}
              artistName={currentTrack.artist}
              albumName={currentTrack.album}
              lyrics={parseLrc(SAMPLE_MIDNIGHT_CITY_LRC)}
              progressSeconds={progress}
              totalDurationSeconds={currentTrack.durationSeconds}
              onSeek={(sec) => setProgress(sec)}
              onClose={() => setIsLyricsOpen(false)}
              trackId={currentTrack.id}
            />
          ) : (
            <>
              {/* VIEW: HOME DASHBOARD */}
              {route.view === 'home' && (
            <HomePage
              onPlayTrack={handlePlayTrack}
              onPlayAlbum={() => handlePlayTrack(tracks[0])}
              onSelectArtist={(artistId) => setRoute({ view: 'artist', id: artistId })}
              onSelectAlbum={(albumId) => setRoute({ view: 'album', id: albumId })}
              currentTrackId={currentTrack.id}
              isPlaying={isPlaying}
            />
          )}

          {/* VIEW: SEARCH CATALOG */}
          {route.view === 'search' && (
            <SearchPage
              onPlayTrack={handlePlayTrack}
              onSelectArtist={(artistId) => setRoute({ view: 'artist', id: artistId })}
              onSelectAlbum={(albumId) => setRoute({ view: 'album', id: albumId })}
              currentTrackId={currentTrack.id}
              isPlaying={isPlaying}
            />
          )}

          {/* VIEW: ARTIST PAGE */}
          {route.view === 'artist' && (
            <ArtistPage
              artistId={route.id || 'm83'}
              onPlayTrack={handlePlayTrack}
              onPlayArtist={() => handlePlayTrack(tracks[0])}
              onSelectAlbum={(albumId) => setRoute({ view: 'album', id: albumId })}
              onSelectArtist={(artistId) => setRoute({ view: 'artist', id: artistId })}
              currentTrackId={currentTrack.id}
              isPlaying={isPlaying}
            />
          )}

          {/* VIEW: ALBUM PAGE */}
          {route.view === 'album' && (
            <AlbumPage
              albumId={route.id || 'alb-1'}
              onPlayTrack={handlePlayTrack}
              onPlayAll={(albumTracks) => {
                setTracks(albumTracks);
                setCurrentTrackIndex(0);
                setProgress(0);
                setIsPlaying(true);
              }}
              onSelectArtist={(artistId) => setRoute({ view: 'artist', id: artistId })}
              currentTrackId={currentTrack.id}
              isPlaying={isPlaying}
            />
          )}

          {/* TAB 3: LIBRARY */}
          {activeTab === 'library' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold tracking-tight">Music Library</h1>
                <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                  Saved albums, offline cache, and favorite tracks
                </p>
              </div>

              {/* Favorites collection */}
              <div className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] font-mono">
                  Favorites ({tracks.filter((t) => t.isFavorite).length})
                </h2>
                <div className="rounded-[4px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden divide-y divide-[var(--border)]">
                  {tracks
                    .filter((t) => t.isFavorite)
                    .map((t, idx) => (
                      <TrackRow
                        key={t.id}
                        track={t}
                        index={idx}
                        isPlaying={isPlaying && currentTrack.id === t.id}
                        onPlay={() => handlePlayTrack(t)}
                        onFavoriteToggle={() => handleFavoriteToggle(t)}
                      />
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PLAYLISTS */}
          {activeTab === 'playlists' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold tracking-tight">Playlists</h1>
                <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                  Curated flows, AI smart-mixes, and station radios
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { title: 'Synthwave Nightride', count: '48 tracks', badge: 'Synthesizer' },
                  { title: 'Cyberpunk Lo-Fi', count: '32 tracks', badge: 'Focus' },
                  { title: 'French Touch & Electro', count: '64 tracks', badge: 'High Energy' },
                ].map((pl, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-[4px] bg-[var(--surface)] border border-[var(--border)] space-y-3 hover:border-[var(--color-accent)] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase bg-[var(--surface-raised)] px-2 py-0.5 rounded text-[var(--color-accent)] border border-[var(--border)]">
                        {pl.badge}
                      </span>
                      <Disc size={16} className="text-[var(--text-muted)] group-hover:text-[var(--color-accent)] transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">{pl.title}</h3>
                      <p className="text-xs text-[var(--text-muted)] font-mono">{pl.count}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: PLUGINS */}
          {activeTab === 'plugins' && (
            <PluginsPage />
          )}

          {/* TAB 6: SETTINGS */}
          {activeTab === 'settings' && (
            <SettingsPage />
          )}
            </>
          )}
        </MainContent>
      }
      playerBar={
        <NowPlayingBar
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          onNext={handleNextTrack}
          onPrevious={handlePreviousTrack}
          isShuffle={isShuffle}
          onShuffleToggle={() => setIsShuffle(!isShuffle)}
          repeatMode={repeatMode}
          onRepeatToggle={handleRepeatToggle}
          progressSeconds={progress}
          totalDurationSeconds={currentTrack.durationSeconds}
          onSeek={(sec) => setProgress(sec)}
          volume={volume}
          isMuted={isMuted}
          onVolumeChange={setVolume}
          onMuteToggle={() => setIsMuted(!isMuted)}
          isQueueOpen={isQueueOpen}
          onQueueToggle={() => setIsQueueOpen(!isQueueOpen)}
          isLyricsOpen={isLyricsOpen}
          onLyricsToggle={() => setIsLyricsOpen(!isLyricsOpen)}
          onFavoriteToggle={() => handleFavoriteToggle(currentTrack)}
        />
      }
    />

    {/* Draggable Queue Drawer Panel */}
    <QueuePanel
      isOpen={isQueueOpen}
      onClose={() => setIsQueueOpen(false)}
      queue={tracks}
      currentTrackId={currentTrack.id}
      isPlaying={isPlaying}
      onTrackSelect={(track) => {
        const idx = tracks.findIndex((t) => t.id === track.id);
        if (idx !== -1) {
          setCurrentTrackIndex(idx);
        }
        setIsPlaying(true);
      }}
      onRemoveTrack={(trackId) => {
        setTracks((prev) => prev.filter((t) => t.id !== trackId));
      }}
      onClearQueue={() => setTracks([])}
      onReorderQueue={(newQueue) => setTracks(newQueue)}
      onAddPickToQueue={(pick) => setTracks((prev) => [...prev, pick])}
    />

    {/* Token Specifications Modal */}
    <Modal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      title="Sloth Nuclear Design Tokens"
      description="Directly ported from Nuclear's visual layout and design system. Surface colors are encoded in OKLCH with user-selectable accent variables."
      actions={
        <>
          <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
            Close
          </Button>
          <Button variant="default" onClick={() => setIsModalOpen(false)}>
            Understood
          </Button>
        </>
      }
    >
      <div className="space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5">
          <span className="text-[var(--text-muted)]">--background:</span>
          <span className="text-[var(--color-accent)] font-semibold">oklch(0.25 0.012 245) (#1e2327)</span>
        </div>
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5">
          <span className="text-[var(--text-muted)]">--surface:</span>
          <span className="text-[var(--color-accent)] font-semibold">oklch(0.29 0.012 245) (#282d33)</span>
        </div>
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5">
          <span className="text-[var(--text-muted)]">--surface-raised:</span>
          <span className="text-[var(--color-accent)] font-semibold">oklch(0.33 0.012 245) (#31383f)</span>
        </div>
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5">
          <span className="text-[var(--text-muted)]">--border:</span>
          <span className="text-[var(--color-accent)] font-semibold">oklch(0.38 0.012 245) (#3d444c)</span>
        </div>
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5">
          <span className="text-[var(--text-muted)]">--sidebar-width:</span>
          <span className="text-[var(--text-primary)] font-semibold">220px (Fixed)</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-muted)]">--player-height:</span>
          <span className="text-[var(--text-primary)] font-semibold">72px (Fixed)</span>
        </div>
      </div>
    </Modal>

    {/* First-Launch Coldstart Genre Quiz Modal */}
    <GenreQuizModal
      isOpen={isOnboardingOpen}
      onClose={() => setIsOnboardingOpen(false)}
      onComplete={() => {
        setIsOnboardingOpen(false);
      }}
    />
    </>
  );
}
