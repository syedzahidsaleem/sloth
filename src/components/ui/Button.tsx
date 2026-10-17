import { cva, type VariantProps } from 'class-variance-authority';
import { ComponentPropsWithoutRef, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center rounded-md whitespace-nowrap font-medium transition-all outline-none disabled:cursor-not-allowed disabled:opacity-50 select-none',
  {
    variants: {
      variant: {
        default:
          'surface-primary border-border shadow-shadow hover:translate-x-shadow-x hover:translate-y-shadow-y border-(length:--border-width) hover:shadow-none active:translate-x-shadow-x active:translate-y-shadow-y active:shadow-none',
        secondary:
          'surface-background border-border shadow-shadow hover:translate-x-shadow-x hover:translate-y-shadow-y border-(length:--border-width) hover:shadow-none active:translate-x-shadow-x active:translate-y-shadow-y active:shadow-none',
        tertiary:
          'surface-muted border-border shadow-shadow hover:translate-x-shadow-x hover:translate-y-shadow-y border-(length:--border-width) hover:shadow-none active:translate-x-shadow-x active:translate-y-shadow-y active:shadow-none',
        noShadow:
          'surface-primary border-border border-(length:--border-width)',
        text: 'hover:bg-foreground/10 text-foreground',
        ghost: 'hover:bg-foreground/10 border border-current text-foreground',
      },
      size: {
        default: 'h-10 px-4 py-2 text-sm',
        sm: 'h-9 px-3 text-xs',
        xs: 'h-8 px-2 text-xs',
        lg: 'h-11 px-8 text-base',
        icon: 'size-10 justify-center p-0',
        'icon-sm': 'size-8 justify-center p-0',
        flexible: 'h-auto',
      },
      intent: {
        danger: 'surface-accent-red border-border',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export type ButtonProps = ComponentPropsWithoutRef<'button'> &
  VariantProps<typeof buttonVariants>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, intent, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size, intent, className }))}
      {...rest}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';
