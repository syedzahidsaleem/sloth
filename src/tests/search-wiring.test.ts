import { describe, it, expect } from 'vitest';
import { BROWSE_CATEGORIES } from '../app/search/page';

describe('Search Page Wiring', () => {
  it('defines all 14 browse categories with icons and styles', () => {
    expect(BROWSE_CATEGORIES).toHaveLength(14);
    const names = BROWSE_CATEGORIES.map((c) => c.name);
    expect(names).toContain('Pop');
    expect(names).toContain('Hip-Hop');
    expect(names).toContain('Electronic');
    expect(names).toContain('Rock');
    expect(names).toContain('Jazz');
    expect(names).toContain('Classical');
    expect(names).toContain('Ambient');
    expect(names).toContain('Lo-Fi');
    expect(names).toContain('Metal');
    expect(names).toContain('R&B');
    expect(names).toContain('Indie');
    expect(names).toContain('Folk');
    expect(names).toContain('Latin');
    expect(names).toContain('Blues');

    BROWSE_CATEGORIES.forEach((c) => {
      expect(c.icon).toBeDefined();
      expect(c.color).toBeDefined();
    });
  });
});
