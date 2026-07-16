import { View, Text, StyleSheet, Platform, Pressable, useWindowDimensions } from 'react-native';
import { BackfireTitleLogo } from '@/components/BackfireTitleLogo';
import { HEADER, SPACING, FONTS, FONT_SIZES, getStandardChromeTopPadding } from '@/constants';
import { getGameHeaderLogoDisplayWidth } from '@/lib/layout/backfireTitleLogoWidth';
import { useTheme } from '@/lib/hooks/useTheme';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

/** Header visual variant. */
export type GameHeaderVariant = 'logoOnly' | 'logoTitle' | 'title';

/**
 * Top pad density under the safe area:
 * - `home` - base HEADER.topPadding only (home hub keeps its own frame pad)
 * - `standard` - question-screen match (HEADER.topPadding + HEADER.topExtra)
 * - `none` - parent already applied chrome top pad (e.g. PlayScaffold edge chrome)
 */
export type GameHeaderTopPad = 'home' | 'standard' | 'none';

export type GameHeaderProps = {
  /**
   * Determines the header content:
   * - `'logoOnly'` - centered Backfire logo, no title (home hub)
   * - `'logoTitle'` - centered Backfire logo + title below (team setup)
   * - `'title'` - centered heading text, no logo (mode selection, play stack)
   */
  variant: GameHeaderVariant;
  /** Heading text - used as subtitle below logo for `logoTitle`, or centered title for `title`. */
  title?: string;
  /** Slot on the left side of the header (back button, token chip, etc.). */
  leftSlot?: ReactNode;
  /** Slot on the right side of the header (settings gear, token chip, etc.). */
  rightSlot?: ReactNode;
  /**
   * Override the auto-calculated logo width.
   * Default: `clamp(120, min(width,700) * 0.28, 240)` on native,
   * slightly larger on web.
   */
  logoWidth?: number;
  /**
   * Override the header bar max-width on web.
   * When set, the bar is constrained to this width (centered).
   * Useful for matching the header bar width to a card row below.
   * No effect on native.
   */
  barMaxWidthOverride?: number;
  /**
   * Top padding recipe. Defaults to `standard` (question chrome).
   * Pass `home` only on the home hub so its larger frame pad is preserved.
   */
  topPad?: GameHeaderTopPad;
  /** Optional long-press on the centered logo (e.g. __DEV__ debug shortcuts). */
  onLogoLongPress?: () => void;
  /** Style override for the outer container. */
  style?: StyleProp<ViewStyle>;
};

/**
 * Shared header for Backfire screens.
 *
 * The header always sits at the top of its container with a compact height.
 * It does **not** add outer horizontal inset or bottom margin/padding - screens
 * own `LAYOUT.screenGutter` and spacing between the header and main content.
 *
 * The center (logo or title) is absolutely positioned so it stays perfectly
 * centered regardless of left/right slot widths.
 *
 * On web the header bar fills its parent container's width (no internal max-width
 * constraint). Screens that need a narrower header can pass `barMaxWidthOverride`
 * or wrap GameHeader in a width-constrained container.
 *
 * Usage:
 * ```tsx
 * <GameHeader variant="logoTitle" title="TEAM SETUP" leftSlot={<Back />} />
 * <GameHeader variant="logoOnly" leftSlot={<TokenChip />} rightSlot={<Gear />} />
 * <GameHeader variant="title" title="CHOOSE MODE" leftSlot={<Back />} rightSlot={<TokenChip />} />
 * ```
 */
export function GameHeader({
  variant,
  title,
  leftSlot,
  onLogoLongPress,
  rightSlot,
  logoWidth,
  barMaxWidthOverride,
  topPad: topPadVariant = 'standard',
  style,
}: GameHeaderProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const colors = useTheme();
  const isWeb = Platform.OS === 'web';
  const compact = windowHeight < 560;

  const headerHeight = isWeb ? HEADER.heightWeb : HEADER.heightNative;
  const topPad =
    topPadVariant === 'none'
      ? 0
      : topPadVariant === 'home'
        ? isWeb
          ? HEADER.topPaddingWeb
          : HEADER.topPaddingNative
        : getStandardChromeTopPadding(isWeb);

  const hasLogo = variant === 'logoOnly' || variant === 'logoTitle';
  const hasTitleText = Boolean(title);
  const showTitleBelow = hasLogo && hasTitleText;    // title below logo
  const showCenterTitle = variant === 'title' && hasTitleText; // centered in bar

  return (
    <View style={style}>
      {/* Header bar - compact, sits at top of its container */}
      <View
        style={[
          styles.bar,
          {
            minHeight: compact ? 44 : headerHeight,
            // Home: base HEADER pad. Everything else: standard (question) chrome pad.
            paddingTop: topPad,
            paddingBottom: compact ? 2 : SPACING.xs,
            // Outer horizontal inset is owned by screen shells (`LAYOUT.screenGutter`).
            paddingHorizontal: 0,
          },
          isWeb && [
            styles.barWeb,
            barMaxWidthOverride !== undefined && { maxWidth: barMaxWidthOverride },
          ],
        ]}
      >
        {/* Left slot */}
        <View style={[styles.side, styles.sideLeft]}>{leftSlot}</View>

        {/* Center content - absolutely positioned */}
        {hasLogo || showCenterTitle ? (
          <View style={styles.center} pointerEvents={onLogoLongPress ? 'box-none' : 'none'}>
            {hasLogo ? (
              onLogoLongPress ? (
                <Pressable
                  onLongPress={onLogoLongPress}
                  accessibilityRole="button"
                  accessibilityLabel="BackFire logo"
                  delayLongPress={450}
                  style={styles.logoWrap}
                >
                  <BackfireTitleLogo
                    width={getGameHeaderLogoDisplayWidth(windowWidth, windowHeight, logoWidth)}
                  />
                </Pressable>
              ) : (
                <BackfireTitleLogo
                  width={getGameHeaderLogoDisplayWidth(windowWidth, windowHeight, logoWidth)}
                  containerStyle={styles.logoWrap}
                />
              )
            ) : null}
            {showCenterTitle ? (
              <Text
                accessibilityRole="header"
                style={[
                  styles.centerTitle,
                  { color: colors.textOnBackground },
                  compact && styles.centerTitleCompact,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {title!.toUpperCase()}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Right slot */}
        <View style={[styles.side, styles.sideRight]}>{rightSlot}</View>
      </View>

      {/* Title below logo (logoTitle variant) */}
      {showTitleBelow ? (
        <View style={styles.subtitleRow}>
          <Text
            accessibilityRole="header"
            style={[
              styles.subtitle,
              { color: colors.textOnBackground },
              compact && styles.subtitleCompact,
            ]}
            numberOfLines={1}
          >
            {title!.toUpperCase()}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    flexShrink: 0,
  },
  /**
   * Centered on web; width fills parent up to barMaxWidthOverride so left/right
   * controls share edges with centered content cards below.
   */
  barWeb: {
    alignSelf: 'center',
    width: '100%',
  },
  side: {
    // Grow to balance the bar, but do not force-shrink slot content (token chip, back).
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  sideLeft: {
    alignItems: 'flex-start',
    zIndex: 2,
  },
  sideRight: {
    alignItems: 'flex-end',
    zIndex: 2,
  },
  center: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 1,
    elevation: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerTitle: {
    fontFamily: FONTS.uiBold,
    fontSize: FONT_SIZES.md,
    lineHeight: 22,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'center',
    color: '#333333',
    maxWidth: '50%',
  },
  centerTitleCompact: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 18,
    letterSpacing: 1,
  },
  subtitleRow: {
    width: '100%',
    alignItems: 'center',
    paddingTop: HEADER.titleBelowGap,
    paddingBottom: 0,
    flexShrink: 0,
  },
  subtitle: {
    fontFamily: FONTS.displayBold,
    fontSize: FONT_SIZES.sm,
    lineHeight: 18,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    textAlign: 'center',
    color: '#333333',
    paddingHorizontal: SPACING.sm,
  },
  subtitleCompact: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
  },
});
