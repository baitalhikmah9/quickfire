import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireUser } from './lib/auth';

const scoreEventValidator = v.object({
  teamId: v.string(),
  points: v.number(),
  reason: v.string(),
  questionId: v.optional(v.string()),
  turnIndex: v.number(),
  createdAt: v.number(),
  metadata: v.optional(v.any()),
});

export const saveCompletedSession = mutation({
  args: {
    clientSessionId: v.string(),
    deviceId: v.string(),
    mode: v.string(),
    seed: v.string(),
    configSnapshot: v.any(),
    winningTeamId: v.optional(v.string()),
    scoreEvents: v.array(scoreEventValidator),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const existing = await ctx.db
      .query('game_sessions')
      .withIndex('by_client_session', (q) => q.eq('clientSessionId', args.clientSessionId))
      .unique();

    if (existing?.endedAt !== undefined && existing.endedAt !== null) {
      return { ok: true as const, duplicate: true, sessionId: existing._id };
    }

    const now = Date.now();
    let sessionId = existing?._id;

    if (!sessionId) {
      sessionId = await ctx.db.insert('game_sessions', {
        mode: args.mode,
        configSnapshot: args.configSnapshot,
        seed: args.seed,
        startedAt: now,
        endedAt: now,
        winningTeamId: args.winningTeamId,
        userId: user._id,
        clientSessionId: args.clientSessionId,
        deviceId: args.deviceId,
      });
    } else {
      await ctx.db.patch(sessionId, {
        endedAt: now,
        winningTeamId: args.winningTeamId,
        deviceId: args.deviceId,
      });
    }

    const sessionKey = args.clientSessionId;

    const priorEvents = await ctx.db
      .query('score_events')
      .withIndex('by_session', (q) => q.eq('sessionId', sessionKey))
      .collect();

    if (priorEvents.length === 0) {
      for (const ev of args.scoreEvents) {
        await ctx.db.insert('score_events', {
          sessionId: sessionKey,
          teamId: ev.teamId,
          points: ev.points,
          reason: ev.reason,
          questionId: ev.questionId,
          turnIndex: ev.turnIndex,
          createdAt: ev.createdAt,
          metadata: ev.metadata,
        });
      }
    }

    return { ok: true as const, duplicate: false, sessionId };
  },
});

const MAX_TOPIC_SLUGS = 12;
const MAX_SLUG_LEN = 80;

/**
 * Records locked-in topics when a board starts.
 * Idempotent on clientSessionId so double-taps / retries do not double-count.
 */
export const recordTopicSelection = mutation({
  args: {
    clientSessionId: v.string(),
    mode: v.string(),
    categorySlugs: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const clientSessionId = args.clientSessionId.trim().slice(0, 120);
    if (!clientSessionId) {
      return { ok: false as const, error: 'invalid_session' };
    }

    const existing = await ctx.db
      .query('topic_selections')
      .withIndex('by_client_session', (q) => q.eq('clientSessionId', clientSessionId))
      .unique();
    if (existing) {
      return { ok: true as const, duplicate: true, id: existing._id };
    }

    const categorySlugs = [
      ...new Set(
        args.categorySlugs
          .map((slug) => slug.trim().slice(0, MAX_SLUG_LEN))
          .filter((slug) => slug.length > 0)
      ),
    ].slice(0, MAX_TOPIC_SLUGS);

    if (categorySlugs.length === 0) {
      return { ok: false as const, error: 'no_topics' };
    }

    const id = await ctx.db.insert('topic_selections', {
      clientSessionId,
      userId: user._id,
      mode: args.mode.trim().slice(0, 40) || 'unknown',
      categorySlugs,
      selectedAt: Date.now(),
    });

    return { ok: true as const, duplicate: false, id };
  },
});

export const listRecentSessions = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const limit = Math.min(args.limit ?? 20, 50);

    const rows = await ctx.db
      .query('game_sessions')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    rows.sort((a, b) => b.startedAt - a.startedAt);
    return rows.slice(0, limit);
  },
});
