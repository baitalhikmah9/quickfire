import { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPACING, BORDER_RADIUS, FONTS, TYPE_SCALE, LAYOUT } from '@/constants';
import { SHOW_HOT_SEAT_UI } from '@/constants/featureFlags';
import { ScreenContent } from '@/components/ScreenContent';
import { PillCollapsibleSection } from '@/components/PillCollapsibleSection';
import { useTheme } from '@/lib/hooks/useTheme';
import { useI18n } from '@/lib/i18n/useI18n';
import { getRowDirection } from '@/lib/i18n/direction';
import type { SupportedLocale } from '@/lib/i18n/config';
import type { TranslationKey } from '@/lib/i18n/messages/en';

const WAGER_SECTION_ART = require('@/assets/wager.png');
const HOT_SEAT_SECTION_ART = require('@/assets/hot seat.png');

const MODE_ROWS: { labelKey: TranslationKey; bodyKey: TranslationKey }[] = [
  { labelKey: 'play.mode.classic', bodyKey: 'play.mode.classicCopy' },
  { labelKey: 'play.mode.quick', bodyKey: 'play.mode.quickCopy' },
  { labelKey: 'play.mode.random', bodyKey: 'play.mode.randomCopy' },
  { labelKey: 'play.mode.rumble', bodyKey: 'play.mode.rumbleCopy' },
];

function ModeBullets({
  t,
  locale,
  titleColor,
  bodyColor,
}: {
  t: (key: TranslationKey) => string;
  locale: SupportedLocale;
  titleColor: string;
  bodyColor: string;
}) {
  return (
    <>
      {MODE_ROWS.map(({ labelKey, bodyKey }) => (
        <View key={labelKey} style={styles.ruleBlock}>
          <Text style={[styles.ruleTitle, { fontFamily: getRuleTitleFont(locale), color: titleColor }]}>
            {t(labelKey)}
          </Text>
          <Text style={[styles.ruleBody, { color: bodyColor }]}>{t(bodyKey)}</Text>
        </View>
      ))}
    </>
  );
}

function getRuleTitleFont(locale: SupportedLocale): string {
  if (locale === 'ar' || locale === 'ur' || locale === 'hi' || locale === 'bn' || locale === 'zh-Hans') {
    return FONTS.uiBold;
  }
  return FONTS.displayBold;
}

export default function HowToPlayScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { direction, t, uiLocale } = useI18n();
  const rowDir = getRowDirection(direction);
  const backIcon: keyof typeof Ionicons.glyphMap =
    direction === 'rtl' ? 'chevron-forward' : 'chevron-back';

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(app)/');
  }, [router]);

  return (
    <SafeAreaView
      edges={['top', 'bottom', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScreenContent fullWidth style={styles.viewport}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.topBar, { flexDirection: rowDir }]}>
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

          <PillCollapsibleSection
            icon="grid-outline"
            title={t('howToPlay.sectionModes')}
            kicker={t('howToPlay.kickerModes')}
            tone="primary"
            cardBackground={colors.cardBackground}
            rowDir={rowDir}
          >
            <ModeBullets
              t={t}
              locale={uiLocale}
              titleColor={colors.text}
              bodyColor={colors.textSecondary}
            />
          </PillCollapsibleSection>

          <PillCollapsibleSection
            iconImage={WAGER_SECTION_ART}
            title={t('howToPlay.sectionWagers')}
            kicker={t('howToPlay.kickerWagers')}
            tone="secondary"
            cardBackground={colors.cardBackground}
            rowDir={rowDir}
          >
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>{t('howToPlay.wagersBody')}</Text>
          </PillCollapsibleSection>

          {SHOW_HOT_SEAT_UI ? (
            <PillCollapsibleSection
              iconImage={HOT_SEAT_SECTION_ART}
              title={t('howToPlay.sectionHotSeat')}
              kicker={t('howToPlay.kickerHotSeat')}
              tone="tertiary"
              cardBackground={colors.cardBackground}
              rowDir={rowDir}
            >
              <Text style={[styles.paragraph, { color: colors.textSecondary }]}>{t('howToPlay.hotSeatBody')}</Text>
            </PillCollapsibleSection>
          ) : null}

          <PillCollapsibleSection
            icon="flash-outline"
            title={t('howToPlay.sectionOvertime')}
            kicker={t('howToPlay.kickerOvertime')}
            tone="accent"
            cardBackground={colors.cardBackground}
            rowDir={rowDir}
          >
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>{t('howToPlay.overtimeBody')}</Text>
          </PillCollapsibleSection>
        </ScrollView>
      </ScreenContent>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  viewport: {
    flex: 1,
    minWidth: 0,
  },
  topBar: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: SPACING.sm,
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
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.screenGutter,
    paddingBottom: SPACING.xxl,
    gap: SPACING.lg,
  },
  ruleBlock: {
    marginBottom: SPACING.md,
  },
  ruleTitle: {
    fontSize: 17,
    lineHeight: 22,
    marginBottom: 4,
  },
  ruleBody: {
    ...TYPE_SCALE.bodyS,
    lineHeight: 20,
  },
  paragraph: {
    ...TYPE_SCALE.bodyM,
    lineHeight: 24,
  },
});
