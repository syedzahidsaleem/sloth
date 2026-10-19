import { FC, ReactNode } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export type SidebarItemProps = {
  icon: ReactNode;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  badge?: ReactNode;
  isCompact?: boolean;
};

export const SidebarItem: FC<SidebarItemProps> = ({
  icon,
  label,
  isActive = false,
  onClick,
  badge,
  isCompact = false,
}) => (
  <button
    type="button"
    onClick={onClick}
    title={isCompact ? label : undefined}
    className={cn(
      'group relative flex w-full items-center gap-3 rounded px-3 py-2 text-sm font-semibold transition-all outline-none select-none border-(length:--border-width)',
      isActive
        ? 'surface-primary border-border shadow-shadow font-bold'
        : 'text-foreground/80 hover:text-foreground hover:bg-foreground/10 border-transparent',
      isCompact && 'justify-center px-0 size-10',
    )}
  >
    <div className="flex size-5 shrink-0 items-center justify-center">
      {icon}
    </div>
    {!isCompact && (
      <span className="truncate flex-1 text-left">{label}</span>
    )}
    {!isCompact && badge && (
      <span className="shrink-0">{badge}</span>
    )}
  </button>
);

export type SidebarSectionProps = {
  title?: string;
  children: ReactNode;
  isCompact?: boolean;
};

export const SidebarSection: FC<SidebarSectionProps> = ({
  title,
  children,
  isCompact = false,
}) => (
  <div className="flex flex-col gap-1 w-full">
    {title && !isCompact && (
      <h4 className="text-foreground/50 px-3 py-1.5 text-[11px] font-bold tracking-wider uppercase">
        {title}
      </h4>
    )}
    {children}
  </div>
);

export type SidebarProps = {
  isCompact?: boolean;
  onToggleCompact?: () => void;
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
};

export const Sidebar: FC<SidebarProps> = ({
  isCompact = false,
  onToggleCompact,
  header,
  footer,
  children,
  className,
}) => {
  return (
    <motion.aside
      animate={{ width: isCompact ? 64 : 220 }}
      transition={{
        type: 'spring',
        stiffness: 350,
        damping: 30,
        mass: 0.8,
      }}
      className={cn(
        'surface-sidebar-left border-border flex h-full flex-col justify-between border-r-(length:--border-width) p-3 select-none relative',
        className,
      )}
    >
      <div className="flex flex-col gap-4">
        {header && <div className="mb-2">{header}</div>}
        <div className="flex flex-col gap-3">{children}</div>
      </div>

      <div className="flex flex-col gap-2 pt-3 border-t-(length:--border-width) border-border/40">
        {footer}
        {onToggleCompact && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleCompact}
            className="w-full flex items-center justify-center gap-2 text-xs"
            aria-label={isCompact ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCompact ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            {!isCompact && <span>Collapse</span>}
          </Button>
        )}
      </div>
    </motion.aside>
  );
};
