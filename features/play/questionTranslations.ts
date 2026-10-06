/**
 * Client cache for translated question text, filled from Convex during play.
 *
 * The translations live in Convex rather than in the bundle, so the play screen asks for the
 * active question's text and keeps whatever comes back for the rest of the process. The cache is
 * the existing `QUESTION_TRANSLATIONS` registry in `features/play/data.ts`, reached through
 * `registerQuestionTranslations`; this module only tracks which pairs have been requested so a
 * successful hits skip later requests, and writes those responses into that registry.
 *
 * The version + subscribe pair is the shared reactive signal. `useQuestionVariants` is mounted in
 * both the question screen and the answer panel; a local `useState` per hook would leave the other
 * consumer on English after the first one filled the cache. Every consumer reads the same version
 * through `useSyncExternalStore`, so one successful write re-resolves every mount.
 *
 * Nothing here retries, expires or persists: a failed request is simply not remembered, so the
 * next mount may try again. Cached hits stay in the registry for the process; missing languages
 * are omitted from the translation blocks so English stays visible without duplicates.
 */

import { registerQuestionTranslations, type QuestionTranslationPack } from '@/features/play/data';
import { CONTENT_LOCALES, type NonEnglishContentLocale } from '@/lib/i18n/config';

export interface QuestionTranslationVariant {
  canonicalKey: string;
  locale: string;
  prompt: string;
  answer: string;
}

const REQUESTED = new Set<string>();

const CONTENT_LOCALE_SET: ReadonlySet<string> = new Set<string>(CONTENT_LOCALES);

let version = 0;
const listeners = new Set<() => void>();

function pairKey(locale: string, canonicalKey: string): string {
  return `${locale}\u0000${canonicalKey}`;
}

function isNonEnglishContentLocale(locale: string): locale is NonEnglishContentLocale {
  return CONTENT_LOCALE_SET.has(locale);
}

function notifyQuestionTranslations(): void {
  version += 1;
  for (const listener of listeners) listener();
}

/** Snapshot for `useSyncExternalStore`. */
export function getQuestionTranslationsVersion(): number {
  return version;
}

/** Subscribe for `useSyncExternalStore`. */
export function subscribeQuestionTranslations(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

/** True once a successful non-empty response for this locale and question has been stored. */
export function hasRequestedTranslation(locale: string, canonicalKey: string): boolean {
  return REQUESTED.has(pairKey(locale, canonicalKey));
}

/**
 * Stores a response and reports whether anything new arrived.
 * Empty or whitespace-only prompt/answer rows are ignored so English is not replaced by blanks.
 * Runs in one pass per locale so the registry is written once per pack, then notifies every
 * mounted consumer through the shared version.
 */
export function applyQuestionTranslations(rows: readonly QuestionTranslationVariant[]): boolean {
  const packs = new Map<NonEnglishContentLocale, QuestionTranslationPack>();

  for (const row of rows) {
    if (row.locale === 'en' || !isNonEnglishContentLocale(row.locale)) continue;
    if (typeof row.prompt !== 'string' || typeof row.answer !== 'string') continue;
    const prompt = row.prompt.trim();
    const answer = row.answer.trim();
    if (!prompt || !answer) continue;
    if (hasRequestedTranslation(row.locale, row.canonicalKey)) continue;

    const pack = packs.get(row.locale) ?? {};
    pack[row.canonicalKey] = { prompt, answer };
    packs.set(row.locale, pack);
  }

  if (packs.size === 0) return false;

  for (const [locale, pack] of packs) {
    registerQuestionTranslations(locale, pack);
    for (const canonicalKey of Object.keys(pack)) {
      REQUESTED.add(pairKey(locale, canonicalKey));
    }
  }

  notifyQuestionTranslations();
  return true;
}

/** Test helper: forget which pairs were fetched and bump the shared version. */
export function clearRequestedQuestionTranslations(): void {
  REQUESTED.clear();
  notifyQuestionTranslations();
}
