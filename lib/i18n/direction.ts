import { Platform, type TextStyle, type ViewStyle } from 'react-native';
import { FONTS } from '@/constants/theme';
import type { Direction, SupportedLocale } from './config';
import { getDirection, usesSystemFonts } from './config';

type FontRole =
  | 'body'
  | 'bodyMedium'
  | 'bodySemibold'
  | 'bodyBold'
  | 'display'
  | 'displayBold';

function getSystemFontFamily(role: FontRole): string | undefined {
  if (Platform.OS === 'android') {
    if (role === 'bodyMedium' || role === 'bodySemibold' || role === 'bodyBold') {
      return 'sans-serif-medium';
    }
    return 'sans-serif';
  }

  return undefined;
}

export function getLocaleFontFamily(
  locale: SupportedLocale,
  role: FontRole = 'body'
): string | undefined {
  if (usesSystemFonts(locale)) {
    return getSystemFontFamily(role);
  }

  switch (role) {
    case 'display':
      return FONTS.display;
    case 'displayBold':
      return FONTS.displayBold;
    case 'bodyMedium':
      return FONTS.uiMedium;
    case 'bodySemibold':
      return FONTS.uiSemibold;
    case 'bodyBold':
      return FONTS.uiBold;
    case 'body':
    default:
      return FONTS.ui;
  }
}

export function getWritingDirection(
  locale: SupportedLocale
): TextStyle['writingDirection'] {
  return getDirection(locale);
}

export function getDirectionalTextAlign(
  direction: Direction,
  edge: 'start' | 'center' | 'end' = 'start'
): TextStyle['textAlign'] {
  if (edge === 'center') {
    return 'center';
  }

  if (direction === 'rtl') {
    return edge === 'start' ? 'right' : 'left';
  }

  return edge === 'start' ? 'left' : 'right';
}

export function getRowDirection(direction: Direction): ViewStyle['flexDirection'] {
  return direction === 'rtl' ? 'row-reverse' : 'row';
}

export function getChevronName(direction: Direction): 'chevron-forward' | 'chevron-back' {
  return direction === 'rtl' ? 'chevron-back' : 'chevron-forward';
}

