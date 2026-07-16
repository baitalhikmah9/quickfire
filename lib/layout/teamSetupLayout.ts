import type { MainJustify } from '@/lib/layout/viewportLayout';

/**
 * Tall web team cards should fill most of the viewport so cream space isn’t wasted.
 * Leaves room for the stack header + light breathing room above/below.
 */
export function getWebTeamCardMinHeight(windowHeight: number): number {
  const safeH = Math.max(1, windowHeight);
  const reservedChrome = 150;
  const target = Math.round(safeH * 0.82);
  const maxFit = safeH - reservedChrome;
  return Math.max(560, Math.min(target, maxFit));
}

export type TeamSetupClassicBodyLayout = {
  /** ScrollView contentContainerStyle pieces for classic (non-rumble) team setup. */
  contentContainer: {
    flexGrow: number;
    minWidth: number;
    justifyContent: 'flex-start' | 'center';
    alignItems: 'stretch' | 'center';
  };
  /**
   * Wide-web 3-column row. Must stay content-sized (no flex:1) so the scroll
   * container can vertically center it.
   */
  webLandscapeRow: {
    flexGrow: number;
    flexShrink: number;
    width: '100%';
    maxWidth: number;
    alignSelf: 'center';
    /**
     * Pin side team cards to the shared frame edges (same as header back/token).
     * `space-between` + flex side panels - not `center`, which inset cards from the frame.
     */
    justifyContent: 'space-between';
    alignItems: 'center';
  };
};

/**
 * Classic team-setup body layout for hybrid placement.
 * Phone short windows fill from the top; wide/tall web centers the content block.
 */
export function getTeamSetupClassicBodyLayout(options: {
  isWebLayout: boolean;
  mainJustify: MainJustify;
  setupRowMaxWidth: number;
}): TeamSetupClassicBodyLayout {
  // Wide web always centers; tall non-web can center too (e.g. large tablet).
  const shouldCenter = options.isWebLayout || options.mainJustify === 'center';

  return {
    contentContainer: {
      flexGrow: 1,
      minWidth: 0,
      justifyContent: shouldCenter ? 'center' : 'flex-start',
      alignItems: shouldCenter ? 'center' : 'stretch',
    },
    webLandscapeRow: {
      // Content-sized height; width fills the shared frame so card edges = header edges.
      flexGrow: 0,
      flexShrink: 1,
      width: '100%',
      maxWidth: options.setupRowMaxWidth,
      alignSelf: 'center',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
  };
}
