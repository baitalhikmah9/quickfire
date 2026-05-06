/**
 * Pure validation helpers for admin operations.
 */

export function derivePromoCodeStatus(
  promo: {
    active?: boolean;
    activeFrom?: number;
    activeTo?: number;
    usedCount?: number;
    usageCap: number;
  },
  now = Date.now()
): 'active' | 'inactive' | 'expired' | 'scheduled' | 'exhausted' {
  if (promo.active === false) return 'inactive';
  if (promo.activeFrom !== undefined && now < promo.activeFrom) return 'scheduled';
  if (promo.activeTo !== undefined && now > promo.activeTo) return 'expired';
  if ((promo.usedCount ?? 0) >= promo.usageCap) return 'exhausted';
  return 'active';
}

export function validateCreatePromoCodeArgs(args: {
  normalizedCode: string;
  rewardAmount: number;
  usageCap: number;
}): { ok: true } | { ok: false; reason: string } {
  if (!args.normalizedCode) return { ok: false, reason: 'code_required' };
  if (args.rewardAmount <= 0) return { ok: false, reason: 'reward_amount_positive' };
  if (args.usageCap < 0) return { ok: false, reason: 'usage_cap_nonnegative' };
  return { ok: true };
}

export function validateUpdatePromoCodeArgs(
  promo: {
    usedCount?: number;
    rewardAmount: number;
  },
  updates: {
    rewardAmount?: number;
    usageCap?: number;
  }
): { ok: true } | { ok: false; reason: string } {
  if (updates.usageCap !== undefined && updates.usageCap < (promo.usedCount ?? 0)) {
    return { ok: false, reason: 'usage_cap_below_used' };
  }
  if (
    updates.rewardAmount !== undefined &&
    updates.rewardAmount !== promo.rewardAmount &&
    (promo.usedCount ?? 0) > 0
  ) {
    return { ok: false, reason: 'reward_amount_locked' };
  }
  return { ok: true };
}

export function validateWalletAdjustment(args: {
  currentBalance: number;
  amount: number;
  reason: string;
}): { ok: true } | { ok: false; reason: string } {
  if (args.amount === 0) return { ok: false, reason: 'amount_nonzero' };
  if (!args.reason || args.reason.trim().length === 0) return { ok: false, reason: 'reason_required' };
  const newBalance = args.currentBalance + args.amount;
  if (newBalance < 0) return { ok: false, reason: 'insufficient_balance' };
  return { ok: true };
}
