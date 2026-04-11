import { View, type ViewProps, StyleSheet } from 'react-native';
import { LAYOUT } from '@/constants';

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
  root: {
    width: '100%',
  },
  gutter: {
    paddingHorizontal: LAYOUT.screenGutter,
  },
});
