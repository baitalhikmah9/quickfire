import { beforeEach, describe, expect, it, jest } from '@jest/globals';
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

beforeEach(() => {
  mockStorage.clear();
  jest.clearAllMocks();
  usePlayStore.setState({ session: null, tokens: 5, rapidFire: null });
});

describe('usePlayStore', () => {
  it('branches quick play through topic length before team setup', () => {
    usePlayStore.getState().setMode('quickPlay');
    expect(usePlayStore.getState().session?.step).toBe('quick-play-length');

    usePlayStore.getState().setQuickPlayTopicCount(4);
    expect(usePlayStore.getState().session?.step).toBe('team-setup');
    expect(usePlayStore.getState().session?.config.quickPlayTopicCount).toBe(4);
  });

  it('sends rumble into team setup like classic', () => {
    usePlayStore.getState().setMode('rumble');
    expect(usePlayStore.getState().session?.step).toBe('team-setup');
    expect(usePlayStore.getState().session?.mode).toBe('rumble');
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
    const store = usePlayStore.getState();
    store.setMode('classic');
    const categories = usePlayStore.getState().session?.availableCategories.slice(0, 6) ?? [];

    for (const category of categories) {
      usePlayStore.getState().toggleCategory(category.slug);
    }

    let result: { ok: boolean; error?: string } | undefined;
    result = usePlayStore.getState().startBoard();

    expect(result).toMatchObject({ ok: true });
    expect(usePlayStore.getState().tokens).toBe(4);
    expect(usePlayStore.getState().session?.step).toBe('board');
    expect(usePlayStore.getState().session?.board.length).toBeGreaterThan(0);
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

  it('rejects wagers in randomiser and rumble modes', () => {
    for (const mode of ['random', 'rumble', 'rapidFire'] as const) {
      usePlayStore.setState({ session: null, tokens: 5, rapidFire: null });
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
