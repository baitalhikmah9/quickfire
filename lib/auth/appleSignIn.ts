import { Platform } from 'react-native';

/**
 * Where Apple Sign In is offered in the product UI.
 * - iOS: native Sign in with Apple (Clerk `useSignInWithApple`)
 * - web: browser OAuth (`oauth_apple` via Clerk `useSSO`)
 * - Android: not offered (no native Apple SDK; product choice)
 */
export function supportsAppleSignIn(os: typeof Platform.OS = Platform.OS): boolean {
  return os === 'ios' || os === 'web';
}

/**
 * Whether to use Clerk's native Apple authentication sheet instead of browser OAuth.
 * Native flow requires `expo-apple-authentication` and a development/standalone iOS build.
 */
export function prefersNativeAppleSignIn(os: typeof Platform.OS = Platform.OS): boolean {
  return os === 'ios';
}
