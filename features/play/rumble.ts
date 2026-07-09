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

  return { ok: true };
}

/** Party-window phases for the dual team chips on the question header. */
export type RumblePartyPhase =
  | 'waiting'
  | 'firstAnswering'
  | 'transition'
  | 'secondAnswering'
  | 'ended';

export type RumblePartyActiveSlot = 'first' | 'second' | null;

export type RumblePartySlots = {
  firstRevealed: boolean;
  secondRevealed: boolean;
  activeSlot: RumblePartyActiveSlot;
};

export function getRumblePartyPhase(elapsedSeconds: number): RumblePartyPhase {
  const sec = Number.isFinite(elapsedSeconds) ? Math.max(0, Math.floor(elapsedSeconds)) : 0;
  if (sec >= RUMBLE_ROUND_END_SECONDS) return 'ended';
  if (sec >= RUMBLE_SECOND_TEAM_REVEAL_SECONDS) return 'secondAnswering';
  if (sec >= RUMBLE_TRANSITION_SECONDS) return 'transition';
  if (sec >= RUMBLE_FIRST_TEAM_REVEAL_SECONDS) return 'firstAnswering';
  return 'waiting';
}

export function getRumblePartySlots(elapsedSeconds: number): RumblePartySlots {
  const phase = getRumblePartyPhase(elapsedSeconds);
  switch (phase) {
    case 'waiting':
      return { firstRevealed: false, secondRevealed: false, activeSlot: null };
    case 'firstAnswering':
      return { firstRevealed: true, secondRevealed: false, activeSlot: 'first' };
    case 'transition':
      return { firstRevealed: true, secondRevealed: false, activeSlot: null };
    case 'secondAnswering':
      return { firstRevealed: true, secondRevealed: true, activeSlot: 'second' };
    case 'ended':
      return { firstRevealed: true, secondRevealed: true, activeSlot: null };
  }
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
