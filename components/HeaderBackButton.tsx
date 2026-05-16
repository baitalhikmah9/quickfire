import { type FlexStyle, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from '@/components/ui/Pressable';
import { SPACING, BORDER_RADIUS, FONTS } from '@/constants';
import { HOME_SOFT_UI } from '@/themes';

const T = HOME_SOFT_UI.colors;

export type HeaderBackButtonProps = {
  onPress: () => void;
  direction: string;
  rowDirection: FlexStyle['flexDirection'];
  label: string;
  accessibilityLabel?: string;
};

const BACK_PILL_SHADOW = {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.1,
  shadowRadius: 11,
  elevation: 5,
} as const;

/**
 * Shared back-button pill for use as a GameHeader `leftSlot`.
 *
 * Consistent styling across all screens:
 * - White surface with top lip
 * - Soft shadow
 * - Chevron icon + "Back" label
 */
export function HeaderBackButton({
  onPress,
  direction,
  rowDirection,
  label,
  accessibilityLabel,
}: HeaderBackButtonProps) {
  const backIcon: keyof typeof Ionicons.glyphMap =
    direction === 'rtl' ? 'chevron-forward' : 'chevron-back';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.backPill,
        BACK_PILL_SHADOW,
        { flexDirection: rowDirection },
        { opacity: pressed ? 0.92 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Ionicons name={backIcon} size={20} color={T.textPrimary} />
      <Text style={styles.backLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backPill: {
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
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
