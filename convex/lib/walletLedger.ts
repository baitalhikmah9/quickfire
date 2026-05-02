/**
 * Pure wallet reservation rules for tests and server validation.
 */

export type ReservationStatus = 'reserved' | 'consumed' | 'refunded';

export const STARTER_GRANT_AMOUNT = 100;

export function isStarterGrantDuplicate(existingIdempotencyKeys: Set<string>, key: string): boolean {
  return existingIdempotencyKeys.has(key);
}

export function applyStarterGrantToBalance(
  balance: number,
  alreadyGranted: boolean
): { granted: boolean; balance: number } {
  if (alreadyGranted) return { granted: false, balance };
  return { granted: true, balance: balance + STARTER_GRANT_AMOUNT };
}

export function tryReserveFromBalance(
  balance: number,
  cost: number
): { ok: true; balanceAfter: number } | { ok: false; reason: 'insufficient_balance' } {
  if (cost < 0) return { ok: false, reason: 'insufficient_balance' };
  if (balance < cost) return { ok: false, reason: 'insufficient_balance' };
  return { ok: true, balanceAfter: balance - cost };
}

export function applyRefundToBalance(balance: number, refundAmount: number): number {
  return balance + refundAmount;
}

export function canConsumeReservation(status: ReservationStatus | undefined): boolean {
  return status === 'reserved';
}

export function canRefundReservation(status: ReservationStatus | undefined): boolean {
  return status === 'reserved';
}
