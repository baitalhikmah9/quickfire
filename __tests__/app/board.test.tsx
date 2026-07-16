import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { GameConfig, GameSessionState, QuestionCard } from '@/features/shared';

import PlayBoardScreen from '@/app/(app)/play/board';
import { PALETTES } from '@/constants/theme';
import { getPlaySurfaceColors } from '@/features/play/playSurfaceColors';
import { usePlayStore } from '@/store/play';
import { useThemeStore } from '@/store/theme';

const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
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
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

jest.mock('@/lib/i18n/useI18n', () => ({
  useI18n: () => ({
    direction: 'ltr',
    getTextStyle: () => ({}),
    t: (key: string, values?: Record<string, string | number>) => {
      const messages: Record<string, string> = {
        'common.close': 'Close',
        'common.leave': 'Leave',
        'common.loading': 'Loading',
        'common.points': `${values?.count ?? 0} points`,
        'common.settings': 'Settings',
        'common.stay': 'Stay',
        'common.teamOne': 'Team 1',
        'common.teamTwo': 'Team 2',
        'common.tokens': 'Tokens',
        'play.boardCurrentTurnA11y': 'Current turn',
        'play.boardExit': 'Exit',
        'play.boardLifelines': 'Lifelines',
        'play.drawRandomQuestion': 'Draw Random Question',
        'play.exitGame': 'Exit Game',
        'play.leaveMatchBody': 'Leaving now will discard the active play session.',
        'play.leaveMatchTitle': 'Leave Match?',
        'play.matchMenuA11y': 'Match menu',
        'play.noQuestionsLeft': 'No Questions Left',
        'play.questionBoardTitle': 'Question Board',
        'play.randomSelectorAction': 'Reveal Random Question',
        'play.randomSelectorIdleBody': 'A random remaining question will be drawn from the board.',
        'play.randomSelectorIdleTitle': 'Random Question Select',
        'play.randomSelectorRollingBody': 'Picking a random question now…',
        'play.randomSelectorRollingTitle': 'Random Question Select',
        'play.wagerModeBody': `${values?.wageringTeam ?? 'Team 1'} wagered on ${values?.targetTeam ?? 'Team 2'}. A random tile is being selected.`,
        'play.wagerModeTitle': 'Wager Mode',
        'play.wagerSelectorBody': `${values?.wageringTeam ?? 'Team 1'} is drawing a random question for ${values?.targetTeam ?? 'Team 2'}.`,
        'play.wagerSelectorTitle': 'Random Question Select',
      };
      return messages[key] ?? key;
    },
    uiLocale: 'en',
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@/features/play/components/PlayScaffold', () => ({
  PlayScaffold: ({
    children,
    customHeader,
    footer,
  }: {
    children: React.ReactNode;
    customHeader?: React.ReactNode;
    footer?: React.ReactNode;
  }) => (
    <>
      {customHeader}
      {children}
      {footer}
    </>
  ),
}));

function createQuestion(
  overrides: Partial<QuestionCard> & Pick<QuestionCard, 'id' | 'canonicalKey'>
): QuestionCard {
  return {
    id: overrides.id,
    canonicalKey: overrides.canonicalKey,
    categoryId: overrides.categoryId ?? 'cat_science',
    categoryName: overrides.categoryName ?? 'Science',
    prompt: overrides.prompt ?? 'What is the answer?',
    answer: overrides.answer ?? '42',
    pointValue: overrides.pointValue ?? 200,
    locale: overrides.locale ?? 'en',
    resolvedFromFallback: overrides.resolvedFromFallback ?? false,
    used: overrides.used ?? false,
    boardSide: overrides.boardSide,
  };
}

function createSession(overrides: Partial<GameSessionState> = {}): GameSessionState {
  const board =
    overrides.board ??
    [
      createQuestion({ id: 'q-1', canonicalKey: 'science:200:1', boardSide: 'left' }),
      createQuestion({ id: 'q-2', canonicalKey: 'science:200:2', boardSide: 'right' }),
    ];
  const teams =
    overrides.teams ??
    [
      { id: 'team_1', name: 'Alpha', playerNames: ['Ava'], score: 0, wagersUsed: 0 },
      { id: 'team_2', name: 'Beta', playerNames: ['Ben'], score: 0, wagersUsed: 0 },
    ];

  const config: GameConfig =
    overrides.config ??
    {
      mode: overrides.mode ?? 'random',
      teams: teams.map(({ id, name, playerNames }) => ({ id, name, playerNames })),
      categories: ['science'],
      contentLocaleChain: ['en'],
      quickPlayTopicCount: 3,
      hotSeatEnabled: false,
      wagerEnabled: overrides.mode !== 'random',
      wagersPerTeam: overrides.mode !== 'random' ? 1 : 0,
    };

  return {
    id: 'session-board',
    mode: overrides.mode ?? 'random',
    config,
    contentLocaleChain: ['en'],
    step: 'board',
    phase: 'wagerDecision',
    availableCategories: [
      {
        id: 'cat_science',
        slug: 'science',
        title: 'Science',
        questionCount: 8,
        resolvedLocale: 'en',
        fellBackToEnglish: false,
      },
    ],
    selectedCategoryIds: ['science'],
    currentTeamId: 'team_1',
    currentQuestion: undefined,
    board,
    teams,
    scores: {
      team_1: 0,
      team_2: 0,
    },
    usedQuestionIds: new Set(),
    seed: 'seed-board',
    wagersPerTeam: overrides.mode !== 'random' ? 1 : 0,
    wager: null,
    bonus: {
      active: false,
      played: false,
      multiplier: 2,
    },
    scoreEvents: [],
    timerStartedAt: 1_000_000,
    ...overrides,
  };
}

describe('PlayBoardScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
    useThemeStore.setState({ paletteId: 'default' });
    usePlayStore.setState({ session: null, tokens: 5, rapidFire: null });
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  });

  it('renders score pills with dark surface and light text in dark mode', () => {
    useThemeStore.setState({ paletteId: 'dark' });
    usePlayStore.setState({
      session: createSession({ mode: 'classic' }),
    });

    render(<PlayBoardScreen />);

    // Inactive team uses the default pill face (not the fire active-turn glow).
    const teamName = screen.getByText('Beta');
    let node: { parent?: unknown; props?: { style?: unknown } } | null = teamName as never;
    let pillStyle: Record<string, unknown> | undefined;
    for (let i = 0; i < 8 && node; i += 1) {
      const flat = StyleSheet.flatten(node.props?.style);
      if (flat?.backgroundColor && typeof flat.borderRadius === 'number') {
        pillStyle = flat as Record<string, unknown>;
        break;
      }
      node = (node as { parent?: typeof node }).parent ?? null;
    }

    expect(pillStyle?.backgroundColor).toBe(PALETTES.dark.cardBackground);
    expect(pillStyle?.backgroundColor).not.toBe('#FFFFFF');
    expect(pillStyle?.backgroundColor).not.toBe('#FFF3EC');

    const nameStyle = StyleSheet.flatten(teamName.props.style);
    expect(nameStyle.color).toBe(getPlaySurfaceColors().textMuted);
    expect(nameStyle.color).not.toBe('#333333');
  });

  it('opens a match menu from the Backfire logo with Settings and Exit Game', () => {
    usePlayStore.setState({
      session: createSession({ mode: 'classic' }),
    });

    render(<PlayBoardScreen />);

    expect(screen.queryByTestId('play-match-menu-modal')).toBeNull();

    fireEvent.press(screen.getByLabelText('Match menu'));

    expect(screen.getByTestId('play-match-menu-modal')).toBeTruthy();
    expect(screen.getByLabelText('Settings')).toBeTruthy();
    expect(screen.getByLabelText('Exit Game')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Settings'));

    expect(mockPush).toHaveBeenCalledWith('/(app)/settings');
    expect(screen.queryByTestId('play-match-menu-modal')).toBeNull();
  });

  it('keeps the board visible in random mode and locks a random remaining tile after the flash', async () => {
    usePlayStore.setState({
      session: createSession({ mode: 'random' }),
    });

    render(<PlayBoardScreen />);

    expect(screen.queryByTestId('random-question-selector')).toBeNull();
    expect(screen.getAllByText('SCIENCE').length).toBeGreaterThan(0);
    expect(screen.getAllByText('200').length).toBeGreaterThan(0);
    expect(screen.queryByText('Draw Random Question')).toBeNull();

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId('board-random-pick-locked')).toBeTruthy();
    expect(screen.getByLabelText('Selected 200 point question')).toBeTruthy();
  });

  it('only opens the locked random tile when pressed in random mode', async () => {
    const left = createQuestion({
      id: 'q-left',
      canonicalKey: 'science:200:left',
      boardSide: 'left',
      pointValue: 200,
    });
    const right = createQuestion({
      id: 'q-right',
      canonicalKey: 'science:400:right',
      boardSide: 'right',
      pointValue: 400,
    });
    usePlayStore.setState({
      session: createSession({
        mode: 'random',
        board: [left, right],
      }),
    });

    render(<PlayBoardScreen />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Single-sided point rows are mirrored onto both rails, so the locked id can appear twice.
    const lockedTiles = screen.getAllByTestId('board-random-pick-locked');
    const locked = lockedTiles[0]!;
    const lockedLabel = locked.props.accessibilityLabel as string;
    const otherLabel = lockedLabel.includes('200') ? '400 points' : '200 points';

    fireEvent.press(screen.getAllByLabelText(otherLabel)[0]!);
    expect(usePlayStore.getState().session?.step).toBe('board');
    expect(mockReplace).not.toHaveBeenCalled();

    fireEvent.press(locked);
    expect(usePlayStore.getState().session?.step).toBe('question');
    expect(usePlayStore.getState().session?.currentQuestion?.id).toBeTruthy();
    expect(mockReplace).toHaveBeenCalledWith('/play/question');
  });

  it('reuses the same board flash lock while a wager question is being drawn', async () => {
    usePlayStore.setState({
      session: createSession({
        mode: 'classic',
        config: {
          mode: 'classic',
          teams: [
            { id: 'team_1', name: 'Alpha', playerNames: ['Ava'] },
            { id: 'team_2', name: 'Beta', playerNames: ['Ben'] },
          ],
          categories: ['science'],
          contentLocaleChain: ['en'],
          quickPlayTopicCount: 3,
          hotSeatEnabled: false,
          wagerEnabled: true,
          wagersPerTeam: 1,
        },
        wager: {
          wageringTeamId: 'team_1',
          targetTeamId: 'team_2',
          multiplier: 1.5,
          question: undefined,
        },
      }),
    });

    render(<PlayBoardScreen />);

    expect(screen.queryByTestId('random-question-selector')).toBeNull();
    expect(screen.getAllByText('SCIENCE').length).toBeGreaterThan(0);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId('board-random-pick-locked')).toBeTruthy();
    expect(screen.queryByText('Random Question Select')).toBeNull();
  });

  it('reopens a used question to review its answer', () => {
    const usedQuestion = createQuestion({
      id: 'q-used',
      canonicalKey: 'science:200:used',
      boardSide: 'left',
      answer: 'Used answer',
    });
    usePlayStore.setState({
      session: createSession({
        mode: 'classic',
        board: [
          usedQuestion,
          createQuestion({ id: 'q-open', canonicalKey: 'science:200:open', boardSide: 'right' }),
        ],
        usedQuestionIds: new Set([usedQuestion.id]),
      }),
    });

    render(<PlayBoardScreen />);
    fireEvent.press(screen.getByLabelText('Review 200 point question'));

    expect(usePlayStore.getState().session?.step).toBe('answer');
    expect(usePlayStore.getState().session?.reviewingUsedQuestion).toBe(true);
    expect(usePlayStore.getState().session?.currentQuestion?.answer).toBe('Used answer');
    expect(mockReplace).toHaveBeenCalledWith('/play/question');
  });

  it('shows every rumble team name and score in the match header', () => {
    usePlayStore.setState({
      session: createSession({
        mode: 'rumble',
        config: {
          mode: 'rumble',
          teams: [
            { id: 'team_1', name: 'Alpha', playerNames: ['Ava'] },
            { id: 'team_2', name: 'Beta', playerNames: ['Ben'] },
            { id: 'team_3', name: 'Gamma', playerNames: ['Gia'] },
            { id: 'team_4', name: 'Delta', playerNames: ['Dee'] },
          ],
          categories: ['science'],
          contentLocaleChain: ['en'],
          quickPlayTopicCount: 3,
          hotSeatEnabled: false,
          wagerEnabled: false,
          wagersPerTeam: 0,
        },
        teams: [
          { id: 'team_1', name: 'Alpha', playerNames: ['Ava'], score: 10, wagersUsed: 0 },
          { id: 'team_2', name: 'Beta', playerNames: ['Ben'], score: 20, wagersUsed: 0 },
          { id: 'team_3', name: 'Gamma', playerNames: ['Gia'], score: 30, wagersUsed: 0 },
          { id: 'team_4', name: 'Delta', playerNames: ['Dee'], score: 40, wagersUsed: 0 },
        ],
        scores: {
          team_1: 10,
          team_2: 20,
          team_3: 30,
          team_4: 40,
        },
      }),
    });

    render(<PlayBoardScreen />);

    expect(screen.getAllByText('Alpha').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Beta').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Gamma').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Delta').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('10').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('20').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('30').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('40').length).toBeGreaterThanOrEqual(1);
  });

  it('lets every rumble team adjust score from a compact six-team header', () => {
    usePlayStore.setState({
      session: createSession({
        mode: 'rumble',
        config: {
          mode: 'rumble',
          teams: [
            { id: 'team_1', name: 'Alpha', playerNames: ['Ava'] },
            { id: 'team_2', name: 'Beta', playerNames: ['Ben'] },
            { id: 'team_3', name: 'Gamma', playerNames: ['Gia'] },
            { id: 'team_4', name: 'Delta', playerNames: ['Dee'] },
            { id: 'team_5', name: 'Echo', playerNames: ['Eve'] },
            { id: 'team_6', name: 'Foxtrot', playerNames: ['Fay'] },
          ],
          categories: ['science'],
          contentLocaleChain: ['en'],
          quickPlayTopicCount: 3,
          hotSeatEnabled: false,
          wagerEnabled: false,
          wagersPerTeam: 0,
        },
        teams: [
          { id: 'team_1', name: 'Alpha', playerNames: ['Ava'], score: 0, wagersUsed: 0 },
          { id: 'team_2', name: 'Beta', playerNames: ['Ben'], score: 0, wagersUsed: 0 },
          { id: 'team_3', name: 'Gamma', playerNames: ['Gia'], score: 0, wagersUsed: 0 },
          { id: 'team_4', name: 'Delta', playerNames: ['Dee'], score: 0, wagersUsed: 0 },
          { id: 'team_5', name: 'Echo', playerNames: ['Eve'], score: 0, wagersUsed: 0 },
          { id: 'team_6', name: 'Foxtrot', playerNames: ['Fay'], score: 0, wagersUsed: 0 },
        ],
        scores: {
          team_1: 0,
          team_2: 0,
          team_3: 0,
          team_4: 0,
          team_5: 0,
          team_6: 0,
        },
      }),
    });

    render(<PlayBoardScreen />);

    for (const name of ['Alpha', 'Beta', 'Gamma', 'Delta', 'Echo', 'Foxtrot']) {
      expect(screen.getAllByText(name).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByLabelText(`${name} plus 50`)).toBeTruthy();
      expect(screen.getByLabelText(`${name} minus 50`)).toBeTruthy();
    }

    fireEvent.press(screen.getByLabelText('Foxtrot plus 50'));
    expect(usePlayStore.getState().session?.teams.find((team) => team.id === 'team_6')?.score).toBe(
      50
    );
  });
});
