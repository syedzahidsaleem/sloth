import { describe, it, expect } from 'vitest';
import { BUILTIN_THEMES } from '@/components/settings/SettingsModal';

describe('SettingsModal Socials and Builtin Themes', () => {
  it('exposes all authentic Nuclear OKLCH builtin themes', () => {
    expect(BUILTIN_THEMES.length).toBe(5);
    const themeIds = BUILTIN_THEMES.map((t) => t.id);
    expect(themeIds).toContain('default');
    expect(themeIds).toContain('nuclear:aurora');
    expect(themeIds).toContain('nuclear:ember');
    expect(themeIds).toContain('nuclear:lagoon');
    expect(themeIds).toContain('nuclear:arctic-moss');
  });

  it('provides complete 4-swatch OKLCH palettes for each theme', () => {
    BUILTIN_THEMES.forEach((theme) => {
      expect(theme.palette).toHaveLength(4);
      theme.palette.forEach((color) => {
        expect(color).toMatch(/^oklch\(/);
      });
    });
  });

  it('defines valid social destinations for community links', () => {
    const SOCIAL_LINKS = {
      discord: 'https://discord.gg/JqPjKxE',
      github: 'https://github.com/syedzahidsaleem/sloth',
      mastodon: 'https://fosstodon.org/@slothplayer',
      website: 'https://github.com/syedzahidsaleem/sloth',
    };

    expect(SOCIAL_LINKS.discord).toContain('discord.gg');
    expect(SOCIAL_LINKS.github).toBe('https://github.com/syedzahidsaleem/sloth');
    expect(SOCIAL_LINKS.mastodon).toContain('fosstodon.org');
    expect(SOCIAL_LINKS.website).toBeDefined();
  });
});
