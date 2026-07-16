import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

export type PlayDisplayMode = 'tv' | 'mobile';

const DISPLAY_MODE_STORAGE_KEY = 'backfire-play-display-mode';
export const PLAY_TEXT_SCALE: Record<PlayDisplayMode, number> = { tv: 0.75, mobile: 1 };

async function getStoredMode(): Promise<string | null> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.localStorage.getItem(DISPLAY_MODE_STORAGE_KEY);
  }
  return SecureStore.getItemAsync(DISPLAY_MODE_STORAGE_KEY);
}

async function setStoredMode(mode: PlayDisplayMode): Promise<void> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.localStorage.setItem(DISPLAY_MODE_STORAGE_KEY, mode);
    return;
  }
  await SecureStore.setItemAsync(DISPLAY_MODE_STORAGE_KEY, mode);
}

interface DisplayStore {
  playDisplayMode: PlayDisplayMode;
  setPlayDisplayMode: (mode: PlayDisplayMode) => void;
  hydrate: () => Promise<void>;
}

export const useDisplayStore = create<DisplayStore>((set) => ({
  playDisplayMode: 'tv',
  setPlayDisplayMode: (playDisplayMode) => {
    set({ playDisplayMode });
    void setStoredMode(playDisplayMode).catch(() => {});
  },
  hydrate: async () => {
    try {
      const mode = await getStoredMode();
      if (mode === 'tv' || mode === 'mobile') set({ playDisplayMode: mode });
    } catch {
      // Keep TV mode as the default when storage is unavailable.
    }
  },
}));

export function useDisplayHydration() {
  const hydrate = useDisplayStore((state) => state.hydrate);
  useEffect(() => void hydrate(), [hydrate]);
}

export function usePlayTextScale() {
  return useDisplayStore((state) => PLAY_TEXT_SCALE[state.playDisplayMode]);
}
