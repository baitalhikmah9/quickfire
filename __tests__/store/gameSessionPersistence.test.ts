import { describe, expect, it } from '@jest/globals';
import type { GameConfig, GameSessionState, QuestionCard } from '@/features/shared';
import {
  deserializeGameSession,
  deserializeUsedQuestionIds,
  serializeGameSession,
  serializeUsedQuestionIds,
} from '@/store/gameSessionPersistence';

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

function createSession(): GameSessionState {
  const board = [
    createQuestion({ id: 'q-board-1', canonicalKey: 'science:200:0' }),
    createQuestion({ id: 'q-board-2', canonicalKey: 'science:400:1', pointValue: 400 }),
  ];
  const teams = [
    { id: 'team_1', name: 'Alpha', playerNames: ['Ava'], score: 200, wagersUsed: 1 },
    { id: 'team_2', name: 'Beta', playerNames: ['Ben'], score: 400, wagersUsed: 0 },
  ];
  const config: GameConfig = {
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
      team_1: 200,
      team_2: 400,
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
  };
}

describe('gameSessionPersistence', () => {
  it('serializes and restores question ids as a set', () => {
    const session = createSession();

    expect(serializeUsedQuestionIds(session.usedQuestionIds)).toEqual(['q-board-1']);

    const roundTrip = deserializeUsedQuestionIds(['q-board-1', 'q-board-2', 'q-board-1']);
    expect(roundTrip).toBeInstanceOf(Set);
    expect(Array.from(roundTrip)).toEqual(['q-board-1', 'q-board-2']);
  });

  it('preserves the full session shape through serialization', () => {
    const session = createSession();

    const serialized = serializeGameSession(session);
    const restored = deserializeGameSession(serialized);

    expect(restored).not.toBeNull();
    expect(restored?.step).toBe('board');
    expect(restored?.phase).toBe('wagerDecision');
    expect(restored?.board[0]).toMatchObject({
      id: 'q-board-1',
      categoryName: 'Science',
      pointValue: 200,
    });
    expect(restored?.currentQuestion).toMatchObject({
      id: 'q-board-1',
      pointValue: 200,
    });
    expect(restored?.wager).toMatchObject({
      wageringTeamId: 'team_2',
      targetTeamId: 'team_1',
      multiplier: 1.5,
      question: expect.objectContaining({ id: 'q-board-1' }),
    });
    expect(restored?.bonus).toMatchObject({
      active: false,
      played: true,
      question: expect.objectContaining({ id: 'q-bonus-1' }),
    });
    expect(restored?.teams[0]).toMatchObject({
      id: 'team_1',
      score: 200,
      wagersUsed: 1,
    });
    expect(restored?.scores.team_2).toBe(400);
    expect(restored?.usedQuestionIds).toBeInstanceOf(Set);
    expect(Array.from(restored?.usedQuestionIds ?? [])).toEqual(['q-board-1']);
  });

  it('returns null for malformed persisted data', () => {
    expect(deserializeGameSession({})).toBeNull();
    expect(deserializeGameSession({ step: 'board' })).toBeNull();
    expect(deserializeGameSession('not an object')).toBeNull();
  });

  it('returns null when used question ids are invalid', () => {
    const invalidSession = {
      ...serializeGameSession(createSession()),
      usedQuestionIds: ['q-board-1', 123],
    };

    expect(deserializeGameSession(invalidSession)).toBeNull();
  });
});
