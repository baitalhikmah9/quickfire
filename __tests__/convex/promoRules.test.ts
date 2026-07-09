import { describe, expect, it } from '@jest/globals';
import {
  evaluatePromoAccountRestriction,
  evaluateDuplicateRedemption,
  evaluatePromoRedemption,
  normalizePromoCode,
} from '@/convex/lib/promoRules';
import {
  PROMO_REDEEM_MAX_ATTEMPTS,
  PROMO_REDEEM_WINDOW_MS,
  appendPromoRedeemAttempt,
  evaluatePromoRedeemRateGate,
  prunePromoRedeemAttempts,
} from '@/convex/lib/promoRedeemRateLimit';

describe('promoRules', () => {
  it('normalizes codes case-insensitively', () => {
    expect(normalizePromoCode('  HELLO  ')).toBe('hello');
  });

  it('fails inactive promos', () => {
    expect(
      evaluatePromoRedemption({
        active: false,
        now: 100,
        usedCount: 0,
        usageCap: 10,
        userRedemptionCount: 0,
        perUserLimit: 1,
      })
    ).toEqual({ ok: false, reason: 'inactive' });
  });

  it('fails expired and not-yet-active windows', () => {
    expect(
      evaluatePromoRedemption({
        active: true,
        now: 50,
        activeFrom: 100,
        usedCount: 0,
        usageCap: 10,
        userRedemptionCount: 0,
        perUserLimit: 1,
      })
    ).toEqual({ ok: false, reason: 'not_yet_active' });

    expect(
      evaluatePromoRedemption({
        active: true,
        now: 200,
        activeTo: 100,
        usedCount: 0,
        usageCap: 10,
        userRedemptionCount: 0,
        perUserLimit: 1,
      })
    ).toEqual({ ok: false, reason: 'expired' });
  });

  it('enforces usage and per-user caps', () => {
    expect(
      evaluatePromoRedemption({
        active: true,
        now: 100,
        usedCount: 5,
        usageCap: 5,
        userRedemptionCount: 0,
        perUserLimit: 1,
      })
    ).toEqual({ ok: false, reason: 'usage_cap' });

    expect(
      evaluatePromoRedemption({
        active: true,
        now: 100,
        usedCount: 0,
        usageCap: 10,
        userRedemptionCount: 2,
        perUserLimit: 2,
      })
    ).toEqual({ ok: false, reason: 'per_user_cap' });
  });

  it('flags duplicate redemption attempts', () => {
    expect(evaluateDuplicateRedemption(true)).toEqual({ ok: false, reason: 'already_redeemed' });
    expect(evaluateDuplicateRedemption(false)).toEqual({ ok: true });
  });

  it('rejects account-restricted promos for the wrong user', () => {
    expect(
      evaluatePromoAccountRestriction({
        redemptionScope: 'account',
        restrictedToUserId: 'user_allowed',
        currentUserId: 'user_denied',
      })
    ).toEqual({ ok: false, reason: 'account_restricted' });
  });

  it('accepts account-restricted promos for the selected user', () => {
    expect(
      evaluatePromoAccountRestriction({
        redemptionScope: 'account',
        restrictedToUserId: 'user_allowed',
        currentUserId: 'user_allowed',
      })
    ).toEqual({ ok: true });
  });

  it('accepts public promos without an account restriction', () => {
    expect(
      evaluatePromoAccountRestriction({
        redemptionScope: 'public',
        currentUserId: 'user_any',
      })
    ).toEqual({ ok: true });
  });

  it('rejects when restrictedToPurchaserAccountId does not match', () => {
    expect(
      evaluatePromoAccountRestriction({
        redemptionScope: 'account',
        restrictedToUserId: 'user_allowed',
        restrictedToPurchaserAccountId: 'purchaser_allowed',
        currentUserId: 'user_allowed',
        currentPurchaserAccountId: 'purchaser_other',
      })
    ).toEqual({ ok: false, reason: 'account_restricted' });
  });

  it('accepts when restrictedToPurchaserAccountId matches', () => {
    expect(
      evaluatePromoAccountRestriction({
        redemptionScope: 'account',
        restrictedToUserId: 'user_allowed',
        restrictedToPurchaserAccountId: 'purchaser_allowed',
        currentUserId: 'user_allowed',
        currentPurchaserAccountId: 'purchaser_allowed',
      })
    ).toEqual({ ok: true });
  });

  it('enforces purchaser restriction even when user id matches public scope with purchaser pin', () => {
    // If an admin stored restrictedToPurchaserAccountId, enforce it regardless of scope.
    expect(
      evaluatePromoAccountRestriction({
        redemptionScope: 'public',
        restrictedToPurchaserAccountId: 'purchaser_allowed',
        currentUserId: 'user_any',
        currentPurchaserAccountId: 'purchaser_other',
      })
    ).toEqual({ ok: false, reason: 'account_restricted' });
  });
});

describe('promoRedeemRateLimit', () => {
  it('prunes attempts older than the window', () => {
    const now = 1_700_000_000_000;
    const fresh = now - 1000;
    const stale = now - PROMO_REDEEM_WINDOW_MS - 1;
    expect(prunePromoRedeemAttempts([stale, fresh], now)).toEqual([fresh]);
  });

  it('allows redeem attempts under the cap', () => {
    const now = 1_700_000_000_000;
    const gate = evaluatePromoRedeemRateGate([now - 1000], now);
    expect(gate.allowed).toBe(true);
  });

  it('blocks after max failed attempts in the window', () => {
    const now = 1_700_000_000_000;
    const attempts = Array.from({ length: PROMO_REDEEM_MAX_ATTEMPTS }, (_, i) => now - 1000 * (i + 1));
    const pruned = prunePromoRedeemAttempts(attempts, now);
    const gate = evaluatePromoRedeemRateGate(pruned, now);
    expect(gate.allowed).toBe(false);
    if (!gate.allowed) {
      expect(gate.retryAfterMs).toBeGreaterThan(0);
    }
  });

  it('appends attempts and caps stored length', () => {
    const now = 1_700_000_000_000;
    const many = Array.from({ length: PROMO_REDEEM_MAX_ATTEMPTS }, (_, i) => now - 1000 * (i + 1));
    const result = appendPromoRedeemAttempt(many.slice(1), now);
    expect(result.recorded).toBe(true);
    expect(result.next.length).toBeLessThanOrEqual(PROMO_REDEEM_MAX_ATTEMPTS);
    expect(result.next[result.next.length - 1]).toBe(now);
  });

  it('does not append once already rate-limited', () => {
    const now = 1_700_000_000_000;
    const locked = Array.from({ length: PROMO_REDEEM_MAX_ATTEMPTS }, (_, i) => now - 1000 * (i + 1)).sort(
      (a, b) => a - b
    );
    const result = appendPromoRedeemAttempt(locked, now);
    expect(result.recorded).toBe(false);
    expect(result.next).toEqual(locked);
  });
});
