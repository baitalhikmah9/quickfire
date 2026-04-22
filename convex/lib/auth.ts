import type { QueryCtx, MutationCtx } from '../_generated/server';
import type { Doc } from '../_generated/dataModel';
import { getCanonicalPurchaserAccountForUser } from './purchaserAccounts';

export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<'users'> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .unique();

  return user;
}

export async function requireUser(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<'users'>> {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error('Not authenticated');
  return user;
}

export async function requireAdmin(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<'users'>> {
  const user = await requireUser(ctx);
  if (user.role !== 'admin') {
    throw new Error('Forbidden');
  }
  return user;
}

export async function getCurrentCanonicalPurchaserAccountId(
  ctx: QueryCtx | MutationCtx
) {
  const user = await getCurrentUser(ctx);
  if (!user) {
    return null;
  }

  const purchaserAccount = await getCanonicalPurchaserAccountForUser(ctx, user);
  return purchaserAccount?.appUserId ?? user.canonicalPurchaserAccountId ?? null;
}
