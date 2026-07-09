import { type FlexStyle, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from '@/components/ui/Pressable';
import { SPACING, BORDER_RADIUS, FONTS, SOFT_SURFACE_FACE, softSurfaceLift } from '@/constants';
import { HOME_SOFT_UI } from '@/themes';
import { useThemeStore } from '@/store/theme';

const T = HOME_SOFT_UI.colors;

export type HeaderBackButtonVariant = 'labeled' | 'icon';

export type HeaderBackButtonProps = {
  onPress: () => void;
  direction: string;
  rowDirection: FlexStyle['flexDirection'];
  label: string;
  accessibilityLabel?: string;
  /**
   * - `labeled` — play-stack control (chevron + "Back" text)
   * - `icon` — settings/store raised 44×44 squircle (chevron only)
   */
  variant?: HeaderBackButtonVariant;
};

const BACK_PILL_SHADOW = {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.1,
  shadowRadius: 11,
  elevation: 5,
} as const;

/**
 * Shared back control for GameHeader `leftSlot`.
 *
 * Default is the labeled play-stack control. Use `variant="icon"` for the
 * settings/store raised squircle (docs/BRAND_GUIDELINES.md header back).
 */
export function HeaderBackButton({
  onPress,
  direction,
  rowDirection,
  label,
  accessibilityLabel,
  variant = 'labeled',
}: HeaderBackButtonProps) {
  useThemeStore((state) => state.paletteId);
  const backIcon: keyof typeof Ionicons.glyphMap =
    direction === 'rtl' ? 'chevron-forward' : 'chevron-back';
  const a11y = accessibilityLabel ?? label;

  if (variant === 'icon') {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.backIconSquircle,
          SOFT_SURFACE_FACE,
          softSurfaceLift(),
          { backgroundColor: T.surface },
          {
            opacity: pressed ? 0.9 : 1,
            transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={a11y}
      >
        <Ionicons name={backIcon} size={22} color={T.textPrimary} />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.backPill,
        BACK_PILL_SHADOW,
        { backgroundColor: T.surface, flexDirection: rowDirection },
        { opacity: pressed ? 0.92 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={a11y}
    >
      <Ionicons name={backIcon} size={20} color={T.textPrimary} />
      <Text style={[styles.backLabel, { color: T.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backIconSquircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPill: {
    alignItems: 'center',
    gap: SPACING.xs,
    minWidth: 96,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.button,
    borderWidth: 0,
    backgroundColor: T.surface,
    borderTopWidth: 2,
    borderTopColor: 'rgba(255, 255, 255, 0.78)',
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  backLabel: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 14,
    color: T.textPrimary,
  },
});
