/**
 * Sloth Utility Helper Unit Tests
 * Verifies classname merger, conditional resolution, and Tailwind conflict handling.
 */

import { describe, it, expect } from 'vitest';
import { cn } from '../lib/utils';

describe('Utility Helpers (src/lib/utils.ts)', () => {
  it('merges single and multiple plain class strings correctly', () => {
    expect(cn('font-bold', 'text-sm')).toBe('font-bold text-sm');
    expect(cn('p-4', 'm-2', 'flex')).toBe('p-4 m-2 flex');
  });

  it('handles conditional class expressions seamlessly', () => {
    const isTrue = true;
    const isFalse = false;
    expect(cn('base', isTrue && 'active', isFalse && 'inactive')).toBe('base active');
  });

  it('filters out falsy, null, and undefined values cleanly', () => {
    expect(cn('base', null, undefined, false, '', 0)).toBe('base');
  });

  it('resolves conflicting Tailwind CSS utilities in favor of the latter', () => {
    // p-2 should be overridden by p-4
    expect(cn('p-2', 'p-4')).toBe('p-4');
    // text-red-500 should be overridden by text-blue-500
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('supports nested array and object class definitions', () => {
    expect(cn(['flex', ['items-center']], { 'justify-between': true, hidden: false })).toBe(
      'flex items-center justify-between'
    );
  });
});
