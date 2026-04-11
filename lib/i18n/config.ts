export const SUPPORTED_LOCALES = [
  'en',
  'ar',
  'es',
  'fr',
  'ur',
  'hi',
  'zh-Hans',
  'pt-BR',
  'ru',
  'id',
  'bn',
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export type NonEnglishContentLocale = Exclude<SupportedLocale, 'en'>;
export type Direction = 'ltr' | 'rtl';

export interface ContentLocalePriority {
  primary: NonEnglishContentLocale | null;
  secondary: NonEnglishContentLocale | null;
  tertiary: NonEnglishContentLocale | null;
}

export const DEFAULT_UI_LOCALE: SupportedLocale = 'en';

export const EMPTY_CONTENT_LOCALES: ContentLocalePriority = {
  primary: null,
  secondary: null,
  tertiary: null,
};

const RTL_LOCALES = new Set<SupportedLocale>(['ar', 'ur']);
const SYSTEM_FONT_LOCALES = new Set<SupportedLocale>([
  'ar',
  'ur',
  'hi',
  'bn',
  'zh-Hans',
]);

export const LOCALE_LABELS: Record<
  SupportedLocale,
  {
    nativeName: string;
    englishName: string;
  }
> = {
  en: { nativeName: 'English', englishName: 'English' },
  ar: { nativeName: 'العربية', englishName: 'Arabic' },
  es: { nativeName: 'Español', englishName: 'Spanish' },
  fr: { nativeName: 'Français', englishName: 'French' },
  ur: { nativeName: 'اردو', englishName: 'Urdu' },
  hi: { nativeName: 'हिन्दी', englishName: 'Hindi' },
  'zh-Hans': { nativeName: '简体中文', englishName: 'Mandarin (Simplified)' },
  'pt-BR': { nativeName: 'Português (Brasil)', englishName: 'Portuguese (Brazil)' },
  ru: { nativeName: 'Русский', englishName: 'Russian' },
  id: { nativeName: 'Bahasa Indonesia', englishName: 'Indonesian' },
  bn: { nativeName: 'বাংলা', englishName: 'Bengali' },
};

export function isSupportedLocale(value: string): value is SupportedLocale {
  return SUPPORTED_LOCALES.includes(value as SupportedLocale);
}

export function isNonEnglishContentLocale(
  value: string
): value is NonEnglishContentLocale {
  return value !== 'en' && isSupportedLocale(value);
}

export function isRTLLocale(locale: SupportedLocale): boolean {
  return RTL_LOCALES.has(locale);
}

export function getDirection(locale: SupportedLocale): Direction {
  return isRTLLocale(locale) ? 'rtl' : 'ltr';
}

export function usesSystemFonts(locale: SupportedLocale): boolean {
  return SYSTEM_FONT_LOCALES.has(locale);
}

export function getLocaleLabel(
  locale: SupportedLocale,
  format: 'native' | 'english' | 'both' = 'native'
): string {
  const label = LOCALE_LABELS[locale];

  if (format === 'english') {
    return label.englishName;
  }

  if (format === 'both') {
    return `${label.nativeName} (${label.englishName})`;
  }

  return label.nativeName;
}

export function contentLocalePriorityToArray(
  priority: ContentLocalePriority
): NonEnglishContentLocale[] {
  return [priority.primary, priority.secondary, priority.tertiary].filter(
    (locale): locale is NonEnglishContentLocale => locale !== null
  );
}

export function normalizeContentLocales(
  locales: readonly string[]
): ContentLocalePriority {
  const unique = Array.from(
    new Set(locales.filter((locale): locale is NonEnglishContentLocale => isNonEnglishContentLocale(locale)))
  ).slice(0, 3);

  return {
    primary: unique[0] ?? null,
    secondary: unique[1] ?? null,
    tertiary: unique[2] ?? null,
  };
}

export function getResolvedContentLocaleChain(
  prefs: ContentLocalePriority
): SupportedLocale[] {
  return [...contentLocalePriorityToArray(prefs), 'en'];
}

