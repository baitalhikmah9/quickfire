import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { ThemePaletteId } from '@/constants/theme';
import { PALETTES } from '@/constants/theme';

const THEME_STORAGE_KEY = 'doubledown-theme-palette';

interface ThemeStore {
  paletteId: ThemePaletteId;
  setPalette: (id: ThemePaletteId) => void;
  hydrate: () => Promise<void>;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  paletteId: 'default',

  setPalette: (id) => {
    set({ paletteId: id });
    void SecureStore.setItemAsync(THEME_STORAGE_KEY, id);
  },

  hydrate: async () => {
    try {
      const stored = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
      if (stored && stored in PALETTES) {
        set({ paletteId: stored as ThemePaletteId });
      }
    } catch {
      // Ignore storage errors, keep default
    }
  },
}));
