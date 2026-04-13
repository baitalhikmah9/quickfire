import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { getCurrentUser, requireUser } from './lib/auth';

export const getCurrentProfile = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const upsertOnFirstSignIn = mutation({
  args: {
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastActiveAt: Date.now(),
        ...(args.email !== undefined && { email: args.email }),
        ...(args.name !== undefined && { name: args.name }),
      });
      return existing._id;
    }

    return await ctx.db.insert('users', {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      lastActiveAt: Date.now(),
    });
  },
});

export const updatePreferences = mutation({
  args: {
    preferences: v.any(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await ctx.db.patch(user._id, {
      preferences: args.preferences,
      lastActiveAt: Date.now(),
    });
    return user._id;
  },
});
