import { describe, expect, it } from '@jest/globals';
import {
  QUESTION_REPORT_REASONS,
  buildQuestionReportPayload,
  canSubmitQuestionReport,
  type QuestionReportDraft,
} from '@/features/play/questionReport';
import type { QuestionCard } from '@/features/shared';

function draft(overrides: Partial<QuestionReportDraft> = {}): QuestionReportDraft {
  return {
    reasons: ['factually_incorrect'],
    location: 'question',
    otherText: '',
    ...overrides,
  };
}

function question(overrides: Partial<QuestionCard> = {}): QuestionCard {
  return {
    id: 'cat_science:science:200:0:left',
    canonicalKey: 'science:200:0',
    categoryId: 'cat_science',
    categoryName: 'Science',
    prompt: 'What is the capital of France?',
    answer: 'Paris',
    pointValue: 200,
    locale: 'en',
    resolvedFromFallback: false,
    used: false,
    ...overrides,
  };
}

describe('question report draft', () => {
  it('lists the expected report reasons in order', () => {
    expect(QUESTION_REPORT_REASONS).toEqual([
      'factually_incorrect',
      'ambiguous',
      'unclear',
      'unfair',
      'mismatch',
      'outdated',
      'broken',
      'inappropriate',
      'bad_unfun',
      'other',
    ]);
  });

  it('requires at least one reason and a location before submit', () => {
    expect(canSubmitQuestionReport(draft({ reasons: [], location: 'answer' }))).toBe(false);
    expect(canSubmitQuestionReport(draft({ location: null }))).toBe(false);
    expect(canSubmitQuestionReport(draft())).toBe(true);
  });

  it('requires Other text when Other is selected and ignores it otherwise', () => {
    expect(
      canSubmitQuestionReport(draft({ reasons: ['other'], otherText: '   ' }))
    ).toBe(false);
    expect(
      canSubmitQuestionReport(
        draft({ reasons: ['other'], otherText: 'Asks for an exact YouTube URL' })
      )
    ).toBe(true);
    expect(
      canSubmitQuestionReport(draft({ reasons: ['unclear'], otherText: '   leftover  ' }))
    ).toBe(true);
  });
});

describe('buildQuestionReportPayload', () => {
  it('snapshots ids, prompt, answer, reasons, location, and optional other text', () => {
    const payload = buildQuestionReportPayload(
      draft({
        reasons: ['mismatch', 'other'],
        location: 'both',
        otherText: '  The clue never mentions the answer  ',
      }),
      question(),
      'session-1'
    );

    expect(payload).toEqual({
      questionId: 'cat_science:science:200:0:left',
      canonicalKey: 'science:200:0',
      categoryId: 'cat_science',
      categoryName: 'Science',
      locale: 'en',
      prompt: 'What is the capital of France?',
      answer: 'Paris',
      reasons: ['mismatch', 'other'],
      problemLocation: 'both',
      otherText: 'The clue never mentions the answer',
      sessionId: 'session-1',
    });
  });

  it('omits otherText when Other is not selected', () => {
    const payload = buildQuestionReportPayload(
      draft({ otherText: 'should not ship' }),
      question(),
      'session-1'
    );
    expect(payload.otherText).toBeUndefined();
  });

  it('dedupes reasons and rejects empty drafts', () => {
    expect(() =>
      buildQuestionReportPayload(draft({ reasons: [] }), question(), 'session-1')
    ).toThrow('Select at least one issue');

    const payload = buildQuestionReportPayload(
      draft({
        reasons: ['unclear', 'unclear', 'broken'],
        location: 'answer',
      }),
      question(),
      'session-1'
    );
    expect(payload.reasons).toEqual(['unclear', 'broken']);
  });
});
