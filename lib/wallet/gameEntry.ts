import { getOrCreateInstallationId } from '@/lib/deviceInstallation';
import { isAuthDisabled } from '@/lib/authMode';

// ---------------------------------------------------------------------------
// Public result types
// ---------------------------------------------------------------------------

export type ReserveGameEntryResult =
  | { ok: true; reservationId: string }
  | { ok: false; error: string };

export type ConsumeGameEntryResult =
  | { ok: true }
  | { ok: false; error: string };

export type RefundGameEntryResult =
  | { ok: true; balance?: number }
  | { ok: false; error: string };

export type AdjustGameEntryReservationResult =
  | { ok: true; balance?: number }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Mutation argument shapes
// ---------------------------------------------------------------------------

export interface ReserveGameEntryArgs {
  mode: string;
  deviceId?: string;
  clientSessionId: string;
  cost?: number;
}

export interface ReserveGameEntryResponse {
  ok: boolean;
  reservationId?: string;
  error?: string;
  balance?: number;
}

export interface ConsumeGameEntryArgs {
  reservationId: string;
  completedSessionId: string;
}

export interface ConsumeGameEntryResponse {
  ok: boolean;
  error?: string;
}

export interface RefundGameEntryArgs {
  reservationId: string;
  reason: string;
}

export interface RefundGameEntryResponse {
  ok: boolean;
  error?: string;
  balance?: number;
}

export interface AdjustEntryReservationArgs {
  reservationId: string;
  additionalCost: number;
}

export interface AdjustEntryReservationResponse {
  ok: boolean;
  error?: string;
  balance?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Reserve tokens for a game entry on Convex.
 *
 * When `isAuthDisabled()` is true the function returns a local dummy
 * reservation so the calling code does not need separate branches.
 *
 * @param mutation  Mutation function obtained via `useMutation(api.wallet.reserveGameEntry)`.
 * @param params    `{ mode, clientSessionId, cost }`
 */
export async function reserveGameEntry(
  mutation: (args: ReserveGameEntryArgs) => Promise<ReserveGameEntryResponse>,
  params: { mode: string; clientSessionId: string; cost: number }
): Promise<ReserveGameEntryResult> {
  if (isAuthDisabled()) {
    return { ok: true, reservationId: `local_${params.clientSessionId}` };
  }

  const deviceId = await getOrCreateInstallationId();
  const result = await mutation({
    mode: params.mode,
    deviceId,
    clientSessionId: params.clientSessionId,
    cost: params.cost,
  });

  if (!result.ok) {
    return { ok: false, error: result.error ?? 'insufficient_balance' };
  }

  return { ok: true, reservationId: result.reservationId! };
}

/**
 * Mark a reserved entry as consumed (game completed normally).
 *
 * No-op when auth is disabled.
 */
export async function consumeGameEntry(
  mutation: (args: ConsumeGameEntryArgs) => Promise<ConsumeGameEntryResponse>,
  params: { reservationId: string; completedSessionId: string }
): Promise<ConsumeGameEntryResult> {
  if (isAuthDisabled()) {
    return { ok: true };
  }

  const result = await mutation(params);
  if (!result.ok) {
    return { ok: false, error: result.error ?? 'consume_failed' };
  }
  return { ok: true };
}

/**
 * Refund a reserved entry (game abandoned before completion).
 *
 * No-op when auth is disabled.
 */
export async function refundGameEntry(
  mutation: (args: RefundGameEntryArgs) => Promise<RefundGameEntryResponse>,
  params: { reservationId: string; reason: string }
): Promise<RefundGameEntryResult> {
  if (isAuthDisabled()) {
    return { ok: true };
  }

  const result = await mutation(params);
  if (!result.ok) {
    return { ok: false, error: result.error ?? 'refund_failed' };
  }
  return { ok: true, balance: result.balance };
}

/**
 * Increase a reserved entry cost (e.g. Quick Play topic-count delta).
 *
 * No-op when auth is disabled or `additionalCost` is zero.
 */
export async function adjustGameEntryReservation(
  mutation: (args: AdjustEntryReservationArgs) => Promise<AdjustEntryReservationResponse>,
  params: { reservationId: string; additionalCost: number }
): Promise<AdjustGameEntryReservationResult> {
  if (isAuthDisabled() || params.additionalCost <= 0) {
    return { ok: true };
  }

  const result = await mutation(params);
  if (!result.ok) {
    return { ok: false, error: result.error ?? 'adjust_failed' };
  }
  return { ok: true, balance: result.balance };
}

/**
 * Refund a reserved entry and reset play session state (game abandoned).
 */
export async function abandonGameEntry(
  refundMutation: (args: RefundGameEntryArgs) => Promise<RefundGameEntryResponse>,
  params: {
    reservationId: string | null;
    reason: string;
    resetSession: () => void;
  }
): Promise<void> {
  if (params.reservationId) {
    await refundGameEntry(refundMutation, {
      reservationId: params.reservationId,
      reason: params.reason,
    }).catch(() => {
      // Non-fatal - server-side TTL will eventually release the hold.
    });
  }
  params.resetSession();
}
