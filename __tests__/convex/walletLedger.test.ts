import { describe, expect, it } from '@jest/globals';
import {
  applyRefundToBalance,
  canConsumeReservation,
  canRefundReservation,
  isStarterGrantDuplicate,
  tryReserveFromBalance,
} from '@/convex/lib/walletLedger';

describe('walletLedger', () => {
  it('detects idempotent starter grants', () => {
    const keys = new Set(['starter:user_a']);
    expect(isStarterGrantDuplicate(keys, 'starter:user_a')).toBe(true);
    expect(isStarterGrantDuplicate(keys, 'starter:user_b')).toBe(false);
  });

  it('does not reserve without sufficient balance', () => {
    expect(tryReserveFromBalance(0, 1)).toEqual({ ok: false, reason: 'insufficient_balance' });
    expect(tryReserveFromBalance(2, 2)).toEqual({ ok: true, balanceAfter: 0 });
  });

  it('supports reserve, consume, and refund guards', () => {
    expect(canConsumeReservation('reserved')).toBe(true);
    expect(canConsumeReservation('consumed')).toBe(false);
    expect(canRefundReservation('reserved')).toBe(true);
    expect(canRefundReservation('refunded')).toBe(false);
  });

  it('refunds increase balance', () => {
    expect(applyRefundToBalance(3, 1)).toBe(4);
  });

  it('rejects negative cost reserves', () => {
    expect(tryReserveFromBalance(10, -1).ok).toBe(false);
  });
});
