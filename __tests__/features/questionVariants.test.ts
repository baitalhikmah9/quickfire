import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  buildBoard,
  clearQuestionTranslations,
  getPlayableCategories,
  registerQuestionTranslations,
  resolveQuestionVariants,
} from '@/features/play/data';
import type { QuestionCard } from '@/features/shared';

/** A bundled question (English text comes from constants/questions.json). */
function bundledQuestion(): QuestionCard {
  const category = getPlayableCategories(['en'])[0]!;
  const card = buildBoard([category.slug])[0]!;
  expect(card.canonicalKey).toMatch(/^q\d+$/);
  return card;
}

/** A question that is not in the bundle (for example served by Convex). */
const REMOTE_CARD = {
  canonicalKey: 'q999999',
  prompt: 'Remote English prompt',
  answer: 'Remote answer',
  locale: 'en' as const,
};

beforeEach(() => {
  // Board building picks at random; pin it so the same bundled question comes back each time.
  jest.spyOn(Math, 'random').mockReturnValue(0);
});

afterEach(() => {
  clearQuestionTranslations();
  jest.restoreAllMocks();
});

describe('resolveQuestionVariants', () => {
  it('shows English only when no content language is set', () => {
    const card = bundledQuestion();
    const variants = resolveQuestionVariants(card, { primary: null, secondary: null });

    expect(variants.english).toEqual({
      locale: 'en',
      prompt: card.prompt,
      answer: card.answer,
      fellBackToEnglish: false,
    });
    expect(variants.translations).toEqual([]);
  });

  it('keeps English first and stacks both selected translations beneath it', () => {
    const card = bundledQuestion();
    registerQuestionTranslations('ja', {
      [card.canonicalKey]: { prompt: ' 日本語の問題 ', answer: '答え' },
    });
    registerQuestionTranslations('ar', {
      [card.canonicalKey]: { prompt: 'سؤال عربي', answer: 'جواب' },
      q1: { prompt: 'سؤال آخر', answer: 'آخر' },
    });

    const variants = resolveQuestionVariants(card, { primary: 'ja', secondary: 'ar' });

    expect(variants.english).toEqual({
      locale: 'en',
      prompt: card.prompt,
      answer: card.answer,
      fellBackToEnglish: false,
    });
    expect(variants.translations).toEqual([
      {
        locale: 'ja',
        prompt: '日本語の問題',
        answer: '答え',
        fellBackToEnglish: false,
      },
      {
        locale: 'ar',
        prompt: 'سؤال عربي',
        answer: 'جواب',
        fellBackToEnglish: false,
      },
    ]);
  });

  it('omits missing translations instead of duplicating English', () => {
    const card = bundledQuestion();
    registerQuestionTranslations('de', {
      [card.canonicalKey]: { prompt: 'Deutsche Frage', answer: 'Antwort' },
    });

    const secondaryMissing = resolveQuestionVariants(card, { primary: 'de', secondary: 'sw' });
    expect(secondaryMissing.english).toMatchObject({ locale: 'en', prompt: card.prompt });
    expect(secondaryMissing.translations).toEqual([
      {
        locale: 'de',
        prompt: 'Deutsche Frage',
        answer: 'Antwort',
        fellBackToEnglish: false,
      },
    ]);

    const primaryMissing = resolveQuestionVariants(card, { primary: 'sw', secondary: 'de' });
    expect(primaryMissing.english).toMatchObject({ locale: 'en', prompt: card.prompt });
    expect(primaryMissing.translations).toEqual([
      {
        locale: 'de',
        prompt: 'Deutsche Frage',
        answer: 'Antwort',
        fellBackToEnglish: false,
      },
    ]);
  });

  it('shows English alone when both selected languages are missing', () => {
    const card = bundledQuestion();
    const variants = resolveQuestionVariants(card, { primary: 'ko', secondary: 'tr' });

    expect(variants.english).toMatchObject({ locale: 'en', prompt: card.prompt });
    expect(variants.translations).toEqual([]);
  });

  it('uses the card text as English when the key is not in the bundle', () => {
    const variants = resolveQuestionVariants(REMOTE_CARD, { primary: 'fr', secondary: null });

    expect(variants.english).toEqual({
      locale: 'en',
      prompt: 'Remote English prompt',
      answer: 'Remote answer',
      fellBackToEnglish: false,
    });
    expect(variants.translations).toEqual([]);
  });

  it('resolves English from the bundled catalog even when the card carries translated text', () => {
    const card = bundledQuestion();
    const variants = resolveQuestionVariants(
      { ...card, locale: 'it', prompt: 'Domanda', answer: 'Risposta' },
      { primary: 'it', secondary: null }
    );

    expect(variants.english).toEqual({
      locale: 'en',
      prompt: card.prompt,
      answer: card.answer,
      fellBackToEnglish: false,
    });
    // Card locale matches the selected language, so it counts as that translation.
    expect(variants.translations).toEqual([
      {
        locale: 'it',
        prompt: 'Domanda',
        answer: 'Risposta',
        fellBackToEnglish: false,
      },
    ]);
  });

  it('keeps a remote card that already arrived in the requested locale as a translation', () => {
    const variants = resolveQuestionVariants(
      { ...REMOTE_CARD, locale: 'it', prompt: 'Domanda', answer: 'Risposta' },
      { primary: 'it', secondary: null }
    );

    expect(variants.english).toMatchObject({
      locale: 'en',
      prompt: 'Domanda',
      answer: 'Risposta',
      fellBackToEnglish: true,
    });
    expect(variants.translations).toEqual([
      {
        locale: 'it',
        prompt: 'Domanda',
        answer: 'Risposta',
        fellBackToEnglish: false,
      },
    ]);
  });
});

describe('board text with registered translations', () => {
  it('uses the primary locale for the board card and English for everything else', () => {
    const card = bundledQuestion();
    registerQuestionTranslations('es', {
      [card.canonicalKey]: { prompt: 'Pregunta', answer: 'Respuesta' },
    });

    const category = getPlayableCategories(['en'])[0]!;
    const board = buildBoard([category.slug], ['es', 'en']);
    const translated = board.find((question) => question.canonicalKey === card.canonicalKey);
    const others = board.filter((question) => question.canonicalKey !== card.canonicalKey);

    expect(translated).toMatchObject({ prompt: 'Pregunta', locale: 'es', resolvedFromFallback: false });
    expect(others.length).toBeGreaterThan(0);
    expect(others.every((question) => question.locale === 'en' && question.resolvedFromFallback)).toBe(true);
  });
});
