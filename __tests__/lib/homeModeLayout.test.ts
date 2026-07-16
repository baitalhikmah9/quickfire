import { SPACING } from '@/constants';
import { getHomeModeCopyLayout, getHomeModeRowLayout } from '@/lib/layout/homeModeLayout';

describe('getHomeModeRowLayout', () => {
  it('uses taller aspect-ratio tiles and centers them on compact phone landscape', () => {
    const layout = getHomeModeRowLayout({
      isCompact: true,
      isWide: false,
      isTall: false,
    });

    expect(layout.fillHeight).toBe(true);
    // Aspect is always set so tiles cannot paint over the logo / settings bar.
    expect(layout.tileAspectRatio).toBe(0.72);
    expect(layout.tileAspectRatio).toBeLessThan(0.88);
    expect(layout.modeRowMarginTop).toBe(0);
    expect(layout.contentTopPad).toBe(SPACING.md);
    expect(layout.modeRowPaddingVertical).toBe(SPACING.xs);
    expect(layout.mainJustify).toBe('center');
  });

  it('keeps aspect-ratio tiles and top margin on non-compact phone-width shells', () => {
    const layout = getHomeModeRowLayout({
      isCompact: false,
      isWide: false,
      isTall: false,
    });

    expect(layout.fillHeight).toBe(false);
    expect(layout.tileAspectRatio).toBe(0.88);
    expect(layout.modeRowMarginTop).toBe(36);
    expect(layout.contentTopPad).toBe(SPACING.xl);
    expect(layout.mainJustify).toBe('flex-start');
  });

  it('centers aspect-ratio tiles on tall viewports', () => {
    const layout = getHomeModeRowLayout({
      isCompact: false,
      isWide: true,
      isTall: true,
    });

    expect(layout.fillHeight).toBe(false);
    expect(layout.tileAspectRatio).toBe(0.95);
    expect(layout.modeRowMarginTop).toBe(0);
    expect(layout.mainJustify).toBe('center');
  });
});

describe('getHomeModeCopyLayout', () => {
  it('uses Android-matched 11sp body and 3 lines so long blurbs are not clipped', () => {
    const layout = getHomeModeCopyLayout({ isWeb: false, hybridScale: 1 });

    expect(layout.fontSize).toBe(11);
    expect(layout.lineHeight).toBe(15);
    expect(layout.maxLines).toBe(3);
    expect(layout.minHeight).toBe(45);
  });

  it('scales modestly on wide hybrid web', () => {
    const layout = getHomeModeCopyLayout({ isWeb: true, hybridScale: 1.1 });

    expect(layout.fontSize).toBe(Math.round(12 * 1.1));
    expect(layout.maxLines).toBe(3);
    expect(layout.minHeight).toBe(layout.lineHeight * 3);
  });
});
