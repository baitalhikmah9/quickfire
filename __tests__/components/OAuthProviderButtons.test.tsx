import React from 'react';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { Platform, StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('@/lib/hooks/useTheme', () => ({
  useDarkModeFlatTop: () => ({}),
}));

import { OAuthProviderButtons } from '@/components/OAuthProviderButtons';

describe('OAuthProviderButtons', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => originalOS,
    });
  });

  function setOs(os: typeof Platform.OS) {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => os,
    });
  }

  it('renders Google and Apple on iOS as equal half-width labeled buttons with outlines', () => {
    setOs('ios');
    const onGooglePress = jest.fn();
    const onApplePress = jest.fn();

    render(
      <OAuthProviderButtons
        onGooglePress={onGooglePress}
        onApplePress={onApplePress}
        googlePrimaryLabel="Google"
        applePrimaryLabel="Apple"
      />
    );

    const google = screen.getByLabelText('Google');
    const apple = screen.getByLabelText('Apple');
    expect(google).toBeTruthy();
    expect(apple).toBeTruthy();
    expect(screen.getByText('Google')).toBeTruthy();
    expect(screen.getByText('Apple')).toBeTruthy();

    const googleFlat = StyleSheet.flatten(google.props.style);
    const appleFlat = StyleSheet.flatten(apple.props.style);
    expect(googleFlat.flex).toBe(1);
    expect(appleFlat.flex).toBe(1);
    expect(googleFlat.borderWidth).toBeGreaterThan(0);
    expect(appleFlat.borderWidth).toBeGreaterThan(0);
  });

  it('renders Google and Apple on web as equal half-width labeled buttons', () => {
    setOs('web');
    render(
      <OAuthProviderButtons
        onGooglePress={jest.fn()}
        onApplePress={jest.fn()}
        googlePrimaryLabel="Google"
        applePrimaryLabel="Apple"
      />
    );

    const google = screen.getByLabelText('Google');
    const apple = screen.getByLabelText('Apple');
    expect(StyleSheet.flatten(google.props.style).flex).toBe(1);
    expect(StyleSheet.flatten(apple.props.style).flex).toBe(1);
    expect(screen.getByText('Google')).toBeTruthy();
    expect(screen.getByText('Apple')).toBeTruthy();
  });

  it('hides Apple and shows a full-width labeled Google button on Android', () => {
    setOs('android');
    const onApplePress = jest.fn();

    render(
      <OAuthProviderButtons
        onGooglePress={jest.fn()}
        onApplePress={onApplePress}
        googlePrimaryLabel="Google"
        applePrimaryLabel="Apple"
      />
    );

    const google = screen.getByLabelText('Google');
    expect(google).toBeTruthy();
    expect(screen.getByText('Google')).toBeTruthy();
    expect(screen.queryByLabelText('Apple')).toBeNull();

    const flat = StyleSheet.flatten(google.props.style);
    expect(flat.alignSelf).toBe('stretch');
    expect(flat.width).toBe('100%');
    expect(flat.borderWidth).toBeGreaterThan(0);
  });

  it('calls Google press handler', () => {
    setOs('ios');
    const onGooglePress = jest.fn();
    render(
      <OAuthProviderButtons
        onGooglePress={onGooglePress}
        onApplePress={jest.fn()}
        googlePrimaryLabel="Google"
        applePrimaryLabel="Apple"
      />
    );

    fireEvent.press(screen.getByLabelText('Google'));
    expect(onGooglePress).toHaveBeenCalledTimes(1);
  });
});
