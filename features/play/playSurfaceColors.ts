import { HOME_SOFT_UI } from '@/themes';
import { relativeLuminance } from '@/constants/theme';

const T = HOME_SOFT_UI.colors;

/** Shared play-surface tokens — respects dark palette via HOME_SOFT_UI proxy. */
export function getPlaySurfaceColors() {
  const isDark = relativeLuminance(T.canvas) < 0.3;
  return {
    canvas: T.canvas,
    surface: T.surface,
    textPrimary: T.textPrimary,
    textMuted: T.textMuted,
    tileBackground: T.surface,
    imageFrameBackground: isDark ? 'rgba(255, 255, 255, 0.08)' : T.surface,
    imagePadding: isDark ? 2 : 6,
    isDark,
    topicImageContentFit: 'cover' as const,
    /** Pixel-art tiles with light PNG backgrounds read better on dark with a soft matte frame. */
    topicImageMatte: isDark ? 'rgba(18, 18, 18, 0.92)' : undefined,
  };
}
