import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { LegalScrollScreen } from '@/components/LegalScrollScreen';
import { PALETTES } from '@/constants/theme';
import { useThemeStore } from '@/store/theme';

const mockBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    canGoBack: mockCanGoBack,
    replace: jest.fn(),
  }),
}));

jest.mock('@/components/PublicAuthEntry', () => ({
  PublicAuthEntry: () => null,
}));

jest.mock('@/lib/i18n/useI18n', () => ({
  useI18n: () => ({
    direction: 'ltr',
    t: (key: string) => {
      const messages: Record<string, string> = {
        'common.back': 'Back',
        'legal.lastUpdated': 'Last updated',
      };
      return messages[key] ?? key;
    },
  }),
}));

const SECTIONS = [
  {
    heading: 'Agreement',
    paragraphs: ['You agree to play fair trivia.'],
  },
];

describe('LegalScrollScreen', () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockCanGoBack.mockReturnValue(true);
    useThemeStore.setState({ paletteId: 'default' });
  });

  it('paints dark canvas on shell and scroll layers in dark mode (no white flash surface)', () => {
    useThemeStore.setState({ paletteId: 'dark' });
    render(<LegalScrollScreen title="Terms of Service" sections={SECTIONS} />);

    const shell = screen.getByTestId('legal-scroll-screen');
    const scroll = screen.getByTestId('legal-scroll-view');
    const shellStyle = StyleSheet.flatten(shell.props.style);
    const scrollStyle = StyleSheet.flatten(scroll.props.style);
    const darkCanvas = PALETTES.dark.background;

    expect(shellStyle.backgroundColor).toBe(darkCanvas);
    expect(scrollStyle.backgroundColor).toBe(darkCanvas);
    expect(shellStyle.backgroundColor).not.toBe('#FFFFFF');
    expect(shellStyle.backgroundColor).not.toBe('#FAF9F6');
    expect(scrollStyle.backgroundColor).not.toBe('#FFFFFF');
    expect(scrollStyle.backgroundColor).not.toBe('#FAF9F6');
    expect(screen.getByText('Terms of Service')).toBeTruthy();
    expect(screen.getByText('Agreement')).toBeTruthy();
  });
});
