# Layout Consistency — Findings & Migration Plan

Audit date: 2026-07-08. Full subagent reports: `.pi-subagents/artifacts/43f2c386_scout_{0,1,2}_output.md`.

## Root Cause

All stacks set `headerShown: false` (`lib/navigation/landscapeStack.ts`), so **every screen hand-rolls its own shell** — safe area, gutter, header, scroll, background — with no enforced standard. ~15 screens each reinvent this slightly differently. That is why pages feel "off everywhere" compared to SwiftUI, where `NavigationStack` + safe areas come for free.

## Decisions (locked)

- **Background: cream brand canvas (`HOME_SOFT_UI.colors.canvas`) everywhere.** Migrate the outliers (`game-recap`, `play/end`, `terms`/`privacy` via `LegalScrollScreen`, `how-to-play`) off `useTheme().background`.
- **Gutter token: `LAYOUT.screenGutter` (16) is the only horizontal inset token.** Do not use `SPACING.lg` directly for screen gutters, do not use `SPACING.xl` horizontally, and delete `SPACING.screenPadding` (20 — defined, never used correctly).
- **Reference scaffold: `app/(app)/store.tsx`** is the canonical sub-screen pattern:
  `SafeAreaView edges={['top','bottom','left','right']}` → `ScreenContent fullWidth` → header row outside scroll → `ScrollView` with `contentContainerStyle` using `LAYOUT.screenGutter`.
- **Play routes: `PlayScaffold` is the canonical shell** (Tier A defaults for setup screens, `bodyEdgeToEdge` for board/match).
- **Header: the 3-column toolbar** (44² back squircle | centered title | right slot, as in store/settings) is standard for pushed screens; `PlayStackHeader` for play; back-pill + `PublicAuthEntry` for public/legal pages.

## Top Inconsistencies (ranked)

1. **HIGH — Background split.** `HOME_SOFT_UI` canvas (majority) vs `useTheme().background` (`game-recap`, `play/end`, legal, how-to-play). → Migrate to cream.
2. **HIGH — No unified scaffold.** `ScreenContent` is always passed `fullWidth`, bypassing its maxWidth/gutter; safe area/scroll/background duplicated in ~15 files. `LAYOUT.contentMaxWidth` (560) is never actually applied anywhere.
3. **HIGH — Play flow split in two systems.** `board`/`categories`/`team-setup`/`end` use `PlayScaffold`; `mode`/`quick-length` hand-roll (mirroring PlayStackHeader manually); `question.tsx` has **no SafeAreaView at all** (manual insets).
4. **MEDIUM — Gutter values diverge.** 16 via `LAYOUT.screenGutter`, 16 via `SPACING.lg`, 24 via `SPACING.xl` (game header, theme-picker, content-languages), 8 hardcoded (home modeGrid), 20 hardcoded (admin tables).
5. **MEDIUM — 7 header patterns** across the app (GameHeader / 3-col toolbar / raised Close bar / plastic game bar / squircle-only / back-pill+auth / title+Button).
6. **MEDIUM — Safe-area edges** explicit on only 6 screens, implicit default on ~12, absent on `question.tsx`.
7. **MEDIUM — Scroll ownership.** No-scroll overflow risk on home hub, `rules`, `lobby-settings`; `language-picker` body not vertically scrollable; `categories` uses `paddingBottom: 160` magic for its floating CTA.
8. **MEDIUM — 3 copies of the web-modal shell.** `WebAwareModal`, `WagerInfoModal`, `TopicColumnPickerModal` all reimplement the same web `fixed` overlay + native `Modal` pattern.
9. **LOW — Hardcoded literals** instead of tokens: `fontSize: 8–32` scattered (store bundles worst), `#FF8A00` vs `COLORS.secondary`, `#DC2626` vs `COLORS.error`, radii `14`/`28` vs `BORDER_RADIUS.*`.
10. **LOW — Dead code:** `BootScreen`, `HeroSection`, `ProfileAuthGate` unused.

## Migration Plan (ordered, each step shippable independently)

### Phase 1 — Token sweep (mechanical, low risk)
1. Delete `SPACING.screenPadding` from `constants/theme.ts`; grep confirms no live users.
2. Replace horizontal `SPACING.lg`/`SPACING.xl` screen gutters with `LAYOUT.screenGutter` in: `rules`, `lobby-settings`, `create-game`, `theme-picker`, `language-picker`, `content-languages-picker`, `game-recap`, `game` (header 24→16), admin tables (hardcoded 20).
3. Add explicit `edges={['top','bottom','left','right']}` to every full-screen `SafeAreaView` currently using defaults (~12 screens).
4. Replace obvious color literals with tokens: `#FF8A00`→`COLORS.secondary`, `#DC2626`→`COLORS.error`, `#16A34A`/`#388E3C`→`COLORS.success`. Leave one-off decorative values.

### Phase 2 — Background unification (cream everywhere)
5. `game-recap.tsx`, `play/end.tsx`: switch `useTheme().background` → `HOME_SOFT_UI.colors.canvas` (and winner-card tints to brand tokens).
6. `LegalScrollScreen.tsx` (covers `terms` + `privacy`) and `how-to-play.tsx`: same swap.

### Phase 3 — Shared scaffold + screen migration
7. Extend `components/ScreenContent.tsx` into a `Screen` scaffold owning: SafeAreaView (configurable edges, default all), cream background, `flex:1`/`minHeight:0`, optional `ScrollView` (with `keyboardShouldPersistTaps`, `flexGrow:1`), `LAYOUT.screenGutter`, optional `maxWidth` (`contentMaxWidth` for forms, wide for hub), header slot.
8. Migrate lowest-risk, highest-duplication screens first: `theme-picker`, `language-picker`, `content-languages-picker`, `rules`, `lobby-settings`, `game-recap`, then auth screens.
9. Merge `how-to-play` layout into `LegalScrollScreen` (≈80 duplicated lines) or the new `Screen` with a `legal` variant.
10. Unify pushed-screen headers on the store/settings 3-column toolbar (extract to a shared component; `rules`/`lobby-settings` raised-Close bar becomes a variant of it).

### Phase 4 — Play flow (highest risk, do last)
11. Migrate `play/mode` and `play/quick-length` onto `PlayScaffold` with `PlayStackHeader` (they already mirror it manually — mostly deletion).
12. Migrate `play/question.tsx` onto `PlayScaffold` Tier B (`bodyEdgeToEdge`, `customHeader=PlayMatchTopBar`). **Risk:** rumble/hot-seat headers and answer-phase sticky dock; verify in landscape on small devices before/after.
13. Restore `HubTokenChip` in `team-setup` header (confirm with UX — `logoTitle` may be intentional).
14. `game.tsx` / `game-recap.tsx` legacy shells: align header to plastic-bar or 3-col pattern; add `minHeight:0` on content.

### Phase 5 — Cleanup
15. Point `WagerInfoModal` and `TopicColumnPickerModal` at `WebAwareModal` (keep card content per-feature).
16. Delete dead code: `BootScreen`, `HeroSection`, `ProfileAuthGate` (fix `__tests__/app/settings.test.tsx` mock).
17. Typography pass: worst offenders `store.tsx` bundles (`fontSize: 8`), home tiles, `forgot-password` title (`32`→`TYPE_SCALE.displayL`).

## Verification per phase

- `bun run test` after each phase.
- Visual spot-check in Expo web + one small iPhone simulator (landscape for play/game screens) on: home, store, settings, theme-picker, sign-in, play/question, play/board, game-recap.
- Phase 4 step 12 needs before/after screenshots of question screen in rumble + hot-seat modes.

## Residual risks

- Gutter 24→16 on `game.tsx` header and web category grid may look tighter; eyeball before committing.
- Cream canvas on `end`/`game-recap` changes product look — flagged as decided above, but check contrast of palette-tinted winner cards.
- `question.tsx` migration is the only genuinely risky step; everything before it is safe to ship incrementally.
