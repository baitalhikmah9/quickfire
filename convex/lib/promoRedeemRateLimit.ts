/**
 * Per-user sliding window for promo code redemption attempts.
 * Limits code enumeration by signed-in users hammering redeemCode.
 */

export const PROMO_REDEEM_WINDOW_MS = 60 * 60 * 1000;
export const PROMO_REDEEM_MAX_ATTEMPTS = 20;

export function prunePromoRedeemAttempts(timestamps: readonly number[], nowMs: number): number[] {
  const cutoff = nowMs - PROMO_REDEEM_WINDOW_MS;
  return timestamps.filter((t) => t > cutoff).sort((a, b) => a - b);
}

export type PromoRedeemRateGate =
  | { allowed: true; attemptsInWindow: number }
  | { allowed: false; attemptsInWindow: number; retryAfterMs: number };

export function evaluatePromoRedeemRateGate(
  prunedTimestamps: readonly number[],
  nowMs: number
): PromoRedeemRateGate {
  const attemptsInWindow = prunedTimestamps.length;
  if (attemptsInWindow < PROMO_REDEEM_MAX_ATTEMPTS) {
    return { allowed: true, attemptsInWindow };
  }
  const oldest = prunedTimestamps[0];
  if (oldest === undefined) {
    return { allowed: true, attemptsInWindow: 0 };
  }
  const retryAfterMs = Math.max(0, oldest + PROMO_REDEEM_WINDOW_MS - nowMs);
  return { allowed: false, attemptsInWindow, retryAfterMs };
}

/**
 * Record a failed (or enumeration) attempt. Does not append when already limited
 * so the window cannot be extended indefinitely.
 */
export function appendPromoRedeemAttempt(
  prunedTimestamps: readonly number[],
  nowMs: number
): { next: number[]; recorded: boolean } {
  if (prunedTimestamps.length >= PROMO_REDEEM_MAX_ATTEMPTS) {
    return {
      next: prunedTimestamps.slice(0, PROMO_REDEEM_MAX_ATTEMPTS),
      recorded: false,
    };
  }
  const next = [...prunedTimestamps, nowMs].slice(-PROMO_REDEEM_MAX_ATTEMPTS);
  return { next, recorded: true };
}
