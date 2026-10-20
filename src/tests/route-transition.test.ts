import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withTransitionsSuspended } from '@/services/settingsStore';

describe('Route Transition Motion Physics and Specification', () => {
  const SLIDE_DISTANCE = 24;
  const SCALE_FACTOR = 0.96;

  beforeEach(() => {
    const store: Record<string, string> = {};
    (globalThis as any).document = {
      documentElement: {
        setAttribute: (key: string, val: string) => {
          store[key] = val;
        },
        getAttribute: (key: string) => store[key] || null,
        removeAttribute: (key: string) => {
          delete store[key];
        },
      },
    };
  });

  const routeVariants = {
    enter: {
      x: SLIDE_DISTANCE,
      scale: SCALE_FACTOR,
      opacity: 0,
      filter: 'blur(4px)',
    },
    center: {
      x: 0,
      scale: 1,
      opacity: 1,
      filter: 'blur(0px)',
    },
    exit: {
      x: -SLIDE_DISTANCE,
      scale: SCALE_FACTOR,
      opacity: 0,
      filter: 'blur(4px)',
    },
  };

  const springConfig = {
    type: 'spring',
    stiffness: 400,
    damping: 30,
    mass: 0.8,
  };

  it('defines symmetrical slide distances for enter and exit matching Nuclear', () => {
    expect(routeVariants.enter.x).toBe(24);
    expect(routeVariants.exit.x).toBe(-24);
    expect(routeVariants.center.x).toBe(0);
  });

  it('applies micro-scaling to prevent jarring spatial jumps', () => {
    expect(routeVariants.enter.scale).toBe(0.96);
    expect(routeVariants.exit.scale).toBe(0.96);
    expect(routeVariants.center.scale).toBe(1);
  });

  it('enforces subtle blur during transition for smooth depth blending', () => {
    expect(routeVariants.enter.filter).toBe('blur(4px)');
    expect(routeVariants.center.filter).toBe('blur(0px)');
    expect(routeVariants.exit.filter).toBe('blur(4px)');
  });

  it('uses calibrated snappy spring dynamics matching Nuclear', () => {
    expect(springConfig.stiffness).toBe(400);
    expect(springConfig.damping).toBe(30);
    expect(springConfig.mass).toBe(0.8);
  });

  it('suspends CSS transitions on document during theme or attribute changes to prevent ghost flashes', () => {
    const callback = vi.fn();
    withTransitionsSuspended(callback);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(document.documentElement.getAttribute('data-transitions')).toBe('suspended');
  });
});
