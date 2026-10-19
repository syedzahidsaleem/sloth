import { FC } from 'react';
import { ChevronLeft, ChevronRight, Search, X, Sparkles, Settings as SettingsIcon, Radio } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

export type TopBarProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit?: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
  onBack?: () => void;
  onForward?: () => void;
  onOpenSettings?: () => void;
  onOpenAskSloth?: () => void;
  onOpenJam?: () => void;
  version?: string;
  className?: string;
};

export const TopBar: FC<TopBarProps> = ({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  canGoBack = true,
  canGoForward = false,
  onBack,
  onForward,
  onOpenSettings,
  onOpenAskSloth,
  onOpenJam,
  version = 'v0.1.0',
  className = '',
}) => {
  return (
    <header
      className={cn(
        'surface-topbar border-border grid h-12 grid-cols-[auto_1fr_auto] items-center gap-4 border-b-(length:--border-width) px-3 select-none font-sans z-30',
        className,
      )}
    >
      {/* Left items: Logo, Back/Forward, UpdateBadge */}
      <div className="flex flex-row items-center gap-3">
        {/* App Logo */}
        <div
          className="flex items-center gap-2 cursor-pointer ml-0.5 group"
          title={`Sloth ${version}`}
        >
          <div className="size-6.5 rounded bg-primary text-primary-foreground flex items-center justify-center border-(length:--border-width) border-border shadow-xs group-hover:scale-105 transition-transform">
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 13a8 8 0 0 1 16 0" />
              <rect x="2" y="12" width="3.5" height="6" rx="1.5" fill="currentColor" />
              <rect x="18.5" y="12" width="3.5" height="6" rx="1.5" fill="currentColor" />
              <circle cx="12" cy="14" r="5" />
              <path d="M9.5 13.5a1.2 1.2 0 1 0 0 .1" fill="currentColor" />
              <path d="M14.5 13.5a1.2 1.2 0 1 0 0 .1" fill="currentColor" />
              <ellipse cx="12" cy="15.5" rx="1.2" ry="0.8" fill="currentColor" />
            </svg>
          </div>
          <span className="font-heading font-extrabold text-sm tracking-tight text-foreground hidden sm:inline">
            Sloth
          </span>
        </div>

        {/* Back and Forward navigation */}
        <div className="flex flex-row items-center gap-1.5">
          <Button
            size="icon-sm"
            variant="secondary"
            disabled={!canGoBack}
            onClick={onBack}
            aria-label="Back"
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            size="icon-sm"
            variant="secondary"
            disabled={!canGoForward}
            onClick={onForward}
            aria-label="Forward"
          >
            <ChevronRight size={16} />
          </Button>
        </div>

        {/* Green Update Badge */}
        <Badge
          data-testid="update-badge"
          variant="pill"
          color="green"
          animated
          className="cursor-pointer"
        >
          Click to update
        </Badge>
      </div>

      {/* Center item: Search box with search icon and clear button */}
      <div className="flex justify-center w-full max-w-xl mx-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSearchSubmit?.();
          }}
          className="relative w-full"
        >
          <Search className="text-foreground/60 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            data-testid="search-box"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onSearchSubmit?.();
              }
            }}
            placeholder="Search..."
            className="surface-input border-border text-foreground placeholder:text-foreground/50 h-8 w-full rounded border-(length:--border-width) pl-9 pr-8 text-sm outline-none focus:ring-1 focus:ring-border"
          />
          {searchQuery.length > 0 && (
            <button
              data-testid="search-box-clear"
              type="button"
              onClick={() => onSearchChange('')}
              className="text-foreground/60 hover:text-foreground absolute top-1/2 right-2.5 size-4 -translate-y-1/2 cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          )}
        </form>
      </div>

      {/* Right items: Jam / Ask Sloth / Settings button */}
      <div className="flex flex-row items-center justify-end gap-2">
        {onOpenAskSloth && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenAskSloth}
            className="gap-1.5 font-bold"
            title="Ask Sloth AI (Ctrl+K)"
          >
            <Sparkles size={14} />
            <span className="hidden sm:inline">Ask Sloth</span>
          </Button>
        )}

        {onOpenJam && (
          <Button
            variant="secondary"
            size="icon-sm"
            onClick={onOpenJam}
            title="Sloth Jam (Listen Together)"
          >
            <Radio size={16} />
          </Button>
        )}

        {onOpenSettings && (
          <Button
            data-testid="topbar-settings-button"
            variant="secondary"
            size="icon-sm"
            onClick={onOpenSettings}
            title="Preferences"
          >
            <SettingsIcon size={16} />
          </Button>
        )}
      </div>
    </header>
  );
};
