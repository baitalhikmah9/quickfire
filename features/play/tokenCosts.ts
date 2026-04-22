import type { GameMode } from '@/features/shared';

export const DEFAULT_GAME_TOKEN_COST = 10;

export const QUICK_PLAY_TOKEN_COST_BY_TOPIC_COUNT = {
  3: 5,
  4: 7,
  5: 8,
} as const;

export type QuickPlayTopicCount = keyof typeof QUICK_PLAY_TOKEN_COST_BY_TOPIC_COUNT;

export const QUICK_PLAY_TOPIC_OPTIONS = Object.entries(QUICK_PLAY_TOKEN_COST_BY_TOPIC_COUNT).map(
  ([topicCount, tokenCost]) => ({
    topicCount: Number(topicCount) as QuickPlayTopicCount,
    tokenCost,
  })
);

export const QUICK_PLAY_TOKEN_COST_RANGE_LABEL = '5-8';

export function normalizeQuickPlayTopicCount(count: number | undefined): QuickPlayTopicCount {
  if (count === 4 || count === 5) return count;
  return 3;
}

export function getGameTokenCost(
  mode: GameMode,
  quickPlayTopicCount?: number
): number {
  if (mode !== 'quickPlay') return DEFAULT_GAME_TOKEN_COST;

  return QUICK_PLAY_TOKEN_COST_BY_TOPIC_COUNT[
    normalizeQuickPlayTopicCount(quickPlayTopicCount)
  ];
}

export function getHomeModeTokenCostLabel(mode: GameMode): string {
  return mode === 'quickPlay'
    ? QUICK_PLAY_TOKEN_COST_RANGE_LABEL
    : String(DEFAULT_GAME_TOKEN_COST);
}
