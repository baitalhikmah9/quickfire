import { HOME_SOFT_UI } from '@/themes';
import { relativeLuminance } from '@/constants/theme';

const T = HOME_SOFT_UI.colors;

/** Shared play-surface tokens — respects dark palette via HOME_SOFT_UI proxy. */
export function getPlaySurfaceColors() {
  const isDark = relativeLuminance(T.canvas) < 0.3;
  // Match bundled topic art mats (medium slate) so MISSING frames read as cards, not cream voids.
  const lightTopicMatte = '#5C616B';
  return {
    canvas: T.canvas,
    surface: T.surface,
    textPrimary: T.textPrimary,
    textMuted: T.textMuted,
    tileBackground: T.surface,
    imageFrameBackground: isDark ? 'rgba(255, 255, 255, 0.08)' : lightTopicMatte,
    imagePadding: isDark ? 2 : 6,
    isDark,
    topicImageContentFit: 'contain' as const,
    /**
     * Topic illustration matte — always visible.
     * Dark mode: light matte for dark line-art PNGs.
     * Light mode: slate matte matching packed pixel art (MISSING must not vanish into canvas).
     */
    topicImageMatte: isDark ? 'rgba(255, 255, 255, 0.92)' : lightTopicMatte,
    /** Label on empty topic frames — contrast against topicImageMatte. */
    missingPictureLabelColor: isDark ? 'rgba(15, 23, 42, 0.45)' : 'rgba(255, 255, 255, 0.72)',
  };
}
