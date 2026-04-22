import type { Doc } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';

type ReaderCtx = QueryCtx | MutationCtx;

export async function getPurchaserAccountByAppUserId(
  ctx: ReaderCtx,
  appUserId: string
) {
  return await ctx.db
    .query('purchaser_accounts')
    .withIndex('by_app_user_id', (q) => q.eq('appUserId', appUserId))
    .unique();
}

export async function getCanonicalPurchaserAccountForUser(
  ctx: ReaderCtx,
  user: Doc<'users'>
) {
  if (user.canonicalPurchaserAccountId) {
    return await getPurchaserAccountByAppUserId(ctx, user.canonicalPurchaserAccountId);
  }

  return await ctx.db
    .query('purchaser_accounts')
    .withIndex('by_linked_user', (q) => q.eq('linkedUserId', user._id))
    .unique();
}

export async function ensureCanonicalPurchaserAccountForUser(
  ctx: MutationCtx,
  user: Doc<'users'>
) {
  const existing = await getCanonicalPurchaserAccountForUser(ctx, user);

  if (existing && existing.state !== 'merged') {
    if (user.canonicalPurchaserAccountId !== existing.appUserId) {
      await ctx.db.patch(user._id, { canonicalPurchaserAccountId: existing.appUserId });
    }
    return existing;
  }

  const now = Date.now();
  const appUserId = crypto.randomUUID();

  await ctx.db.insert('purchaser_accounts', {
    appUserId,
    kind: 'identified',
    linkedUserId: user._id,
    state: 'active',
    createdAt: now,
    linkedAt: now,
    lastSeenAt: now,
    lastPlatform: 'unknown',
    lastAppVersion: 'unknown',
  });

  await ctx.db.patch(user._id, {
    canonicalPurchaserAccountId: appUserId,
  });

  return await getPurchaserAccountByAppUserId(ctx, appUserId);
}
