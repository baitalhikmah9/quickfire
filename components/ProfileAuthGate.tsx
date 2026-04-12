import { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, type ViewStyle } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONTS } from '@/constants';
import { PillCollapsibleSection } from '@/components/PillCollapsibleSection';
import { HubTokenChip } from '@/components/HubTokenChip';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';
import { getRowDirection } from '@/lib/i18n/direction';
import { usePlayStore } from '@/store/play';

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
              { color: colors.textOnBackground },
              getTextStyle(undefined, 'displayBold', 'center'),
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

        <View style={styles.topBarSpacer} />

        <View style={[styles.headerSide, styles.headerSideEnd]}>
          <HubTokenChip
            label={t('common.tokens')}
            value={formatTokens(tokens)}
            rowDirection={rowDir}
            accessibilityLabel={t('profile.guest.tokenPill', { count: formatTokens(tokens) })}
          />
        </View>
      </View>

      <PillCollapsibleSection
        icon="ribbon-outline"
        title={pillTitle}
        kicker={t('profile.guest.pillKicker')}
        tone="primary"
        cardBackground={colors.cardBackground}
        rowDir={rowDir}
        collapsible={false}
      >
        <Text style={[styles.subtitle, { color: colors.textSecondary }, getTextStyle(undefined, 'body', 'start')]}>
          {t('profile.guest.subtitle')}
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.primaryCta,
            { backgroundColor: COLORS.accent, opacity: pressed ? 0.92 : 1 },
          ]}
          onPress={() => router.push('/(auth)/sign-up')}
          accessibilityRole="button"
          accessibilityHint={t('auth.signUp.heroTitle')}
        >
          <Text style={[styles.primaryCtaLabel, getTextStyle(undefined, 'bodyBold', 'center')]}>
            {t('profile.guest.createAccount')}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.secondaryCta,
            {
              borderColor: COLORS.secondary,
              backgroundColor: colors.cardBackground,
              opacity: pressed ? 0.94 : 1,
            },
          ]}
          onPress={() => router.push('/(auth)/sign-in')}
          accessibilityRole="button"
          accessibilityHint={t('auth.signIn.heroTitle')}
        >
          <Text style={[styles.secondaryCtaLabel, { color: COLORS.secondary }, getTextStyle(undefined, 'bodyBold', 'center')]}>
            {t('profile.guest.login')}
          </Text>
        </Pressable>
      </PillCollapsibleSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    minHeight: 48,
  },
  topBarTitleOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 15,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'center',
    maxWidth: '42%',
  },
  headerSide: {
    minWidth: 120,
    alignItems: 'center',
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
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: SPACING.lg,
  },
  primaryCta: {
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  primaryCtaLabel: {
    fontSize: 13,
    letterSpacing: 0.9,
    color: '#FFFFFF',
  },
  secondaryCta: {
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryCtaLabel: {
    fontSize: 13,
    letterSpacing: 0.9,
  },
});
