import { cva, VariantProps } from 'class-variance-authority';
import { ComponentProps, FC, ReactNode } from 'react';
import { cn } from '@/lib/utils';

const emptyStateVariants = cva(
  'flex flex-col items-center justify-center text-center select-none',
  {
    variants: {
      size: {
        sm: 'gap-2 p-4',
        default: 'gap-4 p-8',
        lg: 'gap-6 p-12',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
);

export type EmptyStateProps = Omit<ComponentProps<'div'>, 'title'> &
  VariantProps<typeof emptyStateVariants> & {
    icon?: ReactNode;
    title: string;
    description?: string;
    action?: ReactNode;
  };

export const EmptyState: FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  size,
  className,
  ...props
}) => (
  <div
    data-testid="empty-state"
    className={cn(emptyStateVariants({ size, className }))}
    {...props}
  >
    {icon && <div className="text-foreground opacity-90">{icon}</div>}
    <div className="flex flex-col gap-2 max-w-md">
      <h3 className="text-foreground text-2xl font-bold tracking-tight">{title}</h3>
      {description && (
        <p className="text-foreground text-sm opacity-70 leading-relaxed">{description}</p>
      )}
    </div>
    {action && <div className="mt-3">{action}</div>}
  </div>
);
