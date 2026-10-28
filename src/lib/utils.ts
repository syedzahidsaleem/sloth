import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges conditional class names using `clsx` and resolves Tailwind CSS class conflicts
 * using `tailwind-merge`. Ensures predictable styling across Neobrutalist design tokens.
 *
 * @param inputs - Variable list of class values, objects, or arrays
 * @returns Clean, deduplicated class string
 *
 * @example
 * ```ts
 * cn('px-4 py-2', isPrimary && 'bg-primary', className);
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
