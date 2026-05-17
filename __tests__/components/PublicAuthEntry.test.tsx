import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { PublicAuthEntry } from '@/components/PublicAuthEntry';

const mockPush = jest.fn();
const mockUseAuth = jest.fn(() => ({ isLoaded: true, isSignedIn: false }));
const mockIsAuthDisabled = jest.fn(() => false);

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@clerk/clerk-expo', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/lib/authMode', () => ({
  isAuthDisabled: () => mockIsAuthDisabled(),
}));

jest.mock('@/lib/i18n/useI18n', () => ({
  useI18n: () => ({
    direction: 'ltr',
    t: (key: string) => {
      const messages: Record<string, string> = {
        'auth.signUp.signIn': 'Sign in',
        'profile.guest.createAccount': 'CREATE ACCOUNT',
      };
      return messages[key] ?? key;
    },
  }),
}));

describe('PublicAuthEntry', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: false });
    mockIsAuthDisabled.mockReturnValue(false);
  });

  it('renders signed-out sign-in and create-account actions', () => {
    render(<PublicAuthEntry />);

    expect(screen.getByTestId('public-auth-entry-sign-in')).toHaveTextContent('Sign in');
    expect(screen.getByTestId('public-auth-entry-sign-up')).toHaveTextContent('CREATE ACCOUNT');
  });

  it('routes to existing auth screens', () => {
    render(<PublicAuthEntry />);

    fireEvent.press(screen.getByTestId('public-auth-entry-sign-in'));
    fireEvent.press(screen.getByTestId('public-auth-entry-sign-up'));

    expect(mockPush).toHaveBeenNthCalledWith(1, '/(auth)/sign-in');
    expect(mockPush).toHaveBeenNthCalledWith(2, '/(auth)/sign-up');
  });

  it('hides while auth is loading, signed in, or when auth bypass is enabled', () => {
    mockUseAuth.mockReturnValue({ isLoaded: false, isSignedIn: false });
    const { rerender } = render(<PublicAuthEntry />);
    expect(screen.queryByTestId('public-auth-entry')).toBeNull();

    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });
    rerender(<PublicAuthEntry />);
    expect(screen.queryByTestId('public-auth-entry')).toBeNull();

    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: false });
    mockIsAuthDisabled.mockReturnValue(true);
    rerender(<PublicAuthEntry />);
    expect(screen.queryByTestId('public-auth-entry')).toBeNull();
  });
});
