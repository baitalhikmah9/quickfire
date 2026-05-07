import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireAdmin } from './lib/auth';
import { ensureWalletDoc } from './lib/ensureWallet';
import { normalizePromoCode } from './lib/promoRules';
import {
  derivePromoModeDefaults,
  derivePromoCodeStatus,
  isAccountPromoMode,
  validateCreatePromoCodeArgs,
  validateUpdatePromoCodeArgs,
  validateWalletAdjustment,
} from './lib/adminValidation';

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

// ───────────────────────────────────────────────
// Promo Code Queries
// ───────────────────────────────────────────────

export const listPromoCodes = query({
  args: {
    status: v.optional(v.union(
      v.literal('active'),
      v.literal('inactive'),
      v.literal('expired'),
      v.literal('scheduled'),
      v.literal('exhausted')
    )),
    query: v.optional(v.string()),
    cursor: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = Math.min(args.limit ?? 50, 100);
    const now = Date.now();

    const all = await ctx.db.query('promo_codes').collect();
    const withStatus = all.map((promo) => ({
      ...promo,
      status: derivePromoCodeStatus(promo, now),
    }));

    let filtered = withStatus;

    if (args.status) {
      filtered = filtered.filter((p) => p.status === args.status);
    }

    if (args.query) {
      const q = args.query.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.code.toLowerCase().includes(q) ||
          (p.metadata?.campaignName && String(p.metadata.campaignName).toLowerCase().includes(q))
      );
    }

    if (args.cursor) {
      filtered = filtered.filter((p) => (p.createdAt ?? 0) < args.cursor!);
    }

    filtered.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    const items = filtered.slice(0, limit);

    return {
      items,
      nextCursor:
        items.length === limit ? items[items.length - 1]?.createdAt ?? null : null,
    };
  },
});

export const getPromoCode = query({
  args: {
    promoCodeId: v.id('promo_codes'),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const promoCode = await ctx.db.get(args.promoCodeId);
    if (!promoCode) {
      return null;
    }

    const redemptions = await ctx.db
      .query('promo_redemptions')
      .withIndex('by_promo_code', (q) => q.eq('promoCodeId', args.promoCodeId))
      .collect();
    const restrictedUser = promoCode.restrictedToUserId
      ? await ctx.db.get(promoCode.restrictedToUserId)
      : null;

    const enriched = await Promise.all(
      redemptions.map(async (redemption) => {
        const user = redemption.userId
          ? await ctx.db.get(redemption.userId)
          : null;
        const transaction = redemption.transactionId
          ? await ctx.db.get(redemption.transactionId)
          : null;
        return {
          redemption,
          user: user
            ? {
                _id: user._id,
                email: user.email,
                name: user.name,
                clerkId: user.clerkId,
              }
            : null,
          transaction,
        };
      })
    );

    return {
      promoCode,
      restrictedUser: restrictedUser
        ? {
            _id: restrictedUser._id,
            email: restrictedUser.email,
            name: restrictedUser.name,
            clerkId: restrictedUser.clerkId,
            canonicalPurchaserAccountId: restrictedUser.canonicalPurchaserAccountId,
          }
        : null,
      redemptions: enriched,
    };
  },
});

// ───────────────────────────────────────────────
// Promo Code Mutations
// ───────────────────────────────────────────────

export const createPromoCode = mutation({
  args: {
    code: v.string(),
    rewardAmount: v.number(),
    usageCap: v.number(),
    mode: v.optional(v.union(
      v.literal('public_single_use'),
      v.literal('public_multi_use'),
      v.literal('account_single_use'),
      v.literal('account_multi_use')
    )),
    restrictedToUserId: v.optional(v.id('users')),
    restrictedToPurchaserAccountId: v.optional(v.string()),
    activeFrom: v.optional(v.number()),
    activeTo: v.optional(v.number()),
    metadata: v.optional(
      v.object({
        campaignName: v.optional(v.string()),
        notes: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireAdmin(ctx);
    const normalized = normalizePromoCode(args.code);

    const validation = validateCreatePromoCodeArgs({
      normalizedCode: normalized,
      rewardAmount: args.rewardAmount,
      usageCap: args.usageCap,
      mode: args.mode,
    });
    if (!validation.ok) {
      throw new Error(validation.reason);
    }

    const mode = args.mode ?? 'public_multi_use';
    const modeDefaults = derivePromoModeDefaults({
      mode,
      requestedUsageCap: args.usageCap,
      restrictedToUserId: args.restrictedToUserId,
    });
    if (!modeDefaults.ok) {
      throw new Error(modeDefaults.reason);
    }

    if (isAccountPromoMode(mode)) {
      const restrictedUser = args.restrictedToUserId
        ? await ctx.db.get(args.restrictedToUserId)
        : null;
      if (!restrictedUser) {
        throw new Error('restricted_user_not_found');
      }
    }

    const existing = await ctx.db
      .query('promo_codes')
      .withIndex('by_code', (q) => q.eq('code', normalized))
      .unique();
    if (existing) {
      throw new Error('duplicate_code');
    }

    const now = Date.now();
    const promoCodeId = await ctx.db.insert('promo_codes', {
      code: normalized,
      rewardType: 'tokens',
      rewardAmount: args.rewardAmount,
      usageCap: modeDefaults.usageCap,
      perUserLimit: modeDefaults.perUserLimit,
      mode,
      redemptionScope: modeDefaults.redemptionScope,
      restrictedToUserId: args.restrictedToUserId,
      restrictedToPurchaserAccountId: args.restrictedToPurchaserAccountId,
      active: true,
      usedCount: 0,
      activeFrom: args.activeFrom,
      activeTo: args.activeTo,
      metadata: args.metadata,
      createdAt: now,
      updatedAt: now,
      createdByAdminUserId: adminUser._id,
    });

    return { promoCodeId };
  },
});

export const updatePromoCode = mutation({
  args: {
    promoCodeId: v.id('promo_codes'),
    rewardAmount: v.optional(v.number()),
    usageCap: v.optional(v.number()),
    perUserLimit: v.optional(v.number()),
    activeFrom: v.optional(v.number()),
    activeTo: v.optional(v.number()),
    active: v.optional(v.boolean()),
    metadata: v.optional(
      v.object({
        campaignName: v.optional(v.string()),
        notes: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireAdmin(ctx);
    const promo = await ctx.db.get(args.promoCodeId);
    if (!promo) {
      throw new Error('promo_code_not_found');
    }

    const validation = validateUpdatePromoCodeArgs(promo, {
      rewardAmount: args.rewardAmount,
      usageCap: args.usageCap,
    });
    if (!validation.ok) {
      throw new Error(validation.reason);
    }

    const patch: Record<string, unknown> = {};
    if (args.rewardAmount !== undefined) patch.rewardAmount = args.rewardAmount;
    if (args.usageCap !== undefined) patch.usageCap = args.usageCap;
    if (args.perUserLimit !== undefined) patch.perUserLimit = args.perUserLimit;
    if (args.activeFrom !== undefined) patch.activeFrom = args.activeFrom;
    if (args.activeTo !== undefined) patch.activeTo = args.activeTo;
    if (args.active !== undefined) patch.active = args.active;
    if (args.metadata !== undefined) patch.metadata = args.metadata;
    patch.updatedAt = Date.now();
    patch.updatedByAdminUserId = adminUser._id;

    await ctx.db.patch(args.promoCodeId, patch);
    return { promoCodeId: args.promoCodeId };
  },
});

export const deactivatePromoCode = mutation({
  args: {
    promoCodeId: v.id('promo_codes'),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const promo = await ctx.db.get(args.promoCodeId);
    if (!promo) {
      throw new Error('promo_code_not_found');
    }

    const metadata = promo.metadata ?? {};
    await ctx.db.patch(args.promoCodeId, {
      active: false,
      updatedAt: Date.now(),
      metadata: { ...metadata, deactivationReason: args.reason },
    });
    return { promoCodeId: args.promoCodeId };
  },
});

// ───────────────────────────────────────────────
// Wallet Queries And Mutations
// ───────────────────────────────────────────────

export const adjustWallet = mutation({
  args: {
    purchaserAccountId: v.string(),
    amount: v.number(),
    reason: v.string(),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireAdmin(ctx);
    const wallet = await ensureWalletDoc(ctx, args.purchaserAccountId);

    const validation = validateWalletAdjustment({
      currentBalance: wallet.balance,
      amount: args.amount,
      reason: args.reason,
    });
    if (!validation.ok) {
      throw new Error(validation.reason);
    }

    const now = Date.now();
    const txIdempotencyKey = args.idempotencyKey
      ? `admin_adjust:${wallet._id}:${args.idempotencyKey}`
      : undefined;

    if (txIdempotencyKey) {
      const existingTx = await ctx.db
        .query('wallet_transactions')
        .withIndex('by_wallet_idempotency', (q) =>
          q.eq('walletId', wallet._id).eq('idempotencyKey', txIdempotencyKey)
        )
        .unique();
      if (existingTx) {
        return { balance: wallet.balance, transactionId: existingTx._id };
      }
    }

    const transactionId = await ctx.db.insert('wallet_transactions', {
      walletId: wallet._id,
      type: 'admin_adjustment',
      amount: args.amount,
      createdAt: now,
      status: 'posted',
      source: 'admin',
      adminActorUserId: adminUser._id,
      idempotencyKey: txIdempotencyKey,
      metadata: { reason: args.reason },
    });

    const balance = wallet.balance + args.amount;
    await ctx.db.patch(wallet._id, { balance });
    return { balance, transactionId };
  },
});

export const searchWallets = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = Math.min(args.limit ?? 20, 100);
    const q = args.query.trim().toLowerCase();
    if (!q) return [];

    // Search by purchaser account id directly on wallets
    const walletByPurchaser = await ctx.db
      .query('wallets')
      .withIndex('by_purchaser_account', (query) =>
        query.eq('purchaserAccountId', args.query)
      )
      .unique();

    const results = [];

    if (walletByPurchaser) {
      const user = walletByPurchaser.userId
        ? await ctx.db.get(walletByPurchaser.userId)
        : null;
      const recentTransactions = await ctx.db
        .query('wallet_transactions')
        .withIndex('by_wallet_created', (query) =>
          query.eq('walletId', walletByPurchaser._id)
        )
        .order('desc')
        .take(5);
      results.push({
        wallet: walletByPurchaser,
        user: user
          ? {
              _id: user._id,
              email: user.email,
              name: user.name,
              clerkId: user.clerkId,
            }
          : null,
        recentTransactions,
      });
    }

    // Search users by email or clerkId
    const allUsers = await ctx.db.query('users').collect();
    const matchedUsers = allUsers.filter(
      (u) =>
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.clerkId && u.clerkId.toLowerCase().includes(q))
    );

    for (const user of matchedUsers.slice(0, limit)) {
      const wallet = await ctx.db
        .query('wallets')
        .withIndex('by_user', (query) => query.eq('userId', user._id))
        .unique();
      if (!wallet) continue;
      // Skip if already added via purchaser account search
      if (walletByPurchaser && wallet._id === walletByPurchaser._id) continue;

      const recentTransactions = await ctx.db
        .query('wallet_transactions')
        .withIndex('by_wallet_created', (query) => query.eq('walletId', wallet._id))
        .order('desc')
        .take(5);

      results.push({
        wallet,
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          clerkId: user.clerkId,
        },
        recentTransactions,
      });
    }

    return results.slice(0, limit);
  },
});

export const listWalletTransactions = query({
  args: {
    walletId: v.optional(v.id('wallets')),
    type: v.optional(v.string()),
    cursor: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = Math.min(args.limit ?? 50, 100);

    let transactions;
    if (args.walletId) {
      transactions = await ctx.db
        .query('wallet_transactions')
        .withIndex('by_wallet_created', (q) => q.eq('walletId', args.walletId!))
        .order('desc')
        .collect();
    } else {
      transactions = await ctx.db.query('wallet_transactions').order('desc').collect();
    }

    if (args.type) {
      transactions = transactions.filter((t) => t.type === args.type);
    }

    if (args.cursor) {
      transactions = transactions.filter((t) => t.createdAt < args.cursor!);
    }

    const items = transactions.slice(0, limit);
    return {
      items,
      nextCursor:
        items.length === limit ? items[items.length - 1]?.createdAt ?? null : null,
    };
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
