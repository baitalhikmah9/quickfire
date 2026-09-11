# Backfire — Agent Context

## Codebase Overview

Backfire is a competitive multiplayer trivia mobile app built with **Expo SDK 55** (React Native 0.83, React 19.2). It uses Expo Router for navigation, **Clerk** for auth, **Convex** for backend/data, **Zustand** for ephemeral UI state, and TypeScript throughout.

**Stack**: Expo, React Native, TypeScript, Clerk, Convex, Zustand

**Structure**: Feature-based architecture with Expo Router file-based routing

For detailed architecture, see [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md).

For colors, typefaces, and UI usage rules, see [docs/BRAND_GUIDELINES.md](docs/BRAND_GUIDELINES.md).

**Client fix requests (Ammar):** Notion kanban is the source of truth. See [docs/CLIENT_FIX_REQUESTS.md](docs/CLIENT_FIX_REQUESTS.md). Board: https://app.notion.com/p/3ba15c9fd0008138b525d6beeebb72e7

## Quick Reference

### Key Directories
- `app/` — Expo Router screens (file-based routing)
- `features/` — Feature-first modules (gameplay, lobby, shared types)
- `convex/` — Backend (schema, queries, mutations)
- `store/` — Zustand stores (auth, game, theme)
- `components/` — Reusable UI components
- `constants/` — Design tokens and question data

### Important Gotchas
- Legacy `constants/legacy.ts` is narrow; product UI should use `constants/theme.ts` (aligned with `docs/BRAND_GUIDELINES.md`).
- All imports should use `@/` path alias
- Auth required for all game modes (no guest play)
- Game screen forces landscape on mobile
- Must call `hydrate()` before first render for theme
- **Responsive play UI:** Avoid clipping on any screen size. Use `flex: 1` / `minHeight: 0`, `ScrollView` when content can overflow, density from `useWindowDimensions` (width and height), and alternate layouts (e.g. stacked controls) when width is tight.
- **Tests:** `bun run test -- --runInBand <file>` (Jest). Never `bun test` (Bun runner fails on RN flow types).
- **Device QA:** `python3 ~/.agents/scripts/android_preflight.py` before mobile-mcp or android_screen_state. Empty `adb devices` or an unmounted Seagate volume means no screenshots; do not retry MCP calls.
- **Git paths:** Quote Expo Router parentheses: `git diff -- 'app/(app)/play/board.tsx'`. Diff options before `--`.
- **NEVER cloud EAS builds.** Do not run `eas build` without `--local`. Do not start remote/cloud EAS builds for Android or iOS. Store release binaries are produced on this machine only (`--local` is required).
- **Android release builds:** Always local, always production profile, always load `.env.production` (source of truth for prod Convex/Clerk/RevenueCat). Use `bun run build:android:prod`. Do not ship builds that can pick up `.env.local` dev values. Script forces `GRADLE_USER_HOME=$HOME/.gradle` and `ANDROID_HOME=/Volumes/Mikhail Seagate 2TB SSD/AndroidDev/sdk` (SDK lives on the Seagate SSD; the old `~/Library/Android/sdk` copy was removed as a duplicate, so do not recreate it).
- **iOS release builds:** Always local, always production profile, always load `.env.production`. Use `bun run build:ios:prod`. Then stage/submit with `asc` (App Store Connect CLI). App Store `CFBundleVersion` must increase app-wide (next after 11 is 12+). **Xcode is at `/Applications/Xcode.app` → symlink to `Mikhail Seagate 2TB SSD`; that volume must be mounted** or the build fails with “Unable to locate Xcode”. Script sets `DEVELOPER_DIR` and aborts early if `xcodebuild` is missing.

### Environment Variables
```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=
EXPO_PUBLIC_CONVEX_URL=
CLERK_JWT_ISSUER_DOMAIN=  # Set in Convex dashboard
```

### Commands
```bash
bun run start                 # Dev server
bun run test                  # Jest (never `bun test`)
bun run test -- --runInBand __tests__/app/board.test.tsx
npx convex dev                # Backend dev
bun run build:android:prod    # Local Play AAB (production env only)
bun run build:ios:prod        # Local App Store IPA (production env only)
```
