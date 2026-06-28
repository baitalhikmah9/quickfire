import { describe, expect, it } from '@jest/globals';

import {
  DEFAULT_TOKEN_PRODUCTS,
  findTokenProductByStoreProductId,
} from '@/convex/lib/paymentCatalog';

describe('paymentCatalog', () => {
  it('seeds the repo-backed token bundle catalog', () => {
    expect(
      DEFAULT_TOKEN_PRODUCTS.map((product) => ({
        productKey: product.productKey,
        tokensGranted: product.tokensGranted,
      }))
    ).toEqual([
      { productKey: 'bundle_10', tokensGranted: 10 },
      { productKey: 'bundle_20', tokensGranted: 20 },
      { productKey: 'bundle_30', tokensGranted: 30 },
      { productKey: 'bundle_50', tokensGranted: 50 },
      { productKey: 'bundle_70', tokensGranted: 70 },
    ]);
  });

  it('matches products by store-specific product id', () => {
    expect(
      findTokenProductByStoreProductId(
        DEFAULT_TOKEN_PRODUCTS,
        'app_store',
        'consumable_4'
      )?.productKey
    ).toBe('bundle_50');

    expect(
      findTokenProductByStoreProductId(
        DEFAULT_TOKEN_PRODUCTS,
        'play_store',
        'consumable_5'
      )?.productKey
    ).toBe('bundle_70');

    expect(
      findTokenProductByStoreProductId(
        DEFAULT_TOKEN_PRODUCTS,
        'test_store',
        'consumable'
      )?.productKey
    ).toBe('bundle_10');
  });

  it('ignores inactive products during store id lookup', () => {
    const disabled = DEFAULT_TOKEN_PRODUCTS.map((product) =>
      product.productKey === 'bundle_20' ? { ...product, isActive: false } : product
    );

    expect(
      findTokenProductByStoreProductId(
        disabled,
        'app_store',
        'consumable_2'
      )
    ).toBeUndefined();
  });
});
