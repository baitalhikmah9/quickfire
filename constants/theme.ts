/**
 * Visual system tokens — aligned with docs/BRAND_GUIDELINES.md
 * (Electric Blue, Lively Orange, Vivid Purple; Clash Display + General Sans).
 */

/** PostScript keys registered in app/_layout.tsx via expo-font */
export const FONTS = {
  display: 'ClashDisplay-Semibold',
  displayBold: 'ClashDisplay-Bold',
  ui: 'GeneralSans-Regular',
  uiMedium: 'GeneralSans-Medium',
  uiSemibold: 'GeneralSans-Semibold',
  uiBold: 'GeneralSans-Bold',
} as const;

/** Brand primary — Electric Blue (single source for primary + page background) */
const BRAND_PRIMARY = '#007BFF' as const;

export const COLORS = {
  /** Primary accent — Electric Blue */
  primary: BRAND_PRIMARY,
  /** Secondary brand — Lively Orange */
  secondary: '#FF8C00',
  /** Utility — Vivid Purple (settings, profile accents) */
  tertiary: '#A18FFC',
  /** Darker blue for emphasis / continue CTAs */
  accent: '#0056B3',
  /** Page chrome — default app shell (light) */
  background: '#FFFFFF',
  surface: '#FFFFFF',
  text: '#0F172A',

  mutedText: '#475569',
  border: '#D4E5FA',
  disabled: '#94A3B8',
  success: '#16A34A',
  error: '#DC2626',
  warning: '#F59E0B',
  info: '#0EA5E9',

  unansweredTile: '#E8F4FF',
  activeTile: BRAND_PRIMARY,
  activeTileText: '#FFFFFF',
  usedTile: '#CBD5E1',
  correctAnswer: '#16A34A',
  incorrectAnswer: '#DC2626',
  wagerMode: '#0056B3',
  hotSeat: '#A18FFC',
  overtimeSurge: '#FF8C00',

  timerNormal: BRAND_PRIMARY,
  timerWarning: '#F59E0B',
  timerDanger: '#DC2626',
  timerRing: '#D4E5FA',

  overlay: 'rgba(15, 23, 42, 0.4)',
  cardShadow: 'rgba(0, 123, 255, 0.12)',
  modalShadow: 'rgba(15, 23, 42, 0.18)',
  activeTileGlow: 'rgba(255, 140, 0, 0.22)',
};

export const GRADIENTS = {
  primary: ['#007BFF', '#3D9FFF'],
  wager: ['#0056B3', '#007BFF'],
  premium: ['#0F172A', '#0056B3'],
};

export const FONT_WEIGHTS = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

const displaySemibold = {
  fontFamily: FONTS.display,
} as const;
const displayBold = {
  fontFamily: FONTS.displayBold,
} as const;
const ui = {
  fontFamily: FONTS.ui,
} as const;
const uiMedium = {
  fontFamily: FONTS.uiMedium,
} as const;
const uiSemibold = {
  fontFamily: FONTS.uiSemibold,
} as const;

export const TYPE_SCALE = {
  displayXL: { fontSize: 40, lineHeight: 48, ...displayBold },
  displayL: { fontSize: 32, lineHeight: 40, ...displayBold },
  h1: { fontSize: 28, lineHeight: 34, ...displaySemibold },
  h2: { fontSize: 24, lineHeight: 30, ...displaySemibold },
  h3: { fontSize: 20, lineHeight: 26, ...displaySemibold },
  bodyL: { fontSize: 18, lineHeight: 28, ...ui },
  bodyM: { fontSize: 16, lineHeight: 24, ...ui },
  bodyS: { fontSize: 14, lineHeight: 20, ...ui },
  caption: { fontSize: 12, lineHeight: 16, ...uiMedium },
  button: { fontSize: 16, lineHeight: 20, ...uiSemibold },
  scoreNumber: { fontSize: 32, lineHeight: 36, ...displayBold },
  /** UI labels / caplines — General Sans, uppercase at use site */
  labelCap: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    ...uiSemibold,
  },
};

export const SPACING = {
  unit: 8,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  screenPadding: 20,
};

/** Soft, bubbly radii — cards and chrome read round / “sticker” cartoon */
export const BORDER_RADIUS = {
  sm: 16,
  md: 26,
  lg: 34,
  /** Large panels, hub tiles, category strips */
  xl: 42,
  tile: 28,
  modal: 44,
  pill: 999,
};

/** Chunkier drop shadows for a playful, lifted-card feel */
export const SHADOWS = {
  card: {
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  modal: {
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.2,
    shadowRadius: 36,
    elevation: 12,
  },
  activeTileGlow: {
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 5,
  },
};

export const BREAKPOINTS = {
  phone: 0,
  tablet: 768,
  landscape: 1024,
};

/** Tab and auth screens: shared horizontal bounds on wide viewports */
export const LAYOUT = {
  /** Single-column flows (auth, forms, play hub stack) */
  contentMaxWidth: 560,
  /** Horizontal inset for primary column content */
  screenGutter: SPACING.lg,
} as const;

/** Large surface radius (auth card, modals) */
export const AUTH_CARD_RADIUS = 48;

export type ThemePaletteId = 'default' | 'warm' | 'cool' | 'green' | 'red' | 'dark';

export const FONT_SIZES = {
  xs: TYPE_SCALE.labelCap.fontSize,
  sm: TYPE_SCALE.bodyS.fontSize,
  md: TYPE_SCALE.bodyM.fontSize,
  lg: TYPE_SCALE.bodyL.fontSize,
  xl: TYPE_SCALE.h3.fontSize,
  xxl: TYPE_SCALE.h2.fontSize,
  xxxl: TYPE_SCALE.h1.fontSize,
};

export const PALETTES: Record<ThemePaletteId, Record<string, string>> = {
  default: {
    primary: COLORS.primary,
    secondary: COLORS.secondary,
    tertiary: COLORS.tertiary,
    success: COLORS.success,
    warning: COLORS.warning,
    error: COLORS.error,
    background: COLORS.background,
    backgroundSecondary: COLORS.surface,
    text: COLORS.text,
    textSecondary: COLORS.mutedText,
    textOnBackground: COLORS.text,
    textSecondaryOnBackground: COLORS.mutedText,
    border: COLORS.border,
    cardBackground: COLORS.surface,
    boardCell: COLORS.unansweredTile,
    boardCellActive: COLORS.activeTile,
    boardCellActiveText: COLORS.activeTileText,
    boardCellUsed: COLORS.usedTile,
    shadow: COLORS.cardShadow,
  },
  warm: {
    primary: '#FF8C00',
    secondary: '#007BFF',
    tertiary: '#A18FFC',
    background: '#FFF4E5',
    text: '#2C1A00',
    cardBackground: '#FFFFFF',
    textSecondary: '#5C4000',
    textOnBackground: '#2C1A00',
    textSecondaryOnBackground: '#5C4000',
    border: '#FFD199',
    success: COLORS.success,
    warning: COLORS.warning,
    error: COLORS.error,
    backgroundSecondary: '#FFFFFF',
    boardCell: COLORS.unansweredTile,
    boardCellActive: COLORS.activeTile,
    boardCellActiveText: COLORS.activeTileText,
    boardCellUsed: COLORS.usedTile,
    shadow: COLORS.cardShadow,
  },
  cool: {
    primary: '#5856D6',
    secondary: '#FF8C00',
    tertiary: '#A18FFC',
    background: '#F5F5FF',
    text: '#1C1C1E',
    cardBackground: '#FFFFFF',
    textSecondary: '#3A3A3C',
    textOnBackground: '#1C1C1E',
    textSecondaryOnBackground: '#3A3A3C',
    border: '#D1D1F7',
    success: COLORS.success,
    warning: COLORS.warning,
    error: COLORS.error,
    backgroundSecondary: '#FFFFFF',
    boardCell: COLORS.unansweredTile,
    boardCellActive: COLORS.activeTile,
    boardCellActiveText: COLORS.activeTileText,
    boardCellUsed: COLORS.usedTile,
    shadow: COLORS.cardShadow,
  },
  green: {
    primary: '#28CD41',
    secondary: '#007BFF',
    tertiary: '#A18FFC',
    background: '#F0FFF4',
    text: '#062D12',
    cardBackground: '#FFFFFF',
    textSecondary: '#1C4527',
    textOnBackground: '#062D12',
    textSecondaryOnBackground: '#1C4527',
    border: '#C6F6D5',
    success: COLORS.success,
    warning: COLORS.warning,
    error: COLORS.error,
    backgroundSecondary: '#FFFFFF',
    boardCell: COLORS.unansweredTile,
    boardCellActive: COLORS.activeTile,
    boardCellActiveText: COLORS.activeTileText,
    boardCellUsed: COLORS.usedTile,
    shadow: COLORS.cardShadow,
  },
  red: {
    primary: '#FF3B30',
    secondary: '#FF8C00',
    tertiary: '#A18FFC',
    background: '#FFF5F5',
    text: '#2D0606',
    cardBackground: '#FFFFFF',
    textSecondary: '#451C1C',
    textOnBackground: '#2D0606',
    textSecondaryOnBackground: '#451C1C',
    border: '#FED7D7',
    success: COLORS.success,
    warning: COLORS.warning,
    error: COLORS.error,
    backgroundSecondary: '#FFFFFF',
    boardCell: COLORS.unansweredTile,
    boardCellActive: COLORS.activeTile,
    boardCellActiveText: COLORS.activeTileText,
    boardCellUsed: COLORS.usedTile,
    shadow: COLORS.cardShadow,
  },
  dark: {
    primary: '#007BFF',
    secondary: '#FF8C00',
    tertiary: '#A18FFC',
    background: '#000000',
    text: '#FFFFFF',
    cardBackground: '#1C1C1E',
    textSecondary: '#EBEBF5',
    textOnBackground: '#FFFFFF',
    textSecondaryOnBackground: '#EBEBF5',
    border: '#38383A',
    success: COLORS.success,
    warning: COLORS.warning,
    error: COLORS.error,
    backgroundSecondary: '#1C1C1E',
    boardCell: '#2C2C2E',
    boardCellActive: COLORS.activeTile,
    boardCellActiveText: COLORS.activeTileText,
    boardCellUsed: '#3A3A3C',
    shadow: COLORS.modalShadow,
  },
};

/** sRGB luminance in 0–1; used for status bar and contrast heuristics */
export function relativeLuminance(hex: string): number {
  const n = hex.replace('#', '');
  if (n.length !== 6) return 1;
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Light status-bar content (white icons) on darker page backgrounds */
export function paletteUsesLightStatusBarContent(id: ThemePaletteId): boolean {
  return relativeLuminance(PALETTES[id].background) < 0.55;
}
