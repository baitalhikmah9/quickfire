import { mutation } from './_generated/server';
import { v } from 'convex/values';
import {
  evaluatePromoAccountRestriction,
  evaluatePromoRedemption,
  normalizePromoCode,
} from './lib/promoRules';
import {
  appendPromoRedeemAttempt,
  evaluatePromoRedeemRateGate,
  prunePromoRedeemAttempts,
} from './lib/promoRedeemRateLimit';
import { ensureWalletDoc } from './lib/ensureWallet';
import { requireUser } from './lib/auth';
import { ensureCanonicalPurchaserAccountForUser } from './lib/purchaserAccounts';
import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';

async function loadPromoRedeemAttempts(ctx: MutationCtx, userId: Id<'users'>) {
  return await ctx.db
    .query('promo_redeem_rates')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .unique();
}

async function recordFailedPromoAttempt(
  ctx: MutationCtx,
  userId: Id<'users'>,
  now: number
) {
  const existing = await loadPromoRedeemAttempts(ctx, userId);
  const pruned = prunePromoRedeemAttempts(existing?.attemptTimestamps ?? [], now);
  const { next, recorded } = appendPromoRedeemAttempt(pruned, now);

  if (!recorded && existing && pruned.length === existing.attemptTimestamps.length) {
    return;
  }

  if (existing) {
    await ctx.db.patch(existing._id, { attemptTimestamps: next });
    return;
  }

  if (recorded) {
    await ctx.db.insert('promo_redeem_rates', {
      userId,
      attemptTimestamps: next,
    });
  }
}

export const redeemCode = mutation({
  args: {
    code: v.string(),
    clientRequestId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const purchaserAccount = await ensureCanonicalPurchaserAccountForUser(ctx, user);
    const now = Date.now();

    const rateRow = await loadPromoRedeemAttempts(ctx, user._id);
    const prunedAttempts = prunePromoRedeemAttempts(rateRow?.attemptTimestamps ?? [], now);
    if (rateRow && prunedAttempts.length !== rateRow.attemptTimestamps.length) {
      await ctx.db.patch(rateRow._id, { attemptTimestamps: prunedAttempts });
    }
    const rateGate = evaluatePromoRedeemRateGate(prunedAttempts, now);
    if (!rateGate.allowed) {
      return {
        success: false as const,
        error: 'rate_limited' as const,
        retryAfterMs: rateGate.retryAfterMs,
      };
    }

    const normalized = normalizePromoCode(args.code);

    const promo = await ctx.db
      .query('promo_codes')
      .withIndex('by_code', (q) => q.eq('code', normalized))
      .unique();

    if (!promo) {
      await recordFailedPromoAttempt(ctx, user._id, now);
      return { success: false as const, error: 'invalid_code' };
    }

    const usedCount = promo.usedCount ?? 0;
    const perUserLimit = promo.perUserLimit ?? 1;
    const active = promo.active !== false;

    const userRedemptions = await ctx.db
      .query('promo_redemptions')
      .withIndex('by_user_promo', (q) => q.eq('userId', user._id).eq('promoCodeId', promo._id))
      .collect();
    const userRedemptionCount = userRedemptions.length;
    const accountCheck = evaluatePromoAccountRestriction({
      redemptionScope: promo.redemptionScope,
      restrictedToUserId: promo.restrictedToUserId,
      restrictedToPurchaserAccountId: promo.restrictedToPurchaserAccountId,
      currentUserId: user._id,
      currentPurchaserAccountId: purchaserAccount?.appUserId ?? null,
    });

    if (!accountCheck.ok) {
      await recordFailedPromoAttempt(ctx, user._id, now);
      return { success: false as const, error: accountCheck.reason };
    }

    const promoCheck = evaluatePromoRedemption({
      active,
      now,
      activeFrom: promo.activeFrom,
      activeTo: promo.activeTo,
      usedCount,
      usageCap: promo.usageCap,
      userRedemptionCount,
      perUserLimit,
    });

    if (!promoCheck.ok) {
      await recordFailedPromoAttempt(ctx, user._id, now);
      return { success: false as const, error: promoCheck.reason };
    }

    if (!purchaserAccount) {
      throw new Error('Purchaser account creation failed');
    }

    const wallet = await ensureWalletDoc(ctx, purchaserAccount.appUserId, user._id);
    if (perUserLimit > 1 && !args.clientRequestId?.trim()) {
      return { success: false as const, error: 'idempotency_required' };
    }

    const idempotencyKey =
      perUserLimit > 1
        ? `promo:${user._id}:${promo._id}:${args.clientRequestId!.trim()}`
        : `promo:${user._id}:${promo._id}`;

    const existingTx = await ctx.db
      .query('wallet_transactions')
      .withIndex('by_wallet_idempotency', (q) =>
        q.eq('walletId', wallet._id).eq('idempotencyKey', idempotencyKey)
      )
      .unique();

    if (existingTx) {
      return {
        success: true as const,
        tokensGranted: promo.rewardAmount,
        duplicate: true as const,
      };
    }

    const grantAmount = promo.rewardAmount;
    const txNow = Date.now();

    const transactionId = await ctx.db.insert('wallet_transactions', {
      walletId: wallet._id,
      type: 'promo_redemption',
      amount: grantAmount,
      createdAt: txNow,
      status: 'posted',
      source: 'promo',
      idempotencyKey,
      metadata: { code: normalized, promoCodeId: promo._id },
    });

    await ctx.db.patch(wallet._id, { balance: wallet.balance + grantAmount });
    await ctx.db.insert('promo_redemptions', {
      promoCodeId: promo._id,
      userId: user._id,
      redeemedAt: txNow,
      transactionId,
    });

    await ctx.db.patch(promo._id, { usedCount: usedCount + 1 });

    return { success: true as const, tokensGranted: grantAmount };
  },
});
