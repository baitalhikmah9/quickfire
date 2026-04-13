# Double Down Full Product Plan

## Summary
- Build Double Down from the current Expo template in [docs/CODEBASE_MAP.md](/Users/mikhail/Documents/CURSOR%20CODES/In%20Progress/doubledown/docs/CODEBASE_MAP.md) into a full product with local-first gameplay, account-backed sync, token ledger, promo code redemption, and content expansion.
- Locked decisions: full product scope, `Clerk` for auth, `Convex` for backend/data, local shared-device multiplayer for v1, English-first release, real-money purchases deferred to a later phase.
- Starting point: the repo is still template-level UI with placeholder tabs and a minimal auth store; no domain model, backend integration, or gameplay engine exists yet.

## Architecture
1. [x] Replace the current tab-only shell with Expo Router groups: `app/(public)` for landing/how-to-play, `app/(auth)` for sign-in/sign-up/forgot-password, `app/(app)` for home/play/store/profile, and modal routes for rules, theme picker, lobby settings, and game recap.
2. [x] In `app/_layout.tsx`, mount `ClerkProvider` with token cache, then `ConvexProviderWithClerk`, then `SafeAreaProvider`, then app navigation. This follows Clerk’s Expo quickstart and Convex’s Clerk integration pattern: https://clerk.com/docs/expo/getting-started/quickstart and https://docs.convex.dev/auth/clerk.
3. [x] Keep `Zustand` only for ephemeral client UI state that should not live on the backend: current lobby draft, selected theme palette, in-progress local session reducer, transient timers, and unsynced offline results queue.
4. [x] Use `Convex` as the system of record for authenticated data: user profile mirror, token wallet balance, wallet transactions, promo codes/redemptions, persisted game history, rapid-fire stats, feature flags, and normalized question content.
5. [x] Preserve `React Query` only for non-Convex async integrations later; do not use it for Convex-backed domain data. Convex hooks become the default for app data reads/writes.
6. [x] Introduce feature-first folders under `features/`: `auth`, `content`, `lobby`, `gameplay`, `wallet`, `promo`, `profile`, `settings`, and `shared`. Keep presentational components in `components/ui` and shared hooks/utilities in `lib/`.
7. [x] Expand the current constants theme into semantic design tokens with 4 light palettes (Blue, Orange, Green, Red) plus a Dark mode, landscape-required layouts for all mobile game screens, and landscape-optimized board layouts on tablets. All text must remain legible across every palette. Non-game screens remain portrait-friendly.

## Domain Model And Backend
- [x] Normalize [constants/questions.json](/Users/mikhail/Documents/CURSOR%20CODES/In%20Progress/doubledown/constants/questions.json) into one-question-per-record seed data. The current grouped `questionAndanswer` shape is not suitable as the long-term source of truth.
- Convex tables:
  - [x] `users`: Clerk-linked profile mirror, preferences, last active timestamp.
  - [x] `categories`: id, slug, title, theme group, artwork, enabled flag.
  - [x] `questions`: category ref, prompt, answer, point value, difficulty tier, tags, locale, status. _([ ] hidden_multiplier for Overtime Surge)_
  - [x] `game_sessions`: mode, config snapshot, seed, started/ended timestamps, winning team, persisted only for signed-in or opted-in users.
  - [x] `game_participants`: session ref, team id, player name, hot-seat eligibility, final score stats.
  - [x] `rapid_fire_runs`: user ref, selected categories, score, answer accuracy, duration.
  - [x] `wallets`: one wallet per user with current token balance.
  - [x] `wallet_transactions`: immutable ledger entries for grants, spends, reversals, redemptions, future IAP credits.
  - [x] `promo_codes`: code, reward type, reward amount, usage cap, active window, backend-only metadata.
  - [x] `promo_redemptions`: code ref, user ref, redeemed-at, resulting transaction ref.
  - [x] `feature_flags`: rollout toggles for unreleased modes or mechanics.
  - [ ] `device_question_history`: device id, question ref, asked-at timestamp. Used to enforce cross-session no-repeat question selection.
- Convex functions:
  - [x] `users.getCurrentProfile`, `users.upsertOnFirstSignIn`
  - [x] `content.listPlayableCategories`, `content.getModeQuestionPool`
  - [ ] `wallet.getBalance`, `wallet.grantStarterBalance`, `wallet.reserveGameEntry`, `wallet.consumeEntry`, `wallet.refundEntry`
  - [ ] `promo.redeemCode`
  - [ ] `content.getUnaskedQuestions` — returns questions not yet in `device_question_history` for a given device; falls back to full pool if pool is exhausted
  - [ ] `admin.generateTokens`, `admin.listPromoCodes`, `admin.setTokenCap` — backend functions powering the token administration portal
  - [ ] `sessions.saveCompletedSession`, `sessions.listRecentSessions`
  - [ ] `rapidFire.startRun`, `rapidFire.submitRun`, `rapidFire.listHistory`
- [x] Add an internal seed/import path for question content. v1 uses JSON-driven imports only; no in-app CMS.

## Client Interfaces And Game Engine
- [x] Core exported types:
  - `GameMode = 'classic' | 'quickPlay' | 'random' | 'rumble' | 'rapidFire'`
  - `GameConfig`, `TeamConfig`, `PlayerConfig`, `LifelineConfig`
  - `QuestionCard`, `QuestionAttempt`, `WagerRoll`, `HotSeatAssignment`
  - `GameSessionState`, `TurnPhase`, `ScoreEvent`, `OvertimeState`, `RapidFireState`, `ManualScoreAdjustment`
  - `WalletBalance`, `WalletTransaction`, `PromoRedemptionResult`
- [x] Build gameplay as a deterministic reducer plus selectors, not ad hoc component state. State transitions should be explicit: `lobby -> categorySelection -> wagerDecision -> questionReveal -> deliberation -> answerLock -> stealWindow -> scoring -> overtimeCheck -> completed`.
- [x] Use a session seed for all random choices so Wager and Random mode selections are reproducible and testable.
- Rules implementation defaults:
  - [x] Classic: fixed 36-cell board from selected categories, wagers enabled.
  - [x] Quick Play: same engine with smaller board and faster defaults.
  - [ ] Random: 36 questions selected by randomizer animation, wagers disabled. _(mode route, random draw, and wager disablement are done; randomizer animation still open)_
  - [ ] Rumble: 36 questions; 3+ teams or individuals, 30s deliberation, 15s primary answer, 15s steal.
  - [ ] Rapid Fire: player selects 5 topics; 10 random questions drawn from the question bank. 25s per question, then 5s answer-reveal window. Token cost configurable, per-run stat persistence for signed-in users.
  - [ ] Hot Seat: only available when player names are entered; disables lifelines during the turn. Hot Seat opponent has 15s to answer.
  - [ ] Overtime Surge: one question per game has a hidden multiplier. If the losing team answers it correctly and takes the lead, the old winning team must immediately pick from the 3 remaining topics on the board and get it right to reclaim victory.
  - [ ] Manual score adjustment: ±50 buttons displayed to the left and right of each team's score at all times during a game. Emits a `ManualScoreAdjustment` event into the score log.
- [ ] Account requirement: an account is required to play any game mode. This prevents free-token abuse (download → claim → delete cycle). Device ID is also recorded so starter token eligibility is bound to the device even across reinstalls.
- [ ] Offline behavior: signed-in users can play offline; completed sessions queue locally and sync when connectivity returns. The app must enforce authentication before entering any game lobby.

## Delivery Phases
1. [x] Foundation: replace template routes, wire Clerk + Convex providers, create app shell, theme system, env contracts, and feature folder structure.
2. [x] Content layer: normalize question data, create Convex schema/functions, add seed import tooling, expose category/question queries, and build artwork/category cards from current assets.
3. [x] Gameplay MVP: implement lobby builder, team/player setup, board rendering, deterministic game reducer, timers, scorekeeping, used-question tracking, Classic and Quick Play.
4. [ ] Advanced modes: add Random, Rumble, Rapid Fire, Wager flow, Hot Seat, lifelines, overtime surge, recap screen, and local persistence/resume. _(Wager flow, lifeline setup/display, and local persistence/resume are done; remaining modes and recap depth still open)_
5. [ ] Account and progression: add Clerk auth screens (required for all game access), profile sync, device ID binding for starter tokens, history, rapid-fire stats, and saved preferences. _(Clerk auth screens and profile mirror are done; auth-gated gameplay, device binding, history, rapid-fire stats, and saved preferences still open)_
6. [ ] Economy without payments: implement wallet ledger, device-bound starter token grants, game entry spends/refunds, promo code redemption, store UI with disabled “coming soon” purchase bundles, compliance-safe copy, and the online admin token portal (generate, list, cap tokens).
7. [ ] Hardening and release prep: crash/error tracking, analytics events, accessibility pass, tablet/phone QA, performance tuning, CI, and app-store submission checklist.

## Tests And Acceptance
- Unit tests:
  - reducer transitions for every `TurnPhase`
  - score math for wagers, steals, lifelines, hot seat, and overtime
  - randomizer seed determinism, no-repeat within session, and no-repeat across sessions (device_question_history lookup)
  - wallet ledger invariants and promo redemption rules
- Integration tests with RTL and mocked providers:
  - guest local game from lobby to recap
  - signed-in user resumes synced history
  - promo code redemption updates balance and transaction feed
  - rapid-fire run records correct score and token spend
  - auth gating blocks all game modes for unauthenticated users
- E2E smoke tests with Maestro:
  - sign up / sign in / sign out
  - create local Classic game and finish one full session
  - redeem promo code
  - complete Rapid Fire run
  - reopen app and restore unfinished local session
- Acceptance criteria:
  - every mode in the PRD is playable on one device
  - used questions never repeat within the same session
  - questions already asked on the device are excluded from future draws (device_question_history)
  - token ledger never mutates balance without a corresponding immutable transaction
  - unauthenticated users cannot access any game lobby; all modes are auth-gated
  - game screens force landscape orientation on mobile; layout matches Seen Jeem reference
  - animation for Wager, Random mode, and any randomised selection is yellow-bouncing then green-landing

## Assumptions And Defaults
- English ships first, but all content and copy paths must be localization-ready for later Arabic and RTL support.
- All game modes require authentication. There is no guest play path. Device ID is recorded at first launch and bound to starter token grants so reinstalling the app does not reset eligibility.
- Real-money token purchases are out of scope for this implementation plan. The wallet/store data model is built now so StoreKit / Play Billing can plug in later. This is intentional because digital goods on iOS require in-app purchase handling and server coordination: https://developer.apple.com/app-store/review/guidelines/ and https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/overview-for-configuring-in-app-purchases/
- v1 multiplayer means shared-device local sessions, not live remote rooms.
- Existing files that will be heavily refactored first are [app/_layout.tsx](/Users/mikhail/Documents/CURSOR%20CODES/In%20Progress/doubledown/app/_layout.tsx), [app/(tabs)/_layout.tsx](/Users/mikhail/Documents/CURSOR%20CODES/In%20Progress/doubledown/app/%28tabs%29/_layout.tsx), [app/(tabs)/index.tsx](/Users/mikhail/Documents/CURSOR%20CODES/In%20Progress/doubledown/app/%28tabs%29/index.tsx), [app/(tabs)/profile.tsx](/Users/mikhail/Documents/CURSOR%20CODES/In%20Progress/doubledown/app/%28tabs%29/profile.tsx), and [store/auth.ts](/Users/mikhail/Documents/CURSOR%20CODES/In%20Progress/doubledown/store/auth.ts).
- The current question JSON and two untracked category assets are treated as the initial content seed, not final production content governance.
