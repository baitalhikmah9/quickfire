import { describe, expect, it } from '@jest/globals';

import {
  hasActiveEntitlement,
  isPurchaseCancelledError,
  normalizeCustomerInfo,
} from '@/lib/payments/revenueCat';

describe('revenueCat helpers', () => {
  it('detects SDK purchase cancellation errors', () => {
    expect(isPurchaseCancelledError({ userCancelled: true })).toBe(true);
    expect(isPurchaseCancelledError({ code: 'PURCHASE_CANCELLED_ERROR' })).toBe(true);
    expect(isPurchaseCancelledError(new Error('network failed'))).toBe(false);
  });

  it('normalizes active entitlements from customer info', () => {
    const snapshot = normalizeCustomerInfo({
      entitlements: {
        active: {
          premium: {
            identifier: 'premium',
            isActive: true,
            willRenew: true,
            expirationDate: '2026-12-31T00:00:00Z',
            productIdentifier: 'premium_monthly',
          },
        },
        all: {
          premium: {
            identifier: 'premium',
            isActive: true,
            willRenew: true,
            expirationDate: '2026-12-31T00:00:00Z',
            productIdentifier: 'premium_monthly',
          },
        },
      },
    });

    expect(hasActiveEntitlement(snapshot, 'premium')).toBe(true);
    expect(snapshot.activeEntitlementIds).toContain('premium');
  });

  it('treats missing entitlements as inactive', () => {
    const snapshot = normalizeCustomerInfo({ entitlements: { active: {}, all: {} } });
    expect(hasActiveEntitlement(snapshot, 'premium')).toBe(false);
  });
});
