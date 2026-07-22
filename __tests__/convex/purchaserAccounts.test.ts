import { describe, expect, it } from '@jest/globals';

import {
  isMergeableGuestPurchaserAccount,
  isPureGuestPurchaserAccount,
  shouldRebindInstallationToCanonical,
} from '@/convex/lib/purchaserAccounts';
import type { Id } from '@/convex/_generated/dataModel';

const userA = 'users_a' as Id<'users'>;
const userB = 'users_b' as Id<'users'>;

describe('purchaser account profile isolation', () => {
  it('treats only unlinked guest accounts as pure guests', () => {
    expect(isPureGuestPurchaserAccount({ kind: 'guest' })).toBe(true);
    expect(isPureGuestPurchaserAccount({ kind: 'guest', linkedUserId: userA })).toBe(false);
    expect(isPureGuestPurchaserAccount({ kind: 'identified', linkedUserId: userA })).toBe(false);
  });

  it('rebinds the device when the installation account belongs to another identified user', () => {
    expect(
      shouldRebindInstallationToCanonical(
        { appUserId: 'acct-a', kind: 'identified', linkedUserId: userA },
        { appUserId: 'acct-b' }
      )
    ).toBe(true);

    expect(
      shouldRebindInstallationToCanonical(
        { appUserId: 'acct-a', kind: 'guest', linkedUserId: userA },
        { appUserId: 'acct-b' }
      )
    ).toBe(true);
  });

  it('keeps a pure guest installation so guest→user merge can still run', () => {
    expect(
      shouldRebindInstallationToCanonical(
        { appUserId: 'guest-1', kind: 'guest' },
        { appUserId: 'acct-b' }
      )
    ).toBe(false);

    expect(
      shouldRebindInstallationToCanonical(
        { appUserId: 'acct-b', kind: 'identified', linkedUserId: userB },
        { appUserId: 'acct-b' }
      )
    ).toBe(false);
  });

  it('refuses linkGuestToCurrentUser when the source is identified (not a guest)', () => {
    expect(
      isMergeableGuestPurchaserAccount(
        { kind: 'identified', linkedUserId: userA },
        userB
      )
    ).toBe(false);
  });

  it('allows merge only for guest wallets not linked to a different user', () => {
    expect(isMergeableGuestPurchaserAccount({ kind: 'guest' }, userB)).toBe(true);
    expect(
      isMergeableGuestPurchaserAccount({ kind: 'guest', linkedUserId: userB }, userB)
    ).toBe(true);
    expect(
      isMergeableGuestPurchaserAccount({ kind: 'guest', linkedUserId: userA }, userB)
    ).toBe(false);
  });
});
