import { httpAction, internalMutation, mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { ensureWalletDoc } from './lib/ensureWallet';
import {
  buildPurchaseGrantIdempotencyKey,
  buildPurchaseReversalIdempotencyKey,
  mergePurchaserBalances,
  normalizeRevenueCatAliases,
  normalizeRevenueCatStore,
} from './lib/paymentWebhook';
import {
  DEFAULT_TOKEN_PRODUCTS,
  findTokenProductByStoreProductId,
} from './lib/paymentCatalog';
import { getCurrentUser, requireUser } from './lib/auth';
import {
  ensureCanonicalPurchaserAccountForUser,
  getPurchaserAccountByAppUserId,
} from './lib/purchaserAccounts';
import type { Id } from './_generated/dataModel';

function getEvent(payload: unknown) {
  if (payload && typeof payload === 'object' && 'event' in payload) {
    return (payload as { event: Record<string, unknown> }).event;
  }

  return (payload ?? {}) as Record<string, unknown>;
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

    const canonicalPurchaserAccount = user
      ? await ensureCanonicalPurchaserAccountForUser(ctx, user)
      : null;

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

export const linkGuestToCurrentUser = mutation({
  args: {
    purchaserAccountId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const canonicalPurchaserAccount = await ensureCanonicalPurchaserAccountForUser(ctx, user);
    const sourcePurchaserAccount = await getPurchaserAccountByAppUserId(ctx, args.purchaserAccountId);

    if (!canonicalPurchaserAccount || !sourcePurchaserAccount) {
      throw new Error('Purchaser account not found');
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

    const sourceWallet = await ensureWalletDoc(
      ctx,
      sourcePurchaserAccount.appUserId,
      sourcePurchaserAccount.linkedUserId
    );
    const targetWallet = await ensureWalletDoc(ctx, canonicalPurchaserAccount.appUserId, user._id);
    const merge = mergePurchaserBalances({
      sourceBalance: sourceWallet.balance,
      targetBalance: targetWallet.balance,
    });
    const now = Date.now();

    if (merge.transferAmount !== 0) {
      await ctx.db.insert('wallet_transactions', {
        walletId: sourceWallet._id,
        type: 'account_merge_debit',
        amount: -merge.transferAmount,
        createdAt: now,
        status: 'posted',
        source: 'system',
        idempotencyKey: `merge:${sourcePurchaserAccount.appUserId}:${canonicalPurchaserAccount.appUserId}:debit`,
        metadata: { targetPurchaserAccountId: canonicalPurchaserAccount.appUserId },
      });
      await ctx.db.insert('wallet_transactions', {
        walletId: targetWallet._id,
        type: 'account_merge_credit',
        amount: merge.transferAmount,
        createdAt: now,
        status: 'posted',
        source: 'system',
        idempotencyKey: `merge:${sourcePurchaserAccount.appUserId}:${canonicalPurchaserAccount.appUserId}:credit`,
        metadata: { sourcePurchaserAccountId: sourcePurchaserAccount.appUserId },
      });

      await ctx.db.patch(sourceWallet._id, { balance: merge.sourceBalanceAfter });
      await ctx.db.patch(targetWallet._id, { balance: merge.targetBalanceAfter });
    }

    const linkedInstallations = await ctx.db
      .query('device_installations')
      .withIndex('by_purchaser_account', (q) =>
        q.eq('purchaserAccountId', sourcePurchaserAccount.appUserId)
      )
      .collect();

    for (const installation of linkedInstallations) {
      await ctx.db.patch(installation._id, {
        purchaserAccountId: canonicalPurchaserAccount.appUserId,
        userId: user._id,
      });
    }

    const linkedPurchases = await ctx.db
      .query('store_purchases')
      .withIndex('by_purchaser_account', (q) =>
        q.eq('purchaserAccountId', sourcePurchaserAccount.appUserId)
      )
      .collect();

    for (const purchase of linkedPurchases) {
      await ctx.db.patch(purchase._id, {
        purchaserAccountId: canonicalPurchaserAccount.appUserId,
      });
    }

    await ctx.db.patch(sourcePurchaserAccount._id, {
      state: 'merged',
      mergedIntoId: canonicalPurchaserAccount.appUserId,
      linkedUserId: user._id,
      lastSeenAt: now,
    });
    await ctx.db.patch(canonicalPurchaserAccount._id, {
      kind: 'identified',
      linkedUserId: user._id,
      linkedAt: canonicalPurchaserAccount.linkedAt ?? now,
      lastSeenAt: now,
    });
    await ctx.db.patch(user._id, {
      canonicalPurchaserAccountId: canonicalPurchaserAccount.appUserId,
    });

    return {
      canonicalPurchaserAccountId: canonicalPurchaserAccount.appUserId,
      mergeResult: {
        transferredAmount: merge.transferAmount,
        sourcePurchaserAccountId: sourcePurchaserAccount.appUserId,
        targetPurchaserAccountId: canonicalPurchaserAccount.appUserId,
      },
    };
  },
});

export const processRevenueCatWebhook = internalMutation({
  args: {
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const event = getEvent(args.payload);
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
      payload: args.payload,
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

        await ctx.db.patch(source._id, {
          state: 'merged',
          mergedIntoId: target.appUserId,
          lastSeenAt: Date.now(),
        });

        const purchases = await ctx.db
          .query('store_purchases')
          .withIndex('by_purchaser_account', (q) => q.eq('purchaserAccountId', source.appUserId))
          .collect();

        for (const purchase of purchases) {
          await ctx.db.patch(purchase._id, {
            purchaserAccountId: target.appUserId,
            status: 'transferred',
          });
        }
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

    if (type === 'NON_RENEWING_PURCHASE') {
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

      const existingPurchase = await ctx.db
        .query('store_purchases')
        .withIndex('by_store_transaction', (q) =>
          q.eq('store', store).eq('storeTransactionId', transactionId)
        )
        .unique();

      if (existingPurchase) {
        return await markWebhook('processed');
      }

      const wallet = await ensureWalletDoc(
        ctx,
        purchaserAccount.appUserId,
        purchaserAccount.linkedUserId
      );
      const purchaseId = await ctx.db.insert('store_purchases', {
        purchaserAccountId: purchaserAccount.appUserId,
        productKey: product.productKey,
        store,
        environment: asString(event.environment),
        storeTransactionId: transactionId,
        originalStoreTransactionId: asString(event.original_transaction_id),
        revenueCatEventId: eventId,
        purchasedAt: typeof event.purchased_at_ms === 'number' ? event.purchased_at_ms : Date.now(),
        status: 'granted',
        rawEvent: event,
      });

      await ctx.db.insert('wallet_transactions', {
        walletId: wallet._id,
        type: 'purchase_grant',
        amount: product.tokensGranted,
        createdAt: Date.now(),
        status: 'posted',
        source: 'purchase',
        idempotencyKey: buildPurchaseGrantIdempotencyKey({ store, transactionId }),
        productKey: product.productKey,
        store,
        storeTransactionId: transactionId,
        originalStoreTransactionId: asString(event.original_transaction_id),
        purchaseId,
      });

      await ctx.db.patch(wallet._id, { balance: wallet.balance + product.tokensGranted });
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

  if (configuredAuthorization && requestAuthorization !== configuredAuthorization) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = await request.json();
  await (ctx as any).runMutation(processRevenueCatWebhook, { payload });
  return new Response('ok', { status: 200 });
});
