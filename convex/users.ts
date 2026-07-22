import { action, internalMutation, mutation, query } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { getCurrentUser, requireUser } from './lib/auth';
import {
  ACCOUNT_DELETION_FORFEIT_SOURCE,
  ACCOUNT_DELETION_FORFEIT_TYPE,
  buildAccountDeletionPiiPatch,
  buildDeletedPurchaserAccountPatch,
  buildDeviceUnlinkPatch,
  isClerkUserAlreadyDeleted,
  isUserDeletionPending,
} from './lib/accountDeletion';
import { getPurchaserAccountByAppUserId } from './lib/purchaserAccounts';

export const getCurrentProfile = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const upsertOnFirstSignIn = mutation({
  args: {
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    const clerkId = identity.subject;

    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', clerkId))
      .unique();

    if (existing) {
      // Never restore PII or treat a mid-deletion user as a live account.
      if (isUserDeletionPending(existing)) {
        throw new Error('Account is being deleted');
      }

      await ctx.db.patch(existing._id, {
        lastActiveAt: Date.now(),
        ...(args.email !== undefined && { email: args.email }),
        ...(args.name !== undefined && { name: args.name }),
      });
      return existing._id;
    }

    return await ctx.db.insert('users', {
      clerkId,
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

async function forfeitWalletBalance(
  ctx: MutationCtx,
  {
    walletId,
    balance,
    now,
    clerkId,
    userId,
  }: {
    walletId: Id<'wallets'>;
    balance: number;
    now: number;
    clerkId: string;
    userId: Id<'users'>;
  }
) {
  if (balance === 0) {
    return;
  }

  const idempotencyKey = `account_deletion_forfeit:${userId}`;
  const existing = await ctx.db
    .query('wallet_transactions')
    .withIndex('by_wallet_idempotency', (q) =>
      q.eq('walletId', walletId).eq('idempotencyKey', idempotencyKey)
    )
    .unique();

  if (existing) {
    if (balance !== 0) {
      await ctx.db.patch(walletId, { balance: 0 });
    }
    return;
  }

  await ctx.db.insert('wallet_transactions', {
    walletId,
    type: ACCOUNT_DELETION_FORFEIT_TYPE,
    amount: -Math.abs(balance),
    source: ACCOUNT_DELETION_FORFEIT_SOURCE,
    createdAt: now,
    status: 'posted',
    idempotencyKey,
    metadata: {
      clerkId,
      userId,
    },
  });
  await ctx.db.patch(walletId, { balance: 0 });
}

async function markPurchaserAccountDeleted(
  ctx: MutationCtx,
  appUserId: string,
  now: number,
  clerkId: string,
  userId: Id<'users'>
) {
  const account = await getPurchaserAccountByAppUserId(ctx, appUserId);
  if (!account) {
    return;
  }

  const wallet = await ctx.db
    .query('wallets')
    .withIndex('by_purchaser_account', (q) => q.eq('purchaserAccountId', appUserId))
    .unique();

  if (wallet) {
    await forfeitWalletBalance(ctx, {
      walletId: wallet._id,
      balance: wallet.balance,
      now,
      clerkId,
      userId,
    });
    // Keep wallet row for ledger history; drop user link so it is not reattached.
    if (wallet.userId !== undefined) {
      await ctx.db.patch(wallet._id, { userId: undefined });
    }
  }

  const installations = await ctx.db
    .query('device_installations')
    .withIndex('by_purchaser_account', (q) => q.eq('purchaserAccountId', appUserId))
    .collect();

  const unlink = buildDeviceUnlinkPatch();
  for (const installation of installations) {
    await ctx.db.patch(installation._id, unlink);
  }

  await ctx.db.patch(account._id, buildDeletedPurchaserAccountPatch(now));
}

/**
 * Step 1–4 of account deletion (idempotent): mark pending, erase PII, unlink
 * purchases/devices, forfeit tokens. Clerk + row delete happen in the action.
 */
export const beginAccountDeletion = internalMutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .unique();

    if (!user) {
      return { status: 'already_complete' as const };
    }

    const now = Date.now();
    const piiPatch = buildAccountDeletionPiiPatch(now);
    await ctx.db.patch(user._id, {
      ...piiPatch,
      // Keep original pending timestamp on retry so first request time is stable.
      deletionPendingAt: user.deletionPendingAt ?? now,
    });

    const purchaserIds = new Set<string>();
    if (user.canonicalPurchaserAccountId) {
      purchaserIds.add(user.canonicalPurchaserAccountId);
    }

    const linkedAccounts = await ctx.db
      .query('purchaser_accounts')
      .withIndex('by_linked_user', (q) => q.eq('linkedUserId', user._id))
      .collect();

    for (const account of linkedAccounts) {
      purchaserIds.add(account.appUserId);
    }

    for (const appUserId of purchaserIds) {
      await markPurchaserAccountDeleted(ctx, appUserId, now, args.clerkId, user._id);
    }

    // Forfeit any wallet still keyed only by userId (legacy / race).
    const userWallets = await ctx.db
      .query('wallets')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    for (const wallet of userWallets) {
      await forfeitWalletBalance(ctx, {
        walletId: wallet._id,
        balance: wallet.balance,
        now,
        clerkId: args.clerkId,
        userId: user._id,
      });
      await ctx.db.patch(wallet._id, { userId: undefined });
    }

    await ctx.db.patch(user._id, {
      canonicalPurchaserAccountId: undefined,
    });

    return {
      status: 'pending' as const,
      userId: user._id,
      clerkId: args.clerkId,
      alreadyPending: isUserDeletionPending(user),
    };
  },
});

/** Final step: remove the Convex users row (gameplay / ledger rows stay). */
export const finalizeAccountDeletion = internalMutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { status: 'already_complete' as const };
    }

    await ctx.db.delete(args.userId);
    return { status: 'deleted' as const };
  },
});

async function deleteClerkUser(clerkId: string): Promise<void> {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret?.trim()) {
    throw new Error(
      'CLERK_SECRET_KEY is not configured. Set it in the Convex dashboard environment variables.'
    );
  }

  const response = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(clerkId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${secret}`,
    },
  });

  if (response.ok || isClerkUserAlreadyDeleted(response.status)) {
    return;
  }

  const body = await response.text().catch(() => '');
  throw new Error(
    `Clerk user deletion failed (${response.status})${body ? `: ${body.slice(0, 200)}` : ''}`
  );
}

/**
 * Two-phase account deletion for signed-in clients.
 * Safe to retry after partial failure (PII already erased stays erased).
 */
export const deleteAccount = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const clerkId = identity.subject;

    const begin = await ctx.runMutation(internal.users.beginAccountDeletion, { clerkId });

    if (begin.status === 'already_complete') {
      // User row already gone — still ensure Clerk identity is gone (idempotent).
      try {
        await deleteClerkUser(clerkId);
      } catch {
        // Clerk may already be deleted and secret missing in edge cases; row is gone.
      }
      return { ok: true as const, alreadyComplete: true };
    }

    await deleteClerkUser(clerkId);

    await ctx.runMutation(internal.users.finalizeAccountDeletion, {
      userId: begin.userId,
    });

    return { ok: true as const, alreadyComplete: false };
  },
});
