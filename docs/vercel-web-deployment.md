# Vercel Web Deployment

Backfire's production web deployment is a static Expo export served by Vercel. This does not replace the native EAS flow; `bun run build` remains the EAS build command for iOS and Android.

## Vercel Project Settings

Use these settings from the repository root:

| Setting | Value |
| --- | --- |
| Framework preset | Other |
| Install command | `bun install --frozen-lockfile` |
| Build command | `bun run vercel-build` |
| Output directory | `dist` |

The build script runs `expo export --platform web`, which matches Expo SDK 55's Metro static web export. Local verification showed the export emits `dist/index.html`, per-route HTML such as `dist/play/mode.html`, `dist/_expo/.routes.json`, `dist/favicon.ico`, `dist/_expo/static/js/web/*.js`, and `dist/assets/**`.

## Routing

The current Expo Router export emits real per-route HTML files, including `dist/play/mode.html`, so Vercel should serve those files directly for known routes. `vercel.json` keeps a catch-all fallback rewrite to `/index.html` for client-side app paths that do not have a matching static file. Vercel serves real static files before rewrites, so route HTML, files under `/_expo/static/**`, `/assets/**`, `/favicon.ico`, and `/_expo/.routes.json` continue to resolve as files.

## Environment Variables

Set public client variables in Vercel Production. Set the same values in Preview only if previews should use real Clerk and Convex services.

| Variable | Public or secret | Required for web | Location |
| --- | --- | --- | --- |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public | Yes | Vercel env, from Clerk API keys |
| `EXPO_PUBLIC_CONVEX_URL` | Public | Yes | Vercel env, from the target Convex deployment |
| `EXPO_PUBLIC_DISABLE_AUTH` | Public | Optional | Vercel env only for intentionally auth-disabled previews |
| `EXPO_PUBLIC_API_BASE_URL` | Public | Optional legacy | Vercel env only if legacy API code is active |

Do not add these as Vercel static web client variables unless the app starts reading them on web:

| Variable | Where it belongs |
| --- | --- |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex dashboard env for `convex/auth.config.ts` |
| `CONVEX_DEPLOYMENT` | Convex CLI/deployment metadata |
| `EXPO_PUBLIC_CONVEX_SITE_URL` | Not currently read by the app |
| `REVENUECAT_WEBHOOK_AUTH_HEADER` | Secret backend/Convex webhook configuration |

## Clerk Checklist

- Add the production Vercel origin to Clerk allowed origins: `https://<production-domain>`.
- Add Vercel preview origins if previews use real auth: `https://<project>-git-<branch>-<team>.vercel.app`, or the team's chosen preview pattern.
- Android OAuth uses `clerk://com.playbackfire.app.callback` (auto-provisioned when `com.playbackfire.app` is registered under Native applications). `app/+native-intent.tsx` rewrites that callback to `app/sso-callback.tsx`.
- Add HTTPS web redirects for the hosted domain, including `https://<production-domain>/` and any app paths used as OAuth return locations.
- Confirm Google and Apple OAuth provider settings include the hosted Vercel domain where those providers require it.
- **Apple:** Web uses Clerk browser `oauth_apple` (production needs Services ID + key credentials in Clerk). iOS uses native Sign in with Apple (`useSignInWithApple` + App ID capability); register the app under Clerk **Native applications** (Team ID + `com.playbackfire.app`). Android does not offer Apple Sign In in the product UI.
- If the production publishable key encodes a custom Clerk Frontend API host such as `clerk.playbackfire.com`, verify that host resolves before deploying:

```bash
dig +short CNAME clerk.playbackfire.com
dig +short A clerk.playbackfire.com
curl -I https://clerk.playbackfire.com/npm/@clerk/clerk-js@5/dist/clerk.browser.js
```

The script check must return an HTTP response from Clerk. `ERR_NAME_NOT_RESOLVED` or `curl: (6) Could not resolve host` means the issue is DNS/custom-domain propagation or an incorrect production publishable key, not the Expo bundle.

## Convex Checklist

- Set `EXPO_PUBLIC_CONVEX_URL` in Vercel to the intended production Convex deployment URL.
- Use a separate Convex deployment URL for Vercel Preview if previews should avoid production data.
- Set `CLERK_JWT_ISSUER_DOMAIN` in the Convex dashboard env for every Convex deployment used by web.
- Keep the Clerk JWT issuer/domain consistent with Convex auth configuration.

## Local Verification

Run the same static export Vercel uses:

```bash
bun install --frozen-lockfile
bun run vercel-build
find dist -maxdepth 3 -type f | sort
```

Then verify a first load and a hard refresh path with static fallback behavior equivalent to Vercel's rewrite:

```bash
curl -f http://127.0.0.1:<port>/
curl -f http://127.0.0.1:<port>/play/mode
curl -f http://127.0.0.1:<port>/_expo/static/js/web/<entry-file>.js
```

## References

- Expo static web export: https://docs.expo.dev/router/reference/static-rendering/
- Expo web deployment: https://docs.expo.dev/deploy/web/
- Vercel project configuration: https://vercel.com/docs/project-configuration/vercel-json
- Vercel rewrites: https://vercel.com/docs/rewrites
