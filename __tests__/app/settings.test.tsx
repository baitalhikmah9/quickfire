import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Platform, StyleSheet } from 'react-native';

import SettingsScreen from '@/app/(app)/settings';
import { useThemeStore } from '@/store/theme';
import { useDisplayStore } from '@/store/display';

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockSignOut = jest.fn(async () => undefined);
const mockDeleteAccount = jest.fn(async () => ({ ok: true }));
const mockLogOutRevenueCat = jest.fn(async () => undefined);
const mockIsAuthDisabled = jest.fn(() => false);
const mockUseAuth = jest.fn(() => ({ isLoaded: true, isSignedIn: true }));
const mockUseUser = jest.fn(() => ({
  user: {
    createdAt: new Date('2026-01-15T00:00:00.000Z'),
    emailAddresses: [{ emailAddress: 'pilot@example.com' }],
    firstName: 'Pilot',
    imageUrl: null,
    username: 'pilot',
    fullName: 'Pilot',
    primaryEmailAddress: { emailAddress: 'pilot@example.com' },
  },
}));
const mockUseClerk = jest.fn(() => ({ signOut: mockSignOut }));

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
    replace: mockReplace,
    canGoBack: () => false,
  }),
}));

jest.mock('@clerk/clerk-expo', () => ({
  useAuth: () => mockUseAuth(),
  useClerk: () => mockUseClerk(),
  useUser: () => mockUseUser(),
}));

jest.mock('convex/react', () => ({
  useQuery: jest.fn(() => undefined),
  useMutation: jest.fn(() => jest.fn(async () => ({ ok: true }))),
  useAction: jest.fn(() => mockDeleteAccount),
  useConvexAuth: jest.fn(() => ({ isAuthenticated: true, isLoading: false })),
}));

jest.mock('@/lib/payments/revenueCat', () => ({
  logOutRevenueCat: () => mockLogOutRevenueCat(),
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

// Keep language-settings UI tests covering the retained implementation while product flag is off.
jest.mock('@/constants/featureFlags', () => ({
  SHOW_HOT_SEAT_UI: false,
  SHOW_LANGUAGE_SETTINGS_UI: true,
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
        'settings.accountAuthTitle': 'Account',
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
        'settings.displayModeTitle': 'Game text size',
        'settings.displayMode.tv': 'TV mode (smaller)',
        'settings.displayMode.mobile': 'Mobile mode (larger)',
        'settings.themePickerDescription': 'Choose a color palette',
        'settings.appLanguagePickerDescription': 'Choose the app interface language',
        'settings.triviaLanguagesDescription': 'Pick up to 3 preferred trivia languages. English is always the fallback.',
        'settings.closeThemePicker': 'Close theme picker',
        'settings.closeLanguagePicker': 'Close language picker',
        'settings.closeTriviaLanguagesPicker': 'Close trivia languages picker',
        'settings.activePalette': 'Active palette',
        'settings.tapToApply': 'Tap to apply',
        'settings.englishFallback': 'English fallback',
        'settings.palette.default': 'Light',
        'settings.palette.warm': 'Warm',
        'settings.palette.cool': 'Cool',
        'settings.palette.green': 'Green',
        'settings.palette.red': 'Red',
        'settings.palette.dark': 'Dark',
        'settings.deleteAccount': 'Delete Account',
        'settings.deleteAccountTitle': 'Delete your account?',
        'settings.deleteAccountBody':
          'This permanently deletes your account. Unused tokens are forfeited. Store purchases are not refunded. Gameplay and payment records are kept in anonymized form for analytics and accounting. You cannot undo this.',
        'settings.deleteAccountConfirm': 'Delete permanently',
        'settings.deleteAccountCancel': 'Keep account',
        'settings.deleteAccountInProgress': 'Deleting account…',
        'settings.deleteAccountFailed':
          'We could not finish deleting your account. Your personal data may already be cleared — try again.',
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
    mockReplace.mockClear();
    mockSignOut.mockClear();
    mockDeleteAccount.mockReset();
    mockDeleteAccount.mockImplementation(async () => ({ ok: true }));
    mockLogOutRevenueCat.mockClear();
    mockIsAuthDisabled.mockReturnValue(false);
    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });
    mockUseClerk.mockReturnValue({ signOut: mockSignOut });
    useThemeStore.setState({ paletteId: 'default' });
    useDisplayStore.setState({ playDisplayMode: 'tv' });
    mockUseUser.mockReturnValue({
      user: {
        createdAt: new Date('2026-01-15T00:00:00.000Z'),
        emailAddresses: [{ emailAddress: 'pilot@example.com' }],
        firstName: 'Pilot',
        imageUrl: null,
        username: 'pilot',
        fullName: 'Pilot',
        primaryEmailAddress: { emailAddress: 'pilot@example.com' },
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

  it('navigates to terms and privacy pages from legal rows', () => {
    render(<SettingsScreen />);

    fireEvent.press(screen.getByTestId('settings-legal-terms'));
    expect(mockPush).toHaveBeenCalledWith('/terms');

    fireEvent.press(screen.getByTestId('settings-legal-privacy'));
    expect(mockPush).toHaveBeenCalledWith('/privacy');
  });

  it('toggles directly between light and dark without opening a modal', () => {
    render(<SettingsScreen />);

    const toggle = screen.getByTestId('settings-theme-toggle');
    expect(screen.getByText('Light')).toBeTruthy();

    fireEvent.press(toggle);
    expect(useThemeStore.getState().paletteId).toBe('dark');
    expect(screen.getByText('Dark')).toBeTruthy();
    expect(screen.queryByText('Choose a color palette')).toBeNull();
    expect(
      StyleSheet.flatten(screen.getByTestId('settings-user-profile-card').props.style)
    ).toMatchObject({ borderTopWidth: 0, borderTopColor: 'transparent' });

    fireEvent.press(toggle);
    expect(useThemeStore.getState().paletteId).toBe('default');

    useThemeStore.getState().setPalette('warm');
    expect(useThemeStore.getState().paletteId).toBe('default');
  });

  it('defaults game text to TV size and toggles to mobile size', () => {
    render(<SettingsScreen />);

    expect(screen.getByText('TV mode (smaller)')).toBeTruthy();
    fireEvent.press(screen.getByTestId('settings-display-mode-toggle'));
    expect(useDisplayStore.getState().playDisplayMode).toBe('mobile');
    expect(screen.getByText('Mobile mode (larger)')).toBeTruthy();
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

  it('shows delete account only when signed in', () => {
    const { rerender } = render(<SettingsScreen />);
    expect(screen.getByTestId('settings-delete-account-button')).toBeTruthy();

    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: false });
    mockUseUser.mockReturnValue({ user: null } as any);
    rerender(<SettingsScreen />);
    expect(screen.queryByTestId('settings-delete-account-button')).toBeNull();
  });

  it('opens a warning on first delete-account tap without deleting yet', () => {
    render(<SettingsScreen />);

    fireEvent.press(screen.getByTestId('settings-delete-account-button'));

    expect(screen.getByTestId('settings-delete-account-modal')).toBeTruthy();
    expect(screen.getByText('Delete your account?')).toBeTruthy();
    expect(mockDeleteAccount).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('deletes only after the second confirm tap and signs the user out', async () => {
    render(<SettingsScreen />);

    fireEvent.press(screen.getByTestId('settings-delete-account-button'));
    fireEvent.press(screen.getByTestId('settings-delete-account-confirm'));

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(mockLogOutRevenueCat).toHaveBeenCalledTimes(1);
      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith('/(app)');
    });
  });

  it('keeps the modal open with a retry path when deletion fails', async () => {
    mockDeleteAccount.mockImplementationOnce(async () => {
      throw new Error('Clerk user deletion failed (500)');
    });

    render(<SettingsScreen />);

    fireEvent.press(screen.getByTestId('settings-delete-account-button'));
    fireEvent.press(screen.getByTestId('settings-delete-account-confirm'));

    await waitFor(() => {
      expect(screen.getByTestId('settings-delete-account-error')).toHaveTextContent(
        'Clerk user deletion failed (500)'
      );
    });
    expect(screen.getByTestId('settings-delete-account-modal')).toBeTruthy();
    expect(mockSignOut).not.toHaveBeenCalled();

    mockDeleteAccount.mockImplementationOnce(async () => ({ ok: true }));
    fireEvent.press(screen.getByTestId('settings-delete-account-confirm'));

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalledTimes(2);
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });

  it('disables confirm while deletion is in progress to prevent duplicate submits', async () => {
    let resolveDelete: ((value: { ok: true }) => void) | undefined;
    mockDeleteAccount.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveDelete = resolve;
        })
    );

    render(<SettingsScreen />);

    fireEvent.press(screen.getByTestId('settings-delete-account-button'));
    fireEvent.press(screen.getByTestId('settings-delete-account-confirm'));

    await waitFor(() => {
      expect(screen.getByTestId('settings-delete-account-loading')).toBeTruthy();
    });

    // Second press while in flight should not start another request.
    fireEvent.press(screen.getByTestId('settings-delete-account-confirm'));
    expect(mockDeleteAccount).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveDelete?.({ ok: true });
    });

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });
});
