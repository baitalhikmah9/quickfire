import { rewriteNativeOAuthCallbackPath } from '@/lib/auth/clerkOAuthRedirect';

describe('rewriteNativeOAuthCallbackPath', () => {
  it('rewrites Clerk Android callback host to sso-callback route on cold start', () => {
    expect(
      rewriteNativeOAuthCallbackPath('clerk://com.playbackfire.app.callback?rotating_token_nonce=abc', true)
    ).toBe('/sso-callback');
  });

  it('rewrites backfire sso-callback deep links on cold start', () => {
    expect(
      rewriteNativeOAuthCallbackPath('backfire:///sso-callback?rotating_token_nonce=abc', true)
    ).toBe('/sso-callback');
  });

  it('leaves unrelated paths unchanged when app is already open', () => {
    expect(rewriteNativeOAuthCallbackPath('/(app)/', false)).toBe('/(app)/');
  });
});
