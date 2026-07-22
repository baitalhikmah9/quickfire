import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import {
  isPurchaserAccountReclaimable,
  isPurchaserAccountUsable,
  PURCHASER_STATE_ACTIVE,
} from './accountDeletion';

type ReaderCtx = QueryCtx | MutationCtx;

export { isPurchaserAccountReclaimable, isPurchaserAccountUsable };

/** Pure guest wallet: not identified and not already linked to a user. */
export function isPureGuestPurchaserAccount(account: {
  kind: string;
  linkedUserId?: Id<'users'>;
  state?: string;
}): boolean {
  if (account.state && !isPurchaserAccountUsable(account as { state: string })) {
    return false;
  }
  return account.kind === 'guest' && !account.linkedUserId;
}

/**
 * When a signed-in user lands on a device bound to another account, keep the
 * installation account only if it is a pure guest (merge candidate). Otherwise
 * rebind the device to the user's canonical account so tokens stay per-profile.
 */
export function shouldRebindInstallationToCanonical(
  installation: {
    appUserId: string;
    kind: string;
    linkedUserId?: Id<'users'>;
  },
  canonical: { appUserId: string }
): boolean {
  return (
    installation.appUserId !== canonical.appUserId &&
    !isPureGuestPurchaserAccount(installation)
  );
}

/**
 * Only pure or self-linked guest wallets may be merged into the current user.
 * Never drain another user's identified account because it was last used on
 * this device.
 */
export function isMergeableGuestPurchaserAccount(
  source: {
    kind: string;
    linkedUserId?: Id<'users'>;
    state?: string;
  },
  currentUserId: Id<'users'>
): boolean {
  if (source.state && !isPurchaserAccountReclaimable(source as { state: string })) {
    return false;
  }
  if (source.kind !== 'guest') {
    return false;
  }
  if (source.linkedUserId && source.linkedUserId !== currentUserId) {
    return false;
  }
  return true;
}

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

  // Never reclaim deleted/merged purchaser accounts — mint a fresh one instead.
  if (existing && isPurchaserAccountUsable(existing)) {
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
    state: PURCHASER_STATE_ACTIVE,
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
