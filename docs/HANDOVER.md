# Backfire — Services & Accounts Handover

Last updated: 2026-10-06

Inventory of connected services used by **Backfire** (`playbackfire.com`), with account names and emails where known. **Do not put API keys, secrets, or webhook tokens in this file.** Secrets live in local `.env*` (gitignored), Convex dashboard env, Vercel env, and operator password managers.

## People

| Role | Name | Email / login | Notes |
| --- | --- | --- | --- |
| Product / client | Mohamad Ammar Aldaker (Ammar) | `ammardaker2003@gmail.com` | Client; GitHub `Ald4ker`; Companies House officer for BACKFIRE STUDIOS LTD |
| Engineering | Mikhail Wijanarko | `mikhailspeaks@gmail.com` (primary ops), `mikhail.wijanarko2003@gmail.com` (git) | Primary builder; Expo owner `mikhailspeaks`; Notion workspace owner |
| Client GitHub / org login | baitalhikmah9 | `baitalhikmah9@gmail.com` | Owns production GitHub repo |

Legal entity on App Store / Play listings: **BACKFIRE STUDIOS LTD** (Companies House `17305284`, officer ALDAKER, Mohamad Ammar). Registered office: Bartle House, 9 Oxford Court, Manchester, M2 3WQ.

## Connected services

### 1. GitHub

| Field | Value |
| --- | --- |
| Repo | https://github.com/baitalhikmah9/quickfire |
| Owner account | `baitalhikmah9` (`baitalhikmah9@gmail.com`) |
| Upstream / historical fork | `Ald4ker/quickfire` (Ammar) |
| Mikhail GitHub (personal) | `mwijanarko1` |

### 2. Expo / EAS

| Field | Value |
| --- | --- |
| App name / slug | BackFire / `backfire` |
| Expo owner | `mikhailspeaks` |
| Account email (ops) | `mikhailspeaks@gmail.com` |
| EAS project id | `ed21e462-752d-4c84-b233-c0fa0b48be25` |
| Bundle / package | `com.playbackfire.app` |
| Dashboard | https://expo.dev |

Release builds are **local only** (`bun run build:android:prod`, `bun run build:ios:prod`). Do not run cloud EAS builds.

### 3. Clerk (auth)

| Field | Value |
| --- | --- |
| Production Frontend API | `https://clerk.playbackfire.com` |
| Development instance | `worthy-primate-45.clerk.accounts.dev` |
| Dashboard | https://dashboard.clerk.com |
| Test / admin sign-in used in QA | `mikhailspeaks@gmail.com` |

Org billing owner email for the Clerk applications should be confirmed in the Clerk dashboard (often Ammar / BACKFIRE STUDIOS). Custom domain DNS for `clerk.playbackfire.com` CNAMEs to Clerk.

### 4. Convex (backend)

| Field | Value |
| --- | --- |
| Team | `baitul-hikmah` |
| Project | `doubledown` |
| Production deployment | `energized-hummingbird-439` → `https://energized-hummingbird-439.eu-west-1.convex.cloud` |
| Development deployment | `successful-wildcat-165` → `https://successful-wildcat-165.eu-west-1.convex.cloud` |
| Dashboard | https://dashboard.convex.dev |

Team name matches the Bait Al Hikmah / `baitalhikmah9` client org. Confirm the Convex org owner email in the Convex team settings.

Required Convex dashboard env (names only; values are secrets): `CLERK_JWT_ISSUER_DOMAIN`, `CLERK_SECRET_KEY`, `REVENUECAT_WEBHOOK_AUTH_HEADER`, `REVENUECAT_V2_SECRET_API_KEY`, `REVENUECAT_PROJECT_ID`.

### 5. RevenueCat (IAP + web billing)

| Field | Value |
| --- | --- |
| Dashboard | https://app.revenuecat.com |
| Native stores | App Store + Google Play (`com.playbackfire.app`) |
| Web | RevenueCat Billing (Stripe gateway) via `@revenuecat/purchases-js` |
| Public key env vars | `EXPO_PUBLIC_REVENUECAT_*` (see `.env.example`) |

Confirm RevenueCat project owner email in the RevenueCat account settings. Stripe for web checkout is attached through RevenueCat Web Billing, not a separate app-owned Stripe integration in this repo.

### 6. Vercel (web hosting)

| Field | Value |
| --- | --- |
| Production site | https://playbackfire.com (also `www`) |
| Admin | https://admin.playbackfire.com |
| Hosting signal | Responses served by Vercel; `admin` CNAME → Vercel DNS |
| Deploy docs | [docs/vercel-web-deployment.md](./vercel-web-deployment.md) |

Mikhail’s local Vercel CLI (`paretoeducation` / hobby) is **not** the Backfire production project. Confirm the Vercel team/account email that owns `playbackfire.com` (expected: Ammar / BACKFIRE STUDIOS / baitalhikmah org).

Public client env on Vercel (names only): `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_CONVEX_URL`, `EXPO_PUBLIC_REVENUECAT_WEB_API_KEY`, optional `EXPO_PUBLIC_SITE_ORIGIN`.

### 7. Apple App Store Connect

| Field | Value |
| --- | --- |
| Seller | BACKFIRE STUDIOS LTD |
| App | BackFire Trivia |
| Apple app id (`ascAppId`) | `6790765031` |
| Bundle id | `com.playbackfire.app` |
| Store URL | https://apps.apple.com/app/id6790765031 |

Not present on Mikhail’s personal Apple Developer account. Access is under the BACKFIRE STUDIOS / Ammar Apple Developer membership. Confirm Apple ID email used for ASC login with Ammar.

### 8. Google Play Console

| Field | Value |
| --- | --- |
| Developer listing | BackFire Studios |
| Package | `com.playbackfire.app` |
| Store URL | https://play.google.com/store/apps/details?id=com.playbackfire.app |

Confirm Play Console owner Google account email with Ammar (typically the same org as App Store / client).

### 9. Domain — GoDaddy

| Field | Value |
| --- | --- |
| Domain | `playbackfire.com` |
| Registrar | GoDaddy.com, LLC |
| Nameservers | `ns03.domaincontrol.com`, `ns04.domaincontrol.com` |
| Expiry (WHOIS) | 2027-07-04 |
| Registrant | Privacy-protected (Domains By Proxy) |

Confirm GoDaddy login email with Ammar. DNS points web/admin to Vercel and `clerk.playbackfire.com` to Clerk.

### 10. Notion (client fix board)

| Field | Value |
| --- | --- |
| Workspace | Mikhail Speaks’s Space |
| Ops owner | Mikhail (`mikhailspeaks@gmail.com`) |
| Client | Ammar |
| Kanban | https://app.notion.com/p/3ba15c9fd0008138b525d6beeebb72e7 |
| Hub | https://app.notion.com/p/Backfire-3ba15c9fd00080a5a64ce60984557a4d |
| Agent integration name | `Backfire Agent` |
| Local secrets (not in git) | `~/.config/backfire/notion.env`, `~/.config/backfire/notion_token` |

See [docs/CLIENT_FIX_REQUESTS.md](./CLIENT_FIX_REQUESTS.md).

### 11. Google Sheets (question bank)

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
| Local / EAS development profiles | `worthy-primate-45.clerk.accounts.dev` | `successful-wildcat-165` | Test Store |
| Production (native + web) | `clerk.playbackfire.com` | `energized-hummingbird-439` | Production App Store / Play (+ live web billing key on Vercel) |

Template for required env names: [.env.example](../.env.example).

## Ownership summary

| Service | Likely / confirmed owner | Access email(s) |
| --- | --- | --- |
| GitHub repo | Client (`baitalhikmah9`) | `baitalhikmah9@gmail.com` |
| App Store / Play / company | BACKFIRE STUDIOS LTD (Ammar) | Confirm Apple ID + Play Google account with Ammar; Ammar contact `ammardaker2003@gmail.com` |
| Domain (GoDaddy) | Client / company | Confirm with Ammar |
| Vercel (playbackfire.com) | Client / company (not Mikhail’s paretoeducation CLI login) | Confirm with Ammar |
| Convex team `baitul-hikmah` | Client org | Confirm in Convex team settings |
| Clerk production | Client / company (custom domain on playbackfire.com) | Confirm in Clerk org settings |
| RevenueCat + Stripe (via RC) | Client / company | Confirm in RevenueCat / Stripe dashboards |
| Expo / EAS | Mikhail (`mikhailspeaks`) | `mikhailspeaks@gmail.com` — **plan transfer if product ownership moves** |
| Notion fix board | Mikhail workspace; Ammar collaborator | `mikhailspeaks@gmail.com` |
| Question Google Sheet | Mikhail | `mikhailspeaks@gmail.com` |

## Gaps to confirm with Ammar

Fill these in during handover call (emails only, no passwords):

1. Apple Developer / App Store Connect login email for BACKFIRE STUDIOS LTD  
2. Google Play Console owner email  
3. Vercel team/account email that owns `playbackfire.com`  
4. GoDaddy account email for `playbackfire.com`  
5. Clerk organization owner email (prod + dev)  
6. Convex team `baitul-hikmah` owner email  
7. RevenueCat account owner email (+ Stripe account attached to RC Web Billing)  
8. Whether Expo project `mikhailspeaks/backfire` should transfer to a client Expo org  

## Related docs

- [CODEBASE_MAP.md](./CODEBASE_MAP.md) — architecture  
- [vercel-web-deployment.md](./vercel-web-deployment.md) — web deploy  
- [CLIENT_FIX_REQUESTS.md](./CLIENT_FIX_REQUESTS.md) — Notion kanban  
- [BRAND_GUIDELINES.md](./BRAND_GUIDELINES.md) — brand  
- Root [README.md](../README.md) — quick start  
