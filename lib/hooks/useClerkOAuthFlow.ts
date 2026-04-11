import { useCallback, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { useSSO } from '@clerk/clerk-expo';
import type { OAuthStrategy } from '@clerk/types';

/**
 * Google / Apple OAuth via Clerk SSO. Redirect returns to the app shell after session is created.
 */
export function useClerkOAuthFlow() {
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
        const redirectUrl = Linking.createURL('/(app)/');
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
    [startSSOFlow]
  );

  return { busy, signInWithOAuthStrategy };
}
