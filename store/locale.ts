import { useEffect } from 'react';
import { create } from 'zustand';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  DEFAULT_UI_LOCALE,
  EMPTY_CONTENT_LOCALES,
  getResolvedContentLocaleChain,
  isSupportedLocale,
  normalizeContentLocales,
  type ContentLocalePriority,
  type NonEnglishContentLocale,
  type SupportedLocale,
} from '@/lib/i18n/config';

const UI_LOCALE_STORAGE_KEY = 'backfire-ui-locale';
const CONTENT_LOCALE_STORAGE_KEY = 'backfire-content-locales';

async function getStoredLocaleItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function setStoredLocaleItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

interface LocaleStore {
  uiLocale: SupportedLocale;
  contentLocales: ContentLocalePriority;
  hasExplicitUiSelection: boolean;
  hasExplicitContentSelection: boolean;
  setUiLocale: (locale: SupportedLocale) => void;
  setContentLocales: (locales: NonEnglishContentLocale[]) => void;
  moveContentLocale: (from: 0 | 1 | 2, to: 0 | 1 | 2) => void;
  hydrate: () => Promise<void>;
}

export const useLocaleStore = create<LocaleStore>((set, get) => ({
  uiLocale: DEFAULT_UI_LOCALE,
  contentLocales: EMPTY_CONTENT_LOCALES,
  hasExplicitUiSelection: false,
  hasExplicitContentSelection: false,

  setUiLocale: (locale) => {
    set({ uiLocale: locale, hasExplicitUiSelection: true });
    void setStoredLocaleItem(UI_LOCALE_STORAGE_KEY, locale).catch(() => {
      // Ignore storage errors; in-memory locale still updates.
    });
  },

  setContentLocales: (locales) => {
    const normalized = normalizeContentLocales(locales);
    set({
      contentLocales: normalized,
      hasExplicitContentSelection: locales.length > 0,
    });
    void setStoredLocaleItem(
      CONTENT_LOCALE_STORAGE_KEY,
      JSON.stringify(normalized)
    ).catch(() => {
      // Ignore storage errors; in-memory state still updates.
    });
  },

  moveContentLocale: (from, to) => {
    const current = get().contentLocales;
    const next = [...getResolvedContentLocaleChain(current).filter((locale) => locale !== 'en')] as NonEnglishContentLocale[];
    const [item] = next.splice(from, 1);

    if (!item) {
      return;
    }

    next.splice(to, 0, item);
    get().setContentLocales(next);
  },

  hydrate: async () => {
    try {
      const [storedUiLocale, storedContentLocales] = await Promise.all([
        getStoredLocaleItem(UI_LOCALE_STORAGE_KEY),
        getStoredLocaleItem(CONTENT_LOCALE_STORAGE_KEY),
      ]);

      if (storedUiLocale && isSupportedLocale(storedUiLocale)) {
        set({
          uiLocale: storedUiLocale,
          hasExplicitUiSelection: true,
        });
      }

      if (storedContentLocales) {
        const parsed = JSON.parse(storedContentLocales) as Partial<ContentLocalePriority>;
        const normalized = normalizeContentLocales([
          parsed.primary,
          parsed.secondary,
          parsed.tertiary,
        ].filter(Boolean) as string[]);

        set({
          contentLocales: normalized,
          hasExplicitContentSelection: Boolean(
            normalized.primary || normalized.secondary || normalized.tertiary
          ),
        });
      }
    } catch {
      // Ignore hydration failures and keep defaults.
    }
  },
}));

export function useLocaleHydration() {
  const hydrate = useLocaleStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);
}
