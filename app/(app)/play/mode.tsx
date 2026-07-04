import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Pressable } from '@/components/ui/Pressable';
import { GameHeader } from '@/components/GameHeader';
import { HeaderBackButton } from '@/components/HeaderBackButton';
import { HubTokenChip } from '@/components/HubTokenChip';
import { SPACING, LAYOUT, FONTS, BORDER_RADIUS } from '@/constants';
import type { GameMode } from '@/features/shared';
import { useI18n } from '@/lib/i18n/useI18n';
import { getRowDirection } from '@/lib/i18n/direction';
import { usePlayStore } from '@/store/play';
import { getPlaySurfaceColors } from '@/features/play/playSurfaceColors';
import { useThemeStore } from '@/store/theme';

type ModeDef = {
  id: GameMode;
  titleKey: TranslationKey;
};

const BACKFIRE_TOKEN_ART = require('@/assets/BF in game logo.png');

function formatTokens(n: number, locale: string) {
  return n.toLocaleString(locale, { maximumFractionDigits: 0 });
}

export default function PlayModeScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { t, direction, uiLocale } = useI18n();
  useThemeStore((state) => state.paletteId);
  const surfaceColors = getPlaySurfaceColors();
  const setMode = usePlayStore((state) => state.setMode);
  const storedMode = usePlayStore((state) => state.session?.mode);
  const tokens = usePlayStore((state) => state.tokens);
  const rowDir = getRowDirection(direction);
  const formattedTokens = formatTokens(tokens, uiLocale);

  const isWeb = Platform.OS === 'web';

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
  const gap = SPACING.md;
  const gapsTotal = gap * 3;
  /** Web / first paint can report 0×0 before layout; avoid 0-sized tiles and icon size 0 (can crash). */
  const safeW = Math.max(1, width);
  const safeH = Math.max(1, height);
  const rowInnerWidth = safeW - horizontalPadding;
  const rowTileBudget = Math.max(0, (rowInnerWidth - gapsTotal) / 4);
  const tileSide = Math.max(56, Math.min(rowTileBudget, safeH * 0.38));

  /** On native landscape: tighter header + content closer to top so cards don't clip off bottom. */
  const isNativeLandscape = !isWeb && width > height;
  const contentTopMargin = isNativeLandscape
    ? 8
    : isWeb
      ? 48
      : 24;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: surfaceColors.canvas }]} edges={['top', 'bottom', 'left', 'right']}>
      {/* ── Header ── compact, at top, no vertical centering of the combined group */}
      <GameHeader
        variant="title"
        title={t('play.chooseModeTitle')}
        leftSlot={
          <HeaderBackButton
            onPress={handleBack}
            direction={direction}
            rowDirection={rowDir}
            label={t('common.back')}
          />
        }
        rightSlot={
          <HubTokenChip
            label={t('common.tokens')}
            value={formattedTokens}
            rowDirection={rowDir}
            variant="softUi"
            artworkSource={BACKFIRE_TOKEN_ART}
            onPress={() => router.push('/(app)/store')}
            accessibilityLabel={`${t('common.tokens')}: ${formattedTokens}`}
          />
        }
      />

      {/* ── Content body ── fills remaining space, positions cards independently of header */}
      <View style={styles.body}>
        <View style={[styles.cardsArea, { marginTop: contentTopMargin }]}>
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
                      backgroundColor: surfaceColors.surface,
                      opacity: pressed ? 0.94 : 1,
                    },
                  ]}
                >
                  <View style={styles.tileInner} pointerEvents="none">
                    <Text
                      style={[styles.tileLabel, { color: surfaceColors.textPrimary }]}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  body: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    paddingHorizontal: LAYOUT.screenGutter,
  },
  /** Cards sit in the upper portion — no full-screen vertical centering. */
  cardsArea: {
    alignItems: 'center',
    justifyContent: 'flex-start',
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
