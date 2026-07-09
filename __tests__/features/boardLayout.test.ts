import { describe, expect, it } from '@jest/globals';
import { computeBoardVerticalLayout } from '@/features/play/boardLayout';

describe('computeBoardVerticalLayout', () => {
  const base = {
    viewportHeight: 360,
    gridVerticalPadding: 16,
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
    const railStack =
      layout.pointPillHeight * 3 + base.pointRailGap * 2 + base.pointRailClipBleed;
    expect(railStack).toBeCloseTo(contentHeight, 5);
    expect(layout.boardRowHeight).toBeCloseTo(contentHeight, 5);
    expect(layout.pointPillHeight).toBeGreaterThan(42);
  });

  it('grows topic art to fill tall viewports instead of leaving large empty bands', () => {
    const layout = computeBoardVerticalLayout({
      ...base,
      gridRowCount: 2,
      viewportHeight: 720,
      gridVerticalPadding: 12,
      topicImageSize: 120,
      topicArtHeightRatio: 1.1,
      titleHeightBudget: 48,
    });

    const usable = 720 - 12;
    const contentHeight =
      layout.topicImageHeight + base.centerBlockGap + layout.topicTitleHeight;
    expect(layout.boardRowHeight).toBeCloseTo(contentHeight, 5);

    const packed = layout.boardRowHeight * 2 + layout.topicRowGap;
    // Phone-like density: free space becomes larger cards; keep inter-row gap modest.
    expect(packed).toBeGreaterThan(usable * 0.97);
    expect(packed).toBeLessThanOrEqual(usable + 0.01);
    // Grew beyond the small preferred art size and fully uses the row art budget.
    expect(layout.topicImageHeight).toBeGreaterThan(120 * 1.1);
    const stretchedRow = (usable - layout.topicRowGap) / 2;
    const maxImageBudget =
      stretchedRow - layout.topicTitleHeight - base.centerBlockGap;
    expect(layout.topicImageHeight).toBeCloseTo(maxImageBudget, 1);
    // Title stays a compact band so art owns most of the row.
    expect(layout.topicTitleHeight).toBeLessThanOrEqual(contentHeight * 0.32);
    expect(layout.topicRowGap).toBeLessThanOrEqual(Math.round(base.baseGridGap * 5.1));
  });

  it('keeps category titles readable on two-row phone boards (classic/rumble 3×2)', () => {
    // Phone landscape grid after match chrome: two stacked topic rows.
    const layout = computeBoardVerticalLayout({
      ...base,
      gridRowCount: 2,
      viewportHeight: 270,
      gridVerticalPadding: 32,
      baseGridGap: 10,
      pointRailGap: 6,
      pointRailClipBleed: 5,
      topicImageSize: 96,
      topicArtHeightRatio: 1.08,
      titleHeightBudget: 47,
    });

    // ~2 lines at ~12pt needs roughly font * 2.4 ≥ 28px of title band height.
    expect(layout.topicTitleHeight).toBeGreaterThanOrEqual(28);
    const titleFontFromHeight = layout.topicTitleHeight / 2.4;
    expect(titleFontFromHeight).toBeGreaterThanOrEqual(11.5);
    // Art still gets the majority of the row.
    expect(layout.topicImageHeight).toBeGreaterThan(layout.topicTitleHeight);
  });

  it('keeps stacked topic row gap near the base grid gap (phone-tight)', () => {
    const layout = computeBoardVerticalLayout({
      ...base,
      gridRowCount: 2,
      viewportHeight: 420,
    });

    expect(layout.topicRowGap).toBeGreaterThanOrEqual(base.baseGridGap);
    expect(layout.topicRowGap).toBeLessThanOrEqual(Math.round(base.baseGridGap * 5.1));
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
    expect(stacked.topicRowGap).toBeGreaterThanOrEqual(single.topicRowGap);

    const railChrome = base.pointRailGap * 2 + base.pointRailClipBleed;
    const content =
      stacked.topicImageHeight + base.centerBlockGap + stacked.topicTitleHeight;
    expect(stacked.pointPillHeight * 3 + railChrome).toBeCloseTo(content, 5);
    expect(stacked.boardRowHeight).toBeCloseTo(content, 5);
  });

  it('shrinks content when the viewport is too short for preferred art', () => {
    const layout = computeBoardVerticalLayout({
      ...base,
      gridRowCount: 2,
      viewportHeight: 200,
      gridVerticalPadding: 8,
      baseGridGap: 20,
      topicImageSize: 180,
      topicArtHeightRatio: 1.2,
    });

    const usable = 200 - 8;
    expect(layout.boardRowHeight * 2 + layout.topicRowGap).toBeLessThanOrEqual(usable + 0.01);
    expect(layout.boardRowHeight).toBeGreaterThanOrEqual(1);
    expect(layout.pointPillHeight).toBeGreaterThanOrEqual(1);
    expect(layout.topicImageHeight).toBeLessThan(180 * 1.2);
  });
});
