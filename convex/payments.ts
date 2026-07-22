import { httpAction, internalMutation, mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { ensureWalletDoc } from './lib/ensureWallet';
import {
  buildPurchaseReversalIdempotencyKey,
  normalizeRevenueCatAliases,
  normalizeRevenueCatStore,
} from './lib/paymentWebhook';
import { mergePurchaserAccountIntoTarget } from './lib/purchaserAccountMerge';
import { canClientSyncConsumablePurchase } from './lib/clientPurchaseSync';
import { grantConsumablePurchase } from './lib/grantConsumablePurchase';
import {
  DEFAULT_TOKEN_PRODUCTS,
  findTokenProductByStoreProductId,
} from './lib/paymentCatalog';
import { getCurrentUser, requireUser } from './lib/auth';
import {
  ensureCanonicalPurchaserAccountForUser,
  getPurchaserAccountByAppUserId,
  isMergeableGuestPurchaserAccount,
  isPurchaserAccountUsable,
  shouldRebindInstallationToCanonical,
} from './lib/purchaserAccounts';
import type { Id } from './_generated/dataModel';

function getEvent(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {};
  }

  const event = 'event' in payload ? (payload as { event: unknown }).event : payload;
  return event && typeof event === 'object' && !Array.isArray(event)
    ? (event as Record<string, unknown>)
    : {};
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

async function listTokenProducts(ctx: QueryCtx | MutationCtx) {
  const stored = await ctx.db.query('token_products').withIndex('by_sort_order').collect();
  if (stored.length > 0) {
    return stored.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  return DEFAULT_TOKEN_PRODUCTS.map((product) => ({
    ...product,
    _id: undefined,
    _creationTime: 0,
    createdAt: 0,
    updatedAt: 0,
  }));
}

async function findMatchingPurchaserAccount(
  ctx: MutationCtx,
  appUserIds: string[]
) {
  for (const appUserId of appUserIds) {
    const purchaserAccount = await getPurchaserAccountByAppUserId(ctx, appUserId);
    if (purchaserAccount) {
      // Deleted accounts keep purchase history but must never receive new grants.
      if (!isPurchaserAccountUsable(purchaserAccount) && purchaserAccount.state !== 'merged') {
        continue;
      }
      if (purchaserAccount.state === 'merged' && purchaserAccount.mergedIntoId) {
        const target =
          (await getPurchaserAccountByAppUserId(ctx, purchaserAccount.mergedIntoId)) ??
          purchaserAccount;
        if (!isPurchaserAccountUsable(target)) {
          continue;
        }
        return target;
      }
      return purchaserAccount;
    }
  }

  return null;
}

async function upsertInstallationRecord({
  ctx,
  installationId,
  purchaserAccountId,
  userId,
  platform,
  appVersion,
}: {
  ctx: MutationCtx;
  installationId: string;
  purchaserAccountId: string;
  userId?: Id<'users'>;
  platform: string;
  appVersion: string;
}) {
  const now = Date.now();
  const installation = await ctx.db
    .query('device_installations')
    .withIndex('by_device', (q) => q.eq('deviceId', installationId))
    .unique();

  if (installation) {
    await ctx.db.patch(installation._id, {
      purchaserAccountId,
      userId,
      platform,
      appVersion,
      lastSeenAt: now,
    });
    return;
  }

  await ctx.db.insert('device_installations', {
    deviceId: installationId,
    purchaserAccountId,
    userId,
    platform,
    appVersion,
    firstSeenAt: now,
    lastSeenAt: now,
  });
}

export const ensurePurchaserAccount = mutation({
  args: {
    installationId: v.string(),
    platform: v.string(),
    appVersion: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const installation = await ctx.db
      .query('device_installations')
      .withIndex('by_device', (q) => q.eq('deviceId', args.installationId))
      .unique();

    let installationPurchaserAccount = installation?.purchaserAccountId
      ? await getPurchaserAccountByAppUserId(ctx, installation.purchaserAccountId)
      : null;

    if (installationPurchaserAccount?.state === 'merged' && installationPurchaserAccount.mergedIntoId) {
      installationPurchaserAccount =
        await getPurchaserAccountByAppUserId(ctx, installationPurchaserAccount.mergedIntoId);
    }

    // Unlinked/deleted purchaser accounts cannot be reclaimed via device binding.
    if (installationPurchaserAccount && !isPurchaserAccountUsable(installationPurchaserAccount)) {
      installationPurchaserAccount = null;
    }

    const canonicalPurchaserAccount = user
      ? await ensureCanonicalPurchaserAccountForUser(ctx, user)
      : null;

    // A signed-in user must never inherit another user's identified account.
    // Only keep the installation account when it is a real guest wallet
    // (candidate for guest→user merge). Otherwise rebind to canonical.
    if (
      canonicalPurchaserAccount &&
      installationPurchaserAccount &&
      shouldRebindInstallationToCanonical(
        installationPurchaserAccount,
        canonicalPurchaserAccount
      )
    ) {
      installationPurchaserAccount = canonicalPurchaserAccount;
    }

    if (!installationPurchaserAccount) {
      if (canonicalPurchaserAccount && !installation) {
        installationPurchaserAccount = canonicalPurchaserAccount;
      } else {
        const now = Date.now();
        const appUserId = crypto.randomUUID();

        await ctx.db.insert('purchaser_accounts', {
          appUserId,
          kind: 'guest',
          state: 'active',
          createdAt: now,
          lastSeenAt: now,
          lastPlatform: args.platform,
          lastAppVersion: args.appVersion,
        });

        installationPurchaserAccount = await getPurchaserAccountByAppUserId(ctx, appUserId);
      }
    }

    if (!installationPurchaserAccount) {
      throw new Error('Purchaser account creation failed');
    }

    await upsertInstallationRecord({
      ctx,
      installationId: args.installationId,
      purchaserAccountId: installationPurchaserAccount.appUserId,
      userId: user?._id,
      platform: args.platform,
      appVersion: args.appVersion,
    });

    const now = Date.now();
    await ctx.db.patch(installationPurchaserAccount._id, {
      lastSeenAt: now,
      lastPlatform: args.platform,
      lastAppVersion: args.appVersion,
    });

    return {
      purchaserAccountId: installationPurchaserAccount.appUserId,
      linkedUserId: user?._id ?? null,
      canonicalPurchaserAccountId:
        canonicalPurchaserAccount &&
        canonicalPurchaserAccount.appUserId !== installationPurchaserAccount.appUserId
          ? canonicalPurchaserAccount.appUserId
          : canonicalPurchaserAccount?.appUserId ?? null,
    };
  },
});

export const getCatalog = query({
  args: {},
  handler: async (ctx) => {
    const products = await listTokenProducts(ctx);
    return products
      .filter((product) => product.isActive)
      .map((product) => ({
        productKey: product.productKey,
        tokensGranted: product.tokensGranted,
        iosProductId: product.iosProductId,
        androidProductId: product.androidProductId,
        isActive: product.isActive,
        sortOrder: product.sortOrder,
      }));
  },
});

export const getPurchaseSupportState = query({
  args: {},
  handler: async () => {
    return {
      requiresAccountForGuaranteedRestore: true,
      canUseGuestMode: true,
    };
  },
});

export const syncConsumablePurchase = mutation({
  args: {
    purchaserAccountId: v.string(),
    productId: v.string(),
    transactionId: v.string(),
    store: v.union(
      v.literal('app_store'),
      v.literal('play_store'),
      v.literal('test_store')
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Production store grants stay webhook-only (anti-forgery).
    // Test Store has no reliable Play/App receipt path in debug APKs, so we
    // grant immediately after a successful RevenueCat Test Store purchase.
    if (!canClientSyncConsumablePurchase(args.store)) {
      return { granted: false as const, pending: true as const, tokensGranted: 0, balance: null };
    }

    if (!args.transactionId.trim() || !args.productId.trim()) {
      throw new Error('missing_purchase_fields');
    }

    const purchaserAccount = await getPurchaserAccountByAppUserId(ctx, args.purchaserAccountId);
    if (!purchaserAccount) {
      throw new Error('purchaser_account_not_found');
    }

    const canonical = await ensureCanonicalPurchaserAccountForUser(ctx, user);
    const ownsAccount =
      purchaserAccount.appUserId === canonical?.appUserId ||
      purchaserAccount.linkedUserId === user._id ||
      (purchaserAccount.state === 'merged' &&
        purchaserAccount.mergedIntoId === canonical?.appUserId);

    if (!ownsAccount) {
      throw new Error('purchaser_account_mismatch');
    }

    const grantPurchaserAccountId =
      purchaserAccount.state === 'merged' && purchaserAccount.mergedIntoId
        ? purchaserAccount.mergedIntoId
        : purchaserAccount.appUserId === canonical?.appUserId
          ? purchaserAccount.appUserId
          : (canonical?.appUserId ?? purchaserAccount.appUserId);

    const products = await listTokenProducts(ctx);
    const product = findTokenProductByStoreProductId(products, args.store, args.productId);
    if (!product) {
      throw new Error('invalid_product');
    }

    const result = await grantConsumablePurchase(ctx, {
      products,
      purchaserAccountId: grantPurchaserAccountId,
      linkedUserId: user._id,
      store: args.store,
      productId: args.productId,
      transactionId: args.transactionId,
      revenueCatEventId: `client_sync:${args.store}:${args.transactionId}`,
      purchasedAt: Date.now(),
      rawEvent: {
        source: 'client_sync',
        store: args.store,
        productId: args.productId,
        transactionId: args.transactionId,
        purchaserAccountId: args.purchaserAccountId,
      },
    });

    return {
      granted: result.granted,
      pending: false as const,
      tokensGranted: result.tokensGranted,
      balance: result.balance,
    };
  },
});

export const linkGuestToCurrentUser = mutation({
  args: {
    purchaserAccountId: v.string(),
    installationId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const canonicalPurchaserAccount = await ensureCanonicalPurchaserAccountForUser(ctx, user);
    const sourcePurchaserAccount = await getPurchaserAccountByAppUserId(ctx, args.purchaserAccountId);

    if (!canonicalPurchaserAccount || !sourcePurchaserAccount) {
      throw new Error('Purchaser account not found');
    }

    // Verify the installation exists and is bound to the source purchaser account
    const installation = await ctx.db
      .query('device_installations')
      .withIndex('by_device', (q) => q.eq('deviceId', args.installationId))
      .unique();

    if (!installation) {
      throw new Error('Installation not found');
    }

    if (installation.purchaserAccountId !== sourcePurchaserAccount.appUserId) {
      throw new Error('Installation is not bound to the source purchaser account');
    }

    if (sourcePurchaserAccount.appUserId === canonicalPurchaserAccount.appUserId) {
      return {
        canonicalPurchaserAccountId: canonicalPurchaserAccount.appUserId,
        mergeResult: { transferredAmount: 0, alreadyCanonical: true },
      };
    }

    if (
      sourcePurchaserAccount.state === 'merged' &&
      sourcePurchaserAccount.mergedIntoId === canonicalPurchaserAccount.appUserId
    ) {
      return {
        canonicalPurchaserAccountId: canonicalPurchaserAccount.appUserId,
        mergeResult: { transferredAmount: 0, alreadyMerged: true },
      };
    }

    // Only guest wallets may be merged into a user. Never drain another
    // user's identified account just because it was last used on this device.
    if (!isMergeableGuestPurchaserAccount(sourcePurchaserAccount, user._id)) {
      throw new Error('Source purchaser account is not a mergeable guest account');
    }

    const mergeResult = await mergePurchaserAccountIntoTarget(ctx, {
      sourceAppUserId: sourcePurchaserAccount.appUserId,
      targetAppUserId: canonicalPurchaserAccount.appUserId,
      linkedUserId: user._id,
    });

    return {
      canonicalPurchaserAccountId: canonicalPurchaserAccount.appUserId,
      mergeResult: {
        transferredAmount: mergeResult.transferredAmount,
        sourcePurchaserAccountId: sourcePurchaserAccount.appUserId,
        targetPurchaserAccountId: canonicalPurchaserAccount.appUserId,
      },
    };
  },
});

export const processRevenueCatWebhook = internalMutation({
  args: {
    payloadJson: v.string(),
  },
  handler: async (ctx, args) => {
    const payload = JSON.parse(args.payloadJson) as unknown;
    const event = getEvent(payload);
    const eventId = asString(event.id) ?? crypto.randomUUID();
    const type = asString(event.type) ?? 'UNKNOWN';
    const appUserId = asString(event.app_user_id);
    const originalAppUserId = asString(event.original_app_user_id);
    const aliases = normalizeRevenueCatAliases({
      appUserId,
      originalAppUserId,
      aliases: asStringArray(event.aliases),
    });

    const existingWebhook = await ctx.db
      .query('payment_webhook_events')
      .withIndex('by_event_id', (q) => q.eq('eventId', eventId))
      .unique();

    if (existingWebhook) {
      return { ok: true as const, duplicate: true, status: existingWebhook.status };
    }

    const webhookId = await ctx.db.insert('payment_webhook_events', {
      eventId,
      type,
      appUserId,
      originalAppUserId,
      aliases,
      receivedAt: Date.now(),
      status: 'received',
      payload: args.payloadJson,
    });

    const markWebhook = async (status: string, errorCode?: string) => {
      await ctx.db.patch(webhookId, {
        status,
        errorCode,
        processedAt: Date.now(),
      });
      return { ok: true as const, duplicate: false, status, errorCode };
    };

    if (type === 'TEST') {
      return await markWebhook('ignored');
    }

    if (type === 'TRANSFER') {
      const transferredTo = normalizeRevenueCatAliases({
        aliases: asStringArray(event.transferred_to),
      });
      const target = await findMatchingPurchaserAccount(ctx, transferredTo);
      if (!target) {
        return await markWebhook('unmatched', 'purchaser_account_not_found');
      }

      for (const sourceId of asStringArray(event.transferred_from)) {
        if (sourceId === target.appUserId) {
          continue;
        }

        const source = await getPurchaserAccountByAppUserId(ctx, sourceId);
        if (!source) {
          continue;
        }

        await mergePurchaserAccountIntoTarget(ctx, {
          sourceAppUserId: source.appUserId,
          targetAppUserId: target.appUserId,
          linkedUserId: target.linkedUserId,
          purchaseStatus: 'transferred',
        });
      }

      return await markWebhook('processed');
    }

    const purchaserAccount = await findMatchingPurchaserAccount(ctx, aliases);
    if (!purchaserAccount) {
      return await markWebhook('unmatched', 'purchaser_account_not_found');
    }

    const store = normalizeRevenueCatStore(asString(event.store));
    if (!store) {
      return await markWebhook('ignored', 'unsupported_store');
    }

    // Consumables: NON_RENEWING_PURCHASE (common) or INITIAL_PURCHASE (some Test Store paths).
    if (type === 'NON_RENEWING_PURCHASE' || type === 'INITIAL_PURCHASE') {
      const transactionId = asString(event.transaction_id);
      const productId = asString(event.product_id);

      if (!transactionId || !productId) {
        return await markWebhook('failed', 'missing_purchase_fields');
      }

      const products = await listTokenProducts(ctx);
      const product = findTokenProductByStoreProductId(products, store, productId);
      if (!product) {
        return await markWebhook('failed', 'invalid_product');
      }

      await grantConsumablePurchase(ctx, {
        products,
        purchaserAccountId: purchaserAccount.appUserId,
        linkedUserId: purchaserAccount.linkedUserId,
        store,
        productId,
        transactionId,
        revenueCatEventId: eventId,
        purchasedAt:
          typeof event.purchased_at_ms === 'number' ? event.purchased_at_ms : Date.now(),
        rawEvent: args.payloadJson,
      });

      return await markWebhook('processed');
    }

    if (type === 'CANCELLATION') {
      const transactionId = asString(event.transaction_id);
      const originalTransactionId = asString(event.original_transaction_id);

      if (!transactionId && !originalTransactionId) {
        return await markWebhook('failed', 'missing_reversal_fields');
      }

      let purchase = transactionId
        ? await ctx.db
            .query('store_purchases')
            .withIndex('by_store_transaction', (q) =>
              q.eq('store', store).eq('storeTransactionId', transactionId)
            )
            .unique()
        : null;

      if (!purchase && originalTransactionId) {
        purchase = await ctx.db
          .query('store_purchases')
          .withIndex('by_original_store_transaction', (q) =>
            q.eq('store', store).eq('originalStoreTransactionId', originalTransactionId)
          )
          .unique();
      }

      if (!purchase) {
        return await markWebhook('unmatched', 'purchase_not_found');
      }

      const wallet = await ensureWalletDoc(ctx, purchase.purchaserAccountId);
      const purchaseTransactions = await ctx.db
        .query('wallet_transactions')
        .withIndex('by_purchase_id', (q) => q.eq('purchaseId', purchase._id))
        .collect();
      const originalGrant = purchaseTransactions.find((record) => record.type === 'purchase_grant');
      const existingReversal = purchaseTransactions.find(
        (record) => record.type === 'purchase_reversal'
      );

      if (!originalGrant) {
        return await markWebhook('failed', 'purchase_grant_not_found');
      }

      if (existingReversal) {
        return await markWebhook('processed');
      }

      const reversalAmount = -Math.abs(originalGrant.amount);
      await ctx.db.insert('wallet_transactions', {
        walletId: wallet._id,
        type: 'purchase_reversal',
        amount: reversalAmount,
        createdAt: Date.now(),
        status: 'posted',
        source: 'purchase',
        idempotencyKey: buildPurchaseReversalIdempotencyKey({
          store,
          transactionId: transactionId ?? originalTransactionId!,
        }),
        productKey: purchase.productKey,
        store,
        storeTransactionId: transactionId,
        originalStoreTransactionId: originalTransactionId,
        purchaseId: purchase._id,
        reversalOf: originalGrant._id,
      });

      await ctx.db.patch(wallet._id, { balance: wallet.balance + reversalAmount });
      await ctx.db.patch(purchase._id, { status: 'cancelled' });
      return await markWebhook('processed');
    }

    return await markWebhook('ignored');
  },
});

export const revenueCatWebhook = httpAction(async (ctx, request) => {
  const configuredAuthorization = process.env.REVENUECAT_WEBHOOK_AUTH_HEADER;
  const requestAuthorization = request.headers.get('authorization');

  if (!configuredAuthorization || requestAuthorization !== configuredAuthorization) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payloadJson = await request.text();
  await ctx.runMutation(internal.payments.processRevenueCatWebhook, { payloadJson });
  return new Response('ok', { status: 200 });
});
