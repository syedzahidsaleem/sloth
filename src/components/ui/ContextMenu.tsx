import { AnimatePresence, motion } from 'motion/react';
import {
  FC,
  ReactNode,
  useState,
  useRef,
  useEffect,
  MouseEvent as ReactMouseEvent,
} from 'react';
import { cn } from '@/lib/utils';

export type ContextMenuItemProps = {
  icon?: ReactNode;
  label: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  className?: string;
};

export const ContextMenuItem: FC<ContextMenuItemProps> = ({
  icon,
  label,
  onClick,
  danger = false,
  disabled = false,
  className,
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={(e) => {
      e.stopPropagation();
      onClick?.();
    }}
    className={cn(
      'flex w-full cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors outline-none select-none',
      'hover:bg-foreground/10 active:bg-foreground/15',
      danger ? 'text-accent-red hover:bg-accent-red/10' : 'text-foreground',
      disabled && 'cursor-not-allowed opacity-50',
      className,
    )}
  >
    {icon && <span className="flex size-4 shrink-0 items-center justify-center">{icon}</span>}
    <span className="flex-1 truncate">{label}</span>
  </button>
);

export const ContextMenuSeparator: FC = () => (
  <div className="border-border my-1 border-t-(length:--border-width) opacity-40" />
);

export type ContextMenuProps = {
  trigger: ReactNode;
  children: ReactNode;
  triggerOn?: 'click' | 'contextmenu';
  className?: string;
  menuClassName?: string;
};

export const ContextMenu: FC<ContextMenuProps> = ({
  trigger,
  children,
  triggerOn = 'click',
  className,
  menuClassName,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const handleContextMenu = (e: ReactMouseEvent) => {
    if (triggerOn === 'contextmenu') {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  const handleClick = () => {
    if (triggerOn === 'click') {
      setIsOpen((prev) => !prev);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative inline-block', className)}
      onContextMenu={handleContextMenu}
      onClick={handleClick}
    >
      {trigger}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{
              type: 'spring',
              stiffness: 450,
              damping: 25,
            }}
            onClick={() => setIsOpen(false)}
            className={cn(
              'border-border surface-popover shadow-shadow absolute z-50 min-w-48 rounded-lg border-(length:--border-width) p-1.5 backdrop-blur-xl select-none',
              menuClassName,
            )}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
