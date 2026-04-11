/**
 * Core domain types for Double Down.
 * Game engine, wallet, and content interfaces.
 */

import type { SupportedLocale } from '@/lib/i18n/config';

export type GameMode =
  | 'classic'
  | 'quickPlay'
  | 'random'
  | 'rumble';

export interface TeamConfig {
  id: string;
  name: string;
  playerNames?: string[];
}

export interface TeamState extends TeamConfig {
  score: number;
  wagersUsed: number;
}

export interface PlayerConfig {
  id: string;
  name: string;
  teamId: string;
}

export interface LifelineConfig {
  callAFriend: number;
  discard: number;
  answerRewards: number;
  rest?: number;
}

/** Per-team lifeline selection (e.g. 3 chosen from 4 options) */
export type LifelineId = 'callAFriend' | 'discard' | 'answerRewards' | 'rest';

export function lifelinesToConfig(ids: LifelineId[]): LifelineConfig {
  const config: LifelineConfig = { callAFriend: 0, discard: 0, answerRewards: 0 };
  for (const id of ids) {
    if (id === 'rest') config.rest = (config.rest ?? 0) + 1;
    else config[id] = (config[id] as number) + 1;
  }
  return config;
}

export interface GameConfig {
  mode: GameMode;
  teams: TeamConfig[];
  categories: string[];
  contentLocaleChain: SupportedLocale[];
  quickPlayTopicCount?: number;
  wagersPerTeam?: number;
  /** Legacy: single lifeline config. Prefer teamLifelines for per-team. */
  lifelines?: LifelineConfig;
  /** Per-team lifeline config (teamId -> config) */
  teamLifelines?: Record<string, LifelineConfig>;
  hotSeatEnabled: boolean;
  wagerEnabled: boolean;
  overtimeThreshold?: number;
  boardSize?: number;
}

export interface QuestionCard {
  id: string;
  canonicalKey: string;
  categoryId: string;
  categoryName: string;
  prompt: string;
  answer: string;
  pointValue: number;
  locale: SupportedLocale;
  resolvedFromFallback: boolean;
  used: boolean;
  /** Jeopardy board column (TriviaApp q_ / w_ parity). */
  boardSide?: 'left' | 'right';
}

export interface CategoryOption {
  id: string;
  slug: string;
  title: string;
  questionCount: number;
  resolvedLocale: SupportedLocale;
  fellBackToEnglish: boolean;
}

export interface WagerState {
  wageringTeamId: string;
  targetTeamId: string;
  multiplier: 0.5 | 1.5 | 2;
  question?: QuestionCard;
}

export interface BonusChallengeState {
  active: boolean;
  played: boolean;
  multiplier: number;
  question?: QuestionCard;
}

export type PlayRouteStep =
  | 'hub'
  | 'mode'
  | 'quick-play-length'
  | 'team-setup'
  | 'categories'
  | 'board'
  | 'question'
  | 'answer'
  | 'end';

export interface QuestionAttempt {
  questionId: string;
  teamId: string;
  correct: boolean;
  points: number;
  usedLifeline?: string;
}

export interface WagerRoll {
  multiplier: number;
  questionId: string;
}

export interface HotSeatAssignment {
  teamId: string;
  playerId: string;
}

export type TurnPhase =
  | 'lobby'
  | 'categorySelection'
  | 'wagerDecision'
  | 'questionReveal'
  | 'deliberation'
  | 'answerLock'
  | 'stealWindow'
  | 'scoring'
  | 'overtimeCheck'
  | 'completed';

export interface ScoreEvent {
  teamId: string;
  points: number;
  reason: string;
}

export interface OvertimeState {
  topics: string[];
  leadingTeamBanned?: string;
  trailingTeamSelected?: string;
}

export interface GameSessionState {
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
  usedQuestionIds: Set<string>;
  seed: string;
  wagersPerTeam: number;
  wager?: WagerState | null;
  bonus: BonusChallengeState;
  lastAwardedTeamId?: string | null;
  timerStartedAt?: number;
  overtime?: OvertimeState;
}

export interface WalletBalance {
  balance: number;
  userId: string;
}

export interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

export interface PromoRedemptionResult {
  success: boolean;
  tokensGranted?: number;
  error?: string;
}
