/**
 * Pure vertical layout for the play board topic grid.
 *
 * Point pills (100/200/300) share the height of the topic image + title
 * (including in-rail gaps). On tall viewports, topic art grows to fill the
 * available row budget so free space becomes larger cards — not empty cream
 * bands. Stacked topic rows keep a modest inter-row gap.
 */

export type BoardVerticalLayoutInput = {
  viewportHeight: number;
  gridBottomPadding: number;
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
  const usable = Math.max(1, input.viewportHeight - input.gridBottomPadding);
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

  // Title keeps a compact band; most of the row budget goes to art.
  const topicTitleHeight = Math.min(
    Math.max(1, input.titleHeightBudget),
    Math.max(1, rowBudget * 0.2)
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
