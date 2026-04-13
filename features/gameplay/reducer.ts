/**
 * Deterministic game reducer.
 * State transitions: lobby -> categorySelection -> wagerDecision -> questionReveal ->
 * deliberation -> answerLock -> stealWindow -> scoring -> overtimeCheck -> completed
 */

import type {
  GameConfig,
  GameSessionState,
  QuestionCard,
} from '@/features/shared';

export type GameAction =
  | { type: 'INIT'; config: GameConfig; seed: string; questions: QuestionCard[] }
  | { type: 'SELECT_CATEGORIES'; categoryIds: string[] }
  | { type: 'START_WAGER' }
  | { type: 'ROLL_WAGER'; questionId: string; multiplier: number }
  | { type: 'REVEAL_QUESTION'; questionId: string; question: QuestionCard }
  | { type: 'LOCK_ANSWER'; teamId: string; correct: boolean }
  | { type: 'STEAL_ATTEMPT'; teamId: string; correct: boolean }
  | { type: 'SKIP_STEAL' }
  | { type: 'USE_LIFELINE'; teamId: string; lifelineId: LifelineId }
  | { type: 'NEXT_TURN' }
  | { type: 'BAN_OVERTIME_TOPIC'; topic: string }
  | { type: 'SELECT_OVERTIME_TOPIC'; topic: string }
  | { type: 'COMPLETE' };

import { type LifelineId } from '@/features/lobby/lifelines';

function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return h / 0x7fffffff;
  };
}

function pickRandom<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function createInitialState(
  config: GameConfig,
  seed: string,
  questions: QuestionCard[]
): GameSessionState {
  const scores: Record<string, number> = {};
  const teams = config.teams.map((team) => ({
    id: team.id,
    name: team.name,
    playerNames: team.playerNames,
    score: 0,
    wagersUsed: 0,
  }));
  for (const t of teams) scores[t.id] = 0;
  return {
    id: `session_${Date.now()}`,
    mode: config.mode,
    config,
    contentLocaleChain: config.contentLocaleChain,
    step: 'board',
    phase: 'wagerDecision',
    availableCategories: [],
    selectedCategoryIds: config.categories,
    board: questions,
    teams,
    scores,
    usedQuestionIds: new Set(),
    seed,
    wagersPerTeam: config.wagersPerTeam ?? 3,
    wager: null,
    bonus: {
      active: false,
      played: false,
      multiplier: 2,
    },
    currentQuestion: undefined,
    currentTeamId: teams[0]?.id,
    scoreEvents: [],
  };
}

export function gameReducer(
  state: GameSessionState,
  action: GameAction
): GameSessionState {
  switch (action.type) {
    case 'INIT': {
      return createInitialState(action.config, action.seed, action.questions);
    }

    case 'SELECT_CATEGORIES': {
      if (state.phase !== 'categorySelection') return state;
      return { ...state, phase: 'wagerDecision', step: 'board', selectedCategoryIds: action.categoryIds };
    }

    case 'START_WAGER': {
      if (state.phase !== 'wagerDecision') return state;
      return { ...state, phase: 'wagerDecision' };
    }

    case 'ROLL_WAGER': {
      if (state.phase !== 'wagerDecision') return state;
      const q = state.currentQuestion;
      if (!q) return state;
      return {
        ...state,
        phase: 'questionReveal',
        step: 'question',
        currentQuestion: { ...q, id: action.questionId },
      };
    }

    case 'REVEAL_QUESTION': {
      return {
        ...state,
        phase: 'deliberation',
        step: 'question',
        currentQuestion: action.question,
        usedQuestionIds: new Set([...state.usedQuestionIds, action.questionId]),
      };
    }

    case 'LOCK_ANSWER': {
      if (state.phase !== 'deliberation' && state.phase !== 'answerLock') return state;
      const q = state.currentQuestion;
      if (!q || !state.currentTeamId) return state;

      const multiplier = 1; // TODO: from wager roll
      const points = action.correct ? q.pointValue * multiplier : -Math.floor(q.pointValue * 0.5);
      const newScores = { ...state.scores };
      newScores[action.teamId] = (newScores[action.teamId] ?? 0) + points;

      const otherTeamId = state.config.teams.find((t) => t.id !== action.teamId)?.id;
      if (otherTeamId && state.config.teams.length === 2) {
        return {
          ...state,
          phase: 'stealWindow',
          step: 'answer',
          scores: newScores,
          teams: state.teams.map((team) =>
            team.id === action.teamId ? { ...team, score: newScores[team.id] ?? team.score } : team
          ),
          currentTeamId: otherTeamId,
        };
      }
      return {
        ...state,
        phase: 'scoring',
        step: 'answer',
        scores: newScores,
        teams: state.teams.map((team) =>
          team.id === action.teamId ? { ...team, score: newScores[team.id] ?? team.score } : team
        ),
      };
    }

    case 'STEAL_ATTEMPT': {
      if (state.phase !== 'stealWindow') return state;
      const q = state.currentQuestion;
      if (!q) return state;

      const stealPoints = action.correct ? q.pointValue : 0;
      const newScores = { ...state.scores };
      newScores[action.teamId] = (newScores[action.teamId] ?? 0) + stealPoints;

      return {
        ...state,
        phase: 'scoring',
        scores: newScores,
        step: 'answer',
        teams: state.teams.map((team) =>
          team.id === action.teamId ? { ...team, score: newScores[team.id] ?? team.score } : team
        ),
      };
    }

    case 'SKIP_STEAL': {
      if (state.phase !== 'stealWindow') return state;
      return { ...state, phase: 'scoring', step: 'answer' };
    }

    case 'NEXT_TURN': {
      if (state.phase !== 'scoring') return state;
      const teams = state.config.teams;
      const currentIdx = teams.findIndex((t) => t.id === state.currentTeamId);
      const nextIdx = (currentIdx + 1) % teams.length;
      return {
        ...state,
        phase: 'wagerDecision',
        step: 'board',
        currentTeamId: teams[nextIdx].id,
        currentQuestion: undefined,
      };
    }

    case 'COMPLETE': {
      return { ...state, phase: 'completed', step: 'end' };
    }

    default:
      return state;
  }
}
