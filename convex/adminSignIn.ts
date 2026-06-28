import { mutation } from './_generated/server';
import { v } from 'convex/values';
import {
  ADMIN_SIGN_IN_IDENTIFIER_MAX_LEN,
  evaluateAdminSignInGate,
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

/** Call before Clerk password sign-in; uses server time for the sliding window. */
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

/** Call after Clerk reports a failed password attempt for this identifier. */
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
    const next = [...pruned, now];

    if (existing) {
      await ctx.db.patch(existing._id, { failureTimestamps: next });
    } else {
      await ctx.db.insert('admin_password_sign_in_rates', {
        identifierKey,
        failureTimestamps: next,
      });
    }
  },
});

/**
 * Clear rate-limit failures after a successful Clerk password sign-in.
 * Requires Convex auth identity (must be called AFTER `setActive`).
 * Only the authenticated user's own rate-limit record is cleared.
 */
export const passwordSignInClearFailures = mutation({
  args: { identifier: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const identifierKey = resolveIdentifierKey(args.identifier);
    const normalizedIdentity = normalizeAdminSignInIdentifier(
      identity.email ?? identity.subject
    );

    // Only allow clearing the rate limit record tied to the authenticated user
    if (identifierKey !== normalizedIdentity) {
      throw new Error('Forbidden');
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
