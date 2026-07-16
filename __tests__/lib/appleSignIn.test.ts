import { describe, expect, it } from '@jest/globals';
import {
  prefersNativeAppleSignIn,
  supportsAppleSignIn,
} from '@/lib/auth/appleSignIn';

describe('supportsAppleSignIn', () => {
  it('is true on iOS and web', () => {
    expect(supportsAppleSignIn('ios')).toBe(true);
    expect(supportsAppleSignIn('web')).toBe(true);
  });

  it('is false on Android', () => {
    expect(supportsAppleSignIn('android')).toBe(false);
  });
});

describe('prefersNativeAppleSignIn', () => {
  it('is true only on iOS', () => {
    expect(prefersNativeAppleSignIn('ios')).toBe(true);
    expect(prefersNativeAppleSignIn('web')).toBe(false);
    expect(prefersNativeAppleSignIn('android')).toBe(false);
  });
});
