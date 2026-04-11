import { useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { HubActionCard } from '@/components/HubActionCard';
import { ScreenContent } from '@/components/ScreenContent';
import { SPACING, LAYOUT, COLORS } from '@/constants';
import type { GameMode } from '@/features/shared';
import { PlayStackHeader } from '@/features/play/components/PlayStackHeader';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';
import { usePlayStore } from '@/store/play';
import { useHubPillLayout } from '@/lib/hooks/useHubPillLayout';
import type { TranslationKey } from '@/lib/i18n/messages/en';
import type { HubActionCardProps } from '@/components/HubActionCard';

type ModeDef = {
  id: GameMode;
  titleKey: TranslationKey;
  copyKey: TranslationKey;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  pillTone: NonNullable<HubActionCardProps['pillTone']>;
};

export default function PlayModeScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { getTextStyle, t } = useI18n();
  const setMode = usePlayStore((state) => state.setMode);
  const hubPills = useHubPillLayout(true);
  const snapInterval = hubPills.cardW + hubPills.betweenCards;

  const modes: ModeDef[] = useMemo(
    () => [
      {
        id: 'classic',
        titleKey: 'play.mode.classic',
        copyKey: 'play.mode.classicCopy',
        icon: 'grid-outline',
        accent: colors.primary,
        pillTone: 'primary',
      },
      {
        id: 'quickPlay',
        titleKey: 'play.mode.quick',
        copyKey: 'play.mode.quickCopy',
        icon: 'timer-outline',
        accent: colors.secondary,
        pillTone: 'secondary',
      },
      {
        id: 'random',
        titleKey: 'play.mode.random',
        copyKey: 'play.mode.randomCopy',
        icon: 'shuffle',
        accent: colors.tertiary,
        pillTone: 'tertiary',
      },
      {
        id: 'rumble',
        titleKey: 'play.mode.rumble',
        copyKey: 'play.mode.rumbleCopy',
        icon: 'people',
        accent: COLORS.accent,
        pillTone: 'accent',
      },
    ],
    [colors.primary, colors.secondary, colors.tertiary]
  );

  const onSelectMode = useCallback(
    (mode: GameMode) => {
      setMode(mode);
      router.push(mode === 'quickPlay' ? '/(app)/play/quick-length' : '/(app)/play/team-setup');
    },
    [router, setMode]
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <ScreenContent fullWidth style={styles.viewport}>
        <View style={styles.headerInset}>
          <PlayStackHeader title={t('play.chooseModeTitle')} />
        </View>
        <ScrollView
          style={styles.carouselVertical}
          contentContainerStyle={styles.carouselVerticalContent}
          showsVerticalScrollIndicator
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            decelerationRate="fast"
            snapToInterval={snapInterval}
            snapToAlignment="start"
            disableIntervalMomentum
            contentContainerStyle={styles.carouselContent}
            style={[styles.carousel, { minHeight: hubPills.pillStripMinHeight }]}
          >
            {modes.map((mode) => (
              <HubActionCard
                key={mode.id}
                title={t(mode.titleKey)}
                subtitle={t(mode.copyKey)}
                icon={mode.icon}
                accent={mode.accent}
                colors={colors}
                titleStyle={getTextStyle(undefined, 'displayBold', 'center')}
                subtitleStyle={getTextStyle(undefined, 'body', 'center')}
                fixedWidth={hubPills.cardW}
                compact={hubPills.compactCards}
                visualVariant="pill3d"
                pillTone={mode.pillTone}
                onPress={() => onSelectMode(mode.id)}
              />
            ))}
          </ScrollView>
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
    minHeight: 0,
  },
  headerInset: {
    paddingHorizontal: LAYOUT.screenGutter,
  },
  carouselVertical: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
  carouselVerticalContent: {
    flexGrow: 1,
    paddingBottom: SPACING.lg,
  },
  carousel: {
    flexGrow: 1,
    flexShrink: 0,
    minWidth: 0,
  },
  carouselContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.md,
    paddingBottom: SPACING.lg,
    paddingHorizontal: LAYOUT.screenGutter,
  },
});
