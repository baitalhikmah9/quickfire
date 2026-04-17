import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FONTS, SPACING, LAYOUT } from '@/constants';
import { ScreenContent } from '@/components/ScreenContent';
import { HubTokenChip } from '@/components/HubTokenChip';
import { getRowDirection } from '@/lib/i18n/direction';
import { useI18n } from '@/lib/i18n/useI18n';
import { usePlayStore } from '@/store/play';
import { HOME_SOFT_UI } from '@/themes';
import type { GameMode } from '@/features/shared';
import type { TranslationKey } from '@/lib/i18n/messages/en';

const T = HOME_SOFT_UI;

type ModeDef = {
  id: GameMode;
  titleKey: TranslationKey;
  copyKey: TranslationKey;
  icon: keyof typeof Ionicons.glyphMap;
};

const HOME_MODES: ModeDef[] = [
  {
    id: 'quickPlay',
    titleKey: 'play.mode.quick',
    copyKey: 'play.mode.quickCopy',
    icon: 'flash-outline',
  },
  {
    id: 'classic',
    titleKey: 'play.mode.classic',
    copyKey: 'play.mode.classicCopy',
    icon: 'trophy-outline',
  },
  {
    id: 'random',
    titleKey: 'play.mode.random',
    copyKey: 'play.mode.randomCopy',
    icon: 'shuffle-outline',
  },
  {
    id: 'rumble',
    titleKey: 'play.mode.rumble',
    copyKey: 'play.mode.rumbleCopy',
    icon: 'people-outline',
  },
];

/** Deeper drop shadow — reads as a raised plastic tile (tier scales with control size). */
function neumorphicLift3D(
  shadowColor: string,
  tier: 'hero' | 'header' | 'pill'
): ViewStyle {
  const m =
    tier === 'hero'
      ? { h: 10, r: 0, el: 12 }
      : tier === 'header'
        ? { h: 6, r: 0, el: 8 }
        : { h: 4, r: 0, el: 4 };
  return {
    shadowColor: 'rgba(51, 51, 51, 0.15)', // Solid charcoal-tinted depth
    shadowOffset: { width: 0, height: m.h },
    shadowOpacity: 1,
    shadowRadius: m.r,
    elevation: m.el,
  };
}


export default function AppHubScreen() {
  const router = useRouter();
  const { direction, t, uiLocale } = useI18n();
  const tokens = usePlayStore((state) => state.tokens);
  const resetSession = usePlayStore((state) => state.resetSession);
  const setMode = usePlayStore((state) => state.setMode);
  const [activeModeInfo, setActiveModeInfo] = useState<GameMode | null>(null);

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  /** Tighter chrome when vertical space is limited (e.g. phone landscape). */
  const compact = windowHeight < 560;

  const rowDir = getRowDirection(direction);
  const formattedTokens = tokens.toLocaleString(uiLocale, { maximumFractionDigits: 0 });

  const hubHorizontalInset = useMemo(
    () => ({
      paddingLeft: LAYOUT.screenGutter,
      paddingRight: LAYOUT.screenGutter + Math.round(windowWidth * 0.04),
    }),
    [windowWidth]
  );

  const modeGap = compact ? SPACING.md : SPACING.lg;
  const modeIconSize = compact ? 72 : 96;
  const modeInfoIconSize = compact ? 20 : 24;

  const onSelectMode = useCallback((mode: GameMode) => {
    resetSession();
    setMode(mode);
    router.push(mode === 'quickPlay' ? '/play/quick-length' : '/play/team-setup');
  }, [resetSession, router, setMode]);

  const closeModeInfo = useCallback(() => {
    setActiveModeInfo(null);
  }, []);

  const openModeInfo = useCallback((mode: GameMode) => {
    setActiveModeInfo(mode);
  }, []);

  const activeMode = useMemo(
    () => HOME_MODES.find((mode) => mode.id === activeModeInfo) ?? null,
    [activeModeInfo]
  );

  const canvas = T.colors.canvas;
  const surface = T.colors.surface;
  const textPrimary = T.colors.textPrimary;
  const shadowHex = T.colors.shadowStrong;

  const logoWordmarkStyle: TextStyle = {
    fontFamily: FONTS.displayBold,
    fontSize: compact ? 22 : T.typography.logoWordmark.fontSize,
    letterSpacing: T.typography.logoWordmark.letterSpacing,
    color: textPrimary,
    textAlign: 'center',
    textTransform: 'none',
  };

  const logoCaplineStyle: TextStyle = {
    fontFamily: FONTS.ui,
    fontSize: compact ? 10 : T.typography.logoCapline.fontSize,
    letterSpacing: compact ? 2.5 : T.typography.logoCapline.letterSpacing,
    color: textPrimary,
    textAlign: 'center',
    marginTop: 2,
    textTransform: 'uppercase',
  };

  const headerSquircle = (icon: keyof typeof Ionicons.glyphMap, onPress: () => void, a11y: string) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={({ pressed }) => [
        styles.headerSquircleInner,
        styles.plasticFace,
        {
          backgroundColor: surface,
          borderRadius: 99,
          opacity: pressed ? 0.94 : 1,
          transform: pressed ? [{ scale: 0.97 }] : [{ scale: 1 }],
        },
        neumorphicLift3D(shadowHex, 'header'),
      ]}
    >
      <Ionicons name={icon} size={T.layout.iconHeaderSize} color={textPrimary} />
    </Pressable>
  );

  return (
    <SafeAreaView
      collapsable={false}
      edges={['top', 'bottom', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: canvas }]}
    >
      <ScreenContent fullWidth style={styles.viewport}>
        <View style={[styles.pageColumn, hubHorizontalInset]}>
          <View style={[styles.headerBar, compact && styles.headerBarCompact]}>
            <View style={[styles.headerEdge, styles.headerEdgeLeading]}>
              <HubTokenChip
                label={t('common.tokens')}
                value={formattedTokens}
                rowDirection={rowDir}
                variant="softUi"
                outerStyle={styles.hubTokenLeading}
                onPress={() => router.push('/(app)/store')}
                accessibilityLabel={`${t('common.tokens')}: ${formattedTokens}`}
              />
            </View>

            <View style={styles.headerLogoWrap} pointerEvents="none">
              <Text style={logoWordmarkStyle} numberOfLines={1} adjustsFontSizeToFit>
                {t('home.logoWordmark')}
              </Text>
              <Text style={logoCaplineStyle} numberOfLines={1}>
                {t('home.logoCapline')}
              </Text>
            </View>

            <View style={[styles.headerEdge, styles.headerEdgeTrailing]}>
              {headerSquircle(
                'settings-outline',
                () => router.push('/(app)/profile'),
                t('profile.preferences')
              )}
            </View>
          </View>

          <View style={styles.mainFill}>
            <View
              testID="home-mode-row"
              style={[
                styles.modeGrid,
                { flexDirection: rowDir, flexWrap: 'nowrap', gap: modeGap },
              ]}
            >
              {HOME_MODES.map((mode) => (
                <View key={mode.id} style={styles.modeTileContainer}>
                  <Pressable
                    onPress={() => onSelectMode(mode.id)}
                    accessibilityRole="button"
                    accessibilityLabel={t(mode.titleKey)}
                    style={({ pressed }) => [
                      styles.modeTile,
                      styles.plasticFace,
                      {
                        backgroundColor: surface,
                        borderRadius: 44,
                        opacity: pressed ? 0.94 : 1,
                        transform: pressed ? [{ scale: 0.97 }] : [{ scale: 1 }],
                      },
                      neumorphicLift3D(shadowHex, 'hero'),
                    ]}
                  >
                    <Ionicons
                      name={mode.icon}
                      size={modeIconSize * 0.82}
                      color={textPrimary}
                      style={{ marginBottom: compact ? 4 : 12 }}
                    />
                    <Text
                      style={[styles.modeTileLabel, compact && styles.modeTileLabelCompact, { color: textPrimary }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {t(mode.titleKey).toUpperCase()}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => openModeInfo(mode.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${t(mode.titleKey)} info`}
                    style={({ pressed }) => [
                      styles.modeInfoButton,
                      {
                        opacity: pressed ? 0.82 : 1,
                        transform: pressed ? [{ scale: 0.94 }] : [{ scale: 1 }],
                      },
                    ]}
                  >
                    <Ionicons
                      name="information-circle"
                      size={modeInfoIconSize}
                      color={textPrimary}
                    />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScreenContent>

      {activeMode ? (
        <View
          accessibilityViewIsModal
          style={styles.infoModalRoot}
          testID="home-mode-info-overlay"
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            onPress={closeModeInfo}
            style={styles.infoModalBackdrop}
          />
          <View
            style={[
              styles.infoModalCard,
              styles.plasticFace,
              neumorphicLift3D(shadowHex || 'rgba(0,0,0,0.1)', 'hero'),
              { backgroundColor: surface },
            ]}
          >
            <Text style={[styles.infoModalTitle, { color: textPrimary }]}>
              {t(activeMode.titleKey)}
            </Text>
            <Text style={[styles.infoModalBody, { color: textPrimary }]}>
              {t(activeMode.copyKey)}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              onPress={closeModeInfo}
              style={({ pressed }) => [
                styles.infoModalCloseButton,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={styles.infoModalCloseText}>{t('common.close').toUpperCase()}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  /** Light top lip + soft bottom edge — reads extruded on white squircles. */
  plasticFace: {
    borderTopWidth: 2,
    borderTopColor: 'rgba(255, 255, 255, 0.78)',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  safeArea: {
    flex: 1,
    position: 'relative',
  },
  viewport: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },
  pageColumn: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },
  mainFill: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    justifyContent: 'center',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: SPACING.sm,
    minHeight: 56,
    flexShrink: 0,
  },
  headerBarCompact: {
    paddingVertical: SPACING.xs,
    minHeight: 48,
  },
  headerEdge: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  headerEdgeLeading: {
    alignItems: 'flex-start',
  },
  headerEdgeTrailing: {
    alignItems: 'flex-end',
  },
  headerLogoWrap: {
    flex: 2,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xs,
  },
  /** Home hub: token chip sits on the outer edge (play header uses default `flex-end`). */
  hubTokenLeading: {
    alignSelf: 'flex-start',
  },

  headerSquircleInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeGrid: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  modeTileContainer: {
    flex: 1,
    aspectRatio: 0.85, // Taller for more presence
    marginHorizontal: 2,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeTile: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 1,
  },
  modeInfoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 3,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTileLabel: {
    fontFamily: FONTS.displayBold,
    fontSize: 22,
    letterSpacing: 1.2,
    textAlign: 'center',
    zIndex: 1,
  },
  modeTileLabelCompact: {
    fontSize: 16,
  },
  infoModalRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    elevation: 50,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: 'rgba(250, 249, 246, 0.4)',
  },
  infoModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  infoModalCard: {
    width: '100%',
    maxWidth: 280,
    padding: SPACING.lg,
    borderRadius: 42,
    gap: SPACING.md,
    alignItems: 'center',
    position: 'relative',
    zIndex: 2,
  },
  infoModalTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 20,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  infoModalBody: {
    fontFamily: FONTS.ui,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    opacity: 0.8,
  },
  infoModalCloseButton: {
    marginTop: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  infoModalCloseText: {
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    letterSpacing: 1.2,
    color: '#333333',
  },
});
