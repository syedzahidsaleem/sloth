import { FC } from 'react';
import { Disc3 } from 'lucide-react';
import { ViewShell } from '@/components/ui/ViewShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { AlbumCard } from '@/components/ui/AlbumCard';

export interface FavoriteAlbumsPageProps {
  albums?: Array<{
    id: string;
    title: string;
    artist: string;
    coverUrl?: string;
    year?: number;
    trackCount?: number;
  }>;
  onSelectAlbum?: (albumId: string) => void;
}

export const FavoriteAlbumsPage: FC<FavoriteAlbumsPageProps> = ({
  albums = [],
  onSelectAlbum,
}) => {
  return (
    <ViewShell data-testid="favorite-albums-view" title="Favorite albums">
      {albums.length === 0 ? (
        <div className="flex h-full flex-1 flex-col items-center justify-center p-8">
          <EmptyState
            icon={<Disc3 size={48} />}
            title="No favorite albums yet"
            description="Albums marked as favorite will appear here."
            className="flex-1"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 w-full">
          {albums.map((album) => (
            <AlbumCard
              key={album.id}
              title={album.title}
              subtitle={album.artist}
              coverUrl={album.coverUrl}
              onClick={() => onSelectAlbum?.(album.id)}
            />
          ))}
        </div>
      )}
    </ViewShell>
  );
};

export default FavoriteAlbumsPage;
