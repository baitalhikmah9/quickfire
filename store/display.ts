import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

export type PlayDisplayMode = 'tv' | 'laptop' | 'mobile';

const DISPLAY_MODE_STORAGE_KEY = 'backfire-play-display-mode';
export const PLAY_DISPLAY_MODES = ['tv', 'laptop', 'mobile'] as const satisfies readonly PlayDisplayMode[];
/** Small / medium / large game text (TV, laptop, phone). */
export const PLAY_TEXT_SCALE = { tv: 0.8, laptop: 1, mobile: 1.22 } as const satisfies Record<
  PlayDisplayMode,
  number
>;

export function nextPlayDisplayMode(mode: PlayDisplayMode): PlayDisplayMode {
  const index = PLAY_DISPLAY_MODES.indexOf(mode);
  return PLAY_DISPLAY_MODES[(index + 1) % PLAY_DISPLAY_MODES.length] ?? 'laptop';
}

function isPlayDisplayMode(value: string | null): value is PlayDisplayMode {
  return value === 'tv' || value === 'laptop' || value === 'mobile';
}

async function getStoredMode(): Promise<string | null> {
  if (Platform.OS === 'web' && globalThis.localStorage) {
    return globalThis.localStorage.getItem(DISPLAY_MODE_STORAGE_KEY);
  }
  return SecureStore.getItemAsync(DISPLAY_MODE_STORAGE_KEY);
}

async function setStoredMode(mode: PlayDisplayMode): Promise<void> {
  if (Platform.OS === 'web' && globalThis.localStorage) {
    globalThis.localStorage.setItem(DISPLAY_MODE_STORAGE_KEY, mode);
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
  // laptop = 1.0: leave automatic viewport scaling alone until the user overrides.
  playDisplayMode: 'laptop',
  setPlayDisplayMode: (playDisplayMode) => {
    set({ playDisplayMode });
    void setStoredMode(playDisplayMode).catch(() => {});
  },
  hydrate: async () => {
    try {
      const mode = await getStoredMode();
      if (isPlayDisplayMode(mode)) set({ playDisplayMode: mode });
    } catch {
      // Keep laptop (neutral) when storage is unavailable.
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
