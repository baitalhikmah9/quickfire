import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import type { GameConfig, GameSessionState, QuestionCard } from '@/features/shared';

import PlayBoardScreen from '@/app/(app)/play/board';
import { usePlayStore } from '@/store/play';

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
        'common.stay': 'Stay',
        'common.teamOne': 'Team 1',
        'common.teamTwo': 'Team 2',
        'common.tokens': 'Tokens',
        'play.boardCurrentTurnA11y': 'Current turn',
        'play.boardExit': 'Exit',
        'play.boardLifelines': 'Lifelines',
        'play.drawRandomQuestion': 'Draw Random Question',
        'play.leaveMatchBody': 'Leaving now will discard the active play session.',
        'play.leaveMatchTitle': 'Leave Match?',
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
  PlayScaffold: ({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) => (
    <>
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
    usePlayStore.setState({ session: null, tokens: 5, rapidFire: null });
  });

  it('uses the shared random selector panel for random mode instead of the old plain button', () => {
    usePlayStore.setState({
      session: createSession({ mode: 'random' }),
    });

    render(<PlayBoardScreen />);

    expect(screen.getByTestId('random-question-selector')).toBeTruthy();
    expect(screen.getByText('Random Question Select')).toBeTruthy();
    expect(screen.getByText('Reveal Random Question')).toBeTruthy();
    expect(screen.queryByText('Draw Random Question')).toBeNull();
  });

  it('reuses the same selector panel while a wager question is being drawn', () => {
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

    expect(screen.getByTestId('random-question-selector')).toBeTruthy();
    expect(screen.getByText('Random Question Select')).toBeTruthy();
    expect(screen.getByText('Alpha is drawing a random question for Beta.')).toBeTruthy();
  });
});
