import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Modal } from 'react-native';

import TeamSetupScreen from '@/app/(app)/play/team-setup';
import { usePlayStore } from '@/store/play';

const mockBack = jest.fn();
const mockCanGoBack = jest.fn(() => false);
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    canGoBack: mockCanGoBack,
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
    t: (key: string, values?: Record<string, string | number>) => {
      const messages: Record<string, string> = {
        'common.back': 'Back',
        'common.close': 'Close',
        'common.continue': 'Continue',
        'common.loading': 'Loading',
        'common.tokens': 'Tokens',
        'play.addPlayerLink': 'Add Player',
        'play.addTeamMemberA11y': 'Add a team member',
        'play.hotSeatInfoBody':
          'One player from each team answers solo in the Hot Seat round.',
        'play.hotSeatInfoLink': 'What is Hot Seat?',
        'play.hotSeatInfoTitle': 'Hot Seat',
        'play.hotSeatTitle': 'Hot Seat',
        'play.playerPlaceholder': `Player ${values?.count ?? ''}`,
        'play.removeLastPlayerLink': 'Remove last player',
        'play.removeTeamMemberA11y': 'Remove a team member',
        'play.rumblePartyCountTitle': 'Number of teams',
        'play.teamsLabel': 'Teams',
        'play.setupIncompleteHint': 'Enter all names to continue',
        'play.teamNamePlaceholder': 'Team name',
        'play.teamSetupTitle': 'Team Setup',
        'play.wagerCardTitle': 'Wager',
        'play.wagerHelpLink': 'What is Wager?',
        'play.wagerInfoColCorrect': 'If correct',
        'play.wagerInfoColMultiplier': 'Multiplier',
        'play.wagerInfoColWrong': 'If wrong',
        'play.wagerInfoDone': 'Done',
        'play.wagerInfoParagraph1':
          'Wagers are a risky way to try and sabotage the other team!',
        'play.wagerInfoParagraph2': 'A random remaining question is chosen.',
        'play.wagerInfoTitle': 'What is a Wager?',
        'play.wagerInfoWarning': 'Plan carefully!',
      };
      return messages[key] ?? key;
    },
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('TeamSetupScreen', () => {
  beforeEach(async () => {
    mockBack.mockClear();
    mockCanGoBack.mockClear();
    mockPush.mockClear();
    mockReplace.mockClear();
    usePlayStore.setState({ session: null, tokens: 5, rapidFire: null });
    await usePlayStore.getState().hydrate();
    usePlayStore.getState().ensureDraft();
  });

  it('opens setup help panels without mounting native modal portals', () => {
    render(<TeamSetupScreen />);

    expect(screen.UNSAFE_queryByType(Modal)).toBeNull();

    fireEvent.press(screen.getByText('What is Hot Seat?'));

    expect(screen.UNSAFE_queryByType(Modal)).toBeNull();
    expect(screen.getByText('One player from each team answers solo in the Hot Seat round.')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Close'));
    fireEvent.press(screen.getByText('What is Wager?'));

    expect(screen.UNSAFE_queryByType(Modal)).toBeNull();
    expect(screen.getByText('Wagers are a risky way to try and sabotage the other team!')).toBeTruthy();
  });

  it('shows the rumble team-count selector but hides wager and hot seat controls', () => {
    usePlayStore.getState().setMode('rumble');

    render(<TeamSetupScreen />);

    expect(screen.getByText('TEAMS')).toBeTruthy();
    for (const option of ['2', '3', '4', '6']) {
      expect(screen.getByText(option)).toBeTruthy();
    }
    expect(screen.getByLabelText('2 teams').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.queryByText('Hot Seat')).toBeNull();
    expect(screen.queryByText('Wager')).toBeNull();

    fireEvent.press(screen.getByLabelText('6 teams'));

    expect(usePlayStore.getState().session?.teams).toHaveLength(6);
    expect(screen.getByLabelText('6 teams').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByLabelText('2 teams').props.accessibilityState).toMatchObject({ selected: false });
  });

  it('uses distinct controls for adding and removing players', () => {
    render(<TeamSetupScreen />);

    const addControls = screen.getAllByLabelText('Add a team member');
    fireEvent.press(addControls[0]);

    const addControl = screen.getAllByLabelText('Add a team member')[0];
    const removeControl = screen.getByLabelText('Remove a team member');

    expect(addControl.props.style).not.toEqual(removeControl.props.style);
  });
});
