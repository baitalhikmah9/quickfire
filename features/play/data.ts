import { mark } from '@/lib/startupTiming';
import rawQuestions from '@/constants/questions.json';
import { groupRumbleQuestionsByValueBucket, normalizeRumbleTopicCount } from '@/features/play/rumble';
import type { CategoryOption, GameMode, QuestionCard } from '@/features/shared';
import type {
  ContentLocale,
  ContentLocalePriority,
  NonEnglishContentLocale,
} from '@/lib/i18n/config';
import { questionCanonicalKey } from '@/features/play/canonicalKey';
import { normalizeQuickPlayTopicCount } from '@/features/play/tokenCosts';

interface SourceQA {
  /** Permanent spreadsheet UserID; the canonical key is `q<userId>` (see canonicalKey.ts). */
  userId?: string;
  text: string;
  answer: string;
  imageKey?: string;
}

interface SourceGroup {
  id: string;
  questionAndanswer: SourceQA[];
  categoryId: string;
  name: string;
  points: number;
}

/** One translated question variant, as stored in `constants/translations/<locale>.json`. */
export type LocalizedQuestion = Pick<QuestionCard, 'prompt' | 'answer'>;

/** A per-locale pack: canonical key (`q<UserID>`) to translated prompt and answer. */
export type QuestionTranslationPack = Record<string, LocalizedQuestion>;

function getGroupSignature(group: SourceGroup) {
  const entries = group.questionAndanswer
    .map(({ text, answer }) => `${text.trim()}::${answer.trim()}`)
    .join('||');
  return `${group.categoryId}|${slugify(group.name)}|${group.points}|${entries}`;
}

function dedupeQuestionGroups(groups: SourceGroup[]) {
  const unique = new Map<string, SourceGroup>();

  for (const group of groups) {
    const signature = getGroupSignature(group);
    if (!unique.has(signature)) {
      unique.set(signature, group);
    }
  }

  return Array.from(unique.values());
}

mark('play data module evaluating (questions.json already parsed)');
// SAFETY: constants/questions.json is authored to the SourceGroup schema and validated by import tooling.
const QUESTION_GROUPS = dedupeQuestionGroups(rawQuestions as SourceGroup[]);
mark('questions deduped');
const CATEGORY_TRANSLATIONS: Partial<Record<ContentLocale, Record<string, string>>> = {};
/**
 * Translated question variants by content locale, keyed by canonical key. English is not stored
 * here: it always comes from the bundled `questions.json`. Packs are generated per locale by
 * `scripts/build-locale-packs.ts` into `constants/translations/<locale>.json` (gitignored) and
 * handed to `registerQuestionTranslations`; loading them at runtime is a separate change.
 */
const QUESTION_TRANSLATIONS: Partial<Record<NonEnglishContentLocale, QuestionTranslationPack>> = {};

let englishByCanonicalKey: Map<string, SourceQA> | null = null;

/** Bundled English question for a canonical key (built once, on first use). */
function getEnglishQuestion(canonicalKey: string): SourceQA | undefined {
  if (!englishByCanonicalKey) {
    englishByCanonicalKey = new Map();
    for (const group of QUESTION_GROUPS) {
      const slug = slugify(group.name);
      group.questionAndanswer.forEach((qa, index) => {
        const key = getCanonicalKey(group, slug, index);
        if (!englishByCanonicalKey!.has(key)) englishByCanonicalKey!.set(key, qa);
      });
    }
  }
  return englishByCanonicalKey.get(canonicalKey);
}

/** Add (or replace) the translated variants for one content locale. */
export function registerQuestionTranslations(
  locale: NonEnglishContentLocale,
  pack: QuestionTranslationPack
): void {
  QUESTION_TRANSLATIONS[locale] = { ...QUESTION_TRANSLATIONS[locale], ...pack };
}

/** Test helper: drop every registered translation pack. */
export function clearQuestionTranslations(): void {
  for (const locale of Object.keys(QUESTION_TRANSLATIONS)) {
    delete QUESTION_TRANSLATIONS[locale as NonEnglishContentLocale];
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function pickTwoDistinctIndices(length: number): [number, number] {
  if (length <= 1) return [0, 0];
  const a = Math.floor(Math.random() * length);
  let b = Math.floor(Math.random() * length);
  let guard = 0;
  while (b === a && guard < 64) {
    b = Math.floor(Math.random() * length);
    guard += 1;
  }
  if (b === a) b = (a + 1) % length;
  return [a, b];
}

function getCanonicalKey(group: SourceGroup, slug: string, index: number) {
  return questionCanonicalKey(group.questionAndanswer[index]!, slug, group.points, index);
}

function resolveCategoryTranslation(
  slug: string,
  englishTitle: string,
  localeChain: ContentLocale[]
) {
  for (const locale of localeChain) {
    const translatedTitle = CATEGORY_TRANSLATIONS[locale]?.[slug];

    if (translatedTitle) {
      return {
        title: translatedTitle,
        resolvedLocale: locale,
        fellBackToEnglish: locale === 'en',
      };
    }

    if (locale === 'en') {
      return {
        title: englishTitle,
        resolvedLocale: 'en' as const,
        fellBackToEnglish: true,
      };
    }
  }

  return {
    title: englishTitle,
    resolvedLocale: 'en' as const,
    fellBackToEnglish: true,
  };
}

function resolveQuestionTranslation(
  canonicalKey: string,
  englishQuestion: SourceQA,
  localeChain: ContentLocale[]
) {
  for (const locale of localeChain) {
    const translatedQuestion =
      locale === 'en' ? undefined : QUESTION_TRANSLATIONS[locale]?.[canonicalKey];

    if (translatedQuestion) {
      return {
        prompt: translatedQuestion.prompt.trim(),
        answer: translatedQuestion.answer.trim(),
        locale,
        resolvedFromFallback: locale !== localeChain[0],
      };
    }

    if (locale === 'en') {
      return {
        prompt: englishQuestion.text.trim(),
        answer: englishQuestion.answer.trim(),
        locale: 'en' as const,
        resolvedFromFallback: localeChain[0] !== 'en',
      };
    }
  }

  return {
    prompt: englishQuestion.text.trim(),
    answer: englishQuestion.answer.trim(),
    locale: 'en' as const,
    resolvedFromFallback: localeChain[0] !== 'en',
  };
}

/** One language's text for a question, as shown on the question and answer views. */
export interface QuestionVariant {
  locale: ContentLocale;
  prompt: string;
  answer: string;
  /**
   * Always false for on-screen blocks under the English-plus-translations layout.
   * Missing selected languages are omitted entirely instead of duplicating English.
   */
  fellBackToEnglish: boolean;
}

/**
 * On-screen text for one question: English always first, then each selected content language
 * that has a real translation. Missing translations are omitted so English is never shown twice.
 */
export interface QuestionVariants {
  /** Always English. Prefer the bundled canonical row even when the card text is translated. */
  english: QuestionVariant;
  /** Selected content languages with real translations, in selection order (at most two). */
  translations: QuestionVariant[];
}

type VariantSource = Pick<QuestionCard, 'canonicalKey' | 'prompt' | 'answer' | 'locale'>;

/**
 * English text for the question screen. Prefer the bundled catalog by canonical key so a card that
 * already carries translated prompt/answer still shows English first.
 */
function resolveEnglishVariant(question: VariantSource): QuestionVariant {
  const bundled = getEnglishQuestion(question.canonicalKey);
  if (bundled) {
    return {
      locale: 'en',
      prompt: bundled.text.trim(),
      answer: bundled.answer.trim(),
      fellBackToEnglish: false,
    };
  }

  // Remote / unbundled cards: use the card when it is already English.
  if (question.locale === 'en') {
    return {
      locale: 'en',
      prompt: question.prompt.trim(),
      answer: question.answer.trim(),
      fellBackToEnglish: false,
    };
  }

  // No English source available - still provide a first block so the UI never goes blank.
  return {
    locale: 'en',
    prompt: question.prompt.trim(),
    answer: question.answer.trim(),
    fellBackToEnglish: true,
  };
}

/**
 * Real translation for one selected content language, or null when missing.
 * Null means "omit this block" - English stays visible without a duplicate English fallback.
 */
function resolveTranslationVariant(
  question: VariantSource,
  locale: NonEnglishContentLocale
): QuestionVariant | null {
  const translated = QUESTION_TRANSLATIONS[locale]?.[question.canonicalKey];
  if (translated) {
    const prompt = translated.prompt.trim();
    const answer = translated.answer.trim();
    if (prompt && answer) {
      return { locale, prompt, answer, fellBackToEnglish: false };
    }
  }

  // Card already arrived in this locale (for example a remote/Convex-served row).
  if (question.locale === locale) {
    const prompt = question.prompt.trim();
    const answer = question.answer.trim();
    if (prompt && answer) {
      return { locale, prompt, answer, fellBackToEnglish: false };
    }
  }

  return null;
}

/**
 * Resolve the chosen question into the on-screen language blocks: English first, then each
 * selected content language that has a real translation. Selection is by `canonicalKey`.
 * Missing translations are omitted (not replaced with a second English block).
 */
export function resolveQuestionVariants(
  question: VariantSource,
  contentLocales: ContentLocalePriority
): QuestionVariants {
  const english = resolveEnglishVariant(question);
  const translations: QuestionVariant[] = [];
  const seen = new Set<NonEnglishContentLocale>();

  for (const locale of [contentLocales.primary, contentLocales.secondary]) {
    if (!locale || seen.has(locale)) continue;
    seen.add(locale);
    const variant = resolveTranslationVariant(question, locale);
    if (variant) translations.push(variant);
  }

  return { english, translations };
}

export function getPlayableCategories(
  localeChain: ContentLocale[] = ['en']
): CategoryOption[] {
  const grouped = new Map<string, CategoryOption>();

  for (const group of QUESTION_GROUPS) {
    const slug = slugify(group.name);
    const existing = grouped.get(slug);
    if (existing) {
      existing.questionCount += group.questionAndanswer.length;
      continue;
    }
    const translation = resolveCategoryTranslation(slug, group.name, localeChain);
    grouped.set(slug, {
      id: group.categoryId,
      slug,
      title: translation.title,
      questionCount: group.questionAndanswer.length,
      resolvedLocale: translation.resolvedLocale,
      fellBackToEnglish: translation.fellBackToEnglish,
    });
  }

  return Array.from(grouped.values()).sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Some source topics ship multiple groups at the same point value.
 * The play board needs exactly one left/right pair per (topic, value),
 * so collapse extras before building tiles (required for balanced Rumble).
 */
function pickGroupsForBoard(categoryGroups: SourceGroup[]): SourceGroup[] {
  const byPoints = new Map<number, SourceGroup[]>();

  for (const group of categoryGroups) {
    if (!group.questionAndanswer.length) continue;
    const existing = byPoints.get(group.points) ?? [];
    existing.push(group);
    byPoints.set(group.points, existing);
  }

  return Array.from(byPoints.entries())
    .sort(([pointsA], [pointsB]) => pointsA - pointsB)
    .map(([, groups]) => pickRandom(groups));
}

export function buildBoard(
  categorySlugs: string[],
  localeChain: ContentLocale[] = ['en'],
  askedCanonicalKeys: ReadonlySet<string> = new Set()
): QuestionCard[] {
  const board: QuestionCard[] = [];

  for (const slug of categorySlugs) {
    const categoryGroups = QUESTION_GROUPS
      .filter((group) => slugify(group.name) === slug)
      .sort((a, b) => a.points - b.points);
    const groupsForBoard = pickGroupsForBoard(categoryGroups);

    for (const group of groupsForBoard) {
      const unaskedIndices = group.questionAndanswer
        .map((_, index) => index)
        .filter((index) => !askedCanonicalKeys.has(getCanonicalKey(group, slug, index)));
      const poolIndices = unaskedIndices.length >= 2
        ? unaskedIndices
        : group.questionAndanswer.map((_, index) => index);
      const [leftPoolIndex, rightPoolIndex] = pickTwoDistinctIndices(poolIndices.length);
      const iLeft = poolIndices[leftPoolIndex]!;
      const iRight = poolIndices[rightPoolIndex]!;
      const categoryTranslation = resolveCategoryTranslation(slug, group.name, localeChain);

      const pushSide = (index: number, side: 'left' | 'right') => {
        const qa = group.questionAndanswer[index]!;
        const canonicalKey = getCanonicalKey(group, slug, index);
        const resolvedQuestion = resolveQuestionTranslation(canonicalKey, qa, localeChain);
        board.push({
          id: `${group.categoryId}:${canonicalKey}:${side}`,
          canonicalKey,
          categoryId: group.categoryId,
          categoryName: categoryTranslation.title,
          prompt: resolvedQuestion.prompt,
          answer: resolvedQuestion.answer,
          promptImageKey: qa.imageKey,
          pointValue: group.points,
          locale: resolvedQuestion.locale,
          resolvedFromFallback: resolvedQuestion.resolvedFromFallback,
          used: false,
          boardSide: side,
        });
      };

      pushSide(iLeft, 'left');
      pushSide(iRight, 'right');
    }
  }

  return board;
}

export function getBonusQuestion(
  categorySlugs: string[],
  usedQuestionIds: Set<string>,
  localeChain: ContentLocale[] = ['en'],
  askedCanonicalKeys: ReadonlySet<string> = new Set()
): QuestionCard | null {
  const candidates: QuestionCard[] = [];

  for (const group of QUESTION_GROUPS) {
    const slug = slugify(group.name);
    if (!categorySlugs.includes(slug)) continue;
    for (let index = 0; index < group.questionAndanswer.length; index += 1) {
      const qa = group.questionAndanswer[index];
      const canonicalKey = getCanonicalKey(group, slug, index);
      const id = `${group.categoryId}:${canonicalKey}:bonus`;
      if (usedQuestionIds.has(id) || askedCanonicalKeys.has(canonicalKey)) continue;
      const resolvedQuestion = resolveQuestionTranslation(
        canonicalKey,
        qa,
        localeChain
      );
      const categoryTranslation = resolveCategoryTranslation(
        slug,
        `${group.name} Bonus`,
        localeChain
      );
      candidates.push({
        id,
        canonicalKey,
        categoryId: group.categoryId,
        categoryName: categoryTranslation.title,
        prompt: resolvedQuestion.prompt,
        answer: resolvedQuestion.answer,
        promptImageKey: qa.imageKey,
        pointValue: group.points + 100,
        locale: resolvedQuestion.locale,
        resolvedFromFallback: resolvedQuestion.resolvedFromFallback,
        used: false,
      });
    }
  }

  return candidates.length ? pickRandom(candidates) : null;
}

export function defaultTopicCountForMode(mode: GameMode): number {
  if (mode === 'quickPlay') return 3;
  if (mode === 'rapidFire') return 5;
  return 6;
}

export function getModeCategoryCount(mode: GameMode, topicCount?: number): number {
  if (mode === 'quickPlay') return normalizeQuickPlayTopicCount(topicCount);
  if (mode === 'random') {
    if (
      topicCount === 1 ||
      topicCount === 2 ||
      topicCount === 3 ||
      topicCount === 4 ||
      topicCount === 5 ||
      topicCount === 6
    ) {
      return topicCount;
    }
    return 6;
  }
  if (mode === 'rumble') return normalizeRumbleTopicCount(topicCount);
  if (mode === 'rapidFire') return 5;
  return 6;
}

export function getRandomRemainingQuestion(
  board: QuestionCard[],
  usedQuestionIds: Set<string>,
  options?: { teamId?: string }
): QuestionCard | null {
  const remaining = board.filter((question) => !usedQuestionIds.has(question.id));
  if (!remaining.length) return null;
  if (options?.teamId) {
    const owned = remaining.filter((question) => question.assignedTeamId === options.teamId);
    if (owned.length) return pickRandom(owned);
  }
  return pickRandom(remaining);
}

function shuffleItems<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = shuffled[index]!;
    shuffled[index] = shuffled[swapIndex]!;
    shuffled[swapIndex] = current;
  }
  return shuffled;
}

function buildBalancedTeamSequence(teamIds: string[], repeats: number): string[] {
  const sequence: string[] = [];
  for (let repeat = 0; repeat < repeats; repeat += 1) {
    sequence.push(...shuffleItems(teamIds));
  }
  return shuffleItems(sequence);
}

/**
 * Fair random-mode ownership: each team gets an equal share of 100/200/300 tiles.
 * Falls back to whole-board balance if value buckets are uneven.
 */
export function assignRandomQuestionOwners(
  board: QuestionCard[],
  teamIds: string[]
): QuestionCard[] {
  if (teamIds.length < 2 || board.length === 0) return board;

  const assignments = new Map<string, string>();
  const byValueBucket = groupRumbleQuestionsByValueBucket(board);

  const assignBucket = (questions: QuestionCard[]) => {
    if (questions.length % teamIds.length !== 0) return false;
    const repeatsPerTeam = questions.length / teamIds.length;
    const owners = buildBalancedTeamSequence(teamIds, repeatsPerTeam);
    shuffleItems(questions).forEach((question, index) => {
      assignments.set(question.id, owners[index]!);
    });
    return true;
  };

  if (byValueBucket) {
    let ok = true;
    for (const questions of byValueBucket.values()) {
      if (!assignBucket(questions)) {
        ok = false;
        break;
      }
    }
    if (ok) {
      return board.map((question) => ({
        ...question,
        assignedTeamId: assignments.get(question.id),
      }));
    }
  }

  // ponytail: whole-board balance if buckets can't divide evenly
  if (!assignBucket(board)) return board;
  return board.map((question) => ({
    ...question,
    assignedTeamId: assignments.get(question.id),
  }));
}
