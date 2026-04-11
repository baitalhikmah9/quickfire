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
