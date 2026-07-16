import { SPACING } from '@/constants';

/**
 * Home hub mode-row placement for phone landscape vs tall/wide shells.
 *
 * Compact (phone landscape) uses taller tiles + vertical centering so the
 * cream canvas is not mostly empty — without stretching cards over the header
 * (logo / settings must stay fully visible).
 */
export type HomeModeRowLayout = {
  /**
   * Stretch mode row to the main column height.
   * Only safe when tiles keep a bounded aspect ratio (not full free stretch).
   */
  fillHeight: boolean;
  /** Vertical justify for the main fill region under the header. */
  mainJustify: 'flex-start' | 'center';
  /** Top margin on the mode grid (0 when filling or centering). */
  modeRowMarginTop: number;
  /** Extra top pad on the hub content frame (under safe area). */
  contentTopPad: number;
  /**
   * Aspect ratio for mode tiles (width / height). Always set so header chrome
   * cannot be crushed by unbounded tile height.
   */
  tileAspectRatio: number;
  /** Small vertical inset inside a fill-height mode row. */
  modeRowPaddingVertical: number;
};

export type HomeModeRowLayoutInput = {
  isCompact: boolean;
  isWide: boolean;
  isTall: boolean;
};

/** Taller than default phone tiles so landscape claims more vertical space. */
const COMPACT_TILE_ASPECT = 0.72;
const PHONE_TILE_ASPECT = 0.88;
const WIDE_TILE_ASPECT = 0.95;

/**
 * Pure layout recipe for the home hub mode card row.
 */
export function getHomeModeRowLayout(input: HomeModeRowLayoutInput): HomeModeRowLayout {
  if (input.isCompact) {
    return {
      // Grow the row into leftover height, but tiles keep aspect so they never
      // paint over the logo / settings bar above.
      fillHeight: true,
      mainJustify: 'center',
      modeRowMarginTop: 0,
      contentTopPad: SPACING.md,
      tileAspectRatio: COMPACT_TILE_ASPECT,
      modeRowPaddingVertical: SPACING.xs,
    };
  }

  return {
    fillHeight: false,
    mainJustify: input.isTall ? 'center' : 'flex-start',
    modeRowMarginTop: input.isTall ? 0 : 36,
    contentTopPad: SPACING.xl,
    tileAspectRatio: input.isWide ? WIDE_TILE_ASPECT : PHONE_TILE_ASPECT,
    modeRowPaddingVertical: 0,
  };
}

/**
 * Mode-card description typography.
 *
 * Phone landscape cards are ~155–180pt wide (iOS compact / Android ~310px@2x).
 * Long EN copy (especially Rumble) needs 3 lines at 11sp so nothing ellipsizes.
 * Matches Android body size (11) — do not drop to 10 on compact iOS.
 */
export type HomeModeCopyLayout = {
  fontSize: number;
  lineHeight: number;
  /** Max lines shown; sized so longest EN mode blurb is not clipped. */
  maxLines: number;
  /** Reserved height so flex layout cannot squash the blurb. */
  minHeight: number;
};

export function getHomeModeCopyLayout(input: {
  isWeb: boolean;
  hybridScale: number;
}): HomeModeCopyLayout {
  const fontSize = Math.round((input.isWeb ? 12 : 11) * input.hybridScale);
  const lineHeight = Math.round(fontSize * 1.35);
  const maxLines = 3;
  return {
    fontSize,
    lineHeight,
    maxLines,
    minHeight: lineHeight * maxLines,
  };
}
