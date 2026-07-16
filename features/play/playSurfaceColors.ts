import { HOME_SOFT_UI } from '@/themes';
import { relativeLuminance } from '@/constants/theme';

const T = HOME_SOFT_UI.colors;

/** Shared play-surface tokens - respects dark palette via HOME_SOFT_UI proxy. */
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
    /** Topic illustration matte - always visible behind contain-fit art. */
    topicImageMatte: topicMatte,
    /** Label on empty topic frames - contrast against topicImageMatte. */
    missingPictureLabelColor: 'rgba(255, 255, 255, 0.72)',

    /**
     * Title strip under topic art (categories grid).
     * Light: white bar + charcoal type. Dark: elevated surface + light type.
     */
    topicLabelBackground: isDark ? T.surface : '#FFFFFF',
    topicLabelText: isDark ? T.textPrimary : '#111111',
    topicLabelBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(51, 51, 51, 0.08)',

    /** Raised chrome (header chips, selected pills, score cards). */
    controlBackground: T.surface,
    hairlineBorder: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.1)',
    subtleFill: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
    subtleFillStrong: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(51, 51, 51, 0.08)',
    selectedBorder: isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(51, 51, 51, 0.2)',
    iconChipBackground: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.95)',
    iconChipBorder: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.08)',

    /** Soft danger / incorrect control face. */
    dangerSoftBackground: isDark ? 'rgba(239, 68, 68, 0.22)' : '#FEE2E2',
    /** Web hover on raised option cards. */
    hoverSurface: isDark ? 'rgba(255, 255, 255, 0.06)' : '#FDFCFA',
    /** Full-screen boot / letterbox scrim. */
    bootScrim: isDark ? 'rgba(7, 17, 31, 0.92)' : 'rgba(250, 249, 246, 0.92)',
    /**
     * Active-turn score pill face (ember warmth in both themes).
     * Opaque only — semi-transparent faces punch dark strips through nested
     * ± controls on Android when composited over the canvas.
     * Dark solid ≈ prior rgba(255,90,31,0.22) over navy surface.
     */
    activeTurnFace: isDark ? '#5E281B' : '#FFF3EC',
    /** Type on activeTurnFace — ember red for contrast on the warm tint. */
    activeTurnOnFace: '#E8420C',
    /**
     * Nested ± / badge faces on the active card.
     * Must match activeTurnFace so the orange reads continuous end-to-end.
     */
    activeTurnNestedFill: isDark ? '#5E281B' : '#FFF3EC',
    /** Award-tile “neither” dashed outline. */
    dashedBorder: isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(51, 51, 51, 0.22)',
  };
}

export type PlaySurfaceColors = ReturnType<typeof getPlaySurfaceColors>;
