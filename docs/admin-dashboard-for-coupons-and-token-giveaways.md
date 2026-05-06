# Admin Dashboard For Coupons And Token Giveaways

## Summary

Build a desktop-first admin dashboard inside the existing Expo Router app as a web-only admin route, backed by Convex admin functions. V1 focuses on token promo codes and direct token grants, with existing Clerk auth, Convex `requireAdmin`, immutable wallet ledger entries, and actor/reason audit records for every privileged action.

Current repo state:
- Auth: Clerk + Convex already wired.
- Backend: `users.role`, `requireAdmin`, `wallets`, `wallet_transactions`, `promo_codes`, `promo_redemptions`, `promo.redeemCode`, and partial `convex/admin.ts` already exist.
- Gap: no admin UI, no admin promo-code CRUD/listing, no campaign overview, and the mobile store still has local demo voucher/token logic.

## Scope

In scope:
- Web admin dashboard for operators.
- Promo code creation, listing, filtering, disabling, and detail view.
- Manual token grants or debits to a wallet.
- Wallet lookup by user email, Clerk user id, or purchaser account id.
- Audit trail through `wallet_transactions.adminActorUserId`, `source`, `metadata.reason`, and promo redemption records.
- Tests for admin authorization, promo validation, ledger invariants, and dashboard rendering.

Out of scope for v1:
- Discounted real-money checkout coupons.
- Affiliate payout tracking.
- CSV export/import.
- Multi-role approvals.
- Analytics beyond basic counts and redemption history.
- New dependency-heavy charting or admin framework.

## Admin Surface

Add a web-only admin route group:

- `app/(admin)/_layout.tsx`
- `app/(admin)/index.tsx`
- `app/(admin)/promo-codes.tsx`
- `app/(admin)/promo-codes/[promoCodeId].tsx`
- `app/(admin)/wallets.tsx`
- `app/(admin)/wallets/[walletId].tsx`

Route behavior:
- Root stack registers `(admin)`.
- Admin layout checks Clerk auth state.
- If signed out, redirect to `/(auth)/sign-in`.
- If signed in but not admin, show a `403` screen.
- On native platforms, show an unsupported screen: “Admin dashboard is available on web.”
- Admin routes are not linked from normal mobile navigation.

UI structure:
- Dense desktop dashboard, not a marketing page.
- Left rail: Overview, Promo Codes, Wallets, Transactions.
- Top bar: signed-in admin identity, environment label, refresh action.
- No nested cards; use tables, panels, dividers, compact forms, and clear empty/error/loading states.
- Use installed icon library only after checking `package.json`; current repo has `@expo/vector-icons`, so use that unless another icon package already exists.

## Backend Interfaces

Extend `convex/admin.ts` with admin-only functions. All handlers call `requireAdmin(ctx)` first.

### Promo Code Queries

`admin.listPromoCodes`
```ts
args: {
  status?: 'active' | 'inactive' | 'expired' | 'scheduled' | 'exhausted';
  query?: string;
  cursor?: number;
  limit?: number;
}
returns: {
  items: Array<{
    _id: Id<'promo_codes'>;
    code: string;
    rewardType: string;
    rewardAmount: number;
    usageCap: number;
    usedCount: number;
    perUserLimit: number;
    active: boolean;
    activeFrom?: number;
    activeTo?: number;
    createdAt?: number;
    updatedAt?: number;
    status: string;
  }>;
  nextCursor: number | null;
}
```

`admin.getPromoCode`
```ts
args: { promoCodeId: Id<'promo_codes'> }
returns: {
  promoCode: Doc<'promo_codes'>;
  redemptions: Array<{
    redemption: Doc<'promo_redemptions'>;
    user: Pick<Doc<'users'>, '_id' | 'email' | 'name' | 'clerkId'> | null;
    transaction: Doc<'wallet_transactions'> | null;
  }>;
}
```

### Promo Code Mutations

`admin.createPromoCode`
```ts
args: {
  code: string;
  rewardAmount: number;
  usageCap: number;
  perUserLimit?: number;
  activeFrom?: number;
  activeTo?: number;
  metadata?: {
    campaignName?: string;
    notes?: string;
  };
}
returns: { promoCodeId: Id<'promo_codes'> }
```

Rules:
- Normalize code with existing `normalizePromoCode`.
- Reject empty codes, negative/zero reward amounts, negative caps, and duplicate codes.
- Default `rewardType` to `tokens`.
- Default `usedCount` to `0`.
- Default `active` to `true`.
- Store admin creator metadata if schema is extended; otherwise store it in `metadata`.

`admin.updatePromoCode`
```ts
args: {
  promoCodeId: Id<'promo_codes'>;
  rewardAmount?: number;
  usageCap?: number;
  perUserLimit?: number;
  activeFrom?: number;
  activeTo?: number;
  active?: boolean;
  metadata?: {
    campaignName?: string;
    notes?: string;
  };
}
returns: { promoCodeId: Id<'promo_codes'> }
```

Rules:
- Do not allow changing `code`.
- Do not allow lowering `usageCap` below `usedCount`.
- Do not allow changing `rewardAmount` after first redemption unless no redemptions exist.

`admin.deactivatePromoCode`
```ts
args: {
  promoCodeId: Id<'promo_codes'>;
  reason: string;
}
returns: { promoCodeId: Id<'promo_codes'> }
```

Rules:
- Sets `active: false`.
- Adds reason to `metadata.deactivationReason`.
- Does not delete the record.

### Wallet Queries And Mutations

Keep existing `admin.adjustWallet`, but harden it:

```ts
args: {
  purchaserAccountId: string;
  amount: number;
  reason: string;
  idempotencyKey?: string;
}
returns: { balance: number; transactionId: Id<'wallet_transactions'> }
```

Rules:
- Reject `amount === 0`.
- Require a non-empty reason.
- Prevent resulting negative balance unless explicitly supporting admin debit with enough current balance.
- Insert `wallet_transactions` before patching wallet.
- Include `adminActorUserId`, `source: 'admin'`, `type: 'admin_adjustment'`, `status: 'posted'`, and metadata `{ reason }`.
- Use idempotency if provided.

Add `admin.searchWallets`
```ts
args: {
  query: string;
  limit?: number;
}
returns: Array<{
  wallet: Doc<'wallets'>;
  user: Pick<Doc<'users'>, '_id' | 'email' | 'name' | 'clerkId'> | null;
  recentTransactions: Doc<'wallet_transactions'>[];
}>
```

Add `admin.listWalletTransactions`
```ts
args: {
  walletId?: Id<'wallets'>;
  type?: string;
  cursor?: number;
  limit?: number;
}
returns: {
  items: Doc<'wallet_transactions'>[];
  nextCursor: number | null;
}
```

## Schema Changes

Add optional metadata fields only if needed for clean audit/search:

`promo_codes`
- `createdAt?: number`
- `updatedAt?: number`
- `createdByAdminUserId?: Id<'users'>`
- `updatedByAdminUserId?: Id<'users'>`

No migration is required for existing records because fields are optional. Existing records should render with fallback timestamps/status.

## Dashboard Workflows

### Create Promo Code

1. Admin opens Promo Codes.
2. Clicks Create.
3. Enters code, token amount, usage cap, per-user cap, optional active window, campaign name, notes.
4. Submit calls `admin.createPromoCode`.
5. UI shows created code in list with status and redemption count.

### Disable Promo Code

1. Admin opens promo code detail.
2. Clicks Disable.
3. Enters required reason.
4. Submit calls `admin.deactivatePromoCode`.
5. Code can no longer be redeemed by `promo.redeemCode`.

### Manual Token Grant

1. Admin opens Wallets.
2. Searches by email, Clerk id, or purchaser account id.
3. Opens wallet detail.
4. Enters positive token amount and reason.
5. Submit calls hardened `admin.adjustWallet`.
6. Wallet balance updates and a ledger row appears with admin actor and reason.

### Manual Token Debit

1. Same as grant, but amount is negative.
2. Mutation rejects if it would make balance negative.
3. Ledger records the negative adjustment if allowed.

## Store Integration Follow-Up

After admin backend is stable, replace local demo voucher logic in `app/(app)/store.tsx`:

- Use `api.wallet.getBalance` for displayed balance.
- Use `api.promo.redeemCode` for voucher redemption.
- Remove direct `usePlayStore.grantTokens` from store redemption.
- Keep local play token state only as a temporary bridge until gameplay wallet wiring is complete.

This can be a separate implementation phase because the admin dashboard can be built and tested first against Convex functions.

## Test Plan

Use TDD for implementation.

Before production edits:
- Add failing tests and record RED evidence:
```bash
python3 ~/.agents/scripts/tdd_evidence.py record-red --task admin-dashboard --command "bun test __tests__/convex/admin.test.ts"
```

Backend tests:
- `requireAdmin` blocks non-admin users from every admin query/mutation.
- Admin can create a valid token promo code.
- Duplicate promo code is rejected after normalization.
- Promo code list derives `active`, `scheduled`, `expired`, and `exhausted` statuses.
- Promo code cannot lower cap below `usedCount`.
- Reward amount cannot change after redemption.
- Deactivation prevents future redemption.
- Manual grant inserts exactly one `wallet_transactions` row and patches balance.
- Manual debit cannot make balance negative.
- Adjustment requires a reason.
- Idempotent adjustment does not double-grant.

Frontend tests:
- Admin layout redirects signed-out users.
- Non-admin users see `403`.
- Native platform renders unsupported admin dashboard message.
- Promo list renders loading, empty, error, and populated states.
- Create promo form validates code, reward amount, usage cap, and date range.
- Wallet search renders result rows and empty state.
- Grant form requires amount and reason.

Verification commands:
```bash
bun test __tests__/convex/admin.test.ts
bun test __tests__/app/admin.test.tsx
bun run lint
bunx tsc --noEmit
python3 ~/.agents/scripts/tdd_evidence.py record-green --task admin-dashboard --command "bun test __tests__/convex/admin.test.ts __tests__/app/admin.test.tsx"
```

If `bunx` is unavailable or violates local supply-chain policy, use the repo’s installed TypeScript binary through the package manager already configured in the project.

## Acceptance Criteria

- Admin dashboard is accessible on web at an admin route and not part of normal mobile user navigation.
- Non-admin users cannot read or mutate admin data from Convex, even if they know function names.
- Admins can create, view, filter, and deactivate token promo codes.
- Admins can grant or debit wallet tokens with required reasons.
- Every admin token change creates an immutable wallet transaction.
- Promo redemptions remain capped by usage cap, active window, and per-user limit.
- Existing `promo.redeemCode` keeps working for users.
- No client-side token grant is introduced for privileged operations.
- Tests cover authorization, validation, ledger integrity, and core UI states.

## Assumptions And Defaults

- “Coupon” in v1 means token promo code, not checkout discount.
- First admin user is assigned by manually setting `users.role = 'admin'` in Convex for the owner account before using the dashboard.
- V1 uses the existing `role: 'admin'` model, not multi-role RBAC.
- V1 stores all giveaway audit history in existing wallet ledger and promo redemption tables.
- No new package is added unless existing Expo/React Native primitives cannot reasonably support the UI.
- Dashboard is desktop-first but responsive enough not to break on smaller web viewports.
