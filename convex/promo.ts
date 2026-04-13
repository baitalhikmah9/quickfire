import { mutation } from './_generated/server';
import { v } from 'convex/values';
import { evaluatePromoRedemption, normalizePromoCode } from './lib/promoRules';
import { ensureWalletDoc } from './lib/ensureWallet';
import { requireUser } from './lib/auth';

export const redeemCode = mutation({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const normalized = normalizePromoCode(args.code);

    const promo = await ctx.db
      .query('promo_codes')
      .withIndex('by_code', (q) => q.eq('code', normalized))
      .unique();

    if (!promo) {
      return { success: false as const, error: 'invalid_code' };
    }

    const now = Date.now();
    const usedCount = promo.usedCount ?? 0;
    const perUserLimit = promo.perUserLimit ?? 1;
    const active = promo.active !== false;

    const userRedemptions = await ctx.db
      .query('promo_redemptions')
      .withIndex('by_user_promo', (q) => q.eq('userId', user._id).eq('promoCodeId', promo._id))
      .collect();
    const userRedemptionCount = userRedemptions.length;

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
      return { success: false as const, error: promoCheck.reason };
    }

    const wallet = await ensureWalletDoc(ctx, user._id);
    const idempotencyKey = `promo:${user._id}:${promo._id}`;

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
