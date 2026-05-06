import { describe, expect, it } from '@jest/globals';
import {
  derivePromoCodeStatus,
  validateCreatePromoCodeArgs,
  validateUpdatePromoCodeArgs,
  validateWalletAdjustment,
} from '@/convex/lib/adminValidation';

describe('adminValidation', () => {
  describe('derivePromoCodeStatus', () => {
    it('returns active when promo is active, within window, and under cap', () => {
      expect(
        derivePromoCodeStatus({
          active: true,
          activeFrom: 100,
          activeTo: 500,
          usedCount: 3,
          usageCap: 10,
        }, 200)
      ).toBe('active');
    });

    it('returns inactive when active is false', () => {
      expect(
        derivePromoCodeStatus({
          active: false,
          usedCount: 0,
          usageCap: 10,
        }, 200)
      ).toBe('inactive');
    });

    it('returns scheduled when now is before activeFrom', () => {
      expect(
        derivePromoCodeStatus({
          active: true,
          activeFrom: 500,
          usedCount: 0,
          usageCap: 10,
        }, 200)
      ).toBe('scheduled');
    });

    it('returns expired when now is after activeTo', () => {
      expect(
        derivePromoCodeStatus({
          active: true,
          activeTo: 100,
          usedCount: 0,
          usageCap: 10,
        }, 200)
      ).toBe('expired');
    });

    it('returns exhausted when usedCount >= usageCap', () => {
      expect(
        derivePromoCodeStatus({
          active: true,
          usedCount: 10,
          usageCap: 10,
        }, 200)
      ).toBe('exhausted');
    });
  });

  describe('validateCreatePromoCodeArgs', () => {
    it('accepts valid args', () => {
      expect(
        validateCreatePromoCodeArgs({
          normalizedCode: 'welcome2024',
          rewardAmount: 10,
          usageCap: 100,
        })
      ).toEqual({ ok: true });
    });

    it('rejects empty code', () => {
      expect(
        validateCreatePromoCodeArgs({
          normalizedCode: '',
          rewardAmount: 10,
          usageCap: 100,
        })
      ).toEqual({ ok: false, reason: 'code_required' });
    });

    it('rejects zero reward amount', () => {
      expect(
        validateCreatePromoCodeArgs({
          normalizedCode: 'test',
          rewardAmount: 0,
          usageCap: 100,
        })
      ).toEqual({ ok: false, reason: 'reward_amount_positive' });
    });

    it('rejects negative reward amount', () => {
      expect(
        validateCreatePromoCodeArgs({
          normalizedCode: 'test',
          rewardAmount: -5,
          usageCap: 100,
        })
      ).toEqual({ ok: false, reason: 'reward_amount_positive' });
    });

    it('rejects negative usage cap', () => {
      expect(
        validateCreatePromoCodeArgs({
          normalizedCode: 'test',
          rewardAmount: 10,
          usageCap: -1,
        })
      ).toEqual({ ok: false, reason: 'usage_cap_nonnegative' });
    });
  });

  describe('validateUpdatePromoCodeArgs', () => {
    it('accepts valid updates', () => {
      expect(
        validateUpdatePromoCodeArgs(
          { usedCount: 3, rewardAmount: 10 },
          { usageCap: 5 }
        )
      ).toEqual({ ok: true });
    });

    it('rejects lowering usageCap below usedCount', () => {
      expect(
        validateUpdatePromoCodeArgs(
          { usedCount: 5, rewardAmount: 10 },
          { usageCap: 3 }
        )
      ).toEqual({ ok: false, reason: 'usage_cap_below_used' });
    });

    it('rejects changing rewardAmount after redemption', () => {
      expect(
        validateUpdatePromoCodeArgs(
          { usedCount: 1, rewardAmount: 10 },
          { rewardAmount: 20 }
        )
      ).toEqual({ ok: false, reason: 'reward_amount_locked' });
    });

    it('allows changing rewardAmount when no redemptions exist', () => {
      expect(
        validateUpdatePromoCodeArgs(
          { usedCount: 0, rewardAmount: 10 },
          { rewardAmount: 20 }
        )
      ).toEqual({ ok: true });
    });
  });

  describe('validateWalletAdjustment', () => {
    it('accepts a valid grant', () => {
      expect(
        validateWalletAdjustment({
          currentBalance: 10,
          amount: 5,
          reason: 'compensation',
        })
      ).toEqual({ ok: true });
    });

    it('accepts a valid debit with sufficient balance', () => {
      expect(
        validateWalletAdjustment({
          currentBalance: 10,
          amount: -5,
          reason: 'correction',
        })
      ).toEqual({ ok: true });
    });

    it('rejects zero amount', () => {
      expect(
        validateWalletAdjustment({
          currentBalance: 10,
          amount: 0,
          reason: 'test',
        })
      ).toEqual({ ok: false, reason: 'amount_nonzero' });
    });

    it('rejects empty reason', () => {
      expect(
        validateWalletAdjustment({
          currentBalance: 10,
          amount: 5,
          reason: '',
        })
      ).toEqual({ ok: false, reason: 'reason_required' });
    });

    it('rejects debit that would make balance negative', () => {
      expect(
        validateWalletAdjustment({
          currentBalance: 3,
          amount: -5,
          reason: 'refund',
        })
      ).toEqual({ ok: false, reason: 'insufficient_balance' });
    });
  });
});
