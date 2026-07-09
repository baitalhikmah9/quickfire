import { BREAKPOINTS, LAYOUT } from '@/constants';

/** Content column kinds for hybrid large-viewport placement. */
export type ContentWidthKind = 'form' | 'hub' | 'play' | 'playWide' | 'setup';

export type MainJustify = 'flex-start' | 'center';

export type ViewportLayout = {
  width: number;
  height: number;
  shortSide: number;
  /** Width at or above `BREAKPOINTS.wide` (categories/board web branch). */
  isWide: boolean;
  /** Short vertical space (phone landscape, small windows). */
  isCompact: boolean;
  /** Enough vertical space to vertically balance main content. */
  isTall: boolean;
  /** How the main content region should distribute leftover height. */
  mainJustify: MainJustify;
  /**
   * Hybrid density scale: modest growth on large windows, clamped so phone
   * layouts stay tight and desktops do not blow up.
   */
  scale: number;
};

const COMPACT_HEIGHT = 560;
const TALL_HEIGHT = 700;
const SCALE_WIDTH_REF = 860;
const SCALE_HEIGHT_REF = 620;

const SCALE_PHONE_MIN = 0.85;
const SCALE_PHONE_MAX = 1.08;
const SCALE_WIDE_MIN = 0.9;
const SCALE_WIDE_MAX = 1.15;

/**
 * Max width token for a content column kind.
 */
export function getContentMaxWidth(kind: ContentWidthKind): number {
  switch (kind) {
    case 'form':
      return LAYOUT.formMaxWidth;
    case 'hub':
      return LAYOUT.hubMaxWidth;
    case 'play':
      return LAYOUT.playMaxWidth;
    case 'playWide':
      return LAYOUT.playWideMaxWidth;
    case 'setup':
      return LAYOUT.setupMaxWidth;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

/**
 * Pure hybrid viewport layout for phone + large web.
 * Prefer this over per-screen magic max-widths and fixed top margins.
 */
export function getViewportLayout(width: number, height: number): ViewportLayout {
  const safeW = Math.max(1, width);
  const safeH = Math.max(1, height);
  const shortSide = Math.min(safeW, safeH);
  const isWide = safeW >= BREAKPOINTS.wide;
  const isCompact = safeH < COMPACT_HEIGHT;
  const isTall = safeH >= TALL_HEIGHT;
  const mainJustify: MainJustify = isTall ? 'center' : 'flex-start';

  const rawScale = Math.min(safeW / SCALE_WIDTH_REF, safeH / SCALE_HEIGHT_REF);
  const scale = isWide
    ? Math.max(SCALE_WIDE_MIN, Math.min(SCALE_WIDE_MAX, rawScale))
    : Math.max(SCALE_PHONE_MIN, Math.min(SCALE_PHONE_MAX, rawScale));

  return {
    width: safeW,
    height: safeH,
    shortSide,
    isWide,
    isCompact,
    isTall,
    mainJustify,
    scale,
  };
}

/**
 * Centered content frame style for a given column kind.
 * Pair with `width: '100%'` parents that use `flex: 1` / `minWidth: 0`.
 */
export function contentFrameMaxWidthStyle(kind: ContentWidthKind) {
  return {
    width: '100%' as const,
    maxWidth: getContentMaxWidth(kind),
    alignSelf: 'center' as const,
  };
}
