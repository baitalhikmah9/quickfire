import { HOME_SOFT_UI } from '@/themes';
import { relativeLuminance } from '@/constants/theme';

const T = HOME_SOFT_UI.colors;

/** Shared play-surface tokens — respects dark palette via HOME_SOFT_UI proxy. */
export function getPlaySurfaceColors() {
  const isDark = relativeLuminance(T.canvas) < 0.3;
  // Neutral gray matte so letterboxed topic art still reads as a card.
  const topicMatte = '#777777';
  return {
    canvas: T.canvas,
    surface: T.surface,
    textPrimary: T.textPrimary,
    textMuted: T.textMuted,
    tileBackground: T.surface,
    imageFrameBackground: isDark ? 'rgba(255, 255, 255, 0.08)' : topicMatte,
    imagePadding: isDark ? 2 : 6,
    isDark,
    topicImageContentFit: 'contain' as const,
    /** Topic illustration matte — always visible behind contain-fit art. */
    topicImageMatte: topicMatte,
    /** Label on empty topic frames — contrast against topicImageMatte. */
    missingPictureLabelColor: 'rgba(255, 255, 255, 0.72)',
  };
}
