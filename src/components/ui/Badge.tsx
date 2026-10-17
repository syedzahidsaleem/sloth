import { cva, type VariantProps } from 'class-variance-authority';
import { FC, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const badgeVariants = cva(
  'border-border inline-flex items-center justify-center border-(length:--border-width) whitespace-nowrap',
  {
    variants: {
      variant: {
        dot: 'size-2.5 rounded-full',
        pill: 'rounded-full px-2 py-0.5 text-xs font-semibold',
      },
      color: {
        green: '',
        cyan: '',
        orange: '',
        red: '',
        yellow: '',
        purple: '',
        blue: '',
        secondary: '',
        inverted: '',
      },
      animated: {
        true: 'animate-pulse',
        false: '',
      },
    },
    compoundVariants: [
      { variant: 'dot', color: 'green', className: 'surface-accent-green' },
      { variant: 'dot', color: 'cyan', className: 'surface-accent-cyan' },
      { variant: 'dot', color: 'orange', className: 'surface-accent-orange' },
      { variant: 'dot', color: 'red', className: 'surface-accent-red' },
      { variant: 'dot', color: 'yellow', className: 'surface-accent-yellow' },
      { variant: 'dot', color: 'purple', className: 'surface-accent-purple' },
      { variant: 'dot', color: 'blue', className: 'surface-accent-blue' },

      { variant: 'pill', color: 'secondary', className: 'bg-background text-foreground' },
      { variant: 'pill', color: 'inverted', className: 'bg-foreground text-muted' },
      { variant: 'pill', color: 'green', className: 'surface-accent-green' },
      { variant: 'pill', color: 'cyan', className: 'surface-accent-cyan' },
      { variant: 'pill', color: 'orange', className: 'surface-accent-orange' },
      { variant: 'pill', color: 'red', className: 'surface-accent-red' },
      { variant: 'pill', color: 'yellow', className: 'surface-accent-yellow' },
      { variant: 'pill', color: 'purple', className: 'surface-accent-purple' },
      { variant: 'pill', color: 'blue', className: 'surface-accent-blue' },
    ],
    defaultVariants: {
      variant: 'pill',
      color: 'secondary',
      animated: false,
    },
  },
);

export type BadgeProps = VariantProps<typeof badgeVariants> & {
  className?: string;
  children?: ReactNode;
};

export const Badge: FC<BadgeProps> = ({
  variant,
  color,
  animated,
  className,
  children,
}) => {
  return (
    <span className={cn(badgeVariants({ variant, color, animated, className }))}>
      {children}
    </span>
  );
};
