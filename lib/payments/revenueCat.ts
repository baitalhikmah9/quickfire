import Constants from 'expo-constants';
import { Platform } from 'react-native';

export interface StoreProductInfo {
  identifier: string;
  title?: string;
  description?: string;
  priceString?: string;
  raw: unknown;
}

export interface PurchaseResult {
  productIdentifier: string;
  transactionId: string | null;
  store: 'app_store' | 'play_store' | 'test_store';
  customerInfo: CustomerInfoSnapshot;
}

export interface EntitlementSnapshot {
  identifier: string;
  isActive: boolean;
  willRenew: boolean;
  expirationDate: string | null;
  productIdentifier: string | null;
}

export interface CustomerInfoSnapshot {
  activeEntitlementIds: string[];
  entitlements: Record<string, EntitlementSnapshot>;
  raw: unknown;
}

export interface RevenueCatSessionState {
  appUserId: string | null;
  ready: boolean;
  error: string | null;
}

type PurchasesModule = Record<string, unknown> & {
  default?: Record<string, unknown>;
};

let modulePromise: Promise<PurchasesModule> | null = null;
let configurePromise: Promise<void> | null = null;
let configuredApiKey: string | null = null;
let loggedInAppUserId: string | null = null;
let loginPromise: Promise<void> | null = null;
let pendingLoginAppUserId: string | null = null;

const sessionListeners = new Set<(state: RevenueCatSessionState) => void>();
const customerInfoListeners = new Set<(info: CustomerInfoSnapshot) => void>();
let customerInfoListenerAttached = false;

function getSessionState(): RevenueCatSessionState {
  return {
    appUserId: loggedInAppUserId,
    ready: loggedInAppUserId !== null,
    error: null,
  };
}

function notifySessionListeners(error: string | null = null): void {
  const state = { ...getSessionState(), error };
  for (const listener of sessionListeners) {
    listener(state);
  }
}

export function subscribeRevenueCatSession(
  listener: (state: RevenueCatSessionState) => void
): () => void {
  sessionListeners.add(listener);
  listener(getSessionState());
  return () => {
    sessionListeners.delete(listener);
  };
}

export function getRevenueCatSession(): RevenueCatSessionState {
  return getSessionState();
}

function getExtraString(key: string): string | undefined {
  const extra = Constants.expoConfig?.extra ?? Constants.manifest2?.extra;
  const value =
    extra && typeof extra === 'object' ? (extra as Record<string, unknown>)[key] : undefined;
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function getRevenueCatApiKey(): string | null {
  const iosKey =
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? getExtraString('revenueCatIosApiKey');
  const androidKey =
    process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? getExtraString('revenueCatAndroidApiKey');

  if (Platform.OS === 'ios') return iosKey ?? null;
  if (Platform.OS === 'android') return androidKey ?? null;
  return null;
}

export function isRevenueCatSupported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export function getPaymentStoreForPurchase(): 'app_store' | 'play_store' | 'test_store' {
  const apiKey = getRevenueCatApiKey();
  if (apiKey?.startsWith('test_')) {
    return 'test_store';
  }

  return Platform.OS === 'ios' ? 'app_store' : 'play_store';
}

/** Platform-specific product IDs for the given catalog product IDs. */
export function resolvePlatformProductIds(
  productIds: { iosProductId: string; androidProductId: string }[]
): string[] {
  if (!isRevenueCatSupported()) return [];
  const key = Platform.OS === 'ios' ? 'iosProductId' : 'androidProductId';
  return productIds.map((p) => p[key]).filter(Boolean) as string[];
}

async function loadPurchasesModule(): Promise<PurchasesModule> {
  if (!modulePromise) {
    modulePromise = import('react-native-purchases') as unknown as Promise<PurchasesModule>;
  }
  return modulePromise;
}

function getPurchases(module: PurchasesModule): Record<string, unknown> {
  return (module.default ?? module) as Record<string, unknown>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function normalizeEntitlement(
  identifier: string,
  entitlement: Record<string, unknown> | null
): EntitlementSnapshot {
  return {
    identifier,
    isActive: entitlement?.isActive === true,
    willRenew: entitlement?.willRenew === true,
    expirationDate:
      typeof entitlement?.expirationDate === 'string' ? entitlement.expirationDate : null,
    productIdentifier:
      typeof entitlement?.productIdentifier === 'string'
        ? entitlement.productIdentifier
        : null,
  };
}

export function normalizeCustomerInfo(customerInfo: unknown): CustomerInfoSnapshot {
  const info = asRecord(customerInfo);
  const entitlementsRoot = asRecord(info?.entitlements);
  const active = asRecord(entitlementsRoot?.active) ?? {};
  const all = asRecord(entitlementsRoot?.all) ?? active;

  const entitlements: Record<string, EntitlementSnapshot> = {};
  for (const [identifier, entitlement] of Object.entries(all)) {
    entitlements[identifier] = normalizeEntitlement(identifier, asRecord(entitlement));
  }

  return {
    activeEntitlementIds: Object.entries(active)
      .filter(([, entitlement]) => asRecord(entitlement)?.isActive === true)
      .map(([identifier]) => identifier),
    entitlements,
    raw: customerInfo,
  };
}

export function hasActiveEntitlement(
  customerInfo: CustomerInfoSnapshot,
  entitlementId: string
): boolean {
  return customerInfo.entitlements[entitlementId]?.isActive === true;
}

function notifyCustomerInfoListeners(customerInfo: CustomerInfoSnapshot): void {
  for (const listener of customerInfoListeners) {
    listener(customerInfo);
  }
}

async function ensureCustomerInfoListener(): Promise<void> {
  if (customerInfoListenerAttached || !isRevenueCatSupported()) {
    return;
  }

  await configureRevenueCatOnce();
  const module = await loadPurchasesModule();
  const Purchases = getPurchases(module);

  if (typeof Purchases.addCustomerInfoUpdateListener !== 'function') {
    return;
  }

  (Purchases.addCustomerInfoUpdateListener as Function)((info: unknown) => {
    notifyCustomerInfoListeners(normalizeCustomerInfo(info));
  });
  customerInfoListenerAttached = true;
}

export function subscribeCustomerInfo(
  listener: (info: CustomerInfoSnapshot) => void
): () => void {
  customerInfoListeners.add(listener);
  void ensureCustomerInfoListener();

  return () => {
    customerInfoListeners.delete(listener);
  };
}

/** Configure RevenueCat once per app session (no app user id). */
export async function configureRevenueCatOnce(): Promise<void> {
  if (!isRevenueCatSupported()) {
    throw new Error('Purchases are only available on iOS and Android.');
  }

  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    throw new Error(
      'RevenueCat is not configured for this platform. ' +
        'Set EXPO_PUBLIC_REVENUECAT_IOS_API_KEY or EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY.'
    );
  }

  if (configurePromise && configuredApiKey === apiKey) {
    return configurePromise;
  }

  configurePromise = (async () => {
    const module = await loadPurchasesModule();
    const Purchases = getPurchases(module);

    if (typeof Purchases.setLogLevel === 'function') {
      Purchases.setLogLevel((module.LOG_LEVEL?.WARN as string) ?? 'WARN');
    }

    if (configuredApiKey !== apiKey) {
      if (typeof Purchases.configure === 'function') {
        await (Purchases.configure as Function)({ apiKey });
      }
      configuredApiKey = apiKey;
      loggedInAppUserId = null;
    }
  })();

  return configurePromise;
}

/** Identify the current purchaser in RevenueCat (safe to call when the id changes). */
export async function loginRevenueCatUser(appUserId: string): Promise<void> {
  if (!appUserId.trim()) {
    throw new Error('RevenueCat app user id is required.');
  }

  if (loggedInAppUserId === appUserId) {
    notifySessionListeners();
    return;
  }

  if (loginPromise && pendingLoginAppUserId === appUserId) {
    return loginPromise;
  }

  pendingLoginAppUserId = appUserId;
  loginPromise = (async () => {
    await configureRevenueCatOnce();

    const module = await loadPurchasesModule();
    const Purchases = getPurchases(module);

    if (typeof Purchases.logIn !== 'function') {
      throw new Error('RevenueCat logIn is unavailable in this SDK version.');
    }

    await (Purchases.logIn as Function)(appUserId);
    loggedInAppUserId = appUserId;
    notifySessionListeners();
  })();

  try {
    await loginPromise;
  } catch (cause) {
    if (loggedInAppUserId !== appUserId) {
      const message =
        cause instanceof Error ? cause.message : 'Unable to sign in to RevenueCat.';
      notifySessionListeners(message);
    }
    throw cause;
  } finally {
    if (pendingLoginAppUserId === appUserId) {
      loginPromise = null;
      pendingLoginAppUserId = null;
    }
  }
}

/** Configure once, then log in with the purchaser account id. */
export async function establishRevenueCatSession(appUserId: string): Promise<void> {
  await loginRevenueCatUser(appUserId);
}

export function clearRevenueCatSessionState(): void {
  loggedInAppUserId = null;
  notifySessionListeners();
}

export async function getStoreProducts(productIds: string[]): Promise<StoreProductInfo[]> {
  const uniqueProductIds = Array.from(new Set(productIds.filter(Boolean)));
  if (uniqueProductIds.length === 0) return [];

  await configureRevenueCatOnce();

  const module = await loadPurchasesModule();
  const Purchases = getPurchases(module);
  const category =
    (module.PRODUCT_CATEGORY?.NON_SUBSCRIPTION as string) ??
    (module.PURCHASE_TYPE?.INAPP as string);

  let products: unknown[];
  try {
    products = category
      ? await (Purchases.getProducts as Function)(uniqueProductIds, category)
      : await (Purchases.getProducts as Function)(uniqueProductIds);
  } catch {
    products = await (Purchases.getProducts as Function)(uniqueProductIds);
  }

  return (products as Record<string, unknown>[]).map((product) => ({
    identifier:
      (product.identifier as string) ?? (product.productIdentifier as string),
    title: product.title as string | undefined,
    description: product.description as string | undefined,
    priceString:
      (product.priceString as string) ?? (product.price_string as string),
    raw: product,
  }));
}

export function isPurchaseCancelledError(cause: unknown): boolean {
  const err = cause as Record<string, unknown>;
  if (err?.userCancelled === true) return true;

  const code = err?.code;
  return (
    code === 'PURCHASE_CANCELLED_ERROR' ||
    code === 'PurchaseCancelledError' ||
    code === 1
  );
}

export async function purchaseStoreProduct(
  product: StoreProductInfo
): Promise<PurchaseResult> {
  await configureRevenueCatOnce();

  const module = await loadPurchasesModule();
  const Purchases = getPurchases(module);

  const result: Record<string, unknown> =
    typeof (Purchases as Record<string, unknown>).purchaseStoreProduct === 'function'
      ? await ((Purchases as Record<string, unknown>).purchaseStoreProduct as Function)(
          product.raw
        )
      : await ((Purchases as Record<string, unknown>).purchaseProduct as Function)(
          product.identifier
        );

  const customerInfo = normalizeCustomerInfo(result?.customerInfo ?? result);
  notifyCustomerInfoListeners(customerInfo);

  const transaction = asRecord(result?.transaction);
  const transactionId =
    typeof transaction?.transactionIdentifier === 'string'
      ? transaction.transactionIdentifier
      : typeof result?.transactionIdentifier === 'string'
        ? (result.transactionIdentifier as string)
        : null;

  return {
    productIdentifier: product.identifier,
    transactionId,
    store: getPaymentStoreForPurchase(),
    customerInfo,
  };
}

export async function getCustomerInfo(): Promise<CustomerInfoSnapshot> {
  await configureRevenueCatOnce();

  const module = await loadPurchasesModule();
  const Purchases = getPurchases(module);
  const customerInfo = await (Purchases.getCustomerInfo as Function)();
  const snapshot = normalizeCustomerInfo(customerInfo);
  notifyCustomerInfoListeners(snapshot);
  return snapshot;
}

export async function restorePurchases(): Promise<CustomerInfoSnapshot> {
  await configureRevenueCatOnce();

  const module = await loadPurchasesModule();
  const Purchases = getPurchases(module);
  const customerInfo = await (Purchases.restorePurchases as Function)();
  const snapshot = normalizeCustomerInfo(customerInfo);
  notifyCustomerInfoListeners(snapshot);
  return snapshot;
}

export interface OfferingsSnapshot {
  currentOfferingIdentifier: string | null;
  offeringIdentifiers: string[];
  raw: unknown;
}

export async function getOfferings(): Promise<OfferingsSnapshot> {
  await configureRevenueCatOnce();

  const module = await loadPurchasesModule();
  const Purchases = getPurchases(module);
  const offerings = await (Purchases.getOfferings as Function)();
  const current = asRecord(offerings)?.current;
  const all = asRecord(offerings)?.all ?? {};

  return {
    currentOfferingIdentifier:
      typeof current?.identifier === 'string' ? current.identifier : null,
    offeringIdentifiers: Object.keys(all),
    raw: offerings,
  };
}
