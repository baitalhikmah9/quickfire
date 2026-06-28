import type { TranslationKey } from '@/lib/i18n/messages/en';

export interface StoreBundle {
  id: string;
  nameKey: TranslationKey;
  tokens: number;
  bonus?: number;
  priceLabel: string;
  icon: string;
  featured?: boolean;
}

/** Convex catalog product shape (subset of payments.getCatalog return). */
export interface CatalogProduct {
  productKey: string;
  tokensGranted: number;
  iosProductId: string;
  androidProductId: string;
  isActive: boolean;
  sortOrder: number;
}

/** Display bundle enriched with catalog and native store info. */
export interface DisplayBundle extends CatalogProduct {
  displayNameKey: TranslationKey;
  icon: string;
  isFeatured: boolean;
  /** Native store price string (e.g. "$4.99"), or fallback label. */
  priceLabel: string;
  /** Platform-specific store product ID for this bundle. */
  platformProductId: string | null;
}

export const STORE_BUNDLES: StoreBundle[] = [
  {
    id: 'b10',
    nameKey: 'store.packQuick',
    tokens: 10,
    priceLabel: '£5',
    icon: 'flash-outline',
  },
  {
    id: 'b20',
    nameKey: 'store.packValue',
    tokens: 20,
    priceLabel: '£9',
    icon: 'layers-outline',
  },
  {
    id: 'b30',
    nameKey: 'store.packPro',
    tokens: 30,
    priceLabel: '£12',
    icon: 'star-outline',
    featured: true,
  },
  {
    id: 'b50',
    nameKey: 'store.packPower',
    tokens: 50,
    priceLabel: '£17',
    icon: 'rocket-outline',
  },
  {
    id: 'b70',
    nameKey: 'store.packMega',
    tokens: 70,
    priceLabel: '£21',
    icon: 'trophy-outline',
  },
];

/** Lookup display metadata by token count (shared between static and live catalog). */
export const BUNDLE_DISPLAY_BY_TOKENS: Record<number, StoreBundle | undefined> =
  Object.fromEntries(STORE_BUNDLES.map((b) => [b.tokens, b]));

/** Formatter for token counts (e.g. 1 000 → "1,000"). */
export function formatTokens(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

/**
 * Maps a Convex catalog product array into display bundles by merging with
 * static display metadata and (optionally) native store product prices.
 *
 * @param catalog    Products from the `payments.getCatalog` Convex query.
 * @param nativeProducts  Map of native product ID → { priceString? } from RevenueCat.
 * @param platform   Current platform ('ios' | 'android' | 'web' …).
 */
export function buildDisplayBundles(
  catalog: CatalogProduct[],
  nativeProducts: Record<string, { priceString?: string }>,
  platform: string
): DisplayBundle[] {
  return catalog
    .filter((p) => p.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((cp) => {
      const displayMeta = BUNDLE_DISPLAY_BY_TOKENS[cp.tokensGranted];
      const platformProductId =
        platform === 'ios'
          ? cp.iosProductId
          : platform === 'android'
            ? cp.androidProductId
            : null;
      const nativeProduct = platformProductId ? nativeProducts[platformProductId] : undefined;

      return {
        ...cp,
        displayNameKey: displayMeta?.nameKey ?? ('store.tokenCount' as const),
        icon: displayMeta?.icon ?? 'diamond-outline',
        isFeatured: displayMeta?.featured ?? false,
        priceLabel:
          nativeProduct?.priceString ?? displayMeta?.priceLabel ?? `${cp.tokensGranted} tokens`,
        platformProductId,
      };
    });
}
