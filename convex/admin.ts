import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireAdmin } from './lib/auth';
import { ensureWalletDoc } from './lib/ensureWallet';

export const listPurchases = query({
  args: {
    status: v.optional(v.string()),
    store: v.optional(v.string()),
    purchaserQuery: v.optional(v.string()),
    cursor: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = Math.min(args.limit ?? 50, 100);
    const purchases = await ctx.db.query('store_purchases').collect();

    const filtered = purchases
      .filter((purchase) => (args.status ? purchase.status === args.status : true))
      .filter((purchase) => (args.store ? purchase.store === args.store : true))
      .filter((purchase) =>
        args.purchaserQuery
          ? purchase.purchaserAccountId.includes(args.purchaserQuery) ||
            purchase.storeTransactionId.includes(args.purchaserQuery)
          : true
      )
      .filter((purchase) => (args.cursor ? purchase.purchasedAt < args.cursor : true))
      .sort((a, b) => b.purchasedAt - a.purchasedAt)
      .slice(0, limit);

    return {
      items: filtered,
      nextCursor:
        filtered.length === limit ? filtered[filtered.length - 1]?.purchasedAt ?? null : null,
    };
  },
});

export const getPurchase = query({
  args: {
    purchaseId: v.id('store_purchases'),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const purchase = await ctx.db.get(args.purchaseId);
    if (!purchase) {
      return null;
    }

    const wallet = await ctx.db
      .query('wallets')
      .withIndex('by_purchaser_account', (q) =>
        q.eq('purchaserAccountId', purchase.purchaserAccountId)
      )
      .unique();
    const transactions = await ctx.db
      .query('wallet_transactions')
      .withIndex('by_purchase_id', (q) => q.eq('purchaseId', args.purchaseId))
      .collect();

    return { purchase, wallet, transactions };
  },
});

export const adjustWallet = mutation({
  args: {
    purchaserAccountId: v.string(),
    amount: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireAdmin(ctx);
    const wallet = await ensureWalletDoc(ctx, args.purchaserAccountId);
    const now = Date.now();

    await ctx.db.insert('wallet_transactions', {
      walletId: wallet._id,
      type: 'admin_adjustment',
      amount: args.amount,
      createdAt: now,
      status: 'posted',
      source: 'admin',
      adminActorUserId: adminUser._id,
      metadata: { reason: args.reason },
    });

    const balance = wallet.balance + args.amount;
    await ctx.db.patch(wallet._id, { balance });
    return { balance };
  },
});

export const reversePurchaseGrant = mutation({
  args: {
    purchaseId: v.id('store_purchases'),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireAdmin(ctx);
    const purchase = await ctx.db.get(args.purchaseId);
    if (!purchase) {
      throw new Error('Purchase not found');
    }

    const wallet = await ensureWalletDoc(ctx, purchase.purchaserAccountId);
    const purchaseTransactions = await ctx.db
      .query('wallet_transactions')
      .withIndex('by_purchase_id', (q) => q.eq('purchaseId', args.purchaseId))
      .collect();
    const originalGrant = purchaseTransactions.find((record) => record.type === 'purchase_grant');
    const existingReversal = purchaseTransactions.find(
      (record) => record.type === 'purchase_reversal'
    );

    if (!originalGrant) {
      throw new Error('Purchase grant not found');
    }

    if (existingReversal) {
      return { duplicate: true as const, balance: wallet.balance };
    }

    const reversalAmount = -Math.abs(originalGrant.amount);
    await ctx.db.insert('wallet_transactions', {
      walletId: wallet._id,
      type: 'purchase_reversal',
      amount: reversalAmount,
      createdAt: Date.now(),
      status: 'posted',
      source: 'admin',
      purchaseId: purchase._id,
      reversalOf: originalGrant._id,
      adminActorUserId: adminUser._id,
      metadata: { reason: args.reason },
    });

    const balance = wallet.balance + reversalAmount;
    await ctx.db.patch(wallet._id, { balance });
    await ctx.db.patch(purchase._id, { status: 'reversed' });
    return { duplicate: false as const, balance };
  },
});

export const upsertTokenProduct = mutation({
  args: {
    productKey: v.string(),
    tokensGranted: v.number(),
    iosProductId: v.string(),
    androidProductId: v.string(),
    isActive: v.boolean(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query('token_products')
      .withIndex('by_product_key', (q) => q.eq('productKey', args.productKey))
      .unique();
    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        tokensGranted: args.tokensGranted,
        iosProductId: args.iosProductId,
        androidProductId: args.androidProductId,
        isActive: args.isActive,
        sortOrder: args.sortOrder,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert('token_products', {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});
