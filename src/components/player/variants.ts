/**
 * Sloth Player Component Variants — Class Variance Authority (CVA)
 * Neobrutalist tactile depth and flat UI tokens.
 */

import { cva } from 'class-variance-authority';

export const playerControlVariants = cva(
  'inline-flex items-center justify-center font-medium select-none transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40',
  {
    variants: {
      variant: {
        default:
          'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] border border-transparent rounded-[4px]',
        primary:
          'bg-[var(--color-accent)] text-[var(--color-accent-foreground)] hover:brightness-110 active:scale-95 rounded-[4px] shadow-sm',
        accentToggle:
          'bg-[var(--surface-raised)] text-[var(--color-accent)] border border-[var(--color-accent)]/40 rounded-[4px]',
        ghost:
          'bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-[4px]',
      },
      size: {
        sm: 'size-7 text-xs',
        md: 'size-9 text-sm',
        lg: 'size-10 text-base',
        play: 'size-10 text-base',
      },
      active: {
        true: 'text-[var(--color-accent)]',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      active: false,
    },
  }
);

export const queueRowVariants = cva(
  'group relative flex items-center gap-3 px-3 py-2 rounded-[4px] border transition-colors select-none cursor-pointer',
  {
    variants: {
      state: {
        default:
          'bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--surface-raised)] hover:border-[var(--text-muted)]/40 text-[var(--text-primary)]',
        active:
          'bg-[var(--surface-raised)] border-[var(--color-accent)] text-[var(--text-primary)] shadow-sm',
        dragging:
          'bg-[var(--surface-raised)] border-[var(--color-accent)] opacity-60 shadow-lg',
      },
    },
    defaultVariants: {
      state: 'default',
    },
  }
);

export const progressBarVariants = cva(
  'relative w-full cursor-pointer select-none group',
  {
    variants: {
      thickness: {
        default: 'h-[3px] hover:h-[5px]',
        expanded: 'h-[6px]',
      },
    },
    defaultVariants: {
      thickness: 'default',
    },
  }
);
