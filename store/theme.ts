import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { ThemePaletteId } from '@/constants/theme';
import { PALETTES } from '@/constants/theme';

const THEME_STORAGE_KEY = 'backfire-theme-palette';

async function getStoredTheme(): Promise<string | null> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.localStorage.getItem(THEME_STORAGE_KEY);
  }
  return SecureStore.getItemAsync(THEME_STORAGE_KEY);
}

async function setStoredTheme(id: ThemePaletteId): Promise<void> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_STORAGE_KEY, id);
    return;
  }
  await SecureStore.setItemAsync(THEME_STORAGE_KEY, id);
}

interface ThemeStore {
  paletteId: ThemePaletteId;
  setPalette: (id: ThemePaletteId) => void;
  hydrate: () => Promise<void>;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  paletteId: 'default',

  setPalette: (id) => {
    const paletteId = id === 'dark' ? 'dark' : 'default';
    set({ paletteId });
    void setStoredTheme(paletteId).catch(() => {
      // Ignore storage errors; the in-memory theme still updates immediately.
    });
  },

  hydrate: async () => {
    try {
      const stored = await getStoredTheme();
      if (stored && stored in PALETTES) {
        set({ paletteId: stored === 'dark' ? 'dark' : 'default' });
      }
    } catch {
      // Ignore storage errors, keep default
    }
  },
}));
