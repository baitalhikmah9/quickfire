import { View, Text, StyleSheet, type FlexStyle } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, BORDER_RADIUS, FONTS, COLORS } from '@/constants';

/** Match `HubActionCard` pill3d chrome (squared + lip). */
const CHIP_RADIUS = BORDER_RADIUS.sm;
const DEPTH_LIP = 8;
const DEPTH_TOP_INSET = 4;

type HubTokenChipProps = {
  label: string;
  value: string;
  /** Pass `getRowDirection(direction)` for RTL. */
  rowDirection: FlexStyle['flexDirection'];
  onPress?: () => void;
  accessibilityLabel?: string;
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
}: HubTokenChipProps) {
  const shadow = {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
  };

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
            <Text style={styles.label} numberOfLines={1}>
              {label}
            </Text>
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
        style={styles.outer}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? `${label}: ${value}`}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View style={styles.outer} accessibilityRole="text" accessibilityLabel={accessibilityLabel ?? `${label}: ${value}`}>
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignSelf: 'flex-end',
    maxWidth: 240,
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
  label: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(255, 255, 255, 0.92)',
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
