import { mutation } from './_generated/server';
import { v } from 'convex/values';
import {
  ADMIN_SIGN_IN_IDENTIFIER_MAX_LEN,
  ADMIN_SIGN_IN_MAX_IDENTIFIER_ROWS,
  appendFailureTimestamp,
  canClearAdminSignInFailures,
  canInsertNewRateLimitRow,
  evaluateAdminSignInGate,
  identityKeysForAdminSignInClear,
  normalizeAdminSignInIdentifier,
  pruneFailureTimestamps,
} from './lib/adminSignInRateLimit';

function resolveIdentifierKey(raw: string): string {
  const key = normalizeAdminSignInIdentifier(raw);
  if (!key || key.length > ADMIN_SIGN_IN_IDENTIFIER_MAX_LEN) {
    throw new Error('Invalid identifier.');
  }
  return key;
}

/**
 * Call before Clerk password sign-in; uses server time for the sliding window.
 * Advisory only for clients that call it — Clerk dashboard lockout is the real control.
 */
export const passwordSignInPreflight = mutation({
  args: { identifier: v.string() },
  handler: async (ctx, args) => {
    const identifierKey = resolveIdentifierKey(args.identifier);
    const now = Date.now();

    const existing = await ctx.db
      .query('admin_password_sign_in_rates')
      .withIndex('by_identifier_key', (q) => q.eq('identifierKey', identifierKey))
      .unique();

    const pruned = pruneFailureTimestamps(existing?.failureTimestamps ?? [], now);

    if (existing && pruned.length !== existing.failureTimestamps.length) {
      await ctx.db.patch(existing._id, { failureTimestamps: pruned });
    }

    const gate = evaluateAdminSignInGate(pruned, now);
    if (gate.allowed) {
      return { allowed: true as const, failuresInWindow: gate.failuresInWindow };
    }
    return {
      allowed: false as const,
      failuresInWindow: gate.failuresInWindow,
      retryAfterMs: gate.retryAfterMs,
    };
  },
});

/**
 * Call after Clerk reports a failed password attempt for this identifier.
 * Caps stored failures and distinct rows to limit unauthenticated lockout/storage DoS.
 * Does not extend lockout once already at the failure cap.
 */
export const passwordSignInRecordFailure = mutation({
  args: { identifier: v.string() },
  handler: async (ctx, args) => {
    const identifierKey = resolveIdentifierKey(args.identifier);
    const now = Date.now();

    const existing = await ctx.db
      .query('admin_password_sign_in_rates')
      .withIndex('by_identifier_key', (q) => q.eq('identifierKey', identifierKey))
      .unique();

    const pruned = pruneFailureTimestamps(existing?.failureTimestamps ?? [], now);
    const { next, recorded } = appendFailureTimestamp(pruned, now);

    if (existing) {
      const unchanged =
        next.length === existing.failureTimestamps.length &&
        next.every((t, i) => t === existing.failureTimestamps[i]);
      if (!unchanged) {
        // Patch when recording a new failure, pruning stale entries, or trimming oversize.
        await ctx.db.patch(existing._id, { failureTimestamps: next });
      }
      return { recorded };
    }

    // New identifier row: refuse when the distinct-row budget is exhausted.
    const rowCount = (
      await ctx.db.query('admin_password_sign_in_rates').take(ADMIN_SIGN_IN_MAX_IDENTIFIER_ROWS + 1)
    ).length;
    if (!canInsertNewRateLimitRow(rowCount)) {
      return { recorded: false as const, reason: 'row_budget' as const };
    }

    if (recorded) {
      await ctx.db.insert('admin_password_sign_in_rates', {
        identifierKey,
        failureTimestamps: next,
      });
    }
    return { recorded };
  },
});

/**
 * Clear rate-limit failures after a successful Clerk password sign-in.
 * Requires Convex auth identity. Soft-fails (no throw) when unauthenticated so a
 * race between Clerk `setActive` and Convex JWT propagation does not surface as a
 * server error in the client log box.
 * Only the authenticated user's own rate-limit record is cleared (stable claim match or admin).
 */
export const passwordSignInClearFailures = mutation({
  args: { identifier: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { ok: false as const, reason: 'not_authenticated' as const };
    }

    const identifierKey = resolveIdentifierKey(args.identifier);
    const identityKeys = identityKeysForAdminSignInClear(identity);

    let allowed = canClearAdminSignInFailures(identityKeys, identifierKey);
    if (!allowed) {
      const user = await ctx.db
        .query('users')
        .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
        .unique();
      allowed = canClearAdminSignInFailures(identityKeys, identifierKey, {
        isAdmin: user?.role === 'admin',
      });
    }

    if (!allowed) {
      return { ok: false as const, reason: 'forbidden' as const };
    }

    const existing = await ctx.db
      .query('admin_password_sign_in_rates')
      .withIndex('by_identifier_key', (q) => q.eq('identifierKey', identifierKey))
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return { ok: true as const };
  },
});
