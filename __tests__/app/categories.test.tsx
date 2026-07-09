import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';

import CategorySelectionScreen from '@/app/(app)/play/categories';
import { usePlayStore } from '@/store/play';

const mockBack = jest.fn();
const mockCanGoBack = jest.fn(() => false);
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    canGoBack: mockCanGoBack,
    push: mockPush,
    replace: mockReplace,
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

jest.mock('@clerk/clerk-expo', () => ({
  useAuth: jest.fn(() => ({ isLoaded: true, isSignedIn: true })),
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
  beforeEach(async () => {
    mockBack.mockClear();
    mockCanGoBack.mockReset();
    mockCanGoBack.mockReturnValue(false);
    mockPush.mockClear();
    mockReplace.mockClear();
    usePlayStore.setState({ session: null, tokens: 5, rapidFire: null });
    await usePlayStore.getState().hydrate();
    usePlayStore.getState().ensureDraft();
  });

  it('goes back to team setup without stacking another team-setup screen', async () => {
    usePlayStore.getState().setMode('rumble');
    render(<CategorySelectionScreen />);

    await waitFor(() => {
      expect(screen.getByLabelText('Back to team setup')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Back to team setup'));

    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/play/team-setup');
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('uses stack history when returning from topics to team setup', async () => {
    mockCanGoBack.mockReturnValue(true);
    usePlayStore.getState().setMode('rumble');
    render(<CategorySelectionScreen />);

    await waitFor(() => {
      expect(screen.getByLabelText('Back to team setup')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Back to team setup'));

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
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

  it('lays topics out as fixed-width four-across logo-first cards', () => {
    render(<CategorySelectionScreen />);

    const category = usePlayStore.getState().session?.availableCategories[0];

    expect(category).toBeDefined();

    const topicCard = screen.getByLabelText(`Select ${category!.title}`);
    const cardStyle = getResolvedStyle(topicCard);
    const titleNode = screen.getByText(category!.title.toUpperCase());

    expect(typeof cardStyle.width).toBe('number');
    expect(cardStyle.width).toBeGreaterThan(0);
    expect(titleNode).toBeTruthy();
  });

  it('sizes each topic tile artwork from the computed card dimensions', () => {
    render(<CategorySelectionScreen />);

    const category = usePlayStore.getState().session?.availableCategories[0];

    expect(category).toBeDefined();

    const topicCard = screen.getByLabelText(`Select ${category!.title}`);
    const cardStyle = getResolvedStyle(topicCard);

    expect(typeof cardStyle.width).toBe('number');
    expect(typeof cardStyle.height).toBe('number');
    expect(cardStyle.height).toBeGreaterThan(0);
    expect(cardStyle.height).toBeLessThanOrEqual(cardStyle.width as number);
  });

  it('adds one random unselected topic per press', () => {
    render(<CategorySelectionScreen />);

    const randomButton = screen.getByLabelText('Choose a random topic');

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
    expect(screen.getByText('HISTORY')).toBeTruthy();

    const category = usePlayStore.getState().session?.availableCategories[0];

    expect(category).toBeDefined();

    fireEvent.press(screen.getByLabelText(`Select ${category!.title}`));

    expect(screen.getByLabelText(`Jump to ${category!.title}`)).toBeTruthy();
  });

  it('keeps selected topic pills equal sized and shrinks them as more topics are selected', () => {
    render(<CategorySelectionScreen />);

    const categories = usePlayStore.getState().session?.availableCategories.slice(0, 2) ?? [];

    expect(categories).toHaveLength(2);

    fireEvent.press(screen.getByLabelText(`Select ${categories[0]!.title}`));
    const onePillStyle = getResolvedStyle(screen.getByLabelText(`Jump to ${categories[0]!.title}`));

    fireEvent.press(screen.getByLabelText(`Select ${categories[1]!.title}`));
    const firstPillStyle = getResolvedStyle(screen.getByLabelText(`Jump to ${categories[0]!.title}`));
    const secondPillStyle = getResolvedStyle(screen.getByLabelText(`Jump to ${categories[1]!.title}`));

    expect(typeof firstPillStyle.width).toBe('number');
    expect(firstPillStyle.width).toBe(secondPillStyle.width);
    expect(firstPillStyle.width).toBeLessThan(onePillStyle.width as number);
  });

  it('keeps the vertical topics list inside shrinkable wrappers so it can scroll', () => {
    const { UNSAFE_getAllByType } = render(<CategorySelectionScreen />);

    const scrollViews = UNSAFE_getAllByType(ScrollView);
    const flatLists = UNSAFE_getAllByType(FlatList);
    const topicGridScrollable =
      flatLists.find((node) => node.props.horizontal !== true) ??
      scrollViews.find((node) => node.props.horizontal !== true);

    expect(topicGridScrollable).toBeDefined();
    expect(hasMinHeightZeroInAncestorChain(topicGridScrollable!)).toBe(true);
  });

  it('returns VirtualizedList getItemLayout frames that include index', () => {
    const { UNSAFE_getAllByType } = render(<CategorySelectionScreen />);

    const flatLists = UNSAFE_getAllByType(FlatList);
    const topicGrid = flatLists.find((node) => node.props.horizontal !== true);

    expect(topicGrid).toBeDefined();
    expect(typeof topicGrid!.props.getItemLayout).toBe('function');

    const data = topicGrid!.props.data as unknown[];
    expect(data.length).toBeGreaterThan(1);

    const first = topicGrid!.props.getItemLayout(data, 0) as {
      length: number;
      offset: number;
      index: number;
    };
    const second = topicGrid!.props.getItemLayout(data, 1) as {
      length: number;
      offset: number;
      index: number;
    };

    expect(first).toEqual(
      expect.objectContaining({
        length: expect.any(Number),
        offset: expect.any(Number),
        index: 0,
      })
    );
    expect(second.index).toBe(1);
    expect(second.offset).toBe(first.offset + first.length);
  });

  it('centers leftover topics in incomplete final rows of a section', () => {
    const { UNSAFE_getAllByType } = render(<CategorySelectionScreen />);

    const flatLists = UNSAFE_getAllByType(FlatList);
    const topicGrid = flatLists.find((node) => node.props.horizontal !== true);

    expect(topicGrid).toBeDefined();

    type CategoryListRow = {
      kind: 'header' | 'row';
      categories?: unknown[];
    };

    const data = (topicGrid!.props.data ?? []) as CategoryListRow[];
    const incompleteRow = data.find(
      (item) => item.kind === 'row' && (item.categories?.length ?? 0) > 0 && (item.categories?.length ?? 0) < 4
    );

    // Draft sessions should include at least one section whose count is not a multiple of 4.
    expect(incompleteRow).toBeDefined();

    const rowViews = UNSAFE_getAllByType(View).filter((node) => {
      const style = StyleSheet.flatten(node.props.style);
      return (
        style?.flexDirection === 'row' &&
        style?.flexWrap === 'wrap' &&
        typeof style?.width === 'number'
      );
    });

    expect(rowViews.length).toBeGreaterThan(0);

    for (const rowView of rowViews) {
      const style = StyleSheet.flatten(rowView.props.style);
      expect(style?.justifyContent).toBe('center');
    }
  });
});
