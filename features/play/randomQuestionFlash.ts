/** Bright green used for random-pick flash / lock on the question board. */
export const RANDOM_FLASH_GREEN = '#22C55E';
export const RANDOM_FLASH_GREEN_TEXT = '#FFFFFF';

/** How many discrete green flashes run before the final tile stays solid. */
export const RANDOM_FLASH_COUNT = 7;

/** On-duration for each intermediate flash (~⅓ second). */
export const RANDOM_FLASH_ON_MS = 300;

/** Brief gap between flashes so the previous tile clearly turns off. */
export const RANDOM_FLASH_OFF_MS = 100;

export type RandomPickMode = 'random' | 'wager';

/**
 * Builds a flash sequence over remaining board question ids.
 * Intermediate steps pick from the remaining pool (avoiding consecutive repeats when possible).
 * The final entry is always `finalId` — the already-chosen outcome that stays solid after the run.
 */
export function buildRandomFlashSequence(
  remainingIds: readonly string[],
  finalId: string,
  options?: {
    flashCount?: number;
    random?: () => number;
  }
): string[] {
  const flashCount = Math.max(1, options?.flashCount ?? RANDOM_FLASH_COUNT);
  const random = options?.random ?? Math.random;

  const pool = [...new Set(remainingIds.filter(Boolean))];
  if (finalId && !pool.includes(finalId)) {
    pool.push(finalId);
  }
  if (pool.length === 0) {
    return [];
  }

  const sequence: string[] = [];
  for (let step = 0; step < flashCount - 1; step++) {
    let candidates = pool;
    if (pool.length > 1 && sequence.length > 0) {
      const previous = sequence[sequence.length - 1];
      candidates = pool.filter((id) => id !== previous);
    }
    const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length));
    sequence.push(candidates[index]!);
  }
  sequence.push(finalId);
  return sequence;
}
