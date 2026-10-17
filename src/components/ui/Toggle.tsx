import { forwardRef, ReactNode, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export type ToggleProps = {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  thumbIcon?: ReactNode;
  checkedThumbIcon?: ReactNode;
  id?: string;
};

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(function Toggle(
  {
    checked: controlledChecked,
    defaultChecked = false,
    onChange,
    label,
    disabled = false,
    className,
    thumbIcon,
    checkedThumbIcon,
    id,
    ...rest
  },
  ref,
) {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const isControlled = controlledChecked !== undefined;
  const isChecked = isControlled ? controlledChecked : internalChecked;

  useEffect(() => {
    if (isControlled) {
      setInternalChecked(controlledChecked);
    }
  }, [isControlled, controlledChecked]);

  const handleToggle = () => {
    if (disabled) return;
    const next = !isChecked;
    if (!isControlled) {
      setInternalChecked(next);
    }
    onChange?.(next);
  };

  return (
    <button
      id={id}
      ref={ref}
      type="button"
      role="switch"
      aria-checked={isChecked}
      aria-label={label}
      disabled={disabled}
      onClick={handleToggle}
      className={cn(
        'border-border focus-visible:ring-ring focus-visible:ring-offset-muted relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full border-(length:--border-width) transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none select-none',
        isChecked ? 'surface-primary' : 'surface-input',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
      {...rest}
    >
      <motion.span
        layout
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 30,
        }}
        className={cn(
          'border-border bg-muted pointer-events-none flex h-4 w-4 items-center justify-center rounded-full border-(length:--border-width) shadow-sm text-foreground',
          isChecked ? 'translate-x-5.5' : 'translate-x-0.5',
        )}
      >
        {isChecked && checkedThumbIcon ? checkedThumbIcon : thumbIcon}
      </motion.span>
    </button>
  );
});

Toggle.displayName = 'Toggle';
