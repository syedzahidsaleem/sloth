import { useState, useEffect, useMemo, FC } from 'react';
import {
  Play,
  Pause,
  Plus,
  Heart,
  Image as ImageIcon,
  SlidersHorizontal,
  X,
  Music,
  Loader2,
} from 'lucide-react';
import { Track } from '@/components/ui/TrackRow';
import { cn } from '@/lib/utils';

export interface SearchPageProps {
  initialQuery?: string;
  onPlayTrack?: (track: Track) => void;
  onPlayAll?: (tracks: Track[]) => void;
  onAddAll?: (tracks: Track[]) => void;
  onSelectArtist?: (artistId: string) => void;
  onSelectAlbum?: (albumId: string) => void;
  currentTrackId?: string;
  isPlaying?: boolean;
}

export const ALL_SEARCHABLE_TRACKS: Track[] = [
  {
    id: 'yt-PJWemSzExXs',
    title: 'BAARISHEIN (Studio) Anuv Jain',
    artist: 'Anuv Jain',
    album: 'Single',
    durationSeconds: 208,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/a7/46/2f/a7462f7e-6dde-b235-2f5e-90e31af919a7/7799192004134_cover.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/22/a0/7d/22a07d46-b904-0717-95da-ec335aac6407/mzaf_13582924850644616784.plus.aac.p.m4a',
    isFavorite: true,
  },
  {
    id: 'yt-NLKwRW2y-sg',
    title: 'Anuv Jain - BAARISHEIN (ACOUSTIC)',
    artist: 'Anuv Jain',
    album: 'Acoustic Sessions',
    durationSeconds: 215,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/a7/46/2f/a7462f7e-6dde-b235-2f5e-90e31af919a7/7799192004134_cover.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/22/a0/7d/22a07d46-b904-0717-95da-ec335aac6407/mzaf_13582924850644616784.plus.aac.p.m4a',
    isFavorite: false,
  },
  {
    id: 'yt-Arko-Atif',
    title: 'BAARISHEIN Song | Arko Feat. Atif Aslam',
    artist: 'Arko Feat. Atif Aslam',
    album: 'Baarishein - Single',
    durationSeconds: 260,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music128/v4/da/cc/80/dacc8042-e493-4568-124e-38555270ac63/00602537882793.rgb.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/b4/f2/75/b4f2758c-0124-3da6-420a-074656306afa/mzaf_136391431314283786.plus.aac.p.m4a',
    isFavorite: true,
  },
  {
    id: 'trk-1',
    title: 'Midnight City',
    artist: 'M83',
    album: "Hurry Up, We're Dreaming",
    durationSeconds: 243,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/cb/7b/a9/cb7ba903-b5f1-cc21-90db-7a81b7aa0997/724596951057.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/24/09/79/2409794c-3d5d-af26-580e-7dc00ee4f207/mzaf_369629549966021675.plus.aac.p.m4a',
    isFavorite: true,
  },
  {
    id: 'trk-2',
    title: 'Starboy',
    artist: 'The Weeknd, Daft Punk',
    album: 'Starboy',
    durationSeconds: 230,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/b5/92/bb/b592bb72-52e3-e756-9b26-9f56d08f47ab/16UMGIM67864.rgb.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/11/71/d6/1171d6ad-3c96-e027-2af6-58028426588c/mzaf_15137631797407745471.plus.aac.p.m4a',
    isFavorite: false,
  },
  {
    id: 'trk-4',
    title: 'Instant Crush',
    artist: 'Daft Punk, Julian Casablancas',
    album: 'Random Access Memories',
    durationSeconds: 337,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/e8/43/5f/e8435ffa-b6b9-b171-40ab-4ff3959ab661/886443919266.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/dc/1e/c2/dc1ec21b-96a0-470c-ee89-2b09346fa847/mzaf_7827098614541126525.plus.aac.p.m4a',
    isFavorite: false,
  },
  {
    id: 'trk-5',
    title: 'Veridis Quo',
    artist: 'Daft Punk',
    album: 'Discovery',
    durationSeconds: 344,
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/fd/4a/77/fd4a77db-0ebc-d043-41a2-f32fa1bb0fb4/dj.qrikkdwj.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/e0/cc/c4/e0ccc4af-ad90-59fe-9a7c-9c32d1a3c380/mzaf_2643765405421046671.plus.aac.p.m4a',
    isFavorite: true,
  },
];

export const ALL_SEARCHABLE_ARTISTS: { id: string; name: string; role: string; imageUrl?: string }[] = [
  { id: 'anuv-jain', name: 'Anuv Jain', role: 'Singer-Songwriter', imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/a7/46/2f/a7462f7e-6dde-b235-2f5e-90e31af919a7/7799192004134_cover.jpg/600x600bb.jpg' },
  { id: 'atif-aslam', name: 'Atif Aslam', role: 'Playback Singer', imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music128/v4/da/cc/80/dacc8042-e493-4568-124e-38555270ac63/00602537882793.rgb.jpg/600x600bb.jpg' },
  { id: 'm83', name: 'M83', role: 'Electronic / Synth', imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/cb/7b/a9/cb7ba903-b5f1-cc21-90db-7a81b7aa0997/724596951057.jpg/600x600bb.jpg' },
  { id: 'daft-punk', name: 'Daft Punk', role: 'French House Duo', imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/e8/43/5f/e8435ffa-b6b9-b171-40ab-4ff3959ab661/886443919266.jpg/600x600bb.jpg' },
  { id: 'the-weeknd', name: 'The Weeknd', role: 'R&B / Pop', imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/b5/92/bb/b592bb72-52e3-e756-9b26-9f56d08f47ab/16UMGIM67864.rgb.jpg/600x600bb.jpg' },
  { id: 'dua-lipa', name: 'Dua Lipa', role: 'Pop / Disco', imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/6c/11/d6/6c11d681-aa3a-d59e-4c2e-f77e181026ab/190295092665.jpg/600x600bb.jpg' },
];

export const ALL_SEARCHABLE_ALBUMS: { id: string; title: string; subtitle: string; coverUrl?: string }[] = [
  { id: 'alb-hurry-up', title: "Hurry Up, We're Dreaming", subtitle: 'M83 • 2011', coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/cb/7b/a9/cb7ba903-b5f1-cc21-90db-7a81b7aa0997/724596951057.jpg/600x600bb.jpg' },
  { id: 'alb-random-access', title: 'Random Access Memories', subtitle: 'Daft Punk • 2013', coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/e8/43/5f/e8435ffa-b6b9-b171-40ab-4ff3959ab661/886443919266.jpg/600x600bb.jpg' },
  { id: 'alb-discovery', title: 'Discovery', subtitle: 'Daft Punk • 2001', coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/fd/4a/77/fd4a77db-0ebc-d043-41a2-f32fa1bb0fb4/dj.qrikkdwj.jpg/600x600bb.jpg' },
  { id: 'alb-starboy', title: 'Starboy', subtitle: 'The Weeknd • 2016', coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/b5/92/bb/b592bb72-52e3-e756-9b26-9f56d08f47ab/16UMGIM67864.rgb.jpg/600x600bb.jpg' },
  { id: 'alb-future-nostalgia', title: 'Future Nostalgia', subtitle: 'Dua Lipa • 2020', coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/6c/11/d6/6c11d681-aa3a-d59e-4c2e-f77e181026ab/190295092665.jpg/600x600bb.jpg' },
];

export const POPULAR_SEARCH_TAGS: string[] = [
  'Baarishein',
  'Anuv Jain',
  'Atif Aslam',
  'M83',
  'Daft Punk',
  'The Weeknd',
];

const formatSeconds = (sec?: number) => {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const SearchPage: FC<SearchPageProps> = ({
  initialQuery = 'baarishein',
  onPlayTrack,
  onPlayAll,
  onAddAll,
  currentTrackId,
  isPlaying = false,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<'tracks' | 'albums' | 'artists'>('tracks');
  const [filterText, setFilterText] = useState('');
  const [tracks, setTracks] = useState<Track[]>(ALL_SEARCHABLE_TRACKS);
  const [isLoading, setIsLoading] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set(['yt-PJWemSzExXs', 'trk-1', 'trk-3']));

  // Update query when initialQuery changes from topbar
  useEffect(() => {
    if (initialQuery !== undefined) {
      setQuery(initialQuery);
      setDebouncedQuery(initialQuery.trim());
    }
  }, [initialQuery]);

  // Debounce query typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch real tracks from engine / YouTube / iTunes
  useEffect(() => {
    const searchTerm = debouncedQuery || 'baarishein';
    let isCancelled = false;
    setIsLoading(true);

    const fetchTracks = async () => {
      try {
        // Try Python FastAPI engine endpoint
        const res = await fetch(
          `http://127.0.0.1:8001/api/search?q=${encodeURIComponent(searchTerm)}&limit=30`,
        );
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.results) && data.results.length > 0) {
            if (!isCancelled) {
              setTracks(
                data.results.map((r: any) => ({
                  id: r.id || `trk-${Math.random()}`,
                  title: r.title,
                  artist: r.artist,
                  album: r.album || 'Single',
                  durationSeconds: r.durationSeconds || 210,
                  coverUrl: r.coverUrl,
                  audioUrl: r.audioUrl,
                  isFavorite: favoriteIds.has(r.id),
                })),
              );
              setIsLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        // Engine request failed, proceed to iTunes fallback
      }

      // Fallback: iTunes Search API (fast, 100% genuine artist, title, artwork)
      try {
        const itunesRes = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=song&limit=30`,
        );
        if (itunesRes.ok) {
          const itunesData = await itunesRes.json();
          if (itunesData && Array.isArray(itunesData.results) && itunesData.results.length > 0) {
            if (!isCancelled) {
              setTracks(
                itunesData.results.map((r: any) => ({
                  id: `itunes-${r.trackId}`,
                  title: r.trackName,
                  artist: r.artistName,
                  album: r.collectionName,
                  durationSeconds: Math.round((r.trackTimeMillis || 210000) / 1000),
                  coverUrl: (r.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
                  audioUrl: r.previewUrl,
                  isFavorite: favoriteIds.has(`itunes-${r.trackId}`),
                })),
              );
              setIsLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        // Network fallback
      }

      if (!isCancelled) {
        // If both remote sources returned nothing, filter from genuine seed catalog or show empty
        const trimmed = debouncedQuery.trim();
        const matched = trimmed
          ? ALL_SEARCHABLE_TRACKS.filter(
              (t) =>
                t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.artist.toLowerCase().includes(searchTerm.toLowerCase()),
            )
          : ALL_SEARCHABLE_TRACKS;
        setTracks(matched);
        setIsLoading(false);
      }
    };

    fetchTracks();

    return () => {
      isCancelled = true;
    };
  }, [debouncedQuery]);

  const toggleFavorite = (trackId: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
      } else {
        next.add(trackId);
      }
      return next;
    });
  };

  // Filtered tracks based on the toolbar "Filter tracks" input
  const filteredTracks = useMemo(() => {
    if (!filterText.trim()) return tracks;
    const lower = filterText.toLowerCase();
    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(lower) ||
        t.artist.toLowerCase().includes(lower) ||
        (t.album && t.album.toLowerCase().includes(lower)),
    );
  }, [tracks, filterText]);

  const handlePlayAll = () => {
    if (filteredTracks.length === 0) return;
    if (onPlayAll) {
      onPlayAll(filteredTracks);
    } else if (onPlayTrack) {
      onPlayTrack(filteredTracks[0]);
    }
  };

  const handleAddAll = () => {
    if (filteredTracks.length === 0) return;
    if (onAddAll) {
      onAddAll(filteredTracks);
    }
  };

  return (
    <div
      data-testid="search-page"
      className="surface-background min-h-full p-6 text-foreground font-sans select-none"
    >
      {/* Title & Query Header (Image 2) */}
      <div className="flex flex-col gap-1 pb-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Search
        </h1>
        <div className="text-sm font-medium text-foreground/60">
          Query: &ldquo;{debouncedQuery || query || 'baarishein'}&rdquo;
        </div>
      </div>

      {/* Tabs Row (Image 2: Tracks pill) */}
      <div className="flex items-center gap-2 pb-4">
        <button
          type="button"
          onClick={() => setActiveTab('tracks')}
          className={cn(
            'px-3.5 py-1.5 rounded-md text-xs font-bold border-2 border-border shadow-[2px_2px_0px_var(--border)] cursor-pointer transition-transform hover:scale-105 active:scale-95',
            activeTab === 'tracks'
              ? 'bg-[var(--primary)] text-foreground'
              : 'surface-muted text-foreground/70',
          )}
        >
          Tracks
        </button>
      </div>

      {/* Action Toolbar (Image 2: Play all, Add all, Filter tracks) */}
      <div className="flex items-center justify-between gap-4 pb-3">
        {/* Left: Play all, Add all */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePlayAll}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-[var(--primary)] text-foreground font-bold text-xs border-2 border-border shadow-[2px_2px_0px_var(--border)] cursor-pointer hover:scale-105 active:scale-95 transition-transform"
          >
            <Play size={13} fill="currentColor" />
            <span>Play all</span>
          </button>
          <button
            type="button"
            onClick={handleAddAll}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md surface-muted text-foreground font-bold text-xs border-2 border-border shadow-[2px_2px_0px_var(--border)] cursor-pointer hover:scale-105 active:scale-95 transition-transform"
          >
            <Plus size={14} />
            <span>Add all</span>
          </button>
        </div>

        {/* Right: Filter tracks input + filter icon */}
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <input
              type="text"
              placeholder="Filter tracks"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="h-7.5 w-44 rounded-md border-2 border-border surface-background text-foreground placeholder:text-foreground/50 px-2.5 text-xs font-medium shadow-[2px_2px_0px_var(--border)] outline-none focus:border-foreground transition-colors"
            />
            {filterText && (
              <button
                type="button"
                onClick={() => setFilterText('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <button
            type="button"
            className="size-7.5 rounded-md border-2 border-border surface-muted text-foreground flex items-center justify-center shadow-[2px_2px_0px_var(--border)] cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            title="Filter options"
          >
            <SlidersHorizontal size={13} />
          </button>
        </div>
      </div>

      {/* Main Track Table (Image 2 & Image 4) */}
      <div className="rounded-md border-2 border-border bg-muted overflow-hidden shadow-[2px_2px_0px_var(--border)]">
        {/* Table Header with Pink/Wine background & 2px border */}
        <div className="grid grid-cols-[44px_48px_minmax(140px,1.2fr)_minmax(160px,2fr)_80px] items-center surface-primary text-foreground border-b-2 border-border px-3 py-2 text-xs font-bold select-none">
          <div className="flex justify-center">
            <Heart size={15} />
          </div>
          <div className="flex justify-center">
            <ImageIcon size={15} />
          </div>
          <div className="text-left font-bold tracking-tight">Artist</div>
          <div className="text-left font-bold tracking-tight">Title</div>
          <div className="text-right pr-2 font-bold tracking-tight">Duration</div>
        </div>

        {/* Table Body */}
        {isLoading && tracks.length === 0 ? (
          <div className="flex items-center justify-center py-16 gap-2 text-foreground/60 text-xs font-medium">
            <Loader2 size={16} className="animate-spin text-foreground" />
            <span>Searching genuine music sources...</span>
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-foreground/60 text-xs">
            <Music size={28} className="opacity-40" />
            <span>No matching tracks found</span>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredTracks.map((track) => {
              const isCurrent = track.id === currentTrackId;
              const isFav = favoriteIds.has(track.id) || track.isFavorite;

              return (
                <div
                  key={track.id}
                  onClick={() => onPlayTrack?.(track)}
                  className={cn(
                    'grid grid-cols-[44px_48px_minmax(140px,1.2fr)_minmax(160px,2fr)_80px] items-center px-3 py-2 text-xs cursor-pointer transition-colors group select-none bg-muted text-foreground',
                    isCurrent
                      ? 'surface-primary font-bold'
                      : 'hover:bg-foreground/5',
                  )}
                >
                  {/* Heart / Favorite button */}
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(track.id);
                      }}
                      className="text-foreground/60 hover:text-red-500 cursor-pointer transition-colors p-1"
                      title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Heart
                        size={14}
                        fill={isFav ? '#ef4444' : 'none'}
                        className={isFav ? 'text-red-500' : ''}
                      />
                    </button>
                  </div>

                  {/* Artwork Image */}
                  <div className="flex justify-center">
                    <div className="size-8 rounded overflow-hidden border border-border/40 bg-black/10 shrink-0 relative">
                      {track.coverUrl ? (
                        <img
                          src={track.coverUrl}
                          alt=""
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="size-full flex items-center justify-center text-foreground/40">
                          <Music size={14} />
                        </div>
                      )}
                      {isCurrent && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                          {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Artist */}
                  <div className="truncate pr-2 font-medium text-foreground">
                    {track.artist}
                  </div>

                  {/* Title */}
                  <div className="truncate pr-2 font-bold text-foreground">
                    {track.title}
                  </div>

                  {/* Duration */}
                  <div className="font-mono text-xs tabular-nums text-foreground/80 text-right pr-2">
                    {formatSeconds(track.durationSeconds)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
