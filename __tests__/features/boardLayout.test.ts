import { describe, expect, it } from '@jest/globals';
import { computeBoardVerticalLayout } from '@/features/play/boardLayout';

describe('computeBoardVerticalLayout', () => {
  const base = {
    viewportHeight: 360,
    gridBottomPadding: 16,
    maxQuestionRows: 3,
    baseGridGap: 14,
    pointRailGap: 10,
    pointRailClipBleed: 6,
    topicImageSize: 118,
    topicArtHeightRatio: 1.06,
    titleHeightBudget: 70,
    centerBlockGap: 2,
  };

  it('divides image + title height across the three point pills including rail gaps', () => {
    const layout = computeBoardVerticalLayout({
      ...base,
      gridRowCount: 1,
      viewportHeight: 400,
    });

    const railChrome = base.pointRailGap * 2 + base.pointRailClipBleed;
    const contentHeight =
      layout.topicImageHeight + base.centerBlockGap + layout.topicTitleHeight;
    const expectedPill = (contentHeight - railChrome) / 3;

    expect(layout.pointPillHeight).toBeCloseTo(expectedPill, 5);
    // Rail stack matches center column (image + gap + title), not leftover board row.
    const railStack =
      layout.pointPillHeight * 3 + base.pointRailGap * 2 + base.pointRailClipBleed;
    expect(railStack).toBeCloseTo(contentHeight, 5);
    expect(contentHeight).toBeLessThan(layout.boardRowHeight);
    // Larger than the old art-only ~42px cap for a single-row board.
    expect(layout.pointPillHeight).toBeGreaterThan(42);
  });

  it('uses a larger gap between stacked topic rows than the base grid gap', () => {
    const layout = computeBoardVerticalLayout({
      ...base,
      gridRowCount: 2,
      viewportHeight: 420,
    });

    expect(layout.topicRowGap).toBeGreaterThan(base.baseGridGap);
    expect(layout.topicRowGap).toBeGreaterThanOrEqual(base.pointRailGap * 2);
  });

  it('keeps multi-row topic separation and still fills image+title per row', () => {
    const single = computeBoardVerticalLayout({
      ...base,
      gridRowCount: 1,
      viewportHeight: 380,
    });
    const stacked = computeBoardVerticalLayout({
      ...base,
      gridRowCount: 2,
      viewportHeight: 380,
    });

    expect(single.topicRowGap).toBe(base.baseGridGap);
    expect(stacked.topicRowGap).toBeGreaterThan(single.topicRowGap);

    const railChrome = base.pointRailGap * 2 + base.pointRailClipBleed;
    const content =
      stacked.topicImageHeight + base.centerBlockGap + stacked.topicTitleHeight;
    expect(stacked.pointPillHeight * 3 + railChrome).toBeCloseTo(content, 5);
  });

  it('does not request more inter-row gap than the viewport can afford', () => {
    const layout = computeBoardVerticalLayout({
      ...base,
      gridRowCount: 2,
      viewportHeight: 200,
      gridBottomPadding: 8,
      baseGridGap: 20,
    });

    const usable = 200 - 8;
    expect(layout.boardRowHeight * 2 + layout.topicRowGap).toBeLessThanOrEqual(usable + 0.01);
    expect(layout.boardRowHeight).toBeGreaterThanOrEqual(1);
    expect(layout.pointPillHeight).toBeGreaterThanOrEqual(1);
  });
});
