import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { QuickFireTitleLogo } from '@/components/QuickFireTitleLogo';
import { FONTS, SPACING, LAYOUT } from '@/constants';
import { ScreenContent } from '@/components/ScreenContent';
import { HubTokenChip } from '@/components/HubTokenChip';
import { getRowDirection } from '@/lib/i18n/direction';
import { useI18n } from '@/lib/i18n/useI18n';
import { isAuthDisabled } from '@/lib/authMode';
import { usePlayStore } from '@/store/play';
import { HOME_SOFT_UI } from '@/themes';
import { getGameTokenCost, getHomeModeTokenCostLabel } from '@/features/play/tokenCosts';
import type { GameMode, PlayRouteStep } from '@/features/shared';
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

/** docs/BRAND_GUIDELINES.md standard raised surface treatment. */
function brandRaisedSurfaceShadow(tier: 'hero' | 'header' | 'pill'): ViewStyle {
  const elevation = tier === 'hero' ? 4 : tier === 'header' ? 4 : 3;
  return {
    shadowColor: 'rgba(51, 51, 51, 0.15)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation,
  };
}

function RumblePeopleIcon({ size, color, compact }: { size: number; color: string; compact: boolean }) {
  const personSize = Math.round(size * 0.42);
  return (
    <View
      style={[
        styles.rumblePeopleIcon,
        {
          width: size,
          height: Math.round(size * 0.74),
          marginBottom: compact ? 4 : 10,
        },
      ]}
      accessible={false}
      testID="home-rumble-people-icon"
    >
      <View testID="home-rumble-person-1" style={[styles.rumblePerson, styles.rumblePersonLeft]}>
        <Ionicons name="person" size={personSize} color={color} />
      </View>
      <View testID="home-rumble-person-2" style={[styles.rumblePerson, styles.rumblePersonCenter]}>
        <Ionicons name="person" size={Math.round(personSize * 1.14)} color={color} />
      </View>
      <View testID="home-rumble-person-3" style={[styles.rumblePerson, styles.rumblePersonRight]}>
        <Ionicons name="person" size={personSize} color={color} />
      </View>
    </View>
  );
}

export default function AppHubScreen() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const authDisabled = isAuthDisabled();
  const { direction, t, uiLocale } = useI18n();
  const tokens = usePlayStore((state) => state.tokens);
  const session = usePlayStore((state) => state.session);
  const startModeSession = usePlayStore((state) => state.startModeSession);
  const [activeModeInfo, setActiveModeInfo] = useState<GameMode | null>(null);
  const [pendingMode, setPendingMode] = useState<GameMode | null>(null);

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
  const minimumTokenCostForMode = useCallback(
    (mode: GameMode) => (mode === 'quickPlay' ? getGameTokenCost(mode, 3) : getGameTokenCost(mode)),
    []
  );

  const startNewGame = useCallback((mode: GameMode) => {
    const minimumCost = minimumTokenCostForMode(mode);
    if (tokens < minimumCost) {
      Alert.alert('', t('play.needTokens'));
      return;
    }
    const result = startModeSession(mode);
    if (!result.ok) {
      Alert.alert('', result.error ?? t('play.needTokens'));
      return;
    }
    router.push(mode === 'quickPlay' ? '/play/quick-length' : '/play/team-setup');
  }, [minimumTokenCostForMode, router, startModeSession, t, tokens]);

  const routeForSessionStep = useCallback((step: PlayRouteStep) => {
    switch (step) {
      case 'quick-play-length':
        return '/play/quick-length';
      case 'team-setup':
        return '/play/team-setup';
      case 'categories':
        return '/play/categories';
      case 'board':
        return '/play/board';
      case 'question':
        return '/play/question';
      case 'answer':
        return '/play/question';
      case 'end':
        return '/play/end';
      default:
        return null;
    }
  }, []);

  const onSelectMode = useCallback((mode: GameMode) => {
    if (!isSignedIn && !authDisabled) {
      router.push('/(auth)/sign-in');
      return;
    }
    const hasOngoingSession =
      session && session.step !== 'hub' && session.step !== 'mode' && session.step !== 'end';
    if (hasOngoingSession) {
      setPendingMode(mode);
      return;
    }
    startNewGame(mode);
  }, [authDisabled, isSignedIn, router, session, startNewGame]);

  const closeResumeChoice = useCallback(() => {
    setPendingMode(null);
  }, []);

  const continueCurrentGame = useCallback(() => {
    if (!session) {
      closeResumeChoice();
      return;
    }
    const targetRoute = routeForSessionStep(session.step);
    closeResumeChoice();
    if (targetRoute) {
      router.push(targetRoute);
    }
  }, [closeResumeChoice, routeForSessionStep, router, session]);

  const startPendingModeNewGame = useCallback(() => {
    if (!pendingMode) {
      return;
    }
    const nextMode = pendingMode;
    closeResumeChoice();
    startNewGame(nextMode);
  }, [closeResumeChoice, pendingMode, startNewGame]);

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
  const textMuted = T.colors.textMuted;

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
              <QuickFireTitleLogo
                width={compact ? 172 : 220}
                testID="home-brand-logo"
                containerStyle={styles.headerLogoImageWrap}
              />
            </View>

            <View style={[styles.headerEdge, styles.headerEdgeTrailing]}>
              <Pressable
                onPress={() => router.push('/(app)/profile')}
                accessibilityRole="button"
                accessibilityLabel={t('profile.preferences')}
                style={({ pressed }) => [
                  styles.settingsImageButton,
                  { opacity: pressed ? 0.92 : 1, transform: pressed ? [{ scale: 0.97 }] : [{ scale: 1 }] },
                ]}
              >
                <Image
                  source={require('../../assets/QF Settings button.png')}
                  style={styles.settingsImage}
                  resizeMode="contain"
                />
              </Pressable>
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
                  {(() => {
                    const minimumCost = minimumTokenCostForMode(mode.id);
                    const canAffordMode = tokens >= minimumCost;
                    return (
                  <Pressable
                    onPress={() => onSelectMode(mode.id)}
                    disabled={!canAffordMode}
                    accessibilityRole="button"
                    accessibilityLabel={t(mode.titleKey)}
                    accessibilityHint={`${t(mode.copyKey)} ${getHomeModeTokenCostLabel(mode.id)} ${t('common.tokens')}.`}
                    accessibilityState={{ disabled: !canAffordMode }}
                    testID={`home-mode-card-${mode.id}`}
                    style={({ pressed }) => [
                      styles.modeTile,
                      styles.plasticFace,
                      {
                        backgroundColor: surface,
                        borderRadius: 44,
                        opacity: !canAffordMode ? 0.45 : pressed ? 0.94 : 1,
                        transform: pressed ? [{ scale: 0.97 }] : [{ scale: 1 }],
                      },
                      brandRaisedSurfaceShadow('hero'),
                    ]}
                  >
                    {mode.id === 'rumble' ? (
                      <RumblePeopleIcon
                        size={modeIconSize * 0.74}
                        color={textPrimary}
                        compact={compact}
                      />
                    ) : (
                      <Ionicons
                        name={mode.icon}
                        size={modeIconSize * 0.74}
                        color={textPrimary}
                        style={{ marginBottom: compact ? 4 : 10 }}
                      />
                    )}
                    <Text
                      testID={`home-mode-card-title-${mode.id}`}
                      style={[
                        styles.modeTileLabel,
                        compact && styles.modeTileLabelCompact,
                        { color: textPrimary },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {t(mode.titleKey).toUpperCase()}
                    </Text>
                    <Text
                      testID={`home-mode-card-copy-${mode.id}`}
                      style={[
                        styles.modeTileCopy,
                        compact && styles.modeTileCopyCompact,
                        { color: textMuted },
                      ]}
                      numberOfLines={2}
                      adjustsFontSizeToFit
                      minimumFontScale={0.82}
                    >
                      {t(mode.copyKey)}
                    </Text>
                    <View style={styles.modeTileCostRow}>
                      <Ionicons name="diamond" size={compact ? 9 : 11} color={textPrimary} />
                      <Text
                        testID={`home-mode-token-cost-${mode.id}`}
                        style={[
                          styles.modeTileCostText,
                          compact && styles.modeTileCostTextCompact,
                          { color: textPrimary },
                        ]}
                        numberOfLines={1}
                      >
                        {`${getHomeModeTokenCostLabel(mode.id)} ${t('common.tokens').toUpperCase()}`}
                      </Text>
                    </View>
                  </Pressable>
                    );
                  })()}
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
                      name="information-circle-outline"
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
              brandRaisedSurfaceShadow('hero'),
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

      {pendingMode ? (
        <View
          accessibilityViewIsModal
          style={styles.infoModalRoot}
          testID="home-resume-overlay"
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            onPress={closeResumeChoice}
            style={styles.infoModalBackdrop}
          />
          <View
            style={[
              styles.infoModalCard,
              styles.plasticFace,
              brandRaisedSurfaceShadow('hero'),
              { backgroundColor: surface },
            ]}
          >
            <Text style={[styles.infoModalTitle, { color: textPrimary }]}>
              {t('home.resumeModalTitle')}
            </Text>
            <Text style={[styles.infoModalBody, { color: textPrimary }]}>
              {t('home.resumeModalBody')}
            </Text>

            <View style={styles.resumeButtonsRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('home.continueGame')}
                onPress={continueCurrentGame}
                style={({ pressed }) => [
                  styles.resumePrimaryButton,
                  { opacity: pressed ? 0.78 : 1 },
                ]}
              >
                <Text style={styles.resumePrimaryButtonText}>{t('home.continueGame')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('home.newGame')}
                onPress={startPendingModeNewGame}
                style={({ pressed }) => [
                  styles.resumeSecondaryButton,
                  { opacity: pressed ? 0.78 : 1 },
                ]}
              >
                <Text style={styles.resumeSecondaryButtonText}>{t('home.newGame')}</Text>
              </Pressable>
            </View>
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
    justifyContent: 'flex-start',
    paddingTop: SPACING.xxl,
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
  headerLogoImageWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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
  settingsImageButton: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsImage: {
    width: '100%',
    height: '100%',
  },
  modeGrid: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginTop: SPACING.xl,
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
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
    fontFamily: FONTS.uiBold,
    fontSize: 18,
    letterSpacing: 1.2,
    textAlign: 'center',
    textTransform: 'uppercase',
    zIndex: 1,
  },
  modeTileLabelCompact: {
    fontSize: 14,
    letterSpacing: 1,
  },
  modeTileCopy: {
    marginTop: SPACING.xs,
    fontFamily: FONTS.ui,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.15,
    textAlign: 'center',
    zIndex: 1,
  },
  modeTileCopyCompact: {
    fontSize: 10,
    lineHeight: 13,
  },
  modeTileCostRow: {
    marginTop: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 16,
    zIndex: 1,
  },
  modeTileCostText: {
    fontFamily: FONTS.uiBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  modeTileCostTextCompact: {
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.4,
  },
  rumblePeopleIcon: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rumblePerson: {
    position: 'absolute',
  },
  rumblePersonLeft: {
    left: 0,
    bottom: 0,
  },
  rumblePersonCenter: {
    top: 0,
    alignSelf: 'center',
  },
  rumblePersonRight: {
    right: 0,
    bottom: 0,
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
  resumeButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  resumePrimaryButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B73E8',
  },
  resumePrimaryButtonText: {
    fontFamily: FONTS.uiBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  resumeSecondaryButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  resumeSecondaryButtonText: {
    fontFamily: FONTS.uiBold,
    fontSize: 13,
    color: '#333333',
  },
});
