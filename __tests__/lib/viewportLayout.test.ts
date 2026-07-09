import {
  getContentMaxWidth,
  getViewportLayout,
  type ContentWidthKind,
} from '@/lib/layout/viewportLayout';
import { BREAKPOINTS, LAYOUT } from '@/constants';

describe('getViewportLayout', () => {
  it('keeps phone landscape compact and top-aligned', () => {
    const layout = getViewportLayout(800, 360);

    expect(layout.isWide).toBe(false);
    expect(layout.isCompact).toBe(true);
    expect(layout.mainJustify).toBe('flex-start');
    expect(layout.scale).toBeGreaterThanOrEqual(0.85);
    expect(layout.scale).toBeLessThanOrEqual(1.08);
    expect(layout.shortSide).toBe(360);
  });

  it('treats laptop web as wide with centered main and modest scale', () => {
    const layout = getViewportLayout(1440, 900);

    expect(layout.isWide).toBe(true);
    expect(layout.isCompact).toBe(false);
    expect(layout.mainJustify).toBe('center');
    expect(layout.scale).toBeGreaterThanOrEqual(0.9);
    expect(layout.scale).toBeLessThanOrEqual(1.15);
    // Hybrid: grows modestly, not unbounded with the long edge
    expect(layout.scale).toBeLessThan(1.2);
  });

  it('uses the shared wide breakpoint (categories/board)', () => {
    expect(getViewportLayout(BREAKPOINTS.wide - 1, 800).isWide).toBe(false);
    expect(getViewportLayout(BREAKPOINTS.wide, 800).isWide).toBe(true);
  });

  it('clamps scale on very large desktops', () => {
    const layout = getViewportLayout(3840, 2160);
    expect(layout.scale).toBeLessThanOrEqual(1.15);
  });

  it('clamps scale on tiny viewports', () => {
    const layout = getViewportLayout(320, 240);
    expect(layout.scale).toBeGreaterThanOrEqual(0.85);
  });
});

describe('getContentMaxWidth', () => {
  const kinds: ContentWidthKind[] = ['form', 'hub', 'play', 'playWide', 'setup'];

  it('maps each content kind to LAYOUT tokens', () => {
    expect(getContentMaxWidth('form')).toBe(LAYOUT.formMaxWidth);
    expect(getContentMaxWidth('hub')).toBe(LAYOUT.hubMaxWidth);
    expect(getContentMaxWidth('play')).toBe(LAYOUT.playMaxWidth);
    expect(getContentMaxWidth('playWide')).toBe(LAYOUT.playWideMaxWidth);
    expect(getContentMaxWidth('setup')).toBe(LAYOUT.setupMaxWidth);
  });

  it('keeps form width as the legacy contentMaxWidth alias', () => {
    expect(LAYOUT.formMaxWidth).toBe(LAYOUT.contentMaxWidth);
    expect(kinds).toContain('form');
  });
});
