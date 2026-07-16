import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';

/** Expo Router screen for Clerk native OAuth return (`app/sso-callback.tsx`). */
export const CLERK_SSO_CALLBACK_PATH = 'sso-callback';

/** Clerk Native Applications auto-provisions `clerk://<package>.callback` for registered apps. */
function clerkRegisteredNativeCallbackUrl(): string | null {
  const androidPackage = Constants.expoConfig?.android?.package;
  if (Platform.OS === 'android' && androidPackage) {
    return `clerk://${androidPackage}.callback`;
  }
  const iosBundle = Constants.expoConfig?.ios?.bundleIdentifier;
  if (Platform.OS === 'ios' && iosBundle) {
    return `clerk://${iosBundle}.callback`;
  }
  return null;
}

function authSessionSsoCallbackRedirectUrl(): string {
  return AuthSession.makeRedirectUri({
    path: CLERK_SSO_CALLBACK_PATH,
    isTripleSlashed: true,
  });
}

export function clerkNativeSsoCallbackRedirectUrl(): string {
  // Expo Go does not register the app's `clerk://…callback` intent/URL scheme.
  // Using that scheme leaves the browser on a dead deep link instead of returning
  // to Expo Go. `makeRedirectUri` yields `exp://…/--/sso-callback` which Expo Go owns.
  if (isRunningInExpoGo()) {
    return authSessionSsoCallbackRedirectUrl();
  }

  const registered = clerkRegisteredNativeCallbackUrl();
  if (registered) return registered;
  return authSessionSsoCallbackRedirectUrl();
}

/**
 * Clerk `redirectUrl` after OAuth.
 * Native (standalone / dev client): `clerk://<package>.callback` when registered.
 * Native (Expo Go): `AuthSession.makeRedirectUri` → `exp://…/sso-callback`.
 * `app/+native-intent.tsx` rewrites callback deep links to `/sso-callback` for Expo Router.
 * Web: same-origin path (route groups like `/(app)` break popup handshake).
 */
export function clerkOAuthRedirectUrl(redirectPath: string): string {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return clerkNativeSsoCallbackRedirectUrl();
  }
  const isDefaultAppShell =
    redirectPath === '/(app)/' || redirectPath === '/(app)' || redirectPath === '/';
  const path = isDefaultAppShell ? '/' : redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`;
  const href = new URL(path, window.location.origin).href;
  return href.replace(/\/$/, '');
}

function isOAuthCallbackPath(path: string): boolean {
  const lower = path.toLowerCase();
  if (lower.includes('sso-callback') || lower.includes('oauth-callback')) {
    return true;
  }

  try {
    const url = new URL(path, `${Linking.createURL('')}/`);
    const host = url.hostname.toLowerCase();
    return host.endsWith('.callback') || host.includes('playbackfire.app');
  } catch {
    return lower.includes('callback');
  }
}

/** Rewrite third-party OAuth callback URLs to the Expo Router screen. */
export function rewriteNativeOAuthCallbackPath(path: string, initial: boolean): string {
  // OAuth returns while Chrome is foregrounded use `initial: false` - still rewrite.
  if (isOAuthCallbackPath(path)) {
    return `/${CLERK_SSO_CALLBACK_PATH}`;
  }

  if (!initial) return path;
  return path;
}
