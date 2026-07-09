import React from 'react';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Modal, Platform, StyleSheet } from 'react-native';

/** Controllable viewport so wide-web (`Platform.OS === 'web' && isWide`) can be exercised. */
const mockUseWindowDimensions = jest.fn(() => ({
  width: 390,
  height: 844,
  scale: 2,
  fontScale: 1,
}));

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => mockUseWindowDimensions(),
}));

import TeamSetupScreen from '@/app/(app)/play/team-setup';
import { COLORS } from '@/constants';
import { usePlayStore } from '@/store/play';
import { useThemeStore } from '@/store/theme';

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
    mockCanGoBack.mockReset();
    mockCanGoBack.mockReturnValue(false);
    mockPush.mockClear();
    mockReplace.mockClear();
    mockUseWindowDimensions.mockReturnValue({
      width: 390,
      height: 844,
      scale: 2,
      fontScale: 1,
    });
    usePlayStore.setState({ session: null, tokens: 5, rapidFire: null });
    useThemeStore.setState({ paletteId: 'default' });
    await usePlayStore.getState().hydrate();
    usePlayStore.getState().ensureDraft();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('opens wager setup help in a full-screen overlay', () => {
    render(<TeamSetupScreen />);

    expect(screen.UNSAFE_queryByType(Modal)).toBeNull();

    fireEvent.press(screen.getByText('What is Wager?'));

    if (Platform.OS !== 'web') {
      expect(screen.UNSAFE_queryByType(Modal)).not.toBeNull();
    } else {
      expect(screen.UNSAFE_queryByType(Modal)).toBeNull();
    }
    const overlay = screen.getByTestId('wager-info-overlay');
    expect(overlay).toBeTruthy();
    expect(screen.getByText('Wagers are a risky way to try and sabotage the other team!')).toBeTruthy();

    const overlayStyle = StyleSheet.flatten(overlay.props.style);
    // Full-viewport scrim (not flex-only) so web fixed shells and native Modal both dim the screen.
    expect(overlayStyle.top).toBe(0);
    expect(overlayStyle.right).toBe(0);
    expect(overlayStyle.bottom).toBe(0);
    expect(overlayStyle.left).toBe(0);
    expect(overlayStyle.backgroundColor).toBe(COLORS.overlay);

    fireEvent.press(screen.getByLabelText('Close'));
  });

  it('shows the rumble team-count selector but hides wager and hot seat controls', () => {
    usePlayStore.getState().setMode('rumble');

    render(<TeamSetupScreen />);

    expect(screen.getByText('NUMBER OF TEAMS')).toBeTruthy();
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

  it('shows Continue for rumble setup on wide web (floating CTA is not classic-only)', () => {
    // Classic wide-web embeds Continue in the 3-column row; rumble must still show a CTA.
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    mockUseWindowDimensions.mockReturnValue({
      width: 1280,
      height: 800,
      scale: 1,
      fontScale: 1,
    });
    try {
      usePlayStore.getState().setMode('rumble');

      render(<TeamSetupScreen />);

      expect(screen.getByText('NUMBER OF TEAMS')).toBeTruthy();
      expect(screen.getByText('CONTINUE')).toBeTruthy();
    } finally {
      Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
    }
  });

  it('updates team card color when the theme changes', () => {
    useThemeStore.setState({ paletteId: 'dark' });
    const { rerender } = render(<TeamSetupScreen />);

    expect(StyleSheet.flatten(screen.getAllByTestId('team-setup-team-card')[0].props.style).backgroundColor).toBe('#1C1C1E');

    act(() => {
      useThemeStore.setState({ paletteId: 'default' });
    });
    rerender(<TeamSetupScreen />);

    expect(StyleSheet.flatten(screen.getAllByTestId('team-setup-team-card')[0].props.style).backgroundColor).toBe('#FFFFFF');
  });

  it('uses distinct controls for adding and removing players', () => {
    render(<TeamSetupScreen />);

    const addControls = screen.getAllByLabelText('Add a team member');
    fireEvent.press(addControls[0]);

    const addControl = screen.getAllByLabelText('Add a team member')[0];
    const removeControl = screen.getByLabelText('Remove a team member');

    expect(addControl.props.style).not.toEqual(removeControl.props.style);
  });

  it('uses settings-style icon-only back control (not labeled play pill)', () => {
    render(<TeamSetupScreen />);

    const back = screen.getByLabelText('Back');
    // Labeled play pill shows visible "Back" text; settings/store are icon-only.
    expect(screen.queryByText('Back')).toBeNull();

    const styleProp = back.props.style;
    const resolved =
      typeof styleProp === 'function' ? styleProp({ pressed: false }) : styleProp;
    const flat = StyleSheet.flatten(resolved);

    expect(flat.width).toBe(44);
    expect(flat.height).toBe(44);
    expect(flat.borderRadius).toBe(14);
  });

  it('returns to quick-play topic length when going back during quick play', () => {
    usePlayStore.getState().setMode('quickPlay');
    usePlayStore.getState().setQuickPlayTopicCount(4);

    render(<TeamSetupScreen />);
    fireEvent.press(screen.getByLabelText('Back'));

    expect(mockReplace).toHaveBeenCalledWith('/play/quick-length');
    expect(mockReplace).not.toHaveBeenCalledWith('/(app)/');
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('returns home when going back during classic setup', () => {
    usePlayStore.getState().setMode('classic');

    render(<TeamSetupScreen />);
    fireEvent.press(screen.getByLabelText('Back'));

    expect(mockReplace).toHaveBeenCalledWith('/(app)/');
    expect(mockReplace).not.toHaveBeenCalledWith('/play/quick-length');
  });

  it('returns home when going back during rumble setup instead of topics', () => {
    usePlayStore.getState().setMode('rumble');

    render(<TeamSetupScreen />);
    fireEvent.press(screen.getByLabelText('Back'));

    expect(mockReplace).toHaveBeenCalledWith('/(app)/');
    expect(mockReplace).not.toHaveBeenCalledWith('/play/categories');
    expect(mockPush).not.toHaveBeenCalledWith('/play/categories');
  });

  it('uses stack back to topic length when quick play has history', () => {
    mockCanGoBack.mockReturnValue(true);
    usePlayStore.getState().setMode('quickPlay');
    usePlayStore.getState().setQuickPlayTopicCount(3);

    render(<TeamSetupScreen />);
    fireEvent.press(screen.getByLabelText('Back'));

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
