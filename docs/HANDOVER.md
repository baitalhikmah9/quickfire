# Backfire — Services & Accounts Handover

Last updated: 2026-10-06

Inventory of connected services used by **Backfire** (`playbackfire.com`), with account names and emails where known. **Do not put API keys, secrets, or webhook tokens in this file.** Secrets live in local `.env*` (gitignored), Convex dashboard env, Vercel env, and operator password managers.

## Connected services

### 1. GitHub

| Field | Value |
| --- | --- |
| Repo | https://github.com/baitalhikmah9/quickfire |
| Owner account | `baitalhikmah9` (`baitalhikmah9@gmail.com`) |

### 2. Android release builds (local Gradle)

Android store binaries are produced **locally with Gradle** on this machine. There is no Expo / EAS cloud build account in the release path.

| Field | Value |
| --- | --- |
| Package | `com.playbackfire.app` |
| Production command | `bun run build:android:prod` (loads `.env.production`, runs a local production AAB via Gradle) |
| Gradle / SDK | `GRADLE_USER_HOME=$HOME/.gradle`; Android SDK on the Seagate volume (`ANDROID_HOME` / `ANDROID_SDK_ROOT`) |

Do not run cloud EAS / Expo remote builds.

### 3. Clerk (auth)

| Field | Value |
| --- | --- |
| Production Frontend API | `https://clerk.playbackfire.com` |
| Development instance | `worthy-primate-45.clerk.accounts.dev` |
| Dashboard | https://dashboard.clerk.com |
| Account | `baitalhikmah9@gmail.com` (Google sign-in) |

Custom domain DNS for `clerk.playbackfire.com` CNAMEs to Clerk.

### 4. Convex (backend)

| Field | Value |
| --- | --- |
| Team | `baitul-hikmah` |
| Project | `doubledown` |
| Production deployment | `energized-hummingbird-439` → `https://energized-hummingbird-439.eu-west-1.convex.cloud` |
| Development deployment | `successful-wildcat-165` → `https://successful-wildcat-165.eu-west-1.convex.cloud` |
| Dashboard | https://dashboard.convex.dev |
| Account | `baitalhikmah9@gmail.com` (Google sign-in) |

Required Convex dashboard env (names only; values are secrets): `CLERK_JWT_ISSUER_DOMAIN`, `CLERK_SECRET_KEY`, `REVENUECAT_WEBHOOK_AUTH_HEADER`, `REVENUECAT_V2_SECRET_API_KEY`, `REVENUECAT_PROJECT_ID`.

### 5. RevenueCat (IAP + web billing)

| Field | Value |
| --- | --- |
| Dashboard | https://app.revenuecat.com |
| Native stores | App Store + Google Play (`com.playbackfire.app`) |
| Web | RevenueCat Billing (Stripe gateway) via `@revenuecat/purchases-js` |
| Stripe account | `aldakerchayah@gmail.com` |
| Public key env vars | `EXPO_PUBLIC_REVENUECAT_*` (see `.env.example`) |

Confirm RevenueCat project owner email in the RevenueCat account settings. Stripe for web checkout is attached through RevenueCat Web Billing.

### 6. Vercel (web hosting)

| Field | Value |
| --- | --- |
| Production site | https://playbackfire.com (also `www`) |
| Admin | https://admin.playbackfire.com |
| Hosting signal | Responses served by Vercel; `admin` CNAME → Vercel DNS |
| Deploy docs | [docs/vercel-web-deployment.md](./vercel-web-deployment.md) |
| Account | `baitalhikmah9@gmail.com` (Google sign-in) |

Public client env on Vercel (names only): `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_CONVEX_URL`, `EXPO_PUBLIC_REVENUECAT_WEB_API_KEY`, optional `EXPO_PUBLIC_SITE_ORIGIN`.

### 7. Apple App Store Connect

| Field | Value |
| --- | --- |
| Seller | BACKFIRE STUDIOS LTD |
| App | BackFire Trivia |
| Apple app id (`ascAppId`) | `6790765031` |
| Bundle id | `com.playbackfire.app` |
| Store URL | https://apps.apple.com/app/id6790765031 |
| Account | `baitalhikmah9@gmail.com` |

### 8. Google Play Console

| Field | Value |
| --- | --- |
| Developer listing | BackFire Studios |
| Package | `com.playbackfire.app` |
| Store URL | https://play.google.com/store/apps/details?id=com.playbackfire.app |
| Account | `aldakerchayah@gmail.com` |

### 9. Domain — GoDaddy

| Field | Value |
| --- | --- |
| Domain | `playbackfire.com` |
| Registrar | GoDaddy.com, LLC |
| Nameservers | `ns03.domaincontrol.com`, `ns04.domaincontrol.com` |
| Expiry (WHOIS) | 2027-07-04 |
| Registrant | Privacy-protected (Domains By Proxy) |
| Account | `aldakerchayah@gmail.com` |

DNS points web/admin to Vercel and `clerk.playbackfire.com` to Clerk.

### 10. Google Sheets (question bank)

| Field | Value |
| --- | --- |
| Sheet | “new gen knowledge qs” |
| Spreadsheet id | `13sCvR45Gzar8uUrZk9DT2LLqv4PK-JxSsb2Egz-prxU` |
| Tabs | `Trivia Database`, `Mikhail` |
| Account | `mikhailspeaks@gmail.com` |
| Agent skill | `.agents/skills/backfire-question-sheet/` |

## Environment map (no secrets)

| Environment | Clerk | Convex | RevenueCat store mode |
| --- | --- | --- | --- |
| Local / development | `worthy-primate-45.clerk.accounts.dev` | `successful-wildcat-165` | Test Store |
| Production (native + web) | `clerk.playbackfire.com` | `energized-hummingbird-439` | Production App Store / Play (+ live web billing key on Vercel) |

Template for required env names: [.env.example](../.env.example).

## Ownership summary

| Service | Access email(s) |
| --- | --- |
| GitHub | `baitalhikmah9@gmail.com` |
| Clerk | `baitalhikmah9@gmail.com` (Google) |
| Convex | `baitalhikmah9@gmail.com` (Google) |
| Vercel | `baitalhikmah9@gmail.com` (Google) |
| App Store Connect | `baitalhikmah9@gmail.com` |
| Google Play Console | `aldakerchayah@gmail.com` |
| GoDaddy | `aldakerchayah@gmail.com` |
| Stripe (RC Web Billing) | `aldakerchayah@gmail.com` |
| RevenueCat | Confirm in RevenueCat dashboard |
| Question Google Sheet | `mikhailspeaks@gmail.com` |

## Gaps to confirm

1. RevenueCat account owner email  

## Related docs

- [CODEBASE_MAP.md](./CODEBASE_MAP.md) — architecture  
- [vercel-web-deployment.md](./vercel-web-deployment.md) — web deploy  
- [BRAND_GUIDELINES.md](./BRAND_GUIDELINES.md) — brand  
- Root [README.md](../README.md) — quick start  
