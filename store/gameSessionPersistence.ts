import { z } from 'zod';
import type {
  BonusChallengeState,
  CategoryOption,
  GameConfig,
  GameMode,
  GameSessionState,
  OvertimeState,
  PlayRouteStep,
  QuestionCard,
  TeamState,
  TurnPhase,
  WagerState,
} from '@/features/shared';
import type { SupportedLocale } from '@/lib/i18n/config';

const supportedLocaleSchema = z.enum([
  'en',
  'ar',
  'es',
  'fr',
  'ur',
  'hi',
  'zh-Hans',
  'pt-BR',
  'ru',
  'id',
  'bn',
]);

const gameModeSchema = z.enum(['classic', 'quickPlay', 'random', 'rumble']);
const playRouteStepSchema = z.enum([
  'hub',
  'mode',
  'quick-play-length',
  'team-setup',
  'categories',
  'board',
  'question',
  'answer',
  'end',
]);
const turnPhaseSchema = z.enum([
  'lobby',
  'categorySelection',
  'wagerDecision',
  'questionReveal',
  'deliberation',
  'answerLock',
  'stealWindow',
  'scoring',
  'overtimeCheck',
  'completed',
]);

const questionCardSchema = z.object({
  id: z.string().min(1),
  canonicalKey: z.string().min(1),
  categoryId: z.string().min(1),
  categoryName: z.string().min(1),
  prompt: z.string(),
  answer: z.string(),
  pointValue: z.number(),
  locale: supportedLocaleSchema,
  resolvedFromFallback: z.boolean(),
  used: z.boolean(),
  boardSide: z.enum(['left', 'right']).optional(),
});

const categoryOptionSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string(),
  questionCount: z.number(),
  resolvedLocale: supportedLocaleSchema,
  fellBackToEnglish: z.boolean(),
});

const teamConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  playerNames: z.array(z.string()).optional(),
});

const teamStateSchema = teamConfigSchema.extend({
  score: z.number(),
  wagersUsed: z.number(),
});

const lifelineConfigSchema = z.object({
  callAFriend: z.number(),
  discard: z.number(),
  answerRewards: z.number(),
  rest: z.number().optional(),
});

const gameConfigSchema = z.object({
  mode: gameModeSchema,
  teams: z.array(teamConfigSchema),
  categories: z.array(z.string()),
  contentLocaleChain: z.array(supportedLocaleSchema),
  quickPlayTopicCount: z.number().optional(),
  wagersPerTeam: z.number().optional(),
  lifelines: lifelineConfigSchema.optional(),
  teamLifelines: z.record(lifelineConfigSchema).optional(),
  hotSeatEnabled: z.boolean(),
  wagerEnabled: z.boolean(),
  overtimeThreshold: z.number().optional(),
  boardSize: z.number().optional(),
});

const wagerStateSchema = z.object({
  wageringTeamId: z.string().min(1),
  targetTeamId: z.string().min(1),
  multiplier: z.union([z.literal(0.5), z.literal(1.5), z.literal(2)]),
  question: questionCardSchema.optional(),
});

const bonusChallengeSchema = z.object({
  active: z.boolean(),
  played: z.boolean(),
  multiplier: z.number(),
  question: questionCardSchema.optional(),
});

const overtimeStateSchema = z.object({
  topics: z.array(z.string()),
  leadingTeamBanned: z.string().optional(),
  trailingTeamSelected: z.string().optional(),
});

const persistedGameSessionSchema = z.object({
  id: z.string().min(1),
  mode: gameModeSchema,
  config: gameConfigSchema,
  contentLocaleChain: z.array(supportedLocaleSchema),
  step: playRouteStepSchema,
  phase: turnPhaseSchema,
  availableCategories: z.array(categoryOptionSchema),
  selectedCategoryIds: z.array(z.string()),
  currentTeamId: z.string().optional(),
  currentQuestion: questionCardSchema.optional(),
  board: z.array(questionCardSchema),
  teams: z.array(teamStateSchema),
  scores: z.record(z.number()),
  usedQuestionIds: z.array(z.string()),
  seed: z.string().min(1),
  wagersPerTeam: z.number(),
  wager: wagerStateSchema.nullable().optional(),
  bonus: bonusChallengeSchema,
  lastAwardedTeamId: z.string().nullable().optional(),
  timerStartedAt: z.number().optional(),
  overtime: overtimeStateSchema.optional(),
});

export interface PersistedGameSessionState {
  id: string;
  mode: GameMode;
  config: GameConfig;
  contentLocaleChain: SupportedLocale[];
  step: PlayRouteStep;
  phase: TurnPhase;
  availableCategories: CategoryOption[];
  selectedCategoryIds: string[];
  currentTeamId?: string;
  currentQuestion?: QuestionCard;
  board: QuestionCard[];
  teams: TeamState[];
  scores: Record<string, number>;
  usedQuestionIds: string[];
  seed: string;
  wagersPerTeam: number;
  wager?: WagerState | null;
  bonus: BonusChallengeState;
  lastAwardedTeamId?: string | null;
  timerStartedAt?: number;
  overtime?: OvertimeState;
}

export interface PersistedPlayState {
  tokens: number;
  session: PersistedGameSessionState | null;
}

export interface PersistedLegacyGameState {
  session: PersistedGameSessionState | null;
}

export function serializeUsedQuestionIds(usedQuestionIds: Set<string>): string[] {
  return Array.from(usedQuestionIds);
}

export function deserializeUsedQuestionIds(ids: unknown): Set<string> {
  if (!Array.isArray(ids)) {
    return new Set();
  }

  return new Set(ids.filter((id): id is string => typeof id === 'string' && id.length > 0));
}

function serializeQuestionCard(question: QuestionCard): QuestionCard {
  return { ...question };
}

function serializeTeamState(team: TeamState): TeamState {
  return { ...team, playerNames: team.playerNames ? [...team.playerNames] : team.playerNames };
}

function serializeCategoryOption(category: CategoryOption): CategoryOption {
  return { ...category };
}

function serializeGameConfig(config: GameConfig): GameConfig {
  return {
    ...config,
    teams: config.teams.map((team) => ({ ...team, playerNames: team.playerNames ? [...team.playerNames] : team.playerNames })),
    categories: [...config.categories],
    contentLocaleChain: [...config.contentLocaleChain],
    teamLifelines: config.teamLifelines
      ? Object.fromEntries(
          Object.entries(config.teamLifelines).map(([teamId, lifelineConfig]) => [
            teamId,
            { ...lifelineConfig },
          ])
        )
      : config.teamLifelines,
    lifelines: config.lifelines ? { ...config.lifelines } : config.lifelines,
  };
}

export function serializeGameSession(
  session: GameSessionState | null
): PersistedGameSessionState | null {
  if (!session) {
    return null;
  }

  return {
    ...session,
    config: serializeGameConfig(session.config),
    contentLocaleChain: [...session.contentLocaleChain],
    availableCategories: session.availableCategories.map(serializeCategoryOption),
    selectedCategoryIds: [...session.selectedCategoryIds],
    currentQuestion: session.currentQuestion ? serializeQuestionCard(session.currentQuestion) : session.currentQuestion,
    board: session.board.map(serializeQuestionCard),
    teams: session.teams.map(serializeTeamState),
    scores: { ...session.scores },
    usedQuestionIds: serializeUsedQuestionIds(session.usedQuestionIds),
    wager: session.wager
      ? {
          ...session.wager,
          question: session.wager.question ? serializeQuestionCard(session.wager.question) : session.wager.question,
        }
      : session.wager,
    bonus: {
      ...session.bonus,
      question: session.bonus.question ? serializeQuestionCard(session.bonus.question) : session.bonus.question,
    },
    overtime: session.overtime ? { ...session.overtime, topics: [...session.overtime.topics] } : session.overtime,
  };
}

export function deserializeGameSession(
  value: unknown
): GameSessionState | null {
  const parsed = persistedGameSessionSchema.safeParse(value);

  if (!parsed.success) {
    return null;
  }

  const session = parsed.data;

  return {
    ...session,
    contentLocaleChain: session.contentLocaleChain as SupportedLocale[],
    availableCategories: session.availableCategories as CategoryOption[],
    currentQuestion: session.currentQuestion as QuestionCard | undefined,
    board: session.board as QuestionCard[],
    teams: session.teams as TeamState[],
    usedQuestionIds: deserializeUsedQuestionIds(session.usedQuestionIds),
    wager: session.wager as WagerState | null | undefined,
    bonus: session.bonus as BonusChallengeState,
    overtime: session.overtime as OvertimeState | undefined,
  };
}
