import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { usePlayTextScale } from '@/store/display';

const BASE_SHORT_SIDE = 390;

export function clampFontSize(size: number, minSize: number, maxSize: number): number {
  return Math.max(minSize, Math.min(size, maxSize));
}

export function scaleFont(
  baseSize: number,
  minSize: number,
  maxSize: number,
  width: number,
  height: number
): number {
  const shortSide = Math.min(width, height);
  const scale = shortSide / BASE_SHORT_SIDE;
  return Math.round(clampFontSize(baseSize * scale, minSize, maxSize));
}

export function getResponsivePlayFontSizes(width: number, height: number, textScale = 1) {
  const scaled = (size: number) => Math.max(9, Math.round(size * textScale));
  return {
    pageTitle: scaled(scaleFont(24, 20, 32, width, height)),
    subtitle: scaled(scaleFont(15, 14, 20, width, height)),
    topicTitle: scaled(scaleFont(14, 12, 18, width, height)),
    headerButton: scaled(scaleFont(14, 13, 18, width, height)),
    teamName: scaled(scaleFont(18, 16, 24, width, height)),
    scoreValue: scaled(scaleFont(20, 18, 28, width, height)),
    categoryTitle: scaled(scaleFont(15, 14, 22, width, height)),
    pointValue: scaled(scaleFont(16, 14, 22, width, height)),
  };
}

export function useResponsivePlayFontSizes() {
  const { width, height } = useWindowDimensions();
  const textScale = usePlayTextScale();

  return useMemo(
    () => getResponsivePlayFontSizes(width, height, textScale),
    [height, textScale, width]
  );
}
