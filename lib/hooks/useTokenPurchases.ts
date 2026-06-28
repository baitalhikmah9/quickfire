import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  getStoreProducts,
  isPurchaseCancelledError,
  isRevenueCatSupported,
  purchaseStoreProduct,
  resolvePlatformProductIds,
  subscribeRevenueCatSession,
  type PurchaseResult,
  type RevenueCatSessionState,
  type StoreProductInfo,
} from '@/lib/payments/revenueCat';

export interface TokenCatalogProduct {
  productKey: string;
  tokensGranted: number;
  iosProductId: string;
  androidProductId: string;
  sortOrder: number;
}

interface UseTokenPurchasesOptions {
  catalog?: TokenCatalogProduct[];
  enabled: boolean;
}

/**
 * Fetches native store prices and initiates purchases.
 *
 * RevenueCat is configured and identified globally via `useRevenueCatSync`.
 */
export function useTokenPurchases({ catalog, enabled }: UseTokenPurchasesOptions) {
  const syncConsumablePurchase = useMutation(api.payments.syncConsumablePurchase);
  const [session, setSession] = useState<RevenueCatSessionState>({
    appUserId: null,
    ready: false,
    error: null,
  });
  const [products, setProducts] = useState<Record<string, StoreProductInfo>>({});
  const [isReady, setIsReady] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedKeyRef = useRef<string | null>(null);

  const platformProductIds = useMemo(
    () => (catalog ? resolvePlatformProductIds(catalog) : []),
    [catalog]
  );

  useEffect(() => subscribeRevenueCatSession(setSession), []);

  useEffect(() => {
    if (!enabled || !isRevenueCatSupported()) return;
    if (!session.ready || !session.appUserId) return;
    if (platformProductIds.length === 0) return;

    const key = `${session.appUserId}:${JSON.stringify(platformProductIds)}`;
    if (fetchedKeyRef.current === key) return;
    fetchedKeyRef.current = key;

    let cancelled = false;
    setIsReady(false);
    setError(session.error);

    void getStoreProducts(platformProductIds)
      .then((storeProducts) => {
        if (cancelled) return;

        const productMap: Record<string, StoreProductInfo> = {};
        for (const sp of storeProducts) {
          productMap[sp.identifier] = sp;
        }
        setProducts(productMap);
        setIsReady(true);
        setError(null);
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Unable to load store products.');
          setIsReady(false);
          fetchedKeyRef.current = null;
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, platformProductIds, session.appUserId, session.error, session.ready]);

  const purchase = useCallback(
    async (catalogProduct: TokenCatalogProduct): Promise<PurchaseResult> => {
      if (!enabled) throw new Error('Purchases are not enabled.');
      if (!isRevenueCatSupported())
        throw new Error('Purchases are only available in the iOS and Android app.');
      if (!session.ready || !session.appUserId) {
        throw new Error('Purchases are still loading.');
      }

      const productId =
        Platform.OS === 'ios'
          ? catalogProduct.iosProductId
          : catalogProduct.androidProductId;

      if (!productId) {
        throw new Error('This product is not available on this platform.');
      }

      const product = products[productId] ?? (await getStoreProducts([productId]))[0];
      if (!product) {
        throw new Error('This product is not available from the store yet.');
      }

      setIsPurchasing(true);
      setError(null);
      try {
        const result = await purchaseStoreProduct(product);
        if (!result.transactionId) {
          throw new Error('Purchase completed without a transaction id.');
        }

        await syncConsumablePurchase({
          purchaserAccountId: session.appUserId,
          productId: result.productIdentifier,
          transactionId: result.transactionId,
          store: result.store,
        });

        return result;
      } catch (cause: unknown) {
        if (isPurchaseCancelledError(cause)) {
          throw new Error('Purchase cancelled.');
        }
        throw cause instanceof Error ? cause : new Error('Purchase failed. Please try again.');
      } finally {
        setIsPurchasing(false);
      }
    },
    [enabled, products, session.appUserId, session.ready, syncConsumablePurchase]
  );

  const combinedError = error ?? session.error;

  return {
    purchaserAccountId: session.appUserId,
    products,
    isReady: isReady && session.ready,
    isPurchasing,
    isSupported: isRevenueCatSupported(),
    error: combinedError,
    purchase,
  };
}
