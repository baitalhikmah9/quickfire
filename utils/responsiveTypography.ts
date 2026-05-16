import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

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

export function getResponsivePlayFontSizes(width: number, height: number) {
  return {
    pageTitle: scaleFont(24, 20, 32, width, height),
    subtitle: scaleFont(15, 14, 20, width, height),
    topicTitle: scaleFont(14, 12, 18, width, height),
    headerButton: scaleFont(14, 13, 18, width, height),
    teamName: scaleFont(18, 16, 24, width, height),
    scoreValue: scaleFont(20, 18, 28, width, height),
    categoryTitle: scaleFont(15, 14, 22, width, height),
    pointValue: scaleFont(16, 14, 22, width, height),
  };
}

export function useResponsivePlayFontSizes() {
  const { width, height } = useWindowDimensions();

  return useMemo(() => getResponsivePlayFontSizes(width, height), [height, width]);
}
