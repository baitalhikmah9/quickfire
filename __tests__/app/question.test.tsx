import React from 'react';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, render, screen } from '@testing-library/react-native';
import type { GameConfig, GameSessionState, QuestionCard } from '@/features/shared';

import PlayQuestionScreen from '@/app/(app)/play/question';
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
    getTextStyle: () => ({}),
    t: (key: string, values?: Record<string, string | number>) => {
      const messages: Record<string, string> = {
        'common.back': 'Back',
        'common.loading': 'Loading',
        'play.questionLanguage': 'Question language',
        'play.rumbleWaiting': 'Teams appear after 30 seconds.',
        'play.rumbleFirstWindow': `${values?.team ?? 'Team'} answers now.`,
        'play.rumbleSecondWindow': `${values?.team ?? 'Team'} joins. Answer by 60 seconds.`,
        'play.showAnswer': 'Show Answer',
        'play.hotSeatActiveTitle': 'Hot Seat',
      };
      return messages[key] ?? key;
    },
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
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
    rumbleFirstTeamId: overrides.rumbleFirstTeamId,
    rumbleSecondTeamId: overrides.rumbleSecondTeamId,
  };
}

function createSession(overrides: Partial<GameSessionState> = {}): GameSessionState {
  const board = overrides.board ?? [createQuestion({ id: 'q-1', canonicalKey: 'science:200:1' })];
  const teams =
    overrides.teams ??
    [
      { id: 'team_1', name: 'Alpha', playerNames: ['Ava'], score: 0, wagersUsed: 0 },
      { id: 'team_2', name: 'Beta', playerNames: ['Ben'], score: 0, wagersUsed: 0 },
      { id: 'team_3', name: 'Gamma', playerNames: ['Gia'], score: 0, wagersUsed: 0 },
    ];

  const config: GameConfig =
    overrides.config ??
    {
      mode: overrides.mode ?? 'rumble',
      teams: teams.map(({ id, name, playerNames }) => ({ id, name, playerNames })),
      categories: ['science'],
      contentLocaleChain: ['en'],
      quickPlayTopicCount: 3,
      hotSeatEnabled: false,
      wagerEnabled: false,
      wagersPerTeam: 0,
    };

  return {
    id: 'session-question',
    mode: overrides.mode ?? 'rumble',
    config,
    contentLocaleChain: ['en'],
    step: 'question',
    phase: 'questionReveal',
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
      team_3: 0,
    },
    usedQuestionIds: new Set(),
    seed: 'seed-question',
    wagersPerTeam: 0,
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

describe('PlayQuestionScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReplace.mockClear();
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    usePlayStore.setState({ session: null, tokens: 5, rapidFire: null });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('switches rumble status after the first 30-second window and again at the 60-second mark', () => {
    const question = createQuestion({
      id: 'q-rumble',
      canonicalKey: 'science:200:rumble',
      rumbleFirstTeamId: 'team_2',
      rumbleSecondTeamId: 'team_3',
    });

    usePlayStore.setState({
      session: createSession({
        currentQuestion: question,
        board: [question],
      }),
    });

    render(<PlayQuestionScreen />);

    expect(screen.getByText('TEAMS APPEAR AFTER 30 SECONDS.')).toBeTruthy();

    jest.spyOn(Date, 'now').mockReturnValue(1_031_000);
    act(() => {
      jest.advanceTimersByTime(31_000);
    });

    expect(screen.getByText('BETA ANSWERS NOW.')).toBeTruthy();

    jest.spyOn(Date, 'now').mockReturnValue(1_046_000);
    act(() => {
      jest.advanceTimersByTime(15_000);
    });

    expect(screen.getByText('GAMMA JOINS. ANSWER BY 60 SECONDS.')).toBeTruthy();
  });

  it('shows a scrollable question body with language metadata and prompt imagery for dense prompts', () => {
    const question = createQuestion({
      id: 'q-locale',
      canonicalKey: 'history:400:locale',
      locale: 'ar',
      prompt:
        'هذا سؤال طويل يحتوي على تفاصيل إضافية حتى نتحقق من أن الشاشة تبقى قابلة للقراءة عندما يزداد طول النص المعروض للمستخدم.',
      promptImageUrl: 'https://example.com/prompt.png',
    });

    usePlayStore.setState({
      session: createSession({
        mode: 'classic',
        currentQuestion: question,
        board: [question],
        config: {
          mode: 'classic',
          teams: [
            { id: 'team_1', name: 'Alpha', playerNames: ['Ava'] },
            { id: 'team_2', name: 'Beta', playerNames: ['Ben'] },
          ],
          categories: ['history'],
          contentLocaleChain: ['ar', 'en'],
          quickPlayTopicCount: 3,
          hotSeatEnabled: false,
          wagerEnabled: true,
          wagersPerTeam: 1,
        },
        teams: [
          { id: 'team_1', name: 'Alpha', playerNames: ['Ava'], score: 0, wagersUsed: 0 },
          { id: 'team_2', name: 'Beta', playerNames: ['Ben'], score: 0, wagersUsed: 0 },
        ],
        scores: { team_1: 0, team_2: 0 },
      }),
    });

    render(<PlayQuestionScreen />);

    expect(screen.getByTestId('question-content-scroll')).toBeTruthy();
    expect(screen.getByTestId('question-language-chip')).toHaveTextContent(
      'Question language: العربية (Arabic)'
    );
    expect(screen.getByTestId('question-prompt-image')).toBeTruthy();
  });
});
