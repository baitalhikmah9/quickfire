import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LAYOUT, SPACING } from '@/constants';

/**
 * Shared sizing for home hub pills and play mode carousel tiles so `HubActionCard` pill3d
 * reads the same width/compact rules in both places.
 *
 * @param omitScreenGutter When true, use full width minus safe-area insets only (no horizontal
 *   `screenGutter`). Use on play mode so pill sizing matches the full-bleed carousel strip.
 */
export function useHubPillLayout(omitScreenGutter = false) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    const gutterPad = omitScreenGutter ? 0 : LAYOUT.screenGutter * 2;
    const contentWidth = width - insets.left - insets.right - gutterPad;
    const betweenCards = SPACING.md;
    const cardW = Math.max(
      120,
      Math.min(
        Math.floor((contentWidth - betweenCards * 2) / 3),
        height < 480 ? 220 : height < 640 ? 260 : 320
      )
    );
    /** Min height for a horizontal pill row (hub deck or play mode carousel) below chrome. */
    const pillStripMinHeight = Math.max(260, height - insets.top - insets.bottom - 100);

    return {
      contentWidth,
      cardW,
      betweenCards,
      compactCards: height < 520,
      pillStripMinHeight,
    };
  }, [width, height, insets.left, insets.right, insets.top, insets.bottom, omitScreenGutter]);
}
