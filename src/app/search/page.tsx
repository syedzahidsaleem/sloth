/**
 * Sloth Search Page (src/app/search/page.tsx)
 * Nuclear-derived tabbed search results:
 * - Instant debounced search (300ms) with in-page live results
 * - Tabbed filtering: All | Tracks | Artists | Albums | Playlists
 * - Results rendered with TrackRow, ArtistCard, AlbumCard
 */

import { useState, useEffect, useMemo } from 'react';
import { Search as SearchIcon, X, Music2, Disc3, User, Sparkles } from 'lucide-react';
import { TrackRow, AlbumCard, ArtistCard, Track } from '@/components/ui';

export interface SearchPageProps {
  onPlayTrack?: (track: Track) => void;
  onSelectArtist?: (artistId: string) => void;
  onSelectAlbum?: (albumId: string) => void;
  currentTrackId?: string;
  isPlaying?: boolean;
}

type SearchTab = 'all' | 'tracks' | 'artists' | 'albums' | 'playlists';

export const ALL_SEARCHABLE_TRACKS: Track[] = [
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
  { id: 'm83', name: 'M83', imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80', role: 'French Synth / Electronic' },
  { id: 'daft-punk', name: 'Daft Punk', imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80', role: 'Electronic Duo' },
  { id: 'the-weeknd', name: 'The Weeknd', imageUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&q=80', role: 'R&B / Synthpop' },
  { id: 'the-midnight', name: 'The Midnight', imageUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&q=80', role: 'Synthwave' },
  { id: 'home', name: 'HOME', imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80', role: 'Chillwave' },
];

export const ALL_SEARCHABLE_ALBUMS = [
  { id: 'alb-1', title: "Hurry Up, We're Dreaming", subtitle: 'M83 • 2011', coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80' },
  { id: 'alb-2', title: 'Starboy', subtitle: 'The Weeknd • 2016', coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&q=80' },
  { id: 'alb-3', title: 'Odyssey', subtitle: 'HOME • 2014', coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80' },
  { id: 'alb-4', title: 'Random Access Memories', subtitle: 'Daft Punk • 2013', coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80' },
  { id: 'alb-5', title: 'Discovery', subtitle: 'Daft Punk • 2001', coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80' },
];

export const POPULAR_SEARCH_TAGS = ['M83', 'Daft Punk', 'Synthwave', 'French House', 'Discovery', 'Starboy'];

export default function SearchPage({
  onPlayTrack,
  onSelectArtist,
  onSelectAlbum,
  currentTrackId,
  isPlaying,
}: SearchPageProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('all');

  // 300ms debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const filteredTracks = useMemo(() => {
    if (!debouncedQuery) return [];
    return ALL_SEARCHABLE_TRACKS.filter(
      (t) =>
        t.title.toLowerCase().includes(debouncedQuery) ||
        t.artist.toLowerCase().includes(debouncedQuery) ||
        (t.album && t.album.toLowerCase().includes(debouncedQuery))
    );
  }, [debouncedQuery]);

  const filteredArtists = useMemo(() => {
    if (!debouncedQuery) return [];
    return ALL_SEARCHABLE_ARTISTS.filter((a) =>
      a.name.toLowerCase().includes(debouncedQuery)
    );
  }, [debouncedQuery]);

  const filteredAlbums = useMemo(() => {
    if (!debouncedQuery) return [];
    return ALL_SEARCHABLE_ALBUMS.filter(
      (alb) =>
        alb.title.toLowerCase().includes(debouncedQuery) ||
        alb.subtitle.toLowerCase().includes(debouncedQuery)
    );
  }, [debouncedQuery]);

  const totalResultsCount =
    filteredTracks.length + filteredArtists.length + filteredAlbums.length;

  return (
    <div className="p-6 space-y-6 select-none" data-testid="search-page">
      {/* Search Input Bar */}
      <div className="relative max-w-2xl">
        <div className="relative flex items-center">
          <SearchIcon
            size={18}
            className="absolute left-3.5 text-[var(--text-muted)] pointer-events-none"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tracks, artists, albums, or ISRC..."
            className="w-full h-11 pl-10 pr-10 rounded-[6px] bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] transition-all"
            data-testid="search-input-field"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 text-[var(--text-muted)] hover:text-white p-1 rounded cursor-pointer"
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* When no query is entered: Quick Popular Tags */}
      {!debouncedQuery && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            <Sparkles size={14} className="text-[var(--color-accent)]" />
            <span>Popular Searches</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {POPULAR_SEARCH_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setQuery(tag)}
                className="px-3 py-1.5 rounded-[4px] bg-[var(--surface)] hover:bg-[var(--surface-raised)] border border-[var(--border)] hover:border-[var(--color-accent)]/50 text-xs text-[var(--text-primary)] cursor-pointer transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabbed Result Filter (All | Tracks | Artists | Albums) */}
      {debouncedQuery && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-[4px] text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === 'all'
                  ? 'bg-[var(--surface-raised)] text-[var(--color-accent)] border border-[var(--color-accent)]/30'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              All ({totalResultsCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tracks')}
              className={`px-3 py-1.5 rounded-[4px] text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === 'tracks'
                  ? 'bg-[var(--surface-raised)] text-[var(--color-accent)] border border-[var(--color-accent)]/30'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              Tracks ({filteredTracks.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('artists')}
              className={`px-3 py-1.5 rounded-[4px] text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === 'artists'
                  ? 'bg-[var(--surface-raised)] text-[var(--color-accent)] border border-[var(--color-accent)]/30'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              Artists ({filteredArtists.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('albums')}
              className={`px-3 py-1.5 rounded-[4px] text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === 'albums'
                  ? 'bg-[var(--surface-raised)] text-[var(--color-accent)] border border-[var(--color-accent)]/30'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              Albums ({filteredAlbums.length})
            </button>
          </div>

          {/* Results Empty State */}
          {totalResultsCount === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-center text-[var(--text-muted)]">
              <Music2 size={48} className="mb-3 opacity-30" />
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                No results found for &ldquo;{debouncedQuery}&rdquo;
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1 max-w-sm">
                Try searching for a different song title, artist name, or album name.
              </p>
            </div>
          )}

          {/* Tab Content Rendering */}
          {(activeTab === 'all' || activeTab === 'artists') && filteredArtists.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                <User size={14} className="text-[var(--color-accent)]" />
                <span>Artists</span>
              </h3>
              <div className="flex items-center gap-4 overflow-x-auto pb-2">
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
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                <Music2 size={14} className="text-[var(--color-accent)]" />
                <span>Tracks</span>
              </h3>
              <div className="space-y-1">
                {filteredTracks.map((track, idx) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    index={idx + 1}
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
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                <Disc3 size={14} className="text-[var(--color-accent)]" />
                <span>Albums</span>
              </h3>
              <div className="flex items-center gap-4 overflow-x-auto pb-2">
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
