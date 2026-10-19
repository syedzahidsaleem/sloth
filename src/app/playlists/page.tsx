/**
 * Ensure any repository we take reference from or code from isn't referenced or spoken about anywhere either in files or readme or code
 * Original: packages/player/src/views/Playlists/Playlists.tsx
 * Adapted for Sloth by syedzahidsaleem2@gmail.com
 * Changes: [styling system, data layer, routing, create playlist dialog, mosaic cards]
 */

import { useState, useMemo } from 'react';
import { ListMusic, Plus, Search, SearchX } from 'lucide-react';
import {
  PlaylistCard,
  Input,
  Button,
  Modal,
  ModalTitle,
  ModalDescription,
  ModalActions,
  ModalClose,
} from '@/components/ui';

export interface PlaylistsPageProps {
  onSelectPlaylist?: (playlistId: string) => void;
  onPlayPlaylist?: (playlistId: string) => void;
}

export interface PlaylistItem {
  id: string;
  name: string;
  itemCount: number;
  thumbnails: string[];
}

const INITIAL_PLAYLISTS: PlaylistItem[] = [
  {
    id: 'pl-1',
    name: 'Synthwave Odyssey',
    itemCount: 18,
    thumbnails: [
      'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&q=80',
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
      'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&q=80',
      'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80',
    ],
  },
  {
    id: 'pl-2',
    name: 'French Touch & House Classics',
    itemCount: 24,
    thumbnails: [
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80',
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80',
      'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&q=80',
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
    ],
  },
  {
    id: 'pl-3',
    name: 'Late Night Chill & Ambient',
    itemCount: 12,
    thumbnails: [
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
      'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80',
    ],
  },
];

export default function PlaylistsPage({
  onSelectPlaylist,
  onPlayPlaylist,
}: PlaylistsPageProps) {
  const [playlists, setPlaylists] = useState<PlaylistItem[]>(INITIAL_PLAYLISTS);
  const [filterText, setFilterText] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const filteredPlaylists = useMemo(() => {
    if (!filterText.trim()) return playlists;
    return playlists.filter((pl) =>
      pl.name.toLowerCase().includes(filterText.toLowerCase()),
    );
  }, [playlists, filterText]);

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) return;
    const newEntry: PlaylistItem = {
      id: `pl-${Date.now()}`,
      name: newPlaylistName.trim(),
      itemCount: 0,
      thumbnails: [],
    };
    setPlaylists([newEntry, ...playlists]);
    setNewPlaylistName('');
    setIsCreateOpen(false);
  };

  return (
    <div className="surface-background p-6 space-y-6 select-none" data-testid="playlists-view">
      {/* Header bar: Title + Search & Create actions */}
      <div className="border-border flex flex-wrap items-center justify-between gap-4 pb-4 border-b-(length:--border-width)">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">
            Playlists
          </h1>
          <p className="text-muted-foreground mt-0.5 text-xs font-mono">
            {playlists.length} playlists in local library
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Input
            tone="secondary"
            size="sm"
            placeholder="Filter playlists..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            startAddon={<Search size={14} className="text-muted-foreground" />}
            className="w-48 h-8 text-xs"
          />

          <Button
            size="sm"
            variant="default"
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5"
            data-testid="create-playlist-button"
          >
            <Plus size={14} />
            <span>New Playlist</span>
          </Button>
        </div>
      </div>

      {/* Grid of Playlists */}
      {filteredPlaylists.length === 0 ? (
        <div className="surface-card border-border flex flex-col items-center justify-center p-12 text-center rounded-[4px] border-(length:--border-width)">
          {filterText ? (
            <>
              <SearchX size={40} className="text-muted-foreground/40 mb-3" />
              <h3 className="text-foreground text-sm font-bold">No playlists found</h3>
              <p className="text-muted-foreground mt-1 text-xs font-mono">
                No playlists match &ldquo;{filterText}&rdquo;
              </p>
            </>
          ) : (
            <>
              <ListMusic size={40} className="text-muted-foreground/40 mb-3" />
              <h3 className="text-foreground text-sm font-bold">No playlists yet</h3>
              <p className="text-muted-foreground mt-1 text-xs font-mono">
                Create your first playlist using the button above.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-4 pr-2 pb-4">
          {filteredPlaylists.map((pl) => (
            <PlaylistCard
              key={pl.id}
              name={pl.name}
              itemCount={pl.itemCount}
              thumbnails={pl.thumbnails}
              onClick={() => onSelectPlaylist?.(pl.id)}
              onPlay={() => onPlayPlaylist?.(pl.id)}
            />
          ))}
        </div>
      )}

      {/* Create Playlist Modal */}
      <Modal open={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
        <ModalTitle>Create Playlist</ModalTitle>
        <ModalDescription>
          Enter a name for your new playlist in Sloth.
        </ModalDescription>

        <div className="my-4">
          <Input
            tone="primary"
            placeholder="Playlist name..."
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreatePlaylist();
            }}
            autoFocus
          />
        </div>

        <ModalActions>
          <ModalClose>
            <Button size="sm" variant="text">
              Cancel
            </Button>
          </ModalClose>
          <Button
            size="sm"
            variant="default"
            onClick={handleCreatePlaylist}
            disabled={!newPlaylistName.trim()}
          >
            Create
          </Button>
        </ModalActions>
      </Modal>
    </div>
  );
}
