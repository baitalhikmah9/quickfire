import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ScrollView, StyleSheet } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';

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

function getResolvedStyle(node: ReturnType<typeof screen.getByLabelText>) {
  const style =
    typeof node.props.style === 'function'
      ? node.props.style({ pressed: false, hovered: false, focused: false })
      : node.props.style;

  return StyleSheet.flatten(style);
}

function hasNearbyColumnLayout(node: ReturnType<typeof screen.getByText>): boolean {
  let current = node.parent;
  let depth = 0;

  while (current && depth < 6) {
    const style = StyleSheet.flatten(current.props.style);
    if (style?.flexDirection === 'column') {
      return true;
    }
    current = current.parent;
    depth += 1;
  }

  return false;
}

function hasMinHeightZeroInAncestorChain(node: ReactTestInstance, maxDepth = 4): boolean {
  let current: ReactTestInstance | null = node.parent;
  let depth = 0;

  while (current && depth < maxDepth) {
    const style = StyleSheet.flatten(current.props.style);
    if (style?.minHeight === 0) {
      return true;
    }
    current = current.parent;
    depth += 1;
  }

  return false;
}

describe('CategorySelectionScreen', () => {
  beforeEach(() => {
    usePlayStore.setState({ session: null, tokens: 5, rapidFire: null });
    usePlayStore.getState().ensureDraft();
  });

  it('hydrates from an empty draft state without logging a hook-order warning', async () => {
    usePlayStore.setState({ session: null });
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<CategorySelectionScreen />);

    await waitFor(() => {
      expect(screen.getByText('PICK TOPICS')).toBeTruthy();
    });

    const hookOrderErrors = consoleErrorSpy.mock.calls.filter(([message]) =>
      String(message).includes('change in the order of Hooks')
    );

    consoleErrorSpy.mockRestore();

    expect(hookOrderErrors).toHaveLength(0);
  });

  it('keeps the selected-count action in scrollable content instead of an absolute bottom overlay', () => {
    render(<CategorySelectionScreen />);

    expect(hasAbsolutePositionedAncestor(screen.getByText('0/6'))).toBe(false);
  });

  it('lays topics out as four-across logo-first cards', () => {
    render(<CategorySelectionScreen />);

    const category = usePlayStore.getState().session?.availableCategories[0];

    expect(category).toBeDefined();

    const topicCard = screen.getByLabelText(`Select ${category!.title}`);
    const cardStyle = getResolvedStyle(topicCard);
    const titleNode = screen.getByText(category!.title.toUpperCase());

    expect(cardStyle.width).toBe('23%');
    expect(hasNearbyColumnLayout(titleNode)).toBe(true);
  });

  it('gives each topic tile a taller card and larger artwork so the logo uses more of the available space', () => {
    render(<CategorySelectionScreen />);

    const category = usePlayStore.getState().session?.availableCategories[0];

    expect(category).toBeDefined();

    const topicCard = screen.getByLabelText(`Select ${category!.title}`);
    const cardStyle = getResolvedStyle(topicCard);
    const logoWrap = screen.getByTestId(`topic-logo-wrap-${category!.slug}`);
    const logoWrapStyle = StyleSheet.flatten(logoWrap.props.style);

    expect(cardStyle.minHeight).toBeGreaterThanOrEqual(140);
    expect(logoWrapStyle.width).toBeGreaterThanOrEqual(84);
    expect(logoWrapStyle.height).toBeGreaterThanOrEqual(72);
  });

  it('adds one random unselected topic per press', () => {
    render(<CategorySelectionScreen />);

    const randomButton = screen.getByText('Choose a random topic');

    fireEvent.press(randomButton);

    const firstSelection = usePlayStore.getState().session?.selectedCategoryIds ?? [];

    expect(firstSelection).toHaveLength(1);

    fireEvent.press(randomButton);

    const secondSelection = usePlayStore.getState().session?.selectedCategoryIds ?? [];

    expect(secondSelection).toHaveLength(2);
    expect(secondSelection).toContain(firstSelection[0]);
  });

  it('replaces filter tabs with selected topic jump chips', () => {
    render(<CategorySelectionScreen />);

    expect(screen.queryByText('ALL')).toBeNull();
    expect(screen.queryByText('HISTORY')).toBeNull();

    const category = usePlayStore.getState().session?.availableCategories[0];

    expect(category).toBeDefined();

    fireEvent.press(screen.getByLabelText(`Select ${category!.title}`));

    expect(screen.getByLabelText(`Jump to ${category!.title}`)).toBeTruthy();
  });

  it('keeps the vertical topics list inside shrinkable wrappers so it can scroll', () => {
    const { UNSAFE_getAllByType } = render(<CategorySelectionScreen />);

    const scrollViews = UNSAFE_getAllByType(ScrollView);
    const topicGridScrollView = scrollViews.find((node) => node.props.horizontal !== true);

    expect(topicGridScrollView).toBeDefined();
    expect(hasMinHeightZeroInAncestorChain(topicGridScrollView!)).toBe(true);
  });
});
