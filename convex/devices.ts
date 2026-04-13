import { mutation } from './_generated/server';
import { v } from 'convex/values';
import { requireUser } from './lib/auth';

export const registerInstallation = mutation({
  args: {
    deviceId: v.string(),
    platform: v.string(),
    appVersion: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = Date.now();

    const existing = await ctx.db
      .query('device_installations')
      .withIndex('by_user_device', (q) => q.eq('userId', user._id).eq('deviceId', args.deviceId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        platform: args.platform,
        appVersion: args.appVersion,
        lastSeenAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert('device_installations', {
      deviceId: args.deviceId,
      userId: user._id,
      platform: args.platform,
      appVersion: args.appVersion,
      firstSeenAt: now,
      lastSeenAt: now,
    });
  },
});
