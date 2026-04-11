import { Image } from 'expo-image';
import { View, StyleSheet, useWindowDimensions, type ViewStyle } from 'react-native';
import { COLORS } from '@/constants/theme';

type ThemeColors = {
  primary: string;
  secondary?: string;
  accent?: string;
};

type HeroSectionProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Theme palette colors for decorative elements. Falls back to default COLORS. */
  themeColors?: ThemeColors;
  /** Decorative variant: 'dots' = side dots, 'ramadan' = lantern images, 'none' = no decorations (default) */
  variant?: 'dots' | 'ramadan' | 'none';
};

const RAMADAN_LIGHT_IMAGES = {
  left: 'https://d2du33uhi1xfjy.cloudfront.net/static-data/new-home-page/ramadan-small-lights-l.webp',
  right: 'https://d2du33uhi1xfjy.cloudfront.net/static-data/new-home-page/ramadan-small-lights-r.webp',
} as const;

/**
 * Decorative "lights" pattern using theme colors.
 * Mimics the festive side decorations from the reference design.
 */
function DecorativeLights({
  side,
  colors,
  variant = 'none',
}: {
  side: 'left' | 'right';
  colors: [string, string, string];
  variant?: 'dots' | 'ramadan' | 'none';
}) {
  const { height } = useWindowDimensions();
  const lightHeight = Math.min(height * 0.4, 220);

  if (variant === 'none') {
    return null;
  }

  if (variant === 'ramadan') {
    return (
      <View
        style={[
          styles.lightsContainer,
          side === 'left' ? styles.lightsLeft : styles.lightsRight,
          { height: lightHeight },
        ]}
        pointerEvents="none"
      >
        <Image
          source={RAMADAN_LIGHT_IMAGES[side]}
          style={styles.ramadanImage}
          contentFit="contain"
          cachePolicy="disk"
          accessibilityLabel="Ramadan lights"
        />
      </View>
    );
  }

  const lights = [
    { size: 12, opacity: 0.45 },
    { size: 9, opacity: 0.35 },
    { size: 14, opacity: 0.5 },
    { size: 9, opacity: 0.4 },
    { size: 11, opacity: 0.4 },
    { size: 10, opacity: 0.35 },
  ];

  return (
    <View
      style={[
        styles.lightsContainer,
        side === 'left' ? styles.lightsLeft : styles.lightsRight,
        { height: lightHeight },
      ]}
      pointerEvents="none"
    >
      {lights.map((light, i) => {
        const topPct = (i / (lights.length - 1)) * (lightHeight - light.size);
        return (
          <View
            key={`${side}-${i}`}
            style={[
              styles.lightDot,
              side === 'left' ? styles.lightDotLeft : styles.lightDotRight,
              {
                width: light.size,
                height: light.size,
                borderRadius: light.size / 2,
                opacity: light.opacity,
                top: topPct,
                backgroundColor: colors[i % 3],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

export function HeroSection({ children, style, themeColors, variant = 'none' }: HeroSectionProps) {
  const lightColors: [string, string, string] = themeColors
    ? [
      themeColors.primary,
      themeColors.secondary ?? themeColors.primary,
      themeColors.accent ?? themeColors.primary,
    ]
    : [COLORS.primary, COLORS.secondary, COLORS.tertiary];

  return (
    <View style={[styles.hero, style]}>
      <DecorativeLights side="left" colors={lightColors} variant={variant} />
      <DecorativeLights side="right" colors={lightColors} variant={variant} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    position: 'relative',
    width: '100%',
    minHeight: 200,
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
  lightsContainer: {
    position: 'absolute',
    top: 0,
    width: 60,
    zIndex: 0,
  },
  lightsLeft: {
    left: 0,
  },
  lightsRight: {
    right: 0,
  },
  lightDot: {
    position: 'absolute',
  },
  lightDotLeft: {
    left: 0,
  },
  lightDotRight: {
    right: 0,
  },
  ramadanImage: {
    width: '100%',
    height: '100%',
  },
});
