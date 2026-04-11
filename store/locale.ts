import { useEffect } from 'react';
import { create } from 'zustand';
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

const UI_LOCALE_STORAGE_KEY = 'doubledown-ui-locale';
const CONTENT_LOCALE_STORAGE_KEY = 'doubledown-content-locales';

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
    void SecureStore.setItemAsync(UI_LOCALE_STORAGE_KEY, locale);
  },

  setContentLocales: (locales) => {
    const normalized = normalizeContentLocales(locales);
    set({
      contentLocales: normalized,
      hasExplicitContentSelection: locales.length > 0,
    });
    void SecureStore.setItemAsync(
      CONTENT_LOCALE_STORAGE_KEY,
      JSON.stringify(normalized)
    );
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
        SecureStore.getItemAsync(UI_LOCALE_STORAGE_KEY),
        SecureStore.getItemAsync(CONTENT_LOCALE_STORAGE_KEY),
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
