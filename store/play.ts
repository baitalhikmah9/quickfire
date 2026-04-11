import { create } from 'zustand';
import { getBonusQuestion, getModeCategoryCount, getPlayableCategories, getRandomRemainingQuestion, buildBoard } from '@/features/play/data';
import type {
  BonusChallengeState,
  CategoryOption,
  GameConfig,
  GameMode,
  GameSessionState,
  QuestionCard,
  TeamConfig,
  TeamState,
  WagerState,
} from '@/features/shared';
import { getResolvedContentLocaleChain, type SupportedLocale } from '@/lib/i18n/config';
import { useLocaleStore } from '@/store/locale';

const DEFAULT_TEAMS: TeamState[] = [
  { id: 'team_1', name: 'Team 1', playerNames: ['Player 1'], score: 0, wagersUsed: 0 },
  { id: 'team_2', name: 'Team 2', playerNames: ['Player 1'], score: 0, wagersUsed: 0 },
];

const DEFAULT_BONUS: BonusChallengeState = {
  active: false,
  played: false,
  multiplier: 2,
};

function buildScores(teams: TeamState[]): Record<string, number> {
  return teams.reduce<Record<string, number>>((scores, team) => {
    scores[team.id] = team.score;
    return scores;
  }, {});
}

function getDefaultConfig(
  mode: GameMode = 'classic',
  teams: TeamState[] = DEFAULT_TEAMS,
  contentLocaleChain: SupportedLocale[] = ['en']
): GameConfig {
  const teamConfigs: TeamConfig[] = teams.map(({ id, name, playerNames }) => ({ id, name, playerNames }));
  return {
    mode,
    teams: teamConfigs,
    categories: [],
    contentLocaleChain,
    quickPlayTopicCount: 3,
    hotSeatEnabled: false,
    wagerEnabled: mode !== 'random' && mode !== 'rumble',
    wagersPerTeam: 3,
  };
}

function createDraftSession(): GameSessionState {
  const contentLocaleChain = getResolvedContentLocaleChain(
    useLocaleStore.getState().contentLocales
  );
  const teams = DEFAULT_TEAMS.map((team) => ({ ...team, playerNames: [...(team.playerNames ?? [])] }));
  return {
    id: `play_${Date.now()}`,
    mode: 'classic',
    config: getDefaultConfig('classic', teams, contentLocaleChain),
    contentLocaleChain,
    step: 'hub',
    phase: 'lobby',
    availableCategories: getPlayableCategories(contentLocaleChain),
    selectedCategoryIds: [],
    board: [],
    teams,
    scores: buildScores(teams),
    usedQuestionIds: new Set(),
    seed: `seed_${Date.now()}`,
    wagersPerTeam: 3,
    wager: null,
    bonus: { ...DEFAULT_BONUS },
  };
}

function getOtherTeamId(teams: TeamState[], teamId?: string): string | undefined {
  return teams.find((team) => team.id !== teamId)?.id;
}

function syncConfig(session: GameSessionState): GameConfig {
  return {
    ...session.config,
    mode: session.mode,
    teams: session.teams.map(({ id, name, playerNames }) => ({ id, name, playerNames })),
    categories: session.selectedCategoryIds,
    contentLocaleChain: session.contentLocaleChain,
    quickPlayTopicCount: session.config.quickPlayTopicCount,
    wagerEnabled: session.mode !== 'random' && session.mode !== 'rumble',
    wagersPerTeam: session.wagersPerTeam,
  };
}

function withScores(teams: TeamState[]): { teams: TeamState[]; scores: Record<string, number> } {
  return {
    teams,
    scores: buildScores(teams),
  };
}

interface PlayStore {
  tokens: number;
  session: GameSessionState | null;
  ensureDraft: () => void;
  resetSession: () => void;
  grantTokens: (amount: number) => void;
  setMode: (mode: GameMode) => void;
  setQuickPlayTopicCount: (count: number) => void;
  updateTeamName: (teamId: string, name: string) => void;
  addTeamMember: (teamId: string) => void;
  removeTeamMember: (teamId: string) => void;
  updateTeamMemberName: (teamId: string, index: number, name: string) => void;
  setWagersPerTeam: (count: number) => void;
  toggleCategory: (slug: string) => void;
  startBoard: () => { ok: boolean; error?: string };
  selectQuestion: (question: QuestionCard) => void;
  revealAnswer: () => void;
  awardStandardQuestion: (teamId: string | null) => void;
  continueAfterStandardQuestion: () => void;
  initiateWager: () => { ok: boolean; error?: string };
  confirmRandomWagerQuestion: () => void;
  resolveWager: (correct: boolean) => void;
}

export const usePlayStore = create<PlayStore>((set, get) => ({
  tokens: 5,
  session: null,

  ensureDraft: () => {
    if (!get().session) {
      set({ session: createDraftSession() });
    }
  },

  resetSession: () => set({ session: null }),

  grantTokens: (amount) => set((state) => ({ tokens: Math.max(0, state.tokens + amount) })),

  setMode: (mode) =>
    set((state) => {
      const session = state.session ?? createDraftSession();
      const nextStep = mode === 'quickPlay' ? 'quick-play-length' : 'team-setup';
      const nextSession: GameSessionState = {
        ...session,
        id: session.id || `play_${Date.now()}`,
        mode,
        contentLocaleChain: session.contentLocaleChain,
        step: nextStep,
        phase: 'lobby',
        wager: null,
        bonus: { ...DEFAULT_BONUS },
      };
      nextSession.config = syncConfig({
        ...nextSession,
        config: {
          ...nextSession.config,
          mode,
          wagerEnabled: mode !== 'random' && mode !== 'rumble',
        },
      });
      return { session: nextSession };
    }),

  setQuickPlayTopicCount: (count) =>
    set((state) => {
      const base = state.session ?? createDraftSession();
      const session: GameSessionState = {
        ...base,
        mode: 'quickPlay',
        step: 'team-setup',
        config: {
          ...base.config,
          quickPlayTopicCount: count,
        },
      };
      session.config = syncConfig(session);
      return { session };
    }),

  updateTeamName: (teamId, name) =>
    set((state) => {
      if (!state.session) return state;
      const teams = state.session.teams.map((team) =>
        team.id === teamId ? { ...team, name } : team
      );
      const session = {
        ...state.session,
        ...withScores(teams),
      };
      session.config = syncConfig(session);
      return { session };
    }),

  addTeamMember: (teamId) =>
    set((state) => {
      if (!state.session) return state;
      const teams = state.session.teams.map((team) =>
        team.id === teamId
          ? {
              ...team,
              playerNames: [...(team.playerNames ?? []), `Player ${(team.playerNames?.length ?? 0) + 1}`],
            }
          : team
      );
      const session = { ...state.session, ...withScores(teams) };
      session.config = syncConfig(session);
      return { session };
    }),

  removeTeamMember: (teamId) =>
    set((state) => {
      if (!state.session) return state;
      const teams = state.session.teams.map((team) =>
        team.id === teamId
          ? {
              ...team,
              playerNames:
                (team.playerNames?.length ?? 0) > 1
                  ? team.playerNames?.slice(0, -1)
                  : team.playerNames,
            }
          : team
      );
      const session = { ...state.session, ...withScores(teams) };
      session.config = syncConfig(session);
      return { session };
    }),

  updateTeamMemberName: (teamId, index, name) =>
    set((state) => {
      if (!state.session) return state;
      const teams = state.session.teams.map((team) => {
        if (team.id !== teamId) return team;
        const nextPlayers = [...(team.playerNames ?? [])];
        nextPlayers[index] = name;
        return { ...team, playerNames: nextPlayers };
      });
      const session = { ...state.session, ...withScores(teams) };
      session.config = syncConfig(session);
      return { session };
    }),

  setWagersPerTeam: (count) =>
    set((state) => {
      if (!state.session) return state;
      const session = {
        ...state.session,
        wagersPerTeam: Math.max(0, Math.min(9, count)),
      };
      session.config = syncConfig(session);
      return { session };
    }),

  toggleCategory: (slug) =>
    set((state) => {
      if (!state.session) return state;
      const max = getModeCategoryCount(
        state.session.mode as 'classic' | 'quickPlay' | 'random',
        state.session.config.quickPlayTopicCount ?? 3
      );
      const isSelected = state.session.selectedCategoryIds.includes(slug);
      const selectedCategoryIds = isSelected
        ? state.session.selectedCategoryIds.filter((item) => item !== slug)
        : state.session.selectedCategoryIds.length < max
          ? [...state.session.selectedCategoryIds, slug]
          : state.session.selectedCategoryIds;
      const session = {
        ...state.session,
        step: 'categories' as const,
        selectedCategoryIds,
      };
      session.config = syncConfig(session);
      return { session };
    }),

  startBoard: () => {
    const state = get();
    const session = state.session;
    if (!session) return { ok: false, error: 'No session found.' };
    const required = getModeCategoryCount(
      session.mode as 'classic' | 'quickPlay' | 'random',
      session.config.quickPlayTopicCount ?? 3
    );
    if (session.selectedCategoryIds.length !== required) {
      return { ok: false, error: `Select ${required} topics to continue.` };
    }
    if (state.tokens <= 0) {
      return { ok: false, error: 'You need more tokens to start a new game.' };
    }
    const teams = session.teams.map((team) => ({ ...team, score: 0, wagersUsed: 0 }));
    const board = buildBoard(
      session.selectedCategoryIds,
      session.contentLocaleChain
    );
    const nextSession: GameSessionState = {
      ...session,
      step: 'board',
      phase: 'wagerDecision',
      board,
      ...withScores(teams),
      usedQuestionIds: new Set(),
      currentQuestion: undefined,
      currentTeamId: teams[0]?.id,
      wager: null,
      bonus: { ...DEFAULT_BONUS },
      lastAwardedTeamId: undefined,
      seed: `seed_${Date.now()}`,
    };
    nextSession.config = syncConfig(nextSession);
    set({
      tokens: state.tokens - 1,
      session: nextSession,
    });
    return { ok: true };
  },

  selectQuestion: (question) =>
    set((state) => {
      if (!state.session) return state;
      const usedQuestionIds = new Set(state.session.usedQuestionIds);
      usedQuestionIds.add(question.id);
      return {
        session: {
          ...state.session,
          currentQuestion: question,
          usedQuestionIds,
          step: 'question',
          phase: 'questionReveal',
          timerStartedAt: Date.now(),
        },
      };
    }),

  revealAnswer: () =>
    set((state) => {
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          step: 'answer',
          phase: 'answerLock',
        },
      };
    }),

  awardStandardQuestion: (teamId) =>
    set((state) => {
      if (!state.session?.currentQuestion) return state;
      const multiplier = state.session.bonus.active ? state.session.bonus.multiplier : 1;
      const points = state.session.currentQuestion.pointValue * multiplier;
      const teams = state.session.teams.map((team) =>
        team.id === teamId ? { ...team, score: team.score + points } : team
      );
      return {
        session: {
          ...state.session,
          ...withScores(teams),
          phase: 'scoring',
          lastAwardedTeamId: teamId,
        },
      };
    }),

  continueAfterStandardQuestion: () =>
    set((state) => {
      const session = state.session;
      if (!session) return state;
      const remaining = session.board.filter(
        (question) => !session.usedQuestionIds.has(question.id)
      );

      if (!remaining.length) {
        const scores = Object.values(session.scores);
        const scoreGap = scores.length >= 2 ? Math.abs(scores[0] - scores[1]) : 0;
        if (!session.bonus.played && scoreGap <= 400) {
          const bonusQuestion = getBonusQuestion(
            session.selectedCategoryIds,
            session.usedQuestionIds,
            session.contentLocaleChain
          );
          if (bonusQuestion) {
            const usedQuestionIds = new Set(session.usedQuestionIds);
            usedQuestionIds.add(bonusQuestion.id);
            return {
              session: {
                ...session,
                currentQuestion: bonusQuestion,
                usedQuestionIds,
                bonus: {
                  active: true,
                  played: true,
                  multiplier: 2,
                  question: bonusQuestion,
                },
                step: 'question',
                phase: 'questionReveal',
                timerStartedAt: Date.now(),
                lastAwardedTeamId: undefined,
              },
            };
          }
        }

        return {
          session: {
            ...session,
            currentQuestion: undefined,
            wager: null,
            bonus: { ...session.bonus, active: false },
            step: 'end',
            phase: 'completed',
          },
        };
      }

      const currentIndex = session.teams.findIndex((team) => team.id === session.currentTeamId);
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % session.teams.length : 0;
      return {
        session: {
          ...session,
          step: 'board',
          phase: 'wagerDecision',
          currentQuestion: undefined,
          currentTeamId: session.teams[nextIndex]?.id,
          wager: null,
          bonus: { ...session.bonus, active: false },
          lastAwardedTeamId: undefined,
        },
      };
    }),

  initiateWager: () => {
    const state = get();
    const session = state.session;
    if (!session?.config.wagerEnabled) {
      return { ok: false, error: 'Wagers are not used in this mode.' };
    }
    if (!session?.currentTeamId) return { ok: false, error: 'No active team available.' };
    const wageringTeam = session.teams.find((team) => team.id === session.currentTeamId);
    const targetTeamId = getOtherTeamId(session.teams, session.currentTeamId);
    if (!wageringTeam || !targetTeamId) return { ok: false, error: 'Wagers require two teams.' };
    if (wageringTeam.wagersUsed >= session.wagersPerTeam) {
      return { ok: false, error: `${wageringTeam.name} has used all wagers.` };
    }

    const multipliers: WagerState['multiplier'][] = [0.5, 1.5, 2];
    const multiplier = multipliers[Math.floor(Math.random() * multipliers.length)];
    const teams = session.teams.map((team) =>
      team.id === wageringTeam.id ? { ...team, wagersUsed: team.wagersUsed + 1 } : team
    );
    set({
      session: {
        ...session,
        ...withScores(teams),
        step: 'board',
        phase: 'wagerDecision',
        currentQuestion: undefined,
        currentTeamId: targetTeamId,
        wager: {
          wageringTeamId: wageringTeam.id,
          targetTeamId,
          multiplier,
        },
        lastAwardedTeamId: undefined,
      },
    });
    return { ok: true };
  },

  confirmRandomWagerQuestion: () =>
    set((state) => {
      const session = state.session;
      if (!session?.wager || session.wager.question) return state;
      const question = getRandomRemainingQuestion(session.board, session.usedQuestionIds);
      if (!question) {
        return {
          session: {
            ...session,
            step: 'end',
            phase: 'completed',
          },
        };
      }
      const usedQuestionIds = new Set(session.usedQuestionIds);
      usedQuestionIds.add(question.id);
      return {
        session: {
          ...session,
          currentQuestion: question,
          usedQuestionIds,
          step: 'question',
          phase: 'questionReveal',
          timerStartedAt: Date.now(),
          wager: {
            ...session.wager,
            question,
          },
        },
      };
    }),

  resolveWager: (correct) =>
    set((state) => {
      const session = state.session;
      if (!session?.wager?.question) return state;
      const { wager, teams } = session;
      const basePoints = wager.question!.pointValue;
      const delta =
        wager.multiplier === 0.5
          ? correct ? basePoints * 0.5 : -basePoints * 0.5
          : wager.multiplier === 1.5
            ? correct ? basePoints * 1.5 : -basePoints
            : correct ? basePoints * 2 : -basePoints * 1.5;

      const nextTeams = teams.map((team) =>
        team.id === wager.targetTeamId ? { ...team, score: team.score + Math.round(delta) } : team
      );
      const remaining = session.board.filter(
        (question) => !session.usedQuestionIds.has(question.id)
      );

      return {
        session: {
          ...session,
          ...withScores(nextTeams),
          currentQuestion: undefined,
          wager: null,
          bonus: { ...session.bonus, active: false },
          currentTeamId: wager.wageringTeamId,
          step: remaining.length ? 'board' : 'end',
          phase: remaining.length ? 'wagerDecision' : 'completed',
          lastAwardedTeamId: wager.targetTeamId,
        },
      };
    }),
}));
