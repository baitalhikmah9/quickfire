# Double Down — Agent Context

## Codebase Overview

Double Down is a competitive multiplayer trivia mobile app built with **Expo SDK 55** (React Native 0.83, React 19.2). It uses Expo Router for navigation, **Clerk** for auth, **Convex** for backend/data, **Zustand** for ephemeral UI state, and TypeScript throughout.

**Stack**: Expo, React Native, TypeScript, Clerk, Convex, Zustand

**Structure**: Feature-based architecture with Expo Router file-based routing

For detailed architecture, see [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md).

For colors, typefaces, and UI usage rules, see [docs/BRAND_GUIDELINES.md](docs/BRAND_GUIDELINES.md).

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
- **Responsive play UI:** Avoid clipping on any screen size—use `flex: 1` / `minHeight: 0`, `ScrollView` when content can overflow, density from `useWindowDimensions` (width and height), and alternate layouts (e.g. stacked controls) when width is tight.

### Environment Variables
```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=
EXPO_PUBLIC_CONVEX_URL=
CLERK_JWT_ISSUER_DOMAIN=  # Set in Convex dashboard
```

### Commands
```bash
bun run start        # Dev server
bun run test         # Run tests
npx convex dev       # Backend dev
```
