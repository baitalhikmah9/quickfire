import React from 'react';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Platform, StyleSheet } from 'react-native';
import { __setWindowDimensions } from '../doubles/windowDimensions';

import AdminLayout, { AdminAccessBoundary } from '@/app/(admin)/_layout';
import AdminIndexScreen from '@/app/(admin)/index';
import PromoCodesScreen from '@/app/(admin)/promo-codes';
import WalletsScreen from '@/app/(admin)/wallets';
import TransactionsScreen, { exclusiveNextDay, parseDateInput } from '@/app/(admin)/transactions';
import PurchasesScreen from '@/app/(admin)/purchases';
import AuditScreen from '@/app/(admin)/audit';
import TopicsScreen, { sinceMsForWindow } from '@/app/(admin)/topics';
import AdminRouteIndexScreen from '@/app/admin';
import AdminSignInScreen from '@/app/admin/sign-in';
import AdminSignOutScreen from '@/app/(admin)/sign-out';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockCanGoBack = jest.fn(() => true);
const mockRedirect = jest.fn();
let mockPathname = '/admin';
const mockSignOut = jest.fn();
const mockUseAuth = jest.fn(() => ({
  isSignedIn: true,
  userId: 'user_123',
  isLoaded: true,
  signOut: mockSignOut,
}));
const mockUseQuery = jest.fn<(...args: unknown[]) => unknown>(() => ({
  _id: 'user_123',
  role: 'admin',
  email: 'admin@example.com',
  items: [],
}));
const mockUseConvexAuth = jest.fn(() => ({
  isAuthenticated: false,
  isLoading: false,
}));
const mockPasswordSignInPreflight = jest.fn(() =>
  Promise.resolve({ allowed: true as const, failuresInWindow: 0 })
);
const mockPasswordSignInRecordFailure = jest.fn(() => Promise.resolve());
const mockPasswordSignInClearFailures = jest.fn(() =>
  Promise.resolve({ ok: true as const })
);
let adminSignInMutationCall = 0;
const mockUseMutation = jest.fn<(...args: unknown[]) => unknown>(
  () => jest.fn(() => Promise.resolve({ allowed: true, failuresInWindow: 0 }))
);

const mockUseAction = jest.fn<(...args: unknown[]) => unknown>(
  () => jest.fn(() => Promise.resolve({ ok: true }))
);

function useAdminSignInMutationMocks() {
  adminSignInMutationCall = 0;
  mockUseMutation.mockImplementation(() => {
    const fns = [
      mockPasswordSignInPreflight,
      mockPasswordSignInRecordFailure,
      mockPasswordSignInClearFailures,
    ];
    const fn = fns[adminSignInMutationCall % 3] ?? mockPasswordSignInPreflight;
    adminSignInMutationCall += 1;
    return fn;
  });
}
const mockWarmUpAsync = jest.fn(() => Promise.resolve());
const mockCoolDownAsync = jest.fn(() => Promise.resolve());
type MockSignInResult = {
  status: string;
  createdSessionId: string | null;
};
const mockSignInCreate = jest.fn<
  (args: { identifier: string; password: string }) => Promise<MockSignInResult>
>();
const mockSetActive = jest.fn(() => Promise.resolve());

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: mockReplace,
    canGoBack: mockCanGoBack,
  }),
  useLocalSearchParams: () => ({}),
  usePathname: () => mockPathname,
  Redirect: ({ href }: { href: string }) => {
    mockRedirect(href);
    return null;
  },
  Stack: () => null,
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@clerk/clerk-expo', () => ({
  useAuth: () => mockUseAuth(),
  useSSO: () => ({
    startSSOFlow: jest.fn(),
  }),
  useSignIn: () => ({
    isLoaded: true,
    signIn: {
      create: mockSignInCreate,
    },
    setActive: mockSetActive,
  }),
  useUser: () => ({
    user: {
      id: 'user_123',
      primaryEmailAddress: { emailAddress: 'admin@example.com' },
    },
  }),
}));

jest.mock('convex/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useAction: (...args: unknown[]) => mockUseAction(...args),
  useConvexAuth: () => mockUseConvexAuth(),
}));

jest.mock('@/lib/authMode', () => ({
  isAuthDisabled: () => false,
}));


jest.mock('expo-web-browser', () => ({
  warmUpAsync: () => mockWarmUpAsync(),
  coolDownAsync: () => mockCoolDownAsync(),
}));


const DESKTOP_WINDOW = { width: 1280, height: 800, scale: 1, fontScale: 1 } as const;

// Keep admin desktop layout after the global window double resets to mobile defaults.
beforeEach(() => {
  __setWindowDimensions(DESKTOP_WINDOW);
});

describe('AdminLayout', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    mockPush.mockClear();
    mockBack.mockClear();
    mockReplace.mockClear();
    mockCanGoBack.mockClear();
    mockRedirect.mockClear();
    mockSignOut.mockClear();
    mockUseAuth.mockReturnValue({
      isSignedIn: true,
      userId: 'user_123',
      isLoaded: true,
      signOut: mockSignOut,
    });
    mockUseQuery.mockReturnValue({
      _id: 'user_123',
      role: 'admin',
      email: 'admin@example.com',
      items: [],
    });
    jest.clearAllMocks();
    mockPathname = '/admin';
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
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
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
  });

  it('renders null while auth is loading on web', () => {
    mockUseAuth.mockReturnValue({
      isSignedIn: false,
      userId: '',
      isLoaded: false,
      signOut: mockSignOut,
    });

    const { toJSON } = render(<AdminLayout />);
    expect(toJSON()).toBeNull();
  });

  it('does not crash when signed in on web', () => {
    mockUseAuth.mockReturnValue({
      isSignedIn: true,
      userId: 'user_123',
      isLoaded: true,
      signOut: mockSignOut,
    });

    const { toJSON } = render(<AdminLayout />);
    expect(toJSON()).toBeTruthy();
  });

  it('opens account actions in a popup instead of navigating immediately', () => {
    mockUseAuth.mockReturnValue({
      isSignedIn: true,
      userId: 'user_123',
      isLoaded: true,
      signOut: mockSignOut,
    });

    render(<AdminLayout />);
    expect(screen.queryByLabelText('Sign out')).toBeNull();
    fireEvent.press(screen.getByLabelText('Account menu'));
    expect(screen.getByLabelText('Sign out')).toBeTruthy();
    expect(screen.getByText('Log out')).toBeTruthy();
  });

  it('redirects signed-out web admins to the admin auth page', () => {
    mockUseAuth.mockReturnValue({
      isSignedIn: false,
      userId: '',
      isLoaded: true,
      signOut: mockSignOut,
    });

    render(<AdminLayout />);
    expect(mockRedirect).toHaveBeenCalledWith('/admin/sign-in');
  });

  it('redirects to admin auth when Convex has no authenticated profile', () => {
    mockUseAuth.mockReturnValue({
      isSignedIn: true,
      userId: 'user_123',
      isLoaded: true,
      signOut: mockSignOut,
    });
    mockUseQuery.mockReturnValue(null as never);

    render(<AdminLayout />);
    expect(mockRedirect).toHaveBeenCalledWith('/admin/sign-in');
  });

  it('redirects non-admin accounts to the admin auth page', () => {
    mockUseAuth.mockReturnValue({
      isSignedIn: true,
      userId: 'user_123',
      isLoaded: true,
      signOut: mockSignOut,
    });
    mockUseQuery.mockReturnValue({
      _id: 'user_123',
      role: 'player',
      email: 'player@example.com',
      items: [],
    } as never);

    render(<AdminLayout />);
    expect(mockRedirect).toHaveBeenCalledWith('/admin/sign-in');
  });

  it('redirects assigned affiliates to the coupon dashboard', () => {
    mockUseQuery
      .mockReturnValueOnce({
        _id: 'user_aff',
        email: 'creator@example.com',
      } as never)
      .mockReturnValueOnce({
        codes: [{ code: 'mikhail10', usageCount: 4 }],
      } as never);

    render(<AdminLayout />);
    expect(mockRedirect).toHaveBeenCalledWith('/admin/affiliate');
  });

  it('redirects away from admin on native platforms', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

    render(<AdminLayout />);
    expect(mockRedirect).toHaveBeenCalledWith('/(app)/');
  });

  it('shows route breadcrumbs and a desktop collapse rail', () => {
    mockPathname = '/admin/promo-codes';
    render(<AdminLayout />);
    expect(screen.getByLabelText('Breadcrumb')).toBeTruthy();
    expect(screen.getAllByText('Promo Codes').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('Dashboard').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Toggle sidebar rail')).toBeTruthy();
    expect(screen.getByLabelText('Toggle sidebar')).toBeTruthy();
    // Brand/nav nodes may receive style arrays; assert flattened desktop geometry instead.
    expect(StyleSheet.flatten(screen.getByTestId('admin-sidebar-trigger').props.style)).toEqual(
      expect.objectContaining({ width: 28, height: 28 })
    );
    expect(StyleSheet.flatten(screen.getByTestId('admin-sidebar-nav-Dashboard').props.style)).toEqual(
      expect.objectContaining({ height: 32, paddingHorizontal: 8, borderRadius: 6 })
    );
  });

  it('persists desktop sidebar collapse to web storage', () => {
    render(<AdminLayout />);
    fireEvent.press(screen.getByLabelText('Toggle sidebar'));
    expect(globalThis.localStorage.getItem('backfire:admin-sidebar-collapsed')).toBe('1');
    expect(
      StyleSheet.flatten(screen.getByTestId('admin-sidebar-brand-icon').props.style).marginRight
    ).toBe(0);
    expect(
      StyleSheet.flatten(screen.getByTestId('admin-sidebar-nav-icon-Dashboard').props.style)
    ).toEqual(expect.objectContaining({ width: 16, flexShrink: 0 }));
    expect(
      StyleSheet.flatten(screen.getByTestId('admin-sidebar-nav-Dashboard').props.style)
    ).toEqual(
      expect.objectContaining({
        width: 32,
        flexDirection: 'row',
        alignItems: 'center',
        transition: expect.stringContaining('width'),
      })
    );
  });

  it('keeps affiliate nav limited to My coupon', () => {
    mockPathname = '/admin/affiliate';
    mockUseQuery
      .mockReturnValueOnce({
        _id: 'user_aff',
        email: 'creator@example.com',
      } as never)
      .mockReturnValueOnce({
        codes: [{ code: 'mikhail10', usageCount: 4 }],
      } as never);

    render(<AdminLayout />);
    expect(screen.getAllByText('My coupon').length).toBeGreaterThan(0);
    expect(screen.queryByText('Promo Codes')).toBeNull();
    expect(screen.queryByText('Wallets')).toBeNull();
    expect(screen.queryByText('Transactions')).toBeNull();
    expect(screen.queryByText('Audit Log')).toBeNull();
    expect(screen.queryByLabelText('Dashboard')).toBeNull();
  });

  it('uses an off-canvas trigger on mobile and hides the desktop rail', () => {
    __setWindowDimensions({ width: 800, height: 900, scale: 1, fontScale: 1 });
    render(<AdminLayout />);
    expect(screen.getByLabelText('Open navigation')).toBeTruthy();
    expect(screen.queryByLabelText('Toggle sidebar rail')).toBeNull();
  });
});

describe('AdminIndexScreen', () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({
      _id: 'user_123',
      role: 'admin',
      email: 'admin@example.com',
      items: [],
    });
  });

  it('renders the dashboard heading and overview tab', () => {
    render(<AdminIndexScreen />);
    expect(screen.getByText('Dashboard')).toBeTruthy();
    expect(screen.getAllByText('Overview').length).toBeGreaterThanOrEqual(1);
  });

  it('renders shadcn-style stat cards with zeroed stats while data is absent', () => {
    render(<AdminIndexScreen />);
    expect(screen.getByText('Total Revenue')).toBeTruthy();
    expect(screen.getByText('Purchases')).toBeTruthy();
    expect(screen.getByText('Active Promo Codes')).toBeTruthy();
    expect(screen.getByText('Total Redemptions')).toBeTruthy();
  });

  it('renders the revenue chart and recent activity cards', () => {
    render(<AdminIndexScreen />);
    expect(screen.getAllByText('Overview').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Recent Activity')).toBeTruthy();
  });
});

describe('PromoCodesScreen', () => {
  const createPromo = jest.fn<(args: unknown) => Promise<{ promoCodeId: string }>>();

  beforeEach(() => {
    createPromo.mockResolvedValue({ promoCodeId: 'promo_123' });
    mockUseQuery.mockImplementation((...args: unknown[]) => {
      const queryArgs = args[1];

      if (
        typeof queryArgs === 'object' &&
        queryArgs !== null &&
        'query' in queryArgs &&
        (queryArgs as { query?: string }).query === 'target'
      ) {
        return [
          {
            wallet: {
              _id: 'wallet_123',
              purchaserAccountId: 'purchaser_123',
              balance: 10,
            },
            user: {
              _id: 'user_restricted',
              email: 'target@example.com',
              name: 'Target User',
              clerkId: 'clerk_target',
            },
            recentTransactions: [],
          },
        ];
      }

      return {
        _id: 'user_123',
        role: 'admin',
        email: 'admin@example.com',
        items: [],
      };
    });
    mockUseMutation.mockReturnValue(createPromo);
  });

  it('renders promo codes title', () => {
    render(<PromoCodesScreen />);
    expect(screen.getByText('Promo Codes')).toBeTruthy();
  });

  it('shows the coupon mode selector in the create form', () => {
    render(<PromoCodesScreen />);

    fireEvent.press(screen.getByText('Create'));

    expect(screen.getByText('Mode')).toBeTruthy();
    expect(screen.getByText('Public Single-Use')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Select coupon mode'));
    expect(screen.getByText('Public Multi-Use')).toBeTruthy();
    expect(screen.getByText('Account Single-Use')).toBeTruthy();
    expect(screen.getByText('Account Multi-Use')).toBeTruthy();
  });

  it('shows restricted account search only for account modes', () => {
    render(<PromoCodesScreen />);

    fireEvent.press(screen.getByText('Create'));
    expect(screen.queryByText('Restricted Account')).toBeNull();

    fireEvent.press(screen.getByLabelText('Select coupon mode'));
    fireEvent.press(screen.getByText('Account Single-Use'));
    expect(screen.getByText('Restricted Account')).toBeTruthy();
  });

  it('submits mode and restricted account ids for account coupons', async () => {
    render(<PromoCodesScreen />);

    fireEvent.press(screen.getByText('Create'));
    fireEvent.changeText(screen.getByPlaceholderText('e.g. WELCOME2024'), 'VIP123');
    fireEvent.changeText(screen.getByPlaceholderText('Tokens'), '50');
    fireEvent.press(screen.getByLabelText('Select coupon mode'));
    fireEvent.press(screen.getByText('Account Single-Use'));
    fireEvent.changeText(screen.getByPlaceholderText('Search email, Clerk id, or purchaser id'), 'target');
    fireEvent.press(await screen.findByText('target@example.com'));
    fireEvent.press(screen.getByText('Create Promo Code'));

    await waitFor(() => {
      expect(createPromo).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'VIP123',
          rewardAmount: 50,
          mode: 'account_single_use',
          restrictedToUserId: 'user_restricted',
          restrictedToPurchaserAccountId: 'purchaser_123',
        })
      );
    });
  });

  it('can generate a code and apply the affiliate preset', async () => {
    render(<PromoCodesScreen />);
    fireEvent.press(screen.getByText('Create'));
    fireEvent.press(screen.getByLabelText('Generate random code'));
    const codeInput = screen.getByPlaceholderText('e.g. WELCOME2024');
    expect(String((codeInput.props as { value?: string }).value ?? '')).toHaveLength(8);

    fireEvent.press(screen.getByLabelText('Toggle affiliate preset'));
    expect(screen.getByText('Affiliate Email')).toBeTruthy();
    expect(screen.getByText('Commission Percent')).toBeTruthy();
    fireEvent.changeText(screen.getByPlaceholderText('creator@example.com'), 'creator@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. 10'), '10');
    fireEvent.changeText(screen.getByPlaceholderText('Tokens'), '20');
    fireEvent.press(screen.getByText('Create Promo Code'));

    await waitFor(() => {
      expect(createPromo).toHaveBeenCalledWith(
        expect.objectContaining({
          rewardAmount: 20,
          usageCap: 0,
          mode: 'public_multi_use',
          affiliateEmail: 'creator@example.com',
          commissionPercent: 10,
        })
      );
    });
  });
});

describe('WalletsScreen', () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({
      _id: 'user_123',
      role: 'admin',
      email: 'admin@example.com',
      items: [],
    });
    mockUseMutation.mockReturnValue(jest.fn());
  });

  it('renders wallets title', () => {
    render(<WalletsScreen />);
    expect(screen.getByText('Wallets')).toBeTruthy();
  });
});

describe('Admin web routes', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    mockWarmUpAsync.mockClear();
    mockCoolDownAsync.mockClear();
    mockSignInCreate.mockReset();
    mockSetActive.mockReset();
    mockSetActive.mockImplementation(() => Promise.resolve());
    mockPasswordSignInPreflight.mockClear();
    mockPasswordSignInRecordFailure.mockClear();
    mockPasswordSignInClearFailures.mockClear();
    mockPasswordSignInPreflight.mockResolvedValue({
      allowed: true,
      failuresInWindow: 0,
    });
    mockPasswordSignInClearFailures.mockResolvedValue({ ok: true });
    useAdminSignInMutationMocks();
    mockUseConvexAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });
    mockUseQuery.mockReturnValue({
      _id: 'user_123',
      role: 'admin',
      email: 'admin@example.com',
      items: [],
    });
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
  });

  it('exposes the overview dashboard at /admin', () => {
    render(<AdminRouteIndexScreen />);
    // Sidebar nav and page title both say Overview; at least one is enough
    expect(screen.getAllByText('Overview').length).toBeGreaterThanOrEqual(1);
  });

  it('shows a setup message when Convex admin functions are unavailable', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const originalDispatchEvent = window.dispatchEvent;
    window.dispatchEvent = jest.fn(() => true);
    mockUseQuery.mockReturnValue({
      _id: 'user_123',
      role: 'admin',
      email: 'admin@example.com',
      items: [],
    });
    function MissingConvexFunction(): React.ReactNode {
      throw new Error("Could not find public function for 'admin:listPromoCodes'");
    }

    render(
      <AdminAccessBoundary>
        <MissingConvexFunction />
      </AdminAccessBoundary>
    );

    expect(screen.getByText('Admin backend unavailable')).toBeTruthy();
    expect(screen.getByText(/repo-local Convex/)).toBeTruthy();

    window.dispatchEvent = originalDispatchEvent;
    consoleError.mockRestore();
  });

  it('exposes an admin sign-out screen', () => {
    mockUseAuth.mockReturnValue({
      isSignedIn: true,
      userId: 'user_123',
      isLoaded: true,
      signOut: mockSignOut,
    });

    render(<AdminSignOutScreen />);
    expect(screen.getByText('Sign out')).toBeTruthy();
    expect(screen.getByLabelText('Sign out of admin')).toBeTruthy();
    expect(screen.getByLabelText('Back to admin overview')).toBeTruthy();
  });

  it('exposes an admin sign-in page', () => {
    mockUseAuth.mockReturnValue({
      isSignedIn: false,
      userId: '',
      isLoaded: true,
      signOut: mockSignOut,
    });

    render(<AdminSignInScreen />);
    expect(screen.getByText('ADMIN ACCESS')).toBeTruthy();
    expect(screen.getByPlaceholderText('Username')).toBeTruthy();
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
  });

  it('redirects signed-in admins from admin sign-in to the dashboard', () => {
    mockUseAuth.mockReturnValue({
      isSignedIn: true,
      userId: 'user_123',
      isLoaded: true,
      signOut: mockSignOut,
    });
    mockUseQuery.mockReturnValue({
      _id: 'user_123',
      role: 'admin',
      email: 'admin@example.com',
      items: [],
    });

    render(<AdminSignInScreen />);
    expect(mockRedirect).toHaveBeenCalledWith('/admin');
  });

  it('shows switch-account when signed in without admin role', () => {
    mockUseAuth.mockReturnValue({
      isSignedIn: true,
      userId: 'user_123',
      isLoaded: true,
      signOut: mockSignOut,
    });
    mockUseQuery.mockReturnValue({
      _id: 'user_123',
      role: 'player',
      email: 'player@example.com',
      items: [],
    });

    render(<AdminSignInScreen />);
    expect(screen.getByText('Switch account')).toBeTruthy();
    expect(screen.getByText('SIGN OUT')).toBeTruthy();
  });

  it('signs in admins with Clerk username and password', async () => {
    mockUseAuth.mockReturnValue({
      isSignedIn: false,
      userId: '',
      isLoaded: true,
      signOut: mockSignOut,
    });
    mockSignInCreate.mockResolvedValue({
      status: 'complete',
      createdSessionId: 'sess_123',
    });

    render(<AdminSignInScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Username'), 'operator');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'correct-password');
    fireEvent.press(screen.getByText('SIGN IN'));

    await waitFor(() => {
      expect(mockSignInCreate).toHaveBeenCalledWith({
        identifier: 'operator',
        password: 'correct-password',
      });
      expect(mockSetActive).toHaveBeenCalledWith({ session: 'sess_123' });
    });
  });

  it('shows a generic error for failed password sign-in (no Clerk enumeration)', async () => {
    mockUseAuth.mockReturnValue({
      isSignedIn: false,
      userId: '',
      isLoaded: true,
      signOut: mockSignOut,
    });
    mockSignInCreate.mockRejectedValue(
      new Error("Couldn't find your account.")
    );

    render(<AdminSignInScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Username'), 'missing-user');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'wrong');
    fireEvent.press(screen.getByText('SIGN IN'));

    await waitFor(() => {
      expect(screen.getByText('Invalid username or password.')).toBeTruthy();
    });
    expect(screen.queryByText("Couldn't find your account.")).toBeNull();
    expect(mockPasswordSignInRecordFailure).toHaveBeenCalledWith({
      identifier: 'missing-user',
    });
  });

  it('defers rate-limit clear until Convex auth is ready after password sign-in', async () => {
    mockUseAuth.mockReturnValue({
      isSignedIn: false,
      userId: '',
      isLoaded: true,
      signOut: mockSignOut,
    });
    mockUseConvexAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });
    mockSignInCreate.mockResolvedValue({
      status: 'complete',
      createdSessionId: 'sess_123',
    });

    const { rerender } = render(<AdminSignInScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Username'), 'operator');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'correct-password');
    fireEvent.press(screen.getByText('SIGN IN'));

    await waitFor(() => {
      expect(mockSetActive).toHaveBeenCalledWith({ session: 'sess_123' });
    });
    expect(mockPasswordSignInClearFailures).not.toHaveBeenCalled();

    // Convex JWT propagates after Clerk setActive (same race that produced Not authenticated)
    mockUseConvexAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    rerender(<AdminSignInScreen />);

    await waitFor(() => {
      expect(mockPasswordSignInClearFailures).toHaveBeenCalledWith({
        identifier: 'operator',
      });
    });
  });

  it('does not call native web browser warmup APIs on web', () => {
    mockUseAuth.mockReturnValue({
      isSignedIn: false,
      userId: '',
      isLoaded: true,
      signOut: mockSignOut,
    });

    render(<AdminSignInScreen />);

    expect(mockWarmUpAsync).not.toHaveBeenCalled();
    expect(mockCoolDownAsync).not.toHaveBeenCalled();
  });

  it('redirects away from admin sign-in on native platforms', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    mockUseAuth.mockReturnValue({
      isSignedIn: false,
      userId: '',
      isLoaded: true,
      signOut: mockSignOut,
    });

    render(<AdminSignInScreen />);

    expect(mockRedirect).toHaveBeenCalledWith('/(app)/');
    expect(screen.queryByText('ADMIN ACCESS')).toBeNull();
  });
});

describe('TransactionsScreen', () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({
      _id: 'user_123',
      role: 'admin',
      email: 'admin@example.com',
      items: [],
      nextCursor: null,
    });
  });

  it('renders the transaction ledger title without redundant dashboard navigation', () => {
    render(<TransactionsScreen />);
    expect(screen.getByText('Transactions')).toBeTruthy();
    expect(screen.queryByLabelText('Go back')).toBeNull();
  });

  it('renders an empty ledger message', () => {
    render(<TransactionsScreen />);
    expect(screen.getByText('No transactions found.')).toBeTruthy();
  });

  it('offers canonical source filter values, not the legacy store/game labels', () => {
    render(<TransactionsScreen />);
    fireEvent.press(screen.getByLabelText('Select source filter'));
    expect(screen.getByText('Purchase')).toBeTruthy();
    expect(screen.getByText('Gameplay')).toBeTruthy();
    expect(screen.getByText('System')).toBeTruthy();
    expect(screen.getByText('Admin')).toBeTruthy();
    expect(screen.getByText('Promo')).toBeTruthy();
    expect(screen.queryByText('Store')).toBeNull();
    expect(screen.queryByText('Game')).toBeNull();
  });

  it('pages forward with the returned cursor and resets pagination when a filter changes', () => {
    const calls: unknown[][] = [];
    mockUseQuery.mockImplementation((...args: unknown[]) => {
      calls.push(args);
      return {
        _id: 'user_123',
        role: 'admin',
        email: 'admin@example.com',
        items: [
          {
            transaction: {
              _id: 'tx_1',
              type: 'purchase_grant',
              amount: 10,
              source: 'purchase',
              createdAt: 123,
            },
            wallet: null,
            userEmail: null,
          },
        ],
        nextCursor: 456,
      };
    });

    render(<TransactionsScreen />);
    fireEvent.press(screen.getByText('Next'));
    const afterNext = calls[calls.length - 1][1] as { cursor?: number };
    expect(afterNext.cursor).toBe(456);

    fireEvent.press(screen.getByLabelText('Select source filter'));
    fireEvent.press(screen.getByText('Purchase'));
    const afterFilter = calls[calls.length - 1][1] as { cursor?: number; source?: string };
    expect(afterFilter.cursor).toBeUndefined();
    expect(afterFilter.source).toBe('purchase');
  });

  it('goes back with Previous using the cursor stack', () => {
    const calls: unknown[][] = [];
    mockUseQuery.mockImplementation((...args: unknown[]) => {
      calls.push(args);
      return {
        _id: 'user_123',
        role: 'admin',
        email: 'admin@example.com',
        items: [
          {
            transaction: { _id: 'tx_1', type: 'purchase_grant', amount: 10, source: 'purchase', createdAt: 123 },
            wallet: null,
            userEmail: null,
          },
        ],
        nextCursor: 789,
      };
    });

    render(<TransactionsScreen />);
    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText('Previous'));
    const afterPrevious = calls[calls.length - 1][1] as { cursor?: number };
    expect(afterPrevious.cursor).toBeUndefined();
  });

  it('wires inclusive date range args when dates are applied', () => {
    const calls: unknown[][] = [];
    mockUseQuery.mockImplementation((...args: unknown[]) => {
      calls.push(args);
      return {
        _id: 'user_123',
        role: 'admin',
        email: 'admin@example.com',
        items: [],
        nextCursor: null,
      };
    });

    render(<TransactionsScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('e.g. 2025-01-01'), '2025-01-01');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. 2025-12-31'), '2025-01-01');
    fireEvent.press(screen.getByText('Apply Dates'));
    const args = calls[calls.length - 1][1] as { from?: number; to?: number };
    expect(args.from).toBe(new Date(2025, 0, 1).getTime());
    // To is the exclusive start of the next day, so 23:59:59.999 of Jan 1
    // satisfies createdAt < to and the selected day is fully included.
    expect(args.to).toBe(new Date(2025, 0, 2).getTime());
  });

  it('keeps Previous reachable on an empty final page', () => {
    const calls: unknown[][] = [];
    let callCount = 0;
    mockUseQuery.mockImplementation((...args: unknown[]) => {
      calls.push(args);
      callCount += 1;
      if (callCount === 1) {
        return {
          _id: 'user_123',
          role: 'admin',
          email: 'admin@example.com',
          items: [
            {
              transaction: { _id: 'tx_1', type: 'purchase_grant', amount: 10, source: 'purchase', createdAt: 123 },
              wallet: null,
              userEmail: null,
            },
          ],
          nextCursor: 456,
        };
      }
      return { _id: 'user_123', role: 'admin', email: 'admin@example.com', items: [], nextCursor: null };
    });

    render(<TransactionsScreen />);
    fireEvent.press(screen.getByText('Next'));
    // Page 2 is empty with no next cursor, but Previous must remain visible.
    expect(screen.getByText('No transactions found.')).toBeTruthy();
    fireEvent.press(screen.getByText('Previous'));
    const afterPrevious = calls[calls.length - 1][1] as { cursor?: number };
    expect(afterPrevious.cursor).toBeUndefined();
  });

  it('renders Next when an empty result still carries a cursor', () => {
    const calls: unknown[][] = [];
    mockUseQuery.mockImplementation((...args: unknown[]) => {
      calls.push(args);
      return {
        _id: 'user_123',
        role: 'admin',
        email: 'admin@example.com',
        items: [],
        nextCursor: 789,
      };
    });

    render(<TransactionsScreen />);
    expect(screen.getByText('No transactions found.')).toBeTruthy();
    fireEvent.press(screen.getByText('Next'));
    const afterNext = calls[calls.length - 1][1] as { cursor?: number };
    expect(afterNext.cursor).toBe(789);
  });

  it('rejects malformed and reversed date ranges', () => {
    render(<TransactionsScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('e.g. 2025-01-01'), '2025-13-99');
    fireEvent.press(screen.getByText('Apply Dates'));
    expect(screen.getByText('Dates must be valid YYYY-MM-DD values.')).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText('e.g. 2025-01-01'), '2025-02-01');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. 2025-12-31'), '2025-01-01');
    fireEvent.press(screen.getByText('Apply Dates'));
    expect(screen.getByText('From must be on or before To.')).toBeTruthy();
  });
});

describe('parseDateInput', () => {
  it('parses valid dates, rejects malformed input, and treats empty as unset', () => {
    expect(parseDateInput('')).toBeUndefined();
    expect(parseDateInput('   ')).toBeUndefined();
    expect(parseDateInput('2025-01-02')).toBe(new Date(2025, 0, 2).getTime());
    expect(parseDateInput('2025-02-30')).toBe('invalid');
    expect(parseDateInput('2025/01/01')).toBe('invalid');
    expect(parseDateInput('not-a-date')).toBe('invalid');
  });

  it('bounds the To day exclusively so its last millisecond is included', () => {
    const toDayStart = new Date(2025, 0, 1).getTime();
    const toExclusive = exclusiveNextDay(toDayStart);
    // A transaction at the very last millisecond of the selected day must pass
    // the backend's createdAt < to filter.
    expect(new Date(2025, 0, 1, 23, 59, 59, 999).getTime()).toBeLessThan(toExclusive);
    // The bound is exactly local midnight of the following day.
    expect(toExclusive).toBe(new Date(2025, 0, 2).getTime());
    // A transaction at the start of the next day is excluded.
    expect(new Date(2025, 0, 2).getTime()).toBe(toExclusive);
  });
});

describe('PurchasesScreen', () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({
      _id: 'user_123',
      role: 'admin',
      email: 'admin@example.com',
      items: [],
      nextCursor: null,
    });
  });

  it('renders the purchases title', () => {
    render(<PurchasesScreen />);
    expect(screen.getByText('Purchases')).toBeTruthy();
  });

  it('pages forward with the returned cursor and resets on search', () => {
    const calls: unknown[][] = [];
    mockUseQuery.mockImplementation((...args: unknown[]) => {
      calls.push(args);
      return {
        _id: 'user_123',
        role: 'admin',
        email: 'admin@example.com',
        items: [
          {
            _id: 'purchase_1',
            store: 'app_store',
            productKey: 'tokens_100',
            status: 'granted',
            storeTransactionId: 'txn_1',
            purchasedAt: 123,
          },
        ],
        nextCursor: 321,
      };
    });

    render(<PurchasesScreen />);
    fireEvent.press(screen.getByText('Next'));
    const afterNext = calls[calls.length - 1][1] as { cursor?: number };
    expect(afterNext.cursor).toBe(321);

    fireEvent.press(screen.getByText('Search'));
    const afterSearch = calls[calls.length - 1][1] as { cursor?: number };
    expect(afterSearch.cursor).toBeUndefined();
  });

  it('keeps Previous reachable on an empty paged result', () => {
    const calls: unknown[][] = [];
    let callCount = 0;
    mockUseQuery.mockImplementation((...args: unknown[]) => {
      calls.push(args);
      callCount += 1;
      if (callCount === 1) {
        return {
          _id: 'user_123',
          role: 'admin',
          email: 'admin@example.com',
          items: [
            {
              _id: 'purchase_1',
              store: 'app_store',
              productKey: 'tokens_100',
              status: 'granted',
              storeTransactionId: 'txn_1',
              purchasedAt: 123,
            },
          ],
          nextCursor: 321,
        };
      }
      return { _id: 'user_123', role: 'admin', email: 'admin@example.com', items: [], nextCursor: null };
    });

    render(<PurchasesScreen />);
    fireEvent.press(screen.getByText('Next'));
    expect(screen.getByText('No purchases found.')).toBeTruthy();
    fireEvent.press(screen.getByText('Previous'));
    const afterPrevious = calls[calls.length - 1][1] as { cursor?: number };
    expect(afterPrevious.cursor).toBeUndefined();
  });
});

describe('AuditScreen', () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({
      _id: 'user_123',
      role: 'admin',
      email: 'admin@example.com',
      items: [],
      nextCursor: null,
    });
  });

  it('renders the audit log title', () => {
    render(<AuditScreen />);
    expect(screen.getByText('Audit Log')).toBeTruthy();
  });

  it('expands a record to show before/after snapshots', () => {
    mockUseQuery.mockReturnValue({
      _id: 'user_123',
      role: 'admin',
      email: 'admin@example.com',
      items: [
        {
          _id: 'log_1',
          timestamp: 123,
          actorEmail: 'admin@example.com',
          actorUserId: 'user_1',
          action: 'wallet.adjust',
          targetType: 'wallet',
          targetId: 'wallet_1',
          reason: 'compensation',
          before: { balance: 10 },
          after: { balance: 15 },
        },
      ],
      nextCursor: null,
    });

    render(<AuditScreen />);
    expect(screen.queryByText(/"balance": 10/)).toBeNull();
    fireEvent.press(screen.getAllByLabelText('Show audit details')[0]);
    expect(screen.getByText(/"balance": 10/)).toBeTruthy();
    expect(screen.getByText(/"balance": 15/)).toBeTruthy();
  });

  it('pages forward with the returned cursor and resets pagination when a filter changes', () => {
    const calls: unknown[][] = [];
    mockUseQuery.mockImplementation((...args: unknown[]) => {
      calls.push(args);
      return {
        _id: 'user_123',
        role: 'admin',
        email: 'admin@example.com',
        items: [
          {
            _id: 'log_1',
            timestamp: 123,
            actorEmail: 'admin@example.com',
            actorUserId: 'user_1',
            action: 'promo.create',
            targetType: 'promo_code',
            targetId: 'promo_1',
          },
        ],
        nextCursor: 654,
      };
    });

    render(<AuditScreen />);
    fireEvent.press(screen.getByText('Next'));
    const afterNext = calls[calls.length - 1][1] as { cursor?: number };
    expect(afterNext.cursor).toBe(654);

    fireEvent.press(screen.getByLabelText('Select action filter'));
    fireEvent.press(screen.getByText('Promo Created'));
    const afterFilter = calls[calls.length - 1][1] as { cursor?: number; action?: string };
    expect(afterFilter.cursor).toBeUndefined();
    expect(afterFilter.action).toBe('promo.create');
  });

  it('keeps Previous reachable on an empty paged result', () => {
    const calls: unknown[][] = [];
    let callCount = 0;
    mockUseQuery.mockImplementation((...args: unknown[]) => {
      calls.push(args);
      callCount += 1;
      if (callCount === 1) {
        return {
          _id: 'user_123',
          role: 'admin',
          email: 'admin@example.com',
          items: [
            {
              _id: 'log_1',
              timestamp: 123,
              actorEmail: 'admin@example.com',
              actorUserId: 'user_1',
              action: 'promo.create',
              targetType: 'promo_code',
              targetId: 'promo_1',
            },
          ],
          nextCursor: 654,
        };
      }
      return { _id: 'user_123', role: 'admin', email: 'admin@example.com', items: [], nextCursor: null };
    });

    render(<AuditScreen />);
    fireEvent.press(screen.getByText('Next'));
    expect(screen.getByText(/No audit records found/)).toBeTruthy();
    fireEvent.press(screen.getByText('Previous'));
    const afterPrevious = calls[calls.length - 1][1] as { cursor?: number };
    expect(afterPrevious.cursor).toBeUndefined();
  });
});

describe('TopicsScreen', () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({
      boardCount: 2,
      pickCount: 3,
      topics: [
        { slug: 'nba', selectionCount: 2, boardSharePct: 100, pickSharePct: 66.7 },
        { slug: 'marvel', selectionCount: 1, boardSharePct: 50, pickSharePct: 33.3 },
      ],
    });
  });

  it('renders topic popularity rows from the admin query', () => {
    render(<TopicsScreen />);
    expect(screen.getByText('Topic popularity')).toBeTruthy();
    expect(screen.getByText('boards')).toBeTruthy();
    expect(screen.getByText('picks')).toBeTruthy();
    expect(screen.getByText('never chosen')).toBeTruthy();
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
    expect(screen.getByText('Times chosen')).toBeTruthy();
    expect(screen.getByText('% of boards')).toBeTruthy();
    expect(screen.getByText('% of picks')).toBeTruthy();
    expect(screen.getByText('nba')).toBeTruthy();
    expect(screen.getByText('marvel')).toBeTruthy();
  });

  it('memoizes sinceMs for the default window filter', () => {
    mockUseQuery.mockClear();
    const { rerender } = render(<TopicsScreen />);
    rerender(<TopicsScreen />);
    const sinceValues = mockUseQuery.mock.calls
      .map((call) => (call[1] as { sinceMs?: number } | undefined)?.sinceMs)
      .filter((value): value is number => typeof value === 'number');
    expect(sinceValues.length).toBeGreaterThan(0);
    expect(new Set(sinceValues).size).toBe(1);
  });

  it('sinceMsForWindow returns undefined for all-time', () => {
    expect(sinceMsForWindow('all', 1_000_000)).toBeUndefined();
    expect(sinceMsForWindow('30', 1_000_000)).toBe(1_000_000 - 30 * 24 * 60 * 60 * 1000);
  });
});
