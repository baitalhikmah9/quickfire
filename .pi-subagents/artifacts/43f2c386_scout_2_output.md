# Code Context — Shared Layout Primitives Audit

## Files Retrieved

1. `components/ScreenContent.tsx` (lines 1–48) — Minimal column wrapper: `maxWidth`, `LAYOUT.screenGutter`, `fullWidth` flag
2. `components/LegalScrollScreen.tsx` (lines 1–122) — Legal pages scaffold: SafeAreaView + ScreenContent + ScrollView + back bar
3. `components/WebAwareModal.tsx` (lines 1–40) — Web-safe overlay (fixed `View` on web, RN `Modal` on native)
4. `components/ErrorBoundary.tsx` (lines 1–136) — Class error boundary with SafeAreaView fallback
5. `components/GameHeader.tsx` (lines 1–80) — Shared header bar (logo/title variants, HEADER tokens)
6. `components/HeaderBackButton.tsx` (lines 1–40) — Back pill for GameHeader `leftSlot`
7. `components/auth/AuthCard.tsx` (lines 1–50) — Auth form shell with own `maxWidth` (default 400)
8. `features/play/components/PlayScaffold.tsx` (lines 1–381) — Play-flow scaffold: SafeAreaView + ScreenContent + header/HUD/scroll/body modes
9. `lib/navigation/landscapeStack.ts` (lines 1–24) — Shared stack `screenOptions` for app/auth/play
10. `app/_layout.tsx` (lines 22–103) — Root stack: `headerShown: false`, palette `contentStyle`
11. `app/(app)/_layout.tsx` (lines 1–20) — App stack via `landscapeStackScreenOptions`
12. `app/(auth)/_layout.tsx` (lines 1–18) — Auth stack via `landscapeStackScreenOptions`
13. `app/(app)/play/_layout.tsx` (lines 1–49) — Play stack + Clerk boot overlay
14. `app/admin/_layout.tsx` (lines 1–23) — Thin web-only stack (sign-in entry points)
15. `app/(admin)/_layout.tsx` (lines 55–513, 257–270) — Admin shell, sidebar, mobile Modal, ErrorBoundary
16. `app/admin/index.tsx` (lines 1–9) — Re-export wrapper around `(admin)/index`
17. `constants/theme.ts` (lines 112–200, 217–224) — `SPACING.screenPadding`, `LAYOUT.contentMaxWidth` (560), `LAYOUT.screenGutter` (16), `HEADER` tokens
18. `docs/modals.md` (lines 1–377) — Expo Router modal-route docs (reference only; not mirrored in app)
19. `features/lobby/LobbyBuilder.tsx` (lines 1–60) — Lobby form UI (no layout scaffold; used inside `game.tsx`)
20. `features/play/components/WagerInfoModal.tsx` (lines 45–121) — Duplicated web-overlay modal pattern
21. `features/play/components/TopicColumnPickerModal.tsx` (lines 210–218) — Same web-overlay pattern

## Key Code

### ScreenContent — column constraint only (no safe area, no scroll)

```21:37:components/ScreenContent.tsx
export function ScreenContent({
  style,
  maxWidth = LAYOUT.contentMaxWidth,
  fullWidth = false,
  ...props
}: ScreenContentProps) {
  return (
    <View
      style={[
        styles.root,
        !fullWidth && styles.gutter,
        !fullWidth && { maxWidth, alignSelf: 'center' },
        style,
      ]}
      {...props}
    />
  );
}
```

**Note:** Every production screen import uses `fullWidth`, so `maxWidth` / default gutter on `ScreenContent` itself is effectively bypassed; gutters are re-applied manually in inner `ScrollView` / column styles.

### landscapeStackScreenOptions — consistent nested stacks

```20:24:lib/navigation/landscapeStack.ts
export const landscapeStackScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  presentation: 'card',
  ...webSafeStack,
};
```

### Root layout — palette background via `contentStyle`

```27:35:app/_layout.tsx
  const rootStackScreenOptions = useMemo(
    () => ({
      headerShown: false,
      contentStyle: {
        flex: 1,
        backgroundColor: PALETTES[paletteId].background,
      },
    }),
    [paletteId]
  );
```

### Admin route split — wrappers, not duplicates

```1:9:app/admin/index.tsx
import AdminIndexScreen from '@/app/(admin)';
import { AdminAccessBoundary } from '@/app/(admin)/_layout';

export default function AdminRouteIndexScreen() {
  return (
    <AdminAccessBoundary>
      <AdminIndexScreen />
    </AdminAccessBoundary>
  );
}
```

### WebAwareModal — shared imperative overlay

```15:28:components/WebAwareModal.tsx
export function WebAwareModal({ visible, onRequestClose, children }: WebAwareModalProps) {
  if (!visible) {
    return null;
  }

  if (Platform.OS === 'web') {
    return <View style={styles.webOverlayRoot}>{children}</View>;
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onRequestClose}>
      {children}
    </Modal>
  );
}
```

---

## Primitive Inventory & Usage Counts

| Primitive | Role | Import count (app code) | Screens / consumers |
|-----------|------|-------------------------|---------------------|
| **ScreenContent** | Centered column / optional gutter | **5** direct screen imports | `(app)/index`, `store`, `settings`, `play/quick-length`, `how-to-play` |
| | | +1 internal | `LegalScrollScreen` |
| | | +1 feature | `PlayScaffold` → 6 play routes + `PlayAnswerPanel` |
| **LegalScrollScreen** | Legal scroll + back + auth entry | **2** | `terms`, `privacy` |
| **WebAwareModal** | Settings overlays | **1 file, 5 instances** | `(app)/settings` only |
| **ErrorBoundary** | Crash fallback | **2** | `app/_layout` (root), `(admin)/_layout` (admin content) |
| **PlayScaffold** | Play match shell | **6 route files** | `board`, `categories`, `team-setup`, `end`, `question` (via `PlayAnswerPanel`), loading states |
| **GameHeader** | Top chrome | **4 direct** + **PlayStackHeader** | `(app)/index`, `play/mode`, `play/quick-length`, `play/team-setup` (custom header); all other play stack via `PlayStackHeader` |
| **HeaderBackButton** | Back pill | **4** | `mode`, `quick-length`, `team-setup`, `PlayStackHeader` |
| **AuthCard** (+ header/forms) | Auth form shell | **3 auth screens** | `sign-in`, `sign-up`, `forgot-password` |
| **PublicAuthEntry** | Sign-in CTA strip | **3** | `settings`, `how-to-play`, `LegalScrollScreen` |
| **LobbyBuilder** | Classic/quick lobby form | **1** | `(app)/game` |
| **features/lobby/Step\*** | Create-game wizard steps | **1** | `(app)/create-game` (no shared screen scaffold) |
| **BootScreen** | Hydration splash | **0** | **Unused** (dead code) |
| **HeroSection** | Decorative hero wrapper | **0** | **Unused** (dead code) |
| **ProfileAuthGate** | Profile auth wall | **0** in app | **Unused** (only referenced in `__tests__/app/settings.test.tsx` mock) |

### Imperative modals (not using WebAwareModal)

| Component | Pattern | Used from |
|-----------|---------|-----------|
| `WagerInfoModal` | Inline web `fixed` + native `Modal` | `play/question`, `play/board` |
| `TopicColumnPickerModal` | Same inline pattern | `play/board` |
| `(admin)/_layout` mobile sidebar | RN `Modal` + Animated drawer | Admin shell only |
| `components/admin/PromoModeDropdown` | RN `Modal` | Admin promo UI |

---

## Architecture

```
app/_layout.tsx
  ErrorBoundary
  Stack (headerShown: false, contentStyle: palette background)
    ├── (app)/_layout → landscapeStackScreenOptions (card, no header)
    │     ├── Hub screens: SafeAreaView → ScreenContent fullWidth → custom chrome
    │     ├── play/_layout → same stack options + auth boot overlay
    │     │     ├── PlayScaffold screens (SafeAreaView → ScreenContent → PlayStackHeader)
    │     └── question/board: custom SafeAreaInsets + modals
    ├── (auth)/_layout → landscapeStackScreenOptions
    │     └── SafeAreaView → ScrollView (LAYOUT.screenGutter) → AuthCard
    ├── terms/privacy → LegalScrollScreen
    ├── how-to-play → SafeAreaView → ScreenContent (mirrors LegalScrollScreen manually)
    ├── admin/_layout → thin re-export stack (web only)
    └── (admin)/_layout → AdminShell + sidebar + ErrorBoundary
          └── app/admin/* wraps same screens with AdminAccessBoundary
```

**Layering model today:**

1. **Router layouts** — Hide native headers; set background on root only; no safe-area handling.
2. **Screen-level** — Each screen owns `SafeAreaView` edges (inconsistent), background color (often `HOME_SOFT_UI` canvas, not `useTheme()`), and scroll.
3. **ScreenContent** — Used almost exclusively as `fullWidth` flex child; does not enforce `LAYOUT.contentMaxWidth` on hub screens (home uses custom `maxWidth: 1250` on web).
4. **Domain scaffolds** — `PlayScaffold` for match flow; `LegalScrollScreen` for legal; `AuthCard` for auth; admin has its own `AdminShell`.

---

## Router `_layout` Consistency

| Layout | `headerShown` | `presentation` | `contentStyle` | Safe area |
|--------|---------------|----------------|----------------|-----------|
| `app/_layout.tsx` | `false` (all) | default card | `flex:1` + palette `background` | None (screens own it) |
| `(app)/_layout.tsx` | `false` via `landscapeStackScreenOptions` | `'card'` | Not set (inherits root) | None |
| `(auth)/_layout.tsx` | same | `'card'` | Not set | None |
| `(app)/play/_layout.tsx` | same | `'card'` | Not set | Boot overlay only |
| `admin/_layout.tsx` | `false` | default | Not set | N/A (web redirect on native) |
| `(admin)/_layout.tsx` | `false` | default | Not set | Admin shell handles layout |

**Findings (severity):**

- **medium** — `contentStyle.backgroundColor` only on root; most screens use `HOME_SOFT_UI.colors.canvas` instead of `PALETTES[paletteId].background`, so theme picker may not affect all surfaces.
- **low** — `SafeAreaView` `edges` explicit on only 6 screens (`index`, `store`, `settings`, `mode`, `quick-length`, `how-to-play`); ~12 other `SafeAreaView` screens omit `edges` (default all edges — usually OK but inconsistent documentation).
- **low** — No layout uses `presentation: 'modal'`; `rules.tsx` is named `RulesModal` but is a card stack screen.

---

## Admin `app/admin/` vs `app/(admin)/` Duplication

**Not divergent copies.** Pattern:

- **`app/(admin)/*`** — Canonical screen implementations + `AdminShell` layout (sidebar, top bar, `ErrorBoundary`, role gate).
- **`app/admin/*`** — Thin wrappers that import `(admin)` screens and wrap with `AdminAccessBoundary` again for `/admin/*` URL paths.
- **`app/admin/_layout.tsx`** — Minimal stack (includes `sign-in`); web-only redirect on native.
- **`app/(admin)/_layout.tsx`** — Full dashboard chrome; no `sign-in` route (redirects to `/admin/sign-in`).

**Style divergence:** Admin uses `HOME_SOFT_UI` / `BRAND_RAISED_SURFACE` tokens, not hub `ScreenContent` or `LAYOUT.contentMaxWidth`. Some admin tables hardcode `paddingHorizontal: 20` instead of `LAYOUT.screenGutter` (`(admin)/promo-codes.tsx`, `wallets/[walletId].tsx`).

---

## Modals: `docs/modals.md` vs Actual Usage

| Approach | Documented in `docs/modals.md` | Used in app |
|----------|-------------------------------|-------------|
| Expo Router `presentation: 'modal'` route | Yes | **No** — grep finds only docs/examples |
| Expo Router `formSheet` | Yes | **No** |
| RN `Modal` component | Yes | Yes — settings (`WebAwareModal`), play modals, admin sidebar, `PromoModeDropdown` |
| Web `position: fixed` overlay | Not in modals.md | Yes — `WebAwareModal`, `WagerInfoModal`, `TopicColumnPickerModal` (workaround for nested web layouts) |

**Findings:**

- **medium** — Three parallel web-modal implementations (`WebAwareModal`, `WagerInfoModal`, `TopicColumnPickerModal`) share the same `webOverlayRoot` pattern; play modals did not adopt `WebAwareModal`.
- **low** — `docs/modals.md` is upstream Expo reference; app intentionally uses imperative overlays for settings and in-game UI, not file-based modal routes.

---

## Screens Re-implementing Scaffold Concerns

### Safe area + gutter + scroll (no shared primitive)

| Screen group | Safe area | Horizontal padding | maxWidth | Scroll |
|--------------|-----------|-------------------|----------|--------|
| **ScreenContent adopters** (`index`, `store`, `settings`, `quick-length`, `how-to-play`) | `SafeAreaView` + often explicit `edges` | Inner styles: mix of `LAYOUT.screenGutter` and `SPACING.lg` | Home: web `1250`; others mostly full-bleed inside `fullWidth` | Per-screen `ScrollView` |
| **Auth** (`sign-in`, `sign-up`, `forgot-password`) | `SafeAreaView` | `LAYOUT.screenGutter` on scroll content | `AuthCard` `maxWidth: 400` | `ScrollView` |
| **Picker / settings-style** (`theme-picker`, `language-picker`, `content-languages-picker`, `lobby-settings`, `create-game`, `rules`, `game-recap`) | `SafeAreaView` | Hardcoded `SPACING.lg` (16) — same value as `screenGutter` but different token | None | Mixed View / ScrollView |
| **game.tsx** | `SafeAreaView` | `SPACING.lg` | None | View + `LobbyBuilder` |
| **play/mode** | `SafeAreaView` + `edges` | `LAYOUT.screenGutter` | None | View |
| **play/question** | `useSafeAreaInsets` only | Manual `SPACING.lg` + `maxWidth: 560` in styles | Yes (local) | `ScrollView` |
| **PlayScaffold routes** | Encapsulated | `LAYOUT.screenGutter` / safe-area max | Via `ScreenContent fullWidth` | Optional body scroll |
| **Admin** | Shell layout | Mix `SPACING.lg` and hardcoded `20` | N/A (dashboard) | Per-page |

**Duplication hotspots:**

- **high** — Back header row duplicated: `settings`, `how-to-play`, and `LegalScrollScreen` each implement their own back pill + title/auth row instead of `GameHeader` or `HeaderBackButton`.
- **medium** — `how-to-play.tsx` largely copies `LegalScrollScreen` structure but inlines it (~80 lines overlap).
- **medium** — Hub trio (`index`, `store`, `settings`) share the same `SafeAreaView` → `ScreenContent fullWidth` → viewport pattern but repeat boilerplate in each file.
- **low** — `SPACING.lg` vs `LAYOUT.screenGutter` vs `SPACING.screenPadding` (20) — three tokens for horizontal inset; only `screenGutter` (16) is documented for layout.

---

## Recommendation: Single Shared `Screen` Scaffold

### Should own (centralize)

1. **`SafeAreaView`** with configurable `edges` (default all) and `flex: 1` / `minHeight: 0`
2. **Background** — `useTheme().background` or explicit `HOME_SOFT_UI` variant prop (one source per screen type)
3. **Horizontal gutter** — `LAYOUT.screenGutter` on scroll/content container
4. **`maxWidth`** — `LAYOUT.contentMaxWidth` (560) for form/auth-like flows; optional `wideMaxWidth` (e.g. 1250) for hub web layout
5. **Scroll shell** — optional `ScrollView` with `keyboardShouldPersistTaps`, `contentContainerStyle` padding bottom
6. **Optional header slot** — delegate to `GameHeader` / `HeaderBackButton` / custom (do not hardcode settings-style header in scaffold)
7. **Web vs native** — keep `collapsable={false}` on SafeAreaView where needed (hub screens)

### Should stay per-screen / per-domain

1. **`PlayScaffold`** — Match-specific body modes (`bodyEdgeToEdge`, HUD, footers, landscape bezels); too specialized for a generic Screen
2. **`AdminShell`** — Sidebar, role gate, dashboard table chrome
3. **`AuthCard`** — Auth marketing card styling (narrower max width than general content)
4. **`LegalScrollScreen`** — Could become a `Screen` preset (`variant="legal"`) but low priority
5. **Imperative modals** — Consolidate on **`WebAwareModal`** for all overlay shells; keep modal *content* per feature
6. **Game/board/question layouts** — Custom geometry, timers, rumble UI

### Suggested migration order

1. Add `Screen` (or extend `ScreenContent` → `ScreenShell`) with safe area + scroll + gutter + maxWidth props.
2. Migrate picker/settings-style screens (`theme-picker`, `language-picker`, `rules`, etc.) — highest duplication, lowest risk.
3. Merge `how-to-play` into `LegalScrollScreen` or shared `Screen` + `LegalDocumentBody`.
4. Refactor `settings` header to `GameHeader` / `HeaderBackButton` for consistency with play hub.
5. Point `WagerInfoModal` / `TopicColumnPickerModal` at `WebAwareModal` wrapper (keep card UI inside).
6. Delete or wire up dead primitives: `BootScreen`, `HeroSection`, `ProfileAuthGate`.

### Token alignment

From `constants/theme.ts`:

- `LAYOUT.contentMaxWidth = 560`
- `LAYOUT.screenGutter = SPACING.lg` (16)
- `SPACING.screenPadding = 20` — rarely used for layout; avoid mixing with `screenGutter` without reason

---

## Start Here

**First file:** `components/ScreenContent.tsx`

**Why:** It is already the thinnest shared layout primitive and is imported by every hub screen and `PlayScaffold`, but it only handles width/gutter and is always passed `fullWidth`, so all real scaffold behavior (safe area, scroll, background, header) lives duplicated in ~15 screen files. Extending or replacing this file defines the migration surface for the whole app.

**Second file:** `features/play/components/PlayScaffold.tsx` — reference for how far domain-specific scaffolds should diverge from a generic `Screen`.

---

## Gaps Summary

| Gap | Severity |
|-----|----------|
| No unified safe-area + scroll + gutter + maxWidth primitive | **high** |
| `ScreenContent` `fullWidth` used everywhere; default maxWidth path unused | **medium** |
| Three copies of web-safe modal shell | **medium** |
| Expo Router modal routes documented but unused | **low** (intentional) |
| `BootScreen`, `HeroSection`, `ProfileAuthGate` unused | **low** (dead code) |
| Admin padding hardcodes `20` vs `LAYOUT.screenGutter` | **low** |
| Theme background split: root `contentStyle` vs `HOME_SOFT_UI` canvas | **medium** |

---

## Acceptance Report