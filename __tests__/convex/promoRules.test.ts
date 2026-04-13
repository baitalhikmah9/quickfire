import { describe, expect, it } from '@jest/globals';
import {
  evaluateDuplicateRedemption,
  evaluatePromoRedemption,
  normalizePromoCode,
} from '@/convex/lib/promoRules';

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
});
