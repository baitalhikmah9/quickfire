import { describe, expect, it } from '@jest/globals';

import {
  STORE_BUNDLES,
  BUNDLE_DISPLAY_BY_TOKENS,
  buildDisplayBundles,
  formatTokens,
} from '@/features/play/storeBundles';
import { DEFAULT_TOKEN_PRODUCTS } from '@/convex/lib/paymentCatalog';

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

describe('BUNDLE_DISPLAY_BY_TOKENS', () => {
  it('contains metadata for every STORE_BUNDLES entry keyed by token count', () => {
    for (const bundle of STORE_BUNDLES) {
      expect(BUNDLE_DISPLAY_BY_TOKENS[bundle.tokens]).toBeDefined();
      expect(BUNDLE_DISPLAY_BY_TOKENS[bundle.tokens]?.nameKey).toBe(bundle.nameKey);
    }
  });
});

describe('buildDisplayBundles', () => {
  const mockCatalog = DEFAULT_TOKEN_PRODUCTS.map((p) => ({
    productKey: p.productKey,
    tokensGranted: p.tokensGranted,
    iosProductId: p.iosProductId,
    androidProductId: p.androidProductId,
    isActive: p.isActive,
    sortOrder: p.sortOrder,
  }));

  it('sorts active products by sortOrder', () => {
    const result = buildDisplayBundles(mockCatalog, {}, 'ios');
    expect(result.map((b) => b.productKey)).toEqual([
      'bundle_10',
      'bundle_20',
      'bundle_30',
      'bundle_50',
      'bundle_70',
    ]);
  });

  it('filters out inactive products', () => {
    const modified = mockCatalog.map((p) =>
      p.productKey === 'bundle_20' ? { ...p, isActive: false } : p
    );
    const result = buildDisplayBundles(modified, {}, 'ios');
    expect(result.map((b) => b.productKey)).not.toContain('bundle_20');
  });

  it('maps platform product IDs correctly for iOS', () => {
    const result = buildDisplayBundles(mockCatalog, {}, 'ios');
    expect(result.map((bundle) => bundle.platformProductId)).toEqual([
      'consumable',
      'consumable_2',
      'consumable_3',
      'consumable_4',
      'consumable_5',
    ]);
  });

  it('maps platform product IDs correctly for Android', () => {
    const result = buildDisplayBundles(mockCatalog, {}, 'android');
    expect(result.map((bundle) => bundle.platformProductId)).toEqual([
      'consumable',
      'consumable_2',
      'consumable_3',
      'consumable_4',
      'consumable_5',
    ]);
  });

  it('returns null platformProductId for web', () => {
    const result = buildDisplayBundles(mockCatalog, {}, 'web');
    for (const bundle of result) {
      expect(bundle.platformProductId).toBeNull();
    }
  });

  it('uses display metadata from STORE_BUNDLES when tokens match', () => {
    const result = buildDisplayBundles(mockCatalog, {}, 'ios');
    const mega = result.find((b) => b.tokensGranted === 70);
    expect(mega?.displayNameKey).toBe('store.packMega');
    expect(mega?.icon).toBe('trophy-outline');
  });

  it('falls back to defaults when no display metadata matches', () => {
    const unknownProduct: typeof mockCatalog = [
      {
        productKey: 'bundle_999',
        tokensGranted: 999,
        iosProductId: 'com.backfire.tokens.999',
        androidProductId: 'backfire_tokens_999',
        isActive: true,
        sortOrder: 999,
      },
    ];
    const result = buildDisplayBundles(unknownProduct, {}, 'ios');
    expect(result[0]?.displayNameKey).toBe('store.tokenCount');
    expect(result[0]?.icon).toBe('diamond-outline');
    expect(result[0]?.isFeatured).toBe(false);
  });

  it('uses native price string when available', () => {
    const nativeProducts: Record<string, { priceString?: string }> = {
      consumable_3: { priceString: '$4.99' },
    };
    const result = buildDisplayBundles(mockCatalog, nativeProducts, 'ios');
    const bundle30 = result.find((b) => b.productKey === 'bundle_30');
    expect(bundle30?.priceLabel).toBe('$4.99');
  });

  it('falls back to static priceLabel when native price is missing', () => {
    const result = buildDisplayBundles(mockCatalog, {}, 'ios');
    const bundle30 = result.find((b) => b.productKey === 'bundle_30');
    expect(bundle30?.priceLabel).toBe('£12');
  });

  it('falls back to tokens string when neither native nor static price exists', () => {
    const productNoPrice: typeof mockCatalog = [
      {
        productKey: 'bundle_5',
        tokensGranted: 5,
        iosProductId: 'com.backfire.tokens.5',
        androidProductId: 'backfire_tokens_5',
        isActive: true,
        sortOrder: 1,
      },
    ];
    const result = buildDisplayBundles(productNoPrice, {}, 'ios');
    expect(result[0]?.priceLabel).toBe('5 tokens');
  });
});

describe('formatTokens', () => {
  it('formats a number without decimals', () => {
    expect(formatTokens(1000)).toBe('1,000');
    expect(formatTokens(10)).toBe('10');
    expect(formatTokens(0)).toBe('0');
  });
});
