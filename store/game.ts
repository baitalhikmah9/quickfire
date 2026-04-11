import { create } from 'zustand';
import type { GameSessionState, GameConfig, QuestionCard } from '@/features/shared';
import { gameReducer, type GameAction } from '@/features/gameplay/reducer';

interface GameStore {
  session: GameSessionState | null;
  dispatch: (action: GameAction) => void;
  initSession: (config: GameConfig, seed: string, questions: QuestionCard[]) => void;
  resetSession: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  session: null,

  dispatch: (action) => {
    set((state) => {
      if (!state.session) return state;
      return {
        session: gameReducer(state.session, action),
      };
    });
  },

  initSession: (config, seed, questions) => {
    const initialState: GameSessionState = {
      id: '',
      mode: config.mode,
      config,
      contentLocaleChain: config.contentLocaleChain,
      step: 'hub',
      phase: 'lobby',
      availableCategories: [],
      selectedCategoryIds: [],
      board: [],
      teams: config.teams.map((team) => ({
        id: team.id,
        name: team.name,
        playerNames: team.playerNames,
        score: 0,
        wagersUsed: 0,
      })),
      scores: {},
      usedQuestionIds: new Set(),
      seed: '',
      wagersPerTeam: config.wagersPerTeam ?? 3,
      wager: null,
      bonus: {
        active: false,
        played: false,
        multiplier: 2,
      },
    };
    set({
      session: gameReducer(initialState, { type: 'INIT', config, seed, questions }),
    });
  },

  resetSession: () => set({ session: null }),
}));
