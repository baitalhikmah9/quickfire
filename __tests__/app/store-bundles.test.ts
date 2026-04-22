import { describe, expect, it } from '@jest/globals';

import { STORE_BUNDLES } from '@/features/play/storeBundles';

describe('store bundles', () => {
  it('uses the preliminary GBP token pricing', () => {
    expect(
      STORE_BUNDLES.map((bundle) => ({
        tokens: bundle.tokens,
        priceLabel: bundle.priceLabel,
      }))
    ).toEqual([
      { tokens: 10, priceLabel: '£5' },
      { tokens: 20, priceLabel: '£9' },
      { tokens: 30, priceLabel: '£12' },
      { tokens: 50, priceLabel: '£17' },
      { tokens: 70, priceLabel: '£21' },
    ]);
  });
});
