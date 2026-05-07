/** Sliding-window limits for admin password sign-in (web-only UI; enforced server-side). */

export const ADMIN_SIGN_IN_WINDOW_MS = 60 * 60 * 1000;
export const ADMIN_SIGN_IN_MAX_FAILURES = 3;
export const ADMIN_SIGN_IN_IDENTIFIER_MAX_LEN = 320;

export function normalizeAdminSignInIdentifier(raw: string): string {
  return raw.trim().toLowerCase();
}

export function pruneFailureTimestamps(timestamps: readonly number[], nowMs: number): number[] {
  const cutoff = nowMs - ADMIN_SIGN_IN_WINDOW_MS;
  return timestamps.filter((t) => t > cutoff).sort((a, b) => a - b);
}

export type AdminSignInGateResult =
  | { allowed: true; failuresInWindow: number }
  | { allowed: false; failuresInWindow: number; retryAfterMs: number };

export function evaluateAdminSignInGate(
  prunedTimestamps: readonly number[],
  nowMs: number
): AdminSignInGateResult {
  const failuresInWindow = prunedTimestamps.length;
  if (failuresInWindow < ADMIN_SIGN_IN_MAX_FAILURES) {
    return { allowed: true, failuresInWindow };
  }
  const oldest = prunedTimestamps[0];
  if (oldest === undefined) {
    return { allowed: true, failuresInWindow: 0 };
  }
  const retryAfterMs = Math.max(0, oldest + ADMIN_SIGN_IN_WINDOW_MS - nowMs);
  return { allowed: false, failuresInWindow, retryAfterMs };
}
