import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Pressable } from '@/components/ui/Pressable';
import { ScreenContent } from '@/components/ScreenContent';
import { SPACING, LAYOUT, FONTS, BORDER_RADIUS } from '@/constants';
import type { GameMode } from '@/features/shared';
import { PlayStackHeader } from '@/features/play/components/PlayStackHeader';
import { useI18n } from '@/lib/i18n/useI18n';
import { getRowDirection } from '@/lib/i18n/direction';
import { usePlayStore } from '@/store/play';
import type { TranslationKey } from '@/lib/i18n/messages/en';

/** docs/BRAND_GUIDELINES.md — warm cream canvas */
const CANVAS_WARM_CREAM = '#FAF9F6';
/** Primary copy / icons on light surfaces */
const CHARCOAL = '#333333';

type ModeDef = {
  id: GameMode;
  titleKey: TranslationKey;
};

export default function PlayModeScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { t, direction } = useI18n();
  const setMode = usePlayStore((state) => state.setMode);
  const storedMode = usePlayStore((state) => state.session?.mode);

  const [selected, setSelected] = useState<GameMode>('classic');

  useEffect(() => {
    if (storedMode) setSelected(storedMode);
  }, [storedMode]);

  const modes: ModeDef[] = useMemo(
    () => [
      {
        id: 'quickPlay',
        titleKey: 'play.mode.quick',
      },
      {
        id: 'classic',
        titleKey: 'play.mode.classic',
      },
      {
        id: 'random',
        titleKey: 'play.mode.random',
      },
      {
        id: 'rumble',
        titleKey: 'play.mode.rumble',
      },
    ],
    []
  );

  const onSelectMode = useCallback(
    (mode: GameMode) => {
      setMode(mode);
      router.push(mode === 'quickPlay' ? '/play/quick-length' : '/play/team-setup');
    },
    [router, setMode]
  );

  const handlePress = useCallback(
    (mode: GameMode) => {
      setSelected(mode);
      onSelectMode(mode);
    },
    [onSelectMode]
  );

  const horizontalPadding = LAYOUT.screenGutter * 2;
  const gap = SPACING.md;
  const gapsTotal = gap * 3;
  /** Web / first paint can report 0×0 before layout; avoid 0-sized tiles and icon size 0 (can crash). */
  const safeW = Math.max(1, width);
  const safeH = Math.max(1, height);
  const rowInnerWidth = safeW - horizontalPadding;
  const rowTileBudget = Math.max(0, (rowInnerWidth - gapsTotal) / 4);
  const tileSide = Math.max(56, Math.min(rowTileBudget, safeH * 0.38));

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: CANVAS_WARM_CREAM }]} edges={['top', 'bottom', 'left', 'right']}>
      <ScreenContent fullWidth style={styles.viewport}>
        <View style={styles.headerInset}>
          <PlayStackHeader title={t('play.chooseModeTitle')} />
        </View>

        <View style={styles.gridVertical}>
          <View
            style={[
              styles.modeRow,
              {
                gap,
                maxWidth: Math.max(0, rowInnerWidth),
                alignSelf: 'center',
                flexDirection: getRowDirection(direction),
              },
            ]}
          >
            {modes.map((mode) => {
              const isSelected = selected === mode.id;
              return (
                <Pressable
                  key={mode.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={t(mode.titleKey)}
                  onPress={() => handlePress(mode.id)}
                  style={({ pressed }) => [
                    styles.tile,
                    styles.tileShadow,
                    {
                      width: tileSide,
                      height: tileSide,
                      opacity: pressed ? 0.94 : 1,
                    },
                  ]}
                >
                  <View style={styles.tileInner} pointerEvents="none">
                    <Text style={styles.tileLabel} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.72}>
                      {t(mode.titleKey).toUpperCase()}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
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
  gridVertical: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.screenGutter,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'nowrap',
  },
  tile: {
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  tileInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xs,
  },
  tileLabel: {
    fontFamily: FONTS.displayBold,
    fontSize: 15,
    letterSpacing: 0.6,
    textAlign: 'center',
    color: CHARCOAL,
    zIndex: 1,
  },
  tileShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 6,
  },
});
