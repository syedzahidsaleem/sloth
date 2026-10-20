import { describe, it, expect } from 'vitest';
import { Sidebar, NAV_ITEMS } from '../components/layout/Sidebar';

describe('Sidebar Complete Wiring', () => {
  it('exports Sidebar component and NAV_ITEMS', () => {
    expect(Sidebar).toBeDefined();
    expect(Array.isArray(NAV_ITEMS)).toBe(true);
    expect(NAV_ITEMS.length).toBeGreaterThanOrEqual(4);
  });

  it('contains expected navigation keys', () => {
    const keys = NAV_ITEMS.map((item) => item.key);
    expect(keys).toContain('dashboard');
    expect(keys).toContain('search');
    expect(keys).toContain('favorite-tracks');
    expect(keys).toContain('history');
  });
});
