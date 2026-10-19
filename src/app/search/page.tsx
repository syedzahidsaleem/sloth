/**
 * Ensure any repository we take reference from or code from isn't referenced or spoken about anywhere either in files or readme or code
 * Original: packages/player/src/views/Search/Search.tsx
 * Adapted for Sloth by syedzahidsaleem2@gmail.com
 * Changes: [styling system, data layer, routing, instant debounced search, tabbed view]
 */

import { useState, useEffect, useMemo } from 'react';
import { Search as SearchIcon, X, Music2, Disc3, User, Sparkles } from 'lucide-react';
import { TrackRow, AlbumCard, ArtistCard, Track, Input, Button } from '@/components/ui';

export interface SearchPageProps {
  initialQuery?: string;
  onPlayTrack?: (track: Track) => void;
  onSelectArtist?: (artistId: string) => void;
  onSelectAlbum?: (albumId: string) => void;
  currentTrackId?: string;
  isPlaying?: boolean;
}

type SearchTab = 'all' | 'tracks' | 'artists' | 'albums';

export const ALL_SEARCHABLE_TRACKS: Track[] = [
  { id: 'trk-anarkali', title: 'Anarkali Disco Chali', artist: 'Mamta Sharma, Sukhwinder Singh', album: 'Housefull 2', durationSeconds: 278, coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80', isFavorite: true },
  { id: 'trk-anarkali-acoustic', title: 'Anarkali (Unplugged)', artist: 'Sajid-Wajid', album: 'Bollywood Unplugged', durationSeconds: 215, coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80', isFavorite: false },
  { id: 'trk-chaiyya', title: 'Chaiyya Chaiyya', artist: 'Sukhwinder Singh, Sapna Awasthi', album: 'Dil Se', durationSeconds: 394, coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80', isFavorite: true },
  { id: 'trk-tum-hi-ho', title: 'Tum Hi Ho', artist: 'Arijit Singh', album: 'Aashiqui 2', durationSeconds: 262, coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&q=80', isFavorite: false },
  { id: 'trk-1', title: 'Midnight City', artist: 'M83', album: "Hurry Up, We're Dreaming", durationSeconds: 243, coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80', isFavorite: true },
  { id: 'trk-2', title: 'Starboy', artist: 'The Weeknd, Daft Punk', album: 'Starboy', durationSeconds: 230, coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&q=80', isFavorite: false },
  { id: 'trk-3', title: 'Resonance', artist: 'HOME', album: 'Odyssey', durationSeconds: 212, coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80', isFavorite: true },
  { id: 'trk-4', title: 'Instant Crush', artist: 'Daft Punk, Julian Casablancas', album: 'Random Access Memories', durationSeconds: 337, coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80', isFavorite: false },
  { id: 'trk-5', title: 'Veridis Quo', artist: 'Daft Punk', album: 'Discovery', durationSeconds: 344, coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80', isFavorite: true },
  { id: 'trk-6', title: 'Days of Thunder', artist: 'The Midnight', album: 'Days of Thunder', durationSeconds: 329, coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&q=80', isFavorite: false },
  { id: 'trk-7', title: 'Wait', artist: 'M83', album: "Hurry Up, We're Dreaming", durationSeconds: 343, coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=120&q=80' },
  { id: 'trk-8', title: 'Outro', artist: 'M83', album: "Hurry Up, We're Dreaming", durationSeconds: 247, coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=120&q=80' },
];

export const ALL_SEARCHABLE_ARTISTS = [
  { id: 'sajid-wajid', name: 'Sajid-Wajid', imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80', role: 'Bollywood Composer Duo' },
  { id: 'sukhwinder-singh', name: 'Sukhwinder Singh', imageUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&q=80', role: 'Playback Singer' },
  { id: 'arijit-singh', name: 'Arijit Singh', imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80', role: 'Playback Singer' },
  { id: 'm83', name: 'M83', imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80', role: 'French Synth / Electronic' },
  { id: 'daft-punk', name: 'Daft Punk', imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80', role: 'Electronic Duo' },
  { id: 'the-weeknd', name: 'The Weeknd', imageUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&q=80', role: 'R&B / Synthpop' },
  { id: 'the-midnight', name: 'The Midnight', imageUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&q=80', role: 'Synthwave' },
  { id: 'home', name: 'HOME', imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80', role: 'Chillwave' },
];

export const ALL_SEARCHABLE_ALBUMS = [
  { id: 'alb-housefull2', title: 'Housefull 2', subtitle: 'Sajid-Wajid • 2012', coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80' },
  { id: 'alb-dilse', title: 'Dil Se', subtitle: 'A.R. Rahman • 1998', coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80' },
  { id: 'alb-aashiqui2', title: 'Aashiqui 2', subtitle: 'Mithoon, Ankit Tiwari • 2013', coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&q=80' },
  { id: 'alb-1', title: "Hurry Up, We're Dreaming", subtitle: 'M83 • 2011', coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80' },
  { id: 'alb-2', title: 'Starboy', subtitle: 'The Weeknd • 2016', coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&q=80' },
  { id: 'alb-3', title: 'Odyssey', subtitle: 'HOME • 2014', coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80' },
  { id: 'alb-4', title: 'Random Access Memories', subtitle: 'Daft Punk • 2013', coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80' },
  { id: 'alb-5', title: 'Discovery', subtitle: 'Daft Punk • 2001', coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80' },
];

export const POPULAR_SEARCH_TAGS = ['Anarkali', 'M83', 'Daft Punk', 'Synthwave', 'Bollywood', 'Starboy', 'Discovery'];

export default function SearchPage({
  initialQuery = '',
  onPlayTrack,
  onSelectArtist,
  onSelectAlbum,
  currentTrackId,
  isPlaying,
}: SearchPageProps) {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<SearchTab>('all');

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      setDebouncedQuery(initialQuery);
    }
  }, [initialQuery]);

  const [engineTracks, setEngineTracks] = useState<Track[]>([]);

  // 300ms debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Query engine /search/natural when query changes
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setEngineTracks([]);
      return;
    }

    let isMounted = true;
    fetch('http://127.0.0.1:8001/search/natural', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: debouncedQuery, limit: 15 }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data || !Array.isArray(data.results)) return;
        const tracks: Track[] = data.results.map((r: any) => ({
          id: r.track_id,
          title: r.title,
          artist: r.artist,
          album: r.album,
          durationSeconds: Math.round(r.bpm ? (60 / r.bpm) * 400 : 210),
          coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
          badge: `Neural Match ${(r.score * 100).toFixed(0)}%`,
        }));
        setEngineTracks(tracks);
      })
      .catch(() => {
        // Fallback silently to local catalog
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery]);

  const localFilteredTracks = useMemo(() => {
    if (!debouncedQuery) return [];
    return ALL_SEARCHABLE_TRACKS.filter(
      (t) =>
        t.title.toLowerCase().includes(debouncedQuery) ||
        t.artist.toLowerCase().includes(debouncedQuery) ||
        (t.album && t.album.toLowerCase().includes(debouncedQuery)),
    );
  }, [debouncedQuery]);

  const filteredTracks = useMemo(() => {
    const combined = [...localFilteredTracks];
    for (const et of engineTracks) {
      if (!combined.some((t) => t.id === et.id || t.title.toLowerCase() === et.title.toLowerCase())) {
        combined.push(et);
      }
    }
    return combined;
  }, [localFilteredTracks, engineTracks]);

  const filteredArtists = useMemo(() => {
    if (!debouncedQuery) return [];
    return ALL_SEARCHABLE_ARTISTS.filter((a) =>
      a.name.toLowerCase().includes(debouncedQuery),
    );
  }, [debouncedQuery]);

  const filteredAlbums = useMemo(() => {
    if (!debouncedQuery) return [];
    return ALL_SEARCHABLE_ALBUMS.filter(
      (alb) =>
        alb.title.toLowerCase().includes(debouncedQuery) ||
        alb.subtitle.toLowerCase().includes(debouncedQuery),
    );
  }, [debouncedQuery]);

  const totalResultsCount =
    filteredTracks.length + filteredArtists.length + filteredAlbums.length;

  return (
    <div className="surface-background p-6 space-y-6 select-none" data-testid="search-page">
      {/* Search Input Bar */}
      <div className="relative max-w-2xl">
        <Input
          tone="primary"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tracks, artists, albums, or ISRC..."
          startAddon={<SearchIcon size={16} className="text-muted-foreground" />}
          endAddon={
            query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
                title="Clear search"
              >
                <X size={15} />
              </button>
            ) : null
          }
          data-testid="search-input-field"
        />
      </div>

      {/* When no query is entered: Quick Popular Tags */}
      {!debouncedQuery && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Sparkles size={13} className="text-primary" />
            <span>Popular Searches</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {POPULAR_SEARCH_TAGS.map((tag) => (
              <Button
                key={tag}
                size="sm"
                variant="secondary"
                onClick={() => setQuery(tag)}
                className="text-xs"
              >
                {tag}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Tabbed Result Filter (All | Tracks | Artists | Albums) */}
      {debouncedQuery && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b-(length:--border-width) border-border pb-2">
            <Button
              size="sm"
              variant={activeTab === 'all' ? 'default' : 'text'}
              onClick={() => setActiveTab('all')}
            >
              All ({totalResultsCount})
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'tracks' ? 'default' : 'text'}
              onClick={() => setActiveTab('tracks')}
            >
              Tracks ({filteredTracks.length})
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'artists' ? 'default' : 'text'}
              onClick={() => setActiveTab('artists')}
            >
              Artists ({filteredArtists.length})
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'albums' ? 'default' : 'text'}
              onClick={() => setActiveTab('albums')}
            >
              Albums ({filteredAlbums.length})
            </Button>
          </div>

          {/* Results Empty State */}
          {totalResultsCount === 0 && (
            <div className="surface-card border-border flex flex-col items-center justify-center p-12 text-center rounded-[4px] border-(length:--border-width)">
              <Music2 size={40} className="text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-bold text-foreground">
                No results found for &ldquo;{debouncedQuery}&rdquo;
              </h3>
              <p className="text-muted-foreground mt-1 max-w-sm text-xs font-mono">
                Try searching for a different song title, artist name, or album name.
              </p>
            </div>
          )}

          {/* Tab Content Rendering */}
          {(activeTab === 'all' || activeTab === 'artists') && filteredArtists.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <User size={14} className="text-primary" />
                <span>Artists</span>
              </h3>
              <div className="flex items-center gap-4 overflow-x-auto pb-2 [scrollbar-width:none]">
                {filteredArtists.map((artist) => (
                  <ArtistCard
                    key={artist.id}
                    name={artist.name}
                    role={artist.role}
                    imageUrl={artist.imageUrl}
                    onClick={() => onSelectArtist?.(artist.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {(activeTab === 'all' || activeTab === 'tracks') && filteredTracks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Music2 size={14} className="text-primary" />
                <span>Tracks</span>
              </h3>
              <div className="space-y-1">
                {filteredTracks.map((track, idx) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    index={idx}
                    isCurrent={track.id === currentTrackId}
                    isPlaying={isPlaying && track.id === currentTrackId}
                    onPlay={() => onPlayTrack?.(track)}
                  />
                ))}
              </div>
            </div>
          )}

          {(activeTab === 'all' || activeTab === 'albums') && filteredAlbums.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Disc3 size={14} className="text-primary" />
                <span>Albums</span>
              </h3>
              <div className="flex items-center gap-4 overflow-x-auto pb-2 [scrollbar-width:none]">
                {filteredAlbums.map((album) => (
                  <AlbumCard
                    key={album.id}
                    title={album.title}
                    subtitle={album.subtitle}
                    coverUrl={album.coverUrl}
                    onClick={() => onSelectAlbum?.(album.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
