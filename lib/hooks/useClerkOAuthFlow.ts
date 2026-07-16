import { useCallback, useRef, useState } from 'react';
import { useSSO, useSignInWithApple } from '@clerk/clerk-expo';
import type { OAuthStrategy } from '@clerk/types';
import { prefersNativeAppleSignIn, supportsAppleSignIn } from '@/lib/auth/appleSignIn';
import { clerkOAuthRedirectUrl } from '@/lib/auth/clerkOAuthRedirect';
import { showThemedAlert } from '@/store/themedAlert';

function isAppleCancelError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code?: unknown }).code) : '';
  const message = error instanceof Error ? error.message : '';
  return (
    code === 'ERR_REQUEST_CANCELED' ||
    code === 'ERR_CANCELED' ||
    message.includes('ERR_REQUEST_CANCELED')
  );
}

/**
 * Google / Apple auth via Clerk.
 * - Google: browser SSO on all platforms
 * - Apple iOS: native Sign in with Apple (`useSignInWithApple`)
 * - Apple web: browser SSO (`oauth_apple`)
 * - Apple Android: not available (UI hidden; guard remains)
 */
export function useClerkOAuthFlow(redirectPath = '/(app)/') {
  const { startSSOFlow } = useSSO();
  const { startAppleAuthenticationFlow } = useSignInWithApple();
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);

  const signInWithOAuthStrategy = useCallback(
    async (strategy: OAuthStrategy) => {
      if (inFlight.current) return;

      if (strategy === 'oauth_apple' && !supportsAppleSignIn()) {
        showThemedAlert(
          'Unavailable',
          'Sign in with Apple is not available on this device. Use Google or email instead.',
        );
        return;
      }

      inFlight.current = true;
      setBusy(true);
      try {
        if (strategy === 'oauth_apple' && prefersNativeAppleSignIn()) {
          const { createdSessionId, setActive } = await startAppleAuthenticationFlow();
          if (createdSessionId && setActive) {
            await setActive({ session: createdSessionId });
          }
          return;
        }

        const redirectUrl = clerkOAuthRedirectUrl(redirectPath);
        const { createdSessionId, setActive } = await startSSOFlow({
          strategy,
          redirectUrl,
        });
        if (createdSessionId && setActive) {
          await setActive({ session: createdSessionId });
        }
      } catch (e) {
        if (strategy === 'oauth_apple' && isAppleCancelError(e)) {
          return;
        }
        console.error('[Clerk SSO]', e);
        const message =
          e instanceof Error ? e.message : 'Something went wrong. Please try again.';
        showThemedAlert('Sign-in failed', message);
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [redirectPath, startAppleAuthenticationFlow, startSSOFlow]
  );

  return { busy, signInWithOAuthStrategy };
}
