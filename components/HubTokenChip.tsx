import { Image, View, Text, StyleSheet, type FlexStyle, type ImageSourcePropType, type ViewStyle } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { Ionicons } from '@expo/vector-icons';
import {
  SPACING,
  BORDER_RADIUS,
  FONTS,
  COLORS,
  SOFT_SURFACE_FACE,
  softSurfaceLift,
} from '@/constants';
import { relativeLuminance } from '@/constants/theme';
import { HOME_SOFT_UI } from '@/themes';
import { useThemeStore } from '@/store/theme';

/** Match `HubActionCard` pill3d chrome (squared + lip). */
const CHIP_RADIUS = BORDER_RADIUS.sm;
/** Settings/store header back control - docs/BRAND_GUIDELINES.md (44×44, r≈14). */
const SOFT_SQUIRCLE_SIZE = 44;
const SOFT_SQUIRCLE_RADIUS = 14;
const DEPTH_LIP = 8;
const DEPTH_TOP_INSET = 4;

type HubTokenChipProps = {
  label: string;
  value: string;
  /** Pass `getRowDirection(direction)` for RTL. */
  rowDirection: FlexStyle['flexDirection'];
  onPress?: () => void;
  accessibilityLabel?: string;
  /**
   * `softUi` - docs/BRAND_GUIDELINES.md: white squircle, charcoal type, soft shadow (lobby / play hub).
   * `default` - legacy electric-blue 3D chip.
   */
  variant?: 'default' | 'softUi';
  /** Merged onto the outer wrapper (e.g. `alignSelf: 'flex-start'` for home leading column). */
  outerStyle?: ViewStyle;
  artworkSource?: ImageSourcePropType;
};

function TokenMark({
  artworkSource,
  isDark,
  iconColor,
}: {
  artworkSource?: ImageSourcePropType;
  isDark: boolean;
  iconColor: string;
}) {
  /** Wordmark PNG has an opaque black matte - use accent diamond on dark surfaces. */
  if (isDark) {
    return (
      <View style={styles.darkDiamondMark} accessible={false}>
        <Ionicons
          name="diamond"
          size={24}
          color="#FFFFFF"
          style={styles.darkDiamondUnderlay}
          accessibilityIgnoresInvertColors
        />
        <Ionicons name="diamond" size={24} color={iconColor} accessibilityIgnoresInvertColors />
      </View>
    );
  }

  if (!artworkSource) {
    return <Ionicons name="diamond" size={14} color={iconColor} accessibilityIgnoresInvertColors />;
  }

  return <Image source={artworkSource} style={styles.artwork} resizeMode="contain" />;
}

/**
 * Token readout styled like hub 3D CTAs - primary face, accent depth lip, uppercase label.
 * `softUi` matches the settings/store header back squircle (height 44, radius 14).
 */
export function HubTokenChip({
  label,
  value,
  rowDirection,
  onPress,
  accessibilityLabel,
  variant = 'default',
  outerStyle,
  artworkSource,
}: HubTokenChipProps) {
  useThemeStore((state) => state.paletteId);
  const soft = HOME_SOFT_UI.colors;
  const isDark = relativeLuminance(soft.canvas) < 0.3;
  const tokenIconColor = isDark ? soft.accentGlow : soft.textPrimary;

  const softFaceStyle: ViewStyle = {
    backgroundColor: soft.surface,
    // Flat face — no bevel lips / gray strips; depth via softSurfaceLift only
    borderTopWidth: 0,
    borderTopColor: 'transparent',
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
    shadowColor: isDark ? 'rgba(0, 0, 0, 0.36)' : 'rgba(51, 51, 51, 0.15)',
  };

  const shadow = {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  };

  if (variant === 'softUi') {
    const innerSoft = (
      <View
        testID="hub-token-chip-face"
        style={[styles.softFace, SOFT_SURFACE_FACE, softSurfaceLift(), softFaceStyle]}
      >
        <View style={[styles.row, styles.softRow, { flexDirection: rowDirection }]}>
          <TokenMark artworkSource={artworkSource} isDark={isDark} iconColor={tokenIconColor} />
          <Text style={[styles.softValue, { color: soft.textPrimary }]} numberOfLines={1}>
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
        <View style={[styles.face, isDark && { borderTopWidth: 0, borderTopColor: 'transparent' }]}>
          <View style={[styles.row, { flexDirection: rowDirection }]}>
            {artworkSource && !isDark ? (
              <Image source={artworkSource} style={styles.artwork} resizeMode="contain" />
            ) : (
              <View style={styles.iconTile}>
                <Ionicons name="diamond" size={13} color="#FFFFFF" accessibilityIgnoresInvertColors />
              </View>
            )}
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
    height: SOFT_SQUIRCLE_SIZE,
    minHeight: SOFT_SQUIRCLE_SIZE,
    borderRadius: SOFT_SQUIRCLE_RADIUS,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  softRow: {
    gap: 8,
  },
  softValue: {
    fontFamily: FONTS.uiBold,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  darkDiamondMark: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkDiamondUnderlay: {
    position: 'absolute',
  },
  artwork: {
    width: 22,
    height: 22,
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
