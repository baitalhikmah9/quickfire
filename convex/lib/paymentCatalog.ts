export type PaymentStore = 'app_store' | 'play_store' | 'test_store';

export interface TokenProductSeed {
  productKey: string;
  tokensGranted: number;
  iosProductId: string;
  androidProductId: string;
  isActive: boolean;
  sortOrder: number;
}

/** RevenueCat / store product identifiers for token consumables. */
const TOKEN_STORE_PRODUCT_IDS = {
  tokens10: 'consumable',
  tokens20: 'consumable_2',
  tokens30: 'consumable_3',
  tokens50: 'consumable_4',
  tokens70: 'consumable_5',
} as const;

export const DEFAULT_TOKEN_PRODUCTS: TokenProductSeed[] = [
  {
    productKey: 'bundle_10',
    tokensGranted: 10,
    iosProductId: TOKEN_STORE_PRODUCT_IDS.tokens10,
    androidProductId: TOKEN_STORE_PRODUCT_IDS.tokens10,
    isActive: true,
    sortOrder: 10,
  },
  {
    productKey: 'bundle_20',
    tokensGranted: 20,
    iosProductId: TOKEN_STORE_PRODUCT_IDS.tokens20,
    androidProductId: TOKEN_STORE_PRODUCT_IDS.tokens20,
    isActive: true,
    sortOrder: 20,
  },
  {
    productKey: 'bundle_30',
    tokensGranted: 30,
    iosProductId: TOKEN_STORE_PRODUCT_IDS.tokens30,
    androidProductId: TOKEN_STORE_PRODUCT_IDS.tokens30,
    isActive: true,
    sortOrder: 30,
  },
  {
    productKey: 'bundle_50',
    tokensGranted: 50,
    iosProductId: TOKEN_STORE_PRODUCT_IDS.tokens50,
    androidProductId: TOKEN_STORE_PRODUCT_IDS.tokens50,
    isActive: true,
    sortOrder: 40,
  },
  {
    productKey: 'bundle_70',
    tokensGranted: 70,
    iosProductId: TOKEN_STORE_PRODUCT_IDS.tokens70,
    androidProductId: TOKEN_STORE_PRODUCT_IDS.tokens70,
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

    if (store === 'test_store') {
      return product.iosProductId === productId || product.androidProductId === productId;
    }

    return store === 'app_store'
      ? product.iosProductId === productId
      : product.androidProductId === productId;
  });
}
