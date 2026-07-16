import { useCallback } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  SPACING,
  LAYOUT,
  SOFT_SURFACE_FACE,
  softSurfaceLift,
  getStandardChromeTopPadding,
} from '@/constants';
import { ScreenContent } from '@/components/ScreenContent';
import { PublicAuthEntry } from '@/components/PublicAuthEntry';
import { LegalDocumentBody } from '@/components/LegalDocumentBody';
import { useDarkModeFlatTop, useTheme } from '@/lib/hooks/useTheme';
import { goBackOrReplace } from '@/lib/navigation/goBackOrReplace';
import { HOME_SOFT_UI } from '@/themes';
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
  const darkModeFlatTop = useDarkModeFlatTop();
  const { direction, t } = useI18n();
  const rowDir = getRowDirection(direction);
  // Read canvas/surface after useTheme subscription so dark mode resolves on first paint
  // (avoids white ScrollView/native stack flash during root-stack push).
  const canvas = HOME_SOFT_UI.colors.canvas;
  const surface = HOME_SOFT_UI.colors.surface;
  const textPrimary = HOME_SOFT_UI.colors.textPrimary;
  const backIcon: keyof typeof Ionicons.glyphMap =
    direction === 'rtl' ? 'chevron-forward' : 'chevron-back';
  const chromeTopPad = getStandardChromeTopPadding(Platform.OS === 'web');

  const handleBack = useCallback(() => {
    goBackOrReplace(router, '/(app)/');
  }, [router]);

  return (
    <SafeAreaView
      collapsable={false}
      testID="legal-scroll-screen"
      edges={['top', 'bottom', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: canvas }]}
    >
      <ScreenContent fullWidth style={[styles.viewport, { backgroundColor: canvas }]}>
        <ScrollView
          testID="legal-scroll-view"
          style={[styles.scroll, { backgroundColor: canvas }]}
          contentContainerStyle={[styles.scrollContent, { paddingTop: chromeTopPad }]}
          showsVerticalScrollIndicator
        >
          <View style={[styles.topBar, { flexDirection: rowDir }]}>
            <Pressable
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              style={({ pressed }) => [
                styles.backButton,
                SOFT_SURFACE_FACE,
                darkModeFlatTop,
                softSurfaceLift(),
                { backgroundColor: surface },
                {
                  opacity: pressed ? 0.9 : 1,
                  transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
                },
              ]}
            >
              <Ionicons name={backIcon} size={22} color={textPrimary} />
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
    paddingBottom: SPACING.sm,
    width: '100%',
    gap: SPACING.sm,
    minWidth: 0,
  },
  topBarAuth: {
    flexShrink: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
