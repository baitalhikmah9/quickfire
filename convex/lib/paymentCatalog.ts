export type PaymentStore = 'app_store' | 'play_store';

export interface TokenProductSeed {
  productKey: string;
  tokensGranted: number;
  iosProductId: string;
  androidProductId: string;
  isActive: boolean;
  sortOrder: number;
}

export const DEFAULT_TOKEN_PRODUCTS: TokenProductSeed[] = [
  {
    productKey: 'bundle_10',
    tokensGranted: 10,
    iosProductId: 'com.quickfire.tokens.10',
    androidProductId: 'quickfire_tokens_10',
    isActive: true,
    sortOrder: 10,
  },
  {
    productKey: 'bundle_20',
    tokensGranted: 20,
    iosProductId: 'com.quickfire.tokens.20',
    androidProductId: 'quickfire_tokens_20',
    isActive: true,
    sortOrder: 20,
  },
  {
    productKey: 'bundle_30',
    tokensGranted: 30,
    iosProductId: 'com.quickfire.tokens.30',
    androidProductId: 'quickfire_tokens_30',
    isActive: true,
    sortOrder: 30,
  },
  {
    productKey: 'bundle_50',
    tokensGranted: 50,
    iosProductId: 'com.quickfire.tokens.50',
    androidProductId: 'quickfire_tokens_50',
    isActive: true,
    sortOrder: 40,
  },
  {
    productKey: 'bundle_70',
    tokensGranted: 70,
    iosProductId: 'com.quickfire.tokens.70',
    androidProductId: 'quickfire_tokens_70',
    isActive: true,
    sortOrder: 50,
  },
];

export function findTokenProductByStoreProductId(
  products: TokenProductSeed[],
  store: PaymentStore,
  productId: string
) {
  return products.find((product) => {
    if (!product.isActive) {
      return false;
    }

    return store === 'app_store'
      ? product.iosProductId === productId
      : product.androidProductId === productId;
  });
}
