import React from 'react';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking, Platform } from 'react-native';

import { OutboundPlatformLinks } from '@/components/OutboundPlatformLinks';
import {
  APP_STORE_URL,
  PLAY_STORE_URL,
  PUBLIC_SITE_HOST_LABEL,
} from '@/constants/site';

describe('OutboundPlatformLinks', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => originalOS,
    });
    jest.restoreAllMocks();
  });

  it('opens the website from native', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'ios',
    });

    render(<OutboundPlatformLinks color="#333333" />);

    fireEvent.press(screen.getByTestId('outbound-website-link'));
    expect(Linking.openURL).toHaveBeenCalledWith(`https://${PUBLIC_SITE_HOST_LABEL}`);
    expect(screen.queryByTestId('outbound-app-store-link')).toBeNull();
  });

  it('opens App Store and Play Store from web with separate targets', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'web',
    });

    render(<OutboundPlatformLinks color="#333333" />);

    fireEvent.press(screen.getByTestId('outbound-app-store-link'));
    expect(Linking.openURL).toHaveBeenCalledWith(APP_STORE_URL);

    fireEvent.press(screen.getByTestId('outbound-play-store-link'));
    expect(Linking.openURL).toHaveBeenCalledWith(PLAY_STORE_URL);
    expect(screen.queryByTestId('outbound-website-link')).toBeNull();
  });
});
