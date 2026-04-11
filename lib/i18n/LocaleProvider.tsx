import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import type { TextStyle } from 'react-native';
import {
  DEFAULT_UI_LOCALE,
  getDirection,
  getLocaleLabel,
  getResolvedContentLocaleChain,
  type ContentLocalePriority,
  type Direction,
  type SupportedLocale,
} from './config';
import { getDirectionalTextAlign, getLocaleFontFamily, getWritingDirection } from './direction';
import en, { type Messages, type TranslationKey } from './messages/en';
import ar from './messages/ar';
import es from './messages/es';
import fr from './messages/fr';
import ur from './messages/ur';
import hi from './messages/hi';
import zhHans from './messages/zh-Hans';
import ptBr from './messages/pt-BR';
import ru from './messages/ru';
import id from './messages/id';
import bn from './messages/bn';
import { useLocaleHydration, useLocaleStore } from '@/store/locale';

const MESSAGE_MAP: Record<SupportedLocale, Messages> = {
  en,
  ar,
  es,
  fr,
  ur,
  hi,
  'zh-Hans': zhHans,
  'pt-BR': ptBr,
  ru,
  id,
  bn,
};

type TranslationParams = Record<string, string | number | undefined | null>;

interface I18nContextValue {
  uiLocale: SupportedLocale;
  contentLocales: ContentLocalePriority;
  contentLocaleChain: SupportedLocale[];
  direction: Direction;
  isRTL: boolean;
  t: (key: TranslationKey, params?: TranslationParams) => string;
  getLocaleName: (
    locale: SupportedLocale,
    format?: 'native' | 'english' | 'both'
  ) => string;
  getTextStyle: (
    locale?: SupportedLocale,
    role?: 'body' | 'bodyMedium' | 'bodySemibold' | 'bodyBold' | 'display' | 'displayBold',
    edge?: 'start' | 'center' | 'end'
  ) => Pick<TextStyle, 'fontFamily' | 'writingDirection' | 'textAlign'>;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function interpolate(message: string, params?: TranslationParams) {
  if (!params) {
    return message;
  }

  return message.replace(/\{(\w+)\}/g, (_, token: string) => {
    const value = params[token];
    return value === undefined || value === null ? '' : String(value);
  });
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  useLocaleHydration();

  const uiLocale = useLocaleStore((state) => state.uiLocale) ?? DEFAULT_UI_LOCALE;
  const contentLocales = useLocaleStore((state) => state.contentLocales);

  const value = useMemo<I18nContextValue>(() => {
    const direction = getDirection(uiLocale);
    const messages = MESSAGE_MAP[uiLocale] ?? en;

    return {
      uiLocale,
      contentLocales,
      contentLocaleChain: getResolvedContentLocaleChain(contentLocales),
      direction,
      isRTL: direction === 'rtl',
      t: (key, params) => {
        const localized = messages[key] ?? en[key];

        if (!localized) {
          if (__DEV__) {
            throw new Error(`Missing translation key: ${key}`);
          }
          return key;
        }

        return interpolate(localized, params);
      },
      getLocaleName: (locale, format = 'native') => getLocaleLabel(locale, format),
      getTextStyle: (locale = uiLocale, role = 'body', edge = 'start') => {
        const localeDirection = getDirection(locale);

        return {
          fontFamily: getLocaleFontFamily(locale, role),
          writingDirection: getWritingDirection(locale),
          textAlign: getDirectionalTextAlign(localeDirection, edge),
        };
      },
    };
  }, [contentLocales, uiLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18nContext() {
  const value = useContext(I18nContext);

  if (!value) {
    throw new Error('useI18n must be used within LocaleProvider');
  }

  return value;
}

