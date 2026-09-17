import { describe, expect, it } from '@jest/globals';
import {
  REFERRAL_REWARD_TOKENS,
  buildReferralCodeFromSeed,
  evaluateReferralApply,
  isValidReferralCodeFormat,
  normalizeReferralCode,
} from '@/convex/lib/referralRules';

describe('referralRules', () => {
  it('normalizes codes to uppercase alphanumerics', () => {
    expect(normalizeReferralCode('  ab-cd 12 ')).toBe('ABCD12');
  });

  it('builds a stable 8-char code from a seed', () => {
    const a = buildReferralCodeFromSeed([1, 2, 3]);
    const b = buildReferralCodeFromSeed([1, 2, 3]);
    expect(a).toHaveLength(8);
    expect(a).toBe(b);
    expect(isValidReferralCodeFormat(a)).toBe(true);
  });

  it('rewards 10 tokens', () => {
    expect(REFERRAL_REWARD_TOKENS).toBe(10);
  });

  it('rejects empty, self, already redeemed, and played accounts', () => {
    expect(
      evaluateReferralApply({
        normalizedCode: '',
        inviterFound: false,
        isSelf: false,
        alreadyRedeemed: false,
        hasPlayed: false,
      })
    ).toEqual({ ok: false, reason: 'empty_code' });

    expect(
      evaluateReferralApply({
        normalizedCode: 'ABCDEFGH',
        inviterFound: true,
        isSelf: true,
        alreadyRedeemed: false,
        hasPlayed: false,
      })
    ).toEqual({ ok: false, reason: 'self_referral' });

    expect(
      evaluateReferralApply({
        normalizedCode: 'ABCDEFGH',
        inviterFound: true,
        isSelf: false,
        alreadyRedeemed: true,
        hasPlayed: false,
      })
    ).toEqual({ ok: false, reason: 'already_redeemed' });

    expect(
      evaluateReferralApply({
        normalizedCode: 'ABCDEFGH',
        inviterFound: true,
        isSelf: false,
        alreadyRedeemed: false,
        hasPlayed: true,
      })
    ).toEqual({ ok: false, reason: 'not_new_account' });
  });

  it('accepts a valid new-account apply', () => {
    expect(
      evaluateReferralApply({
        normalizedCode: 'ABCDEFGH',
        inviterFound: true,
        isSelf: false,
        alreadyRedeemed: false,
        hasPlayed: false,
      })
    ).toEqual({ ok: true });
  });
});
