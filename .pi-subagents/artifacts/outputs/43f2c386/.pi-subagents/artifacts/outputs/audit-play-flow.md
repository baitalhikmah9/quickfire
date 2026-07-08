# Play Flow Layout Consistency Audit

**Scope:** `app/(app)/play/*.tsx`, `features/play/**`, `app/(app)/game.tsx`, `app/(app)/game-recap.tsx`  
**Reference tokens:** `constants/theme.ts` — `SPACING.screenPadding` (20) vs `LAYOUT.screenGutter` (16 = `SPACING.lg`), `LAYOUT.contentMaxWidth` (560), `HEADER.*`  
**Landscape:** Native mobile locks landscape in `app/_layout.tsx` via `expo-screen-orientation`; play stack uses `landscapeStackScreenOptions` (no modal presentation).

---

## Standard Pattern (PlayScaffold)

The intended play shell is `PlayScaffold` + `PlayStackHeader` (`GameHeader` + `HeaderBackButton` + `HubTokenChip`):

| Concern | Standard |
|--------|----------|
| Root | `SafeAreaView` → `ScreenContent fullWidth` → flex column with `minHeight: 0` |
| Horizontal inset | `LAYOUT.screenGutter` (16), or `max(insets.left/right, LAYOUT.screenGutter)` when `bodyEdgeToEdge` + `contentSafeAreaHorizontal` |
| Setup / form screens | Default: `bodyScrollEnabled=true`, `bodyFrame=true` (bordered card + inner `ScrollView`) |
| Board / grid / match | `bodyEdgeToEdge=true`, `bodyFrame=false`, `bodyScrollEnabled=false`; nested scroll only where content overflows |
| Header | `PlayStackHeader` or documented `customHeader` (board: `PlayMatchTopBar`; categories: bespoke toolbar) |
| Colors | `HOME_SOFT_UI` / `getPlaySurfaceColors()` for cream canvas; `useTheme()` for palette-driven recap/end |
| Density | `useWindowDimensions()` + short-side breakpoints |

---

## Per-Screen Matrix

| Screen | Scaffold | Safe area / edges | Padding / gutter | Scroll / overflow | Header / back | Hardcoded vs tokens | Landscape notes |
|--------|----------|-------------------|------------------|-------------------|---------------|---------------------|-----------------|
| **play/index** | N/A (redirect) | — | — | — | — | — | — |
| **play/mode** | Hand-roll | `SafeAreaView` `edges={['top','bottom','left','right']}` | Body `LAYOUT.screenGutter`; header via `GameHeader` (no extra gutter wrapper) | No scroll; `flex:1` body + tile size from `useWindowDimensions` | `GameHeader` + `HeaderBackButton` + `HubTokenChip` (mirrors `PlayStackHeader`, not wrapped) | Tile shadow `#000000`; label `fontSize: 15`; `contentTopMargin` 8/24/48 magic | `isNativeLandscape` → `marginTop: 8` on cards |
| **play/quick-length** | Hand-roll | `SafeAreaView` all edges | `ScreenContent fullWidth`; list `LAYOUT.screenGutter` | No outer scroll; native list `flex:1` + `gap: SPACING.sm` | Same header trio as mode | Web: `marginBottom: 32`, `gap: 22`, card `height: 140`, `borderRadius: 28`, `padding 36/28` | `compact = windowHeight < 720` only (no width/landscape branch) |
| **play/team-setup** | **PlayScaffold** | Scaffold default safe area; inner scroll owns overflow | Scaffold `contentFit` gutters + `bodyFill` `paddingHorizontal: SPACING.sm`; rumble uses computed `horizontalGutter` (10–18) | `bodyScrollEnabled=false`; nested `ScrollView` (classic/rumble) | **`customHeader`**: `GameHeader variant="logoTitle"` — **no token chip** | Many local radii (24, 42, 14); `HOME_SOFT_UI` not `getPlaySurfaceColors` | `landscape` → 3-col row; web ≥900 → `webLandscapeRow`; rumble density from short side |
| **play/categories** | **PlayScaffold** edge-to-edge | `bodyEdgeToEdge` + `contentSafeAreaHorizontal`; floating CTA uses `insets.bottom` | PlayScaffold `max(insets, LAYOUT.screenGutter)`; grid constants 24/12/30/40 | `bodyScrollEnabled=false`; `FlatList` in body; `paddingBottom: 160` on list | **Custom** toolbar (chevron, counter, title, random) — not `PlayStackHeader` | Grid magic: `WEB_GRID_*`, pill sizes 36/32, `#FFFFFF` badge | `compactHeader = !web && width > height`; chrome `paddingVertical: SPACING.xs` |
| **play/board** | **PlayScaffold** edge-to-edge | `bodyEdgeToEdge`; **`contentSafeAreaHorizontal=false`** — manual `bodyPadLeft/Right` | `Math.max(insets.*, LAYOUT.screenGutter)` on grid; header width capped 1120 | No scroll; `flex:1` + `onLayout` row height fit; `overflow: hidden` | **`PlayMatchTopBar`** via `customHeader` | Board metrics mix tokens + literals (`MIN_CELL: 176`, rail 50–64) | `getBoardMetrics` / `layoutTuning` for short height & narrow width; `height < 500` tighter chrome |
| **play/question** | **Hand-roll** | **No `SafeAreaView`**; manual `insets.top/left/right/bottom` on sections | `headerHorizontalPadding` = clamp(`SPACING.sm`–`xl`, 2.5% width); answer pad from short side | `ScrollView` question + answer phases; `flex:1 minHeight:0` shells; sticky dock absolute | **`PlayMatchTopBar`** + pill row OR rumble/hot-seat legacy header | Wager dock `#FF8A00`, `#DC2626` timeout; web `translateY: -40` hack | `isCompactHeader` / `isVeryCompactHeader` from width & short side |
| **play/answer** | Via **PlayAnswerPanel** | Panel: `PlayScaffold` `bodyEdgeToEdge`, `bodyFrame=false` | Panel shell `max(SPACING.md, insets.*)` — **not** `LAYOUT.screenGutter` | Standalone: no body scroll; embedded: defers to parent `ScrollView` | `PlayStackHeader` + HUD when standalone | Heavy `HOME_SOFT_UI` + literals (`#FFB347`, `#FF8A00`); density from dimensions | Same density helpers as question embed path |
| **play/end** | **PlayScaffold** defaults | Default safe area (all edges implicit) | Scaffold `contentFit`: `LAYOUT.screenGutter` | Default body **scroll enabled** + framed card | Default **`PlayStackHeader`** + optional HUD | **`useTheme()`** palette colors, not cream canvas; winner card uses `colors.primary` tints | No landscape-specific tuning |
| **game** | Hand-roll | `SafeAreaView` default edges | Header `paddingHorizontal: SPACING.xl` (24) — **wider than gutter** | `flex:1` board; panel centered `maxWidth: 600`; no `minHeight:0` on `content` | Custom row: Ionicons back/close, **no `GameHeader`** | `height: 80` header; `#FFB347` answer; `#10B981`/`#EF4444` icons | **No** landscape density; legacy mock path |
| **game-recap** | Hand-roll | `SafeAreaView` only | `SPACING.lg` header + scroll content | `ScrollView` full page | Title + `Button` "Close" — **no back chip pattern** | `fontSize: 30` hero; **`useTheme()`** white/default palette | Modal-style; not landscape-tuned |

---

## Key Code References

**PlayScaffold contract** (`features/play/components/PlayScaffold.tsx`):

```95:96:features/play/components/PlayScaffold.tsx
  const padLeft = Math.max(insets.left, LAYOUT.screenGutter);
  const padRight = Math.max(insets.right, LAYOUT.screenGutter);
```

```223:226:features/play/components/PlayScaffold.tsx
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: shellBackground }]}
      edges={bodyEdgeToEdge ? ['top', 'bottom'] : undefined}
    >
```

**Token gutters** (`constants/theme.ts`):

```195:200:constants/theme.ts
export const LAYOUT = {
  /** Single-column flows (auth, forms, play hub stack) */
  contentMaxWidth: 560,
  /** Horizontal inset for primary column content */
  screenGutter: SPACING.lg,
} as const;
```

**Question screen bypasses scaffold** (`app/(app)/play/question.tsx`):

```436:456:app/(app)/play/question.tsx
  return (
    <View style={[styles.canvas, { backgroundColor: surfaceColors.canvas }]}>
      <View
        style={[
          styles.matchTopWrap,
          {
            paddingTop: Math.max(insets.top, Platform.OS === 'web' ? SPACING.sm : insets.top),
            paddingLeft: Math.max(insets.left, headerHorizontalPadding),
            paddingRight: Math.max(insets.right, headerHorizontalPadding),
          },
        ]}
      >
        <PlayMatchTopBar
```

---

## Ranked Top Inconsistencies

| Rank | Severity | Issue | Affected screens |
|------|----------|-------|------------------|
| 1 | **High** | **Two layout systems:** match phase (`question`, `board`, embedded answer) hand-roll safe area + chrome; setup phase uses `PlayScaffold` / raw `SafeAreaView` | question, board, answer, vs mode, quick-length, end |
| 2 | **High** | **Header pattern split three ways:** (A) `PlayStackHeader` + tokens, (B) `GameHeader` inline (mode, quick-length), (C) `PlayMatchTopBar` / categories custom bar | All play routes |
| 3 | **High** | **Horizontal gutter inconsistency:** `LAYOUT.screenGutter` (16) vs `SPACING.screenPadding` (20) unused vs `SPACING.xl` (24) on `game.tsx` vs `SPACING.sm`/`md` overrides on team-setup | game, team-setup, question (dynamic % padding) |
| 4 | **Medium** | **Color source split:** cream `HOME_SOFT_UI` / `getPlaySurfaceColors()` vs `useTheme()` palette on `end` and `game-recap` — end screen feels like a different app skin | end, game-recap, vs board/categories |
| 5 | **Medium** | **`team-setup` drops token chip** in `customHeader` (`logoTitle` only) while adjacent screens show `HubTokenChip` | team-setup vs mode/quick-length/PlayStackHeader |
| 6 | **Medium** | **Safe-area edge policy inconsistent:** mode/quick-length use all 4 edges; PlayScaffold edge-to-edge uses top+bottom only (horizontal via padding); question omits `SafeAreaView` entirely | mode, quick-length, question, board |
| 7 | **Medium** | **Scroll ownership unclear:** categories floating CTA + `paddingBottom: 160`; team-setup nested scroll inside non-scroll scaffold; end uses scaffold scroll while content could overflow on small landscape | categories, team-setup, end |
| 8 | **Low** | **`game.tsx` / `game-recap.tsx` legacy shells** don't follow play soft-UI or scaffold (separate store `useGameStore`) | game, game-recap |
| 9 | **Low** | **Hardcoded radii/colors** instead of `BORDER_RADIUS.*` / `COLORS.*` (e.g. 14 vs `BORDER_RADIUS.sm` 16, `#FF8A00` vs `COLORS.secondary`) | question, PlayAnswerPanel, categories, board |

---

## Recommended Standard (for consolidation)

**Tier A — Setup / hub (mode, quick-length, team-setup, end):**

```tsx
<PlayScaffold
  title={...}
  backgroundColor={getPlaySurfaceColors().canvas}
  bodyScrollEnabled={needsScroll}
  bodyFrame={true}  // bordered card for forms
  onBack={...}
>
  {children}
</PlayScaffold>
```

- Always `PlayStackHeader` (or single documented `customHeader` variant with token chip).
- Gutters: `LAYOUT.screenGutter` only; avoid `SPACING.screenPadding` unless aligning to auth screens explicitly.

**Tier B — Match / board (board, question, answer phase):**

```tsx
<PlayScaffold
  backgroundColor={canvas}
  customHeader={<PlayMatchTopBar ... />}  // or categories-style toolbar where needed
  bodyEdgeToEdge
  bodyFrame={false}
  bodyScrollEnabled={false}
  contentSafeAreaHorizontal  // prefer true; board may opt out if grid self-pads
  footerBare / footerAboveBody as needed
>
  {/* flex:1 minHeight:0; FlatList or ScrollView only when content overflows */}
</PlayScaffold>
```

- Migrate `question.tsx` onto Tier B scaffold instead of raw `View` + manual insets.
- Embed `PlayAnswerPanel` with `embedded scrollEmbedded` inside question's body scroll slot.

**Tier C — Legacy / modal (`game-recap`):** Either wrap in `PlayScaffold` or share `ScreenContent` + `PlayStackHeader` for visual parity.

---

## Architecture Summary

```
play/_layout (landscape stack, auth gate)
  ├─ mode, quick-length     → SafeAreaView + GameHeader (hand-roll)
  ├─ team-setup, end        → PlayScaffold (default / custom header)
  ├─ categories             → PlayScaffold edge-to-edge + custom header + FlatList
  ├─ board                  → PlayScaffold edge-to-edge + PlayMatchTopBar
  ├─ question               → Hand-roll canvas + PlayMatchTopBar + ScrollView
  ├─ answer                 → PlayAnswerPanel → PlayScaffold (standalone) or embedded
  └─ game / game-recap      → Outside main play scaffold conventions (legacy)
```

**Dependencies:** `ScreenContent`, `GameHeader`, `PlayStackHeader`, `PlayMatchTopBar`, `PlayAnswerPanel`, `getPlaySurfaceColors`, `useSafeAreaInsets`, `useWindowDimensions`, `responsiveTypography`.

---

## Start Here

Open **`features/play/components/PlayScaffold.tsx`** first — it encodes the flex/scroll/safe-area contract (`edgeChromeWrap`, `edgeBodySlot`, `contentSafeAreaHorizontal`). Then **`app/(app)/play/question.tsx`** — largest hand-rolled screen and the main gap vs board/categories scaffold usage.

---

## Files Retrieved

1. `constants/theme.ts` (lines 112–224) — SPACING, LAYOUT, HEADER tokens  
2. `features/play/components/PlayScaffold.tsx` (lines 1–381) — canonical shell  
3. `features/play/components/PlayStackHeader.tsx` (lines 1–83) — default header  
4. `features/play/components/PlayAnswerPanel.tsx` (lines 272–1104, 1086–1102) — embed vs standalone  
5. `components/ScreenContent.tsx` (lines 1–47) — max-width / fullWidth  
6. `app/(app)/play/mode.tsx` (lines 112–190) — hand-roll hub  
7. `app/(app)/play/quick-length.tsx` (lines 177–243) — hand-roll list  
8. `app/(app)/play/team-setup.tsx` (lines 628–684, 751–761) — scaffold + nested scroll  
9. `app/(app)/play/categories.tsx` (lines 528–827) — edge-to-edge + FlatList  
10. `app/(app)/play/board.tsx` (lines 802–907, 498–520) — edge-to-edge board grid  
11. `app/(app)/play/question.tsx` (lines 436–767) — hand-roll match UI  
12. `app/(app)/play/answer.tsx` (lines 1–5) — panel wrapper  
13. `app/(app)/play/end.tsx` (lines 46–127) — default scaffold recap  
14. `app/(app)/game.tsx` (lines 110–344) — legacy game shell  
15. `app/(app)/game-recap.tsx` (lines 46–157) — modal recap shell  
16. `app/_layout.tsx` (lines 56–77) — landscape lock  

---

## Residual Risks

- Consolidating `question` onto `PlayScaffold` may regress rumble/hot-seat header layouts and answer-phase sticky dock positioning.  
- Unifying gutters to 16px may clip content currently tuned for 20–24px on `game` and web category grid.  
- `end` / `game-recap` palette switch to cream canvas is a product decision, not purely mechanical.  
- `team-setup` `logoTitle` header may be intentional (brand moment); restoring token chip needs UX confirmation.
