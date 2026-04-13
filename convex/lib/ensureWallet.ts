import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';

export async function ensureWalletDoc(
  ctx: MutationCtx,
  userId: Id<'users'>
): Promise<Doc<'wallets'>> {
  const existing = await ctx.db
    .query('wallets')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .unique();
  if (existing) return existing;
  const id = await ctx.db.insert('wallets', { userId, balance: 0 });
  const created = await ctx.db.get(id);
  if (!created) throw new Error('Wallet creation failed');
  return created;
}
