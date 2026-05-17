/**
 * Clerk gates (hub/play redirects, `(auth)` layout) are active unless this returns true.
 * Set `EXPO_PUBLIC_DISABLE_AUTH=true` when you want to run the app locally without signing in.
 */
export function isAuthDisabled() {
  const authOverride = process.env.EXPO_PUBLIC_DISABLE_AUTH;

  if (authOverride === 'true') {
    return true;
  }

  if (authOverride === 'false') {
    return false;
  }

  return false;
}
