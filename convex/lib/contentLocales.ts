/**
 * Server-side content locale list and request bounds for translated question variants.
 *
 * Intentional client/server list separation: the server keeps its own allowlist here, and the client
 * keeps `CONTENT_LOCALES` in `lib/i18n/config.ts`. `__tests__/convex/questionTranslations.test.ts`
 * compares the two and fails when they drift apart.
 *
 * English is deliberately absent: the client always has the bundled English catalog, so the
 * translation lookup never returns English rows.
 */
export const CONTENT_LOCALES = [
  'zh-Hans',
  'es',
  'ar',
  'hi',
  'fr',
  'pt-BR',
  'ur',
  'bn',
  'id',
  'ru',
  'ja',
  'ko',
  'sw',
  'de',
  'pt-PT',
  'it',
  'tr',
] as const;

export type ContentLocale = (typeof CONTENT_LOCALES)[number];

const CONTENT_LOCALE_SET: ReadonlySet<string> = new Set(CONTENT_LOCALES);

/** Two content languages are shown at once (primary above, secondary beneath). */
export const MAX_CONTENT_LOCALES = 2;

/**
 * Derived from board generation, not assumed: Random and Rumble allow six topics, the source has
 * three point buckets (100, 200, 300), and `buildBoard` takes one group per bucket with two sides,
 * so a maximal board is 6 x 3 x 2 = 36 cards holding 36 distinct stable keys. `getBonusQuestion`
 * can add one key the board never held, so one session needs at most 37. 48 leaves headroom
 * without letting a caller walk a catalog, and `__tests__/convex/questionTranslations.test.ts`
 * builds a real maximal board to pin the figure.
 */
export const MAX_TRANSLATION_KEYS = 48;

const CANONICAL_KEY_SHAPE = /^q\d+$/;

/**
 * Oversized requests are refused rather than silently truncated, so client misuse is visible
 * instead of looking like missing content.
 */
export function assertTranslationRequestWithinBounds(requested: {
  canonicalKeys: readonly string[];
  locales: readonly string[];
}): void {
  if (requested.locales.length > MAX_CONTENT_LOCALES) {
    throw new Error(
      `translation_request_too_many_locales: ${requested.locales.length} requested, ${MAX_CONTENT_LOCALES} allowed`
    );
  }
  if (requested.canonicalKeys.length > MAX_TRANSLATION_KEYS) {
    throw new Error(
      `translation_request_too_many_keys: ${requested.canonicalKeys.length} requested, ${MAX_TRANSLATION_KEYS} allowed`
    );
  }
}

/**
 * Allowed locales only, deduped, in request order. An unknown locale is dropped rather than
 * answered, so a client newer than the server degrades to English instead of erroring, and no
 * locale outside the allowlist can ever be read.
 */
export function boundedContentLocales(requested: readonly string[]): ContentLocale[] {
  const bounded: ContentLocale[] = [];
  for (const locale of requested) {
    if (!CONTENT_LOCALE_SET.has(locale)) continue;
    const typed = locale as ContentLocale;
    if (bounded.includes(typed)) continue;
    bounded.push(typed);
  }
  return bounded;
}

/** Stable `q<UserID>` keys only, deduped, in request order. */
export function boundedCanonicalKeys(requested: readonly string[]): string[] {
  const bounded: string[] = [];
  for (const key of requested) {
    if (!CANONICAL_KEY_SHAPE.test(key)) continue;
    if (bounded.includes(key)) continue;
    bounded.push(key);
  }
  return bounded;
}
