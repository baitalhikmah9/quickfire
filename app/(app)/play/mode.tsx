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

  // #region agent log
  fetch('http://127.0.0.1:7814/ingest/224abf79-359e-4b9a-836f-1b018a6a309d', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '92ac8d' },
    body: JSON.stringify({
      sessionId: '92ac8d',
      location: 'app/(app)/play/mode.tsx:PlayModeScreen',
      message: 'PlayModeScreen render after hubPills',
      data: {
        hypothesisId: 'H1-orphan-hook',
        cardW: hubPills.cardW,
        compactCards: hubPills.compactCards,
        noUseWindowDimensionsCall: true,
      },
      timestamp: Date.now(),
      runId: 'verify-post-fix',
    }),
  }).catch(() => {});
  // #endregion

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
        <View style={styles.carouselVertical}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            decelerationRate="fast"
            snapToInterval={snapInterval}
            snapToAlignment="start"
            disableIntervalMomentum
            contentContainerStyle={[
              styles.carouselContent,
              hubPills.compactCards && styles.carouselContentCompact,
              styles.carouselContentFillCross,
            ]}
            style={styles.carousel}
            keyboardShouldPersistTaps="handled"
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
        </View>
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
  /** Same flex contract as home `deckCardInset` → `cardRow`: strip grows so pills match hub height. */
  carouselVertical: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
  carousel: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
  carouselContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
    flexGrow: 1,
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: LAYOUT.screenGutter,
  },
  carouselContentCompact: {
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  /** Match home hub row height: stretch pills to the ScrollView’s vertical space. */
  carouselContentFillCross: {
    minHeight: '100%',
  },
});
