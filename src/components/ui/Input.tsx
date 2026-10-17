import { cva, type VariantProps } from 'class-variance-authority';
import { ComponentPropsWithoutRef, forwardRef, useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const inputVariants = cva(
  'border-border focus-visible:ring-ring focus-visible:ring-offset-muted w-full px-3 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
  {
    variants: {
      variant: {
        text: '',
        number: '',
        password: '',
        borderless:
          'border-b-border !rounded-none rounded-none !border-r-0 !border-l-0 border-t-transparent px-6 outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
      },
      tone: {
        primary: 'surface-input placeholder:text-input-foreground/60',
        secondary:
          'surface-background text-foreground placeholder:text-foreground/60',
      },
      size: {
        sm: 'h-9 text-sm',
        default: 'h-10 text-base',
        lg: 'h-11 text-lg',
      },
      state: {
        normal: '',
        error: 'border-accent-red',
      },
      withAddon: {
        false: 'rounded-md border-(length:--border-width)',
        true: 'rounded-l border-0 focus-visible:ring-0 focus-visible:ring-offset-0',
      },
    },
    defaultVariants: {
      variant: 'text',
      tone: 'primary',
      size: 'default',
      state: 'normal',
      withAddon: false,
    },
  },
);

export type InputProps = Omit<ComponentPropsWithoutRef<'input'>, 'size'> &
  VariantProps<typeof inputVariants> & {
    label?: string;
    description?: string;
    error?: string;
    startAddon?: ReactNode;
    endAddon?: ReactNode;
  };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    id,
    label,
    description,
    error,
    variant = 'text',
    tone = 'primary',
    size,
    className,
    startAddon,
    endAddon,
    type,
    ...rest
  },
  ref,
) {
  const reactId = useId();
  const inputId = id ?? `input-${reactId}`;
  const labelId = `${inputId}-label`;
  const descriptionId = `${inputId}-description`;
  const errorId = `${inputId}-error`;

  const state = error ? 'error' : 'normal';
  const resolvedType =
    type ?? (variant === 'password' ? 'password' : variant === 'number' ? 'number' : 'text');

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          id={labelId}
          className="text-foreground text-sm font-semibold select-none"
        >
          {label}
        </label>
      )}
      <div className="relative flex w-full items-center">
        {startAddon && (
          <div className="border-border surface-muted flex h-10 items-center justify-center border-y-(length:--border-width) border-l-(length:--border-width) rounded-l-md px-3 text-sm">
            {startAddon}
          </div>
        )}
        <input
          id={inputId}
          ref={ref}
          type={resolvedType}
          aria-describedby={
            [description ? descriptionId : null, error ? errorId : null]
              .filter(Boolean)
              .join(' ') || undefined
          }
          className={cn(
            inputVariants({
              variant,
              tone,
              size,
              state,
              withAddon: Boolean(startAddon || endAddon),
              className,
            }),
          )}
          {...rest}
        />
        {endAddon && (
          <div className="border-border surface-muted flex h-10 items-center justify-center border-y-(length:--border-width) border-r-(length:--border-width) rounded-r-md px-3 text-sm">
            {endAddon}
          </div>
        )}
      </div>
      {description && !error && (
        <p id={descriptionId} className="text-foreground/60 text-xs">
          {description}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-accent-red text-xs font-medium">
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
