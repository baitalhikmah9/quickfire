import { afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

import {
  clearRevenueCatSessionState,
  configureRevenueCatOnce,
  getPaymentStoreForPurchase,
  getRevenueCatApiKey,
  getRevenueCatSession,
  hasActiveEntitlement,
  isPurchaseCancelledError,
  logOutRevenueCat,
  normalizeCustomerInfo,
  shouldUseRevenueCatTestStore,
} from '@/lib/payments/revenueCat';
import { REVENUECAT_TEST_STORE_API_KEY } from '@/lib/payments/revenueCatConfig';

const ENV_KEYS = [
  'EXPO_PUBLIC_REVENUECAT_IOS_API_KEY',
  'EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY',
  'EXPO_PUBLIC_REVENUECAT_USE_TEST_STORE',
  'EXPO_PUBLIC_REVENUECAT_USE_PRODUCTION_STORE',
] as const;

function setRevenueCatEnv(values: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>) {
  for (const key of ENV_KEYS) {
    const next = values[key];
    if (next === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = next;
    }
  }
}

describe('revenueCat helpers', () => {
  const originalEnv: Record<string, string | undefined> = {};
  const originalDev = (globalThis as { __DEV__?: boolean }).__DEV__;
  const originalDebugMode = Constants.debugMode;

  beforeAll(() => {
    for (const key of ENV_KEYS) {
      originalEnv[key] = process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const prev = originalEnv[key];
      if (prev === undefined) delete process.env[key];
      else process.env[key] = prev;
    }
    (globalThis as { __DEV__?: boolean }).__DEV__ = originalDev;
    Object.defineProperty(Constants, 'debugMode', {
      configurable: true,
      value: originalDebugMode,
    });
  });

  it('fails clearly when the native purchases module is unavailable', async () => {
    const nativeModules = NativeModules as Record<string, unknown>;
    const original = nativeModules.RNPurchases;
    nativeModules.RNPurchases = undefined;

    try {
      await expect(configureRevenueCatOnce()).rejects.toThrow('development build');
    } finally {
      nativeModules.RNPurchases = original;
    }
  });

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

  it('defaults to the RevenueCat Test Store key (even with live keys present)', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    Object.defineProperty(Constants, 'debugMode', { configurable: true, value: false });
    setRevenueCatEnv({
      EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: 'appl_live_key',
      EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: 'goog_live_key',
      EXPO_PUBLIC_REVENUECAT_USE_TEST_STORE: undefined,
      EXPO_PUBLIC_REVENUECAT_USE_PRODUCTION_STORE: undefined,
    });

    expect(shouldUseRevenueCatTestStore()).toBe(true);
    expect(getRevenueCatApiKey()).toBe(REVENUECAT_TEST_STORE_API_KEY);
    expect(getPaymentStoreForPurchase()).toBe('test_store');
  });

  it('uses platform production keys only when production store is opted in', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    Object.defineProperty(Constants, 'debugMode', { configurable: true, value: false });
    setRevenueCatEnv({
      EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: 'appl_live_key',
      EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: 'goog_live_key',
      EXPO_PUBLIC_REVENUECAT_USE_TEST_STORE: undefined,
      EXPO_PUBLIC_REVENUECAT_USE_PRODUCTION_STORE: '1',
    });

    expect(shouldUseRevenueCatTestStore()).toBe(false);
    if (Platform.OS === 'ios') {
      expect(getRevenueCatApiKey()).toBe('appl_live_key');
      expect(getPaymentStoreForPurchase()).toBe('app_store');
    } else if (Platform.OS === 'android') {
      expect(getRevenueCatApiKey()).toBe('goog_live_key');
      expect(getPaymentStoreForPurchase()).toBe('play_store');
    } else {
      expect(getRevenueCatApiKey()).toBeNull();
    }
  });

  it('forces the Test Store key under __DEV__ even if production store is opted in', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    Object.defineProperty(Constants, 'debugMode', { configurable: true, value: false });
    setRevenueCatEnv({
      EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: 'appl_live_key',
      EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: 'goog_live_key',
      EXPO_PUBLIC_REVENUECAT_USE_TEST_STORE: undefined,
      EXPO_PUBLIC_REVENUECAT_USE_PRODUCTION_STORE: '1',
    });

    expect(shouldUseRevenueCatTestStore()).toBe(true);
    expect(getRevenueCatApiKey()).toBe(REVENUECAT_TEST_STORE_API_KEY);
  });

  it('clears local session state without requiring the native SDK', () => {
    clearRevenueCatSessionState();
    expect(getRevenueCatSession()).toEqual({
      appUserId: null,
      ready: false,
      error: null,
    });
  });

  it('logOutRevenueCat clears session state even when Purchases is unavailable', async () => {
    const nativeModules = NativeModules as Record<string, unknown>;
    const originalNative = nativeModules.RNPurchases;
    nativeModules.RNPurchases = undefined;

    try {
      await expect(logOutRevenueCat()).resolves.toBeUndefined();
      expect(getRevenueCatSession()).toEqual({
        appUserId: null,
        ready: false,
        error: null,
      });
    } finally {
      nativeModules.RNPurchases = originalNative;
    }
  });
});
