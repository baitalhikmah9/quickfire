import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Pressable } from '@/components/ui/Pressable';
import { SPACING, LAYOUT, FONTS, BORDER_RADIUS } from '@/constants';
import type { GameMode } from '@/features/shared';
import { useI18n } from '@/lib/i18n/useI18n';
import { getRowDirection } from '@/lib/i18n/direction';
import { useViewportLayout } from '@/lib/hooks/useViewportLayout';
import { usePlayStore } from '@/store/play';
import { PlayScaffold } from '@/features/play/components/PlayScaffold';
import { useThemeStore } from '@/store/theme';
import { HOME_SOFT_UI } from '@/themes';
import type { TranslationKey } from '@/lib/i18n/messages/en';

type ModeDef = {
  id: GameMode;
  titleKey: TranslationKey;
};

export default function PlayModeScreen() {
  const router = useRouter();
  const viewport = useViewportLayout();
  const { width, height } = viewport;
  const { t, direction } = useI18n();
  useThemeStore((state) => state.paletteId);
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

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(app)/');
    }
  }, [router]);

  const handlePress = useCallback(
    (mode: GameMode) => {
      setSelected(mode);
      onSelectMode(mode);
    },
    [onSelectMode]
  );

  const horizontalPadding = LAYOUT.screenGutter * 2;
  const gap = Math.round(SPACING.md * (viewport.isWide ? viewport.scale : 1));
  const gapsTotal = gap * 3;
  /** Web / first paint can report 0×0 before layout; avoid 0-sized tiles and icon size 0 (can crash). */
  const safeW = Math.max(1, width);
  const safeH = Math.max(1, height);
  const setupMaxWidth = viewport.contentMaxWidth('setup');
  const rowInnerWidth = Math.min(safeW - horizontalPadding, setupMaxWidth);
  const rowTileBudget = Math.max(0, (rowInnerWidth - gapsTotal) / 4);
  const tileSide = Math.max(
    56,
    Math.min(rowTileBudget, safeH * 0.38 * (viewport.isWide ? viewport.scale : 1))
  );

  return (
    <PlayScaffold
      title={t('play.chooseModeTitle')}
      onBack={handleBack}
      bodyFrame={false}
      bodyScrollEnabled={false}
      contentMaxWidth={viewport.isWide ? setupMaxWidth : undefined}
    >
      <View style={[styles.body, { justifyContent: viewport.mainJustify }]}>
        <View style={styles.cardsArea}>
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
                      backgroundColor: HOME_SOFT_UI.colors.surface,
                      opacity: pressed ? 0.94 : 1,
                    },
                  ]}
                >
                  <View style={styles.tileInner} pointerEvents="none">
                    <Text
                      style={[styles.tileLabel, { color: HOME_SOFT_UI.colors.textPrimary }]}
                      numberOfLines={2}
                      adjustsFontSizeToFit
                      minimumFontScale={0.72}
                    >
                      {t(mode.titleKey).toUpperCase()}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </PlayScaffold>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
  /** Card row; vertical placement comes from body `justifyContent` via viewport layout. */
  cardsArea: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
  },

  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'nowrap',
  },
  tile: {
    borderRadius: BORDER_RADIUS.xl,
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
