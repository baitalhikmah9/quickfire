import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useConvex, useConvexAuth } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { QuestionCard } from '@/features/shared';
import { resolveQuestionVariants, type QuestionVariants } from '@/features/play/data';
import {
  applyQuestionTranslations,
  getQuestionTranslationsVersion,
  hasRequestedTranslation,
  subscribeQuestionTranslations,
  type QuestionTranslationVariant,
} from '@/features/play/questionTranslations';
import {
  type ContentLocalePriority,
  type NonEnglishContentLocale,
} from '@/lib/i18n/config';
import { useLocaleStore } from '@/store/locale';

/** The content languages to fetch, primary first, deduped, never more than the two slots. */
function wantedLocales(contentLocales: ContentLocalePriority): NonEnglishContentLocale[] {
  const wanted: NonEnglishContentLocale[] = [];
  for (const locale of [contentLocales.primary, contentLocales.secondary]) {
    if (!locale || wanted.includes(locale)) continue;
    wanted.push(locale);
  }
  return wanted;
}

/**
 * Fetches the translated text for the active question into the shared registry.
 *
 * One-shot and failure-catching on purpose. `useQuery` would throw a server or missing-function
 * error during render, and the root ErrorBoundary would replace the play screen instead of leaving
 * the English question up, so a rejected promise is swallowed here and English stays on screen for
 * any slot that still has no cached hit. Nothing is retried, expired or persisted: a pair that
 * failed is simply not remembered, and the next mount may ask again.
 *
 * A late response cannot land on the wrong question or language: rows are stored under the locale
 * and canonicalKey the server returned, the request is cancelled when the active question, auth or
 * the selected languages change, and the visible text is always resolved from the current question.
 * The shared cache version notifies every mounted consumer (question screen and answer panel).
 */
export function useQuestionTranslations(
  question: QuestionCard | null | undefined
): void {
  const convex = useConvex();
  const { isAuthenticated } = useConvexAuth();
  const contentLocales = useLocaleStore((state) => state.contentLocales);
  const canonicalKey = question?.canonicalKey ?? null;

  const locales = useMemo(() => wantedLocales(contentLocales), [contentLocales]);

  useEffect(() => {
    if (!isAuthenticated || !canonicalKey || locales.length === 0) return;

    const missing = locales.filter(
      (locale) => !hasRequestedTranslation(locale, canonicalKey)
    );
    if (missing.length === 0) return;

    let cancelled = false;
    convex
      .query(api.content.getQuestionTranslationVariants, {
        canonicalKeys: [canonicalKey],
        locales: missing,
      })
      .then((rows) => {
        if (cancelled) return;
        applyQuestionTranslations(rows as QuestionTranslationVariant[]);
      })
      .catch(() => {
        // Keep English (or earlier cached hits) on screen; do not wipe the play UI.
      });

    return () => {
      cancelled = true;
    };
  }, [convex, isAuthenticated, canonicalKey, locales]);
}

/**
 * The on-screen variants of the current question: English always first, plus each selected
 * content language that has a real translation beneath it. Selection is by `canonicalKey`, so
 * every block shows the same question.
 *
 * English comes from the bundled catalog immediately. Cached translations appear as soon as they
 * land; missing languages are omitted (no duplicate English blocks). The shared translations
 * version re-resolves every consumer when any mount fills the cache.
 */
export function useQuestionVariants(
  question: QuestionCard | null | undefined
): QuestionVariants | null {
  const contentLocales = useLocaleStore((state) => state.contentLocales);
  useQuestionTranslations(question);
  const translationsVersion = useSyncExternalStore(
    subscribeQuestionTranslations,
    getQuestionTranslationsVersion,
    getQuestionTranslationsVersion
  );

  return useMemo(() => {
    void translationsVersion;
    return question ? resolveQuestionVariants(question, contentLocales) : null;
  }, [question, contentLocales, translationsVersion]);
}
