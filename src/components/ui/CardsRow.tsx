/**
 * Ensure any repository we take reference from or code from isn't referenced or spoken about anywhere either in files or readme or code
 * Original: packages/ui/src/components/CardsRow/CardsRow.tsx
 * Adapted for Sloth by syedzahidsaleem2@gmail.com
 * Changes: [styling system, data layer, routing, horizontal smooth scrolling, filtering]
 */

import { FC, useState, useRef, ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from './Badge';
import { Button } from './Button';
import { Input } from './Input';
import { AlbumCard, AlbumCardSkeleton } from './AlbumCard';

export type CardsRowItem = {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  image?: ReactNode;
  badge?: ReactNode;
  onClick?: () => void;
  onPlay?: () => void;
};

export type CardsRowLabels = {
  filterPlaceholder?: string;
  nothingFound?: string;
};

export type CardsRowProps = {
  title: string;
  badge?: string;
  items: CardsRowItem[];
  labels?: CardsRowLabels;
  className?: string;
  'data-testid'?: string;
};

const defaultLabels: CardsRowLabels = {
  filterPlaceholder: 'Filter...',
  nothingFound: 'Nothing found',
};

const CardsRowBase: FC<CardsRowProps> = ({
  title,
  badge,
  items,
  labels = defaultLabels,
  className,
  'data-testid': testId = 'cards-row',
}) => {
  const [filterText, setFilterText] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const filteredItems = items.filter((item) => {
    if (!filterText.trim()) return true;
    const query = filterText.toLowerCase();
    return (
      item.title.toLowerCase().includes(query) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(query))
    );
  });

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -350, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 350, behavior: 'smooth' });
    }
  };

  return (
    <div data-testid={testId} className={cn('flex flex-col gap-3', className)}>
      <div className="flex min-h-10 items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <h2 className="text-foreground text-lg font-bold tracking-tight">{title}</h2>
          {badge && (
            <Badge data-testid="cards-row-badge" variant="pill" color="purple">
              {badge}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {items.length > 5 && (
            <Input
              data-testid="cards-row-filter"
              size="sm"
              tone="secondary"
              placeholder={labels.filterPlaceholder ?? 'Filter...'}
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-36 h-8 text-xs"
              endAddon={
                filterText ? (
                  <button
                    type="button"
                    className="cursor-pointer text-muted-foreground hover:text-foreground text-xs"
                    onClick={() => setFilterText('')}
                  >
                    ✕
                  </button>
                ) : (
                  <Filter size={12} className="text-muted-foreground" />
                )
              }
            />
          )}

          <div className="flex items-center gap-1">
            <Button
              data-testid="cards-row-scroll-left"
              size="icon-sm"
              onClick={scrollLeft}
              variant="noShadow"
              aria-label="Scroll left"
            >
              <ChevronLeft size={15} />
            </Button>
            <Button
              data-testid="cards-row-scroll-right"
              size="icon-sm"
              onClick={scrollRight}
              variant="noShadow"
              aria-label="Scroll right"
            >
              <ChevronRight size={15} />
            </Button>
          </div>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex gap-3 overflow-x-auto overflow-y-visible pb-2 select-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {filteredItems.length === 0 ? (
          <div
            data-testid="cards-row-nothing-found"
            className="text-muted-foreground py-8 text-xs font-mono"
          >
            {labels.nothingFound ?? 'Nothing found'}
          </div>
        ) : (
          filteredItems.map((item) => (
            <AlbumCard
              key={item.id}
              className="shrink-0"
              coverUrl={item.imageUrl}
              image={item.image}
              badge={item.badge}
              title={item.title}
              subtitle={item.subtitle}
              onClick={item.onClick}
              onPlay={item.onPlay}
            />
          ))
        )}
      </div>
    </div>
  );
};

export const CardsRowSkeleton: FC<{
  title?: string;
  badge?: string;
  count?: number;
  className?: string;
  'data-testid'?: string;
}> = ({
  title,
  badge,
  count = 5,
  className,
  'data-testid': testId = 'cards-row-skeleton',
}) => (
  <div data-testid={testId} className={cn('flex flex-col gap-3', className)}>
    <div className="flex min-h-10 items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        {title ? (
          <h2 className="text-foreground text-lg font-bold">{title}</h2>
        ) : (
          <div className="surface-card border-border h-5 w-32 animate-pulse rounded-[4px] border-(length:--border-width)" />
        )}
        {badge && (
          <Badge data-testid="cards-row-badge" variant="pill" color="purple">
            {badge}
          </Badge>
        )}
      </div>
    </div>

    <div className="flex gap-3 overflow-hidden pb-2">
      {Array.from({ length: count }, (_, idx) => (
        <AlbumCardSkeleton key={idx} className="shrink-0" />
      ))}
    </div>
  </div>
);

export const CardsRow = Object.assign(CardsRowBase, {
  Skeleton: CardsRowSkeleton,
});
