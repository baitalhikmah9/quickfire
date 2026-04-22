import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';

export async function ensureWalletDoc(
  ctx: MutationCtx,
  purchaserAccountId: string,
  userId?: Id<'users'>
): Promise<Doc<'wallets'>> {
  const existing = await ctx.db
    .query('wallets')
    .withIndex('by_purchaser_account', (q) => q.eq('purchaserAccountId', purchaserAccountId))
    .unique();
  if (existing) {
    if (userId && existing.userId !== userId) {
      await ctx.db.patch(existing._id, { userId });
    }
    return existing;
  }

  if (userId) {
    const legacyWallet = await ctx.db
      .query('wallets')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique();

    if (legacyWallet) {
      await ctx.db.patch(legacyWallet._id, { purchaserAccountId });
      const migrated = await ctx.db.get(legacyWallet._id);
      if (migrated) {
        return migrated;
      }
    }
  }

  const id = await ctx.db.insert('wallets', { userId, purchaserAccountId, balance: 0 });
  const created = await ctx.db.get(id);
  if (!created) throw new Error('Wallet creation failed');
  return created;
}
