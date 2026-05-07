import { useCallback, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { useSSO } from '@clerk/clerk-expo';
import type { OAuthStrategy } from '@clerk/types';

/**
 * Clerk `redirectUrl` after OAuth. On native, Expo Linking encodes the scheme.
 * On web, `Linking.createURL('/(app)/')` often yields a path the browser never uses
 * (`/(app)` is a route group), and pathname / trailing-slash drift makes
 * `expo-web-browser`'s popup handshake fail — the opener never gets `success`.
 */
function clerkOAuthRedirectUrl(redirectPath: string): string {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return Linking.createURL(redirectPath);
  }
  const isDefaultAppShell =
    redirectPath === '/(app)/' || redirectPath === '/(app)' || redirectPath === '/';
  const path = isDefaultAppShell ? '/' : redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`;
  const href = new URL(path, window.location.origin).href;
  return href.replace(/\/$/, '');
}

/**
 * Google / Apple OAuth via Clerk SSO. Redirect returns to the app shell after session is created.
 */
export function useClerkOAuthFlow(redirectPath = '/(app)/') {
  const { startSSOFlow } = useSSO();
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);

  const signInWithOAuthStrategy = useCallback(
    async (strategy: OAuthStrategy) => {
      if (inFlight.current) return;
      if (strategy === 'oauth_apple' && Platform.OS === 'android') {
        Alert.alert(
          'Unavailable',
          'Sign in with Apple is not available on this device. Use Google or try on iOS or web.',
        );
        return;
      }
      inFlight.current = true;
      setBusy(true);
      try {
        const redirectUrl = clerkOAuthRedirectUrl(redirectPath);
        const { createdSessionId, setActive } = await startSSOFlow({
          strategy,
          redirectUrl,
        });
        if (createdSessionId && setActive) {
          await setActive({ session: createdSessionId });
        }
      } catch (e) {
        console.error('[Clerk SSO]', e);
        const message =
          e instanceof Error ? e.message : 'Something went wrong. Please try again.';
        Alert.alert('Sign-in failed', message);
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [redirectPath, startSSOFlow]
  );

  return { busy, signInWithOAuthStrategy };
}
