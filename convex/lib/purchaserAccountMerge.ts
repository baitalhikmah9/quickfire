import type { Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';
import { ensureWalletDoc } from './ensureWallet';
import { mergePurchaserBalances } from './paymentWebhook';
import { getPurchaserAccountByAppUserId } from './purchaserAccounts';

export async function mergePurchaserAccountIntoTarget(
  ctx: MutationCtx,
  {
    sourceAppUserId,
    targetAppUserId,
    linkedUserId,
    purchaseStatus,
  }: {
    sourceAppUserId: string;
    targetAppUserId: string;
    linkedUserId?: Id<'users'>;
    purchaseStatus?: string;
  }
): Promise<{ transferredAmount: number; alreadyMerged: boolean }> {
  if (sourceAppUserId === targetAppUserId) {
    return { transferredAmount: 0, alreadyMerged: true };
  }

  const sourcePurchaserAccount = await getPurchaserAccountByAppUserId(ctx, sourceAppUserId);
  const targetPurchaserAccount = await getPurchaserAccountByAppUserId(ctx, targetAppUserId);

  if (!sourcePurchaserAccount || !targetPurchaserAccount) {
    throw new Error('Purchaser account not found');
  }

  if (
    sourcePurchaserAccount.state === 'merged' &&
    sourcePurchaserAccount.mergedIntoId === targetAppUserId
  ) {
    return { transferredAmount: 0, alreadyMerged: true };
  }

  const sourceWallet = await ensureWalletDoc(
    ctx,
    sourcePurchaserAccount.appUserId,
    sourcePurchaserAccount.linkedUserId
  );
  const targetWallet = await ensureWalletDoc(
    ctx,
    targetPurchaserAccount.appUserId,
    linkedUserId ?? targetPurchaserAccount.linkedUserId
  );
  const merge = mergePurchaserBalances({
    sourceBalance: sourceWallet.balance,
    targetBalance: targetWallet.balance,
  });
  const now = Date.now();
  const mergeDebitKey = `merge:${sourcePurchaserAccount.appUserId}:${targetPurchaserAccount.appUserId}:debit`;

  const existingMergeDebit = await ctx.db
    .query('wallet_transactions')
    .withIndex('by_wallet_idempotency', (q) =>
      q.eq('walletId', sourceWallet._id).eq('idempotencyKey', mergeDebitKey)
    )
    .unique();

  if (!existingMergeDebit && merge.transferAmount !== 0) {
    await ctx.db.insert('wallet_transactions', {
      walletId: sourceWallet._id,
      type: 'account_merge_debit',
      amount: -merge.transferAmount,
      createdAt: now,
      status: 'posted',
      source: 'system',
      idempotencyKey: mergeDebitKey,
      metadata: { targetPurchaserAccountId: targetPurchaserAccount.appUserId },
    });
    await ctx.db.insert('wallet_transactions', {
      walletId: targetWallet._id,
      type: 'account_merge_credit',
      amount: merge.transferAmount,
      createdAt: now,
      status: 'posted',
      source: 'system',
      idempotencyKey: `merge:${sourcePurchaserAccount.appUserId}:${targetPurchaserAccount.appUserId}:credit`,
      metadata: { sourcePurchaserAccountId: sourcePurchaserAccount.appUserId },
    });

    await ctx.db.patch(sourceWallet._id, { balance: merge.sourceBalanceAfter });
    await ctx.db.patch(targetWallet._id, { balance: merge.targetBalanceAfter });
  }

  const linkedInstallations = await ctx.db
    .query('device_installations')
    .withIndex('by_purchaser_account', (q) =>
      q.eq('purchaserAccountId', sourcePurchaserAccount.appUserId)
    )
    .collect();

  for (const installation of linkedInstallations) {
    await ctx.db.patch(installation._id, {
      purchaserAccountId: targetPurchaserAccount.appUserId,
      ...(linkedUserId ? { userId: linkedUserId } : {}),
    });
  }

  const linkedPurchases = await ctx.db
    .query('store_purchases')
    .withIndex('by_purchaser_account', (q) =>
      q.eq('purchaserAccountId', sourcePurchaserAccount.appUserId)
    )
    .collect();

  for (const purchase of linkedPurchases) {
    await ctx.db.patch(purchase._id, {
      purchaserAccountId: targetPurchaserAccount.appUserId,
      ...(purchaseStatus ? { status: purchaseStatus } : {}),
    });
  }

  await ctx.db.patch(sourcePurchaserAccount._id, {
    state: 'merged',
    mergedIntoId: targetPurchaserAccount.appUserId,
    ...(linkedUserId ? { linkedUserId } : {}),
    lastSeenAt: now,
  });

  if (linkedUserId) {
    await ctx.db.patch(targetPurchaserAccount._id, {
      kind: 'identified',
      linkedUserId,
      linkedAt: targetPurchaserAccount.linkedAt ?? now,
      lastSeenAt: now,
    });
    await ctx.db.patch(linkedUserId, {
      canonicalPurchaserAccountId: targetPurchaserAccount.appUserId,
    });
  }

  return {
    transferredAmount: existingMergeDebit ? 0 : merge.transferAmount,
    alreadyMerged: false,
  };
}
