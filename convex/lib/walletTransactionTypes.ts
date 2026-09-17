/**
 * Canonical `wallet_transactions` source and type values.
 *
 * Single source of truth for the admin Transactions ledger filters and the
 * backend validators. Every `wallet_transactions` insert in the codebase emits
 * one of these values (see convex/wallet.ts, convex/promo.ts, convex/payments.ts,
 * convex/lib/grantConsumablePurchase.ts, convex/lib/purchaserAccountMerge.ts,
 * convex/lib/accountDeletion.ts, convex/admin.ts, convex/seed.ts, convex/users.ts),
 * so the admin ledger can filter accurately without duplicated magic strings.
 */

export const WALLET_TRANSACTION_SOURCES = [
  'purchase',
  'gameplay',
  'system',
  'admin',
  'promo',
  'referral',
  'account_deletion',
] as const;

export type WalletTransactionSource = (typeof WALLET_TRANSACTION_SOURCES)[number];

export const WALLET_TRANSACTION_SOURCE_LABELS = {
  purchase: 'Purchase',
  gameplay: 'Gameplay',
  system: 'System',
  admin: 'Admin',
  promo: 'Promo',
  referral: 'Referral',
  account_deletion: 'Account Deletion',
} as const satisfies Record<WalletTransactionSource, string>;

export const WALLET_TRANSACTION_TYPES = [
  'purchase_grant',
  'purchase_reversal',
  'admin_adjustment',
  'starter_grant',
  'game_entry_reserve',
  'game_entry_adjust',
  'promo_redemption',
  'referral_invitee_grant',
  'referral_inviter_grant',
  'account_merge_debit',
  'account_merge_credit',
  'account_deletion_forfeit',
] as const;

export type WalletTransactionType = (typeof WALLET_TRANSACTION_TYPES)[number];
