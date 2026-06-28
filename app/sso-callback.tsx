import * as WebBrowser from 'expo-web-browser';
import { Redirect } from 'expo-router';

/** Required at module scope so `openAuthSessionAsync` can complete when OAuth returns here. */
WebBrowser.maybeCompleteAuthSession();

/** OAuth return target for Clerk `startSSOFlow` on native (see `lib/auth/clerkOAuthRedirect.ts`). */
export default function SsoCallbackScreen() {
  return <Redirect href="/(app)/" />;
}
