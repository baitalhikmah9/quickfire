/**
 * Pure vertical layout for the play board topic grid.
 *
 * Point pills (100/200/300) share the height of the topic image + title
 * (including in-rail gaps). On tall viewports, topic art grows to fill the
 * available row budget so free space becomes larger cards — not empty cream
 * bands. Stacked topic rows keep a modest inter-row gap.
 */

/** Alignment policy for the board topic grid (quick play 3/4/5, classic 6). */
export type BoardTopicGridAlignment = {
  /** Vertically center topic rows when content is shorter than the viewport. */
  contentJustifyContent: 'center';
  /** Horizontally center topics within each row. */
  rowJustifyContent: 'center';
  /**
   * When false, incomplete last rows (e.g. 2 of 3 for 5 topics) are not
   * left-padded with empty flex spacers — remaining cells keep fixed width
   * and center as a group (same idea as topic select).
   */
  padIncompleteRowsWithSpacers: false;
};

export function getBoardTopicGridAlignment(): BoardTopicGridAlignment {
  return {
    contentJustifyContent: 'center',
    rowJustifyContent: 'center',
    padIncompleteRowsWithSpacers: false,
  };
}

/** Fixed cell box so incomplete rows center at the same width as full rows. */
export function getBoardTopicCellBox(cellWidth: number, rowHeight: number) {
  return {
    width: Math.max(0, cellWidth),
    height: Math.max(0, rowHeight),
    flexGrow: 0 as const,
    flexShrink: 0 as const,
  };
}

/**
 * Empty flex spacers for incomplete grid rows.
 * Prefer 0 + fixed cell width + row justify center so remainders cluster mid-row.
 */
export function getBoardGridRowSpacerCount(
  itemsInRow: number,
  columnCount: number,
  padIncompleteRowsWithSpacers: boolean
): number {
  if (!padIncompleteRowsWithSpacers) return 0;
  return Math.max(0, columnCount - itemsInRow);
}

/**
 * Equal top/bottom padding that Y-centers the topic block when it is shorter
 * than the board body (e.g. quick play 3 topics / single row).
 */
export function getBoardGridVerticalInsets(input: {
  viewportHeight: number;
  edgePadding: number;
  rowCount: number;
  rowHeight: number;
  rowGap: number;
}): { paddingTop: number; paddingBottom: number; freeSpace: number } {
  const rows = Math.max(1, Math.floor(input.rowCount));
  const edge = Math.max(0, input.edgePadding);
  const rowHeight = Math.max(0, input.rowHeight);
  const rowGap = Math.max(0, input.rowGap);
  const blockHeight = rowHeight * rows + rowGap * Math.max(0, rows - 1);
  const available = Math.max(0, input.viewportHeight - edge * 2);
  const freeSpace = Math.max(0, available - blockHeight);
  const half = freeSpace / 2;
  return {
    paddingTop: edge + half,
    paddingBottom: edge + half,
    freeSpace,
  };
}

/**
 * Fixed height for the board topic body under the match header.
 * Used with equal flex spacers so short boards (3 topics) sit mid-screen
 * even when the flex chain under PlayScaffold only wraps content height.
 */
export function getBoardBodyHeight(input: {
  windowHeight: number;
  bottomInset: number;
  headerReserve: number;
  minHeight?: number;
}): number {
  const minHeight = input.minHeight ?? 160;
  return Math.max(
    minHeight,
    Math.max(0, input.windowHeight) -
      Math.max(0, input.bottomInset) -
      Math.max(0, input.headerReserve)
  );
}

export type BoardVerticalLayoutInput = {
  viewportHeight: number;
  /**
   * Total vertical inset reserved outside topic rows (top + bottom).
   * Phone boards use equal top/bottom padding so the grid is not flush under the header.
   */
  gridVerticalPadding: number;
  gridRowCount: number;
  maxQuestionRows: number;
  baseGridGap: number;
  pointRailGap: number;
  pointRailClipBleed: number;
  /** Preferred topic image width; art height = size * ratio (capped by row budget). */
  topicImageSize: number;
  topicArtHeightRatio: number;
  /** Preferred title block height before clamping to the row. */
  titleHeightBudget: number;
  /** Gap between topic image and title in the center column. */
  centerBlockGap: number;
  /** Optional width-derived cap on row content (image + gap + title) height. */
  maxRowContentHeight?: number;
};

export type BoardVerticalLayout = {
  boardRowHeight: number;
  pointPillHeight: number;
  /** Vertical gap between stacked topic grid rows (may exceed baseGridGap). */
  topicRowGap: number;
  /** Resolved topic illustration height used for the pill rail target. */
  topicImageHeight: number;
  /** Resolved title block height used for the pill rail target. */
  topicTitleHeight: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

/**
 * Compute board row height, point-pill height, and inter-topic row gap.
 *
 * Pill formula:
 *   contentHeight = imageHeight + centerBlockGap + titleHeight
 *   pointPillHeight = (contentHeight - railGaps - clipBleed) / questionRows
 *
 * Image height fills the available row budget (grows on tall web, shrinks on
 * short phones) so the board uses vertical space instead of floating small.
 */
export function computeBoardVerticalLayout(input: BoardVerticalLayoutInput): BoardVerticalLayout {
  const rows = Math.max(1, Math.floor(input.gridRowCount));
  const qRows = Math.max(1, Math.floor(input.maxQuestionRows));
  const usable = Math.max(1, input.viewportHeight - Math.max(0, input.gridVerticalPadding));
  const baseGap = Math.max(0, input.baseGridGap);
  const centerGap = Math.max(0, input.centerBlockGap);

  // Phone-tight separation between stacked topics (stay near base grid gap).
  const preferredTopicRowGap =
    rows > 1 ? Math.max(baseGap, Math.round(baseGap * 5.1), 16) : baseGap;

  const minRowContent = Math.min(96, Math.floor(usable / rows));
  const maxAffordableGap =
    rows > 1 ? Math.max(baseGap, (usable - minRowContent * rows) / (rows - 1)) : baseGap;
  const topicRowGap = rows > 1 ? Math.min(preferredTopicRowGap, maxAffordableGap) : baseGap;

  const stretchedRowHeight = Math.max(1, (usable - topicRowGap * (rows - 1)) / rows);
  // Width cap: square point tiles scale with row height, so unbounded rows
  // overflow the cell horizontally on wide/tall viewports (web).
  const rowBudget = Math.max(
    1,
    Math.min(stretchedRowHeight, input.maxRowContentHeight ?? Number.POSITIVE_INFINITY)
  );

  // Title band: compact on tall rows, but stay readable on dense 2-row phone
  // boards (classic/rumble/random 3×2). A pure 20% share dropped titles to ~8pt.
  const minArtHeight = 40;
  const titleMax = Math.max(1, rowBudget - centerGap - minArtHeight);
  const titleShare = Math.max(1, rowBudget * 0.28);
  const readableFloor = Math.min(30, titleMax);
  const topicTitleHeight = Math.min(
    Math.max(1, input.titleHeightBudget),
    titleMax,
    Math.max(titleShare, readableFloor)
  );
  const maxImageHeight = Math.max(1, rowBudget - topicTitleHeight - centerGap);
  const preferredArtHeight = Math.max(48, input.topicImageSize * input.topicArtHeightRatio);
  // Fill the full row art budget (tall web grows cards; short phones shrink via max).
  const topicImageHeight = Math.min(
    maxImageHeight,
    Math.max(preferredArtHeight, maxImageHeight)
  );

  const contentHeight = topicImageHeight + centerGap + topicTitleHeight;
  const boardRowHeight = Math.min(contentHeight, stretchedRowHeight);

  const railChrome =
    Math.max(0, input.pointRailGap) * Math.max(0, qRows - 1) + Math.max(0, input.pointRailClipBleed);
  const contentPillHeight = Math.max(1, (contentHeight - railChrome) / qRows);
  const fillPillHeight = Math.max(1, (boardRowHeight - railChrome) / qRows);
  const pointPillHeight = clamp(contentPillHeight, 1, fillPillHeight);

  return {
    boardRowHeight,
    pointPillHeight,
    topicRowGap,
    topicImageHeight,
    topicTitleHeight,
  };
}
