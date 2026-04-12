import { useCallback } from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SPACING, BORDER_RADIUS, FONTS } from '@/constants';
import { HubTokenChip } from '@/components/HubTokenChip';
import { getRowDirection } from '@/lib/i18n/direction';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';
import { usePlayStore } from '@/store/play';

function formatTokens(n: number, locale: string) {
  return n.toLocaleString(locale, { maximumFractionDigits: 0 });
}

export type PlayStackHeaderProps = {
  title: string;
  /** When set, used instead of default stack back / home fallback. */
  onBackPress?: () => void;
};

/**
 * Matches hub / store top bar: back pill · centered title · token chip.
 */
export function PlayStackHeader({ title, onBackPress }: PlayStackHeaderProps) {
  const router = useRouter();
  const colors = useTheme();
  const { direction, t, getTextStyle, uiLocale } = useI18n();
  const tokens = usePlayStore((s) => s.tokens);
  const headerDir: ViewStyle['flexDirection'] = direction === 'rtl' ? 'row-reverse' : 'row';
  const rowDir = getRowDirection(direction);

  const handleBack = useCallback(() => {
    if (onBackPress) {
      onBackPress();
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(app)/');
  }, [onBackPress, router]);

  const backIcon: keyof typeof Ionicons.glyphMap =
    direction === 'rtl' ? 'chevron-forward' : 'chevron-back';

  const formatted = formatTokens(tokens, uiLocale);

  return (
    <View style={[styles.topBar, { flexDirection: headerDir }]}>
      <View style={styles.titleOverlay} pointerEvents="none">
        <Text
          style={[
            styles.titleText,
            { color: colors.textOnBackground },
            getTextStyle(undefined, 'displayBold', 'center'),
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {title.toUpperCase()}
        </Text>
      </View>

      <View style={[styles.side, styles.backHit]}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [
            styles.backPill,
            { flexDirection: rowDir },
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
              opacity: pressed ? 0.92 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name={backIcon} size={20} color={colors.primary} />
          <Text style={[styles.backLabel, { color: colors.textOnBackground }]}>{t('common.back')}</Text>
        </Pressable>
      </View>

      <View style={styles.spacer} />

      <View style={[styles.side, styles.sideEnd]}>
        <HubTokenChip
          label={t('common.tokens')}
          value={formatted}
          rowDirection={rowDir}
          onPress={() => router.push('/(app)/store')}
          accessibilityLabel={`${t('common.tokens')}: ${formatted}`}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    minHeight: 48,
    marginBottom: SPACING.md,
  },
  titleOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 15,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'center',
    maxWidth: '42%',
  },
  side: {
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideEnd: {
    alignItems: 'flex-end',
  },
  backHit: {
    alignItems: 'flex-start',
  },
  spacer: {
    flex: 1,
    minWidth: SPACING.md,
  },
  backPill: {
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 2,
  },
  backLabel: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 15,
  },
});
