import { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, type ViewStyle } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, LAYOUT } from '@/constants';
import { PillCollapsibleSection } from '@/components/PillCollapsibleSection';
import { HubTokenChip } from '@/components/HubTokenChip';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';
import { getRowDirection } from '@/lib/i18n/direction';
import { usePlayStore } from '@/store/play';
import { HOME_SOFT_UI } from '@/themes';

const T = HOME_SOFT_UI;

/** Raised plastic tile shadow tier. */
function neumorphicLift3D(shadowColor: string, tier: 'hero' | 'header' | 'pill'): any {
  const m =
    tier === 'hero'
      ? { h: 14, op: 0.14, r: 28, el: 18 }
      : tier === 'header'
      ? { h: 8, op: 0.12, r: 18, el: 12 }
      : { h: 6, op: 0.1, r: 14, el: 8 };

  return {
    shadowColor,
    shadowOffset: { width: 0, height: m.h },
    shadowOpacity: m.op,
    shadowRadius: m.r,
    elevation: m.el,
  };
}

const AMBER_GLOW = {
  shadowColor: '#FFB347',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.45,
  shadowRadius: 24,
  elevation: 10,
};

function formatTokens(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function ProfileAuthGate() {
  const router = useRouter();
  const colors = useTheme();
  const { direction, getTextStyle, t } = useI18n();
  const tokens = usePlayStore((s) => s.tokens);
  const headerDir: ViewStyle['flexDirection'] = direction === 'rtl' ? 'row-reverse' : 'row';
  const rowDir = getRowDirection(direction);

  const canvas = T.colors.canvas;
  const surface = T.colors.surface;
  const textPrimary = T.colors.textPrimary;
  const textMuted = T.colors.textMuted;
  const shadowHex = T.colors.shadowStrong;

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(app)/');
  }, [router]);

  const backIcon: keyof typeof Ionicons.glyphMap =
    direction === 'rtl' ? 'chevron-forward' : 'chevron-back';

  const pillTitle = useMemo(
    () => `${t('profile.guest.joinThe')} ${t('profile.guest.arena')}`.toUpperCase(),
    [t]
  );

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.topBar, { flexDirection: headerDir }]}>
        <View style={styles.topBarTitleOverlay} pointerEvents="none">
          <Text
            style={[
              styles.topBarTitle,
              { color: textPrimary },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {t('common.appName').toUpperCase()}
          </Text>
        </View>

        <View style={[styles.headerSide, styles.backHeaderHit]}>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.headerSquircleInner,
              styles.plasticFace,
              {
                backgroundColor: surface,
                borderRadius: 99,
                opacity: pressed ? 0.94 : 1,
                transform: pressed ? [{ scale: 0.97 }] : [{ scale: 1 }],
              },
              neumorphicLift3D(shadowHex, 'header'),
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Ionicons name={backIcon} size={22} color={textPrimary} />
          </Pressable>
        </View>

        <View style={styles.topBarSpacer} />

        <View style={[styles.headerSide, styles.headerSideEnd]}>
          <HubTokenChip
            label={t('common.tokens')}
            value={formatTokens(tokens)}
            rowDirection={rowDir}
            variant="softUi"
            accessibilityLabel={t('profile.guest.tokenPill', { count: formatTokens(tokens) })}
          />
        </View>
      </View>

      <View style={[styles.heroCard, styles.plasticFace, { backgroundColor: surface }, neumorphicLift3D(shadowHex, 'hero')]}>
        <View style={styles.iconCircle}>
          <Ionicons name="ribbon-outline" size={48} color={textPrimary} />
        </View>
        <Text style={[styles.heroTitle, { color: textPrimary }]}>{pillTitle}</Text>
        <Text style={[styles.kicker, { color: textMuted }]}>{t('profile.guest.pillKicker').toUpperCase()}</Text>
        <Text style={[styles.subtitle, { color: textMuted }]}>
          {t('profile.guest.subtitle')}
        </Text>

        <View style={styles.ctaGroup}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryCta,
              styles.plasticFace,
              {
                backgroundColor: surface,
                opacity: pressed ? 0.94 : 1,
                transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }]
              },
              neumorphicLift3D(shadowHex, 'pill'),
              AMBER_GLOW,
            ]}
            onPress={() => router.push('/(auth)/sign-up')}
            accessibilityRole="button"
          >
            <Text style={[styles.primaryCtaLabel, { color: textPrimary }]}>
              {t('profile.guest.createAccount').toUpperCase()}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryCta,
              styles.plasticFace,
              {
                backgroundColor: surface,
                opacity: pressed ? 0.94 : 1,
                transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }]
              },
              neumorphicLift3D(shadowHex, 'pill'),
            ]}
            onPress={() => router.push('/(auth)/sign-in')}
            accessibilityRole="button"
          >
            <Text style={[styles.secondaryCtaLabel, { color: textPrimary }]}>
              {t('profile.guest.login').toUpperCase()}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  plasticFace: {
    borderTopWidth: 2,
    borderTopColor: 'rgba(255, 255, 255, 0.78)',
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  scroll: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
    gap: SPACING.lg,
  },
  topBar: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    minHeight: 56,
  },
  topBarTitleOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 20,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  headerSide: {
    minWidth: 100,
    justifyContent: 'center',
  },
  headerSideEnd: {
    alignItems: 'flex-end',
  },
  backHeaderHit: {
    alignItems: 'flex-start',
  },
  topBarSpacer: {
    flex: 1,
  },
  headerSquircleInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    borderRadius: 42,
    padding: SPACING.xl,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(0,0,0,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  heroTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 28,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 4,
  },
  kicker: {
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: SPACING.lg,
  },
  subtitle: {
    fontFamily: FONTS.ui,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: SPACING.xxl,
    opacity: 0.7,
    maxWidth: 320,
  },
  ctaGroup: {
    alignSelf: 'stretch',
    gap: SPACING.md,
  },
  primaryCta: {
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaLabel: {
    fontFamily: FONTS.uiBold,
    fontSize: 15,
    letterSpacing: 1.2,
  },
  secondaryCta: {
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryCtaLabel: {
    fontFamily: FONTS.uiBold,
    fontSize: 15,
    letterSpacing: 1.2,
  },
});
