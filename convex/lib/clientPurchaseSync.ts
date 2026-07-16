import type { PaymentStore } from './paymentCatalog';

/**
 * Client-side purchase sync is allowed only for RevenueCat Test Store.
 *
 * Production App Store / Play purchases must be granted by the authenticated
 * RevenueCat webhook so transaction IDs cannot be forged from the client.
 */
export function canClientSyncConsumablePurchase(store: PaymentStore): boolean {
  return store === 'test_store';
}
