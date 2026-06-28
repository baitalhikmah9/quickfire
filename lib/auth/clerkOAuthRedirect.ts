import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';

/** Matches Clerk `useSSO` default (`makeRedirectUri({ path: 'sso-callback' })`). */
export const CLERK_SSO_CALLBACK_PATH = 'sso-callback';

export function clerkNativeSsoCallbackRedirectUrl(): string {
  return AuthSession.makeRedirectUri({ path: CLERK_SSO_CALLBACK_PATH });
}

/**
 * Clerk `redirectUrl` after OAuth.
 * Native: app-scheme callback route (`backfire:///sso-callback`) — must be allowlisted in Clerk.
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

/** Rewrite third-party OAuth callback URLs to the Expo Router screen. */
export function rewriteNativeOAuthCallbackPath(path: string, initial: boolean): string {
  if (!initial) return path;

  try {
    const lower = path.toLowerCase();
    if (lower.includes('sso-callback') || lower.includes('oauth-callback')) {
      return `/${CLERK_SSO_CALLBACK_PATH}`;
    }

    const url = new URL(path, `${Linking.createURL('')}/`);
    const host = url.hostname.toLowerCase();
    if (host.endsWith('.callback') || host.includes('playbackfire.app')) {
      return `/${CLERK_SSO_CALLBACK_PATH}`;
    }

    return path;
  } catch {
    if (path.toLowerCase().includes('callback')) {
      return `/${CLERK_SSO_CALLBACK_PATH}`;
    }
    return path;
  }
}
