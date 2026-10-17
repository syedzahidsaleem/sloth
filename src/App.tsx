import { useState, useEffect } from 'react';
import {
  Home,
  Search,
  Library,
  Heart,
  Sun,
  Moon,
  Sparkles,
  Sliders,
  Play,
  Share2,
} from 'lucide-react';
import {
  Button,
  Box,
  Badge,
  Input,
  Toggle,
  Slider,
  Tabs,
  Modal,
  ContextMenu,
  ContextMenuItem,
  ContextMenuSeparator,
  AlbumCard,
  ArtistCard,
  TrackRow,
  Track,
  Sidebar,
  SidebarItem,
  SidebarSection,
  PlayerBar,
} from './components/ui';

const SAMPLE_TRACKS: Track[] = [
  {
    id: '1',
    title: 'Midnight City',
    artist: 'M83',
    album: 'Hurry Up, We\'re Dreaming',
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
];

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [themeId, setThemeId] = useState('default');
  const [isSidebarCompact, setIsSidebarCompact] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Playback state
  const [currentTrack, setCurrentTrack] = useState<Track>(SAMPLE_TRACKS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(42);
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [tracks, setTracks] = useState(SAMPLE_TRACKS);

  // Playground interactive state
  const [toggleVal, setToggleVal] = useState(true);
  const [sliderVal, setSliderVal] = useState(65);
  const [inputVal, setInputVal] = useState('Synthwave Vibes');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    if (themeId !== 'default') {
      document.documentElement.setAttribute('data-theme-id', `nuclear:${themeId}`);
    } else {
      document.documentElement.removeAttribute('data-theme-id');
    }
  }, [isDark, themeId]);

  const handleFavoriteToggle = (track: Track) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === track.id ? { ...t, isFavorite: !t.isFavorite } : t)),
    );
    if (currentTrack.id === track.id) {
      setCurrentTrack((prev) => ({ ...prev, isFavorite: !prev.isFavorite }));
    }
  };

  const handlePlayTrack = (track: Track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
  };

  return (
    <div className="surface-background text-foreground flex h-screen w-screen flex-col overflow-hidden font-sans">
      {/* Top Header Bar */}
      <header className="surface-topbar border-border grid h-14 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-4 border-b-(length:--border-width) px-4 select-none">
        <div className="flex items-center gap-3">
          <div className="surface-primary border-border shadow-shadow flex size-9 items-center justify-center rounded-md border-(length:--border-width) font-heading text-lg font-extrabold">
            🦥
          </div>
          <span className="font-heading hidden text-lg font-extrabold tracking-tight sm:inline">
            Sloth
          </span>
          <Badge variant="pill" color="green" animated>
            Ready
          </Badge>
        </div>

        {/* Search Input */}
        <div className="mx-auto w-full max-w-md">
          <Input
            placeholder="Search songs, artists, albums..."
            startAddon={<Search size={16} />}
            size="sm"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
          />
        </div>

        {/* Theme Selectors & Actions */}
        <div className="flex items-center gap-2">
          {/* Theme Pill Buttons */}
          <div className="hidden items-center gap-1 sm:flex">
            {(['default', 'aurora', 'ember'] as const).map((id) => (
              <Button
                key={id}
                size="xs"
                variant={themeId === id ? 'default' : 'text'}
                onClick={() => setThemeId(id)}
                className="capitalize"
              >
                {id}
              </Button>
            ))}
          </div>

          <Button
            size="icon-sm"
            variant="secondary"
            onClick={() => setIsDark(!isDark)}
            aria-label="Toggle theme mode"
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </Button>

          <Button
            size="sm"
            variant="default"
            onClick={() => setIsModalOpen(true)}
          >
            <Sparkles size={14} className="mr-1.5" />
            Tokens
          </Button>
        </div>
      </header>

      {/* Workspace Area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Collapsible Sidebar */}
        <Sidebar
          isCompact={isSidebarCompact}
          onToggleCompact={() => setIsSidebarCompact(!isSidebarCompact)}
        >
          <SidebarSection isCompact={isSidebarCompact}>
            <SidebarItem
              icon={<Home size={18} />}
              label="Home"
              isActive={activeTab === 'home'}
              onClick={() => setActiveTab('home')}
              isCompact={isSidebarCompact}
            />
            <SidebarItem
              icon={<Library size={18} />}
              label="Library"
              isActive={activeTab === 'library'}
              onClick={() => setActiveTab('library')}
              isCompact={isSidebarCompact}
            />
            <SidebarItem
              icon={<Heart size={18} />}
              label="Favorites"
              isActive={activeTab === 'favorites'}
              onClick={() => setActiveTab('favorites')}
              badge={<Badge variant="dot" color="red" />}
              isCompact={isSidebarCompact}
            />
            <SidebarItem
              icon={<Sliders size={18} />}
              label="UI Playground"
              isActive={activeTab === 'playground'}
              onClick={() => setActiveTab('playground')}
              isCompact={isSidebarCompact}
            />
          </SidebarSection>
        </Sidebar>

        {/* Main Content Area */}
        <main className="surface-background flex-1 overflow-y-auto p-6">
          {activeTab === 'home' && (
            <div className="mx-auto max-w-6xl space-y-8">
              {/* Featured Section */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-heading text-2xl font-extrabold tracking-tight">
                      Featured Releases
                    </h2>
                    <p className="text-foreground/60 text-sm">
                      Ported Nuclear AlbumCard with hover-action and OKLCH neobrutalist shadows
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  <AlbumCard
                    title="Odyssey"
                    subtitle="HOME • 2014"
                    coverUrl="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80"
                    badge={<Badge variant="pill" color="purple">Hi-Res</Badge>}
                    onPlay={() => handlePlayTrack(SAMPLE_TRACKS[2])}
                  />
                  <AlbumCard
                    title="Random Access Memories"
                    subtitle="Daft Punk • 2013"
                    coverUrl="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80"
                    badge={<Badge variant="pill" color="yellow">Lossless</Badge>}
                    onPlay={() => handlePlayTrack(SAMPLE_TRACKS[3])}
                  />
                  <AlbumCard
                    title="Hurry Up, We're Dreaming"
                    subtitle="M83 • 2011"
                    coverUrl="https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&q=80"
                    badge={<Badge variant="pill" color="cyan">Electronic</Badge>}
                    onPlay={() => handlePlayTrack(SAMPLE_TRACKS[0])}
                  />
                  <AlbumCard
                    title="Starboy"
                    subtitle="The Weeknd • 2016"
                    coverUrl="https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&q=80"
                    onPlay={() => handlePlayTrack(SAMPLE_TRACKS[1])}
                  />
                </div>
              </div>

              {/* Popular Artists */}
              <div>
                <h2 className="font-heading mb-4 text-2xl font-extrabold tracking-tight">
                  Popular Artists
                </h2>
                <div className="flex flex-wrap gap-4">
                  <ArtistCard
                    name="Daft Punk"
                    role="Electronic Duo"
                    imageUrl="https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80"
                  />
                  <ArtistCard
                    name="M83"
                    role="Synthpop / Dream Pop"
                    imageUrl="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80"
                  />
                  <ArtistCard
                    name="The Weeknd"
                    role="R&B / Pop"
                    imageUrl="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80"
                  />
                </div>
              </div>

              {/* Top Tracks Table */}
              <div>
                <h2 className="font-heading mb-3 text-2xl font-extrabold tracking-tight">
                  Queue & Top Tracks
                </h2>
                <Box variant="tertiary" className="overflow-hidden p-0">
                  <div className="w-full">
                    {tracks.map((track, i) => (
                      <TrackRow
                        key={track.id}
                        track={track}
                        index={i}
                        isPlaying={isPlaying && currentTrack.id === track.id}
                        isCurrent={currentTrack.id === track.id}
                        onPlay={handlePlayTrack}
                        onFavoriteToggle={handleFavoriteToggle}
                        onAddToQueue={(t) => console.log('Added to queue:', t.title)}
                      />
                    ))}
                  </div>
                </Box>
              </div>
            </div>
          )}

          {activeTab === 'playground' && (
            <div className="mx-auto max-w-4xl space-y-8">
              <div>
                <h2 className="font-heading text-2xl font-extrabold">
                  Nuclear UI Component Port Matrix
                </h2>
                <p className="text-foreground/70 text-sm">
                  Interactive testing bench verifying exact OKLCH values, CVA variants, and Motion interactions
                </p>
              </div>

              {/* Tabs Component */}
              <Tabs
                items={[
                  {
                    id: 'buttons',
                    label: 'Buttons & Badges',
                    content: (
                      <div className="space-y-6 pt-4">
                        <Box variant="secondary" className="flex flex-wrap items-center gap-3">
                          <Button variant="default">Primary Button</Button>
                          <Button variant="secondary">Secondary</Button>
                          <Button variant="tertiary">Tertiary</Button>
                          <Button variant="noShadow">No Shadow</Button>
                          <Button variant="ghost">Ghost</Button>
                          <Button variant="default" intent="danger">Danger</Button>
                        </Box>

                        <Box variant="secondary" className="flex flex-wrap items-center gap-3">
                          <Badge variant="pill" color="green">Green Pill</Badge>
                          <Badge variant="pill" color="cyan">Cyan Pill</Badge>
                          <Badge variant="pill" color="orange">Orange Pill</Badge>
                          <Badge variant="pill" color="red">Red Pill</Badge>
                          <Badge variant="pill" color="yellow">Yellow Pill</Badge>
                          <Badge variant="pill" color="purple">Purple Pill</Badge>
                          <Badge variant="dot" color="green" animated />
                          <Badge variant="dot" color="red" />
                        </Box>
                      </div>
                    ),
                  },
                  {
                    id: 'inputs',
                    label: 'Inputs & Controls',
                    content: (
                      <div className="space-y-6 pt-4">
                        <Box variant="secondary" className="max-w-md space-y-4">
                          <Input
                            label="Track Title"
                            placeholder="Enter song name..."
                            description="Will be cross-referenced with Meld ISRC matcher"
                          />
                          <Input
                            label="Bitrate Limit (kbps)"
                            variant="number"
                            placeholder="320"
                            endAddon="kbps"
                          />
                          <div className="flex items-center justify-between pt-2">
                            <span className="text-sm font-semibold">Enable SponsorBlock skips</span>
                            <Toggle
                              checked={toggleVal}
                              onChange={setToggleVal}
                              label="SponsorBlock toggle"
                            />
                          </div>
                        </Box>
                      </div>
                    ),
                  },
                  {
                    id: 'sliders',
                    label: 'Sliders & Feedback',
                    content: (
                      <div className="space-y-6 pt-4">
                        <Box variant="secondary" className="max-w-md space-y-6">
                          <Slider
                            label="Equalizer Bass Boost"
                            unit="dB"
                            value={sliderVal}
                            min={0}
                            max={100}
                            onValueChange={setSliderVal}
                            startLabel="0 dB"
                            endLabel="+12 dB"
                          />

                          <ContextMenu
                            trigger={
                              <Button variant="default">
                                Right-Click or Click for Context Menu
                              </Button>
                            }
                          >
                            <ContextMenuItem icon={<Play size={14} />} label="Play Next" />
                            <ContextMenuItem icon={<Share2 size={14} />} label="Share Track" />
                            <ContextMenuSeparator />
                            <ContextMenuItem label="Inspect Audio Stream" />
                          </ContextMenu>
                        </Box>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          )}

          {activeTab !== 'home' && activeTab !== 'playground' && (
            <div className="flex h-96 items-center justify-center">
              <Box variant="secondary" className="max-w-sm text-center">
                <h3 className="font-heading text-lg font-bold">Section: {activeTab}</h3>
                <p className="text-foreground/60 mt-1 text-sm">
                  Navigate back to Home or UI Playground to test ported components.
                </p>
                <Button className="mt-4" onClick={() => setActiveTab('home')}>
                  Return Home
                </Button>
              </Box>
            </div>
          )}
        </main>
      </div>

      {/* Bottom PlayerBar */}
      <PlayerBar
        title={currentTrack.title}
        artist={currentTrack.artist}
        coverUrl={currentTrack.coverUrl}
        isFavorite={currentTrack.isFavorite}
        onFavoriteToggle={() => handleFavoriteToggle(currentTrack)}
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        progressSeconds={progress}
        totalDurationSeconds={currentTrack.durationSeconds}
        onSeek={(sec) => setProgress(sec)}
        volume={volume}
        isMuted={isMuted}
        onVolumeChange={setVolume}
        onMuteToggle={() => setIsMuted(!isMuted)}
      />

      {/* Modal Dialog */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nuclear Design Tokens Extracted"
        description="The full OKLCH color token schema, neobrutalist shadows, and typography standards have been ported directly from nuclear/packages/tailwind-config/global.css."
        actions={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Close
            </Button>
            <Button variant="default" onClick={() => setIsModalOpen(false)}>
              Got it
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between border-b pb-1">
            <span className="font-mono">--background:</span>
            <span className="font-mono text-primary">oklch(0.22 0.03 5)</span>
          </div>
          <div className="flex items-center justify-between border-b pb-1">
            <span className="font-mono">--card:</span>
            <span className="font-mono text-primary">oklch(0.5 0.1 5)</span>
          </div>
          <div className="flex items-center justify-between border-b pb-1">
            <span className="font-mono">--shadow-shadow:</span>
            <span className="font-mono text-primary">2px 2px 0px 0px var(--border)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono">Spring physics:</span>
            <span className="font-mono">stiffness: 400, damping: 24</span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
