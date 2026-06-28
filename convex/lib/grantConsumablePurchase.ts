import type { MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { ensureWalletDoc } from './ensureWallet';
import {
  findTokenProductByStoreProductId,
  type PaymentStore,
  type TokenProductSeed,
} from './paymentCatalog';
import { buildPurchaseGrantIdempotencyKey } from './paymentWebhook';

export async function grantConsumablePurchase(
  ctx: MutationCtx,
  {
    products,
    purchaserAccountId,
    linkedUserId,
    store,
    productId,
    transactionId,
    revenueCatEventId,
    purchasedAt,
    rawEvent,
  }: {
    products: TokenProductSeed[];
    purchaserAccountId: string;
    linkedUserId?: Id<'users'>;
    store: PaymentStore;
    productId: string;
    transactionId: string;
    revenueCatEventId: string;
    purchasedAt?: number;
    rawEvent?: unknown;
  }
): Promise<{ granted: boolean; balance: number; tokensGranted: number }> {
  const product = findTokenProductByStoreProductId(products, store, productId);
  if (!product) {
    throw new Error('invalid_product');
  }

  const existingPurchase = await ctx.db
    .query('store_purchases')
    .withIndex('by_store_transaction', (q) =>
      q.eq('store', store).eq('storeTransactionId', transactionId)
    )
    .unique();

  const wallet = await ensureWalletDoc(ctx, purchaserAccountId, linkedUserId);

  if (existingPurchase) {
    return { granted: false, balance: wallet.balance, tokensGranted: 0 };
  }

  const purchaseId = await ctx.db.insert('store_purchases', {
    purchaserAccountId,
    productKey: product.productKey,
    store,
    environment: store === 'test_store' ? 'SANDBOX' : undefined,
    storeTransactionId: transactionId,
    originalStoreTransactionId: transactionId,
    revenueCatEventId,
    purchasedAt: purchasedAt ?? Date.now(),
    status: 'granted',
    rawEvent: rawEvent ?? { source: 'client_sync' },
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
    originalStoreTransactionId: transactionId,
    purchaseId,
  });

  const nextBalance = wallet.balance + product.tokensGranted;
  await ctx.db.patch(wallet._id, { balance: nextBalance });

  return {
    granted: true,
    balance: nextBalance,
    tokensGranted: product.tokensGranted,
  };
}
