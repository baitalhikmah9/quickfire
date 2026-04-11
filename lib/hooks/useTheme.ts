import { useEffect } from 'react';
import { useThemeStore } from '@/store/theme';
import { PALETTES, type ThemePaletteId } from '@/constants/theme';

export type ThemePalette = (typeof PALETTES)[ThemePaletteId];

/**
 * Returns the current theme palette. Call hydrate() once at app root (e.g. in _layout) before first render.
 */
export function useTheme(): ThemePalette {
  const paletteId = useThemeStore((s) => s.paletteId);
  return PALETTES[paletteId];
}

/**
 * Returns palette id and setter for theme picker.
 */
export function useThemePicker() {
  const paletteId = useThemeStore((s) => s.paletteId);
  const setPalette = useThemeStore((s) => s.setPalette);
  return { paletteId, setPalette };
}

/**
 * Call once at app root to load persisted theme from storage.
 */
export function useThemeHydration() {
  const hydrate = useThemeStore((s) => s.hydrate);
  useEffect(() => {
    void hydrate();
  }, [hydrate]);
}
