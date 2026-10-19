/**
 * Ensure any repository we take reference from or code from isn't referenced or spoken about anywhere either in files or readme or code
 * Original: packages/ui/src/components/Popover/Popover.tsx & PopoverItem.tsx
 * Adapted for Sloth by syedzahidsaleem2@gmail.com
 * Changes: [styling system, data layer, routing]
 */

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  FC,
  ReactNode,
  useState,
  useRef,
  useEffect,
  MouseEvent as ReactMouseEvent,
  PropsWithChildren,
} from 'react';
import { cn } from '@/lib/utils';

export type ContextMenuItemProps = {
  icon?: ReactNode;
  label?: ReactNode;
  children?: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  intent?: 'default' | 'danger';
  disabled?: boolean;
  className?: string;
};

export const ContextMenuItem: FC<ContextMenuItemProps> = ({
  icon,
  label,
  children,
  onClick,
  danger = false,
  intent = danger ? 'danger' : 'default',
  disabled = false,
  className,
  ...props
}) => {
  const content = children ?? label;
  const isDanger = intent === 'danger' || danger;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        'flex w-full cursor-pointer items-center gap-3 border-t border-transparent px-3 py-2 text-left text-sm outline-none not-last:border-b first:border-t-0 last:border-b-0 transition-colors select-none',
        'hover:surface-muted hover:border-border',
        isDanger ? 'text-accent-red hover:bg-accent-red/10' : 'text-foreground',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
      {...props}
    >
      {icon && <span className="w-4 shrink-0 flex items-center justify-center">{icon}</span>}
      <span className="flex-1 truncate">{content}</span>
    </button>
  );
};

export const PopoverItem = ContextMenuItem;

export const ContextMenuSeparator: FC = () => (
  <div className="border-border my-1 border-t-(length:--border-width) opacity-40" />
);

export const PopoverMenu: FC<PropsWithChildren<{ className?: string }>> = ({
  children,
  className,
}) => (
  <div className={cn('flex flex-col', className)}>
    {children}
  </div>
);

export const PopoverSection: FC<PropsWithChildren<{ title?: string; className?: string }>> = ({
  title,
  children,
  className,
}) => (
  <div className={cn('flex flex-col py-1', className)}>
    {title && (
      <span className="text-foreground/50 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
        {title}
      </span>
    )}
    {children}
  </div>
);

export const PopoverFooter: FC<PropsWithChildren<{ className?: string }>> = ({
  children,
  className,
}) => (
  <div className={cn('border-border border-t-(length:--border-width) pt-2 mt-2 px-3 text-xs text-foreground/60', className)}>
    {children}
  </div>
);

export type ContextMenuProps = {
  trigger: ReactNode;
  children: ReactNode;
  triggerOn?: 'click' | 'contextmenu';
  className?: string;
  menuClassName?: string;
  panelClassName?: string;
};

export const ContextMenu: FC<ContextMenuProps> = ({
  trigger,
  children,
  triggerOn = 'click',
  className,
  menuClassName,
  panelClassName,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const shouldReduce = useReducedMotion();

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
            initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.98 }}
            animate={shouldReduce ? { opacity: 1 } : { opacity: 1, y: 8, scale: 1 }}
            exit={shouldReduce ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.98 }}
            transition={{
              type: 'spring',
              stiffness: 450,
              damping: 25,
            }}
            onClick={() => setIsOpen(false)}
            className={cn(
              'surface-popover border-border shadow-shadow absolute z-50 min-w-48 rounded border-(length:--border-width) px-2 py-1 leading-5 select-none',
              menuClassName,
              panelClassName,
            )}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const Popover = ContextMenu as typeof ContextMenu & {
  Item: typeof PopoverItem;
  Menu: typeof PopoverMenu;
  Section: typeof PopoverSection;
  Footer: typeof PopoverFooter;
};
Popover.Item = PopoverItem;
Popover.Menu = PopoverMenu;
Popover.Section = PopoverSection;
Popover.Footer = PopoverFooter;
