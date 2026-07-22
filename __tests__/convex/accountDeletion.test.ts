import { describe, expect, it } from '@jest/globals';

import {
  ACCOUNT_DELETION_FORFEIT_SOURCE,
  ACCOUNT_DELETION_FORFEIT_TYPE,
  buildAccountDeletionPiiPatch,
  buildDeletedPurchaserAccountPatch,
  buildDeviceUnlinkPatch,
  buildWalletForfeitTransaction,
  isClerkUserAlreadyDeleted,
  isPurchaserAccountReclaimable,
  isPurchaserAccountUsable,
  isUserDeletionPending,
  PURCHASER_STATE_ACTIVE,
  PURCHASER_STATE_DELETED,
  PURCHASER_STATE_MERGED,
} from '@/convex/lib/accountDeletion';
import {
  isMergeableGuestPurchaserAccount,
  isPureGuestPurchaserAccount,
} from '@/convex/lib/purchaserAccounts';
import type { Id } from '@/convex/_generated/dataModel';

const userA = 'users_a' as Id<'users'>;

describe('account deletion helpers', () => {
  it('detects deletion-pending users', () => {
    expect(isUserDeletionPending({})).toBe(false);
    expect(isUserDeletionPending({ deletionPendingAt: 1 })).toBe(true);
  });

  it('erases PII fields while recording deletionPendingAt', () => {
    const now = 1_700_000_000_000;
    expect(buildAccountDeletionPiiPatch(now)).toEqual({
      deletionPendingAt: now,
      email: undefined,
      name: undefined,
      preferences: undefined,
      role: undefined,
      lastActiveAt: now,
    });
  });

  it('marks purchaser accounts deleted and unlinked', () => {
    const now = 99;
    expect(buildDeletedPurchaserAccountPatch(now)).toEqual({
      state: PURCHASER_STATE_DELETED,
      linkedUserId: undefined,
      lastSeenAt: now,
    });
  });

  it('unlinks device installations from user and purchaser', () => {
    expect(buildDeviceUnlinkPatch()).toEqual({
      userId: undefined,
      purchaserAccountId: undefined,
    });
  });

  it('builds an idempotent token forfeit ledger entry', () => {
    const tx = buildWalletForfeitTransaction({
      walletId: 'wallets_1',
      amount: 42,
      now: 10,
      clerkId: 'user_clerk',
      userId: 'users_1',
    });

    expect(tx.type).toBe(ACCOUNT_DELETION_FORFEIT_TYPE);
    expect(tx.source).toBe(ACCOUNT_DELETION_FORFEIT_SOURCE);
    expect(tx.amount).toBe(-42);
    expect(tx.idempotencyKey).toBe('account_deletion_forfeit:users_1');
    expect(tx.status).toBe('posted');
  });

  it('treats only active purchaser accounts as usable/reclaimable', () => {
    expect(isPurchaserAccountUsable({ state: PURCHASER_STATE_ACTIVE })).toBe(true);
    expect(isPurchaserAccountUsable({ state: PURCHASER_STATE_DELETED })).toBe(false);
    expect(isPurchaserAccountUsable({ state: PURCHASER_STATE_MERGED })).toBe(false);

    expect(isPurchaserAccountReclaimable({ state: PURCHASER_STATE_ACTIVE })).toBe(true);
    expect(isPurchaserAccountReclaimable({ state: PURCHASER_STATE_DELETED })).toBe(false);
    expect(isPurchaserAccountReclaimable({ state: PURCHASER_STATE_MERGED })).toBe(false);
  });

  it('refuses merge/reclaim of deleted purchaser accounts', () => {
    expect(
      isMergeableGuestPurchaserAccount(
        { kind: 'guest', state: PURCHASER_STATE_DELETED },
        userA
      )
    ).toBe(false);

    expect(
      isPureGuestPurchaserAccount({ kind: 'guest', state: PURCHASER_STATE_DELETED })
    ).toBe(false);

    expect(isPureGuestPurchaserAccount({ kind: 'guest', state: PURCHASER_STATE_ACTIVE })).toBe(
      true
    );
  });

  it('treats Clerk 404 as already deleted for safe retries', () => {
    expect(isClerkUserAlreadyDeleted(404)).toBe(true);
    expect(isClerkUserAlreadyDeleted(200)).toBe(false);
    expect(isClerkUserAlreadyDeleted(500)).toBe(false);
  });
});
