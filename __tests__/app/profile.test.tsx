import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';

import ProfileScreen from '@/app/(app)/profile';

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockSignOut = jest.fn();
const mockIsAuthDisabled = jest.fn(() => false);
const mockUseAuth = jest.fn(() => ({ isSignedIn: true }));
const mockUseUser = jest.fn(() => ({
  user: {
    createdAt: new Date('2026-01-15T00:00:00.000Z'),
    emailAddresses: [{ emailAddress: 'pilot@example.com' }],
    firstName: 'Pilot',
    imageUrl: null,
    username: 'pilot',
  },
}));
const mockUseClerk = jest.fn(() => ({ signOut: mockSignOut }));

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
  }),
}));

jest.mock('@clerk/clerk-expo', () => ({
  useAuth: () => mockUseAuth(),
  useClerk: () => mockUseClerk(),
  useUser: () => mockUseUser(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => {}),
    removeItem: jest.fn(async () => {}),
  },
}));

jest.mock('@/lib/authMode', () => ({
  isAuthDisabled: () => mockIsAuthDisabled(),
}));

jest.mock('expo-secure-store', () => ({
  __esModule: true,
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  default: {
    getItemAsync: jest.fn(async () => null),
    setItemAsync: jest.fn(async () => {}),
  },
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

jest.mock('@/components/ProfileAuthGate', () => ({
  ProfileAuthGate: () => null,
}));

jest.mock('@/lib/i18n/useI18n', () => ({
  useI18n: () => ({
    direction: 'ltr',
    getLocaleName: (locale: string, format?: string) => {
      const names: Record<string, Record<string, string>> = {
        en: { both: 'English (English)', english: 'English', native: 'English' },
        ar: { english: 'Arabic', native: 'Arabic' },
        fr: { english: 'French', native: 'French' },
      };
      return names[locale]?.[format ?? 'native'] ?? locale;
    },
    getTextStyle: () => ({}),
    t: (key: string, params?: Record<string, string | number | null | undefined>) => {
      const messages: Record<string, string> = {
        'common.playerFallback': 'Player',
        'common.signOut': 'Sign Out',
        'common.tokens': 'Tokens',
        'home.logoCapline': 'TRIVIA',
        'home.logoWordmark': 'DoubleDown',
        'profile.accuracy': 'Accuracy',
        'profile.bestStreak': 'Best Streak',
        'profile.memberSince': `Member since ${params?.date}`,
        'profile.preferences': 'Preferences',
        'profile.rankBadgeRival': 'Rival',
        'profile.viewAnalytics': 'View Detailed Analytics',
        'profile.winRate': 'Win Rate',
        'settings.accountAuthTitle': 'Account & auth',
        'settings.appLanguageTitle': 'App Language',
        'settings.languagesUpToThreeTitle': 'Languages (up to 3)',
        'settings.noTriviaLanguagesSelected': 'No trivia languages selected',
        'settings.themeSelectionTitle': 'Theme selection',
      };
      return messages[key] ?? key;
    },
    uiLocale: 'en',
  }),
}));

describe('ProfileScreen settings', () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockPush.mockClear();
    mockSignOut.mockClear();
    mockIsAuthDisabled.mockReturnValue(false);
    mockUseAuth.mockReturnValue({ isSignedIn: true });
    mockUseClerk.mockReturnValue({ signOut: mockSignOut });
    mockUseUser.mockReturnValue({
      user: {
        createdAt: new Date('2026-01-15T00:00:00.000Z'),
        emailAddresses: [{ emailAddress: 'pilot@example.com' }],
        firstName: 'Pilot',
        imageUrl: null,
        username: 'pilot',
      },
    });
  });

  it('includes theme, app language, and up-to-three language settings', () => {
    render(<ProfileScreen />);

    expect(screen.getByText('Theme selection')).toBeTruthy();
    expect(screen.getByText('App Language')).toBeTruthy();
    expect(screen.getByText('Languages (up to 3)')).toBeTruthy();
    expect(screen.getByText('No trivia languages selected')).toBeTruthy();
    expect(screen.queryByText('WIN RATE')).toBeNull();
    expect(screen.queryByText('BEST STREAK')).toBeNull();
    expect(screen.queryByText('ACCURACY')).toBeNull();
  });

  it('stays usable in guest mode when auth is disabled', () => {
    mockIsAuthDisabled.mockReturnValue(true);
    mockUseAuth.mockReturnValue({ isSignedIn: false });
    mockUseClerk.mockReturnValue({ signOut: undefined } as any);
    mockUseUser.mockReturnValue({ user: null } as any);

    render(<ProfileScreen />);

    expect(screen.getByText('Theme selection')).toBeTruthy();
    expect(screen.getByText('App Language')).toBeTruthy();
    expect(screen.queryByText('Sign Out')).toBeNull();
  });
});
