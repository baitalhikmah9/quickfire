import rawQuestions from '@/constants/questions.json';
import type { CategoryOption, QuestionCard } from '@/features/shared';
import type { SupportedLocale } from '@/lib/i18n/config';

interface SourceQA {
  text: string;
  answer: string;
}

interface SourceGroup {
  id: string;
  questionAndanswer: SourceQA[];
  categoryId: string;
  name: string;
  points: number;
}

type LocalizedQuestion = Pick<QuestionCard, 'prompt' | 'answer'>;

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

const QUESTION_GROUPS = dedupeQuestionGroups(rawQuestions as SourceGroup[]);
const CATEGORY_TRANSLATIONS: Partial<Record<SupportedLocale, Record<string, string>>> = {};
const QUESTION_TRANSLATIONS: Partial<
  Record<SupportedLocale, Record<string, LocalizedQuestion>>
> = {};

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

function getCanonicalKey(slug: string, pointValue: number, index: number) {
  return `${slug}:${pointValue}:${index}`;
}

function resolveCategoryTranslation(
  slug: string,
  englishTitle: string,
  localeChain: SupportedLocale[]
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
  localeChain: SupportedLocale[]
) {
  for (const locale of localeChain) {
    const translatedQuestion = QUESTION_TRANSLATIONS[locale]?.[canonicalKey];

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

export function getPlayableCategories(
  localeChain: SupportedLocale[] = ['en']
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

export function buildBoard(
  categorySlugs: string[],
  localeChain: SupportedLocale[] = ['en']
): QuestionCard[] {
  const board: QuestionCard[] = [];

  for (const slug of categorySlugs) {
    const categoryGroups = QUESTION_GROUPS
      .filter((group) => slugify(group.name) === slug)
      .sort((a, b) => a.points - b.points);

    for (const group of categoryGroups) {
      if (!group.questionAndanswer.length) continue;
      const pool = group.questionAndanswer;
      const [iLeft, iRight] = pickTwoDistinctIndices(pool.length);
      const categoryTranslation = resolveCategoryTranslation(slug, group.name, localeChain);

      const pushSide = (index: number, side: 'left' | 'right') => {
        const qa = pool[index]!;
        const canonicalKey = getCanonicalKey(slug, group.points, index);
        const resolvedQuestion = resolveQuestionTranslation(canonicalKey, qa, localeChain);
        board.push({
          id: `${group.categoryId}:${canonicalKey}:${side}`,
          canonicalKey,
          categoryId: group.categoryId,
          categoryName: categoryTranslation.title,
          prompt: resolvedQuestion.prompt,
          answer: resolvedQuestion.answer,
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
  localeChain: SupportedLocale[] = ['en']
): QuestionCard | null {
  const candidates: QuestionCard[] = [];

  for (const group of QUESTION_GROUPS) {
    const slug = slugify(group.name);
    if (!categorySlugs.includes(slug)) continue;
    for (let index = 0; index < group.questionAndanswer.length; index += 1) {
      const qa = group.questionAndanswer[index];
      const canonicalKey = getCanonicalKey(slug, group.points, index);
      const id = `${group.categoryId}:${canonicalKey}:bonus`;
      if (usedQuestionIds.has(id)) continue;
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
        pointValue: group.points + 200,
        locale: resolvedQuestion.locale,
        resolvedFromFallback: resolvedQuestion.resolvedFromFallback,
        used: false,
      });
    }
  }

  return candidates.length ? pickRandom(candidates) : null;
}

export function getModeCategoryCount(
  mode: 'classic' | 'quickPlay' | 'random' | 'rumble' | 'rapidFire',
  quickPlayTopicCount: number
): number {
  if (mode === 'quickPlay') return quickPlayTopicCount;
  if (mode === 'rapidFire') return 5;
  return 6;
}

export function getRandomRemainingQuestion(board: QuestionCard[], usedQuestionIds: Set<string>): QuestionCard | null {
  const remaining = board.filter((question) => !usedQuestionIds.has(question.id));
  if (!remaining.length) return null;
  return pickRandom(remaining);
}
