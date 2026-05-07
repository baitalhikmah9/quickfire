import type { ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, I18nManager } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BRAND_RAISED_SURFACE, FONTS, SPACING } from '@/constants/theme';
import { HOME_SOFT_UI } from '@/themes';

const SOFT = HOME_SOFT_UI.colors;

export type AdminScreenHeaderProps = {
  title: string;
  fallbackHref: Href;
  /** Defaults to a generic back label. */
  backAccessibilityLabel?: string;
  /** Settings-style uppercase title (docs/BRAND_GUIDELINES.md). Set false for mixed-case strings such as emails. */
  uppercase?: boolean;
  /** Optional trailing control (e.g. Create); if omitted, a 44×44 spacer preserves title balance. */
  headerRight?: ReactNode;
};

/**
 * Settings-style admin header: flat row on canvas, raised 44×44 squircle back control, centered title, mirrored spacer.
 * @see docs/BRAND_GUIDELINES.md — Header Instructions (Settings Pages)
 */
export function AdminScreenHeader({
  title,
  fallbackHref,
  backAccessibilityLabel = 'Go back',
  uppercase = true,
  headerRight,
}: AdminScreenHeaderProps) {
  const router = useRouter();
  const chevronName = I18nManager.isRTL ? 'chevron-forward' : 'chevron-back';

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(fallbackHref);
  };

  const displayTitle = uppercase ? title.toUpperCase() : title;

  return (
    <View style={styles.headerRow}>
      <Pressable
        onPress={handleBack}
        accessibilityRole="button"
        accessibilityLabel={backAccessibilityLabel}
        style={({ pressed }) => [
          styles.backSquircle,
          BRAND_RAISED_SURFACE,
          pressed && styles.backPressed,
        ]}
      >
        <Ionicons name={chevronName} size={22} color={SOFT.textPrimary} />
      </Pressable>
      <View style={styles.titleWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {displayTitle}
        </Text>
      </View>
      {headerRight ? (
        <View style={styles.headerTrailing}>{headerRight}</View>
      ) : (
        <View style={styles.headerSpacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    minHeight: 72,
    paddingVertical: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleWrap: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  headerTrailing: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  backSquircle: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  title: {
    textAlign: 'center',
    fontFamily: FONTS.displayBold,
    fontSize: 18,
    letterSpacing: 0.6,
    color: SOFT.textPrimary,
  },
});
