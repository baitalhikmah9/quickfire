# Double Down

Competitive multiplayer trivia — pick categories, split into teams, and outscore your rivals on a shared board. Built with Expo, Clerk, Convex, and Zustand.

## Features

- **Expo Router** — file-based routing with auth and app route groups
- **TypeScript** — full type safety with Zod validation
- **Clerk Auth** — sign-in, sign-up, MFA; all game modes require authentication
- **Convex Backend** — real-time database, queries, and mutations
- **Zustand** — ephemeral UI state (auth, game session, theme)
- **Theming** — 6 palettes, design tokens, runtime theme switching
- **Gameplay** — lobby wizard, deterministic game-reducer phase machine, landscape board
- **i18n & Locale** — category/question content separated for localization
- **Cross-platform** — iOS, Android, and web from one codebase

## Quick Start

> Requires [Bun](https://bun.sh) and an Expo-compatible simulator or device.

```bash
bun install
cp .env.example .env   # fill in your Clerk and Convex values
bun start
```

Run on a specific platform:

```bash
bun run ios
bun run android
bun run web
```

### Convex Backend (local dev)

Use the Convex dev workflow from [CLAUDE.md](./CLAUDE.md) against this repo's `convex/` folder. Set `CLERK_JWT_ISSUER_DOMAIN` in the Convex dashboard (see `.env.example`). More context: [Convex docs](https://docs.convex.dev).

## Project Structure

```
app/
├── _layout.tsx               # Root: fonts, splash, providers
├── index.tsx                  # Root entry / routing
├── how-to-play.tsx            # Full-screen instructions
├── (auth)/
│   ├── _layout.tsx            # Auth gate (redirects if signed in)
│   ├── sign-in.tsx             # Login + MFA
│   ├── sign-up.tsx             # Registration
│   └── forgot-password.tsx     # Password reset (TODO)
└── (app)/
    ├── _layout.tsx              # Signed-in stack
    ├── index.tsx                # App hub
    ├── profile.tsx / store.tsx  # Profile & store surfaces
    ├── create-game.tsx          # Multi-step game wizard
    ├── game.tsx                 # Active gameplay (landscape)
    ├── lobby-settings.tsx       # Lobby config
    ├── rules.tsx / game-recap.tsx
    ├── theme-picker.tsx
    ├── language-picker.tsx / content-languages-picker.tsx
    └── play/                    # Play flow (mode, categories, teams, board, Q&A, end)
        ├── _layout.tsx
        ├── index.tsx, mode.tsx, quick-length.tsx
        ├── categories.tsx, team-setup.tsx, board.tsx
        ├── question.tsx, answer.tsx, end.tsx
        └── …

features/
├── gameplay/                    # Game reducer, Board component
├── lobby/                       # Lobby builder, step wizards, lifelines
└── shared/                      # Shared types (GameMode, GameConfig, etc.)

convex/                          # Backend (schema, queries, mutations, seed)
store/                           # Zustand stores (auth, game, theme)
lib/                             # Providers, hooks (useTheme, useNotifications)
components/                      # Reusable UI (Button, ErrorBoundary)
constants/                       # Design tokens, theme, categories, questions
types/                           # Shared TypeScript definitions
```

## Key Dependencies

| Package | Purpose |
|---------|---------|
| Expo SDK 55 | Framework (React Native 0.83, React 19.2) |
| expo-router | File-based navigation |
| @clerk/clerk-expo | Authentication |
| convex | Backend / database |
| zustand | Client-side state |
| zod | Runtime validation |
| react-native-screens | Native navigation |
| expo-screen-orientation | Landscape lock during gameplay |
| expo-secure-store | Secure persistence |

## Environment Variables

Copy `.env.example` to `.env` and fill in values. Never commit secrets.

| Variable | Where to get it |
|----------|----------------|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → API Keys |
| `EXPO_PUBLIC_CONVEX_URL` | Convex dashboard → project URL |
| `CLERK_JWT_ISSUER_DOMAIN` | Set in Convex dashboard env vars — your Clerk Frontend API URL |

## Scripts

```bash
bun run start          # Expo dev server
bun run ios            # iOS simulator
bun run android        # Android emulator
bun run web            # Web
bun run test           # Jest
bun run test:watch     # Jest watch mode
bun run lint           # ESLint
bun run seed:normalize # Normalize questions.json → seed data
```

## License

MIT
