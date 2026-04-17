import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Modal } from 'react-native';

import AppHubScreen from '@/app/(app)/index';
import { usePlayStore } from '@/store/play';

const mockPush = jest.fn();

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
        'play.mode.quickCopy': 'Shorter game, fewer topics.',
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

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('AppHubScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
    usePlayStore.setState({ session: null, tokens: 5, rapidFire: null });
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

  it('keeps the home mode choices in one horizontal row', () => {
    render(<AppHubScreen />);

    expect(screen.getByTestId('home-mode-row')).toHaveStyle({
      flexDirection: 'row',
      flexWrap: 'nowrap',
    });
  });

  it('opens a small explanation when tapping the mode info icon', () => {
    render(<AppHubScreen />);

    fireEvent.press(screen.getByLabelText('Quick Play info'));

    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByText('Shorter game, fewer topics.')).toBeTruthy();
  });

  it('keeps the mode explanation out of the native modal portal', () => {
    render(<AppHubScreen />);

    expect(screen.UNSAFE_queryByType(Modal)).toBeNull();

    fireEvent.press(screen.getByLabelText('Random info'));

    expect(screen.UNSAFE_queryByType(Modal)).toBeNull();
    expect(screen.getByText('Random questions each turn.')).toBeTruthy();
  });
});
