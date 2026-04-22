import { useCallback } from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SPACING, BORDER_RADIUS, FONTS } from '@/constants';
import { HubTokenChip } from '@/components/HubTokenChip';
import { getRowDirection } from '@/lib/i18n/direction';
import { useI18n } from '@/lib/i18n/useI18n';
import { usePlayStore } from '@/store/play';
import { HOME_SOFT_UI } from '@/themes';

const T = HOME_SOFT_UI.colors;
const QUICKFIRE_TOKEN_ART = require('../../../assets/QF logo.png');

function formatTokens(n: number, locale: string) {
  return n.toLocaleString(locale, { maximumFractionDigits: 0 });
}

const backLift = {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.1,
  shadowRadius: 11,
  elevation: 5,
} as const;

export type PlayStackHeaderProps = {
  title: string;
  /** When set, used instead of default stack back / home fallback. */
  onBackPress?: () => void;
};

/**
 * Play stack top bar — docs/BRAND_GUIDELINES.md soft UI: cream-context chrome, white squircles, charcoal type.
 */
export function PlayStackHeader({ title, onBackPress }: PlayStackHeaderProps) {
  const router = useRouter();
  const { direction, t, uiLocale } = useI18n();
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
          style={styles.titleText}
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
            styles.plasticFace,
            backLift,
            { flexDirection: rowDir },
            {
              backgroundColor: T.surface,
              opacity: pressed ? 0.92 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name={backIcon} size={20} color={T.textPrimary} />
          <Text style={styles.backLabel}>{t('common.back')}</Text>
        </Pressable>
      </View>

      <View style={styles.spacer} />

      <View style={[styles.side, styles.sideEnd]}>
        <HubTokenChip
          label={t('common.tokens')}
          value={formatted}
          rowDirection={rowDir}
          variant="softUi"
          artworkSource={QUICKFIRE_TOKEN_ART}
          onPress={() => router.push('/(app)/store')}
          accessibilityLabel={`${t('common.tokens')}: ${formatted}`}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plasticFace: {
    borderTopWidth: 2,
    borderTopColor: 'rgba(255, 255, 255, 0.78)',
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
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
    fontFamily: FONTS.uiBold,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'center',
    maxWidth: '42%',
    color: T.textPrimary,
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
    borderWidth: 0,
  },
  backLabel: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 14,
    color: T.textPrimary,
  },
});
