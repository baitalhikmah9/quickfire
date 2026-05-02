import React from 'react';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
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
        'play.rumbleWaiting': 'Teams appear after 30 seconds.',
        'play.rumbleFirstWindow': `${values?.team ?? 'Team'} answers now.`,
        'play.rumbleTransitionWindow': 'Next team appears at 76 seconds.',
        'play.rumbleSecondWindow': `${values?.team ?? 'Team'} answers now. Round ends at 90 seconds.`,
        'play.rumbleRoundEnded': 'Round ended.',
        'play.showAnswer': 'Show Answer',
        'play.hotSeatActiveTitle': 'Hot Seat',
        'play.nextTurn': 'Next Turn',
        'play.whoGetsPoints': 'Who gets the points?',
        'play.pointsAwarded': 'Points awarded.',
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

  it('switches rumble status across the 31, 61, 76, and 90 second windows', () => {
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
    expect(screen.queryByText('[BETA]')).toBeNull();
    expect(screen.queryByText('[GAMMA]')).toBeNull();

    jest.spyOn(Date, 'now').mockReturnValue(1_031_000);
    act(() => {
      jest.advanceTimersByTime(31_000);
    });

    expect(screen.getByText('BETA ANSWERS NOW.')).toBeTruthy();
    expect(screen.getByText('[BETA]')).toBeTruthy();
    expect(screen.queryByText('[GAMMA]')).toBeNull();

    jest.spyOn(Date, 'now').mockReturnValue(1_061_000);
    act(() => {
      jest.advanceTimersByTime(30_000);
    });

    expect(screen.getByText('NEXT TEAM APPEARS AT 76 SECONDS.')).toBeTruthy();
    expect(screen.getByText('[BETA]')).toBeTruthy();
    expect(screen.queryByText('[GAMMA]')).toBeNull();

    jest.spyOn(Date, 'now').mockReturnValue(1_076_000);
    act(() => {
      jest.advanceTimersByTime(15_000);
    });

    expect(screen.getByText('GAMMA ANSWERS NOW. ROUND ENDS AT 90 SECONDS.')).toBeTruthy();
    expect(screen.getByText('[GAMMA]')).toBeTruthy();

    jest.spyOn(Date, 'now').mockReturnValue(1_090_000);
    act(() => {
      jest.advanceTimersByTime(14_000);
    });

    expect(screen.getByText('ROUND ENDED.')).toBeTruthy();
  });

  it('keeps show answer unavailable until the second rumble team is revealed and keeps it available after 90 seconds', () => {
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

    fireEvent.press(screen.getByText('SHOW ANSWER'));
    expect(mockReplace).not.toHaveBeenCalledWith('/play/answer');

    jest.spyOn(Date, 'now').mockReturnValue(1_076_000);
    act(() => {
      jest.advanceTimersByTime(76_000);
    });

    fireEvent.press(screen.getByText('SHOW ANSWER'));
    expect(mockReplace).not.toHaveBeenCalledWith('/play/answer');
    expect(screen.getByText('Who gets the points?')).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();

    mockReplace.mockClear();
    act(() => {
      usePlayStore.setState({
        session: createSession({
          currentQuestion: question,
          board: [question],
        }),
      });
    });
    jest.spyOn(Date, 'now').mockReturnValue(1_090_000);
    act(() => {
      jest.advanceTimersByTime(14_000);
    });

    fireEvent.press(screen.getByText('SHOW ANSWER'));
    expect(screen.getByText('Who gets the points?')).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
  });

  it('shows a scrollable question body with prompt imagery for dense prompts', () => {
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
    expect(screen.getByTestId('question-prompt-image')).toBeTruthy();
  });

  it('lets unrevealed mobile questions wrap instead of shrinking to one unreadable line', () => {
    const prompt = 'Which tragic hero is known for thee of jealousy?';
    const question = createQuestion({
      id: 'q-mobile-readable',
      canonicalKey: 'literature:200:mobile-readable',
      categoryName: 'Shakespeare',
      prompt,
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
          categories: ['literature'],
          contentLocaleChain: ['en'],
          quickPlayTopicCount: 3,
          hotSeatEnabled: false,
          wagerEnabled: false,
          wagersPerTeam: 0,
        },
        teams: [
          { id: 'team_1', name: 'Alpha', playerNames: ['Ava'], score: 0, wagersUsed: 0 },
          { id: 'team_2', name: 'Beta', playerNames: ['Ben'], score: 0, wagersUsed: 0 },
        ],
        scores: { team_1: 0, team_2: 0 },
      }),
    });

    render(<PlayQuestionScreen />);

    expect(screen.getByText(prompt).props.numberOfLines).toBe(3);
    expect(screen.getByText(prompt).props.minimumFontScale).toBe(0.72);
  });

  it('keeps the next-turn action docked after points are assigned in the embedded answer flow', () => {
    const question = createQuestion({
      id: 'q-next-turn-dock',
      canonicalKey: 'literature:200:next-turn-dock',
      categoryName: 'Shakespeare',
      prompt: 'Which tragic hero is known for thee of jealousy?',
      answer: 'Othello',
    });

    usePlayStore.setState({
      session: createSession({
        mode: 'classic',
        step: 'answer',
        phase: 'scoring',
        lastAwardedTeamId: 'team_1',
        currentQuestion: question,
        board: [question],
        config: {
          mode: 'classic',
          teams: [
            { id: 'team_1', name: 'Alpha', playerNames: ['Ava'] },
            { id: 'team_2', name: 'Beta', playerNames: ['Ben'] },
          ],
          categories: ['literature'],
          contentLocaleChain: ['en'],
          quickPlayTopicCount: 3,
          hotSeatEnabled: false,
          wagerEnabled: false,
          wagersPerTeam: 0,
        },
        teams: [
          { id: 'team_1', name: 'Alpha', playerNames: ['Ava'], score: 200, wagersUsed: 0 },
          { id: 'team_2', name: 'Beta', playerNames: ['Ben'], score: 0, wagersUsed: 0 },
        ],
        scores: { team_1: 200, team_2: 0 },
      }),
    });

    render(<PlayQuestionScreen />);

    expect(screen.getByTestId('question-answer-next-turn-dock')).toBeTruthy();
    expect(screen.getByText('NEXT TURN')).toBeTruthy();
  });
});
