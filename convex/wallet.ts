import { mutation, query, type QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import {
  applyRefundToBalance,
  canConsumeReservation,
  canRefundReservation,
  tryReserveFromBalance,
} from './lib/walletLedger';
import { ensureWalletDoc } from './lib/ensureWallet';
import {
  getCurrentCanonicalPurchaserAccountId,
  requireUser,
} from './lib/auth';
import { ensureCanonicalPurchaserAccountForUser } from './lib/purchaserAccounts';

const STARTER_GRANT = 5;

async function resolvePurchaserAccountId(
  ctx: QueryCtx,
  installationId?: string
) {
  const fromAuth = await getCurrentCanonicalPurchaserAccountId(ctx);
  if (fromAuth) {
    return fromAuth;
  }

  if (!installationId) {
    return null;
  }

  const installation = await ctx.db
    .query('device_installations')
    .withIndex('by_device', (q) => q.eq('deviceId', installationId))
    .unique();

  return installation?.purchaserAccountId ?? null;
}

export const getBalance = query({
  args: {
    installationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const purchaserAccountId = await resolvePurchaserAccountId(ctx, args.installationId);
    if (!purchaserAccountId) {
      return { balance: 0, purchaserAccountId: null };
    }

    const wallet = await ctx.db
      .query('wallets')
      .withIndex('by_purchaser_account', (q) =>
        q.eq('purchaserAccountId', purchaserAccountId)
      )
      .unique();
    return { balance: wallet?.balance ?? 0, purchaserAccountId };
  },
});

export const listTransactions = query({
  args: {
    installationId: v.optional(v.string()),
    cursor: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const purchaserAccountId = await resolvePurchaserAccountId(ctx, args.installationId);
    if (!purchaserAccountId) {
      return { items: [], nextCursor: null };
    }

    const wallet = await ctx.db
      .query('wallets')
      .withIndex('by_purchaser_account', (q) =>
        q.eq('purchaserAccountId', purchaserAccountId)
      )
      .unique();

    if (!wallet) {
      return { items: [], nextCursor: null };
    }

    const limit = Math.min(args.limit ?? 20, 100);
    const items = await ctx.db
      .query('wallet_transactions')
      .withIndex('by_wallet_created', (q) => q.eq('walletId', wallet._id))
      .collect();

    const filtered = items
      .filter((item) => (args.cursor ? item.createdAt < args.cursor : true))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);

    return {
      items: filtered,
      nextCursor:
        filtered.length === limit ? filtered[filtered.length - 1]?.createdAt ?? null : null,
    };
  },
});

export const grantStarterBalance = mutation({
  args: {
    deviceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const purchaserAccount = await ensureCanonicalPurchaserAccountForUser(ctx, user);
    if (!purchaserAccount) {
      throw new Error('Purchaser account creation failed');
    }
    const wallet = await ensureWalletDoc(ctx, purchaserAccount.appUserId, user._id);
    const idempotencyKey = `starter:${user._id}`;

    const existing = await ctx.db
      .query('wallet_transactions')
      .withIndex('by_wallet_idempotency', (q) =>
        q.eq('walletId', wallet._id).eq('idempotencyKey', idempotencyKey)
      )
      .unique();

    if (existing) {
      return { granted: false, balance: wallet.balance };
    }

    const now = Date.now();
    await ctx.db.insert('wallet_transactions', {
      walletId: wallet._id,
      type: 'starter_grant',
      amount: STARTER_GRANT,
      createdAt: now,
      status: 'posted',
      source: 'system',
      idempotencyKey,
      metadata: { deviceId: args.deviceId },
    });

    await ctx.db.patch(wallet._id, { balance: wallet.balance + STARTER_GRANT });
    const updated = await ctx.db.get(wallet._id);
    return { granted: true, balance: updated?.balance ?? wallet.balance + STARTER_GRANT };
  },
});

export const reserveGameEntry = mutation({
  args: {
    mode: v.string(),
    deviceId: v.optional(v.string()),
    clientSessionId: v.string(),
    cost: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const purchaserAccount = await ensureCanonicalPurchaserAccountForUser(ctx, user);
    if (!purchaserAccount) {
      throw new Error('Purchaser account creation failed');
    }
    const wallet = await ensureWalletDoc(ctx, purchaserAccount.appUserId, user._id);
    const cost = args.cost ?? 1;
    const reservationId = `${user._id}:${args.clientSessionId}`;
    const idempotencyKey = `reserve:${reservationId}`;

    const existing = await ctx.db
      .query('wallet_transactions')
      .withIndex('by_wallet_idempotency', (q) =>
        q.eq('walletId', wallet._id).eq('idempotencyKey', idempotencyKey)
      )
      .unique();

    if (existing) {
      const latest = await ctx.db.get(wallet._id);
      const bal = latest?.balance ?? wallet.balance;
      if (existing.status === 'reserved') {
        return { ok: true as const, reservationId, balance: bal };
      }
      if (existing.status === 'consumed') {
        return { ok: false as const, error: 'reservation_already_consumed' };
      }
      if (existing.status === 'refunded') {
        return { ok: false as const, error: 'reservation_already_refunded' };
      }
    }

    const balance = wallet.balance;

    const reserve = tryReserveFromBalance(balance, cost);
    if (!reserve.ok) {
      return { ok: false as const, error: reserve.reason };
    }

    const now = Date.now();
    await ctx.db.insert('wallet_transactions', {
      walletId: wallet._id,
      type: 'game_entry_reserve',
      amount: -cost,
      createdAt: now,
      status: 'reserved',
      source: 'gameplay',
      idempotencyKey,
      reservationId,
      metadata: { mode: args.mode, deviceId: args.deviceId },
    });

    await ctx.db.patch(wallet._id, { balance: reserve.balanceAfter });
    return { ok: true as const, reservationId, balance: reserve.balanceAfter };
  },
});

export const consumeEntry = mutation({
  args: {
    reservationId: v.string(),
    completedSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const purchaserAccount = await ensureCanonicalPurchaserAccountForUser(ctx, user);
    const tx = await ctx.db
      .query('wallet_transactions')
      .withIndex('by_reservation', (q) => q.eq('reservationId', args.reservationId))
      .unique();

    if (!tx) return { ok: false as const, error: 'reservation_not_found' };
    const wallet = await ctx.db.get(tx.walletId);
    if (!wallet || wallet.purchaserAccountId !== purchaserAccount?.appUserId) {
      return { ok: false as const, error: 'forbidden' };
    }
    if (!canConsumeReservation(tx.status as 'reserved' | 'consumed' | 'refunded' | undefined)) {
      return { ok: false as const, error: 'invalid_reservation_state' };
    }

    await ctx.db.patch(tx._id, {
      status: 'consumed',
      sessionId: args.completedSessionId,
      metadata: {
        ...(typeof tx.metadata === 'object' && tx.metadata !== null ? tx.metadata : {}),
        completedSessionId: args.completedSessionId,
      },
    });

    return { ok: true as const };
  },
});

export const refundEntry = mutation({
  args: {
    reservationId: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const purchaserAccount = await ensureCanonicalPurchaserAccountForUser(ctx, user);
    const tx = await ctx.db
      .query('wallet_transactions')
      .withIndex('by_reservation', (q) => q.eq('reservationId', args.reservationId))
      .unique();

    if (!tx) return { ok: false as const, error: 'reservation_not_found' };
    if (!canRefundReservation(tx.status as 'reserved' | 'consumed' | 'refunded' | undefined)) {
      return { ok: false as const, error: 'invalid_reservation_state' };
    }

    const wallet = await ctx.db.get(tx.walletId);
    if (!wallet || wallet.purchaserAccountId !== purchaserAccount?.appUserId) {
      return { ok: false as const, error: 'forbidden' };
    }

    const refundAmount = -tx.amount;
    const nextBalance = applyRefundToBalance(wallet.balance, refundAmount);

    await ctx.db.patch(wallet._id, { balance: nextBalance });
    await ctx.db.patch(tx._id, {
      status: 'refunded',
      metadata: {
        ...(typeof tx.metadata === 'object' && tx.metadata !== null ? tx.metadata : {}),
        refundReason: args.reason,
      },
    });

    return { ok: true as const, balance: nextBalance };
  },
});
