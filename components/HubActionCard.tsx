import { memo } from 'react';
import { View, Text, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, BORDER_RADIUS, SHADOWS, TYPE_SCALE, FONTS, COLORS } from '@/constants';
import type { ThemePalette } from '@/lib/hooks/useTheme';

/** Darker band below the face (extrusion). */
const PILL_DEPTH_LIP = 12;
/** Offset so the depth layer reads as a bevel behind the face. */
const PILL_DEPTH_TOP_INSET = 6;
/** Hub CTA shape: rounded rectangle (not full capsule). */
const HUB_CTA_RADIUS = BORDER_RADIUS.sm;

export type HubActionCardProps = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  colors: ThemePalette;
  titleStyle: TextStyle;
  subtitleStyle: TextStyle;
  onPress: () => void;
  /**
   * Fixed width for horizontal carousels. Omit to fill a flex row (e.g. home hub).
   */
  fixedWidth?: number;
  /** Tighter padding and tile height for landscape hubs */
  compact?: boolean;
  /** Cartoony 3D pill (face + depth lip) — reference hub CTAs */
  visualVariant?: 'card' | 'pill3d';
  /** Color role when `visualVariant` is `pill3d` */
  pillTone?: 'primary' | 'secondary' | 'tertiary' | 'accent';
  /**
   * Pill3d + fixedWidth: when true (default), stretch to the parent cross-axis (hub row).
   * Set false for carousels so long subtitles grow the pill instead of clipping inside a fixed height.
   */
  fillAvailableHeight?: boolean;
};

export const HubActionCard = memo(function HubActionCard({
  title,
  subtitle,
  icon,
  accent,
  colors,
  titleStyle,
  subtitleStyle,
  onPress,
  fixedWidth,
  compact = false,
  visualVariant = 'card',
  pillTone = 'primary',
  fillAvailableHeight = true,
}: HubActionCardProps) {
  const cardShadow = {
    ...SHADOWS.card,
    shadowColor: accent,
    shadowOpacity: 0.2,
    shadowRadius: 20,
  };

  /** Hub row: equal flex columns (no `fixedWidth`). Carousel: fixed width + optional stretch. */
  const hubRowFlexPill = fixedWidth == null && visualVariant === 'pill3d';
  const pillStretchCross = fixedWidth != null && fillAvailableHeight;
  const fillHubHeight = hubRowFlexPill || pillStretchCross;

  const sizeStyle: ViewStyle =
    fixedWidth != null
      ? visualVariant === 'pill3d'
        ? {
            width: fixedWidth,
            flexGrow: 0,
            flexShrink: pillStretchCross ? 1 : 0,
            alignSelf: pillStretchCross ? 'stretch' : 'flex-start',
          }
        : { width: fixedWidth, flexGrow: 0, minHeight: compact ? 188 : 260 }
      : { flex: 1, minWidth: 0 };

  if (visualVariant === 'pill3d') {
    const palette =
      pillTone === 'primary'
        ? {
            face: COLORS.primary,
            depth: COLORS.accent,
            titleColor: '#FFFFFF',
            subColor: 'rgba(255, 255, 255, 0.9)',
          }
        : pillTone === 'secondary'
          ? {
              face: COLORS.secondary,
              depth: '#CC7000',
              titleColor: '#FFFFFF',
              subColor: 'rgba(255, 255, 255, 0.9)',
            }
          : pillTone === 'accent'
            ? {
                face: COLORS.accent,
                depth: '#003566',
                titleColor: '#FFFFFF',
                subColor: 'rgba(255, 255, 255, 0.9)',
              }
            : {
                face: COLORS.tertiary,
                depth: '#7B63E8',
                titleColor: '#FFFFFF',
                subColor: 'rgba(255, 255, 255, 0.9)',
              };

    const pillShadow: ViewStyle = {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.22,
      shadowRadius: 20,
      elevation: 14,
    };

    const padV = compact ? SPACING.lg : SPACING.xl;
    const padH = compact ? SPACING.xl : SPACING.xxl;

    return (
      <View style={[sizeStyle, styles.pill3dOuter]}>
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.pill3dPressable,
            fillHubHeight && styles.pill3dPressableFill,
            { backgroundColor: palette.face },
            pillShadow,
            pressed && styles.pill3dPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={title}
          accessibilityHint={subtitle}
        >
          <View style={[styles.pill3dStack, fillHubHeight && styles.pill3dStackFill]}>
            <View
              style={[
                styles.pill3dDepth,
                {
                  backgroundColor: palette.depth,
                  top: PILL_DEPTH_TOP_INSET,
                  bottom: 0,
                },
              ]}
            />
            <View
              style={[
                styles.pill3dFace,
                fillHubHeight && styles.pill3dFaceFill,
                {
                  backgroundColor: palette.face,
                  paddingVertical: padV,
                  paddingHorizontal: padH,
                },
              ]}
            >
              <Text
                style={[
                  styles.pill3dTitle,
                  compact && styles.pill3dTitleCompact,
                  { color: palette.titleColor },
                ]}
                numberOfLines={2}
              >
                {title}
              </Text>
              <Text
                style={[
                  styles.pill3dSubtitle,
                  compact && styles.pill3dSubtitleCompact,
                  { color: palette.subColor },
                ]}
              >
                {subtitle}
              </Text>
            </View>
          </View>
        </Pressable>
      </View>
    );
  }

  const iconSize = compact ? 26 : 32;
  const badgeSize = compact ? 52 : 64;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        sizeStyle,
        {
          backgroundColor: colors.cardBackground,
          borderColor: accent,
          borderWidth: 3,
        },
        cardShadow,
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
    >
      <View style={[styles.cardBody, compact && styles.cardBodyCompact]}>
        <View
          style={[
            styles.iconBadge,
            { backgroundColor: `${accent}28`, width: badgeSize, height: badgeSize },
          ]}
        >
          <Ionicons name={icon} size={iconSize} color={accent} accessibilityIgnoresInvertColors />
        </View>
        <Text
          style={[
            styles.cardTitle,
            compact && styles.cardTitleCompact,
            { color: colors.text },
            titleStyle,
          ]}
          numberOfLines={2}
        >
          {title}
        </Text>
        <Text
          style={[
            styles.cardSubtitle,
            compact && styles.cardSubtitleCompact,
            { color: colors.textSecondary },
            subtitleStyle,
          ]}
        >
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    elevation: 8,
  },
  cardBody: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  iconBadge: {
    borderRadius: BORDER_RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBodyCompact: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    gap: SPACING.sm,
  },
  cardTitle: {
    ...TYPE_SCALE.h3,
    fontFamily: FONTS.displayBold,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  cardTitleCompact: {
    fontSize: 17,
    lineHeight: 22,
  },
  cardSubtitle: {
    ...TYPE_SCALE.caption,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  cardSubtitleCompact: {
    fontSize: 11,
    lineHeight: 15,
  },
  cardPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.98 }],
  },

  /** Row cells stretch in height; inner pressable flex-fills when `fillHubHeight`. */
  pill3dOuter: {
    justifyContent: 'center',
    alignItems: 'stretch',
    minHeight: 0,
    overflow: 'visible',
  },
  pill3dPressable: {
    alignSelf: 'stretch',
    borderRadius: HUB_CTA_RADIUS,
    overflow: 'hidden',
  },
  pill3dPressableFill: {
    flex: 1,
    minHeight: 108,
  },
  pill3dPressed: {
    transform: [{ translateY: 5 }],
    opacity: 0.98,
  },
  pill3dStack: {
    position: 'relative',
    alignSelf: 'stretch',
    /** Room for the 3D lip inside the rounded clip (was clipped when lip used negative bottom). */
    paddingBottom: PILL_DEPTH_LIP,
  },
  pill3dStackFill: {
    flex: 1,
    minHeight: 0,
  },
  pill3dDepth: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: HUB_CTA_RADIUS,
  },
  pill3dFace: {
    borderRadius: HUB_CTA_RADIUS,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: 'rgba(255, 255, 255, 0.28)',
  },
  pill3dFaceFill: {
    flex: 1,
    minHeight: 0,
  },
  pill3dTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 26,
    letterSpacing: 1.2,
    lineHeight: 30,
    textAlign: 'center',
    textTransform: 'uppercase',
    alignSelf: 'stretch',
  },
  pill3dTitleCompact: {
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: 1,
  },
  pill3dSubtitle: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 11,
    letterSpacing: 1,
    lineHeight: 15,
    textAlign: 'center',
    textTransform: 'uppercase',
    alignSelf: 'stretch',
  },
  pill3dSubtitleCompact: {
    fontSize: 9,
    lineHeight: 13,
    letterSpacing: 0.8,
  },
});
