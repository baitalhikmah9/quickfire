import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { GameConfig, GameSessionState, QuestionCard } from '@/features/shared';
import { serializeGameSession } from '@/store/gameSessionPersistence';

const mockStorage = new Map<string, string>();

const mockAsyncStorage = {
  getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    mockStorage.set(key, value);
  }),
  removeItem: jest.fn(async (key: string) => {
    mockStorage.delete(key);
  }),
  clear: jest.fn(async () => {
    mockStorage.clear();
  }),
};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  getItem: mockAsyncStorage.getItem,
  setItem: mockAsyncStorage.setItem,
  removeItem: mockAsyncStorage.removeItem,
  clear: mockAsyncStorage.clear,
  default: mockAsyncStorage,
}));

const { usePlayStore } = require('@/store/play') as typeof import('@/store/play');

const STORAGE_KEY = 'doubledown-play-store-v1';

function createQuestion(overrides: Partial<QuestionCard> & Pick<QuestionCard, 'id' | 'canonicalKey'>): QuestionCard {
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
    rumbleFirstTeamId: overrides.rumbleFirstTeamId,
    rumbleSecondTeamId: overrides.rumbleSecondTeamId,
  };
}

function createSession(overrides: Partial<GameSessionState> = {}): GameSessionState {
  const board = overrides.board ?? [createQuestion({ id: 'q-board-1', canonicalKey: 'science:200:0' })];
  const teams =
    overrides.teams ??
    [
      { id: 'team_1', name: 'Alpha', playerNames: ['Ava'], score: 300, wagersUsed: 1 },
      { id: 'team_2', name: 'Beta', playerNames: ['Ben'], score: 500, wagersUsed: 0 },
    ];

  const config: GameConfig =
    overrides.config ??
    {
      mode: 'classic',
      teams: teams.map(({ id, name, playerNames }) => ({ id, name, playerNames })),
      categories: ['science'],
      contentLocaleChain: ['en'],
      quickPlayTopicCount: 3,
      hotSeatEnabled: false,
      wagerEnabled: true,
      wagersPerTeam: 3,
    };

  return {
    id: 'session-1',
    mode: 'classic',
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
    currentQuestion: board[0],
    board,
    teams,
    scores: {
      team_1: 300,
      team_2: 500,
    },
    usedQuestionIds: new Set(['q-board-1']),
    seed: 'seed-123',
    wagersPerTeam: 3,
    wager: {
      wageringTeamId: 'team_2',
      targetTeamId: 'team_1',
      multiplier: 1.5,
      question: board[0],
    },
    bonus: {
      active: false,
      played: true,
      multiplier: 2,
      question: createQuestion({ id: 'q-bonus-1', canonicalKey: 'science:bonus:0', pointValue: 400 }),
    },
    lastAwardedTeamId: 'team_1',
    timerStartedAt: 123456789,
    overtime: {
      topics: ['science', 'history'],
      leadingTeamBanned: 'science',
      trailingTeamSelected: 'history',
    },
    scoreEvents: [],
    ...overrides,
  };
}

function seedPlayStorage(tokens: number, session: GameSessionState | null) {
  mockStorage.set(
    STORAGE_KEY,
    JSON.stringify({
      state: {
        tokens,
        session: serializeGameSession(session),
        rapidFire: null,
      },
      version: 1,
    })
  );
}

beforeEach(async () => {
  mockStorage.clear();
  jest.clearAllMocks();
  usePlayStore.setState({ session: null, tokens: 5, rapidFire: null });
  await usePlayStore.getState().hydrate();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('usePlayStore', () => {
  it('creates classic setup with zero hot seat rounds and one wager per team', () => {
    usePlayStore.getState().setMode('classic');

    const session = usePlayStore.getState().session;

    expect(session?.config.hotSeatEnabled).toBe(false);
    expect(session?.config.hotSeatRounds).toBe(0);
    expect(session?.config.wagersPerTeam).toBe(1);
    expect(session?.wagersPerTeam).toBe(1);
  });

  it('branches quick play through topic length before team setup', () => {
    usePlayStore.getState().setMode('quickPlay');
    expect(usePlayStore.getState().session?.step).toBe('quick-play-length');

    usePlayStore.getState().setQuickPlayTopicCount(5);
    expect(usePlayStore.getState().session?.step).toBe('team-setup');
    expect(usePlayStore.getState().session?.config.quickPlayTopicCount).toBe(5);
  });

  it('sends rumble into team setup like classic', () => {
    usePlayStore.getState().setMode('rumble');
    expect(usePlayStore.getState().session?.step).toBe('team-setup');
    expect(usePlayStore.getState().session?.mode).toBe('rumble');
  });

  it('lets rumble use only two, three, four, or six teams while keeping wagers and hot seat off', () => {
    usePlayStore.getState().setMode('rumble');

    let session = usePlayStore.getState().session;
    expect(session?.teams).toHaveLength(2);

    for (const count of [3, 4, 6]) {
      usePlayStore.getState().setTeamCount(count);
      session = usePlayStore.getState().session;
      expect(session?.teams).toHaveLength(count);
      expect(session?.config.teams).toHaveLength(count);
      expect(session?.config.wagerEnabled).toBe(false);
      expect(session?.config.hotSeatEnabled).toBe(false);
      expect(session?.config.hotSeatRounds).toBe(0);
    }

    usePlayStore.getState().setTeamCount(5);
    session = usePlayStore.getState().session;
    expect(session?.teams).toHaveLength(6);

    usePlayStore.getState().setTeamCount(1);
    session = usePlayStore.getState().session;
    expect(session?.teams).toHaveLength(2);
  });

  it('assigns rumble questions evenly by team, answer order, and difficulty', () => {
    usePlayStore.setState({ session: null, tokens: 20, rapidFire: null });
    const store = usePlayStore.getState();
    store.setMode('rumble');
    usePlayStore.getState().setTeamCount(6);
    const categories = usePlayStore.getState().session?.availableCategories.slice(0, 6) ?? [];

    for (const category of categories) {
      usePlayStore.getState().toggleCategory(category.slug);
    }

    const result = usePlayStore.getState().startBoard();

    expect(result).toMatchObject({ ok: true });
    const session = usePlayStore.getState().session!;
    const byPointValue = session.board.reduce<Record<number, typeof session.board>>(
      (groups, question) => {
        groups[question.pointValue] = groups[question.pointValue] ?? [];
        groups[question.pointValue].push(question);
        return groups;
      },
      {}
    );

    for (const questions of Object.values(byPointValue)) {
      expect(questions).toHaveLength(12);
      const firstCounts = questions.reduce<Record<string, number>>((counts, question) => {
        counts[question.rumbleFirstTeamId!] = (counts[question.rumbleFirstTeamId!] ?? 0) + 1;
        return counts;
      }, {});
      const secondCounts = questions.reduce<Record<string, number>>((counts, question) => {
        counts[question.rumbleSecondTeamId!] = (counts[question.rumbleSecondTeamId!] ?? 0) + 1;
        return counts;
      }, {});

      expect(firstCounts).toEqual({
        team_1: 2,
        team_2: 2,
        team_3: 2,
        team_4: 2,
        team_5: 2,
        team_6: 2,
      });
      expect(secondCounts).toEqual({
        team_1: 2,
        team_2: 2,
        team_3: 2,
        team_4: 2,
        team_5: 2,
        team_6: 2,
      });
      for (const question of questions) {
        expect(question.rumbleSecondTeamId).not.toBe(question.rumbleFirstTeamId);
      }
    }
  });

  it('assigns rumble questions evenly across 100, 200, and 300 value buckets', () => {
    usePlayStore.setState({ session: null, tokens: 20, rapidFire: null });
    const store = usePlayStore.getState();
    store.setMode('rumble');
    usePlayStore.getState().setTeamCount(6);
    const categories = usePlayStore.getState().session?.availableCategories.slice(0, 6) ?? [];

    for (const category of categories) {
      usePlayStore.getState().toggleCategory(category.slug);
    }

    const result = usePlayStore.getState().startBoard();

    expect(result).toMatchObject({ ok: true });
    const session = usePlayStore.getState().session!;
    const bucketFor = (pointValue: number) => pointValue / 2;
    const byBucket = session.board.reduce<Record<number, typeof session.board>>(
      (groups, question) => {
        const bucket = bucketFor(question.pointValue);
        groups[bucket] = groups[bucket] ?? [];
        groups[bucket].push(question);
        return groups;
      },
      {}
    );

    expect(Object.keys(byBucket).sort()).toEqual(['100', '200', '300']);

    for (const questions of Object.values(byBucket)) {
      const firstCounts = questions.reduce<Record<string, number>>((counts, question) => {
        counts[question.rumbleFirstTeamId!] = (counts[question.rumbleFirstTeamId!] ?? 0) + 1;
        return counts;
      }, {});
      const secondCounts = questions.reduce<Record<string, number>>((counts, question) => {
        counts[question.rumbleSecondTeamId!] = (counts[question.rumbleSecondTeamId!] ?? 0) + 1;
        return counts;
      }, {});

      expect(firstCounts).toEqual({
        team_1: 2,
        team_2: 2,
        team_3: 2,
        team_4: 2,
        team_5: 2,
        team_6: 2,
      });
      expect(secondCounts).toEqual(firstCounts);
    }
  });

  it('rejects rumble answer reveal before the second team appears and after the round ends', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    const question = createQuestion({
      id: 'q-rumble',
      canonicalKey: 'science:200:rumble',
      rumbleFirstTeamId: 'team_1',
      rumbleSecondTeamId: 'team_2',
    });

    usePlayStore.setState({
      session: createSession({
        mode: 'rumble',
        config: {
          mode: 'rumble',
          teams: [
            { id: 'team_1', name: 'Alpha', playerNames: ['Ava'] },
            { id: 'team_2', name: 'Beta', playerNames: ['Ben'] },
          ],
          categories: ['science'],
          contentLocaleChain: ['en'],
          quickPlayTopicCount: 3,
          hotSeatEnabled: false,
          wagerEnabled: false,
          wagersPerTeam: 0,
        },
        currentQuestion: question,
        board: [question],
        step: 'question',
        phase: 'questionReveal',
        timerStartedAt: 1_000_000,
      }),
    });

    expect(usePlayStore.getState().revealAnswer()).toEqual({
      ok: false,
      error: 'The second Rumble team has not been revealed yet.',
    });
    expect(usePlayStore.getState().session?.step).toBe('question');

    jest.spyOn(Date, 'now').mockReturnValue(1_076_000);
    expect(usePlayStore.getState().revealAnswer()).toEqual({ ok: true });
    expect(usePlayStore.getState().session?.step).toBe('answer');

    usePlayStore.setState({
      session: {
        ...usePlayStore.getState().session!,
        step: 'question',
        phase: 'questionReveal',
        timerStartedAt: 1_000_000,
      },
    });
    jest.spyOn(Date, 'now').mockReturnValue(1_090_000);

    expect(usePlayStore.getState().revealAnswer()).toEqual({
      ok: false,
      error: 'The Rumble round has ended.',
    });
    expect(usePlayStore.getState().session?.step).toBe('question');
  });

  it('rejects rumble board start when the team count is unsupported', () => {
    usePlayStore.setState({ session: null, tokens: 20, rapidFire: null });
    const store = usePlayStore.getState();
    store.setMode('rumble');
    const session = usePlayStore.getState().session!;
    const categories = session.availableCategories.slice(0, 6);

    usePlayStore.setState({
      session: {
        ...session,
        teams: session.teams.concat(
          { id: 'team_3', name: 'Team 3', playerNames: ['Player 1'], score: 0, wagersUsed: 0 },
          { id: 'team_4', name: 'Team 4', playerNames: ['Player 1'], score: 0, wagersUsed: 0 },
          { id: 'team_5', name: 'Team 5', playerNames: ['Player 1'], score: 0, wagersUsed: 0 }
        ),
        selectedCategoryIds: categories.map((category) => category.slug),
      },
    });

    const result = usePlayStore.getState().startBoard();

    expect(result).toEqual({
      ok: false,
      error: 'Rumble supports 2, 3, 4, or 6 teams.',
    });
  });

  it('hydrates token balance from storage', async () => {
    seedPlayStorage(12, null);

    await usePlayStore.getState().hydrate();

    expect(usePlayStore.getState().tokens).toBe(12);
    expect(usePlayStore.getState().session).toBeNull();
  });

  it('hydrates draft setup from storage', async () => {
    const session = createSession({
      step: 'team-setup',
      phase: 'lobby',
      selectedCategoryIds: ['science', 'history'],
      teams: [
        { id: 'team_1', name: 'Gamma', playerNames: ['Gina', 'Gabe'], score: 0, wagersUsed: 0 },
        { id: 'team_2', name: 'Delta', playerNames: ['Drew'], score: 0, wagersUsed: 0 },
      ],
      config: {
        mode: 'quickPlay',
        teams: [
          { id: 'team_1', name: 'Gamma', playerNames: ['Gina', 'Gabe'] },
          { id: 'team_2', name: 'Delta', playerNames: ['Drew'] },
        ],
        categories: ['science', 'history'],
        contentLocaleChain: ['en'],
        quickPlayTopicCount: 2,
        hotSeatEnabled: false,
        wagerEnabled: true,
        wagersPerTeam: 4,
      },
      wagersPerTeam: 4,
      mode: 'quickPlay',
      board: [],
      currentQuestion: undefined,
      wager: null,
      bonus: { active: false, played: false, multiplier: 2 },
      scores: { team_1: 0, team_2: 0 },
      usedQuestionIds: new Set(),
    });

    seedPlayStorage(9, session);

    await usePlayStore.getState().hydrate();

    const hydrated = usePlayStore.getState().session;
    expect(usePlayStore.getState().tokens).toBe(9);
    expect(hydrated?.mode).toBe('quickPlay');
    expect(hydrated?.step).toBe('team-setup');
    expect(hydrated?.selectedCategoryIds).toEqual(['science', 'history']);
    expect(hydrated?.teams.map((team) => team.name)).toEqual(['Gamma', 'Delta']);
    expect(hydrated?.wagersPerTeam).toBe(4);
  });

  it('hydrates a started board from storage with a real set of used questions', async () => {
    const session = createSession({
      step: 'board',
      phase: 'wagerDecision',
      currentTeamId: 'team_2',
      board: [
        createQuestion({ id: 'q-board-1', canonicalKey: 'science:200:0' }),
        createQuestion({ id: 'q-board-2', canonicalKey: 'science:400:1', pointValue: 400 }),
      ],
      currentQuestion: createQuestion({ id: 'q-board-1', canonicalKey: 'science:200:0' }),
      usedQuestionIds: new Set(['q-board-1']),
      wager: {
        wageringTeamId: 'team_1',
        targetTeamId: 'team_2',
        multiplier: 2,
        question: createQuestion({ id: 'q-board-1', canonicalKey: 'science:200:0' }),
      },
      bonus: { active: true, played: true, multiplier: 2 },
      scores: { team_1: 200, team_2: 400 },
      teams: [
        { id: 'team_1', name: 'Alpha', playerNames: ['Ava'], score: 200, wagersUsed: 1 },
        { id: 'team_2', name: 'Beta', playerNames: ['Ben'], score: 400, wagersUsed: 0 },
      ],
    });

    seedPlayStorage(4, session);

    await usePlayStore.getState().hydrate();

    const hydrated = usePlayStore.getState().session;
    expect(hydrated?.step).toBe('board');
    expect(hydrated?.board.length).toBe(2);
    expect(hydrated?.scores.team_1).toBe(200);
    expect(hydrated?.currentTeamId).toBe('team_2');
    expect(hydrated?.usedQuestionIds).toBeInstanceOf(Set);
    expect(Array.from(hydrated?.usedQuestionIds ?? [])).toEqual(['q-board-1']);
  });

  it('requires the correct topic count and consumes a token when the board starts', () => {
    usePlayStore.setState({ session: null, tokens: 20, rapidFire: null });
    const store = usePlayStore.getState();
    store.setMode('classic');
    const categories = usePlayStore.getState().session?.availableCategories.slice(0, 6) ?? [];

    for (const category of categories) {
      usePlayStore.getState().toggleCategory(category.slug);
    }

    let result: { ok: boolean; error?: string } | undefined;
    result = usePlayStore.getState().startBoard();

    expect(result).toMatchObject({ ok: true });
    expect(usePlayStore.getState().tokens).toBe(10);
    expect(usePlayStore.getState().session?.step).toBe('board');
    expect(usePlayStore.getState().session?.board.length).toBeGreaterThan(0);
  });

  it('charges quick play based on the selected topic count', () => {
    for (const [topicCount, expectedTokens] of [
      [3, 15],
      [4, 13],
      [5, 12],
    ] as const) {
      usePlayStore.setState({ session: null, tokens: 20, rapidFire: null });
      usePlayStore.getState().setMode('quickPlay');
      usePlayStore.getState().setQuickPlayTopicCount(topicCount);
      const categories = usePlayStore.getState().session?.availableCategories.slice(0, topicCount) ?? [];

      for (const category of categories) {
        usePlayStore.getState().toggleCategory(category.slug);
      }

      const result = usePlayStore.getState().startBoard();

      expect(result).toMatchObject({ ok: true });
      expect(usePlayStore.getState().tokens).toBe(expectedTokens);
      expect(usePlayStore.getState().session?.selectedCategoryIds).toHaveLength(topicCount);
    }
  });

  it('only enables hot seat in classic and quick play', () => {
    for (const mode of ['classic', 'quickPlay'] as const) {
      usePlayStore.setState({ session: null, tokens: 5, rapidFire: null });
      usePlayStore.getState().setMode(mode);
      usePlayStore.getState().setHotSeatRounds(1);
      expect(usePlayStore.getState().session?.config.hotSeatEnabled).toBe(true);
      expect(usePlayStore.getState().session?.config.hotSeatRounds).toBe(1);
    }

    for (const mode of ['random', 'rumble', 'rapidFire'] as const) {
      usePlayStore.setState({ session: null, tokens: 5, rapidFire: null });
      usePlayStore.getState().setMode(mode);
      usePlayStore.getState().setHotSeatRounds(1);
      expect(usePlayStore.getState().session?.config.hotSeatEnabled).toBe(false);
      expect(usePlayStore.getState().session?.config.hotSeatRounds).toBe(0);
    }
  });

  it('starts hot seat challenges with two named players after scheduled question counts', () => {
    const board = Array.from({ length: 12 }, (_, index) =>
      createQuestion({
        id: `q-board-${index + 1}`,
        canonicalKey: `science:${index + 1}`,
        pointValue: 200,
      })
    );
    const session = createSession({
      step: 'board',
      phase: 'scoring',
      board,
      currentQuestion: board[3],
      usedQuestionIds: new Set(board.slice(0, 4).map((question) => question.id)),
      teams: [
        {
          id: 'team_1',
          name: 'Alpha',
          playerNames: ['Ava', 'Amir'],
          score: 0,
          wagersUsed: 0,
        },
        {
          id: 'team_2',
          name: 'Beta',
          playerNames: ['Bianca', 'Ben'],
          score: 0,
          wagersUsed: 0,
        },
      ],
      scores: { team_1: 0, team_2: 0 },
      config: {
        mode: 'classic',
        teams: [
          { id: 'team_1', name: 'Alpha', playerNames: ['Ava', 'Amir'] },
          { id: 'team_2', name: 'Beta', playerNames: ['Bianca', 'Ben'] },
        ],
        categories: ['science'],
        contentLocaleChain: ['en'],
        quickPlayTopicCount: 3,
        hotSeatEnabled: true,
        hotSeatRounds: 1,
        wagerEnabled: true,
        wagersPerTeam: 3,
      },
      wager: null,
      hotSeat: {
        completedQuestionCount: 3,
        challenges: [
          {
            id: 'hot-seat-team-1-round-1',
            triggerAfterQuestion: 4,
            answeringTeamId: 'team_1',
            participants: [
              { teamId: 'team_1', playerName: 'Ava' },
              { teamId: 'team_2', playerName: 'Bianca' },
            ],
            completed: false,
          },
          {
            id: 'hot-seat-team-2-round-1',
            triggerAfterQuestion: 9,
            answeringTeamId: 'team_2',
            participants: [
              { teamId: 'team_2', playerName: 'Ben' },
              { teamId: 'team_1', playerName: 'Amir' },
            ],
            completed: false,
          },
        ],
      },
    });
    usePlayStore.setState({ session, tokens: 5, rapidFire: null });

    usePlayStore.getState().continueAfterStandardQuestion();

    const hotSeat = usePlayStore.getState().session?.hotSeat;
    expect(usePlayStore.getState().session?.step).toBe('question');
    expect(usePlayStore.getState().session?.currentTeamId).toBe('team_1');
    expect(hotSeat?.activeChallenge?.participants.map((participant) => participant.playerName)).toEqual([
      'Ava',
      'Bianca',
    ]);
    expect(usePlayStore.getState().session?.currentQuestion?.id).toBeDefined();
  });

  it('persists a cleared session while keeping the token balance', async () => {
    seedPlayStorage(7, createSession());

    await usePlayStore.getState().hydrate();

    usePlayStore.getState().resetSession();

    const stored = JSON.parse(mockStorage.get(STORAGE_KEY) ?? '{}') as {
      state?: { tokens?: number; session?: unknown };
    };

    expect(stored.state?.tokens).toBe(7);
    expect(stored.state?.session).toBeNull();
    expect(usePlayStore.getState().session).toBeNull();
  });

  it('progresses a standard turn from board to answer and rotates to the next team', () => {
    usePlayStore.setState({ session: null, tokens: 20, rapidFire: null });
    const store = usePlayStore.getState();
    store.setMode('classic');
    const categories = usePlayStore.getState().session?.availableCategories.slice(0, 6) ?? [];

    for (const category of categories) {
      usePlayStore.getState().toggleCategory(category.slug);
    }
    usePlayStore.getState().startBoard();

    const session = usePlayStore.getState().session!;
    const question = session.board[0];

    usePlayStore.getState().selectQuestion(question);
    usePlayStore.getState().revealAnswer();
    usePlayStore.getState().awardStandardQuestion('team_1');
    usePlayStore.getState().continueAfterStandardQuestion();

    expect(usePlayStore.getState().session?.step).toBe('board');
    expect(usePlayStore.getState().session?.currentTeamId).toBe('team_2');
    expect(usePlayStore.getState().session?.scores.team_1).toBeGreaterThan(0);
  });

  it('lets the user switch standard-question points between teams without stacking', () => {
    usePlayStore.setState({ session: null, tokens: 20, rapidFire: null });
    const store = usePlayStore.getState();
    store.setMode('classic');
    const categories = usePlayStore.getState().session?.availableCategories.slice(0, 6) ?? [];

    for (const category of categories) {
      usePlayStore.getState().toggleCategory(category.slug);
    }
    usePlayStore.getState().startBoard();

    const question = usePlayStore.getState().session!.board[0];
    usePlayStore.getState().selectQuestion(question);
    usePlayStore.getState().revealAnswer();

    const baseline = usePlayStore.getState().session!;
    const points = baseline.currentQuestion!.pointValue;

    usePlayStore.getState().awardStandardQuestion('team_1');
    expect(usePlayStore.getState().session?.scores.team_1).toBe(baseline.scores.team_1 + points);
    expect(usePlayStore.getState().session?.scores.team_2).toBe(baseline.scores.team_2);

    usePlayStore.getState().awardStandardQuestion('team_2');
    expect(usePlayStore.getState().session?.scores.team_1).toBe(baseline.scores.team_1);
    expect(usePlayStore.getState().session?.scores.team_2).toBe(baseline.scores.team_2 + points);

    usePlayStore.getState().awardStandardQuestion(null);
    expect(usePlayStore.getState().session?.scores.team_1).toBe(baseline.scores.team_1);
    expect(usePlayStore.getState().session?.scores.team_2).toBe(baseline.scores.team_2);
    expect(usePlayStore.getState().session?.lastAwardedTeamId).toBeNull();
  });

  it('logs manual score adjustments and allows scores to go negative', () => {
    const session = createSession({
      teams: [
        { id: 'team_1', name: 'Alpha', playerNames: ['Ava'], score: 25, wagersUsed: 0 },
        { id: 'team_2', name: 'Beta', playerNames: ['Ben'], score: 0, wagersUsed: 0 },
      ],
      scores: { team_1: 25, team_2: 0 },
      step: 'board',
      phase: 'wagerDecision',
      currentQuestion: undefined,
      wager: null,
    });

    usePlayStore.setState({ session, tokens: 5, rapidFire: null });

    const store = usePlayStore.getState() as typeof usePlayStore extends { getState: () => infer T } ? T : never;
    (store as any).adjustScoreByPoints('team_1', -50, 'host correction');

    const adjusted = usePlayStore.getState().session;

    expect(adjusted?.scores.team_1).toBe(-25);
    expect(adjusted?.teams.find((team) => team.id === 'team_1')?.score).toBe(-25);
    expect(adjusted?.scoreEvents.at(-1)).toMatchObject({
      teamId: 'team_1',
      points: -50,
      reason: 'manualAdjustment',
      metadata: { note: 'host correction' },
    });
  });

  it('stores the last resolved answer and can reopen it after leaving the answer screen', () => {
    usePlayStore.setState({ session: null, tokens: 20, rapidFire: null });
    const store = usePlayStore.getState();
    store.setMode('classic');
    const categories = usePlayStore.getState().session?.availableCategories.slice(0, 6) ?? [];

    for (const category of categories) {
      usePlayStore.getState().toggleCategory(category.slug);
    }
    usePlayStore.getState().startBoard();

    const question = usePlayStore.getState().session!.board[0];
    usePlayStore.getState().selectQuestion(question);
    usePlayStore.getState().revealAnswer();
    usePlayStore.getState().awardStandardQuestion('team_1');
    usePlayStore.getState().continueAfterStandardQuestion();

    const resolved = usePlayStore.getState().session?.lastResolvedTurn;
    expect(resolved).toMatchObject({
      question: expect.objectContaining({ id: question.id }),
      awardedTeamId: 'team_1',
    });

    (usePlayStore.getState() as any).reopenLastResolvedTurn();

    expect(usePlayStore.getState().session?.step).toBe('answer');
    expect(usePlayStore.getState().session?.currentQuestion?.id).toBe(question.id);
  });

  it('rejects wagers in randomiser and rumble modes', () => {
    for (const mode of ['random', 'rumble', 'rapidFire'] as const) {
      usePlayStore.setState({ session: null, tokens: 20, rapidFire: null });
      usePlayStore.getState().ensureDraft();
      usePlayStore.getState().setMode(mode);
      expect(usePlayStore.getState().session?.config.wagerEnabled).toBe(false);

      const categories = usePlayStore.getState().session?.availableCategories.slice(0, 6) ?? [];
      for (const category of categories) {
        usePlayStore.getState().toggleCategory(category.slug);
      }
      usePlayStore.getState().startBoard();

      const firstQuestion = usePlayStore.getState().session!.board[0];
      usePlayStore.getState().selectQuestion(firstQuestion);
      usePlayStore.getState().revealAnswer();
      usePlayStore.getState().awardStandardQuestion('team_1');

      let result: { ok: boolean; error?: string } | undefined;
      result = usePlayStore.getState().initiateWager();
      expect(result).toMatchObject({ ok: false });
    }
  });

  it('supports the wager loop on the next team and restores turn control after resolution', () => {
    usePlayStore.setState({ session: null, tokens: 20, rapidFire: null });
    const store = usePlayStore.getState();
    store.setMode('classic');
    const categories = usePlayStore.getState().session?.availableCategories.slice(0, 6) ?? [];

    for (const category of categories) {
      usePlayStore.getState().toggleCategory(category.slug);
    }
    usePlayStore.getState().startBoard();

    const firstQuestion = usePlayStore.getState().session!.board[0];

    usePlayStore.getState().selectQuestion(firstQuestion);
    usePlayStore.getState().revealAnswer();
    usePlayStore.getState().awardStandardQuestion('team_1');

    let result: { ok: boolean; error?: string } | undefined;
    result = usePlayStore.getState().initiateWager();

    expect(result).toMatchObject({ ok: true });
    expect(usePlayStore.getState().session?.currentTeamId).toBe('team_2');
    expect(usePlayStore.getState().session?.wager?.wageringTeamId).toBe('team_1');

    usePlayStore.getState().confirmRandomWagerQuestion();
    usePlayStore.getState().resolveWager(false);

    expect(usePlayStore.getState().session?.wager).toBeNull();
    expect(usePlayStore.getState().session?.currentTeamId).toBe('team_1');
  });

  it('ignores corrupt storage and falls back to defaults', async () => {
    mockStorage.set(STORAGE_KEY, '{not valid json');

    await usePlayStore.getState().hydrate();

    expect(usePlayStore.getState().tokens).toBe(5);
    expect(usePlayStore.getState().session).toBeNull();
  });
});
