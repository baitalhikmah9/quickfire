import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPACING, BORDER_RADIUS, FONTS, TYPE_SCALE, LAYOUT } from '@/constants';
import { ScreenContent } from '@/components/ScreenContent';
import { PublicAuthEntry } from '@/components/PublicAuthEntry';
import { useTheme } from '@/lib/hooks/useTheme';
import { useI18n } from '@/lib/i18n/useI18n';
import { getRowDirection } from '@/lib/i18n/direction';
import { LEGAL_DOCUMENT_EFFECTIVE_DATE } from '@/lib/legal/effectiveDate';
import type { LegalSection } from '@/lib/legal/documentTypes';

export type LegalScrollScreenProps = {
  title: string;
  sections: LegalSection[];
};

export function LegalScrollScreen({ title, sections }: LegalScrollScreenProps) {
  const router = useRouter();
  const colors = useTheme();
  const { direction, t } = useI18n();
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
          showsVerticalScrollIndicator
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
            <PublicAuthEntry style={styles.topBarAuth} />
          </View>

          <Text style={[styles.docTitle, { color: colors.text, fontFamily: FONTS.displayBold }]}>{title}</Text>
          <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
            {t('legal.lastUpdated', { date: LEGAL_DOCUMENT_EFFECTIVE_DATE })}
          </Text>

          <View style={styles.englishBody}>
            {sections.map((section) => (
              <View key={section.heading} style={styles.section}>
                <Text style={[styles.sectionHeading, { color: colors.text }]}>{section.heading}</Text>
                {section.paragraphs.map((paragraph, index) => (
                  <Text
                    key={`${section.heading}-${index}`}
                    style={[styles.paragraph, { color: colors.textSecondary }]}
                  >
                    {paragraph}
                  </Text>
                ))}
              </View>
            ))}
          </View>
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
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    width: '100%',
    gap: SPACING.sm,
    minWidth: 0,
  },
  topBarAuth: {
    flexShrink: 1,
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
    gap: SPACING.md,
  },
  docTitle: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  lastUpdated: {
    ...TYPE_SCALE.bodyS,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  /** Legal copy is authored in English; keep LTR for readability in RTL UI locales. */
  englishBody: {
    writingDirection: 'ltr',
  },
  section: {
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  sectionHeading: {
    fontFamily: FONTS.uiBold,
    fontSize: 16,
    lineHeight: 22,
  },
  paragraph: {
    ...TYPE_SCALE.bodyM,
    lineHeight: 24,
  },
});
