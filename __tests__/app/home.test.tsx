import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Modal } from 'react-native';

import AppHubScreen from '@/app/(app)/index';
import { FONTS } from '@/constants';
import { usePlayStore } from '@/store/play';

const mockPush = jest.fn();
const mockUseAuth = jest.fn(() => ({ isSignedIn: true }));
const mockIsAuthDisabled = jest.fn(() => false);

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
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

jest.mock('@/lib/i18n/useI18n', () => ({
  useI18n: () => ({
    direction: 'ltr',
    uiLocale: 'en',
    t: (key: string) => {
      const messages: Record<string, string> = {
        'common.close': 'Close',
        'common.tokens': 'Tokens',
        'home.continueGame': 'Continue Game',
        'home.logoCapline': 'TRIVIA',
        'home.logoWordmark': 'DoubleDown',
        'home.newGame': 'New Game',
        'home.playTriviaA11yResume':
          'Play trivia. You have a game in progress; opens a choice to continue or start new.',
        'home.playTriviaCta': 'PLAY TRIVIA',
        'home.playTriviaSub': 'Start a new challenge',
        'home.resumeModalBody':
          'You have a game in progress. Continue where you left off or start a new game.',
        'home.resumeModalTitle': 'Continue or start fresh?',
        'home.secondaryHelp': 'How to play',
        'home.secondaryStore': 'Store',
        'play.mode.classic': 'Classic',
        'play.mode.classicCopy': 'Full board, wagers, six topics.',
        'play.mode.quick': 'Quick Play',
        'play.mode.quickCopy': 'Pick 3, 4, or 5 topics for a faster match with wagers and Hot Seat.',
        'play.mode.random': 'Random',
        'play.mode.randomCopy': 'Random questions each turn.',
        'play.mode.rumble': 'Rumble',
        'play.mode.rumbleCopy': 'Three or more teams and steals.',
        'profile.preferences': 'Preferences',
      };
      return messages[key] ?? key;
    },
  }),
}));

jest.mock('@clerk/clerk-expo', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/lib/authMode', () => ({
  isAuthDisabled: () => mockIsAuthDisabled(),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

describe('AppHubScreen', () => {
  beforeEach(async () => {
    mockPush.mockClear();
    mockUseAuth.mockReturnValue({ isSignedIn: true });
    mockIsAuthDisabled.mockReturnValue(false);
    usePlayStore.setState({ session: null, tokens: 20, rapidFire: null });
    await usePlayStore.getState().hydrate();
  });

  it('starts quick play directly from the home mode choices', () => {
    render(<AppHubScreen />);

    fireEvent.press(screen.getByLabelText('Quick Play'));

    expect(usePlayStore.getState().session?.mode).toBe('quickPlay');
    expect(usePlayStore.getState().session?.step).toBe('quick-play-length');
    expect(mockPush).toHaveBeenCalledWith('/play/quick-length');
  });

  it('starts classic mode directly from the home mode choices', () => {
    render(<AppHubScreen />);

    fireEvent.press(screen.getByLabelText('Classic'));

    expect(usePlayStore.getState().session?.mode).toBe('classic');
    expect(usePlayStore.getState().session?.step).toBe('team-setup');
    expect(mockPush).toHaveBeenCalledWith('/play/team-setup');
  });

  it('shows the token cost under each game mode', () => {
    render(<AppHubScreen />);

    expect(screen.getByTestId('home-mode-token-cost-quickPlay')).toHaveTextContent('5-8 TOKENS');
    expect(screen.getByTestId('home-mode-token-cost-classic')).toHaveTextContent('10 TOKENS');
    expect(screen.getByTestId('home-mode-token-cost-random')).toHaveTextContent('10 TOKENS');
    expect(screen.getByTestId('home-mode-token-cost-rumble')).toHaveTextContent('10 TOKENS');
  });

  it('shows three people for rumble', () => {
    render(<AppHubScreen />);

    expect(screen.getByTestId('home-rumble-person-1')).toBeTruthy();
    expect(screen.getByTestId('home-rumble-person-2')).toBeTruthy();
    expect(screen.getByTestId('home-rumble-person-3')).toBeTruthy();
  });

  it('prompts to continue or start new when a session is already in progress', () => {
    usePlayStore.getState().ensureDraft();
    const current = usePlayStore.getState().session;
    usePlayStore.setState({
      session: current
        ? {
            ...current,
            mode: 'classic',
            step: 'board',
          }
        : null,
    });

    render(<AppHubScreen />);

    fireEvent.press(screen.getByLabelText('Quick Play'));

    expect(screen.getByText('Continue or start fresh?')).toBeTruthy();
    expect(screen.getByText('Continue Game')).toBeTruthy();
    expect(screen.getByText('New Game')).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('continues the current game route from the resume prompt', () => {
    usePlayStore.getState().ensureDraft();
    const current = usePlayStore.getState().session;
    usePlayStore.setState({
      session: current
        ? {
            ...current,
            mode: 'classic',
            step: 'board',
          }
        : null,
    });

    render(<AppHubScreen />);

    fireEvent.press(screen.getByLabelText('Quick Play'));
    fireEvent.press(screen.getByLabelText('Continue Game'));

    expect(mockPush).toHaveBeenCalledWith('/play/board');
    expect(usePlayStore.getState().session?.mode).toBe('classic');
  });

  it('starts a fresh game from the resume prompt with the selected mode', () => {
    usePlayStore.getState().ensureDraft();
    const current = usePlayStore.getState().session;
    usePlayStore.setState({
      session: current
        ? {
            ...current,
            mode: 'classic',
            step: 'board',
          }
        : null,
    });

    render(<AppHubScreen />);

    fireEvent.press(screen.getByLabelText('Quick Play'));
    fireEvent.press(screen.getByLabelText('New Game'));

    expect(mockPush).toHaveBeenCalledWith('/play/quick-length');
    expect(usePlayStore.getState().session?.mode).toBe('quickPlay');
    expect(usePlayStore.getState().session?.step).toBe('quick-play-length');
  });

  it('keeps the home mode choices in one horizontal row', () => {
    render(<AppHubScreen />);

    expect(screen.getByTestId('home-mode-row')).toHaveStyle({
      flexDirection: 'row',
      flexWrap: 'nowrap',
    });
  });

  it('shows the QuickFire logo image in the home header title area', () => {
    render(<AppHubScreen />);

    expect(screen.getByTestId('home-brand-logo')).toBeTruthy();
    expect(screen.queryByText('DoubleDown')).toBeNull();
  });

  it('uses the brand raised surface treatment for mode choices', () => {
    render(<AppHubScreen />);

    expect(screen.getByTestId('home-mode-card-quickPlay')).toHaveStyle({
      backgroundColor: '#FFFFFF',
      borderTopWidth: 2,
      borderTopColor: 'rgba(255, 255, 255, 0.78)',
      borderBottomWidth: 3,
      borderBottomColor: 'rgba(0, 0, 0, 0.08)',
      shadowColor: 'rgba(51, 51, 51, 0.15)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 4,
    });
    expect(screen.getByTestId('home-mode-card-title-quickPlay')).toHaveStyle({
      color: '#333333',
      fontFamily: FONTS.uiBold,
      fontSize: 18,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    });
    expect(screen.getByTestId('home-mode-card-copy-quickPlay')).toHaveStyle({
      color: 'rgba(51, 51, 51, 0.58)',
      fontFamily: FONTS.ui,
      fontSize: 12,
      letterSpacing: 0.15,
    });
    expect(screen.queryByTestId('home-quickfire-mode-art')).toBeNull();
  });

  it('opens a small explanation when tapping the mode info icon', () => {
    render(<AppHubScreen />);

    fireEvent.press(screen.getByLabelText('Quick Play info'));

    expect(mockPush).not.toHaveBeenCalled();
    expect(
      screen.getByText('Pick 3, 4, or 5 topics for a faster match with wagers and Hot Seat.')
    ).toBeTruthy();
  });

  it('keeps the mode explanation out of the native modal portal', () => {
    render(<AppHubScreen />);

    expect(screen.UNSAFE_queryByType(Modal)).toBeNull();

    fireEvent.press(screen.getByLabelText('Random info'));

    expect(screen.UNSAFE_queryByType(Modal)).toBeNull();
    expect(screen.getByText('Random questions each turn.')).toBeTruthy();
  });

  it('routes signed-out players to sign-in instead of opening a game lobby', () => {
    mockUseAuth.mockReturnValue({ isSignedIn: false });

    render(<AppHubScreen />);

    fireEvent.press(screen.getByLabelText('Quick Play'));

    expect(usePlayStore.getState().session).toBeNull();
    expect(mockPush).toHaveBeenCalledWith('/(auth)/sign-in');
  });

  it('lets signed-out players start a game when auth is disabled', () => {
    mockUseAuth.mockReturnValue({ isSignedIn: false });
    mockIsAuthDisabled.mockReturnValue(true);

    render(<AppHubScreen />);

    fireEvent.press(screen.getByLabelText('Quick Play'));

    expect(usePlayStore.getState().session?.mode).toBe('quickPlay');
    expect(usePlayStore.getState().session?.step).toBe('quick-play-length');
    expect(mockPush).toHaveBeenCalledWith('/play/quick-length');
  });
});
