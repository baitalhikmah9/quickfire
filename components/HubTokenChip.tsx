import { View, Text, StyleSheet, type FlexStyle, type ViewStyle } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, BORDER_RADIUS, FONTS, COLORS } from '@/constants';
import { HOME_SOFT_UI } from '@/themes';

/** Match `HubActionCard` pill3d chrome (squared + lip). */
const CHIP_RADIUS = BORDER_RADIUS.sm;
const SOFT_CHIP_RADIUS = BORDER_RADIUS.md;
const DEPTH_LIP = 8;
const DEPTH_TOP_INSET = 4;

const SOFT = HOME_SOFT_UI.colors;

type HubTokenChipProps = {
  label: string;
  value: string;
  /** Pass `getRowDirection(direction)` for RTL. */
  rowDirection: FlexStyle['flexDirection'];
  onPress?: () => void;
  accessibilityLabel?: string;
  /**
   * `softUi` — docs/BRAND_GUIDELINES.md: white squircle, charcoal type, soft shadow (lobby / play hub).
   * `default` — legacy electric-blue 3D chip.
   */
  variant?: 'default' | 'softUi';
  /** Merged onto the outer wrapper (e.g. `alignSelf: 'flex-start'` for home leading column). */
  outerStyle?: ViewStyle;
};

const softShadow: ViewStyle = {
  shadowColor: 'rgba(51, 51, 51, 0.15)',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 8,
};

/**
 * Token readout styled like hub 3D CTAs — primary face, accent depth lip, uppercase label.
 */
export function HubTokenChip({
  label,
  value,
  rowDirection,
  onPress,
  accessibilityLabel,
  variant = 'default',
  outerStyle,
}: HubTokenChipProps) {
  const shadow = {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
  };

  if (variant === 'softUi') {
    const innerSoft = (
      <View style={[styles.softFace, softShadow]}>
        <View style={[styles.row, styles.softRow, { flexDirection: rowDirection }]}>

          <Ionicons name="diamond-outline" size={14} color={SOFT.textPrimary} />
          <Text style={styles.softValue} numberOfLines={1}>
            {value}
          </Text>
        </View>
      </View>
    );

    if (onPress) {
      return (
        <Pressable
          onPress={onPress}
          style={[styles.outerSoft, outerStyle]}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? `${label}: ${value}`}
        >
          {innerSoft}
        </Pressable>
      );
    }

    return (
      <View
        style={[styles.outerSoft, outerStyle]}
        accessibilityRole="text"
        accessibilityLabel={accessibilityLabel ?? `${label}: ${value}`}
      >
        {innerSoft}
      </View>
    );
  }

  const inner = (
    <View style={[styles.pressable, shadow]}>
      <View style={styles.stack}>
        <View
          style={[
            styles.depth,
            {
              backgroundColor: COLORS.accent,
              top: DEPTH_TOP_INSET,
              bottom: 0,
            },
          ]}
        />
        <View style={styles.face}>
          <View style={[styles.row, { flexDirection: rowDirection }]}>

            <View style={styles.iconTile}>
              <Ionicons name="diamond" size={13} color="#FFFFFF" accessibilityIgnoresInvertColors />
            </View>
            <Text style={styles.value} numberOfLines={1}>
              {value}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={[styles.outer, outerStyle]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? `${label}: ${value}`}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View
      style={[styles.outer, outerStyle]}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? `${label}: ${value}`}
    >
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignSelf: 'flex-end',
    maxWidth: 240,
  },
  outerSoft: {
    alignSelf: 'flex-end',
    maxWidth: 240,
  },
  softFace: {
    borderRadius: SOFT_CHIP_RADIUS,
    backgroundColor: SOFT.surface,
    borderTopWidth: 2,
    borderTopColor: 'rgba(255, 255, 255, 0.78)',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  softRow: {
    gap: 6,
  },

  softValue: {
    fontFamily: FONTS.uiBold,
    fontSize: 15,
    color: SOFT.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  pressable: {
    borderRadius: CHIP_RADIUS,
    overflow: 'hidden',
    backgroundColor: COLORS.primary,
  },
  stack: {
    position: 'relative',
    alignSelf: 'stretch',
    paddingBottom: DEPTH_LIP,
  },
  depth: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: CHIP_RADIUS,
  },
  face: {
    borderRadius: CHIP_RADIUS,
    zIndex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: 'rgba(255, 255, 255, 0.28)',
  },
  row: {
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },

  iconTile: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontFamily: FONTS.uiBold,
    fontSize: 16,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
});
