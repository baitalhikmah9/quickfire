import { describe, expect, it } from '@jest/globals';
import { listReferrals } from '@/convex/admin';
import { getConvexHandler } from '../helpers/convexHandler';
import {
  createConvexTestCtx,
  userDoc,
  walletDoc,
  type ConvexDoc,
} from '../helpers/convexTestCtx';

const handler = getConvexHandler<
  ReturnType<typeof createConvexTestCtx>,
  { query?: string; cursor?: number; limit?: number },
  {
    items: Array<{
      transactionId: string;
      code: string | null;
      invitee: { email: string | null } | null;
      inviter: { email: string | null; successfulReferralCount: number } | null;
    }>;
    nextCursor: number | null;
    stats: { totalSuccessfulReferrals: number; totalReferrers: number; rewardTokens: number };
    topReferrers: Array<{ email: string | null; successfulReferralCount: number }>;
  }
>(listReferrals);

describe('admin.listReferrals', () => {
  it('lists invitee grants with inviter stats', async () => {
    const inviter = userDoc({
      id: 'users_inviter',
      clerkId: 'clerk_inviter',
      email: 'inviter@example.com',
    });
    inviter.referralCode = 'INVITE01';
    inviter.successfulReferralCount = 1;

    const invitee = userDoc({
      id: 'users_invitee',
      clerkId: 'clerk_invitee',
      email: 'invitee@example.com',
    });
    invitee.referredByUserId = 'users_inviter';
    invitee.referralAppliedAt = 1_700_000_000_000;

    const inviteeWallet = walletDoc({
      id: 'wallet_invitee',
      userId: 'users_invitee',
      purchaserAccountId: 'purchaser_invitee',
      balance: 13,
    });

    const grant: ConvexDoc = {
      _id: 'tx_ref_1',
      walletId: 'wallet_invitee',
      type: 'referral_invitee_grant',
      amount: 10,
      createdAt: 1_700_000_000_000,
      status: 'posted',
      source: 'referral',
      idempotencyKey: 'referral_invitee:users_invitee',
      metadata: { inviterUserId: 'users_inviter', code: 'INVITE01' },
    };

    const ctx = createConvexTestCtx({
      identity: { subject: 'clerk_admin', email: 'admin@example.com' },
      tables: {
        users: [
          userDoc({
            id: 'users_admin',
            clerkId: 'clerk_admin',
            email: 'admin@example.com',
            role: 'admin',
          }),
          inviter,
          invitee,
        ],
        wallets: [inviteeWallet],
        wallet_transactions: [grant],
      },
    });

    const result = await handler(ctx, { limit: 20 });

    expect(result.stats).toEqual({
      totalSuccessfulReferrals: 1,
      totalReferrers: 1,
      rewardTokens: 10,
    });
    expect(result.topReferrers).toEqual([
      expect.objectContaining({
        email: 'inviter@example.com',
        successfulReferralCount: 1,
      }),
    ]);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      code: 'INVITE01',
      invitee: { email: 'invitee@example.com' },
      inviter: { email: 'inviter@example.com', successfulReferralCount: 1 },
    });
  });
});
