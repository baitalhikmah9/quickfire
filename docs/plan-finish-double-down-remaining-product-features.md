# Plan: Finish Double Down Remaining Product Features

## Summary
Finish the unchecked scope in `docs/double-down-full-product-plan.md` in TDD-first slices. The remaining work breaks into backend integrity, auth/device/offline sync, advanced gameplay, economy/store/admin, profile/history, and release hardening.

Locked decisions:
- Device binding: pragmatic account + generated install ID stored with Expo SecureStore.
- Admin portal: separate web app in this repo, backed by Convex admin functions.
- Telemetry: Sentry for crash/error reporting plus an internal analytics abstraction.

References used:
- Expo SecureStore docs: https://docs.expo.dev/versions/latest/sdk/securestore/
- Expo Sentry guide: https://docs.expo.dev/guides/using-sentry/

## TDD Protocol
Every feature slice starts with the smallest failing test:
1. Add or update Jest tests for pure rules, stores, serialization, and UI behavior.
2. Add Convex helper tests around pure ledger/content/session logic before wrapping in Convex functions.
3. Implement the smallest production code to pass.
4. Run the nearest target first: targeted Jest file, then `bun test`, then typecheck/lint where relevant.
5. Add broader smoke coverage only after core behavior passes.

No production change should land without at least one behavior-focused regression test unless the slice is purely visual or config-only.

## Public Types And Interfaces
Update `features/shared/types.ts`:
- Add `rapidFire` to `GameMode`.
- Add `RapidFireState`, `ManualScoreAdjustment`, `DeviceInstallation`, `SessionSavePayload`, `OfflineSessionQueueItem`.
- Expand `ScoreEvent` to include:
  - `reason: 'standard' | 'steal' | 'wager' | 'lifeline' | 'hotSeat' | 'overtimeSurge' | 'manualAdjustment'`
  - `questionId?`, `turnIndex`, `createdAt`, `metadata?`.
- Add lifeline state:
  - per-team remaining counts
  - active lifeline id
  - point multiplier after `answerRewards`.
- Add overtime state:
  - `surgeQuestionId`
  - `triggeringTeamId`
  - `challengedTeamId`
  - `challengeTopicIds`
  - `status: 'inactive' | 'armed' | 'challengePending' | 'completed'`.
- Manual score adjustment can make scores negative, matching wager penalty behavior.

Update `store/gameSessionPersistence.ts` schemas in the same PR as type changes so resume never drops new state.

## Phase 1: Backend Integrity And No-Repeat Content
Tests first:
- `__tests__/convex/contentRules.test.ts`
  - excludes device-asked canonical keys
  - falls back to full pool when exhausted
  - preserves locale fallback order
  - returns deterministic seeded pools.
- `__tests__/store/gameSessionPersistence.test.ts`
  - round-trips new score events, rapid-fire, overtime, and manual adjustment fields.

Implementation:
- Add Convex tables:
  - `device_installations`: `deviceId`, `userId`, `platform`, `appVersion`, `firstSeenAt`, `lastSeenAt`.
  - `device_question_history`: `deviceId`, `canonicalKey`, `questionId?`, `categoryId`, `sessionId?`, `askedAt`.
  - `score_events`: `sessionId`, `teamId`, `points`, `reason`, `questionId?`, `turnIndex`, `createdAt`, `metadata?`.
- Add `hiddenMultiplier?: number` or `isOvertimeSurge?: boolean` to `questions`.
- Add Convex functions:
  - `devices.registerInstallation({ deviceId, platform, appVersion })`
  - `content.getUnaskedQuestions({ deviceId, mode, categoryIds, localeChain, limit, seed })`
  - `content.recordAskedQuestions({ deviceId, sessionId, questionKeys })`
- Keep random selection server-compatible and deterministic by using seeded helper functions, not `Math.random`.

Acceptance:
- Same-session used question protection remains local and strict.
- Cross-session question history is enforced by device ID.
- Exhausted pools still allow play by falling back to the full active pool.

## Phase 2: Wallet Ledger, Promo Codes, And Game Entry Tokens
Tests first:
- `__tests__/convex/walletLedger.test.ts`
  - idempotent starter grants
  - no balance mutation without transaction
  - reserve, consume, and refund lifecycle
  - no double consume/refund.
- `__tests__/convex/promoRules.test.ts`
  - case-insensitive redemption
  - inactive/expired/redeemed/usage-cap failures
  - transaction created exactly once.

Implementation:
- Add wallet fields:
  - `wallet_transactions.idempotencyKey`
  - `wallet_transactions.status`
  - `wallet_transactions.sessionId?`
  - indexes by wallet, idempotency key, and created time.
- Add promo fields:
  - `promo_codes.usedCount`
  - `promo_codes.perUserLimit`
  - `promo_codes.active`
  - `promo_codes.metadata?`.
- Add Convex functions:
  - `wallet.getBalance()`
  - `wallet.grantStarterBalance({ deviceId })`
  - `wallet.reserveGameEntry({ mode, deviceId, clientSessionId })`
  - `wallet.consumeEntry({ reservationId, completedSessionId })`
  - `wallet.refundEntry({ reservationId, reason })`
  - `promo.redeemCode({ code })`.
- Replace local `usePlayStore.tokens` mutations with Convex-backed wallet reads/mutations when signed in.
- Keep a local read-through display fallback only while wallet query loads, never as the source of truth.

Acceptance:
- Starting a game reserves tokens before entering board.
- Completing consumes reservation.
- Abandoning setup or failed session start refunds reservation.
- Store bundles remain disabled copy-only because real purchases are deferred.

## Phase 3: Auth Gate, Device Registration, And Offline Sync
Tests first:
- `__tests__/lib/deviceInstallation.test.ts`
  - creates one install ID
  - reuses stored ID
  - recovers from corrupt storage.
- `__tests__/store/offlineSessionQueue.test.ts`
  - queues completed sessions offline
  - flushes once when online/authenticated
  - preserves failed flush items.
- RTL route tests:
  - unauthenticated play/store/profile paths redirect or show auth gate
  - public how-to-play remains accessible.

Implementation:
- Add `lib/deviceInstallation.ts` using `expo-secure-store`.
- Register installation after Clerk and Convex are ready.
- Gate all game entry points:
  - `app/(app)/index.tsx` Play CTA
  - `app/(app)/play/*`
  - `app/(app)/store.tsx`
  - session resume paths.
- Public routes remain `app/index.tsx`, `app/how-to-play.tsx`, and `app/(auth)/*`.
- Add `store/offlineSessionQueue.ts` with persisted queue and flush helper.
- Add `sessions.saveCompletedSession({ clientSessionId, deviceId, session, scoreEvents })`.
- Add `sessions.listRecentSessions({ limit })`.

Acceptance:
- No unauthenticated user can enter any game lobby or spend/grant tokens.
- Signed-in users can finish a local session offline.
- Sync is idempotent after reconnect or app restart.

## Phase 4: Advanced Gameplay Engine
Tests first:
- `__tests__/store/play.random.test.ts`
- `__tests__/store/play.rumble.test.ts`
- `__tests__/store/play.hotSeat.test.ts`
- `__tests__/store/play.overtime.test.ts`
- `__tests__/store/play.manualScore.test.ts`
- Each file covers state transitions, score events, timers, persistence, and edge cases.

Implementation:
- Random mode:
  - 36-question board
  - wagers disabled
  - draw button starts yellow bouncing randomizer animation
  - selected tile lands green and all other tiles are disabled until turn resolution.
- Rumble:
  - allow 3 to 6 teams or individuals
  - 30s deliberation count-up
  - 15s primary answer window
  - 15s steal window for non-primary teams
  - first selected correct steal receives points.
- Hot Seat:
  - enabled only if each team has at least one non-empty player name
  - seeded assignment picks one player from current answering team
  - disables lifelines
  - uses 15s solo count-up timer.
- Lifelines:
  - `callAFriend`: consumes lifeline and opens helper overlay, no score change
  - `discard`: consumes lifeline, skips question with no points or steal
  - `answerRewards`: reveals first letter, word count, and answer length; correct answer awards 50% rounded to nearest 50.
- Overtime Surge:
  - one seeded hidden surge question per session
  - if a trailing team answers it correctly and takes the lead, old leader enters a one-question challenge from up to 3 remaining topics
  - correct challenge restores old leader as winner; wrong/no challenge keeps new leader.
- Manual score:
  - show `-50` and `+50` around each score wherever the score HUD appears
  - emit `ManualScoreAdjustment` score event.

Acceptance:
- Every mode listed in the PRD is playable on one device except Rapid Fire, which is handled in Phase 5.
- All random choices are seeded and testable.
- Score history explains every visible score change.

## Phase 5: Rapid Fire
Tests first:
- `__tests__/store/rapidFire.test.ts`
  - requires 5 topics
  - draws 10 unasked questions
  - 25s answer window and 5s reveal window
  - computes score and accuracy
  - persists signed-in run.
- Convex helper tests for rapid-fire submission idempotency.

Implementation:
- Add route group:
  - `app/(app)/rapid-fire/topics.tsx`
  - `app/(app)/rapid-fire/run.tsx`
  - `app/(app)/rapid-fire/results.tsx`.
- Add `features/rapid-fire/` for reducer, timer selectors, result summary.
- Add Convex functions:
  - `rapidFire.startRun({ deviceId, categoryIds })`
  - `rapidFire.submitRun({ runId, answers, durationMs })`
  - `rapidFire.listHistory({ limit })`.
- Token cost comes from Convex feature flag/config; default 1 token per run.

Acceptance:
- Rapid Fire is separate from board-game session state.
- Runs sync to profile history when signed in.
- Offline completed runs queue and sync like full sessions.

## Phase 6: Recap, Profile Progression, And Saved Preferences
Tests first:
- Recap component tests for winners, ties, score events, manual adjustments, lifeline use.
- Profile tests for empty history, populated history, rapid-fire stats, and wallet balance states.
- Convex tests for preference updates.

Implementation:
- Replace placeholder `app/(app)/game-recap.tsx`.
- Recap shows:
  - winner/tie
  - final scores
  - score event timeline
  - wagers/lifelines/hot seat/overtime summary
  - tokens spent/refunded status.
- Profile reads Convex:
  - recent sessions
  - rapid-fire history
  - win rate
  - accuracy
  - best streak
  - wallet balance.
- Save preferences through `users.updatePreferences`:
  - palette
  - UI locale
  - content locale priority
  - default mode/lifeline settings.

Acceptance:
- Placeholder profile activity is removed.
- Settings survive reinstall after sign-in because preferences sync from Convex.

## Phase 7: Separate Admin Web App
Tests first:
- `__tests__/admin/adminAccess.test.ts`
  - non-admin blocked
  - admin can generate tokens with reason
  - promo code validation.
- `__tests__/convex/adminRules.test.ts`
  - admin allowlist enforced server-side
  - token cap cannot be bypassed
  - promo usage caps are valid.

Implementation:
- Create `apps/admin` as a separate Vite React app.
- Add Bun workspace config without disturbing Expo app scripts.
- Admin dependencies:
  - React and React DOM matching root versions
  - Convex React
  - Clerk React
  - Vite and React plugin.
- Add Convex admin functions:
  - `admin.generateTokens({ userId, amount, reason, idempotencyKey })`
  - `admin.listPromoCodes({ cursor, limit })`
  - `admin.upsertPromoCode(...)`
  - `admin.setTokenCap({ userId, cap })`
  - `admin.searchUsers({ query })`.
- Add `requireAdmin(ctx)` in `convex/lib/auth.ts`, backed by a server-side Clerk ID allowlist env var plus optional `users.role`.
- Admin UI pages:
  - sign-in gate
  - user search
  - wallet adjustment form
  - promo code list/create/edit
  - audit transaction list.
- Deployment target: separate Vercel project or equivalent static hosting, with its own `VITE_CONVEX_URL` and Clerk publishable key.

Acceptance:
- No admin action is authorized by client-side checks alone.
- Every manual token change records immutable transaction metadata.

## Phase 8: Hardening, Telemetry, CI, And Release Prep
Tests first:
- Error boundary test captures thrown child error.
- Analytics wrapper tests assert event names/payload shape without sending network calls.
- Accessibility smoke tests for labels on score controls, randomizer, auth gates, store, admin forms.

Implementation:
- Add Sentry per Expo guidance, with source map env documented.
- Add `lib/analytics.ts`:
  - `trackEvent(name, payload)`
  - no-op default transport
  - typed event catalog for game/session/wallet/auth/admin events.
- Instrument key events:
  - sign in/up/out
  - game mode selected
  - game started/completed/queued/synced
  - token reserved/consumed/refunded
  - promo redeemed
  - admin token generated.
- Remove debug/agent fetch blocks from app code.
- Add CI:
  - install with frozen lockfile
  - `bun test`
  - TypeScript check
  - lint.
- Add Maestro smoke flows:
  - sign in/sign out
  - start and finish Classic
  - redeem promo code
  - complete Rapid Fire
  - reopen and restore unfinished session.
- Add App Store checklist doc:
  - privacy disclosures
  - Sentry data disclosure
  - no real-money token purchase claims
  - landscape/tablet checks
  - offline behavior notes.

Acceptance:
- Release build has crash reporting configured when DSN is present.
- Analytics has stable call sites without requiring a product analytics vendor.
- CI blocks regressions in tests, types, and lint.

## Implementation Order
1. Backend schema/helpers and persistence type expansion.
2. Wallet/promo/session Convex functions.
3. Auth gate, device registration, offline queue.
4. Advanced board modes and score event log.
5. Rapid Fire.
6. Recap/profile/preferences.
7. Separate admin web app.
8. Telemetry, CI, Maestro, release checklist.

This order minimizes rework: backend contracts land before UI, state serialization updates before new game state, and telemetry comes after event names stabilize.

## Assumptions And Defaults
- Existing Expo app remains landscape-first.
- Real-money purchases remain out of scope.
- Starter grant default is 5 tokens unless product copy already says otherwise.
- Game entry default is 1 token per Classic, Quick Play, Random, Rumble, and Rapid Fire run until Convex config changes it.
- Device binding is best-effort: SecureStore install ID plus Clerk account binding blocks normal abuse, but Android uninstall persistence is not guaranteed.
- Admin web app is part of this repo but deployed separately from the mobile app.
- New dependencies are added only when needed, through Bun lockfile updates, with no `@latest`, `npx`, or dependency refresh commands.
