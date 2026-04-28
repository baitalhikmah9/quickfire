import type { GameSessionState, QuestionCard } from '@/features/shared';

export const RUMBLE_FIRST_TEAM_REVEAL_SECONDS = 31;
export const RUMBLE_TRANSITION_SECONDS = 61;
export const RUMBLE_SECOND_TEAM_REVEAL_SECONDS = 76;
export const RUMBLE_ROUND_END_SECONDS = 90;

export const RUMBLE_VALUE_BUCKETS = [100, 200, 300] as const;
export type RumbleValueBucket = (typeof RUMBLE_VALUE_BUCKETS)[number];

export type RumbleRevealResult =
  | { ok: true }
  | { ok: false; error: string };

export function getRumbleElapsedSeconds(
  timerStartedAt: number | undefined,
  now: number = Date.now()
): number {
  if (timerStartedAt === undefined) return 0;
  return Math.max(0, Math.floor((now - timerStartedAt) / 1000));
}

export function canRevealRumbleAnswer(
  session: Pick<GameSessionState, 'mode' | 'timerStartedAt'>,
  now: number = Date.now()
): RumbleRevealResult {
  if (session.mode !== 'rumble') return { ok: true };

  const elapsedSeconds = getRumbleElapsedSeconds(session.timerStartedAt, now);
  if (elapsedSeconds < RUMBLE_SECOND_TEAM_REVEAL_SECONDS) {
    return {
      ok: false,
      error: 'The second Rumble team has not been revealed yet.',
    };
  }

  if (elapsedSeconds >= RUMBLE_ROUND_END_SECONDS) {
    return {
      ok: false,
      error: 'The Rumble round has ended.',
    };
  }

  return { ok: true };
}

export function groupRumbleQuestionsByValueBucket(
  board: QuestionCard[]
): Map<RumbleValueBucket, QuestionCard[]> | null {
  const pointValues = Array.from(new Set(board.map((question) => question.pointValue))).sort(
    (a, b) => a - b
  );

  if (pointValues.length !== RUMBLE_VALUE_BUCKETS.length) {
    return null;
  }

  const valueToBucket = new Map<number, RumbleValueBucket>();
  pointValues.forEach((pointValue, index) => {
    valueToBucket.set(pointValue, RUMBLE_VALUE_BUCKETS[index]!);
  });

  const grouped = new Map<RumbleValueBucket, QuestionCard[]>(
    RUMBLE_VALUE_BUCKETS.map((bucket) => [bucket, []])
  );

  for (const question of board) {
    const bucket = valueToBucket.get(question.pointValue);
    if (!bucket) return null;
    grouped.get(bucket)!.push(question);
  }

  return grouped;
}
