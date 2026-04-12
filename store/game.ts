import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { GameConfig, GameSessionState, QuestionCard } from '@/features/shared';
import { gameReducer, type GameAction } from '@/features/gameplay/reducer';
import {
  deserializeGameSession,
  type PersistedLegacyGameState,
  serializeGameSession,
} from '@/store/gameSessionPersistence';

interface GameStore {
  session: GameSessionState | null;
  hydrate: () => Promise<void>;
  dispatch: (action: GameAction) => void;
  initSession: (config: GameConfig, seed: string, questions: QuestionCard[]) => void;
  resetSession: () => void;
}

function mergePersistedGameState(
  persistedState: unknown,
  currentState: GameStore
): GameStore {
  if (!persistedState || typeof persistedState !== 'object') {
    return currentState;
  }

  const partialState = persistedState as Partial<PersistedLegacyGameState>;

  if (partialState.session === null) {
    return {
      ...currentState,
      session: null,
    };
  }

  const nextSession =
    partialState.session === undefined
      ? currentState.session
      : deserializeGameSession(partialState.session) ?? currentState.session;

  return {
    ...currentState,
    session: nextSession,
  };
}

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      session: null,
      hydrate: async () => {
        await useGameStore.persist.rehydrate();
      },

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
    }),
    {
      name: 'doubledown-legacy-game-store-v1',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      skipHydration: true,
      partialize: (state): PersistedLegacyGameState => ({
        session: serializeGameSession(state.session),
      }),
      merge: (persistedState, currentState) =>
        mergePersistedGameState(persistedState, currentState as GameStore),
    }
  )
);

export function useGameHydration() {
  const hydrate = useGameStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);
}
