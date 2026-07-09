import { Platform } from 'react-native';

const mockMakeRedirectUri = jest.fn(
  () => 'exp://192.168.1.10:8081/--/sso-callback'
);
const mockIsRunningInExpoGo = jest.fn(() => false);

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: (...args: unknown[]) => mockMakeRedirectUri(...args),
}));

jest.mock('expo', () => ({
  isRunningInExpoGo: () => mockIsRunningInExpoGo(),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      android: { package: 'com.playbackfire.app' },
      ios: { bundleIdentifier: 'com.playbackfire.app' },
    },
  },
}));

import {
  clerkNativeSsoCallbackRedirectUrl,
  clerkOAuthRedirectUrl,
  rewriteNativeOAuthCallbackPath,
} from '@/lib/auth/clerkOAuthRedirect';

describe('rewriteNativeOAuthCallbackPath', () => {
  it('rewrites Clerk Android callback host to sso-callback route on cold start', () => {
    expect(
      rewriteNativeOAuthCallbackPath(
        'clerk://com.playbackfire.app.callback?rotating_token_nonce=abc',
        true
      )
    ).toBe('/sso-callback');
  });

  it('rewrites Clerk callback when app is already open (OAuth return)', () => {
    expect(
      rewriteNativeOAuthCallbackPath(
        'clerk://com.playbackfire.app.callback?rotating_token_nonce=abc',
        false
      )
    ).toBe('/sso-callback');
  });

  it('rewrites backfire sso-callback deep links on cold start', () => {
    expect(
      rewriteNativeOAuthCallbackPath(
        'backfire:///sso-callback?rotating_token_nonce=abc',
        true
      )
    ).toBe('/sso-callback');
    expect(
      rewriteNativeOAuthCallbackPath(
        'backfire://sso-callback?rotating_token_nonce=abc',
        true
      )
    ).toBe('/sso-callback');
  });

  it('rewrites Expo Go exp:// sso-callback deep links', () => {
    expect(
      rewriteNativeOAuthCallbackPath(
        'exp://192.168.1.10:8081/--/sso-callback?rotating_token_nonce=abc',
        false
      )
    ).toBe('/sso-callback');
  });

  it('leaves unrelated paths unchanged when app is already open', () => {
    expect(rewriteNativeOAuthCallbackPath('/(app)/', false)).toBe('/(app)/');
  });
});

describe('clerkNativeSsoCallbackRedirectUrl', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    mockIsRunningInExpoGo.mockReturnValue(false);
    mockMakeRedirectUri.mockClear();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
  });

  it('uses AuthSession makeRedirectUri in Expo Go (not clerk:// package callback)', () => {
    mockIsRunningInExpoGo.mockReturnValue(true);
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });

    expect(clerkNativeSsoCallbackRedirectUrl()).toBe(
      'exp://192.168.1.10:8081/--/sso-callback'
    );
    expect(mockMakeRedirectUri).toHaveBeenCalledWith({
      path: 'sso-callback',
      isTripleSlashed: true,
    });
  });

  it('uses clerk:// package callback outside Expo Go on iOS', () => {
    mockIsRunningInExpoGo.mockReturnValue(false);
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });

    expect(clerkNativeSsoCallbackRedirectUrl()).toBe(
      'clerk://com.playbackfire.app.callback'
    );
  });

  it('uses clerk:// package callback outside Expo Go on Android', () => {
    mockIsRunningInExpoGo.mockReturnValue(false);
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });

    expect(clerkNativeSsoCallbackRedirectUrl()).toBe(
      'clerk://com.playbackfire.app.callback'
    );
  });
});

describe('clerkOAuthRedirectUrl', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    mockIsRunningInExpoGo.mockReturnValue(false);
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
  });

  it('returns Expo Go redirect on native when running in Expo Go', () => {
    mockIsRunningInExpoGo.mockReturnValue(true);
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });

    expect(clerkOAuthRedirectUrl('/(app)/')).toBe(
      'exp://192.168.1.10:8081/--/sso-callback'
    );
  });
});
