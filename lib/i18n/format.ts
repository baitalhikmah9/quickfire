import type { SupportedLocale } from './config';

const formatterCache = new Map<string, Intl.NumberFormat>();

export function formatNumber(
  value: number,
  locale: SupportedLocale
): string {
  const formatter = formatterCache.get(locale) ?? new Intl.NumberFormat(locale);

  if (!formatterCache.has(locale)) {
    formatterCache.set(locale, formatter);
  }

  return formatter.format(value);
}

