import { describe, expect, it } from '@jest/globals';
import {
  ADMIN_SIGN_IN_MAX_FAILURES,
  ADMIN_SIGN_IN_MAX_IDENTIFIER_ROWS,
  ADMIN_SIGN_IN_MAX_STORED_FAILURES,
  ADMIN_SIGN_IN_WINDOW_MS,
  appendFailureTimestamp,
  canClearAdminSignInFailures,
  canInsertNewRateLimitRow,
  evaluateAdminSignInGate,
  identityKeysForAdminSignInClear,
  normalizeAdminSignInIdentifier,
  pruneFailureTimestamps,
} from '@/convex/lib/adminSignInRateLimit';

describe('adminSignInRateLimit', () => {
  it('normalizes identifier', () => {
    expect(normalizeAdminSignInIdentifier('  Admin@Test.COM \t')).toBe('admin@test.com');
  });

  it('prunes timestamps older than the window', () => {
    const now = 1_700_000_000_000;
    const fresh = now - 1000;
    const stale = now - ADMIN_SIGN_IN_WINDOW_MS - 1;
    expect(pruneFailureTimestamps([stale, fresh], now)).toEqual([fresh]);
  });

  it('allows sign-in when failures are below the cap', () => {
    const now = 1_700_000_000_000;
    const ts = [now - 1000, now - 2000];
    const pruned = pruneFailureTimestamps(ts, now);
    expect(pruned.length).toBeLessThan(ADMIN_SIGN_IN_MAX_FAILURES);
    expect(evaluateAdminSignInGate(pruned, now).allowed).toBe(true);
  });

  it('blocks after three failures in the window', () => {
    const now = 1_700_000_000_000;
    const ts = [now - 3000, now - 2000, now - 1000];
    const pruned = pruneFailureTimestamps(ts, now);
    expect(pruned.length).toBe(ADMIN_SIGN_IN_MAX_FAILURES);
    const gate = evaluateAdminSignInGate(pruned, now);
    expect(gate.allowed).toBe(false);
    if (!gate.allowed) {
      expect(gate.retryAfterMs).toBeGreaterThanOrEqual(0);
      expect(gate.retryAfterMs).toBeLessThanOrEqual(ADMIN_SIGN_IN_WINDOW_MS);
    }
  });

  describe('appendFailureTimestamp (DoS mitigations)', () => {
    it('records a failure when under the cap', () => {
      const now = 1_700_000_000_000;
      const result = appendFailureTimestamp([now - 2000, now - 1000], now);
      expect(result.recorded).toBe(true);
      expect(result.next).toEqual([now - 2000, now - 1000, now]);
    });

    it('does not append once the failure cap is reached (prevents lockout extension)', () => {
      const now = 1_700_000_000_000;
      const locked = [now - 3000, now - 2000, now - 1000];
      const result = appendFailureTimestamp(locked, now);
      expect(result.recorded).toBe(false);
      expect(result.next).toEqual(locked);
      // Oldest stays fixed so retryAfterMs does not slide forward forever
      expect(evaluateAdminSignInGate(result.next, now).allowed).toBe(false);
      if (!evaluateAdminSignInGate(result.next, now).allowed) {
        const gate = evaluateAdminSignInGate(result.next, now);
        if (!gate.allowed) {
          expect(gate.retryAfterMs).toBe(locked[0]! + ADMIN_SIGN_IN_WINDOW_MS - now);
        }
      }
    });

    it('caps stored failure array length', () => {
      const now = 1_700_000_000_000;
      const oversized = Array.from({ length: ADMIN_SIGN_IN_MAX_STORED_FAILURES + 5 }, (_, i) => now - 10_000 + i);
      const result = appendFailureTimestamp(oversized.slice(0, ADMIN_SIGN_IN_MAX_FAILURES - 1), now);
      expect(result.next.length).toBeLessThanOrEqual(ADMIN_SIGN_IN_MAX_STORED_FAILURES);
    });
  });

  describe('identifier row cap', () => {
    it('allows inserts under the distinct-row budget', () => {
      expect(canInsertNewRateLimitRow(0)).toBe(true);
      expect(canInsertNewRateLimitRow(ADMIN_SIGN_IN_MAX_IDENTIFIER_ROWS - 1)).toBe(true);
    });

    it('rejects new identifier rows at the budget', () => {
      expect(canInsertNewRateLimitRow(ADMIN_SIGN_IN_MAX_IDENTIFIER_ROWS)).toBe(false);
      expect(canInsertNewRateLimitRow(ADMIN_SIGN_IN_MAX_IDENTIFIER_ROWS + 10)).toBe(false);
    });
  });

  describe('clearFailures authorization', () => {
    it('collects only stable identity keys (email, preferredUsername, subject)', () => {
      const keys = identityKeysForAdminSignInClear({
        subject: 'user_abc',
        email: '  Admin@Example.com ',
        preferredUsername: 'Operator',
        nickname: 'admin@example.com',
        name: 'admin@victim.com',
      });
      expect(keys).toEqual(expect.arrayContaining(['admin@example.com', 'operator', 'user_abc']));
      expect(keys).not.toContain('admin@victim.com');
      // nickname must not be treated as a claim match (user-editable)
      expect(keys).toHaveLength(3);
    });

    it('does not include editable name/nickname claims that could unlock others', () => {
      const keys = identityKeysForAdminSignInClear({
        subject: 'user_abc',
        email: 'player@example.com',
        nickname: 'locked-admin@example.com',
        name: 'locked-admin@example.com',
      });
      expect(canClearAdminSignInFailures(keys, 'locked-admin@example.com')).toBe(false);
      expect(canClearAdminSignInFailures(keys, 'player@example.com')).toBe(true);
    });

    it('allows clear when identifier matches an identity claim', () => {
      const keys = identityKeysForAdminSignInClear({
        subject: 'user_abc',
        email: 'admin@example.com',
        preferredUsername: 'operator',
      });
      expect(canClearAdminSignInFailures(keys, 'operator')).toBe(true);
      expect(canClearAdminSignInFailures(keys, 'admin@example.com')).toBe(true);
      expect(canClearAdminSignInFailures(keys, 'other')).toBe(false);
    });

    it('allows clear for admins even when username is absent from JWT claims', () => {
      const keys = identityKeysForAdminSignInClear({
        subject: 'user_abc',
        email: 'admin@example.com',
      });
      expect(canClearAdminSignInFailures(keys, 'operator', { isAdmin: true })).toBe(true);
      expect(canClearAdminSignInFailures(keys, 'operator', { isAdmin: false })).toBe(false);
    });
  });
});
