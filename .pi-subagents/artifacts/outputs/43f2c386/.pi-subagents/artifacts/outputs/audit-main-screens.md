# Layout Consistency Audit — Main App Screens

**Scope:** `app/(app)/*.tsx` (excluding `play/`), `app/(auth)/*.tsx`, `app/index.tsx`, `app/terms.tsx`, `app/privacy.tsx`, `app/how-to-play.tsx`  
**Tokens reference:** `constants/theme.ts` — `LAYOUT.screenGutter` = `SPACING.lg` = **16**; `SPACING.screenPadding` = **20** (unused in scoped screens); `LAYOUT.contentMaxWidth` = **560**  
**Stack:** All routes use `headerShown: false` via `landscapeStackScreenOptions` — every screen builds its own chrome.

---

## Per-Screen Table

| Screen | Safe area | Horizontal padding | Max-width on wide | Scroll | Header | Background | Hardcoded type/color | Shared scaffold |
|--------|-----------|-------------------|-------------------|--------|--------|------------|---------------------|-----------------|
| `app/index.tsx` | N/A (redirect) | N/A | N/A | N/A | N/A | N/A | N/A | `<Redirect />` only |
| `app/(app)/index.tsx` | `SafeAreaView` **edges all 4** | `modeGrid` **8** hardcoded; tiles `SPACING.md` (12); web header **8** | `contentFrame` **880**; web **1250** (not 560) | **None** (plain `View`) | `GameHeader` logoOnly + slots | Outer `View` + `HOME_SOFT_UI.canvas` | Many hardcoded sizes (`fontSize` 16/11/10/17/12, `#FFFFFF`, `#333333`, `#FF8A00`, etc.) | `ScreenContent` **fullWidth** |
| `app/(app)/store.tsx` | `SafeAreaView` **edges all 4** | Scroll: `LAYOUT.screenGutter` (16); header **no** horizontal pad | Bundle row `COMPACT_BUNDLES_ROW_MAX_WIDTH` (custom); not 560 | `ScrollView` + `contentContainerStyle` | Custom 3-col: back squircle \| title \| token chip | `HOME_SOFT_UI.canvas` | `#D32F2F`, `#388E3C`, `#FFFFFF`, many literal `fontSize` 8–20 | `ScreenContent` **fullWidth** |
| `app/(app)/settings.tsx` | `SafeAreaView` **edges all 4** | Scroll: `LAYOUT.screenGutter` (16); header **no** pad | Modals `maxWidth: 720`; not 560 | `ScrollView` | Custom 3-col: back \| title \| token chip | `HOME_SOFT_UI.canvas` | Modal overlay `rgba(15,23,42,0.42)`; many literal font sizes | `ScreenContent` **fullWidth** |
| `app/(app)/game-recap.tsx` | `SafeAreaView` **default edges** | `SPACING.lg` (16) — not `LAYOUT` token | **None** | `ScrollView` (no `contentContainerStyle` name; uses `styles.content`) | Inline row: title + `Button` Close | `useTheme().background` | `fontSize: 30` hero; uses `FONT_SIZES` elsewhere | **None** |
| `app/(app)/rules.tsx` | `SafeAreaView` **default edges** | Header `marginHorizontal: SPACING.lg`; grid `padding: SPACING.lg` | **None** | **None** (`View` grid) | Raised bar: Close text + centered title | `HOME_SOFT_UI.canvas` | Uses `FONT_SIZES` + `FONTS` (good) | **None** |
| `app/(app)/lobby-settings.tsx` | `SafeAreaView` **default edges** | Content `paddingHorizontal: SPACING.lg` + `padding: SPACING.lg` | **None** | **None** | Raised bar: spacer \| title \| CLOSE text | `HOME_SOFT_UI.canvas` | `FONT_SIZES` + literal `fontSize: 12` close | **None** |
| `app/(app)/create-game.tsx` | `SafeAreaView` **default edges** | Header `SPACING.lg` (16); steps use `SPACING.lg` internally | **None** | Step bodies scroll internally (`StepTeamInfo`, etc.) | 3-col: back \| step dots \| step label | `HOME_SOFT_UI.canvas` | `fontSize: 11` step label | **None** |
| `app/(app)/theme-picker.tsx` | `SafeAreaView` **default edges** | Header `SPACING.lg`; body `SPACING.xl` (**24**) | Cards `maxWidth: 360` per card | `ScrollView` (palette grid only) | 3-col: back \| title \| spacer | `HOME_SOFT_UI.canvas` | Literal `fontSize` 12–20 | **None** |
| `app/(app)/game.tsx` | `SafeAreaView` **default edges** | Header `SPACING.xl` (**24**); panel `SPACING.xxl` | Question panel **600** | **None** at screen level; `LobbyBuilder`/`Board` fill | Plastic header: icon back/close \| scores/title | `HOME_SOFT_UI.canvas` | Many literal sizes (10–32) | **None** |
| `app/(app)/content-languages-picker.tsx` | `SafeAreaView` **default edges** | Header `SPACING.lg`; body `SPACING.xl` (**24**) | Description `maxWidth: 720` | `ScrollView` vertical + horizontal | 3-col: back \| title \| spacer | `HOME_SOFT_UI.canvas` | `rgba(51,51,51,...)` borders | **None** |
| `app/(app)/language-picker.tsx` | `SafeAreaView` **default edges** | Header/body `SPACING.lg`; locale row `SPACING.md` | Description `maxWidth: 420` | Horizontal `ScrollView` only; body not vertically scrollable | 3-col: back \| title \| spacer | `HOME_SOFT_UI.canvas` | `#333333` glow; literal font sizes | **None** |
| `app/(auth)/sign-in.tsx` | `SafeAreaView` **default edges** | `padding: LAYOUT.screenGutter` (16) on scroll content | `AuthCard` **maxWidth: 400** (not 560) | `ScrollView` + `keyboardShouldPersistTaps` | Custom squircle back (44×44) above card | `HOME_SOFT_UI.canvas` | `fontSize` 12–14 literals; `FONTS` only | `AuthCard`, `AuthCardHeader`, forms |
| `app/(auth)/sign-up.tsx` | Same as sign-in | Same | `AuthCard` **400** | Same | Same squircle back | `HOME_SOFT_UI.canvas` | Same pattern | `AuthCard` via `AuthEmailSignUpForm` |
| `app/(auth)/forgot-password.tsx` | Same | Same | **None** (no AuthCard) | Same | Squircle back + inline title block | `HOME_SOFT_UI.canvas` | `fontSize` 32 title; `#DC2626` error (matches `COLORS.error` but hardcoded) | **None** |
| `app/terms.tsx` | Via `LegalScrollScreen`: **edges all 4** | `LAYOUT.screenGutter` on scroll content | `ScreenContent` **fullWidth** (no 560) | `ScrollView` | Back pill + `PublicAuthEntry` | `useTheme().background` | Back label `fontSize: 15` | `LegalScrollScreen` → `ScreenContent` |
| `app/privacy.tsx` | Same as terms | Same | Same | Same | Same | Same | Same | `LegalScrollScreen` |
| `app/how-to-play.tsx` | `SafeAreaView` **edges all 4** | `LAYOUT.screenGutter` on scroll | `ScreenContent` **fullWidth** | `ScrollView` | Back pill + `PublicAuthEntry` (matches legal) | `useTheme().background` | Rule title `fontSize: 17`; body uses `TYPE_SCALE` | `ScreenContent`, `PillCollapsibleSection` |

---

## Token Reference (from `constants/theme.ts`)

```ts
SPACING.screenPadding: 20   // not used in any scoped screen
LAYOUT.screenGutter: 16     // SPACING.lg — primary gutter token
LAYOUT.contentMaxWidth: 560 // documented for auth/forms; not applied on audited screens
```

`ScreenContent` when `fullWidth={true}` skips both `maxWidth` and gutter; gutter is applied manually in inner `scrollContent` on adopting screens.

---

## Ranked Inconsistencies (severity order)

### 1. Background color source split (HIGH)
- **Pattern A (majority):** `HOME_SOFT_UI.colors.canvas` — home, store, settings, auth, pickers, modals, game.
- **Pattern B:** `useTheme().background` — `game-recap`, `how-to-play`, `terms`/`privacy` (via `LegalScrollScreen`).
- **Risk:** Theme palette changes may not affect Pattern A screens; B screens track user palette.
- **Standardize on:** Pick one — either migrate branded screens to `useTheme()` for palette consistency, or document `HOME_SOFT_UI` as intentional fixed brand shell.

### 2. `LAYOUT.contentMaxWidth` (560) never used on main screens (HIGH)
- `ScreenContent` is always `fullWidth`; max column is never 560.
- `AuthCard` defaults to **400**.
- Home uses **880/1250**; game panel **600**; various **420/720** one-offs.
- **Standardize on:** Use `ScreenContent` without `fullWidth` (or pass `maxWidth={LAYOUT.contentMaxWidth}`) for form/legal/auth flows; keep `fullWidth` only for hub/game layouts.

### 3. Horizontal padding values diverge (MEDIUM)
- **16 via token:** `LAYOUT.screenGutter` on store/settings/how-to-play/legal/auth scroll.
- **16 via alias:** `SPACING.lg` on rules, lobby-settings, create-game, pickers (same value, different import).
- **24:** `SPACING.xl` on game header, theme-picker body, content-languages body.
- **20:** `SPACING.screenPadding` — **defined but unused**.
- **8 hardcoded:** home `modeGrid`, web `GameHeader`.
- **Standardize on:** `LAYOUT.screenGutter` everywhere; reserve `SPACING.xl` for vertical section spacing only.

### 4. `ScreenContent` adoption is partial (MEDIUM)
- **Uses:** home, store, settings, how-to-play, legal (`fullWidth` + manual inner gutter).
- **Does not use:** auth, game-recap, rules, lobby-settings, create-game, theme/language pickers, game.
- **Standardize on:** Hub/settings/legal pattern (`SafeAreaView` → `ScreenContent fullWidth` → header outside scroll → `ScrollView` with `paddingHorizontal: LAYOUT.screenGutter`).

### 5. Safe-area `edges` explicit vs implicit (MEDIUM)
- **Explicit all 4:** home, store, settings, how-to-play, legal.
- **Implicit default:** auth, game-recap, rules, lobby-settings, create-game, theme-picker, game, pickers.
- **Standardize on:** Explicit `edges={['top','bottom','left','right']}` on all full-screen routes for predictable behavior across platforms.

### 6. Header chrome patterns fragmented (MEDIUM)
| Pattern | Screens |
|---------|---------|
| `GameHeader` | home |
| 3-column toolbar (back 44² \| centered title \| right slot) | store, settings, create-game, theme-picker, language-picker, content-languages |
| Raised modal bar (Close text) | rules, lobby-settings |
| Plastic game bar (icons + scores) | game |
| Squircle back only (no title row) | auth (3) |
| Back pill + auth entry | how-to-play, legal |
| Title + `Button` | game-recap |
- **Standardize on:** 3-column toolbar (store/settings) for pushed settings-style screens; back pill + `PublicAuthEntry` for public content (how-to-play/legal).

### 7. Scroll handling inconsistent (MEDIUM)
- **No scroll (overflow risk):** home hub, rules, lobby-settings, game shell.
- **Full scroll:** store, settings, auth, game-recap, how-to-play, legal.
- **Partial / nested:** create-game (steps), theme-picker (grid only), language-picker (horizontal only).
- **Standardize on:** `ScrollView` with `contentContainerStyle` + `flexGrow: 1` for any screen that can exceed viewport height.

### 8. Typography token usage mixed (LOW–MEDIUM)
- **Best:** rules (`FONT_SIZES`), how-to-play body (`TYPE_SCALE`), game-recap (`FONT_SIZES`).
- **Worst:** store bundles (`fontSize: 8`), home tiles, forgot-password title (`fontSize: 32` not `TYPE_SCALE.displayL`).
- **Standardize on:** `TYPE_SCALE` for text roles; `FONT_SIZES` only where legacy mapping exists.

---

## Architecture Summary

```
landscapeStack (headerShown: false)
├── (app)/          → mostly HOME_SOFT_UI + custom SafeAreaView chrome
│   ├── hub trio    → SafeAreaView(edges) → ScreenContent(fullWidth) → header + ScrollView(gutter)
│   ├── pickers     → SafeAreaView → custom header (SPACING.lg/xl) → local ScrollView
│   ├── modals      → SafeAreaView → raised header bar → plain View
│   └── game        → SafeAreaView → full-bleed gameplay (SPACING.xl header)
├── (auth)/         → SafeAreaView → ScrollView(LAYOUT.screenGutter) → AuthCard(400)
└── root legal/help → LegalScrollScreen / how-to-play mirror (useTheme + ScreenContent)
```

**Key shared components:**
- `components/ScreenContent.tsx` — column constraint + gutter (when not `fullWidth`)
- `components/LegalScrollScreen.tsx` — legal/help layout twin
- `components/auth/AuthCard.tsx` — auth card shell (`maxWidth` default 400)

---

## Start Here

Open **`app/(app)/store.tsx`** — it is the most complete reference implementation: explicit safe-area edges, `ScreenContent fullWidth`, header outside scroll, `LAYOUT.screenGutter` on scroll content, and consistent back-button chrome. Use it as the template when normalizing pickers, modals, and auth.

---

# Code Context

## Files Retrieved

1. `constants/theme.ts` (lines 112–200) — `SPACING`, `LAYOUT`, `TYPE_SCALE` tokens
2. `components/ScreenContent.tsx` (lines 1–47) — shared column/gutter wrapper
3. `components/LegalScrollScreen.tsx` (lines 37–121) — legal/public scroll scaffold
4. `components/auth/AuthCard.tsx` (lines 20–49) — auth card `maxWidth: 400`
5. `lib/navigation/landscapeStack.ts` (lines 20–24) — `headerShown: false` globally
6. `app/(app)/index.tsx` (lines 282–477, 590–621) — home layout + `contentFrame` widths
7. `app/(app)/store.tsx` (lines 342–501, 507–522) — reference hub sub-screen pattern
8. `app/(app)/settings.tsx` (lines 126–174, 864–872) — settings scroll/gutter pattern
9. `app/(auth)/sign-in.tsx` (lines 41–131, 134–141) — auth scroll/gutter pattern
10. `app/how-to-play.tsx` (lines 76–160, 164–203) — public help pattern (matches legal)
11. `app/(app)/game-recap.tsx` (lines 30–156, 159–177) — outlier `useTheme` + no ScreenContent

## Key Code

```194:200:constants/theme.ts
export const LAYOUT = {
  contentMaxWidth: 560,
  screenGutter: SPACING.lg,
} as const;
```

```21:36:components/ScreenContent.tsx
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
```

```342:391:app/(app)/store.tsx
    <SafeAreaView
      collapsable={false}
      edges={['top', 'bottom', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: canvas }]}
    >
      <ScreenContent fullWidth style={styles.viewport}>
        <View style={styles.header}>...</View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
```

## Architecture

Screens own all layout chrome because the stack hides native headers. Two families emerged: **HOME_SOFT_UI fixed brand** (most app routes) vs **useTheme palette-aware** (legal, help, game-recap). The hub sub-screen trio (store/settings/how-to-play) converged on `ScreenContent fullWidth` + inner `LAYOUT.screenGutter`, but pickers, modals, auth, and game routes each reimplemented padding and headers independently.

## Start Here

**`app/(app)/store.tsx`** — canonical sub-screen scaffold to extend to inconsistent routes.
