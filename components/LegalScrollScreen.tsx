import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPACING, BORDER_RADIUS, FONTS, LAYOUT } from '@/constants';
import { ScreenContent } from '@/components/ScreenContent';
import { PublicAuthEntry } from '@/components/PublicAuthEntry';
import { LegalDocumentBody } from '@/components/LegalDocumentBody';
import { useTheme } from '@/lib/hooks/useTheme';
import { useI18n } from '@/lib/i18n/useI18n';
import { getRowDirection } from '@/lib/i18n/direction';
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

          <LegalDocumentBody
            preamble={{ title }}
            sections={sections}
            textPrimary={colors.text}
            textSecondary={colors.textSecondary}
          />
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
});
