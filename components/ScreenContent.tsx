import { type ReactNode } from 'react';
import {
  ScrollView,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LAYOUT, SPACING } from '@/constants';
import { HOME_SOFT_UI } from '@/themes';

export type ScreenContentProps = ViewProps & {
  /**
   * Max width of the content column. Defaults to `LAYOUT.contentMaxWidth`.
   * Ignored when `fullWidth` is true.
   */
  maxWidth?: number;
  /**
   * Full safe-area width: no max column and no horizontal padding on this wrapper.
   * Add insets on inner layouts where needed; `SafeAreaView` still handles device margins.
   */
  fullWidth?: boolean;
};

type SafeAreaEdge = 'top' | 'bottom' | 'left' | 'right';

export type ScreenProps = {
  children: ReactNode;
  header?: ReactNode;
  scroll?: boolean;
  edges?: SafeAreaEdge[];
  backgroundColor?: string;
  fullWidth?: boolean;
  maxWidth?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  scrollViewProps?: Omit<ScrollViewProps, 'contentContainerStyle'> & {
    contentContainerStyle?: StyleProp<ViewStyle>;
  };
};

/**
 * Full-screen brand scaffold: safe area, cream canvas, optional header, optional scroll, and standard gutter.
 */
export function Screen({
  children,
  header,
  scroll = false,
  edges = ['top', 'bottom', 'left', 'right'],
  backgroundColor = HOME_SOFT_UI.colors.canvas,
  fullWidth = true,
  maxWidth,
  style,
  contentStyle,
  scrollViewProps,
}: ScreenProps) {
  const body = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator
      {...scrollViewProps}
      style={[styles.scroll, scrollViewProps?.style]}
      contentContainerStyle={[styles.scrollContent, scrollViewProps?.contentContainerStyle, contentStyle]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.body, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView edges={edges} style={[styles.safeArea, { backgroundColor }]}>
      <ScreenContent fullWidth={fullWidth} maxWidth={maxWidth} style={[styles.shell, style]}>
        {header}
        {body}
      </ScreenContent>
    </SafeAreaView>
  );
}

/**
 * Constrains primary content to a centered column with consistent horizontal inset.
 * Use `fullWidth` for landscape-first screens so the layout isn’t letterboxed on phones/tablets.
 */
export function ScreenContent({
  style,
  maxWidth = LAYOUT.contentMaxWidth,
  fullWidth = false,
  ...props
}: ScreenContentProps) {
  return (
    <View
      style={[
        styles.root,
        !fullWidth && styles.gutter,
        !fullWidth && { maxWidth, alignSelf: 'center' },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  shell: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
  body: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    paddingHorizontal: LAYOUT.screenGutter,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: LAYOUT.screenGutter,
    paddingBottom: SPACING.xxl,
  },
  root: {
    width: '100%',
  },
  gutter: {
    paddingHorizontal: LAYOUT.screenGutter,
  },
});
