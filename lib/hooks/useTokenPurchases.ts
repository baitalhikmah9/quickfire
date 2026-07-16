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
import { usePlayStore } from '@/store/play';

export interface TokenCatalogProduct {
  productKey: string;
  tokensGranted: number;
  iosProductId: string;
  androidProductId: string;
  sortOrder: number;
}

export interface TokenPurchaseOutcome extends PurchaseResult {
  granted: boolean;
  pending: boolean;
  tokensGranted: number;
  balance: number | null;
}

interface UseTokenPurchasesOptions {
  catalog?: TokenCatalogProduct[];
  enabled: boolean;
}

/**
 * Fetches native store prices and initiates purchases.
 *
 * RevenueCat is configured and identified globally via `useRevenueCatSync`.
 * After a successful Test Store purchase, grants tokens via Convex immediately.
 */
export function useTokenPurchases({ catalog, enabled }: UseTokenPurchasesOptions) {
  const syncConsumablePurchase = useMutation(api.payments.syncConsumablePurchase);
  const setTokenBalance = usePlayStore((state) => state.setTokenBalance);
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
    async (catalogProduct: TokenCatalogProduct): Promise<TokenPurchaseOutcome> => {
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
        const purchaseResult = await purchaseStoreProduct(product);
        const transactionId =
          purchaseResult.transactionId?.trim() ||
          // Deterministic fallback so Test Store grants still work when RC omits an id.
          `rc:${purchaseResult.store}:${session.appUserId}:${product.identifier}:${Date.now()}`;

        try {
          const sync = await syncConsumablePurchase({
            purchaserAccountId: session.appUserId,
            productId: product.identifier,
            transactionId,
            store: purchaseResult.store,
          });

          if (typeof sync.balance === 'number') {
            setTokenBalance(sync.balance);
          }

          return {
            ...purchaseResult,
            transactionId,
            granted: sync.granted,
            pending: sync.pending,
            tokensGranted: sync.tokensGranted,
            balance: sync.balance,
          };
        } catch (syncError) {
          // Purchase succeeded in RC; wallet grant failed (e.g. webhook-only store).
          console.warn('[purchases] syncConsumablePurchase failed', syncError);
          return {
            ...purchaseResult,
            transactionId,
            granted: false,
            pending: true,
            tokensGranted: 0,
            balance: null,
          };
        }
      } catch (cause: unknown) {
        if (isPurchaseCancelledError(cause)) {
          throw new Error('Purchase cancelled.');
        }
        throw cause instanceof Error ? cause : new Error('Purchase failed. Please try again.');
      } finally {
        setIsPurchasing(false);
      }
    },
    [
      enabled,
      products,
      session.appUserId,
      session.ready,
      setTokenBalance,
      syncConsumablePurchase,
    ]
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
