# Backfire

**Competitive multiplayer trivia** — pick categories, split into teams, and outscore your rivals on a shared board. Built with Expo SDK 55, Clerk, Convex, and Zustand.

Play at [playbackfire.com](https://playbackfire.com).

For a deeper architectural overview, see [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md). For brand guidelines (colors, typography, surface treatment), see [docs/BRAND_GUIDELINES.md](docs/BRAND_GUIDELINES.md).

## Features

- **Expo Router** — file-based routing with `(auth)`, `(app)`, `(admin)`, and standalone `admin/` route groups
- **TypeScript** — full type safety with Zod validation across shared domain types
- **Clerk Auth** — sign-in, sign-up, MFA, OAuth; all game modes require authentication
- **Convex Backend** — real-time database, queries, mutations, payments, wallets, promo codes, webhooks, session/device management
- **Zustand** — ephemeral UI state across 7 stores (auth, game, play, theme, locale, offline queue, persistence)
- **Theming** — soft-UI neumorphic design tokens; runtime light theme switching via themes/
- **Game Modes** — 4 modes: **QuickPlay** (rapid token-burning speed rounds), **Classic** (full-length categories), **Random** (shuffle categories), **Rumble** (simultaneous-screen team showdown with 90-second timer buckets)
- **Gameplay** — lobby wizard, deterministic game-reducer phase machine, landscape board, per-team lifelines, wager system, bonus matches
- **i18n & Locale** — 12 supported languages (EN, ES, FR, AR, HI, BN, UR, RU, ID, PT-BR, ZH-Hans), RTL support, content localization chain
- **Economy** — virtual wallet (token store, payment catalog, promo code redemption, purchase ledger)
- **Admin Dashboard** — web-only, two route groups: public sign-in + authenticated shell (promo code management, wallet lookup, user profile admin)
- **Web Deployment** — static export via `expo export --platform web`, Vercel-ready with SPA rewrites, SEO (Open Graph, canonical URLs via `constants/site.ts`, `WebSeoHead` component)
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

```bash
npx convex dev          # starts local backend + watches convex/ for changes
```

Set `CLERK_JWT_ISSUER_DOMAIN` in the Convex dashboard env vars (your Clerk Frontend API URL). See `.env.example` for reference. More context: [Convex docs](https://docs.convex.dev).

### Web deployment (Vercel)

```bash
bun run build:web       # static export to dist/
```

The `vercel.json` at root configures `bun install`, the build command, and SPA rewrites. Set `EXPO_PUBLIC_SITE_ORIGIN` for canonical URLs.

## Project Structure

```
app/
├── _layout.tsx                    # Root: fonts, splash, providers
├── index.tsx                      # Root entry / routing
├── +html.tsx                      # Web HTML shell (SEO meta, fonts)
├── how-to-play.tsx                # Full-screen instructions
├── (auth)/
│   ├── _layout.tsx                # Auth gate (redirects if signed in)
│   ├── sign-in.tsx                # Login + MFA
│   ├── sign-up.tsx                # Registration
│   └── forgot-password.tsx        # Password reset (TODO)
├── (app)/
│   ├── _layout.tsx                # Signed-in stack (landscape)
│   ├── index.tsx                  # App hub — 4 mode cards, token chip, resume overlay
│   ├── settings.tsx               # Settings & preferences
│   ├── store.tsx                  # Token store / purchase
│   ├── create-game.tsx            # Multi-step game wizard
│   ├── game.tsx                   # Active gameplay (landscape)
│   ├── lobby-settings.tsx         # Lobby config
│   ├── rules.tsx / game-recap.tsx
│   ├── theme-picker.tsx / language-picker.tsx
│   ├── content-languages-picker.tsx
│   └── play/                      # Full play flow
│       ├── _layout.tsx            # Auth gate + boot overlay
│       ├── index.tsx              # Redirect to home
│       ├── mode.tsx               # Mode selection
│       ├── quick-length.tsx       # QuickPlay round length
│       ├── team-setup.tsx         # Team configuration
│       ├── categories.tsx         # Category selection
│       ├── board.tsx              # Game board / topic grid
│       ├── question.tsx           # Question + answer phase
│       ├── answer.tsx             # Answer review
│       └── end.tsx                # Game over / recap
├── (admin)/                       # Authenticated admin shell (web-only)
│   ├── _layout.tsx                # Sidebar + topbar + access boundary
│   ├── index.tsx                  # Admin dashboard overview
│   ├── promo-codes.tsx            # Promo code list
│   ├── promo-codes/[promoCodeId].tsx  # Promo code detail/edit
│   ├── wallets.tsx                # Wallet list
│   ├── wallets/[walletId].tsx     # Wallet detail
│   └── sign-out.tsx
└── admin/                         # Standalone admin routes (web-only)
    ├── _layout.tsx                # Blocks native, redirects to sign-in
    ├── index.tsx                  # Admin entry (redirects to (admin)/)
    ├── sign-in.tsx                # Admin-only sign-in
    ├── sign-out.tsx
    ├── promo-codes.tsx            # Redirects
    └── wallets.tsx                # Redirects

features/
├── auth/                          # Auth barrel
├── content/                       # Content barrel
├── gameplay/                      # Game reducer (deterministic state machine), Board component
├── lobby/                         # Lobby builder, step wizards, CategoryCard, lifeline config
├── play/                          # Play flow components
│   ├── components/                # PlayScaffold, ScoreHud, AnswerPanel, WagerInfoModal, etc.
│   ├── data.ts / rumble.ts        # Rumble timer/bucket logic, play data
│   ├── storeBundles.ts / tokenCosts.ts
│   ├── categoryTopicIcon.ts       # Category topic icon resolution
│   └── styles/softSurface.ts      # Soft-UI surface styles
├── profile/                       # Profile barrel
├── promo/                         # Promo code barrel
├── settings/                      # Settings barrel
├── shared/                        # Core domain types (GameMode, GameConfig, TeamState, GameSessionState, etc.)
└── wallet/                        # Wallet barrel

convex/                            # Backend (Convex)
├── schema.ts                      # Database schema
├── auth.config.ts                 # Clerk auth config
├── seed.ts                        # Internal seed mutations
├── admin.ts / adminSignIn.ts      # Admin endpoints
├── content.ts                     # Content queries
├── devices.ts                     # Device management
├── http.ts                        # HTTP actions (webhooks)
├── payments.ts                    # Payment endpoints
├── promo.ts                       # Promo code endpoints
├── sessions.ts                    # Session management
├── users.ts                       # User profile queries
├── wallet.ts                      # Wallet endpoints
└── lib/                           # Backend helpers
    ├── auth.ts / adminValidation.ts
    ├── adminSignInRateLimit.ts
    ├── contentRules.ts
    ├── ensureWallet.ts
    ├── paymentCatalog.ts / paymentWebhook.ts
    ├── promoRules.ts
    ├── purchaserAccounts.ts
    └── walletLedger.ts

store/                             # Zustand stores
├── auth.ts                        # Auth state
├── game.ts                        # Game session state
├── gameSessionPersistence.ts      # Persists/restores session to SecureStore
├── locale.ts                      # Locale preferences
├── offlineSessionQueue.ts         # Queues offline game actions for sync
├── play.ts                        # Play flow (session, tokens, mode start)
└── theme.ts                       # Theme preferences

lib/                               # App-level utilities
├── providers.tsx                  # React context providers (Convex, Clerk, i18n, query)
├── authMode.ts                    # Auth enable/disable flag
├── deviceInstallation.ts / Logic  # Device installation tracking
├── haptics.ts                     # Haptic feedback
├── navigation/landscapeStack.ts   # Shared landscape stack screen options
└── i18n/                          # Internationalization
    ├── config.ts                  # Locale configuration (12 supported locales)
    ├── direction.ts               # RTL direction helpers
    ├── format.ts                  # Number/date formatting
    ├── LocaleProvider.tsx / useI18n.ts
    └── messages/                  # Translation files (ar, bn, en, es, fr, hi, id, pt-BR, ru, ur, zh-Hans)

components/                        # Reusable UI
├── BackfireTitleLogo.tsx
├── ErrorBoundary.tsx
├── GameHeader.tsx                  # Hub header with token chip + settings
├── HeaderBackButton.tsx
├── HeroSection.tsx
├── HubActionCard.tsx / HubTokenChip.tsx
├── OAuthProviderButtons.tsx
├── PillCollapsibleSection.tsx
├── ProfileAuthGate.tsx
├── ScreenContent.tsx
├── WebSeoHead.tsx                  # Open Graph / SEO meta
├── admin/AdminScreenHeader.tsx
└── ui/Button.tsx / Pressable.tsx

constants/                         # Design tokens and data
├── theme.ts                       # Fonts, spacing, layout, brand colors, surfaces
├── legacy.ts                      # Legacy tokens (narrow usage)
├── categories.ts / categoryPictures.ts
├── questions.json                 # Question bank seed data
├── featureFlags.ts / site.ts      # Feature toggles, SEO site config
└── index.ts                       # Barrel exports

themes/                            # Extended theme definitions
├── home-soft-ui.json              # Soft-UI color tokens
└── index.ts                       # HOME_SOFT_UI export

types/                             # Shared TS types
├── user.ts
└── react-test-renderer.d.ts

scripts/                           # Tooling
├── normalize-questions.ts         # Normalize questions.json → seed data
└── transparency-topic-images.py   # Generate transparency topic images

utils/                             # Utility helpers
└── responsiveTypography.ts
```


## Key Dependencies

| Package | Purpose |
|---------|---------|
| Expo SDK 55 | Framework (React Native 0.83, React 19.2) |
| expo-router | File-based navigation |
| @clerk/clerk-expo | Authentication (sign-in, MFA, OAuth) |
| convex | Backend / real-time database |
| zustand | Client-side state management |
| zod | Runtime validation |
| @tanstack/react-query | Data fetching / cache |
| react-native-screens | Native navigation containers |
| expo-screen-orientation | Global landscape orientation |
| expo-secure-store | Secure persistence |
| expo-image | Optimized image component |
| expo-haptics | Haptic feedback |
| expo-notifications | Push notifications |
| expo-linear-gradient | Gradient surfaces |
| expo-web-browser | OAuth browser flows |
| react-native-safe-area-context | Safe area insets |
| react-native-web | Web platform support |

## Environment Variables

Copy `.env.example` to `.env` and fill in values. Never commit secrets.

| Variable | Where to get it |
|----------|----------------|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → API Keys |
| `EXPO_PUBLIC_CONVEX_URL` | Convex dashboard → project URL |
| `EXPO_PUBLIC_SITE_ORIGIN` | Production URL (default: `https://playbackfire.com`) — set for canonical SEO on preview deployments |
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` | RevenueCat dashboard → API keys (iOS / Test Store for sandbox) |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` | RevenueCat dashboard → API keys (Android / Test Store for sandbox) |
| `CLERK_JWT_ISSUER_DOMAIN` | Set in Convex dashboard env vars — your Clerk Frontend API URL |
| `REVENUECAT_WEBHOOK_AUTH_HEADER` | Set in Convex dashboard env vars — shared secret for RevenueCat webhooks |

## Scripts

```bash
bun run start             # Expo dev server
bun run ios               # iOS simulator
bun run android           # Android emulator
bun run web               # Web
bun run build:web         # Static export to dist/ for Vercel deploy
bun run build             # EAS build
bun run test              # Jest
bun run test:watch        # Jest watch mode
bun run test:coverage     # Jest coverage report
bun run lint              # ESLint
bun run seed:normalize    # Normalize questions.json → seed data
bun run topics:transparent # Generate transparency topic images
```

## License

MIT
