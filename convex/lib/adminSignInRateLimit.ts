/**
 * Sliding-window limits for admin password sign-in (web-only UI).
 *
 * Defense-in-depth only: the sign-in form calls these Convex mutations around
 * Clerk's password API. An attacker who talks to Clerk directly bypasses this
 * limiter - real brute-force protection is Clerk's built-in attempt lockout
 * (verify enabled in the Clerk dashboard). Caps below limit unauthenticated
 * lockout/storage DoS against this advisory layer.
 */

export const ADMIN_SIGN_IN_WINDOW_MS = 60 * 60 * 1000;
export const ADMIN_SIGN_IN_MAX_FAILURES = 3;
/** Max timestamps kept per identifier (equals lock threshold; prevents array growth). */
export const ADMIN_SIGN_IN_MAX_STORED_FAILURES = ADMIN_SIGN_IN_MAX_FAILURES;
/** Max distinct identifier rows (unauthenticated callers cannot fill storage forever). */
export const ADMIN_SIGN_IN_MAX_IDENTIFIER_ROWS = 5_000;
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

/**
 * Append a failure timestamp if under the lock threshold.
 * When already at max failures, does not append so lockout cannot be extended forever
 * and the stored array cannot grow unbounded.
 */
export function appendFailureTimestamp(
  prunedTimestamps: readonly number[],
  nowMs: number
): { next: number[]; recorded: boolean } {
  if (prunedTimestamps.length >= ADMIN_SIGN_IN_MAX_FAILURES) {
    return {
      next: prunedTimestamps.slice(0, ADMIN_SIGN_IN_MAX_STORED_FAILURES),
      recorded: false,
    };
  }
  const next = [...prunedTimestamps, nowMs].slice(-ADMIN_SIGN_IN_MAX_STORED_FAILURES);
  return { next, recorded: true };
}

/** Whether a new distinct identifier row may be inserted (existing rows may still update). */
export function canInsertNewRateLimitRow(existingRowCount: number): boolean {
  return existingRowCount < ADMIN_SIGN_IN_MAX_IDENTIFIER_ROWS;
}

/** Claims from Convex `UserIdentity` used to bind rate-limit clears to the signed-in user. */
export type AdminSignInIdentityClaims = {
  subject: string;
  email?: string | null;
  preferredUsername?: string | null;
  /** @deprecated Not used for matching - user-editable display claims must not unlock others. */
  nickname?: string | null;
  /** @deprecated Not used for matching - user-editable display claims must not unlock others. */
  name?: string | null;
};

/**
 * Stable identity keys that may match the sign-in identifier.
 * Only email, preferredUsername, and subject - not editable display name/nickname.
 */
export function identityKeysForAdminSignInClear(
  identity: AdminSignInIdentityClaims
): string[] {
  const raw = [identity.email, identity.preferredUsername, identity.subject];
  const keys = new Set<string>();
  for (const value of raw) {
    if (!value) continue;
    const key = normalizeAdminSignInIdentifier(value);
    if (key) keys.add(key);
  }
  return [...keys];
}

/**
 * Whether the authenticated principal may clear rate-limit failures for `identifierKey`.
 * - Claim match: identifier equals email / preferred username / subject
 * - Admin fallback: existing admin profile may clear (username logins often omit username from JWT)
 */
export function canClearAdminSignInFailures(
  identityKeys: readonly string[],
  identifierKey: string,
  options?: { isAdmin?: boolean }
): boolean {
  if (identityKeys.includes(identifierKey)) return true;
  return options?.isAdmin === true;
}
