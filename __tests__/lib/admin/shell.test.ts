import { act, renderHook, waitFor } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { Platform } from 'react-native';
import {
  ADMIN_SIDEBAR_COLLAPSED_KEY,
  adminHref,
  breadcrumbsForAdminPath,
  normalizeAdminPath,
  useSidebarCollapsed,
} from '@/lib/admin/shell';

describe('admin subdomain routes', () => {
  it('removes the admin prefix only on the admin host', () => {
    expect(adminHref('/admin', 'admin.playbackfire.com')).toBe('/');
    expect(adminHref('/admin/purchases', 'admin.playbackfire.com')).toBe('/purchases');
    expect(adminHref('/admin/sign-in', 'admin.playbackfire.com')).toBe('/login');
    expect(adminHref('/admin/purchases', 'www.playbackfire.com')).toBe('/admin/purchases');
  });

  it('normalizes clean admin-host paths for shell state', () => {
    expect(normalizeAdminPath('/')).toBe('/admin');
    expect(normalizeAdminPath('/purchases/123')).toBe('/admin/purchases/123');
  });
});

describe('breadcrumbsForAdminPath', () => {
  it('returns the dashboard crumb at /admin', () => {
    expect(breadcrumbsForAdminPath('/admin')).toEqual([{ label: 'Dashboard' }]);
    expect(breadcrumbsForAdminPath('/(admin)')).toEqual([{ label: 'Dashboard' }]);
    expect(breadcrumbsForAdminPath('/')).toEqual([{ label: 'Dashboard' }]);
  });

  it('builds linked parent crumbs for nested admin routes', () => {
    expect(breadcrumbsForAdminPath('/admin/promo-codes')).toEqual([
      { label: 'Dashboard', href: '/admin' },
      { label: 'Promo Codes' },
    ]);
    expect(breadcrumbsForAdminPath('/admin/topics')).toEqual([
      { label: 'Dashboard', href: '/admin' },
      { label: 'Topics' },
    ]);
    expect(breadcrumbsForAdminPath('/admin/purchases/purchase_1')).toEqual([
      { label: 'Dashboard', href: '/admin' },
      { label: 'Purchases', href: '/admin/purchases' },
      { label: 'Details' },
    ]);
  });

  it('does not expose admin routes in affiliate breadcrumbs', () => {
    expect(breadcrumbsForAdminPath('/admin/affiliate', { affiliate: true })).toEqual([
      { label: 'My coupon' },
    ]);
    expect(breadcrumbsForAdminPath('/admin/promo-codes', { affiliate: true })).toEqual([
      { label: 'My coupon' },
    ]);
  });
});

function installMemoryStorage() {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
    },
  });
}

describe('useSidebarCollapsed', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    installMemoryStorage();
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
  });

  it('starts expanded before rehydration', () => {
    const { result } = renderHook(() => useSidebarCollapsed());
    expect(result.current[0]).toBe(false);
  });

  it('rehydrates a stored collapsed state after mount', async () => {
    globalThis.localStorage.setItem(ADMIN_SIDEBAR_COLLAPSED_KEY, '1');
    const { result } = renderHook(() => useSidebarCollapsed());
    await waitFor(() => {
      expect(result.current[0]).toBe(true);
    });
  });

  it('persists collapse across the setter', () => {
    const { result } = renderHook(() => useSidebarCollapsed());
    act(() => {
      result.current[1](true);
    });
    expect(globalThis.localStorage.getItem(ADMIN_SIDEBAR_COLLAPSED_KEY)).toBe('1');
    act(() => {
      result.current[2]();
    });
    expect(result.current[0]).toBe(false);
    expect(globalThis.localStorage.getItem(ADMIN_SIDEBAR_COLLAPSED_KEY)).toBe('0');
  });
});
