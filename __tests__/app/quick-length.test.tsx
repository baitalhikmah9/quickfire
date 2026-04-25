import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

import QuickLengthScreen from '@/app/(app)/play/quick-length';
import { usePlayStore } from '@/store/play';

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: jest.fn(),
    canGoBack: () => false,
    push: mockPush,
    replace: mockReplace,
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

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@/lib/i18n/useI18n', () => ({
  useI18n: () => ({
    direction: 'ltr',
    getTextStyle: () => ({}),
    uiLocale: 'en',
    t: (key: string) => {
      const messages: Record<string, string> = {
        'common.back': 'Back',
        'common.tokens': 'Tokens',
        'play.quickLengthTitle': 'Set Quick Play Length',
        'play.quickLengthSubtitle': 'Choose how many topics Quick Play should use before team setup.',
        'play.quickLength.option3': '3 Topics',
        'play.quickLength.option3Copy': 'Balanced quick-play experience.',
        'play.quickLength.option4': '4 Topics',
        'play.quickLength.option4Copy': 'Longer quick play while staying lightweight.',
        'play.quickLength.option5': '5 Topics',
        'play.quickLength.option5Copy': 'Almost the full board with one fewer topic.',
      };
      return messages[key] ?? key;
    },
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('QuickLengthScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
    usePlayStore.setState({ session: null, tokens: 20, rapidFire: null });
    usePlayStore.getState().setMode('quickPlay');
  });

  it('shows quick play topic choices with their token costs', () => {
    render(<QuickLengthScreen />);

    expect(screen.getByText('3 Topics')).toBeTruthy();
    expect(screen.getByTestId('quick-length-token-cost-3')).toHaveTextContent('5 TOKENS');
    expect(screen.getByText('4 Topics')).toBeTruthy();
    expect(screen.getByTestId('quick-length-token-cost-4')).toHaveTextContent('7 TOKENS');
    expect(screen.getByText('5 Topics')).toBeTruthy();
    expect(screen.getByTestId('quick-length-token-cost-5')).toHaveTextContent('8 TOKENS');
  });

  it('continues quick play with the selected topic count', () => {
    render(<QuickLengthScreen />);

    fireEvent.press(screen.getByLabelText('4 Topics, 7 tokens'));

    expect(usePlayStore.getState().session?.mode).toBe('quickPlay');
    expect(usePlayStore.getState().session?.step).toBe('team-setup');
    expect(usePlayStore.getState().session?.config.quickPlayTopicCount).toBe(4);
    expect(mockPush).toHaveBeenCalledWith('/play/team-setup');
  });
});
