import { mutation, query, internalMutation, internalQuery, internalAction, action } from './_generated/server';
import { v } from 'convex/values';
import { internal, api } from './_generated/api';
import { requireAdmin } from './lib/auth';
import { ensureWalletDoc } from './lib/ensureWallet';
import { isAffiliateEmail, normalizeAffiliateEmail } from './lib/affiliateStats';
import {
  normalizePromoCode,
  toProviderDiscountCode,
} from './lib/promoRules';
import { writeAudit } from './lib/audit';
import { scanIndexPage, SCAN_BATCH } from './lib/boundedPagination';
import {
  WALLET_TRANSACTION_SOURCES,
  WALLET_TRANSACTION_TYPES,
} from './lib/walletTransactionTypes';
import {
  createPercentageDiscount,
  ensureDiscountCode,
  enableDiscount,
  disableDiscount,
  deleteDiscount,
  deleteDiscountCode,
  buildRevenueCatDiscountIdentifier,
  isDiscountNotFoundError,
  RevenueCatV2Error,
} from './lib/revenueCatApiV2';
import { getDefaultWebProductIdentifierForProductKey } from './lib/paymentCatalog';
import type { Doc, Id } from './_generated/dataModel';
import {
  applyPromoCodeUpdate,
  derivePromoModeDefaults,
  derivePromoCodeStatus,
  isAccountPromoMode,
  validateCreatePromoCodeArgs,
  validateWalletAdjustment,
} from './lib/adminValidation';
import { REFERRAL_REWARD_TOKENS } from './lib/referralRules';

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
    const queryLower = args.purchaserQuery?.trim().toLowerCase();

    const fetchBatch = (upperBound: number | undefined) =>
      ctx.db
        .query('store_purchases')
        .withIndex('by_purchased_at', (range) => {
          const bound = upperBound ?? args.cursor;
          if (bound !== undefined) return range.lt('purchasedAt', bound);
          return range;
        })
        .order('desc')
        .take(SCAN_BATCH);

    const { items, nextCursor } = await scanIndexPage(
      fetchBatch,
      (purchase) => purchase.purchasedAt,
      (purchase) => {
        if (args.status !== undefined && purchase.status !== args.status) return false;
        if (args.store !== undefined && purchase.store !== args.store) return false;
        if (queryLower) {
          if (
            !purchase.purchaserAccountId.toLowerCase().includes(queryLower) &&
            !purchase.storeTransactionId.toLowerCase().includes(queryLower)
          ) {
            return false;
          }
        }
        return true;
      },
      limit
    );

    return { items, nextCursor };
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
    mode: v.optional(v.string()),
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

    if (args.mode) {
      filtered = filtered.filter((p) => p.mode === args.mode);
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
    rewardType: v.optional(v.union(v.literal('tokens'), v.literal('discount'))),
    discountPercent: v.optional(v.number()),
    productKey: v.optional(v.string()),
    affiliateEmail: v.optional(v.string()),
    commissionPercent: v.optional(v.number()),
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
    const rewardType = args.rewardType ?? 'tokens';
    const affiliateEmail = args.affiliateEmail
      ? normalizeAffiliateEmail(args.affiliateEmail)
      : undefined;

    const validation = validateCreatePromoCodeArgs({
      normalizedCode: normalized,
      rawCode: args.code,
      rewardAmount: args.rewardAmount,
      usageCap: args.usageCap,
      mode: args.mode,
      activeFrom: args.activeFrom,
      activeTo: args.activeTo,
      rewardType,
      discountPercent: args.discountPercent,
      productKey: args.productKey,
      affiliateEmail,
      commissionPercent: args.commissionPercent,
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
    // Discount codes are inserted inactive + provisioning_pending until the
    // RevenueCat provider discount + code are created by the
    // provisionDiscountPromo action. Token codes are active immediately.
    const isDiscount = rewardType === 'discount';
    const providerCode = isDiscount ? toProviderDiscountCode(args.code!) : undefined;
    const promoCodeId = await ctx.db.insert('promo_codes', {
      code: normalized,
      rewardType,
      rewardAmount: args.rewardAmount,
      usageCap: modeDefaults.usageCap,
      perUserLimit: modeDefaults.perUserLimit,
      mode,
      redemptionScope: modeDefaults.redemptionScope,
      restrictedToUserId: args.restrictedToUserId,
      restrictedToPurchaserAccountId: args.restrictedToPurchaserAccountId,
      active: !isDiscount,
      usedCount: 0,
      activeFrom: args.activeFrom,
      activeTo: args.activeTo,
      metadata: args.metadata,
      createdAt: now,
      updatedAt: now,
      createdByAdminUserId: adminUser._id,
      discountPercent: isDiscount ? args.discountPercent : undefined,
      productKey: isDiscount ? args.productKey : undefined,
      affiliateEmail: affiliateEmail && isAffiliateEmail(affiliateEmail) ? affiliateEmail : undefined,
      commissionPercent: affiliateEmail ? args.commissionPercent : undefined,
      revenueCatProvisioningStatus: isDiscount ? 'pending' : undefined,
      revenueCatProviderCode: providerCode,
    });

    await writeAudit(ctx, {
      actorUserId: adminUser._id,
      actorEmail: adminUser.email,
      action: 'promo.create',
      targetType: 'promo_code',
      targetId: promoCodeId,
      after: {
        code: normalized,
        rewardType,
        rewardAmount: args.rewardAmount,
        usageCap: modeDefaults.usageCap,
        perUserLimit: modeDefaults.perUserLimit,
        mode,
        redemptionScope: modeDefaults.redemptionScope,
        restrictedToUserId: args.restrictedToUserId,
        restrictedToPurchaserAccountId: args.restrictedToPurchaserAccountId,
        active: !isDiscount,
        activeFrom: args.activeFrom,
        activeTo: args.activeTo,
        discountPercent: isDiscount ? args.discountPercent : undefined,
        productKey: isDiscount ? args.productKey : undefined,
        affiliateEmail: affiliateEmail && isAffiliateEmail(affiliateEmail) ? affiliateEmail : undefined,
        commissionPercent: affiliateEmail ? args.commissionPercent : undefined,
        revenueCatProvisioningStatus: isDiscount ? 'pending' : undefined,
        revenueCatProviderCode: providerCode,
      },
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
    clearPerUserLimit: v.optional(v.boolean()),
    activeFrom: v.optional(v.number()),
    activeTo: v.optional(v.number()),
    clearActiveFrom: v.optional(v.boolean()),
    clearActiveTo: v.optional(v.boolean()),
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

    const result = applyPromoCodeUpdate(promo, {
      rewardAmount: args.rewardAmount,
      usageCap: args.usageCap,
      perUserLimit: args.perUserLimit,
      clearPerUserLimit: args.clearPerUserLimit,
      activeFrom: args.activeFrom,
      activeTo: args.activeTo,
      clearActiveFrom: args.clearActiveFrom,
      clearActiveTo: args.clearActiveTo,
      active: args.active,
      metadata: args.metadata,
    });
    if (!result.ok) {
      throw new Error(result.reason);
    }

    // Discount codes cannot be reactivated via the generic local update path.
    // Reactivation would set local active=true without confirming the provider
    // discount is enabled, leaving a usable local code pointing at a disabled
    // provider discount (or vice versa). Discount codes must use the
    // provisionDiscountPromo action (Retry Provisioning) which reconciles
    // provider state. A disabled discount stays disabled unless a
    // provider-aware enable action re-provisions it.
    if (
      promo.rewardType === 'discount' &&
      args.active === true &&
      promo.revenueCatProvisioningStatus !== 'provisioned'
    ) {
      throw new Error(
        'discount_reactivation_requires_provisioning'
      );
    }

    const patch: Record<string, unknown> = {
      ...result.patch,
      updatedAt: Date.now(),
      updatedByAdminUserId: adminUser._id,
    };

    const before = {
      rewardAmount: promo.rewardAmount,
      usageCap: promo.usageCap,
      perUserLimit: promo.perUserLimit,
      activeFrom: promo.activeFrom,
      activeTo: promo.activeTo,
      active: promo.active,
      metadata: promo.metadata,
    };

    await ctx.db.patch(args.promoCodeId, patch);
    await writeAudit(ctx, {
      actorUserId: adminUser._id,
      actorEmail: adminUser.email,
      action: 'promo.update',
      targetType: 'promo_code',
      targetId: args.promoCodeId,
      before,
      after: patch,
    });
    return { promoCodeId: args.promoCodeId };
  },
});

export const deactivatePromoCode = mutation({
  args: {
    promoCodeId: v.id('promo_codes'),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireAdmin(ctx);
    if (!args.reason || args.reason.trim().length === 0) {
      throw new Error('reason_required');
    }
    const promo = await ctx.db.get(args.promoCodeId);
    if (!promo) {
      throw new Error('promo_code_not_found');
    }

    const metadata = promo.metadata ?? {};
    const patch: Record<string, unknown> = {
      active: false,
      updatedAt: Date.now(),
      metadata: { ...metadata, deactivationReason: args.reason },
    };
    // For discount codes, this public mutation is only reached for token codes
    // in the normal flow (the UI calls deactivateDiscountPromo action for
    // discount codes, which uses markDiscountDisablePending + markDiscountDisabled).
    // If a discount code somehow reaches this mutation directly, set
    // disable_pending (NOT disabled) so the reconciliation retries the provider
    // disable. Never claim `disabled` without a confirmed provider disable.
    if (promo.rewardType === 'discount') {
      patch.revenueCatProvisioningStatus = 'disable_pending';
    }
    await ctx.db.patch(args.promoCodeId, patch);
    await writeAudit(ctx, {
      actorUserId: adminUser._id,
      actorEmail: adminUser.email,
      action: 'promo.deactivate',
      targetType: 'promo_code',
      targetId: args.promoCodeId,
      reason: args.reason,
      before: { active: promo.active !== false },
      after: { active: false },
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
    await writeAudit(ctx, {
      actorUserId: adminUser._id,
      actorEmail: adminUser.email,
      action: 'wallet.adjust',
      targetType: 'wallet',
      targetId: wallet._id,
      reason: args.reason,
      before: { balance: wallet.balance, purchaserAccountId: wallet.purchaserAccountId },
      after: { balance, transactionId },
    });
    return { balance, transactionId };
  },
});

export const getWallet = query({
  args: {
    walletId: v.id('wallets'),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const wallet = await ctx.db.get(args.walletId);
    if (!wallet) return null;

    const user = wallet.userId
      ? await ctx.db.get(wallet.userId)
      : null;
    const recentTransactions = await ctx.db
      .query('wallet_transactions')
      .withIndex('by_wallet_created', (q) => q.eq('walletId', wallet._id))
      .order('desc')
      .take(5);

    return {
      wallet,
      user: user
        ? {
            _id: user._id,
            email: user.email,
            name: user.name,
            clerkId: user.clerkId,
          }
        : null,
      recentTransactions,
    };
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
    if (!args.reason || args.reason.trim().length === 0) {
      throw new Error('reason_required');
    }
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

    // Intentionally no floor: clawbacks may drive balance negative so ledger
    // remains accurate (unlike adjustWallet, which rejects insufficient_balance).
    const balance = wallet.balance + reversalAmount;
    await ctx.db.patch(wallet._id, { balance });
    await ctx.db.patch(purchase._id, { status: 'reversed' });
    await writeAudit(ctx, {
      actorUserId: adminUser._id,
      actorEmail: adminUser.email,
      action: 'purchase.reverse',
      targetType: 'store_purchase',
      targetId: purchase._id,
      reason: args.reason,
      before: {
        purchaseStatus: purchase.status,
        balance: wallet.balance,
        storeTransactionId: purchase.storeTransactionId,
      },
      after: {
        purchaseStatus: 'reversed',
        balance,
        reversalAmount,
      },
    });
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

// ───────────────────────────────────────────────
// Global Transaction Ledger
// ───────────────────────────────────────────────

export const listTransactions = query({
  args: {
    query: v.optional(v.string()),
    type: v.optional(v.union(...WALLET_TRANSACTION_TYPES.map((t) => v.literal(t)))),
    source: v.optional(v.union(...WALLET_TRANSACTION_SOURCES.map((s) => v.literal(s)))),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    cursor: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = Math.min(args.limit ?? 50, 100);
    const q = args.query?.trim().toLowerCase();

    // Bounds are inclusive on the low side and exclusive on the high side:
    // from <= createdAt < to, with `cursor` narrowing the window for the next
    // (older) page. The screen sends the exclusive start of the day after the
    // selected To day, so every millisecond of that day is included.
    const initialUpper =
      args.cursor !== undefined
        ? args.to !== undefined
          ? Math.min(args.cursor, args.to)
          : args.cursor
        : args.to;

    const walletById = new Map<string, Doc<'wallets'>>();
    const emailByUserId = new Map<string, string>();

    const enrich = async (rows: Doc<'wallet_transactions'>[]) => {
      const freshWalletIds = [...new Set(rows.map((row) => row.walletId))].filter(
        (id) => !walletById.has(id)
      );
      const freshWallets = await Promise.all(freshWalletIds.map((id) => ctx.db.get(id)));
      freshWalletIds.forEach((id, index) => {
        const wallet = freshWallets[index];
        if (wallet) walletById.set(id, wallet);
      });
      const freshUserIds = [
        ...new Set(freshWallets.map((wallet) => wallet?.userId).filter((id): id is Id<'users'> => id !== undefined)),
      ].filter((id) => !emailByUserId.has(id));
      const freshUsers = await Promise.all(freshUserIds.map((id) => ctx.db.get(id)));
      freshUserIds.forEach((id, index) => {
        const email = freshUsers[index]?.email;
        if (email) emailByUserId.set(id, email);
      });
    };

    const fetchBatch = (upperBound: number | undefined) =>
      ctx.db
        .query('wallet_transactions')
        .withIndex('by_created', (range) => {
          const bound = upperBound ?? initialUpper;
          if (args.from !== undefined && bound !== undefined) {
            return range.gte('createdAt', args.from).lt('createdAt', bound);
          }
          if (args.from !== undefined) return range.gte('createdAt', args.from);
          if (bound !== undefined) return range.lt('createdAt', bound);
          return range;
        })
        .order('desc')
        .take(SCAN_BATCH);

    const { items, nextCursor } = await scanIndexPage(
      fetchBatch,
      (transaction) => transaction.createdAt,
      (transaction) => {
        if (args.type !== undefined && transaction.type !== args.type) return false;
        if (args.source !== undefined && transaction.source !== args.source) return false;
        if (q) {
          const wallet = walletById.get(transaction.walletId);
          const email = wallet?.userId ? emailByUserId.get(wallet.userId) : undefined;
          const haystack = [
            email?.toLowerCase(),
            wallet?.purchaserAccountId?.toLowerCase(),
            transaction._id.toLowerCase(),
            transaction.storeTransactionId?.toLowerCase(),
            transaction.idempotencyKey?.toLowerCase(),
          ]
            .filter((value): value is string => Boolean(value))
            .join(' ');
          if (!haystack.includes(q)) return false;
        }
        return true;
      },
      limit,
      q ? enrich : undefined
    );

    await enrich(items);

    const mapped = items.map((transaction) => {
      const wallet = walletById.get(transaction.walletId);
      const email = wallet?.userId ? emailByUserId.get(wallet.userId) : undefined;
      return {
        transaction,
        wallet: wallet
          ? {
              _id: wallet._id,
              purchaserAccountId: wallet.purchaserAccountId ?? null,
              userId: wallet.userId ?? null,
            }
          : null,
        userEmail: email ?? null,
      };
    });

    return { items: mapped, nextCursor };
  },
});

// ───────────────────────────────────────────────
// Friend referrals (Give one, get one)
// ───────────────────────────────────────────────

export const listReferrals = query({
  args: {
    query: v.optional(v.string()),
    cursor: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = Math.min(args.limit ?? 50, 100);
    const q = args.query?.trim().toLowerCase();

    const userById = new Map<string, Doc<'users'>>();
    const walletById = new Map<string, Doc<'wallets'>>();

    const loadUsers = async (ids: Id<'users'>[]) => {
      const missing = ids.filter((id) => !userById.has(id));
      const rows = await Promise.all(missing.map((id) => ctx.db.get(id)));
      missing.forEach((id, index) => {
        const row = rows[index];
        if (row) userById.set(id, row);
      });
    };

    const enrichBatch = async (rows: Doc<'wallet_transactions'>[]) => {
      const walletIds = [...new Set(rows.map((row) => row.walletId))].filter(
        (id) => !walletById.has(id)
      );
      const wallets = await Promise.all(walletIds.map((id) => ctx.db.get(id)));
      walletIds.forEach((id, index) => {
        const wallet = wallets[index];
        if (wallet) walletById.set(id, wallet);
      });

      const userIds: Id<'users'>[] = [];
      for (const wallet of wallets) {
        if (wallet?.userId) userIds.push(wallet.userId);
      }
      for (const row of rows) {
        const meta = row.metadata as { inviterUserId?: Id<'users'> } | undefined;
        if (meta?.inviterUserId) userIds.push(meta.inviterUserId);
      }
      await loadUsers([...new Set(userIds)]);
    };

    const fetchBatch = (upperBound: number | undefined) =>
      ctx.db
        .query('wallet_transactions')
        .withIndex('by_created', (range) => {
          const bound = upperBound ?? args.cursor;
          if (bound !== undefined) return range.lt('createdAt', bound);
          return range;
        })
        .order('desc')
        .take(SCAN_BATCH);

    const { items, nextCursor } = await scanIndexPage(
      fetchBatch,
      (transaction) => transaction.createdAt,
      (transaction) => {
        if (transaction.type !== 'referral_invitee_grant') return false;
        if (!q) return true;

        const wallet = walletById.get(transaction.walletId);
        const invitee = wallet?.userId ? userById.get(wallet.userId) : undefined;
        const meta = transaction.metadata as
          | { inviterUserId?: Id<'users'>; code?: string }
          | undefined;
        const inviter = meta?.inviterUserId ? userById.get(meta.inviterUserId) : undefined;
        const haystack = [
          invitee?.email?.toLowerCase(),
          invitee?.name?.toLowerCase(),
          inviter?.email?.toLowerCase(),
          inviter?.name?.toLowerCase(),
          inviter?.referralCode?.toLowerCase(),
          meta?.code?.toLowerCase(),
          wallet?.purchaserAccountId?.toLowerCase(),
        ]
          .filter((value): value is string => Boolean(value))
          .join(' ');
        return haystack.includes(q);
      },
      limit,
      q ? enrichBatch : undefined
    );

    await enrichBatch(items);

    const events = items.map((transaction) => {
      const wallet = walletById.get(transaction.walletId);
      const invitee = wallet?.userId ? userById.get(wallet.userId) : undefined;
      const meta = transaction.metadata as
        | { inviterUserId?: Id<'users'>; code?: string }
        | undefined;
      const inviter = meta?.inviterUserId ? userById.get(meta.inviterUserId) : undefined;
      return {
        transactionId: transaction._id,
        createdAt: transaction.createdAt,
        tokensGranted: transaction.amount,
        code: meta?.code ?? inviter?.referralCode ?? null,
        invitee: invitee
          ? {
              userId: invitee._id,
              email: invitee.email ?? null,
              name: invitee.name ?? null,
              walletId: wallet?._id ?? null,
            }
          : null,
        inviter: inviter
          ? {
              userId: inviter._id,
              email: inviter.email ?? null,
              name: inviter.name ?? null,
              referralCode: inviter.referralCode ?? null,
              successfulReferralCount: inviter.successfulReferralCount ?? 0,
            }
          : meta?.inviterUserId
            ? {
                userId: meta.inviterUserId,
                email: null,
                name: null,
                referralCode: meta.code ?? null,
                successfulReferralCount: 0,
              }
            : null,
      };
    });

    // Snapshot of outbound leaders (full user scan; admin-only, small product scale).
    const allUsers = await ctx.db.query('users').collect();
    const topReferrers = allUsers
      .filter((user) => (user.successfulReferralCount ?? 0) > 0)
      .sort(
        (a, b) => (b.successfulReferralCount ?? 0) - (a.successfulReferralCount ?? 0)
      )
      .slice(0, 25)
      .map((user) => ({
        userId: user._id,
        email: user.email ?? null,
        name: user.name ?? null,
        referralCode: user.referralCode ?? null,
        successfulReferralCount: user.successfulReferralCount ?? 0,
      }));

    const totalSuccessfulReferrals = allUsers.filter(
      (user) => user.referredByUserId != null
    ).length;
    const totalReferrers = allUsers.filter(
      (user) => (user.successfulReferralCount ?? 0) > 0
    ).length;

    return {
      items: events,
      nextCursor,
      stats: {
        totalSuccessfulReferrals,
        totalReferrers,
        rewardTokens: REFERRAL_REWARD_TOKENS,
      },
      topReferrers,
    };
  },
});

// ───────────────────────────────────────────────
// Admin Audit Log
// ───────────────────────────────────────────────

export const listAuditLog = query({
  args: {
    action: v.optional(v.string()),
    targetType: v.optional(v.string()),
    cursor: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = Math.min(args.limit ?? 50, 100);

    const fetchBatch = (upperBound: number | undefined) =>
      ctx.db
        .query('admin_audit_log')
        .withIndex('by_timestamp', (range) => {
          const bound = upperBound ?? args.cursor;
          if (bound !== undefined) return range.lt('timestamp', bound);
          return range;
        })
        .order('desc')
        .take(SCAN_BATCH);

    const { items, nextCursor } = await scanIndexPage(
      fetchBatch,
      (log) => log.timestamp,
      (log) => {
        if (args.action !== undefined && log.action !== args.action) return false;
        if (args.targetType !== undefined && log.targetType !== args.targetType) return false;
        return true;
      },
      limit
    );

    return { items, nextCursor };
  },
});

export const listQuestionReports = query({
  args: {
    cursor: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = Math.min(args.limit ?? 50, 100);
    const rows = await ctx.db
      .query('question_reports')
      .withIndex('by_created', (range) => {
        if (args.cursor !== undefined) return range.lt('createdAt', args.cursor);
        return range;
      })
      .order('desc')
      .take(limit + 1);
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items[items.length - 1];
    return {
      items,
      nextCursor: hasMore && last ? last.createdAt : undefined,
    };
  },
});

// ───────────────────────────────────────────────
// Admin Dashboard Stats
// ───────────────────────────────────────────────

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** Start-of-month epochs for the trailing `count` months, oldest first. */
function buildMonthBuckets(
  now: number,
  count: number
): { start: number; end: number; label: string }[] {
  const buckets: { start: number; end: number; label: string }[] = [];
  const cursor = new Date(now);
  cursor.setDate(1);
  cursor.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const end = cursor.getTime();
    cursor.setMonth(cursor.getMonth() - 1);
    const start = cursor.getTime();
    buckets.unshift({ start, end, label: MONTH_LABELS[new Date(start).getMonth()] });
  }
  return buckets;
}

/** Percent change of `current` vs `previous`; null when there is no baseline. */
function monthDeltaPct(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const now = Date.now();
    const buckets = buildMonthBuckets(now, 12);
    const windowStart = buckets[0].start;

    // Revenue / purchase counts come from store_purchases (real money charged),
    // windowed to the trailing 12 months so the dashboard stays bounded.
    const purchases = await ctx.db
      .query('store_purchases')
      .withIndex('by_purchased_at', (q) => q.gte('purchasedAt', windowStart))
      .order('desc')
      .collect();
    const granted = purchases.filter((purchase) => purchase.status === 'granted');

    const revenueByMonth = buckets.map(() => 0);
    const purchasesByMonth = buckets.map(() => 0);
    let currencyCode: string | undefined;
    for (const purchase of granted) {
      const idx = buckets.findIndex(
        (bucket) => purchase.purchasedAt >= bucket.start && purchase.purchasedAt < bucket.end
      );
      if (idx === -1) continue;
      if (typeof purchase.priceAmountMicros === 'number') {
        revenueByMonth[idx] += purchase.priceAmountMicros;
        if (purchase.currencyCode) currencyCode = purchase.currencyCode;
      }
      purchasesByMonth[idx] += 1;
    }

    const monthlyRevenue = buckets.map((bucket, index) => ({
      label: bucket.label,
      total: revenueByMonth[index],
    }));
    const totalRevenue = revenueByMonth.reduce((sum, value) => sum + value, 0);
    const purchasesTotal = purchasesByMonth.reduce((sum, value) => sum + value, 0);
    const revenueDeltaPct = monthDeltaPct(
      revenueByMonth[revenueByMonth.length - 1],
      revenueByMonth[revenueByMonth.length - 2]
    );
    const purchasesDeltaPct = monthDeltaPct(
      purchasesByMonth[purchasesByMonth.length - 1],
      purchasesByMonth[purchasesByMonth.length - 2]
    );

    // Promo code health (small table; same full-scan pattern as listPromoCodes).
    const promoCodes = await ctx.db.query('promo_codes').collect();
    const activePromoCodes = promoCodes.filter(
      (promo) => derivePromoCodeStatus(promo, now) === 'active'
    ).length;
    const totalRedemptions = promoCodes.reduce(
      (sum, promo) => sum + (promo.usedCount ?? 0),
      0
    );

    // Latest wallet activity with account labels (mirrors listTransactions enrichment).
    const recent = await ctx.db
      .query('wallet_transactions')
      .withIndex('by_created')
      .order('desc')
      .take(6);

    const walletById = new Map<string, Doc<'wallets'>>();
    const emailByUserId = new Map<string, string>();
    const freshWalletIds = [...new Set(recent.map((transaction) => transaction.walletId))];
    const freshWallets = await Promise.all(freshWalletIds.map((id) => ctx.db.get(id)));
    freshWalletIds.forEach((id, index) => {
      const wallet = freshWallets[index];
      if (wallet) walletById.set(id, wallet);
    });
    const freshUserIds = [
      ...new Set(
        freshWallets
          .map((wallet) => wallet?.userId)
          .filter((id): id is Id<'users'> => id !== undefined)
      ),
    ];
    const freshUsers = await Promise.all(freshUserIds.map((id) => ctx.db.get(id)));
    freshUserIds.forEach((id, index) => {
      const email = freshUsers[index]?.email;
      if (email) emailByUserId.set(id, email);
    });

    const recentTransactions = recent.map((transaction) => {
      const wallet = walletById.get(transaction.walletId);
      const email = wallet?.userId ? emailByUserId.get(wallet.userId) : undefined;
      return {
        id: transaction._id,
        account: email ?? wallet?.purchaserAccountId ?? null,
        type: transaction.type,
        amount: transaction.amount,
        createdAt: transaction.createdAt,
        walletId: transaction.walletId,
        purchaseId: transaction.purchaseId ?? null,
      };
    });

    return {
      currencyCode: currencyCode ?? 'USD',
      totalRevenue,
      revenueDeltaPct,
      purchasesTotal,
      purchasesDeltaPct,
      activePromoCodes,
      totalPromoCodes: promoCodes.length,
      totalRedemptions,
      monthlyRevenue,
      recentTransactions,
    };
  },
});

// ───────────────────────────────────────────────
// RevenueCat discount provisioning (actions + internal mutations)
//
// Two-phase state machine for discount promos:
//
//   pending ──create discount──> pending (discount id persisted)
//           ──attach code──> pending (code attached)
//           ──finalize──> provisioned (active=true)
//           ──schedule expiry──> (scheduler.runAt(activeTo))
//
//   provisioned ──deactivate──> disable_pending (active=false, provider not yet disabled)
//               ──reconcile disable──> disabled
//               ──expiry (activeTo passed)──> disable_pending ──reconcile──> disabled
//
//   failed: provisioning failed at any step; admin can retry. The persisted
//   revenueCatDiscountId lets a retry reuse the provider discount instead of
//   colliding on the deterministic identifier.
//
// Key invariants:
//  - The provider discount id is persisted immediately after create, while the
//    local promo stays inactive/pending. A retry reuses it.
//  - Code attachment is idempotent via ensureDiscountCode (409 -> verify).
//  - If local finalization fails after the provider code exists, we
//    best-effort delete the code + disable the discount so no active provider
//    code is left silently. The local row stays pending/failed for retry.
//  - Deactivation sets disable_pending (not disabled) until the provider
//    disable succeeds (or 404). The hourly reconciliation retries.
//  - Validation rejects anything other than `provisioned`.
// ───────────────────────────────────────────────

/**
 * Internal mutation: persist the provider discount id + identifier immediately
 * after the discount is created, while the local promo remains inactive and
 * pending. This is the critical durability step: if code attachment or
 * finalization fails afterwards, a retry reuses this id instead of colliding
 * on the deterministic identifier.
 */
export const persistDiscountId = internalMutation({
  args: {
    promoCodeId: v.id('promo_codes'),
    revenueCatDiscountId: v.string(),
    revenueCatDiscountIdentifier: v.string(),
  },
  handler: async (ctx, args) => {
    const promo = await ctx.db.get(args.promoCodeId);
    if (!promo) {
      throw new Error('promo_code_not_found');
    }
    await ctx.db.patch(args.promoCodeId, {
      revenueCatDiscountId: args.revenueCatDiscountId,
      revenueCatDiscountIdentifier: args.revenueCatDiscountIdentifier,
      updatedAt: Date.now(),
    });
    return { promoCodeId: args.promoCodeId };
  },
});

/**
 * Internal mutation: clear a stale provider discount id + identifier from the
 * local promo. Used when a retry discovers the persisted provider discount no
 * longer exists (enableDiscount returns 404), so the same provisioning attempt
 * can create a fresh discount and persist the new id.
 */
export const clearStaleDiscountId = internalMutation({
  args: {
    promoCodeId: v.id('promo_codes'),
  },
  handler: async (ctx, args) => {
    const promo = await ctx.db.get(args.promoCodeId);
    if (!promo) {
      throw new Error('promo_code_not_found');
    }
    await ctx.db.patch(args.promoCodeId, {
      revenueCatDiscountId: undefined,
      revenueCatDiscountIdentifier: undefined,
      updatedAt: Date.now(),
    });
    return { promoCodeId: args.promoCodeId };
  },
});

/**
 * Internal mutation: finalize a discount promo after the provider discount +
 * code are created and the id is persisted. Sets active=true,
 * provisioning=provisioned, clears any provisioning error. If an activeTo is
 * set, schedules an exact-time expiry via ctx.scheduler.runAt.
 */
export const finalizeDiscountProvisioning = internalMutation({
  args: {
    promoCodeId: v.id('promo_codes'),
  },
  handler: async (ctx, args) => {
    const promo = await ctx.db.get(args.promoCodeId);
    if (!promo) {
      throw new Error('promo_code_not_found');
    }
    await ctx.db.patch(args.promoCodeId, {
      active: true,
      revenueCatProvisioningStatus: 'provisioned',
      provisioningError: undefined,
      updatedAt: Date.now(),
    });
    // Schedule exact-time expiry if activeTo is in the future. The hourly
    // reconciliation is the fallback if this scheduled function is lost.
    if (typeof promo.activeTo === 'number' && promo.activeTo > Date.now()) {
      await ctx.scheduler.runAt(promo.activeTo, internal.admin.disableExpiredDiscount, {
        promoCodeId: args.promoCodeId,
      });
    }
    return { promoCodeId: args.promoCodeId };
  },
});

/**
 * Internal mutation: mark a discount promo as failed provisioning. Called by
 * the provisioning action when a step fails. The promo stays inactive so it
 * can never be presented as usable. Stores the error message for admin
 * diagnostics. Preserves any persisted revenueCatDiscountId so a retry can
 * reuse the provider discount.
 */
export const markDiscountProvisioningFailed = internalMutation({
  args: {
    promoCodeId: v.id('promo_codes'),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const promo = await ctx.db.get(args.promoCodeId);
    if (!promo) {
      throw new Error('promo_code_not_found');
    }
    await ctx.db.patch(args.promoCodeId, {
      active: false,
      revenueCatProvisioningStatus: 'failed',
      provisioningError: args.error,
      updatedAt: Date.now(),
    });
    return { promoCodeId: args.promoCodeId };
  },
});

/**
 * Internal mutation: load a discount promo for provisioning. Returns the
 * fields the action needs to call RevenueCat. Internal so it cannot be called
 * from the client; admin auth is enforced by the action that calls it.
 */
export const getDiscountPromoForProvisioning = internalMutation({
  args: {
    promoCodeId: v.id('promo_codes'),
  },
  handler: async (ctx, args) => {
    const promo = await ctx.db.get(args.promoCodeId);
    if (!promo) {
      throw new Error('promo_code_not_found');
    }
    if (promo.rewardType !== 'discount') {
      throw new Error('not_a_discount_code');
    }
    return {
      code: promo.code,
      providerCode: promo.revenueCatProviderCode ?? promo.code.toUpperCase(),
      discountPercent: promo.discountPercent ?? 0,
      productKey: promo.productKey ?? null,
      provisioningStatus: promo.revenueCatProvisioningStatus ?? null,
      discountId: promo.revenueCatDiscountId ?? null,
      activeTo: promo.activeTo ?? null,
    };
  },
});

/**
 * Action: provision a RevenueCat discount + code for a discount promo.
 *
 * Real two-phase state machine:
 *  1. createPromoCode inserted the promo as active=false, provisioning=pending.
 *  2. Obtain a usable provider discount id:
 *     - If no revenueCatDiscountId is persisted, create the provider discount
 *       and persist its id immediately (persistDiscountId). The promo stays
 *       pending.
 *     - On retry with a persisted id, enable the discount first (a prior
 *       compensating cleanup may have disabled it). If the provider discount
 *       is gone (404), the persisted id is stale: clear it locally
 *       (clearStaleDiscountId) and create a fresh discount in this same
 *       attempt, then persist the new id.
 *  3. Attach the code via ensureDiscountCode (idempotent: 409 -> verify the
 *     code exists on this exact discount).
 *  4. finalizeDiscountProvisioning sets active=true, provisioning=provisioned,
 *     and schedules exact-time expiry if activeTo is set.
 *  5. On any failure, compensating cleanup ensures no usable provider code
 *     remains while the local promo is inactive:
 *     - Case A: the discount was created this run but persistDiscountId failed.
 *       Best-effort DELETE the orphan provider discount. If delete fails,
 *       surface a manual cleanup error (safe automatic retry is impossible
 *       because the deterministic identifier would collide).
 *     - Case B (all other failures with a known discountId): best-effort delete
 *       the provider code and disable the provider discount, regardless of
 *       whether ensureDiscountCode reported success. The code may be attached
 *       remotely despite a thrown response (5xx/network after remote success),
 *       so cleanup is always attempted. Both operations are idempotent
 *       (404-safe). The persisted id is preserved so a retry can re-enable and
 *       re-attach. If cleanup fails, surface a manual cleanup error.
 *     markDiscountProvisioningFailed keeps the local promo inactive and
 *     records the error (including any cleanup failure).
 *
 * Admin-only (enforced via getPromoCode which calls requireAdmin). Safe to
 * retry: a retry reuses the persisted discount id, re-enables it (or recovers
 * automatically if the provider discount is gone), and idempotently re-attaches
 * the code.
 */
export const provisionDiscountPromo = action({
  args: {
    promoCodeId: v.id('promo_codes'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }
    // Enforce admin via getPromoCode (requireAdmin).
    const promoDetail = await ctx.runQuery(api.admin.getPromoCode, {
      promoCodeId: args.promoCodeId,
    });
    if (!promoDetail) {
      throw new Error('promo_code_not_found');
    }

    const promo = await ctx.runMutation(
      internal.admin.getDiscountPromoForProvisioning,
      { promoCodeId: args.promoCodeId }
    );

    if (!promo.productKey) {
      throw new Error('discount_product_key_missing');
    }
    const productIdentifier = getDefaultWebProductIdentifierForProductKey(promo.productKey);
    if (!productIdentifier) {
      throw new Error('discount_product_identifier_not_found');
    }

    const identifier = buildRevenueCatDiscountIdentifier(promo.code);
    let discountId = promo.discountId;
    let discountCreatedThisRun = false;
    let idPersistedThisRun = false;

    try {
      // Phase 1: obtain a usable provider discount id.
      if (!discountId) {
        // No persisted id: create a new provider discount.
        const discount = await createPercentageDiscount({
          identifier,
          customerFacingName: `Promo ${promo.code}`,
          percentage: promo.discountPercent,
          productIdentifier,
        });
        discountId = discount.id;
        discountCreatedThisRun = true;
        // Persist the id immediately so a retry can reuse it even if the
        // next step fails. The promo stays inactive/pending.
        await ctx.runMutation(internal.admin.persistDiscountId, {
          promoCodeId: args.promoCodeId,
          revenueCatDiscountId: discountId,
          revenueCatDiscountIdentifier: identifier,
        });
        idPersistedThisRun = true;
      } else {
        // Retry path: the discount exists at the provider but may have been
        // disabled by a prior compensating cleanup. Enable it before
        // re-attaching the code so the code is usable after finalization.
        // If the provider discount is gone (404), the persisted id is stale:
        // clear it locally and create a fresh discount in this same attempt.
        try {
          await enableDiscount({ discountId });
        } catch (enableErr) {
          if (isDiscountNotFoundError(enableErr)) {
            // Stale provider id: clear it and create a fresh discount.
            await ctx.runMutation(internal.admin.clearStaleDiscountId, {
              promoCodeId: args.promoCodeId,
            });
            const discount = await createPercentageDiscount({
              identifier,
              customerFacingName: `Promo ${promo.code}`,
              percentage: promo.discountPercent,
              productIdentifier,
            });
            discountId = discount.id;
            discountCreatedThisRun = true;
            await ctx.runMutation(internal.admin.persistDiscountId, {
              promoCodeId: args.promoCodeId,
              revenueCatDiscountId: discountId,
              revenueCatDiscountIdentifier: identifier,
            });
            idPersistedThisRun = true;
          } else {
            throw enableErr;
          }
        }
      }

      // Phase 2: attach the code idempotently. On 409, ensureDiscountCode
      // verifies the code exists on this exact discount before treating as
      // success. Note: a 5xx or network error after the provider accepted the
      // code means the code may be attached remotely even though this call
      // threw. The catch block handles that by always cleaning up.
      await ensureDiscountCode({
        discountId,
        code: promo.providerCode,
      });

      // Phase 3: finalize. Sets active=true, provisioning=provisioned, and
      // schedules exact-time expiry if activeTo is set.
      await ctx.runMutation(internal.admin.finalizeDiscountProvisioning, {
        promoCodeId: args.promoCodeId,
      });

      return { ok: true as const, promoCodeId: args.promoCodeId };
    } catch (error) {
      const message =
        error instanceof RevenueCatV2Error
          ? error.message
          : error instanceof Error
            ? error.message
            : 'unknown_provisioning_error';

      // Compensating cleanup so no usable provider code remains while the
      // local promo is inactive. The persisted id is preserved so a retry can
      // re-enable the discount and re-attach the code.
      //
      // Case A: we created the discount this run but persistDiscountId failed
      // (idPersistedThisRun is false). The discount exists at the provider with
      // no local id, and a retry would collide on the deterministic identifier.
      // Best-effort DELETE that orphan discount. If delete fails, surface a
      // manual cleanup error because safe automatic retry is not possible.
      //
      // Case B (all other failures with a known discountId): the id was
      // persisted (this run or a prior run) and any step after that failed.
      // The code may be attached at the provider even if ensureDiscountCode
      // threw (5xx/network after remote success), so we always best-effort
      // delete the provider code and disable the provider discount. Both
      // operations are idempotent (404-safe). The persisted id is kept so a
      // retry can re-enable and re-attach.
      let cleanupError: string | undefined;
      if (discountCreatedThisRun && !idPersistedThisRun && discountId) {
        // Case A: orphan discount with no local id.
        try {
          await deleteDiscount({ discountId });
        } catch (cleanupErr) {
          cleanupError =
            cleanupErr instanceof RevenueCatV2Error
              ? cleanupErr.message
              : String(cleanupErr);
        }
      } else if (discountId) {
        // Case B: any failure after the id was persisted or reused. Always
        // attempt to delete the provider code and disable the discount,
        // regardless of whether ensureDiscountCode reported success. The
        // code may be attached remotely despite a thrown response.
        try {
          await deleteDiscountCode({
            discountId,
            code: promo.providerCode,
          });
        } catch (cleanupErr) {
          cleanupError =
            cleanupErr instanceof RevenueCatV2Error
              ? cleanupErr.message
              : String(cleanupErr);
        }
        try {
          await disableDiscount({ discountId });
        } catch (cleanupErr) {
          const disableErr =
            cleanupErr instanceof RevenueCatV2Error
              ? cleanupErr.message
              : String(cleanupErr);
          cleanupError = cleanupError
            ? `${cleanupError}; ${disableErr}`
            : disableErr;
        }
      }

      const finalError = cleanupError
        ? `${message}. Manual provider cleanup required: ${cleanupError}`
        : message;

      await ctx.runMutation(internal.admin.markDiscountProvisioningFailed, {
        promoCodeId: args.promoCodeId,
        error: finalError,
      });

      return { ok: false as const, error: finalError };
    }
  },
});

/**
 * Internal mutation: mark a discount promo as disable_pending (active=false,
 * provider not yet disabled). Used by the deactivation action when the
 * provider disable could not complete (env not configured or transient
 * failure). Validation rejects disable_pending, so the code is not usable
 * locally. The hourly reconciliation retries the provider disable.
 */
export const markDiscountDisablePending = internalMutation({
  args: {
    promoCodeId: v.id('promo_codes'),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const promo = await ctx.db.get(args.promoCodeId);
    if (!promo) {
      throw new Error('promo_code_not_found');
    }
    const metadata = promo.metadata ?? {};
    await ctx.db.patch(args.promoCodeId, {
      active: false,
      revenueCatProvisioningStatus: 'disable_pending',
      updatedAt: Date.now(),
      metadata: { ...metadata, deactivationReason: args.reason },
    });
    return { promoCodeId: args.promoCodeId };
  },
});

/**
 * Internal mutation: mark a discount promo as fully disabled (active=false,
 * provider disabled). Used after a successful provider disable (or 404).
 */
export const markDiscountDisabled = internalMutation({
  args: {
    promoCodeId: v.id('promo_codes'),
  },
  handler: async (ctx, args) => {
    const promo = await ctx.db.get(args.promoCodeId);
    if (!promo) {
      throw new Error('promo_code_not_found');
    }
    await ctx.db.patch(args.promoCodeId, {
      active: false,
      revenueCatProvisioningStatus: 'disabled',
      updatedAt: Date.now(),
    });
    return { promoCodeId: args.promoCodeId };
  },
});

/**
 * Action: deactivate a discount promo. Admin-only.
 *
 * Sets local active=false immediately (via markDiscountDisablePending) so
 * validation rejects the code, then attempts the provider disable. If the
 * provider disable succeeds (or 404), marks the promo fully disabled. If it
 * fails (env not configured or transient error), the promo stays
 * disable_pending and the hourly reconciliation retries the provider disable.
 * The error is surfaced to the admin.
 */
export const deactivateDiscountPromo = action({
  args: {
    promoCodeId: v.id('promo_codes'),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    // Enforce admin via getPromoCode (requireAdmin).
    const promoDetail = await ctx.runQuery(api.admin.getPromoCode, {
      promoCodeId: args.promoCodeId,
    });
    if (!promoDetail) {
      throw new Error('promo_code_not_found');
    }

    const promo = promoDetail.promoCode;
    if (promo.rewardType !== 'discount') {
      // Token codes: just run the local deactivation mutation.
      await ctx.runMutation(api.admin.deactivatePromoCode, {
        promoCodeId: args.promoCodeId,
        reason: args.reason,
      });
      return { ok: true as const };
    }

    // Discount codes: set disable_pending first (local active=false), then
    // attempt the provider disable. This ordering means the code is never
    // usable locally while the provider coupon might still be active.
    await ctx.runMutation(internal.admin.markDiscountDisablePending, {
      promoCodeId: args.promoCodeId,
      reason: args.reason,
    });

    if (!promo.revenueCatDiscountId) {
      // No provider discount to disable (e.g. provisioning never completed).
      // Mark fully disabled.
      await ctx.runMutation(internal.admin.markDiscountDisabled, {
        promoCodeId: args.promoCodeId,
      });
      return { ok: true as const };
    }

    try {
      await disableDiscount({ discountId: promo.revenueCatDiscountId });
      await ctx.runMutation(internal.admin.markDiscountDisabled, {
        promoCodeId: args.promoCodeId,
      });
      return { ok: true as const };
    } catch (error) {
      const message =
        error instanceof RevenueCatV2Error ? error.message : String(error);
      // Provider disable failed. The promo is already disable_pending (local
      // active=false). The hourly reconciliation will retry. Surface the error.
      return { ok: false as const, error: message, disablePending: true };
    }
  },
});

/**
 * Internal query: list discount promos that need provider disable
 * reconciliation. NO AUTH (called by the unauthenticated cron/internal action).
 * Returns promos in two states:
 *  - provisioned + activeTo passed (expired)
 *  - disable_pending (deactivation could not reach the provider)
 * Both need the provider discount disabled; only on success does the status
 * become `disabled`.
 */
export const listDiscountsNeedingReconciliation = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const provisioned = await ctx.db
      .query('promo_codes')
      .withIndex('by_rc_provisioning', (q) => q.eq('revenueCatProvisioningStatus', 'provisioned'))
      .collect();
    const disablePending = await ctx.db
      .query('promo_codes')
      .withIndex('by_rc_provisioning', (q) => q.eq('revenueCatProvisioningStatus', 'disable_pending'))
      .collect();
    const expired = provisioned.filter(
      (promo) =>
        promo.rewardType === 'discount' &&
        typeof promo.activeTo === 'number' &&
        promo.activeTo <= now &&
        promo.active !== false
    );
    const pending = disablePending.filter((promo) => promo.rewardType === 'discount');
    return [...expired, ...pending].map((promo) => ({
      promoCodeId: promo._id,
      revenueCatDiscountId: promo.revenueCatDiscountId ?? null,
      activeTo: promo.activeTo ?? null,
    }));
  },
});

/**
 * Internal action: disable a single expired discount promo. Scheduled via
 * ctx.scheduler.runAt(activeTo) at provisioning time for exact-time expiry.
 * Idempotent: if the promo is already disabled/not found, returns ok.
 */
export const disableExpiredDiscount = internalAction({
  args: {
    promoCodeId: v.id('promo_codes'),
  },
  handler: async (ctx, args) => {
    const promo = await ctx.runQuery(internal.admin.getPromoCodeForReconciliation, {
      promoCodeId: args.promoCodeId,
    });
    if (!promo) {
      return { ok: true as const, skipped: 'not_found' };
    }
    // Only act on provisioned promos whose activeTo has passed. If already
    // disabled or disable_pending, the hourly reconciliation handles it.
    if (promo.revenueCatProvisioningStatus !== 'provisioned') {
      return { ok: true as const, skipped: 'already_reconciling' };
    }
    const now = Date.now();
    if (typeof promo.activeTo === 'number' && promo.activeTo > now) {
      return { ok: true as const, skipped: 'not_yet_expired' };
    }
    // Mark disable_pending first (local active=false) so the code is not
    // usable even if the provider disable fails.
    await ctx.runMutation(internal.admin.markDiscountDisablePending, {
      promoCodeId: args.promoCodeId,
      reason: 'scheduled_expiry',
    });
    if (!promo.revenueCatDiscountId) {
      await ctx.runMutation(internal.admin.markDiscountDisabled, {
        promoCodeId: args.promoCodeId,
      });
      return { ok: true as const };
    }
    try {
      await disableDiscount({ discountId: promo.revenueCatDiscountId });
      await ctx.runMutation(internal.admin.markDiscountDisabled, {
        promoCodeId: args.promoCodeId,
      });
      return { ok: true as const };
    } catch (error) {
      const message =
        error instanceof RevenueCatV2Error ? error.message : String(error);
      // Leave as disable_pending; hourly reconciliation retries.
      return { ok: false as const, error: message };
    }
  },
});

/**
 * Internal query: load a single discount promo for reconciliation. NO AUTH
 * (called by the unauthenticated scheduled action).
 */
export const getPromoCodeForReconciliation = internalQuery({
  args: {
    promoCodeId: v.id('promo_codes'),
  },
  handler: async (ctx, args) => {
    const promo = await ctx.db.get(args.promoCodeId);
    if (!promo) {
      return null;
    }
    return {
      promoCodeId: promo._id,
      rewardType: promo.rewardType,
      active: promo.active,
      activeTo: promo.activeTo ?? null,
      revenueCatProvisioningStatus: promo.revenueCatProvisioningStatus ?? null,
      revenueCatDiscountId: promo.revenueCatDiscountId ?? null,
    };
  },
});

/**
 * Internal action: hourly reconciliation. Disables RevenueCat discounts for:
 *  - expired provisioned promos (activeTo passed)
 *  - disable_pending promos (deactivation that could not reach the provider)
 *
 * Best-effort: each promo is handled independently so one provider failure
 * does not block the rest. Only marks `disabled` after a successful provider
 * disable (or 404). NO AUTH (called by the cron).
 */
export const reconcileDiscountLifecycle = internalAction({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.runQuery(internal.admin.listDiscountsNeedingReconciliation, {});
    const results: { promoCodeId: string; ok: boolean; error?: string }[] = [];
    for (const item of items) {
      // Ensure disable_pending is set (local active=false) before attempting
      // the provider disable, so the code is not usable locally even if the
      // provider disable fails this round.
      await ctx.runMutation(internal.admin.markDiscountDisablePending, {
        promoCodeId: item.promoCodeId,
        reason: 'reconciliation_expiry_or_deactivation',
      });
      if (!item.revenueCatDiscountId) {
        await ctx.runMutation(internal.admin.markDiscountDisabled, {
          promoCodeId: item.promoCodeId,
        });
        results.push({ promoCodeId: item.promoCodeId, ok: true });
        continue;
      }
      try {
        await disableDiscount({ discountId: item.revenueCatDiscountId });
        await ctx.runMutation(internal.admin.markDiscountDisabled, {
          promoCodeId: item.promoCodeId,
        });
        results.push({ promoCodeId: item.promoCodeId, ok: true });
      } catch (error) {
        const message =
          error instanceof RevenueCatV2Error ? error.message : String(error);
        // Leave as disable_pending for the next reconciliation round.
        results.push({ promoCodeId: item.promoCodeId, ok: false, error: message });
      }
    }
    return { processed: results.length, results };
  },
});
