import { describe, expect, it } from '@jest/globals';
import { aggregateTopicPopularity } from '@/convex/lib/topicPopularity';
import { recordTopicSelection } from '@/convex/sessions';
import { getConvexHandler } from '../helpers/convexHandler';
import { createConvexTestCtx, userDoc } from '../helpers/convexTestCtx';

describe('aggregateTopicPopularity', () => {
  it('counts each topic once per board and sorts by popularity', () => {
    const report = aggregateTopicPopularity([
      {
        mode: 'classic',
        categorySlugs: ['harry-potter', 'nba', 'harry-potter'],
        selectedAt: 100,
      },
      {
        mode: 'rumble',
        categorySlugs: ['nba', 'marvel'],
        selectedAt: 200,
      },
      {
        mode: 'classic',
        categorySlugs: ['nba'],
        selectedAt: 300,
      },
    ]);

    // 3 boards, 5 unique lock-ins total (2 + 2 + 1 after de-dupe).
    expect(report.boardCount).toBe(3);
    expect(report.pickCount).toBe(5);
    expect(report.topics.map((t) => t.slug)).toEqual(['nba', 'harry-potter', 'marvel']);
    expect(report.topics[0]).toMatchObject({ slug: 'nba', selectionCount: 3, boardSharePct: 100 });
    expect(report.topics[0]?.pickSharePct).toBeCloseTo(60, 5);
    expect(report.topics[1]?.selectionCount).toBe(1);
    expect(report.topics[1]?.boardSharePct).toBeCloseTo(33.333, 2);
    expect(report.topics[1]?.pickSharePct).toBeCloseTo(20, 5);
    expect(report.topics[2]?.selectionCount).toBe(1);
    expect(report.topics[2]?.boardSharePct).toBeCloseTo(33.333, 2);
    expect(report.topics[2]?.pickSharePct).toBeCloseTo(20, 5);
  });

  it('filters by mode and sinceMs', () => {
    const report = aggregateTopicPopularity(
      [
        { mode: 'classic', categorySlugs: ['nba'], selectedAt: 50 },
        { mode: 'classic', categorySlugs: ['marvel'], selectedAt: 150 },
        { mode: 'rumble', categorySlugs: ['nba'], selectedAt: 200 },
      ],
      { mode: 'classic', sinceMs: 100 }
    );

    expect(report).toEqual({
      boardCount: 1,
      pickCount: 1,
      topics: [
        {
          slug: 'marvel',
          selectionCount: 1,
          boardSharePct: 100,
          pickSharePct: 100,
        },
      ],
    });
  });
});

describe('recordTopicSelection', () => {
  const handler = getConvexHandler<
    ReturnType<typeof createConvexTestCtx>,
    { clientSessionId: string; mode: string; categorySlugs: string[] },
    { ok: boolean; duplicate?: boolean; error?: string; id?: string }
  >(recordTopicSelection);

  it('inserts once and dedupes by clientSessionId', async () => {
    const user = userDoc({
      id: 'users_1',
      clerkId: 'clerk_1',
      email: 'p@example.com',
    });
    const ctx = createConvexTestCtx({
      identity: { subject: 'clerk_1', email: 'p@example.com' },
      tables: {
        users: [user],
        topic_selections: [],
      },
    });

    const first = await handler(ctx, {
      clientSessionId: 'sess_1',
      mode: 'classic',
      categorySlugs: ['nba', ' marvel ', 'nba'],
    });
    expect(first).toMatchObject({ ok: true, duplicate: false });

    const second = await handler(ctx, {
      clientSessionId: 'sess_1',
      mode: 'classic',
      categorySlugs: ['nba'],
    });
    expect(second).toMatchObject({ ok: true, duplicate: true });

    const rows = await ctx.db.query('topic_selections').collect();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      clientSessionId: 'sess_1',
      userId: 'users_1',
      mode: 'classic',
      categorySlugs: ['nba', 'marvel'],
    });
  });

  it('rejects empty topic lists', async () => {
    const user = userDoc({
      id: 'users_1',
      clerkId: 'clerk_1',
      email: 'p@example.com',
    });
    const ctx = createConvexTestCtx({
      identity: { subject: 'clerk_1', email: 'p@example.com' },
      tables: {
        users: [user],
        topic_selections: [],
      },
    });

    const result = await handler(ctx, {
      clientSessionId: 'sess_empty',
      mode: 'classic',
      categorySlugs: ['  ', ''],
    });
    expect(result).toEqual({ ok: false, error: 'no_topics' });
  });
});
