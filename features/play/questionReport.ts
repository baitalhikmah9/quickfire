import type { QuestionCard } from '@/features/shared';

export const QUESTION_REPORT_REASONS = [
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
] as const;

export type QuestionReportReason = (typeof QUESTION_REPORT_REASONS)[number];
export type QuestionReportLocation = 'question' | 'answer' | 'both';

export type QuestionReportDraft = {
  reasons: QuestionReportReason[];
  location: QuestionReportLocation | null;
  otherText: string;
};

export type QuestionReportPayload = {
  questionId: string;
  canonicalKey: string;
  categoryId: string;
  categoryName: string;
  locale: string;
  prompt: string;
  answer: string;
  reasons: QuestionReportReason[];
  problemLocation: QuestionReportLocation;
  otherText?: string;
  sessionId?: string;
};

const REASON_SET = new Set<string>(QUESTION_REPORT_REASONS);

export function isQuestionReportReason(value: string): value is QuestionReportReason {
  return REASON_SET.has(value);
}

function uniqueReasons(reasons: readonly QuestionReportReason[]): QuestionReportReason[] {
  const seen = new Set<QuestionReportReason>();
  const out: QuestionReportReason[] = [];
  for (const reason of reasons) {
    if (!isQuestionReportReason(reason) || seen.has(reason)) continue;
    seen.add(reason);
    out.push(reason);
  }
  return out;
}

export function canSubmitQuestionReport(draft: QuestionReportDraft): boolean {
  const reasons = uniqueReasons(draft.reasons);
  if (reasons.length === 0 || draft.location == null) return false;
  if (reasons.includes('other') && draft.otherText.trim().length === 0) return false;
  return true;
}

export function buildQuestionReportPayload(
  draft: QuestionReportDraft,
  question: QuestionCard,
  sessionId?: string
): QuestionReportPayload {
  const reasons = uniqueReasons(draft.reasons);
  if (reasons.length === 0) {
    throw new Error('Select at least one issue');
  }
  if (draft.location == null) {
    throw new Error('Choose where the problem is');
  }
  const otherText = draft.otherText.trim();
  if (reasons.includes('other') && otherText.length === 0) {
    throw new Error('Describe the issue');
  }

  return {
    questionId: question.id,
    canonicalKey: question.canonicalKey,
    categoryId: question.categoryId,
    categoryName: question.categoryName,
    locale: question.locale,
    prompt: question.prompt,
    answer: question.answer,
    reasons,
    problemLocation: draft.location,
    ...(reasons.includes('other') ? { otherText } : {}),
    ...(sessionId ? { sessionId } : {}),
  };
}
