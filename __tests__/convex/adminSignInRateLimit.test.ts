import { describe, expect, it } from '@jest/globals';
import {
  ADMIN_SIGN_IN_MAX_FAILURES,
  ADMIN_SIGN_IN_WINDOW_MS,
  evaluateAdminSignInGate,
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
});
