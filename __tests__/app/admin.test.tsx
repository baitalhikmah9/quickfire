import React from 'react';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

import AdminLayout from '@/app/(admin)/_layout';
import AdminIndexScreen from '@/app/(admin)/index';
import PromoCodesScreen from '@/app/(admin)/promo-codes';
import WalletsScreen from '@/app/(admin)/wallets';
import AdminRouteIndexScreen from '@/app/admin';
import AdminSignInScreen from '@/app/admin/sign-in';

const mockPush = jest.fn();
const mockRedirect = jest.fn();
const mockUseAuth = jest.fn(() => ({ isSignedIn: true, userId: 'user_123', isLoaded: true }));
const mockUseQuery = jest.fn(() => ({ _id: 'user_123', role: 'admin', email: 'admin@example.com', items: [] }));
const mockUseMutation = jest.fn(() => jest.fn());

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
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
  useUser: () => ({
    user: {
      id: 'user_123',
      primaryEmailAddress: { emailAddress: 'admin@example.com' },
    },
  }),
}));

jest.mock('convex/react', () => ({
  useQuery: (..._args: unknown[]) => mockUseQuery(),
  useMutation: (..._args: unknown[]) => mockUseMutation(),
}));

jest.mock('@/lib/authMode', () => ({
  isAuthDisabled: () => false,
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('AdminLayout', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    mockPush.mockClear();
    mockRedirect.mockClear();
    mockUseAuth.mockReturnValue({ isSignedIn: true, userId: 'user_123', isLoaded: true });
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
  });

  it('renders null while auth is loading on web', () => {
    mockUseAuth.mockReturnValue({ isSignedIn: false, userId: '', isLoaded: false });

    const { toJSON } = render(<AdminLayout />);
    expect(toJSON()).toBeNull();
  });

  it('does not crash when signed in on web', () => {
    mockUseAuth.mockReturnValue({ isSignedIn: true, userId: 'user_123', isLoaded: true });

    const { toJSON } = render(<AdminLayout />);
    expect(toJSON()).toBeTruthy();
  });

  it('redirects signed-out web admins to the admin auth page', () => {
    mockUseAuth.mockReturnValue({ isSignedIn: false, userId: '', isLoaded: true });

    render(<AdminLayout />);
    expect(mockRedirect).toHaveBeenCalledWith('/admin/sign-in');
  });

  it('shows unsupported message on native platforms', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

    render(<AdminLayout />);
    expect(screen.getByText('Admin dashboard is available on web.')).toBeTruthy();
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
  beforeEach(() => {
    mockUseQuery.mockReturnValue({
      _id: 'user_123',
      role: 'admin',
      email: 'admin@example.com',
      items: [],
    });
    mockUseMutation.mockReturnValue(jest.fn());
  });

  it('renders promo codes title', () => {
    render(<PromoCodesScreen />);
    expect(screen.getByText('Promo Codes')).toBeTruthy();
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

  it('exposes an admin sign-in page', () => {
    mockUseAuth.mockReturnValue({ isSignedIn: false, userId: '', isLoaded: true });

    render(<AdminSignInScreen />);
    expect(screen.getByText('ADMIN ACCESS')).toBeTruthy();
  });
});
