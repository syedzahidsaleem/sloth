import { describe, it, expect, vi } from 'vitest';
import { AlbumCard } from '../components/ui/AlbumCard';
import { ArtistCard } from '../components/ui/ArtistCard';
import { PlaylistCard } from '../components/ui/PlaylistCard';

describe('Card Context Menus', () => {
  it('exports AlbumCard component properly', () => {
    expect(AlbumCard).toBeDefined();
    expect(typeof AlbumCard).toBe('function');
  });

  it('exports ArtistCard component properly', () => {
    expect(ArtistCard).toBeDefined();
    expect(typeof ArtistCard).toBe('function');
  });

  it('exports PlaylistCard component properly', () => {
    expect(PlaylistCard).toBeDefined();
    expect(typeof PlaylistCard).toBe('function');
  });
});
