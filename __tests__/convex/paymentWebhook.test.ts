import { describe, expect, it } from '@jest/globals';

import {
  buildPurchaseGrantIdempotencyKey,
  buildPurchaseReversalIdempotencyKey,
  mergePurchaserBalances,
  normalizeRevenueCatAliases,
} from '@/convex/lib/paymentWebhook';

describe('paymentWebhook helpers', () => {
  it('normalizes RevenueCat identity aliases without duplicates', () => {
    expect(
      normalizeRevenueCatAliases({
        appUserId: 'guest-a',
        originalAppUserId: 'guest-a',
        aliases: ['guest-a', 'user-b', 'user-b'],
      })
    ).toEqual(['guest-a', 'user-b']);
  });

  it('builds deterministic idempotency keys for purchase grants and reversals', () => {
    expect(
      buildPurchaseGrantIdempotencyKey({
        store: 'app_store',
        transactionId: 'tx_123',
      })
    ).toBe('purchase:app_store:tx_123');

    expect(
      buildPurchaseReversalIdempotencyKey({
        store: 'play_store',
        transactionId: 'tx_123',
      })
    ).toBe('purchase_reversal:play_store:tx_123');
  });

  it('merges guest balances into canonical accounts without rewriting history', () => {
    expect(mergePurchaserBalances({ sourceBalance: 9, targetBalance: 12 })).toEqual({
      sourceBalanceAfter: 0,
      targetBalanceAfter: 21,
      transferAmount: 9,
    });
  });
});
