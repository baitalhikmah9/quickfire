import type { PaymentStore } from './paymentCatalog';

export function normalizeRevenueCatAliases({
  appUserId,
  originalAppUserId,
  aliases,
}: {
  appUserId?: string | null;
  originalAppUserId?: string | null;
  aliases?: string[] | null;
}) {
  const ids = new Set<string>();

  for (const candidate of [appUserId, originalAppUserId, ...(aliases ?? [])]) {
    if (candidate) {
      ids.add(candidate);
    }
  }

  return Array.from(ids);
}

export function buildPurchaseGrantIdempotencyKey({
  store,
  transactionId,
}: {
  store: PaymentStore;
  transactionId: string;
}) {
  return `purchase:${store}:${transactionId}`;
}

export function buildPurchaseReversalIdempotencyKey({
  store,
  transactionId,
}: {
  store: PaymentStore;
  transactionId: string;
}) {
  return `purchase_reversal:${store}:${transactionId}`;
}

export function mergePurchaserBalances({
  sourceBalance,
  targetBalance,
}: {
  sourceBalance: number;
  targetBalance: number;
}) {
  return {
    transferAmount: sourceBalance,
    sourceBalanceAfter: 0,
    targetBalanceAfter: targetBalance + sourceBalance,
  };
}

export function normalizeRevenueCatStore(store?: string | null): PaymentStore | null {
  const normalized = store?.toLowerCase();

  if (normalized === 'app_store' || normalized === 'app store') {
    return 'app_store';
  }

  if (normalized === 'play_store' || normalized === 'play store') {
    return 'play_store';
  }

  return null;
}
