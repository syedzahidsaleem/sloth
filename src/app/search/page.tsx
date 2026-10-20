/**
 * Sloth UI — Search Page
 * Complete Live Search with Category Browsing, Real Counts & Tabs
 * Author: Syed Zahid Saleem <syedzahidsaleem2@gmail.com>
 */

import { useState, useEffect, useMemo, FC } from 'react';
import {
  Play,
  Pause,
  Plus,
  Heart,
  SlidersHorizontal,
  X,
  Music,
  Loader2,
  Sparkles,
  Disc,
  User,
  ListMusic,
} from 'lucide-react';
import { Track, TrackRow } from '@/components/ui/TrackRow';
import { ArtistCard } from '@/components/ui/ArtistCard';
import { AlbumCard } from '@/components/ui/AlbumCard';
import { PlaylistCard } from '@/components/ui/PlaylistCard';
import { usePlaylistStore } from '@/stores/playlistStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useQueueStore } from '@/stores/queueStore';
import { useToastStore } from '@/stores/toastStore';
import { cn } from '@/lib/utils';

export interface SearchPageProps {
  initialQuery?: string;
  onQueryChange?: (query: string) => void;
  onPlayTrack?: (track: Track) => void;
  onPlayAll?: (tracks: Track[]) => void;
  onAddAll?: (tracks: Track[]) => void;
  onSelectArtist?: (artistId: string) => void;
  onSelectAlbum?: (albumId: string) => void;
  onSelectPlaylist?: (playlistId: string) => void;
  currentTrackId?: string;
  isPlaying?: boolean;
}

export type SearchTab = 'all' | 'tracks' | 'artists' | 'albums' | 'playlists';

export const BROWSE_CATEGORIES = [
  { id: 'pop', name: 'Pop', color: 'bg-rose-950/40 text-rose-300 border-rose-700/60', icon: '🎤' },
  { id: 'hip-hop', name: 'Hip-Hop', color: 'bg-amber-950/40 text-amber-300 border-amber-700/60', icon: '🎧' },
  { id: 'electronic', name: 'Electronic', color: 'bg-cyan-950/40 text-cyan-300 border-cyan-700/60', icon: '⚡' },
  { id: 'rock', name: 'Rock', color: 'bg-red-950/40 text-red-300 border-red-700/60', icon: '🎸' },
  { id: 'jazz', name: 'Jazz', color: 'bg-emerald-950/40 text-emerald-300 border-emerald-700/60', icon: '🎷' },
  { id: 'classical', name: 'Classical', color: 'bg-indigo-950/40 text-indigo-300 border-indigo-700/60', icon: '🎻' },
  { id: 'ambient', name: 'Ambient', color: 'bg-teal-950/40 text-teal-300 border-teal-700/60', icon: '🌊' },
  { id: 'lo-fi', name: 'Lo-Fi', color: 'bg-purple-950/40 text-purple-300 border-purple-700/60', icon: '☕' },
  { id: 'metal', name: 'Metal', color: 'bg-zinc-900/60 text-zinc-300 border-zinc-700/60', icon: '🤘' },
  { id: 'r-and-b', name: 'R&B', color: 'bg-fuchsia-950/40 text-fuchsia-300 border-fuchsia-700/60', icon: '✨' },
  { id: 'indie', name: 'Indie', color: 'bg-orange-950/40 text-orange-300 border-orange-700/60', icon: '🌿' },
  { id: 'folk', name: 'Folk', color: 'bg-yellow-950/40 text-yellow-300 border-yellow-700/60', icon: '🪕' },
  { id: 'latin', name: 'Latin', color: 'bg-lime-950/40 text-lime-300 border-lime-700/60', icon: '💃' },
  { id: 'blues', name: 'Blues', color: 'bg-blue-950/40 text-blue-300 border-blue-700/60', icon: '🎺' },
];

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

export const SearchPage: FC<SearchPageProps> = ({
  initialQuery = '',
  onQueryChange,
  onPlayTrack,
  onPlayAll,
  onAddAll,
  onSelectArtist,
  onSelectAlbum,
  onSelectPlaylist,
  currentTrackId,
  isPlaying = false,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [filterText, setFilterText] = useState('');
  const [tracks, setTracks] = useState<Track[]>(ALL_SEARCHABLE_TRACKS);
  const [artists, setArtists] = useState(ALL_SEARCHABLE_ARTISTS);
  const [albums, setAlbums] = useState(ALL_SEARCHABLE_ALBUMS);
  const [isLoading, setIsLoading] = useState(false);

  const { playlists } = usePlaylistStore();
  const { isLiked } = useLibraryStore();
  const { setQueue } = useQueueStore();
  const { showToast } = useToastStore();

  // Sync with initialQuery
  useEffect(() => {
    if (initialQuery !== undefined) {
      setQuery(initialQuery);
      setDebouncedQuery(initialQuery.trim());
    }
  }, [initialQuery]);

  // 300ms Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch search results when debounced query updates
  useEffect(() => {
    const term = debouncedQuery.trim();
    if (!term) {
      setTracks(ALL_SEARCHABLE_TRACKS);
      setArtists(ALL_SEARCHABLE_ARTISTS);
      setAlbums(ALL_SEARCHABLE_ALBUMS);
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);

    const performSearch = async () => {
      try {
        // 1. Try FastAPI engine search endpoint
        const res = await fetch(
          `http://127.0.0.1:8001/api/search?q=${encodeURIComponent(term)}&limit=30`,
          { signal: AbortSignal.timeout(3000) }
        );
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.results) && data.results.length > 0 && !isCancelled) {
            const mappedTracks: Track[] = data.results.map((r: any) => ({
              id: r.id || `trk-${Math.random()}`,
              title: r.title,
              artist: r.artist,
              album: r.album || 'Single',
              durationSeconds: r.durationSeconds || 210,
              coverUrl: r.coverUrl,
              audioUrl: r.audioUrl,
              isFavorite: isLiked(r.id),
            }));

            setTracks(mappedTracks);

            // Infer artists and albums from genuine tracks
            const artistMap = new Map<string, { id: string; name: string; role: string; imageUrl?: string }>();
            const albumMap = new Map<string, { id: string; title: string; subtitle: string; coverUrl?: string }>();

            mappedTracks.forEach((t) => {
              if (t.artist && !artistMap.has(t.artist)) {
                artistMap.set(t.artist, {
                  id: t.artist,
                  name: t.artist,
                  role: 'Artist',
                  imageUrl: t.coverUrl,
                });
              }
              if (t.album && !albumMap.has(t.album)) {
                albumMap.set(t.album, {
                  id: t.album,
                  title: t.album,
                  subtitle: t.artist,
                  coverUrl: t.coverUrl,
                });
              }
            });

            setArtists(Array.from(artistMap.values()));
            setAlbums(Array.from(albumMap.values()));
            setIsLoading(false);
            return;
          }
        }
      } catch {
        // Fall through to iTunes fallback
      }

      // 2. iTunes Public API fallback (high reliability, 100% genuine)
      try {
        const itunesRes = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=30`,
          { signal: AbortSignal.timeout(4000) }
        );
        if (itunesRes.ok && !isCancelled) {
          const itunesData = await itunesRes.json();
          if (itunesData && Array.isArray(itunesData.results) && itunesData.results.length > 0) {
            const mappedTracks: Track[] = itunesData.results.map((r: any) => ({
              id: `itunes-${r.trackId}`,
              title: r.trackName,
              artist: r.artistName,
              album: r.collectionName,
              durationSeconds: Math.round((r.trackTimeMillis || 210000) / 1000),
              coverUrl: (r.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
              audioUrl: r.previewUrl,
              isFavorite: isLiked(`itunes-${r.trackId}`),
            }));

            setTracks(mappedTracks);

            const artistMap = new Map<string, { id: string; name: string; role: string; imageUrl?: string }>();
            const albumMap = new Map<string, { id: string; title: string; subtitle: string; coverUrl?: string }>();

            mappedTracks.forEach((t) => {
              if (t.artist && !artistMap.has(t.artist)) {
                artistMap.set(t.artist, {
                  id: t.artist,
                  name: t.artist,
                  role: 'Artist',
                  imageUrl: t.coverUrl,
                });
              }
              if (t.album && !albumMap.has(t.album)) {
                albumMap.set(t.album, {
                  id: t.album,
                  title: t.album,
                  subtitle: t.artist,
                  coverUrl: t.coverUrl,
                });
              }
            });

            setArtists(Array.from(artistMap.values()));
            setAlbums(Array.from(albumMap.values()));
            setIsLoading(false);
            return;
          }
        }
      } catch {
        // Fallback to local filter
      }

      if (!isCancelled) {
        const lower = term.toLowerCase();
        setTracks(
          ALL_SEARCHABLE_TRACKS.filter(
            (t) => t.title.toLowerCase().includes(lower) || t.artist.toLowerCase().includes(lower)
          )
        );
        setArtists(ALL_SEARCHABLE_ARTISTS.filter((a) => a.name.toLowerCase().includes(lower)));
        setAlbums(
          ALL_SEARCHABLE_ALBUMS.filter(
            (alb) => alb.title.toLowerCase().includes(lower) || alb.subtitle.toLowerCase().includes(lower)
          )
        );
        setIsLoading(false);
      }
    };

    performSearch();
    return () => {
      isCancelled = true;
    };
  }, [debouncedQuery, isLiked]);

  // Filtered tracks
  const filteredTracks = useMemo(() => {
    if (!filterText.trim()) return tracks;
    const lower = filterText.toLowerCase();
    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(lower) ||
        t.artist.toLowerCase().includes(lower) ||
        (t.album && t.album.toLowerCase().includes(lower))
    );
  }, [tracks, filterText]);

  // Matching playlists
  const matchingPlaylists = useMemo(() => {
    if (!debouncedQuery.trim()) return playlists;
    const lower = debouncedQuery.toLowerCase();
    return playlists.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.description?.toLowerCase().includes(lower) ||
        p.tracks.some((t) => t.title.toLowerCase().includes(lower) || t.artist.toLowerCase().includes(lower))
    );
  }, [playlists, debouncedQuery]);

  const handleCategoryClick = (categoryName: string) => {
    setQuery(categoryName);
    setDebouncedQuery(categoryName);
    onQueryChange?.(categoryName);
  };

  const handlePlayAll = () => {
    if (filteredTracks.length === 0) return;
    if (onPlayAll) {
      onPlayAll(filteredTracks);
    } else {
      setQueue(filteredTracks, 0);
    }
    showToast({ title: `Playing ${filteredTracks.length} tracks`, variant: 'info' });
  };

  const handleAddAll = () => {
    if (filteredTracks.length === 0) return;
    if (onAddAll) {
      onAddAll(filteredTracks);
    } else {
      const queueStore = useQueueStore.getState();
      queueStore.addTracksToQueue(filteredTracks);
    }
    showToast({ title: `Added ${filteredTracks.length} tracks to queue`, variant: 'success' });
  };

  // Top result (best match)
  const topResult = filteredTracks[0];

  return (
    <div
      data-testid="search-page"
      className="surface-background min-h-full p-6 text-foreground font-sans select-none space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Search
        </h1>
        {debouncedQuery.trim() ? (
          <div className="text-sm font-medium text-foreground/60">
            Results for &ldquo;<span className="text-foreground font-semibold">{debouncedQuery}</span>&rdquo;
          </div>
        ) : (
          <div className="text-sm font-medium text-foreground/60">
            Explore genres, songs, artists, and playlists
          </div>
        )}
      </div>

      {/* Tabs Row */}
      {debouncedQuery.trim().length > 0 && (
        <div className="flex items-center gap-2 border-b-2 border-border pb-3">
          {[
            { id: 'all', label: 'All' },
            { id: 'tracks', label: `Tracks (${filteredTracks.length})` },
            { id: 'artists', label: `Artists (${artists.length})` },
            { id: 'albums', label: `Albums (${albums.length})` },
            { id: 'playlists', label: `Playlists (${matchingPlaylists.length})` },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={`search-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id as SearchTab)}
                className={cn(
                  'px-3.5 py-1.5 rounded-md text-xs font-bold border-2 border-border shadow-[2px_2px_0px_var(--border)] cursor-pointer transition-transform hover:scale-105 active:scale-95',
                  isActive
                    ? 'surface-primary text-foreground font-extrabold'
                    : 'surface-muted text-foreground/70 hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* 1. EMPTY QUERY STATE: BROWSE ALL GENRES */}
      {!debouncedQuery.trim() && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles size={18} className="text-accent-green" />
              <span>Browse All Genres</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {BROWSE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                data-testid={`genre-card-${cat.id}`}
                onClick={() => handleCategoryClick(cat.name)}
                className={cn(
                  'h-24 p-3 rounded-[4px] border-2 shadow-[2px_2px_0px_var(--border)] text-left flex flex-col justify-between cursor-pointer transition-all hover:scale-105 active:scale-95',
                  cat.color
                )}
              >
                <span className="text-sm font-extrabold tracking-tight">{cat.name}</span>
                <span className="text-xl self-end">{cat.icon}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. LOADING STATE */}
      {isLoading && (
        <div className="flex items-center justify-center py-12 gap-2 text-foreground/60 text-xs font-medium">
          <Loader2 size={16} className="animate-spin text-foreground" />
          <span>Searching genuine music sources...</span>
        </div>
      )}

      {/* 3. "ALL" TAB CONTENT */}
      {!isLoading && debouncedQuery.trim().length > 0 && activeTab === 'all' && (
        <div className="space-y-8">
          {/* Top Result + Songs (Top 4) */}
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
            {/* Top Result Hero Card */}
            {topResult && (
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-bold text-foreground/70 uppercase tracking-wider">
                  Top Result
                </h3>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onPlayTrack?.(topResult)}
                  className="surface-card border-2 border-border shadow-[4px_4px_0px_var(--border)] rounded-[4px] p-4 flex flex-col justify-between h-56 cursor-pointer group hover:scale-[1.01] transition-all"
                >
                  <div className="size-24 rounded-[4px] overflow-hidden border border-border shadow-sm">
                    {topResult.coverUrl ? (
                      <img src={topResult.coverUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <div className="size-full surface-muted flex items-center justify-center">
                        <Music size={28} />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="text-lg font-extrabold truncate text-foreground group-hover:text-primary transition-colors">
                      {topResult.title}
                    </div>
                    <div className="text-xs text-foreground/70 flex items-center gap-2">
                      <span className="surface-primary px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">Song</span>
                      <span className="truncate">{topResult.artist}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Top 4 Songs */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground/70 uppercase tracking-wider">
                  Songs
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('tracks')}
                  className="text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  See all
                </button>
              </div>
              <div className="flex flex-col gap-1 border-2 border-border rounded-[4px] overflow-hidden surface-card shadow-[2px_2px_0px_var(--border)] divide-y divide-border">
                {filteredTracks.slice(0, 4).map((track, idx) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    index={idx}
                    isCurrent={track.id === currentTrackId}
                    isPlaying={track.id === currentTrackId && isPlaying}
                    onPlay={onPlayTrack}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Artists Row */}
          {artists.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground/70 uppercase tracking-wider flex items-center gap-2">
                  <User size={15} />
                  <span>Artists</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('artists')}
                  className="text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  See all ({artists.length})
                </button>
              </div>
              <div className="flex items-center gap-4 overflow-x-auto pb-2">
                {artists.slice(0, 6).map((artist) => (
                  <ArtistCard
                    key={artist.id}
                    name={artist.name}
                    role={artist.role}
                    imageUrl={artist.imageUrl}
                    onClick={() => onSelectArtist?.(artist.name)}
                    onPlay={() => {
                      const artistTracks = tracks.filter((t) => t.artist === artist.name);
                      if (artistTracks.length > 0) {
                        onPlayTrack?.(artistTracks[0]);
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Albums Row */}
          {albums.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground/70 uppercase tracking-wider flex items-center gap-2">
                  <Disc size={15} />
                  <span>Albums</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('albums')}
                  className="text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  See all ({albums.length})
                </button>
              </div>
              <div className="flex items-center gap-4 overflow-x-auto pb-2">
                {albums.slice(0, 6).map((album) => (
                  <AlbumCard
                    key={album.id}
                    title={album.title}
                    subtitle={album.subtitle}
                    coverUrl={album.coverUrl}
                    onClick={() => onSelectAlbum?.(album.title)}
                    onPlay={() => {
                      const albumTracks = tracks.filter((t) => t.album === album.title);
                      if (albumTracks.length > 0) {
                        onPlayTrack?.(albumTracks[0]);
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Playlists Row */}
          {matchingPlaylists.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground/70 uppercase tracking-wider flex items-center gap-2">
                  <ListMusic size={15} />
                  <span>Playlists</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('playlists')}
                  className="text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  See all ({matchingPlaylists.length})
                </button>
              </div>
              <div className="flex items-center gap-4 overflow-x-auto pb-2">
                {matchingPlaylists.slice(0, 6).map((pl) => (
                  <PlaylistCard
                    key={pl.id}
                    id={pl.id}
                    name={pl.name}
                    itemCount={pl.tracks.length}
                    thumbnails={pl.tracks.map((t) => t.coverUrl).filter(Boolean) as string[]}
                    onClick={() => onSelectPlaylist?.(pl.id)}
                    onPlay={() => {
                      if (pl.tracks.length > 0) {
                        onPlayTrack?.(pl.tracks[0]);
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. "TRACKS" TAB CONTENT */}
      {!isLoading && debouncedQuery.trim().length > 0 && activeTab === 'tracks' && (
        <div className="space-y-3">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePlayAll}
                className="flex items-center gap-1.5 px-3 py-1 rounded-md surface-primary text-foreground font-bold text-xs border-2 border-border shadow-[2px_2px_0px_var(--border)] cursor-pointer hover:scale-105 active:scale-95 transition-transform"
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

          <div className="rounded-md border-2 border-border surface-card overflow-hidden shadow-[2px_2px_0px_var(--border)] divide-y divide-border">
            {filteredTracks.map((track, idx) => (
              <TrackRow
                key={track.id}
                track={track}
                index={idx}
                isCurrent={track.id === currentTrackId}
                isPlaying={track.id === currentTrackId && isPlaying}
                onPlay={onPlayTrack}
              />
            ))}
          </div>
        </div>
      )}

      {/* 5. "ARTISTS" TAB CONTENT */}
      {!isLoading && debouncedQuery.trim().length > 0 && activeTab === 'artists' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {artists.map((artist) => (
            <ArtistCard
              key={artist.id}
              name={artist.name}
              role={artist.role}
              imageUrl={artist.imageUrl}
              onClick={() => onSelectArtist?.(artist.name)}
              onPlay={() => {
                const artistTracks = tracks.filter((t) => t.artist === artist.name);
                if (artistTracks.length > 0) {
                  onPlayTrack?.(artistTracks[0]);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* 6. "ALBUMS" TAB CONTENT */}
      {!isLoading && debouncedQuery.trim().length > 0 && activeTab === 'albums' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {albums.map((album) => (
            <AlbumCard
              key={album.id}
              title={album.title}
              subtitle={album.subtitle}
              coverUrl={album.coverUrl}
              onClick={() => onSelectAlbum?.(album.title)}
              onPlay={() => {
                const albumTracks = tracks.filter((t) => t.album === album.title);
                if (albumTracks.length > 0) {
                  onPlayTrack?.(albumTracks[0]);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* 7. "PLAYLISTS" TAB CONTENT */}
      {!isLoading && debouncedQuery.trim().length > 0 && activeTab === 'playlists' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {matchingPlaylists.map((pl) => (
            <PlaylistCard
              key={pl.id}
              id={pl.id}
              name={pl.name}
              itemCount={pl.tracks.length}
              thumbnails={pl.tracks.map((t) => t.coverUrl).filter(Boolean) as string[]}
              onClick={() => onSelectPlaylist?.(pl.id)}
              onPlay={() => {
                if (pl.tracks.length > 0) {
                  onPlayTrack?.(pl.tracks[0]);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchPage;
