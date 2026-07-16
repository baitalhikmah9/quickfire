import { describe, expect, it } from '@jest/globals';

import { resolveDisplayTokenBalance } from '@/lib/wallet/displayTokenBalance';

describe('resolveDisplayTokenBalance', () => {
  it('returns 0 when auth is enabled and the user is not signed in', () => {
    expect(
      resolveDisplayTokenBalance({
        authDisabled: false,
        isSignedIn: false,
        storedTokens: 100,
      })
    ).toBe(0);
  });

  it('returns 0 when auth is enabled and signed-in state is still unknown', () => {
    expect(
      resolveDisplayTokenBalance({
        authDisabled: false,
        isSignedIn: undefined,
        storedTokens: 47,
      })
    ).toBe(0);
  });

  it('returns the stored balance when the user is signed in', () => {
    expect(
      resolveDisplayTokenBalance({
        authDisabled: false,
        isSignedIn: true,
        storedTokens: 47,
      })
    ).toBe(47);
  });

  it('returns the stored balance when auth is disabled (local/dev mode)', () => {
    expect(
      resolveDisplayTokenBalance({
        authDisabled: true,
        isSignedIn: false,
        storedTokens: 100,
      })
    ).toBe(100);
  });
});
