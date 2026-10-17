import { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  Sliders,
  Play,
  Check,
  Disc,
  Cpu,
} from 'lucide-react';
import {
  Button,
  Badge,
  Input,
  AlbumCard,
  TrackRow,
  Track,
  Modal,
} from './components/ui';
import {
  AppShell,
  Sidebar,
  PlayerBar,
  MainContent,
  NavItemKey,
} from './components/layout';
import {
  AccentPalette,
  ACCENTS,
  setAccentPalette,
  getCurrentAccent,
} from './styles/tokens';
import { SourcesPanel } from './components/settings/SourcesPanel';

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
];

export default function App() {
  const [activeTab, setActiveTab] = useState<NavItemKey>('home');
  const [currentAccent, setCurrentAccent] = useState<AccentPalette>('green');
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  // Sync initial accent on mount
  useEffect(() => {
    const acc = getCurrentAccent();
    setCurrentAccent(acc);
    setAccentPalette(acc);
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

  // Filtered tracks for search tab
  const filteredTracks = tracks.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.album || '').toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <>
    <AppShell
      topbar={
        <div className="h-12 px-4 flex items-center justify-between bg-[var(--surface)] select-none">
          {/* Search Bar in Topbar */}
          <div className="flex items-center gap-3 w-80">
            <Input
              placeholder="Search tracks, artists, albums..."
              size="sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              startAddon={<Search size={14} className="text-[var(--text-muted)]" />}
              className="bg-[var(--background)] border-[var(--border)]"
            />
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
          onTabChange={setActiveTab}
          currentAccent={currentAccent}
          onAccentChange={handleAccentChange}
        />
      }
      mainContent={
        <MainContent>
          {/* TAB 1: HOME */}
          {activeTab === 'home' && (
            <div className="space-y-8 animate-fadeIn">
              {/* Hero Banner with Bento Highlights */}
              <div className="p-6 rounded-[6px] bg-[var(--surface)] border border-[var(--border)] relative overflow-hidden">
                <div className="relative z-10 max-w-2xl space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="pill" color="green">
                      Nuclear Lineage
                    </Badge>
                    <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase">
                      Tactile Flat Neobrutalism
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                    Unified Music Architecture
                  </h1>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Sloth combines Nuclear&apos;s modular source architecture, Meld&apos;s hypergraph recommendations,
                    and Spotube&apos;s precise media streaming into a high-density, low-latency desktop player.
                  </p>
                  <div className="pt-2 flex items-center gap-3">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handlePlayTrack(SAMPLE_TRACKS[0])}
                    >
                      <Play size={13} className="mr-1.5 fill-current" />
                      Play Featured
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setActiveTab('settings')}
                    >
                      <Sliders size={13} className="mr-1.5" />
                      Theme Accents
                    </Button>
                  </div>
                </div>
              </div>

              {/* Featured Albums Bento Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
                    Featured Releases
                  </h2>
                  <span className="text-[11px] font-mono text-[var(--text-muted)]">
                    6 Curated Masters
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {tracks.map((t) => (
                    <AlbumCard
                      key={t.id}
                      title={t.title}
                      subtitle={`${t.artist} • ${t.album}`}
                      coverUrl={t.coverUrl}
                      badge={t.isFavorite ? <Badge variant="dot" color="red" /> : undefined}
                      onPlay={() => handlePlayTrack(t)}
                    />
                  ))}
                </div>
              </div>

              {/* Top Tracks High-Density Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
                    Recommended Queue
                  </h2>
                  <span className="text-[11px] font-mono text-[var(--text-muted)]">
                    ISRC Level Matching
                  </span>
                </div>

                <div className="rounded-[4px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden divide-y divide-[var(--border)]">
                  {tracks.map((t, idx) => (
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

          {/* TAB 2: SEARCH */}
          {activeTab === 'search' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold tracking-tight">Search Catalog</h1>
                <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                  Query across YouTube Music, Piped, and local SQLite database
                </p>
              </div>

              <div className="max-w-xl">
                <Input
                  placeholder="Filter track, artist, album name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  startAddon={<Search size={16} />}
                  className="bg-[var(--surface)] border-[var(--border)]"
                />
              </div>

              <div className="space-y-2">
                <div className="text-xs font-mono uppercase text-[var(--text-muted)]">
                  Found {filteredTracks.length} Results
                </div>

                <div className="rounded-[4px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden divide-y divide-[var(--border)]">
                  {filteredTracks.map((t, idx) => (
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

          {/* TAB 5: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-3xl">
              <div>
                <h1 className="text-xl font-bold tracking-tight">Settings & Customization</h1>
                <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                  Configure OKLCH accent palettes, audio streaming buffer, and source credentials
                </p>
              </div>

              {/* Accent Palette Selector Section */}
              <div className="p-5 rounded-[4px] bg-[var(--surface)] border border-[var(--border)] space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Theme Accent Color
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    User-selectable via <code className="font-mono text-[var(--color-accent)]">--color-accent</code> CSS custom property.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {(Object.keys(ACCENTS) as AccentPalette[]).map((paletteKey) => {
                    const def = ACCENTS[paletteKey];
                    const isSelected = currentAccent === paletteKey;

                    return (
                      <button
                        key={paletteKey}
                        type="button"
                        onClick={() => handleAccentChange(paletteKey)}
                        className={`flex items-center gap-3 p-3 rounded-[4px] border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'border-[var(--color-accent)] bg-[var(--surface-raised)] shadow-xs'
                            : 'border-[var(--border)] bg-[var(--background)] hover:border-[var(--text-muted)]'
                        }`}
                      >
                        <span
                          className="size-6 rounded-[3px] border border-black/30 shrink-0 flex items-center justify-center"
                          style={{ backgroundColor: def.hex }}
                        >
                          {isSelected && <Check size={14} className="text-black font-bold" />}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                            {def.label}
                          </span>
                          <span className="text-[10px] font-mono text-[var(--text-muted)] truncate">
                            {def.hex}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nuclear-Style Audio Source Fallback Registry */}
              <SourcesPanel />

              {/* Engine Status & Source Diagnostics */}
              <div className="p-5 rounded-[4px] bg-[var(--surface)] border border-[var(--border)] space-y-3">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Cpu size={16} className="text-[var(--color-accent)]" />
                  Engine Diagnostics
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
                  <div className="p-2.5 rounded-[4px] bg-[var(--background)] border border-[var(--border)]">
                    <span className="text-[10px] text-[var(--text-muted)] block">FastAPI Engine</span>
                    <span className="text-[var(--color-accent)] font-bold">127.0.0.1:8000</span>
                  </div>
                  <div className="p-2.5 rounded-[4px] bg-[var(--background)] border border-[var(--border)]">
                    <span className="text-[10px] text-[var(--text-muted)] block">Piped Streams</span>
                    <span className="text-[var(--color-accent)] font-bold">Connected</span>
                  </div>
                  <div className="p-2.5 rounded-[4px] bg-[var(--background)] border border-[var(--border)]">
                    <span className="text-[10px] text-[var(--text-muted)] block">Audio Driver</span>
                    <span className="text-[var(--text-primary)] font-bold">Web Audio API</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </MainContent>
      }
      playerBar={
        <PlayerBar
          title={currentTrack.title}
          artist={currentTrack.artist}
          coverUrl={currentTrack.coverUrl}
          isFavorite={currentTrack.isFavorite}
          onFavoriteToggle={() => handleFavoriteToggle(currentTrack)}
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
        />
      }
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
    </>
  );
}
