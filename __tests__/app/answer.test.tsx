import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import type { GameConfig, GameSessionState, QuestionCard } from '@/features/shared';

import PlayAnswerScreen from '@/app/(app)/play/answer';
import { usePlayStore } from '@/store/play';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
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
    t: (key: string) => {
      const messages: Record<string, string> = {
        'common.loading': 'Loading',
        'common.leave': 'Leave',
        'common.stay': 'Stay',
        'play.correctAnswer': 'Correct Answer',
        'play.finishMatch': 'Finish Match',
        'play.leaveMatchBody': 'Leaving now will discard the active play session.',
        'play.leaveMatchTitle': 'Leave Match?',
        'play.neitherTeam': 'Neither Team',
        'play.nextTurn': 'Next Turn',
        'play.noPointsAwarded': 'No points awarded',
        'play.originalQuestion': 'Original Question',
        'play.pointsAwarded': 'Points awarded.',
        'play.resolveTurnTitle': 'Review the Answer',
        'play.wagerNextTeam': 'Wager on Next Team',
        'play.whoGetsPoints': 'Who gets the points?',
      };
      return messages[key] ?? key;
    },
  }),
}));

jest.mock('@/features/play/components/PlayScaffold', () => ({
  PlayScaffold: ({ children }: { children: React.ReactNode }) => children,
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
    promptImageUrl: overrides.promptImageUrl,
    answerImageUrl: overrides.answerImageUrl,
    pointValue: overrides.pointValue ?? 200,
    locale: overrides.locale ?? 'en',
    resolvedFromFallback: overrides.resolvedFromFallback ?? false,
    used: overrides.used ?? false,
    boardSide: overrides.boardSide,
  };
}

function createSession(overrides: Partial<GameSessionState> = {}): GameSessionState {
  const board = overrides.board ?? [createQuestion({ id: 'q-1', canonicalKey: 'science:200:1' })];
  const teams =
    overrides.teams ??
    [
      { id: 'team_1', name: 'Alpha', playerNames: ['Ava'], score: 0, wagersUsed: 0 },
      { id: 'team_2', name: 'Beta', playerNames: ['Ben'], score: 0, wagersUsed: 0 },
    ];

  const config: GameConfig =
    overrides.config ??
    {
      mode: overrides.mode ?? 'classic',
      teams: teams.map(({ id, name, playerNames }) => ({ id, name, playerNames })),
      categories: ['science'],
      contentLocaleChain: ['en'],
      quickPlayTopicCount: 3,
      hotSeatEnabled: false,
      wagerEnabled: true,
      wagersPerTeam: 1,
    };

  return {
    id: 'session-answer',
    mode: overrides.mode ?? 'classic',
    config,
    contentLocaleChain: ['en'],
    step: 'answer',
    phase: 'scoring',
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
    currentQuestion: board[0],
    board,
    teams,
    scores: {
      team_1: 0,
      team_2: 0,
    },
    usedQuestionIds: new Set(),
    seed: 'seed-answer',
    wagersPerTeam: 1,
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

describe('PlayAnswerScreen', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    usePlayStore.setState({ session: null, tokens: 5, rapidFire: null });
  });

  it('shows the answer content without the extra original-question and correct-answer labels', () => {
    const question = createQuestion({
      id: 'q-answer',
      canonicalKey: 'science:200:answer',
      prompt: 'What is the answer?',
      answer: '42',
    });

    usePlayStore.setState({
      session: createSession({
        currentQuestion: question,
        board: [question],
      }),
    });

    render(<PlayAnswerScreen />);

    expect(screen.queryByText('Original Question')).toBeNull();
    expect(screen.queryByText('Correct Answer')).toBeNull();
    expect(screen.getByText('42')).toBeTruthy();
  });
});
