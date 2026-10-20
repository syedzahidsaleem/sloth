/**
 * Sloth UI Component
 * Author: Syed Zahid Saleem <syedzahidsaleem2@gmail.com>
 */

import {
  FC,
  ReactNode,
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  forwardRef,
} from 'react';
import { ChevronRight } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

type TrackContextMenuContextValue = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  close: () => void;
};

const TrackContextMenuContext = createContext<TrackContextMenuContextValue | null>(null);

export function useTrackContextMenu() {
  const ctx = useContext(TrackContextMenuContext);
  if (!ctx) {
    throw new Error('useTrackContextMenu must be used within TrackContextMenu');
  }
  return ctx;
}

// 1. Root
export type TrackContextMenuRootProps = {
  children: ReactNode;
  className?: string;
};

export const TrackContextMenuRoot: FC<TrackContextMenuRootProps> = ({ children, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <TrackContextMenuContext.Provider
      value={{
        isOpen,
        setIsOpen,
        close: () => setIsOpen(false),
      }}
    >
      <div ref={containerRef} className={cn('relative inline-flex', className)}>
        {children}
      </div>
    </TrackContextMenuContext.Provider>
  );
};

// 2. Trigger
export type TrackContextMenuTriggerProps = {
  children: ReactNode;
  asChild?: boolean;
};

export const TrackContextMenuTrigger = forwardRef<HTMLButtonElement, TrackContextMenuTriggerProps>(
  function TrackContextMenuTrigger({ children }, ref) {
    const { isOpen, setIsOpen } = useTrackContextMenu();
    return (
      <button
        ref={ref}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="inline-flex cursor-pointer items-center justify-center"
      >
        {children}
      </button>
    );
  },
);

// 3. Header
export type TrackContextMenuHeaderProps = {
  title: string;
  subtitle?: string;
  coverUrl?: string;
};

export const TrackContextMenuHeader: FC<TrackContextMenuHeaderProps> = ({
  title,
  subtitle,
  coverUrl,
}) => (
  <div className="border-border flex items-center gap-3 border-b-(length:--border-width)">
    {coverUrl && (
      <img
        src={coverUrl}
        alt=""
        className="border-border size-12 border-r-(length:--border-width) object-cover"
      />
    )}
    <div
      className={cn('min-w-0 flex-1 py-2 pr-3', {
        'pl-3': !coverUrl,
      })}
    >
      <div className="text-popover-foreground truncate text-sm font-bold">
        {title}
      </div>
      {subtitle && (
        <div className="text-popover-foreground/60 truncate text-xs">
          {subtitle}
        </div>
      )}
    </div>
  </div>
);

// 4. Action
export type TrackContextMenuActionProps = {
  icon?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  'data-testid'?: string;
};

export const TrackContextMenuAction: FC<TrackContextMenuActionProps> = ({
  icon,
  children,
  onClick,
  'data-testid': testId,
}) => {
  const { close } = useTrackContextMenu();

  return (
    <button
      type="button"
      role="menuitem"
      data-testid={testId}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
        close();
      }}
      className={cn(
        'hover:surface-muted hover:border-border text-popover-foreground flex w-full cursor-pointer items-center gap-2.5 border-t border-transparent px-3 py-2 text-left text-xs font-semibold outline-none transition-colors not-last:border-b',
      )}
    >
      {icon && <span className="text-popover-foreground/70 shrink-0">{icon}</span>}
      <span className="truncate">{children}</span>
    </button>
  );
};

// 5. Submenu
export type TrackContextMenuSubmenuProps = {
  icon?: ReactNode;
  label: string;
  children: ReactNode;
};

export const TrackContextMenuSubmenu: FC<TrackContextMenuSubmenuProps> = ({
  icon,
  label,
  children,
}) => {
  const [subOpen, setSubOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setSubOpen(true)}
      onMouseLeave={() => setSubOpen(false)}
    >
      <div
        className={cn(
          'hover:surface-muted hover:border-border text-popover-foreground flex w-full cursor-pointer items-center justify-between gap-2 border-t border-transparent px-3 py-2 text-left text-xs font-semibold outline-none transition-colors not-last:border-b',
        )}
      >
        <span className="flex items-center gap-2.5 truncate">
          {icon && <span className="text-popover-foreground/70 shrink-0">{icon}</span>}
          <span className="truncate">{label}</span>
        </span>
        <ChevronRight size={13} className="text-popover-foreground/50 shrink-0" />
      </div>

      <AnimatePresence>
        {subOpen && (
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.12 }}
            className="surface-popover border-border shadow-shadow absolute top-0 left-full z-50 ml-1 min-w-[160px] overflow-hidden rounded-[4px] border-(length:--border-width)"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// 6. Content
export type TrackContextMenuContentProps = {
  children: ReactNode;
  align?: 'start' | 'end';
  sideOffset?: number;
};

export const TrackContextMenuDivider: FC = () => (
  <div className="border-border my-1 border-b-(length:--border-width)" role="separator" />
);

export const TrackContextMenuContent: FC<TrackContextMenuContentProps> = ({
  children,
  align = 'end',
}) => {
  const { isOpen } = useTrackContextMenu();
  const prefersReduced = useReducedMotion();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="menu"
          initial={prefersReduced ? { opacity: 1 } : { opacity: 0, scale: 0.98, y: -2 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: -2 }}
          transition={{ duration: 0.12 }}
          className={cn(
            'surface-popover border-border shadow-shadow absolute z-50 w-56 overflow-hidden rounded-[4px] border-(length:--border-width) py-1 select-none',
            align === 'end' ? 'right-0 top-full mt-1 origin-top-right' : 'left-0 top-full mt-1 origin-top-left',
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Compound export
type TrackContextMenuType = typeof TrackContextMenuRoot & {
  Trigger: typeof TrackContextMenuTrigger;
  Content: typeof TrackContextMenuContent;
  Header: typeof TrackContextMenuHeader;
  Action: typeof TrackContextMenuAction;
  Submenu: typeof TrackContextMenuSubmenu;
};

export const TrackContextMenu = TrackContextMenuRoot as TrackContextMenuType;
TrackContextMenu.Trigger = TrackContextMenuTrigger;
TrackContextMenu.Content = TrackContextMenuContent;
TrackContextMenu.Header = TrackContextMenuHeader;
TrackContextMenu.Action = TrackContextMenuAction;
TrackContextMenu.Submenu = TrackContextMenuSubmenu;
