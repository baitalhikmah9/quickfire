import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

import SettingsScreen from '@/app/(app)/settings';

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockSignOut = jest.fn();
const mockIsAuthDisabled = jest.fn(() => false);
const mockUseAuth = jest.fn(() => ({ isLoaded: true, isSignedIn: true }));
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
        'common.close': 'Close',
        'common.profile': 'Profile',
        'common.settings': 'Settings',
        'common.signOut': 'Sign Out',
        'common.tokens': 'Tokens',
        'home.logoCapline': 'TRIVIA',
        'home.logoWordmark': 'Backfire',
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
        'settings.legalHeading': 'Legal',
        'legal.termsTitle': 'Terms of Service',
        'legal.privacyTitle': 'Privacy Policy',
        'legal.lastUpdated': `Last updated: ${params?.date ?? ''}`,
        'common.english': 'English',
        'common.languages': 'Languages',
        'common.priorityLabel': `Priority ${params?.count}`,
        'common.theme': 'Theme',
        'settings.noTriviaLanguagesSelected': 'No trivia languages selected',
        'settings.themeSelectionTitle': 'Theme selection',
        'settings.themePickerDescription': 'Choose a color palette',
        'settings.appLanguagePickerDescription': 'Choose the app interface language',
        'settings.triviaLanguagesDescription': 'Pick up to 3 preferred trivia languages. English is always the fallback.',
        'settings.closeThemePicker': 'Close theme picker',
        'settings.closeLanguagePicker': 'Close language picker',
        'settings.closeTriviaLanguagesPicker': 'Close trivia languages picker',
        'settings.activePalette': 'Active palette',
        'settings.tapToApply': 'Tap to apply',
        'settings.englishFallback': 'English fallback',
        'settings.palette.default': 'Default',
        'settings.palette.warm': 'Warm',
        'settings.palette.cool': 'Cool',
        'settings.palette.green': 'Green',
        'settings.palette.red': 'Red',
        'settings.palette.dark': 'Dark',
        'auth.signUp.signIn': 'Sign in',
        'profile.guest.createAccount': 'CREATE ACCOUNT',
      };
      return messages[key] ?? key;
    },
    uiLocale: 'en',
  }),
}));

describe('SettingsScreen', () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockPush.mockClear();
    mockSignOut.mockClear();
    mockIsAuthDisabled.mockReturnValue(false);
    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });
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
    render(<SettingsScreen />);

    expect(screen.getByText('Theme selection')).toBeTruthy();
    expect(screen.getByText('App Language')).toBeTruthy();
    expect(screen.getByText('Languages (up to 3)')).toBeTruthy();
    expect(screen.getByText('No trivia languages selected')).toBeTruthy();
    expect(screen.queryByText('WIN RATE')).toBeNull();
    expect(screen.queryByText('BEST STREAK')).toBeNull();
    expect(screen.queryByText('ACCURACY')).toBeNull();
  });

  it('shows legal section with links to terms and privacy', () => {
    render(<SettingsScreen />);

    expect(screen.getByText('LEGAL')).toBeTruthy();
    expect(screen.getByText('Terms of Service')).toBeTruthy();
    expect(screen.getByText('Privacy Policy')).toBeTruthy();
  });

  it('opens terms and privacy content in modals from legal rows', () => {
    render(<SettingsScreen />);

    fireEvent.press(screen.getByTestId('settings-legal-terms'));
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByText('Agreement')).toBeTruthy();
    fireEvent.press(screen.getByTestId('settings-legal-terms-close'));

    fireEvent.press(screen.getByTestId('settings-legal-privacy'));
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByText('Overview')).toBeTruthy();
  });

  it('opens theme choices inline as a modal instead of navigating away', () => {
    render(<SettingsScreen />);

    fireEvent.press(screen.getByText('Theme selection'));

    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByText('Choose a color palette')).toBeTruthy();
    expect(screen.getByText('Warm')).toBeTruthy();
  });

  it('opens app language choices inline as a modal instead of navigating away', () => {
    render(<SettingsScreen />);

    fireEvent.press(screen.getByText('App Language'));

    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByText('Choose the app interface language')).toBeTruthy();
    expect(screen.getByText('Arabic')).toBeTruthy();
  });

  it('opens trivia language choices inline as a modal instead of navigating away', () => {
    render(<SettingsScreen />);

    fireEvent.press(screen.getByText('Languages (up to 3)'));

    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByText('Pick up to 3 preferred trivia languages. English is always the fallback.')).toBeTruthy();
    expect(screen.getByText('Languages')).toBeTruthy();
  });

  it('shows public sign-in entry on the settings screen when signed out', () => {
    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: false });
    mockUseUser.mockReturnValue({ user: null } as any);

    render(<SettingsScreen />);

    expect(screen.getByTestId('public-auth-entry')).toBeTruthy();
    expect(screen.getByTestId('public-auth-entry-sign-in')).toHaveTextContent('Sign in');
    if (Platform.OS === 'web') {
      expect(screen.getByTestId('public-auth-entry-sign-up')).toHaveTextContent('CREATE ACCOUNT');
    } else {
      expect(screen.queryByTestId('public-auth-entry-sign-up')).toBeNull();
    }
  });

  it('stays usable in guest mode when auth is disabled', () => {
    mockIsAuthDisabled.mockReturnValue(true);
    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: false });
    mockUseClerk.mockReturnValue({ signOut: undefined } as any);
    mockUseUser.mockReturnValue({ user: null } as any);

    render(<SettingsScreen />);

    expect(screen.getByText('Theme selection')).toBeTruthy();
    expect(screen.getByText('App Language')).toBeTruthy();
    expect(screen.queryByText('Sign Out')).toBeNull();
  });
});
