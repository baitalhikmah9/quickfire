import { describe, expect, it } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import {
  applyPromoCodeUpdate,
  derivePromoModeDefaults,
  derivePromoCodeStatus,
  validateCreatePromoCodeArgs,
  validateUpdatePromoCodeArgs,
  validateWalletAdjustment,
} from '@/convex/lib/adminValidation';
import {
  WALLET_TRANSACTION_SOURCES,
  WALLET_TRANSACTION_TYPES,
} from '@/convex/lib/walletTransactionTypes';

describe('adminValidation', () => {
  describe('derivePromoModeDefaults', () => {
    it('derives defaults for public single-use coupons', () => {
      expect(derivePromoModeDefaults({ mode: 'public_single_use' })).toEqual({
        ok: true,
        usageCap: 1,
        perUserLimit: 1,
        redemptionScope: 'public',
      });
    });

    it('derives defaults for public multi-use coupons', () => {
      expect(derivePromoModeDefaults({ mode: 'public_multi_use', requestedUsageCap: 25 })).toEqual({
        ok: true,
        usageCap: 25,
        perUserLimit: 1,
        redemptionScope: 'public',
      });
    });

    it('derives defaults for account single-use coupons', () => {
      expect(
        derivePromoModeDefaults({
          mode: 'account_single_use',
          restrictedToUserId: 'user_123',
        })
      ).toEqual({
        ok: true,
        usageCap: 1,
        perUserLimit: 1,
        redemptionScope: 'account',
      });
    });

    it('derives defaults for account multi-use coupons', () => {
      expect(
        derivePromoModeDefaults({
          mode: 'account_multi_use',
          requestedUsageCap: 4,
          restrictedToUserId: 'user_123',
        })
      ).toEqual({
        ok: true,
        usageCap: 4,
        perUserLimit: 4,
        redemptionScope: 'account',
      });
    });

    it('rejects account modes without a restricted user', () => {
      expect(derivePromoModeDefaults({ mode: 'account_single_use' })).toEqual({
        ok: false,
        reason: 'restricted_user_required',
      });
    });

    it('rejects public modes with a restricted user', () => {
      expect(
        derivePromoModeDefaults({
          mode: 'public_single_use',
          restrictedToUserId: 'user_123',
        })
      ).toEqual({ ok: false, reason: 'restricted_user_not_allowed' });
    });

    it('rejects multi-use modes without a non-negative cap', () => {
      expect(derivePromoModeDefaults({ mode: 'public_multi_use' })).toEqual({
        ok: false,
        reason: 'usage_cap_positive',
      });
      expect(
        derivePromoModeDefaults({
          mode: 'account_multi_use',
          requestedUsageCap: -1,
          restrictedToUserId: 'user_123',
        })
      ).toEqual({ ok: false, reason: 'usage_cap_positive' });
    });

    // SAFETY: Test fixture / double boundary cast justified by controlled test setup.
    it('treats usage cap 0 as unlimited for multi-use modes', () => {
      expect(
        derivePromoModeDefaults({
          mode: 'public_multi_use',
          requestedUsageCap: 0,
        })
      ).toEqual({
        ok: true,
        usageCap: 0,
        perUserLimit: 1,
        redemptionScope: 'public',
      });
    });
  });

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

    it('does not exhaust unlimited codes', () => {
      expect(
        derivePromoCodeStatus({
          active: true,
          usedCount: 10_000,
          usageCap: 0,
        }, 200)
      ).toBe('active');
    });
  });

  describe('validateCreatePromoCodeArgs', () => {
    it('accepts valid args', () => {
      expect(
        validateCreatePromoCodeArgs({
          normalizedCode: 'welcome2024',
          rewardAmount: 10,
          usageCap: 100,
          mode: 'public_multi_use',
        })
      ).toEqual({ ok: true });
    });

    it('rejects empty code', () => {
      expect(
        validateCreatePromoCodeArgs({
          normalizedCode: '',
          rewardAmount: 10,
          usageCap: 100,
          mode: 'public_multi_use',
        })
      ).toEqual({ ok: false, reason: 'code_required' });
    });

    it('rejects zero reward amount', () => {
      expect(
        validateCreatePromoCodeArgs({
          normalizedCode: 'test',
          rewardAmount: 0,
          usageCap: 100,
          mode: 'public_multi_use',
        })
      ).toEqual({ ok: false, reason: 'reward_amount_positive' });
    });

    it('rejects negative reward amount', () => {
      expect(
        validateCreatePromoCodeArgs({
          normalizedCode: 'test',
          rewardAmount: -5,
          usageCap: 100,
          mode: 'public_multi_use',
        })
      ).toEqual({ ok: false, reason: 'reward_amount_positive' });
    });

    it('rejects fractional reward amounts', () => {
      expect(
        validateCreatePromoCodeArgs({
          normalizedCode: 'test',
          rewardAmount: 1.5,
          usageCap: 100,
          mode: 'public_multi_use',
        })
      ).toEqual({ ok: false, reason: 'reward_amount_integer' });
    });

    it('rejects negative usage cap', () => {
      expect(
        validateCreatePromoCodeArgs({
          normalizedCode: 'test',
          rewardAmount: 10,
          usageCap: -1,
          mode: 'public_multi_use',
        })
      ).toEqual({ ok: false, reason: 'usage_cap_nonnegative' });
    });

    it('accepts unlimited usage cap 0', () => {
      expect(
        validateCreatePromoCodeArgs({
          normalizedCode: 'mikhail10',
          rewardAmount: 20,
          usageCap: 0,
          mode: 'public_multi_use',
        })
      ).toEqual({ ok: true });
    });

    it('accepts a bundle discount code', () => {
      expect(
        validateCreatePromoCodeArgs({
          normalizedCode: 'bundle20off',
          rawCode: 'BUNDLE20OFF',
          rewardAmount: 0,
          usageCap: 0,
          rewardType: 'discount',
          discountPercent: 20,
          productKey: 'web_bundle_100',
        })
      ).toEqual({ ok: true });
    });

    it('rejects a discount without a known bundle', () => {
      expect(
        validateCreatePromoCodeArgs({
          normalizedCode: 'bundle20off',
          rawCode: 'BUNDLE20OFF',
          rewardAmount: 0,
          usageCap: 0,
          rewardType: 'discount',
          discountPercent: 20,
          productKey: 'web_bundle_5',
        })
      ).toEqual({ ok: false, reason: 'product_key_invalid' });
    });

    it('rejects a discount code with invalid characters', () => {
      expect(
        validateCreatePromoCodeArgs({
          normalizedCode: 'bundle 20 off',
          rawCode: 'BUNDLE 20 OFF',
          rewardAmount: 0,
          usageCap: 0,
          rewardType: 'discount',
          discountPercent: 20,
          productKey: 'web_bundle_100',
        })
      ).toEqual({ ok: false, reason: 'discount_code_format_invalid' });
    });

    it('requires commission when an affiliate email is set', () => {
      expect(
        validateCreatePromoCodeArgs({
          normalizedCode: 'mikhail10',
          rawCode: 'MIKHAIL10',
          rewardAmount: 0,
          usageCap: 0,
          rewardType: 'discount',
          discountPercent: 10,
          productKey: 'web_bundle_100',
          affiliateEmail: 'creator@example.com',
        })
      ).toEqual({ ok: false, reason: 'commission_percent_invalid' });
    });

    it('accepts an affiliate-bound discount code', () => {
      expect(
        validateCreatePromoCodeArgs({
          normalizedCode: 'mikhail10',
          rawCode: 'MIKHAIL10',
          rewardAmount: 0,
          usageCap: 0,
          rewardType: 'discount',
          discountPercent: 10,
          productKey: 'web_bundle_100',
          affiliateEmail: '  Creator@Example.com ',
          commissionPercent: 10,
        })
      ).toEqual({ ok: true });
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

    it('allows switching a used code to unlimited', () => {
      expect(
        validateUpdatePromoCodeArgs(
          { usedCount: 5, rewardAmount: 10 },
          { usageCap: 0 }
        )
      ).toEqual({ ok: true });
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

describe('applyPromoCodeUpdate', () => {
  const promo = {
    rewardAmount: 100,
    usageCap: 50,
    perUserLimit: 5,
    activeFrom: 1_000,
    activeTo: 2_000,
    usedCount: 3,
    metadata: { campaignName: 'Camp', deactivationReason: 'abuse' },
  };

  it('preserves unrelated metadata (deactivationReason) when campaign/notes are edited', () => {
    const result = applyPromoCodeUpdate(promo, { metadata: { campaignName: 'Renamed' } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.patch.metadata).toEqual({
        campaignName: 'Renamed',
        deactivationReason: 'abuse',
      });
    }
  });

  it('clears activeFrom/activeTo via explicit flags', () => {
    const result = applyPromoCodeUpdate(promo, {
      clearActiveFrom: true,
      clearActiveTo: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.patch).toHaveProperty('activeFrom', undefined);
      expect(result.patch).toHaveProperty('activeTo', undefined);
    }
  });

  it('does not require an ordering check when both schedule fields are cleared', () => {
    const result = applyPromoCodeUpdate(promo, {
      clearActiveFrom: true,
      clearActiveTo: true,
    });
    expect(result.ok).toBe(true);
  });

  it('rejects activeFrom on or after activeTo when both exist', () => {
    expect(applyPromoCodeUpdate(promo, { activeFrom: 2_000, activeTo: 1_500 })).toEqual({
      ok: false,
      reason: 'active_from_before_active_to',
    });
    expect(applyPromoCodeUpdate(promo, { activeFrom: 2_000, activeTo: 2_000 })).toEqual({
      ok: false,
      reason: 'active_from_before_active_to',
    });
  });

  it('allows editing one schedule bound without touching the other', () => {
    const result = applyPromoCodeUpdate(promo, { activeFrom: 500 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.patch.activeFrom).toBe(500);
      expect(result.patch.activeTo).toBeUndefined();
    }
  });

  it('clears perUserLimit via explicit flag', () => {
    const result = applyPromoCodeUpdate(promo, { clearPerUserLimit: true });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.patch).toHaveProperty('perUserLimit', undefined);
    }
  });

  it('validates perUserLimit against the effective usage cap', () => {
    expect(applyPromoCodeUpdate(promo, { perUserLimit: 51 })).toEqual({
      ok: false,
      reason: 'per_user_limit_exceeds_cap',
    });
    // Clearing the limit while lowering the cap below the old limit is allowed.
    const result = applyPromoCodeUpdate(promo, { usageCap: 4, clearPerUserLimit: true });
    expect(result.ok).toBe(true);
  });

  it('rejects non-finite, non-integer, zero, and negative perUserLimit values', () => {
    expect(applyPromoCodeUpdate(promo, { perUserLimit: Infinity })).toEqual({
      ok: false,
      reason: 'per_user_limit_invalid',
    });
    expect(applyPromoCodeUpdate(promo, { perUserLimit: NaN })).toEqual({
      ok: false,
      reason: 'per_user_limit_invalid',
    });
    expect(applyPromoCodeUpdate(promo, { perUserLimit: 2.5 })).toEqual({
      ok: false,
      reason: 'per_user_limit_invalid',
    });
    expect(applyPromoCodeUpdate(promo, { perUserLimit: 0 })).toEqual({
      ok: false,
      reason: 'per_user_limit_invalid',
    });
    expect(applyPromoCodeUpdate(promo, { perUserLimit: -3 })).toEqual({
      ok: false,
      reason: 'per_user_limit_invalid',
    });
  });

  it('accepts a positive integer perUserLimit within the cap', () => {
    const result = applyPromoCodeUpdate(promo, { perUserLimit: 10 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.patch.perUserLimit).toBe(10);
    }
  });

  it('keeps rewardAmount locked once the code has redemptions', () => {
    expect(applyPromoCodeUpdate(promo, { rewardAmount: 200 })).toEqual({
      ok: false,
      reason: 'reward_amount_locked',
    });
  });
});

describe('validateCreatePromoCodeArgs schedule', () => {
  it('rejects activeFrom on or after activeTo', () => {
    expect(
      validateCreatePromoCodeArgs({
        normalizedCode: 'WELCOME',
        rewardAmount: 10,
        usageCap: 5,
        activeFrom: 2_000,
        activeTo: 1_000,
      })
    ).toEqual({ ok: false, reason: 'active_from_before_active_to' });
  });

  it('accepts a valid schedule', () => {
    expect(
      validateCreatePromoCodeArgs({
        normalizedCode: 'WELCOME',
        rewardAmount: 10,
        usageCap: 5,
        activeFrom: 1_000,
        activeTo: 2_000,
      })
    ).toEqual({ ok: true });
  });
});

describe('wallet transaction source and type constants', () => {
  it('exposes canonical source values used by the ledger', () => {
    expect(WALLET_TRANSACTION_SOURCES).toEqual(
      expect.arrayContaining(['purchase', 'gameplay', 'system', 'admin', 'promo', 'referral'])
    );
    expect(WALLET_TRANSACTION_SOURCES).not.toEqual(
      expect.arrayContaining(['store', 'game'])
    );
  });

  it('covers every source/type value emitted by wallet_transactions inserts', () => {
    // Emitters: grantConsumablePurchase (purchase), wallet.ts (gameplay/system),
    // promo.ts (promo), admin.ts (admin), payments.ts (purchase/admin),
    // purchaserAccountMerge (system), accountDeletion (account_deletion).
    expect(WALLET_TRANSACTION_SOURCES).toEqual(
      expect.arrayContaining(['account_deletion'])
    );
    expect(WALLET_TRANSACTION_TYPES).toEqual(
      expect.arrayContaining([
        'purchase_grant',
        'purchase_reversal',
        'admin_adjustment',
        'starter_grant',
        'game_entry_reserve',
        'game_entry_adjust',
        'promo_redemption',
        'referral_invitee_grant',
        'referral_inviter_grant',
        'account_merge_debit',
        'account_merge_credit',
        'account_deletion_forfeit',
      ])
    );
  });
});

describe('discount lifecycle reconciliation (cron path)', () => {
  const adminSource = fs.readFileSync(
    path.join(__dirname, '../../convex/admin.ts'),
    'utf8'
  );

  it('listDiscountsNeedingReconciliation does not require admin auth (cron-called)', () => {
    // Extract the function body for listDiscountsNeedingReconciliation.
    const match = adminSource.match(
      /export const listDiscountsNeedingReconciliation = internalQuery\(\{[\s\S]*?\}\);/
    );
    expect(match).toBeTruthy();
    const body = match![0];
    // Must NOT call requireAdmin or requireUser: the cron has no user identity.
    expect(body).not.toMatch(/requireAdmin/);
    expect(body).not.toMatch(/requireUser/);
  });

  it('getPromoCodeForReconciliation does not require admin auth (cron-called)', () => {
    const match = adminSource.match(
      /export const getPromoCodeForReconciliation = internalQuery\(\{[\s\S]*?\}\);/
    );
    expect(match).toBeTruthy();
    const body = match![0];
    expect(body).not.toMatch(/requireAdmin/);
    expect(body).not.toMatch(/requireUser/);
  });

  it('markDiscountDisablePending does not require admin auth (cron-called)', () => {
    const match = adminSource.match(
      /export const markDiscountDisablePending = internalMutation\(\{[\s\S]*?\}\);/
    );
    expect(match).toBeTruthy();
    const body = match![0];
    expect(body).not.toMatch(/requireAdmin/);
    expect(body).not.toMatch(/requireUser/);
  });

  it('markDiscountDisabled does not require admin auth (cron-called)', () => {
    const match = adminSource.match(
      /export const markDiscountDisabled = internalMutation\(\{[\s\S]*?\}\);/
    );
    expect(match).toBeTruthy();
    const body = match![0];
    expect(body).not.toMatch(/requireAdmin/);
    expect(body).not.toMatch(/requireUser/);
  });

  it('reconcileDiscountLifecycle is an internalAction (no client auth needed)', () => {
    expect(adminSource).toMatch(
      /export const reconcileDiscountLifecycle = internalAction\(/
    );
  });

  it('disableExpiredDiscount is an internalAction (scheduled, no client auth)', () => {
    expect(adminSource).toMatch(
      /export const disableExpiredDiscount = internalAction\(/
    );
  });

  it('crons.ts uses the correct plural filename with default export', () => {
    const cronsPath = path.join(__dirname, '../../convex/crons.ts');
    expect(fs.existsSync(cronsPath)).toBe(true);
    const cronsSource = fs.readFileSync(cronsPath, 'utf8');
    expect(cronsSource).toMatch(/export default crons/);
    expect(cronsSource).toMatch(/internal\.admin\.reconcileDiscountLifecycle/);
    // The old singular cron.ts must not exist.
    expect(fs.existsSync(path.join(__dirname, '../../convex/cron.ts'))).toBe(false);
  });
});

describe('provisionDiscountPromo compensating cleanup', () => {
  const adminSource = fs.readFileSync(
    path.join(__dirname, '../../convex/admin.ts'),
    'utf8'
  );

  // Extract the provisionDiscountPromo action body. The action contains nested
  // `});` closures, so we extract from the export to the next top-level export.
  const actionStart = adminSource.indexOf('export const provisionDiscountPromo = action(');
  const nextExport = adminSource.indexOf('\nexport const', actionStart + 1);
  const actionBody = adminSource.slice(actionStart, nextExport);

  it('tracks idPersistedThisRun for cleanup decisions (no codeAttachedThisRun flag)', () => {
    expect(actionBody).toMatch(/let idPersistedThisRun = false/);
    // The codeAttachedThisRun flag was removed: cleanup is now unconditional
    // for non-orphan failures because the code may be attached remotely even
    // when ensureDiscountCode throws.
    expect(actionBody).not.toMatch(/codeAttachedThisRun/);
  });

  it('enables the discount on retry before ensureDiscountCode', () => {
    // The retry path (persisted discountId) must call enableDiscount before
    // ensureDiscountCode, so a prior compensating disable is reversed.
    const enableIdx = actionBody.indexOf('await enableDiscount({ discountId })');
    const ensureIdx = actionBody.indexOf('await ensureDiscountCode({');
    expect(enableIdx).toBeGreaterThan(-1);
    expect(ensureIdx).toBeGreaterThan(-1);
    expect(enableIdx).toBeLessThan(ensureIdx);
  });

  it('recovers automatically when enableDiscount returns 404 (stale provider id)', () => {
    // On 404, the action must clear the stale id and create a fresh discount
    // in the same attempt.
    expect(actionBody).toMatch(/isDiscountNotFoundError\(enableErr\)/);
    expect(actionBody).toMatch(/internal\.admin\.clearStaleDiscountId/);
    // After clearing, a new createPercentageDiscount + persistDiscountId must
    // follow within the same catch-recovery branch.
    const notFoundIdx = actionBody.indexOf('isDiscountNotFoundError(enableErr)');
    const recoveryCreateIdx = actionBody.indexOf('createPercentageDiscount({', notFoundIdx);
    const recoveryPersistIdx = actionBody.indexOf('internal.admin.persistDiscountId', notFoundIdx);
    expect(recoveryCreateIdx).toBeGreaterThan(-1);
    expect(recoveryPersistIdx).toBeGreaterThan(recoveryCreateIdx);
  });

  it('Case A: deletes the orphan provider discount when persistDiscountId fails', () => {
    // When discountCreatedThisRun && !idPersistedThisRun, the code must call
    // deleteDiscount (not disableDiscount) so the deterministic identifier
    // does not block retry.
    expect(actionBody).toMatch(
      /discountCreatedThisRun && !idPersistedThisRun && discountId/
    );
    expect(actionBody).toMatch(/await deleteDiscount\(\{ discountId \}\)/);
  });

  it('Case B: always deletes provider code + disables discount for any non-orphan failure', () => {
    // For any failure with a known discountId that is NOT Case A, cleanup must
    // always delete the provider code and disable the discount, regardless of
    // whether ensureDiscountCode reported success. The code may be attached
    // remotely despite a thrown response.
    expect(actionBody).toMatch(/\} else if \(discountId\) \{/);
    expect(actionBody).toMatch(/await deleteDiscountCode\(/);
    expect(actionBody).toMatch(/await disableDiscount\(\{ discountId \}\)/);
    // Must NOT gate on codeAttachedThisRun.
    expect(actionBody).not.toMatch(/discountId && codeAttachedThisRun/);
  });

  it('surfaces a manual cleanup error when cleanup fails (does not claim safety)', () => {
    // The error message must include "Manual provider cleanup required" when
    // cleanupError is set, so the admin knows automatic retry is not safe.
    expect(actionBody).toMatch(/Manual provider cleanup required/);
    // The old "acceptable" comment must be gone.
    expect(actionBody).not.toMatch(/acceptable for a short window/);
    expect(actionBody).not.toMatch(/acceptable/);
  });

  it('does not contain comments claiming an active provider code on finalize failure is acceptable', () => {
    expect(adminSource).not.toMatch(/code is usable[\s\S]*acceptable/);
    expect(adminSource).not.toMatch(/acceptable for a short window/);
  });

  it('defines a clearStaleDiscountId internal mutation', () => {
    expect(adminSource).toMatch(
      /export const clearStaleDiscountId = internalMutation\(/
    );
  });
});

describe('updatePromoCode discount reactivation guard', () => {
  const adminSource = fs.readFileSync(
    path.join(__dirname, '../../convex/admin.ts'),
    'utf8'
  );

  // Extract the updatePromoCode mutation body to the next top-level export.
  const updateStart = adminSource.indexOf('export const updatePromoCode = mutation(');
  const updateNext = adminSource.indexOf('\nexport const', updateStart + 1);
  const updateBody = adminSource.slice(updateStart, updateNext);

  it('rejects active:true for discount codes unless already provisioned', () => {
    expect(updateBody).toMatch(/discount_reactivation_requires_provisioning/);
    expect(updateBody).toMatch(/promo\.rewardType === 'discount'/);
    expect(updateBody).toMatch(/args\.active === true/);
    expect(updateBody).toMatch(/revenueCatProvisioningStatus !== 'provisioned'/);
  });
});

describe('promo detail UI reactivation guard', () => {
  const uiSource = fs.readFileSync(
    path.join(__dirname, '../../app/(admin)/promo-codes/[promoCodeId].tsx'),
    'utf8'
  );

  it('hides Reactivate for discount codes', () => {
    // The Reactivate button must be gated on !isDiscount.
    expect(uiSource).toMatch(/!isActive && !isDiscount &&/);
  });

  it('shows Retry Provisioning for failed/pending discount codes', () => {
    expect(uiSource).toMatch(/isFailedOrPendingDiscount/);
    expect(uiSource).toMatch(/Retry Provisioning/);
  });
});
