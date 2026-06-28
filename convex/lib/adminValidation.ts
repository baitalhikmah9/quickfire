/**
 * Pure validation helpers for admin operations.
 */

export const PROMO_CODE_MODES = [
  'public_single_use',
  'public_multi_use',
  'account_single_use',
  'account_multi_use',
] as const;

export type PromoCodeMode = (typeof PROMO_CODE_MODES)[number];

export type PromoRedemptionScope = 'public' | 'account';

export function isPromoCodeMode(value: string): value is PromoCodeMode {
  return PROMO_CODE_MODES.includes(value as PromoCodeMode);
}

export function isAccountPromoMode(mode: PromoCodeMode): boolean {
  return mode === 'account_single_use' || mode === 'account_multi_use';
}

export function isMultiUsePromoMode(mode: PromoCodeMode): boolean {
  return mode === 'public_multi_use' || mode === 'account_multi_use';
}

export function derivePromoModeDefaults(args: {
  mode: string;
  requestedUsageCap?: number;
  restrictedToUserId?: string;
}):
  | {
      ok: true;
      usageCap: number;
      perUserLimit: number;
      redemptionScope: PromoRedemptionScope;
    }
  | { ok: false; reason: string } {
  if (!isPromoCodeMode(args.mode)) {
    return { ok: false, reason: 'mode_invalid' };
  }

  const isAccountMode = isAccountPromoMode(args.mode);
  if (isAccountMode && !args.restrictedToUserId) {
    return { ok: false, reason: 'restricted_user_required' };
  }
  if (!isAccountMode && args.restrictedToUserId) {
    return { ok: false, reason: 'restricted_user_not_allowed' };
  }

  if (isMultiUsePromoMode(args.mode)) {
    if (
      args.requestedUsageCap === undefined ||
      !Number.isInteger(args.requestedUsageCap) ||
      args.requestedUsageCap <= 0
    ) {
      return { ok: false, reason: 'usage_cap_positive' };
    }

    return {
      ok: true,
      usageCap: args.requestedUsageCap,
      perUserLimit: args.mode === 'account_multi_use' ? args.requestedUsageCap : 1,
      redemptionScope: isAccountMode ? 'account' : 'public',
    };
  }

  return {
    ok: true,
    usageCap: 1,
    perUserLimit: 1,
    redemptionScope: isAccountMode ? 'account' : 'public',
  };
}

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
  mode?: string;
}): { ok: true } | { ok: false; reason: string } {
  if (!args.normalizedCode) return { ok: false, reason: 'code_required' };
  if (args.rewardAmount <= 0) return { ok: false, reason: 'reward_amount_positive' };
  if (!Number.isInteger(args.rewardAmount)) {
    return { ok: false, reason: 'reward_amount_integer' };
  }
  if (!Number.isFinite(args.rewardAmount) || args.rewardAmount > 1_000_000_000) {
    return { ok: false, reason: 'reward_amount_invalid' };
  }
  if (args.usageCap < 0) return { ok: false, reason: 'usage_cap_nonnegative' };
  if (!Number.isInteger(args.usageCap)) return { ok: false, reason: 'usage_cap_integer' };
  if (!Number.isFinite(args.usageCap) || args.usageCap > 1_000_000_000) {
    return { ok: false, reason: 'usage_cap_invalid' };
  }
  if (args.mode !== undefined && !isPromoCodeMode(args.mode)) {
    return { ok: false, reason: 'mode_invalid' };
  }
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
  if (updates.rewardAmount !== undefined) {
    if (!Number.isFinite(updates.rewardAmount) || updates.rewardAmount > 1_000_000_000) {
      return { ok: false, reason: 'reward_amount_invalid' };
    }
    if (updates.rewardAmount <= 0) return { ok: false, reason: 'reward_amount_positive' };
    if (!Number.isInteger(updates.rewardAmount)) return { ok: false, reason: 'reward_amount_integer' };
  }
  if (updates.usageCap !== undefined) {
    if (!Number.isFinite(updates.usageCap) || updates.usageCap > 1_000_000_000) {
      return { ok: false, reason: 'usage_cap_invalid' };
    }
    if (!Number.isInteger(updates.usageCap)) return { ok: false, reason: 'usage_cap_integer' };
  }
  return { ok: true };
}

const MAX_WALLET_ADJUSTMENT = 1_000_000_000;

export function validateWalletAdjustment(args: {
  currentBalance: number;
  amount: number;
  reason: string;
}): { ok: true } | { ok: false; reason: string } {
  if (args.amount === 0) return { ok: false, reason: 'amount_nonzero' };
  if (!Number.isFinite(args.amount) || Math.abs(args.amount) > MAX_WALLET_ADJUSTMENT) {
    return { ok: false, reason: 'amount_invalid' };
  }
  if (!Number.isInteger(args.amount)) return { ok: false, reason: 'amount_integer' };
  if (!args.reason || args.reason.trim().length === 0) return { ok: false, reason: 'reason_required' };
  const newBalance = args.currentBalance + args.amount;
  if (newBalance < 0) return { ok: false, reason: 'insufficient_balance' };
  return { ok: true };
}
