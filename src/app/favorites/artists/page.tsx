import { FC } from 'react';
import { User } from 'lucide-react';
import { ViewShell } from '@/components/ui/ViewShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { ArtistCard } from '@/components/ui/ArtistCard';
import { useLibraryStore } from '@/stores/libraryStore';

export interface FavoriteArtistsPageProps {
  artists?: Array<{
    id: string;
    name: string;
    avatarUrl?: string;
    monthlyListeners?: number;
    genre?: string;
  }>;
  onSelectArtist?: (artistId: string) => void;
}

export const FavoriteArtistsPage: FC<FavoriteArtistsPageProps> = ({
  artists,
  onSelectArtist,
}) => {
  const followedArtists = useLibraryStore((s) => s.followedArtists);

  const displayArtists =
    artists && artists.length > 0
      ? artists
      : followedArtists.map((a) => ({
          id: a.id,
          name: a.name,
          avatarUrl: a.imageUrl,
          genre: 'Followed Artist',
        }));

  return (
    <ViewShell data-testid="favorite-artists-view" title="Favorite artists">
      {displayArtists.length === 0 ? (
        <div className="flex h-full flex-1 flex-col items-center justify-center p-8">
          <EmptyState
            icon={<User size={48} />}
            title="No favorite artists yet"
            description="Artists marked as favorite will appear here."
            className="flex-1"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 w-full">
          {displayArtists.map((artist) => (
            <ArtistCard
              key={artist.id}
              name={artist.name}
              role={artist.genre || 'Artist'}
              imageUrl={artist.avatarUrl}
              onClick={() => onSelectArtist?.(artist.name || artist.id)}
            />
          ))}
        </div>
      )}
    </ViewShell>
  );
};

export default FavoriteArtistsPage;
