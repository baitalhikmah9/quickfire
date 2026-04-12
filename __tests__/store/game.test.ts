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

const { useGameStore } = require('@/store/game') as typeof import('@/store/game');

const STORAGE_KEY = 'doubledown-legacy-game-store-v1';

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

function createConfig(): GameConfig {
  return {
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
    wagersPerTeam: 3,
    boardSize: 36,
  };
}

function createSession(): GameSessionState {
  const question = createQuestion({ id: 'q-board-1', canonicalKey: 'science:200:0' });

  return {
    id: 'legacy-session-1',
    mode: 'classic',
    config: createConfig(),
    contentLocaleChain: ['en'],
    step: 'board',
    phase: 'wagerDecision',
    availableCategories: [],
    selectedCategoryIds: ['science'],
    currentTeamId: 'team_1',
    currentQuestion: question,
    board: [question],
    teams: [
      { id: 'team_1', name: 'Alpha', playerNames: ['Ava'], score: 200, wagersUsed: 0 },
      { id: 'team_2', name: 'Beta', playerNames: ['Ben'], score: 100, wagersUsed: 0 },
    ],
    scores: { team_1: 200, team_2: 100 },
    usedQuestionIds: new Set(['q-board-1']),
    seed: 'seed-123',
    wagersPerTeam: 3,
    wager: null,
    bonus: {
      active: false,
      played: false,
      multiplier: 2,
    },
  };
}

function seedLegacyStorage(session: GameSessionState | null) {
  mockStorage.set(
    STORAGE_KEY,
    JSON.stringify({
      state: {
        session: serializeGameSession(session),
      },
      version: 1,
    })
  );
}

beforeEach(() => {
  mockStorage.clear();
  jest.clearAllMocks();
  useGameStore.setState({ session: null });
});

describe('useGameStore', () => {
  it('hydrates a legacy session from storage', async () => {
    seedLegacyStorage(createSession());

    await useGameStore.getState().hydrate();

    const hydrated = useGameStore.getState().session;
    expect(hydrated?.step).toBe('board');
    expect(hydrated?.currentTeamId).toBe('team_1');
    expect(hydrated?.usedQuestionIds).toBeInstanceOf(Set);
  });

  it('dispatch still works after hydration', async () => {
    seedLegacyStorage(createSession());

    await useGameStore.getState().hydrate();

    useGameStore.getState().dispatch({
      type: 'REVEAL_QUESTION',
      questionId: 'q-board-1',
      question: createQuestion({ id: 'q-board-1', canonicalKey: 'science:200:0' }),
    });

    expect(useGameStore.getState().session?.phase).toBe('deliberation');
    expect(Array.from(useGameStore.getState().session?.usedQuestionIds ?? [])).toEqual(['q-board-1']);
  });

  it('clears the persisted legacy session on reset', async () => {
    seedLegacyStorage(createSession());

    await useGameStore.getState().hydrate();

    useGameStore.getState().resetSession();

    const stored = JSON.parse(mockStorage.get(STORAGE_KEY) ?? '{}') as {
      state?: { session?: unknown };
    };

    expect(stored.state?.session).toBeNull();
    expect(useGameStore.getState().session).toBeNull();
  });
});
