import React from 'react';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';

import AdminLayout, { AdminAccessBoundary } from '@/app/(admin)/_layout';
import AdminIndexScreen from '@/app/(admin)/index';
import PromoCodesScreen from '@/app/(admin)/promo-codes';
import WalletsScreen from '@/app/(admin)/wallets';
import AdminRouteIndexScreen from '@/app/admin';
import AdminSignInScreen from '@/app/admin/sign-in';
import AdminSignOutScreen from '@/app/(admin)/sign-out';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockCanGoBack = jest.fn(() => true);
const mockRedirect = jest.fn();
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
const mockUseMutation = jest.fn<(...args: unknown[]) => unknown>(() => jest.fn());
const mockWarmUpAsync = jest.fn(() => Promise.resolve());
const mockCoolDownAsync = jest.fn(() => Promise.resolve());
type MockSignInResult = {
  status: string;
  createdSessionId: string | null;
};
const mockSignInCreate = jest.fn<
  (args: { identifier: string; password: string }) => Promise<MockSignInResult>
>();
const mockSetActive = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: mockReplace,
    canGoBack: mockCanGoBack,
  }),
  useLocalSearchParams: () => ({}),
  usePathname: () => '/admin',
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
}));

jest.mock('@/lib/authMode', () => ({
  isAuthDisabled: () => false,
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name: string }) => <Text accessibilityElementsHidden>{String(name)}</Text>,
  };
});

jest.mock('expo-web-browser', () => ({
  warmUpAsync: () => mockWarmUpAsync(),
  coolDownAsync: () => mockCoolDownAsync(),
}));

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
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
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

  it('shows a sign out control in the admin top bar on web', () => {
    mockUseAuth.mockReturnValue({
      isSignedIn: true,
      userId: 'user_123',
      isLoaded: true,
      signOut: mockSignOut,
    });

    render(<AdminLayout />);
    expect(screen.getByLabelText('Sign out')).toBeTruthy();
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

  it('redirects away from admin on native platforms', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

    render(<AdminLayout />);
    expect(mockRedirect).toHaveBeenCalledWith('/(app)/');
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

  it('renders dashboard title', () => {
    render(<AdminIndexScreen />);
    expect(screen.getByText('Overview')).toBeTruthy();
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
    expect(screen.getByText('PROMO CODES')).toBeTruthy();
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
    expect(screen.getByText('WALLETS')).toBeTruthy();
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
    expect(screen.getByText('Overview')).toBeTruthy();
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
