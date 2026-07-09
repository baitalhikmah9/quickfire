/**
 * Pure vertical layout for the play board topic grid.
 *
 * Point pills (100/200/300) share the height of the topic image + title
 * (including in-rail gaps). Stacked topic rows keep a larger inter-row gap
 * so multi-row boards don't read as one continuous list.
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
 * Pill formula (user intent):
 *   contentHeight = imageHeight + centerBlockGap + titleHeight
 *   pointPillHeight = (contentHeight - railGaps - clipBleed) / questionRows
 *
 * So the three buttons fill the center column, not leftover board-row chrome.
 *
 * When topics stack (2+ grid rows), the row gap is larger than the in-rail
 * pill gap so sections read as separate groups rather than one continuous list.
 */
export function computeBoardVerticalLayout(input: BoardVerticalLayoutInput): BoardVerticalLayout {
  const rows = Math.max(1, Math.floor(input.gridRowCount));
  const qRows = Math.max(1, Math.floor(input.maxQuestionRows));
  const usable = Math.max(1, input.viewportHeight - input.gridBottomPadding);
  const baseGap = Math.max(0, input.baseGridGap);
  const centerGap = Math.max(0, input.centerBlockGap);

  // Clearer separation between stacked topics than between pills in one rail.
  const preferredTopicRowGap =
    rows > 1 ? Math.max(baseGap + 14, Math.round(baseGap * 1.9), 22) : baseGap;

  // Protect a minimum content budget per row on short multi-row boards.
  const minRowContent = Math.min(96, Math.floor(usable / rows));
  const maxAffordableGap =
    rows > 1 ? Math.max(baseGap, (usable - minRowContent * rows) / (rows - 1)) : baseGap;
  const topicRowGap = rows > 1 ? Math.min(preferredTopicRowGap, maxAffordableGap) : baseGap;

  const boardRowHeight = Math.max(1, (usable - topicRowGap * (rows - 1)) / rows);

  // Match categoryCell: title takes up to 34% of the row, remainder for art.
  const topicTitleHeight = Math.min(
    Math.max(1, input.titleHeightBudget),
    Math.max(1, boardRowHeight * 0.34)
  );
  const maxImageHeight = Math.max(1, boardRowHeight - topicTitleHeight - centerGap);
  const preferredArtHeight = Math.max(48, input.topicImageSize * input.topicArtHeightRatio);
  const topicImageHeight = Math.min(preferredArtHeight, maxImageHeight);

  // image + title (+ gap between them) is the rail target height.
  const contentHeight = topicImageHeight + centerGap + topicTitleHeight;

  const railChrome =
    Math.max(0, input.pointRailGap) * Math.max(0, qRows - 1) + Math.max(0, input.pointRailClipBleed);
  const contentPillHeight = Math.max(1, (contentHeight - railChrome) / qRows);
  // Never exceed full-row fill if content math ever overshoots.
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
