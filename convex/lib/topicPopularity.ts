/** Pure aggregation for admin topic-popularity reports. */

export type TopicSelectionRow = {
  mode: string;
  categorySlugs: string[];
  selectedAt: number;
};

export type TopicPopularityRow = {
  slug: string;
  /** Boards that locked in this topic. */
  selectionCount: number;
  /** % of boards that included this topic (0-100). */
  boardSharePct: number;
  /** % of all topic lock-ins that were this topic (0-100). */
  pickSharePct: number;
};

export type TopicPopularityReport = {
  boardCount: number;
  /** Total topic lock-ins across boards (sum of unique topics per board). */
  pickCount: number;
  topics: TopicPopularityRow[];
};

export function aggregateTopicPopularity(
  rows: TopicSelectionRow[],
  opts?: { mode?: string; sinceMs?: number }
): TopicPopularityReport {
  const sinceMs = opts?.sinceMs ?? 0;
  const mode = opts?.mode;
  const filtered = rows.filter((row) => {
    if (row.selectedAt < sinceMs) return false;
    if (mode && row.mode !== mode) return false;
    return true;
  });

  const boardCount = filtered.length;
  const counts = new Map<string, number>();
  let pickCount = 0;
  for (const row of filtered) {
    // Count each topic once per board even if the client sent duplicates.
    const unique = new Set(row.categorySlugs.filter((slug) => slug.length > 0));
    pickCount += unique.size;
    for (const slug of unique) {
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
  }

  const topics = [...counts.entries()]
    .map(([slug, selectionCount]) => ({
      slug,
      selectionCount,
      boardSharePct: boardCount === 0 ? 0 : (selectionCount / boardCount) * 100,
      pickSharePct: pickCount === 0 ? 0 : (selectionCount / pickCount) * 100,
    }))
    .sort((a, b) => {
      if (b.selectionCount !== a.selectionCount) {
        return b.selectionCount - a.selectionCount;
      }
      return a.slug.localeCompare(b.slug);
    });

  return { boardCount, pickCount, topics };
}
