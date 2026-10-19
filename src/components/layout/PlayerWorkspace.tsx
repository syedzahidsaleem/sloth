import { PanelLeft, PanelRight } from 'lucide-react';
import { motion } from 'motion/react';
import { FC, ReactNode, useCallback, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export const SIDEBAR_CONFIG = {
  COLLAPSED_WIDTH: 54,
  DEFAULT_LEFT_WIDTH: 220,
  DEFAULT_RIGHT_WIDTH: 280,
  MIN_WIDTH: 160,
  MAX_WIDTH: 420,
} as const;

export type PlayerWorkspaceSidebarProps = {
  children?: ReactNode;
  headerActions?: ReactNode;
  footer?: ReactNode;
  persistentFooter?: ReactNode;
  isCollapsed: boolean;
  width: number;
  onWidthChange: (width: number) => void;
  onToggle: () => void;
  side: 'left' | 'right';
  className?: string;
};

export const PlayerWorkspaceSidebar: FC<PlayerWorkspaceSidebarProps> = ({
  children,
  headerActions,
  footer,
  persistentFooter,
  isCollapsed,
  width,
  onWidthChange,
  onToggle,
  side,
  className = '',
}) => {
  const isResizing = useRef(false);
  const [isResizingState, setIsResizingState] = useState(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isCollapsed) return;

      isResizing.current = true;
      setIsResizingState(true);
      e.preventDefault();

      const startX = e.clientX;
      const startWidth = width;

      const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing.current) return;
        const deltaX = side === 'left' ? e.clientX - startX : startX - e.clientX;
        const newWidth = Math.max(
          SIDEBAR_CONFIG.MIN_WIDTH,
          Math.min(SIDEBAR_CONFIG.MAX_WIDTH, startWidth + deltaX),
        );
        onWidthChange(newWidth);
      };

      const handleMouseUp = () => {
        isResizing.current = false;
        setIsResizingState(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [width, onWidthChange, side, isCollapsed],
  );

  const currentWidth = isCollapsed ? SIDEBAR_CONFIG.COLLAPSED_WIDTH : width;

  return (
    <motion.div
      data-testid={`sidebar-${side}`}
      className={cn(
        'border-border relative flex flex-col overflow-hidden select-none',
        {
          'surface-sidebar-left border-r-(length:--border-width)': side === 'left',
          'surface-sidebar-right border-l-(length:--border-width)': side === 'right',
        },
        className,
      )}
      animate={{ width: currentWidth }}
      transition={
        isResizingState
          ? { duration: 0 }
          : {
              type: 'spring',
              stiffness: 300,
              damping: 30,
              mass: 0.8,
            }
      }
    >
      <span
        className={cn('mb-2 flex flex-row items-center', {
          'justify-end': side === 'left',
          'justify-start': side === 'right',
          'px-2 pt-2': !isCollapsed,
        })}
      >
        <Button
          data-testid={`sidebar-toggle-${side}`}
          className={cn('top-2 px-2', {
            'right-1': side === 'left',
            'left-1': side === 'right',
            'mx-1 mt-2': side === 'right' && isCollapsed,
          })}
          variant="secondary"
          size="icon-sm"
          onClick={onToggle}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {side === 'left' ? <PanelLeft size={16} /> : <PanelRight size={16} />}
        </Button>
        {!isCollapsed && headerActions && (
          <span className="flex flex-1 items-center justify-end gap-1">
            {headerActions}
          </span>
        )}
      </span>

      <div
        className={cn('flex flex-1 flex-col overflow-hidden', {
          'px-2 pb-2': !isCollapsed,
        })}
      >
        {children}
      </div>

      {!isCollapsed && footer}

      {persistentFooter && (
        <div className="mt-auto flex flex-col items-center gap-2 py-2">
          {persistentFooter}
        </div>
      )}

      {!isCollapsed && (
        <div
          className={cn(
            'absolute top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/40 transition-colors',
            side === 'left' ? 'right-0' : 'left-0',
          )}
          onMouseDown={handleMouseDown}
        />
      )}
    </motion.div>
  );
};

export type PlayerWorkspaceLeftSidebarProps = Omit<PlayerWorkspaceSidebarProps, 'side'>;

export const PlayerWorkspaceLeftSidebar: FC<PlayerWorkspaceLeftSidebarProps> = (props) => (
  <PlayerWorkspaceSidebar side="left" className={cn(props.className, 'p-2')} {...props} />
);

export type PlayerWorkspaceRightSidebarProps = Omit<PlayerWorkspaceSidebarProps, 'side'>;

export const PlayerWorkspaceRightSidebar: FC<PlayerWorkspaceRightSidebarProps> = (props) => (
  <PlayerWorkspaceSidebar side="right" {...props} />
);

export type PlayerWorkspaceMainProps = {
  children?: ReactNode;
  className?: string;
};

export const PlayerWorkspaceMain: FC<PlayerWorkspaceMainProps> = ({
  children,
  className = '',
}) => {
  return (
    <main
      data-testid="player-workspace-main"
      className={cn('surface-background relative flex flex-1 min-h-0 overflow-auto', className)}
    >
      {children}
    </main>
  );
};

export type PlayerWorkspaceProps = {
  children: ReactNode;
  className?: string;
};

type PlayerWorkspaceComponent = FC<PlayerWorkspaceProps> & {
  LeftSidebar: typeof PlayerWorkspaceLeftSidebar;
  RightSidebar: typeof PlayerWorkspaceRightSidebar;
  Main: typeof PlayerWorkspaceMain;
};

const PlayerWorkspaceImpl: FC<PlayerWorkspaceProps> = ({ children, className = '' }) => {
  return (
    <div
      className={cn(
        'surface-muted relative grid h-full min-h-0 grid-cols-[auto_1fr_auto] overflow-hidden',
        className,
      )}
    >
      {children}
    </div>
  );
};

export const PlayerWorkspace = PlayerWorkspaceImpl as PlayerWorkspaceComponent;
PlayerWorkspace.LeftSidebar = PlayerWorkspaceLeftSidebar;
PlayerWorkspace.RightSidebar = PlayerWorkspaceRightSidebar;
PlayerWorkspace.Main = PlayerWorkspaceMain;
