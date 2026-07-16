import { describe, expect, it } from '@jest/globals';
import {
  computeBoardVerticalLayout,
  getBoardBodyHeight,
  getBoardGridBottomPadding,
  getBoardGridRowSpacerCount,
  getBoardGridVerticalInsets,
  getBoardTopicCellBox,
  getBoardTopicGridAlignment,
} from '@/features/play/boardLayout';

describe('board topic grid alignment', () => {
  it('vertically centers the topic grid and centers incomplete last rows (no left spacers)', () => {
    const alignment = getBoardTopicGridAlignment();

    // Single-row boards (quick play 3 topics) sit mid-viewport, not flush under the header.
    expect(alignment.contentJustifyContent).toBe('center');
    // Rows cluster remaining topics in the middle (like topic select), not left + empty.
    expect(alignment.rowJustifyContent).toBe('center');
    expect(alignment.padIncompleteRowsWithSpacers).toBe(false);
  });

  it('uses fixed cell boxes so a 2-of-3 last row can center at full-row cell width', () => {
    const box = getBoardTopicCellBox(180, 220);
    expect(box).toEqual({
      width: 180,
      height: 220,
      flexGrow: 0,
      flexShrink: 0,
    });
  });

  it('does not insert empty flex spacers on incomplete rows when centering is enabled', () => {
    const alignment = getBoardTopicGridAlignment();
    // 5 topics → row of 3 + row of 2 under a 3-column grid.
    expect(getBoardGridRowSpacerCount(2, 3, alignment.padIncompleteRowsWithSpacers)).toBe(0);
    expect(getBoardGridRowSpacerCount(3, 3, alignment.padIncompleteRowsWithSpacers)).toBe(0);
  });

  it('splits leftover viewport height equally so a short 1-row board (3 topics) is Y-centered', () => {
    // Landscape body under header: tall cream canvas, short single topic row.
    const insets = getBoardGridVerticalInsets({
      viewportHeight: 400,
      edgePadding: 12,
      rowCount: 1,
      rowHeight: 180,
      rowGap: 16,
    });

    // available = 400 - 24 = 376; free = 376 - 180 = 196; half = 98
    expect(insets.freeSpace).toBe(196);
    expect(insets.paddingTop).toBe(12 + 98);
    expect(insets.paddingBottom).toBe(12 + 98);
    expect(insets.paddingTop).toBe(insets.paddingBottom);
    // Padding alone expands a content-sized parent so topics leave the header band.
    expect(insets.paddingTop + 180 + insets.paddingBottom).toBe(400);
  });

  it('Y-centers a phone-landscape 3-topic board under a ~108px match header', () => {
    // 720p landscape body: window 720, header reserve 108, bottom inset 0 → body 612.
    const bodyHeight = getBoardBodyHeight({
      windowHeight: 720,
      bottomInset: 0,
      headerReserve: 108,
    });
    expect(bodyHeight).toBe(612);
    const insets = getBoardGridVerticalInsets({
      viewportHeight: bodyHeight,
      edgePadding: 16,
      rowCount: 1,
      rowHeight: 280,
      rowGap: 14,
    });
    expect(insets.freeSpace).toBeGreaterThan(100);
    expect(insets.paddingTop).toBe(insets.paddingBottom);
    // Content block midpoint sits near body midpoint.
    const contentMid = insets.paddingTop + 280 / 2;
    expect(contentMid).toBeCloseTo(bodyHeight / 2, 0);
  });

  it('sizes the board body to the window below the match header (not content height)', () => {
    expect(
      getBoardBodyHeight({
        windowHeight: 720,
        bottomInset: 12,
        headerReserve: 108,
      })
    ).toBe(720 - 12 - 108);
    // Must stay larger than a short 3-topic content block so flex spacers can center it.
    expect(
      getBoardBodyHeight({
        windowHeight: 720,
        bottomInset: 0,
        headerReserve: 108,
      })
    ).toBeGreaterThan(400);
  });

  it('does not double-stack home-indicator inset into iOS grid bottom padding', () => {
    // SafeAreaView already applies bottom inset on the board scaffold.
    expect(
      getBoardGridBottomPadding({
        platform: 'ios',
        bottomInset: 21,
        spacingSm: 8,
        spacingXs: 4,
      })
    ).toBe(8);
    expect(
      getBoardGridBottomPadding({
        platform: 'web',
        bottomInset: 0,
        spacingSm: 8,
        spacingXs: 4,
      })
    ).toBe(8);
    // Android keeps prior behavior (max(inset, xs) + sm).
    expect(
      getBoardGridBottomPadding({
        platform: 'android',
        bottomInset: 16,
        spacingSm: 8,
        spacingXs: 4,
      })
    ).toBe(24);
    expect(
      getBoardGridBottomPadding({
        platform: 'android',
        bottomInset: 0,
        spacingSm: 8,
        spacingXs: 4,
      })
    ).toBe(12); // max(0, xs) + sm — prior native formula
  });

  it('keeps only edge padding when stacked rows already fill the viewport', () => {
    const insets = getBoardGridVerticalInsets({
      viewportHeight: 400,
      edgePadding: 10,
      rowCount: 2,
      rowHeight: 185,
      rowGap: 20,
    });
    // 185*2 + 20 = 390; available = 380 → free clamped to 0
    expect(insets.freeSpace).toBe(0);
    expect(insets.paddingTop).toBe(10);
    expect(insets.paddingBottom).toBe(10);
  });
});

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
