import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import CategorySelectionScreen from '@/app/(app)/play/categories';
import { usePlayStore } from '@/store/play';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => {}),
    removeItem: jest.fn(async () => {}),
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@/lib/i18n/useI18n', () => ({
  useI18n: () => ({
    direction: 'ltr',
    getTextStyle: () => ({}),
    uiLocale: 'en',
    t: (key: string, values?: Record<string, string | number>) => {
      const messages: Record<string, string> = {
        'common.loading': 'Loading',
        'common.selectedCount': `Selected ${values?.selected ?? 0}/${values?.required ?? 0}`,
        'play.pickTopicsTitle': 'Pick Topics',
        'play.startBoard': 'Start the Board',
      };
      return messages[key] ?? key;
    },
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

function hasAbsolutePositionedAncestor(node: ReturnType<typeof screen.getByText>): boolean {
  let current = node.parent;

  while (current) {
    const style = StyleSheet.flatten(current.props.style);
    if (style?.position === 'absolute') {
      return true;
    }
    current = current.parent;
  }

  return false;
}

describe('CategorySelectionScreen', () => {
  beforeEach(() => {
    usePlayStore.setState({ session: null, tokens: 5, rapidFire: null });
    usePlayStore.getState().ensureDraft();
  });

  it('keeps the selected-count action in scrollable content instead of an absolute bottom overlay', () => {
    render(<CategorySelectionScreen />);

    expect(hasAbsolutePositionedAncestor(screen.getByText('Selected 0/6'))).toBe(false);
  });
});
