import { FC } from 'react';
import { User } from 'lucide-react';
import { ViewShell } from '@/components/ui/ViewShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { ArtistCard } from '@/components/ui/ArtistCard';

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
  artists = [],
  onSelectArtist,
}) => {
  return (
    <ViewShell data-testid="favorite-artists-view" title="Favorite artists">
      {artists.length === 0 ? (
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
          {artists.map((artist) => (
            <ArtistCard
              key={artist.id}
              name={artist.name}
              role={artist.genre || 'Artist'}
              imageUrl={artist.avatarUrl}
              onClick={() => onSelectArtist?.(artist.id)}
            />
          ))}
        </div>
      )}
    </ViewShell>
  );
};

export default FavoriteArtistsPage;
