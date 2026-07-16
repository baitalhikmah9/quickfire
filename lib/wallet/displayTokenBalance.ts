/**
 * Resolve the token count shown in UI.
 *
 * When auth is required, signed-out (or not-yet-loaded) sessions always show 0
 * so a cached/local balance never looks like a wallet balance.
 */
export function resolveDisplayTokenBalance({
  authDisabled,
  isSignedIn,
  storedTokens,
}: {
  authDisabled: boolean;
  isSignedIn: boolean | null | undefined;
  storedTokens: number;
}): number {
  if (!authDisabled && !isSignedIn) {
    return 0;
  }
  return storedTokens;
}
