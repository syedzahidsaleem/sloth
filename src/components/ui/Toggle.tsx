/**
 * Ensure any repository we take reference from or code from isn't referenced or spoken about anywhere either in files or readme or code
 * Original: packages/ui/src/components/Toggle/Toggle.tsx
 * Adapted for Sloth by syedzahidsaleem2@gmail.com
 * Changes: [styling system, data layer, routing]
 */

import { ComponentPropsWithoutRef, forwardRef, ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';

export type ToggleProps = Omit<
  ComponentPropsWithoutRef<'button'>,
  'onChange' | 'value' | 'role' | 'aria-checked'
> & {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  thumbIcon?: ReactNode;
  checkedThumbIcon?: ReactNode;
  name?: string;
  value?: string;
  form?: string;
};

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  (
    {
      checked: controlledChecked,
      defaultChecked = false,
      onChange,
      className,
      disabled,
      label,
      thumbIcon,
      checkedThumbIcon,
      name,
      value,
      form,
      ...rest
    },
    ref,
  ) => {
    const [internalChecked, setInternalChecked] = useState(defaultChecked);
    const isChecked = controlledChecked !== undefined ? controlledChecked : internalChecked;

    const handleClick = () => {
      if (disabled) return;
      const next = !isChecked;
      if (controlledChecked === undefined) {
        setInternalChecked(next);
      }
      onChange?.(next);
    };

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={isChecked}
        aria-label={label}
        disabled={disabled}
        name={name}
        value={value}
        form={form}
        onClick={handleClick}
        data-checked={isChecked ? '' : undefined}
        className={cn(
          'border-border focus:ring-ring focus:ring-offset-muted relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full border-(length:--border-width) transition-all focus:ring-2 focus:ring-offset-2 focus:outline-none select-none',
          isChecked ? 'surface-primary' : 'surface-input',
          disabled && 'cursor-not-allowed opacity-50',
          'group',
          className,
        )}
        {...rest}
      >
        <span
          className={cn(
            'border-border bg-muted [&>svg]:fill-muted pointer-events-none flex h-4 w-4 items-center justify-center rounded-full border-(length:--border-width) ring-0 transition-transform',
            isChecked ? 'translate-x-5' : 'translate-x-1',
          )}
        >
          {isChecked && checkedThumbIcon ? checkedThumbIcon : thumbIcon}
        </span>
      </button>
    );
  },
);

Toggle.displayName = 'Toggle';
