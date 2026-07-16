import { useCallback, useMemo, useState } from 'react';
import {
  Image,
  Platform,
  View,
  Text,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { showThemedAlert } from '@/store/themedAlert';
import { Pressable } from '@/components/ui/Pressable';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  COLORS,
  FONTS,
  SPACING,
  LAYOUT,
  SHOW_HOME_MODE_INFO_UI,
  SOFT_SURFACE_FACE,
  softSurfaceLift,
} from '@/constants';
import { ScreenContent } from '@/components/ScreenContent';
import { GameHeader } from '@/components/GameHeader';
import { HubTokenChip } from '@/components/HubTokenChip';
import { WebAwareModal } from '@/components/WebAwareModal';
import { getRowDirection } from '@/lib/i18n/direction';
import { useI18n } from '@/lib/i18n/useI18n';
import { isAuthDisabled } from '@/lib/authMode';
import { useViewportLayout } from '@/lib/hooks/useViewportLayout';
import { usePlayStore } from '@/store/play';
import { refundGameEntry } from '@/lib/wallet/gameEntry';
import { useThemeStore } from '@/store/theme';
import { HOME_SOFT_UI } from '@/themes';
import { isResumableSessionStep, routeForPlayStep } from '@/features/play/sessionRouting';
import { getGameTokenCost, getHomeModeTokenCostLabel } from '@/features/play/tokenCosts';
import type { GameMode } from '@/features/shared';
import type { TranslationKey } from '@/lib/i18n/messages/en';

import { markOnce } from '@/lib/startupTiming';

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

function RumblePeopleIcon({ size, color, compact, isWeb }: { size: number; color: string; compact: boolean; isWeb?: boolean }) {
  const personSize = Math.round(size * 0.42);
  return (
    <View
      style={[
        styles.rumblePeopleIcon,
        {
          width: size,
          height: Math.round(size * 0.74),
          marginBottom: compact ? 4 : (isWeb ? 8 : 10),
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
  markOnce('home screen first render');
  const router = useRouter();

  const { isLoaded, isSignedIn } = useAuth();
  if (isLoaded) markOnce('home screen: auth loaded');
  const authDisabled = isAuthDisabled();
  const { direction, t, uiLocale } = useI18n();
  const paletteId = useThemeStore((state) => state.paletteId);
  const isDarkTheme = paletteId === 'dark';
  const storedTokens = usePlayStore((state) => state.tokens);
  const tokens = !authDisabled && !isSignedIn ? 0 : storedTokens;
  const session = usePlayStore((state) => state.session);
  const startModeSession = usePlayStore((state) => state.startModeSession);
  const loadDebugWinnerSession = usePlayStore((state) => state.loadDebugWinnerSession);
  const setEntryReservationId = usePlayStore((state) => state.setEntryReservationId);
  const refundEntryMutation = useMutation(api.wallet.refundEntry);
  const [activeModeInfo, setActiveModeInfo] = useState<GameMode | null>(null);
  const [pendingMode, setPendingMode] = useState<GameMode | null>(null);

  const viewport = useViewportLayout();
  /** Tighter chrome when vertical space is limited (e.g. phone landscape). */
  const compact = viewport.isCompact;
  const hubMaxWidth = viewport.contentMaxWidth('hub');
  const hybridScale = viewport.isWide ? viewport.scale : 1;

  const rowDir = getRowDirection(direction);
  const formattedTokens = tokens.toLocaleString(uiLocale, { maximumFractionDigits: 0 });
  const needsSignIn = !authDisabled && !isSignedIn;

  const isWeb = Platform.OS === 'web';

  const modeGap = compact
    ? SPACING.md
    : Math.round((isWeb ? 36 : SPACING.lg) * hybridScale);
  const modeIconSize = compact
    ? 70
    : Math.round((isWeb ? 96 : 92) * hybridScale);
  const modeInfoIconSize = compact ? 20 : 24;
  const modeTitleSize = compact ? 12 : Math.round((isWeb ? 17 : 16) * hybridScale);
  const modeCopySize = compact ? 10 : Math.round((isWeb ? 12 : 11) * hybridScale);
  const minimumTokenCostForMode = useCallback(
    (mode: GameMode) => (mode === 'quickPlay' ? getGameTokenCost(mode, 3) : getGameTokenCost(mode)),
    []
  );

  const startNewGame = useCallback(async (mode: GameMode) => {
    const minimumCost = minimumTokenCostForMode(mode);
    if (tokens < minimumCost) {
      showThemedAlert(t('play.needTokens'));
      return;
    }

    // Drop any leftover reservation from a prior abandoned flow. Tokens are only
    // reserved/spent when the board starts after topics are chosen.
    const oldReservationId = usePlayStore.getState().entryReservationId;
    if (oldReservationId && !authDisabled && isLoaded && isSignedIn) {
      await refundGameEntry(refundEntryMutation, {
        reservationId: oldReservationId,
        reason: 'session_replaced',
      }).catch(() => {});
      setEntryReservationId(null);
    }

    const result = startModeSession(mode);
    if (!result.ok) {
      showThemedAlert(result.error ?? t('play.needTokens'));
      return;
    }
    router.push(mode === 'quickPlay' ? '/play/quick-length' : '/play/team-setup');
  }, [
    authDisabled,
    isLoaded,
    isSignedIn,
    minimumTokenCostForMode,
    refundEntryMutation,
    router,
    setEntryReservationId,
    startModeSession,
    t,
    tokens,
  ]);

  const onSelectMode = useCallback((mode: GameMode) => {
    if (!isSignedIn && !authDisabled) {
      router.push('/(auth)/sign-in');
      return;
    }
    if (session && isResumableSessionStep(session.step)) {
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
    const targetRoute = routeForPlayStep(session.step);
    closeResumeChoice();
    if (targetRoute) {
      router.push(targetRoute);
    }
  }, [closeResumeChoice, router, session]);

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
    <View style={[styles.rootContainer, { backgroundColor: canvas }]}>
      <SafeAreaView
        collapsable={false}
        edges={['top', 'bottom', 'left', 'right']}
        style={styles.safeArea}
      >
        <ScreenContent fullWidth style={styles.viewport}>
          <View style={styles.pageColumn}>
            {/* Shared max-width aligns header bar + card row edges (hybrid hub column). */}
            {/*
              Top pad lives on a normal View - SafeAreaView can ignore/override paddingTop
              when status-bar insets are 0 (hidden bar).
            */}
            <View style={[styles.contentFrame, styles.contentFrameTopPad, { maxWidth: hubMaxWidth }]}>
            <GameHeader
              variant="logoOnly"
              topPad="home"
              barMaxWidthOverride={isWeb ? hubMaxWidth : undefined}
              onLogoLongPress={
                __DEV__
                  ? () => {
                      loadDebugWinnerSession();
                      router.push('/play/end');
                    }
                  : undefined
              }
              leftSlot={
                <HubTokenChip
                  label={t('common.tokens')}
                  value={formattedTokens}
                  rowDirection={rowDir}
                  variant="softUi"
                  outerStyle={{ alignSelf: 'flex-start' }}
                  onPress={() => router.push('/(app)/store')}
                  accessibilityLabel={`${t('common.tokens')}: ${formattedTokens}`}
                />
              }
              rightSlot={
                <Pressable
                  testID="home-open-settings"
                  onPress={() => router.push('/(app)/settings')}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.settings')}
                  style={({ pressed }) => [
                    styles.settingsImageButton,
                    { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                  ]}
                >
                  <Image
                    source={require('../../assets/QF Settings button.png')}
                    style={styles.settingsImage}
                    resizeMode="contain"
                  />
                </Pressable>
              }
            />

            <View style={[styles.mainFill, { justifyContent: viewport.mainJustify }]}>
              <View
                testID="home-mode-row"
                style={[
                  styles.modeGrid,
                  {
                    flexDirection: rowDir,
                    flexWrap: 'nowrap',
                    gap: modeGap,
                    // Tall viewports center via mainFill; keep a small top offset only when top-aligned.
                    marginTop: viewport.mainJustify === 'center' ? 0 : 36,
                  },
                ]}
              >
                {HOME_MODES.map((mode) => (
                  <View
                    key={mode.id}
                    style={[
                      styles.modeTileContainer,
                      viewport.isWide && { aspectRatio: 0.95 },
                    ]}
                  >
                    {(() => {
                      const minimumCost = minimumTokenCostForMode(mode.id);
                      const canPlayMode = needsSignIn || tokens >= minimumCost;
                      const signInLabel = t('home.signInToPlay').toUpperCase();
                      return (
                        <Pressable
                          onPress={() => onSelectMode(mode.id)}
                          disabled={!canPlayMode}
                          accessibilityRole="button"
                          accessibilityLabel={
                            needsSignIn ? `${t(mode.titleKey)}. ${signInLabel}` : t(mode.titleKey)
                          }
                          accessibilityHint={
                            needsSignIn
                              ? signInLabel
                              : `${t(mode.copyKey)} ${getHomeModeTokenCostLabel(mode.id)} ${t('common.tokens')}.`
                          }
                          accessibilityState={{ disabled: !canPlayMode }}
                          testID={`home-mode-card-${mode.id}`}
                          style={({ pressed }) => [
                            styles.modeTile,
                            styles.plasticFace,
                            isDarkTheme && styles.plasticFaceDark,
                            {
                              backgroundColor: surface,
                              borderRadius: 44,
                              opacity: !canPlayMode ? 0.45 : pressed ? 0.94 : 1,
                              transform: pressed ? [{ scale: 0.97 }] : [{ scale: 1 }],
                              ...(viewport.isWide ? { paddingVertical: SPACING.md } : {}),
                            },
                            brandRaisedSurfaceShadow('hero'),
                          ]}
                        >
                          {mode.id === 'rumble' ? (
                            <RumblePeopleIcon
                              size={modeIconSize * 0.74}
                              color={textPrimary}
                              compact={compact}
                              isWeb={isWeb}
                            />
                          ) : (
                            <Ionicons
                              name={mode.icon}
                              size={modeIconSize * 0.74}
                              color={textPrimary}
                              style={{ marginBottom: compact ? 4 : (isWeb ? 8 : 10) }}
                            />
                          )}
                          <Text
                            testID={`home-mode-card-title-${mode.id}`}
                            style={[
                              styles.modeTileLabel,
                              compact && styles.modeTileLabelCompact,
                              { color: textPrimary, fontSize: modeTitleSize },
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
                              {
                                color: textMuted,
                                fontSize: modeCopySize,
                                lineHeight: Math.round(modeCopySize * 1.35),
                              },
                            ]}
                            numberOfLines={2}
                            adjustsFontSizeToFit
                            minimumFontScale={0.82}
                          >
                            {t(mode.copyKey)}
                          </Text>
                          {needsSignIn ? (
                            <View
                              style={[
                                styles.modeTileSignInButton,
                                SOFT_SURFACE_FACE,
                                isDarkTheme && styles.plasticFaceDark,
                                softSurfaceLift(),
                                { backgroundColor: T.colors.accentGlow },
                                isWeb && { marginTop: SPACING.xs },
                              ]}
                            >
                              <Text
                                testID={`home-mode-sign-in-${mode.id}`}
                                style={[
                                  styles.modeTileSignInText,
                                  compact && styles.modeTileSignInTextCompact,
                                  isWeb && { fontSize: 11 },
                                ]}
                              >
                                {signInLabel}
                              </Text>
                            </View>
                          ) : (
                            <View style={[styles.modeTileCostRow, isWeb && { marginTop: SPACING.xs }]}>
                              <Ionicons name="diamond" size={compact ? 9 : (isWeb ? 11 : 11)} color={textPrimary} />
                              <Text
                                testID={`home-mode-token-cost-${mode.id}`}
                                style={[
                                  styles.modeTileCostText,
                                  compact && styles.modeTileCostTextCompact,
                                  { color: textPrimary },
                                  isWeb && { fontSize: 11, lineHeight: 14 },
                                ]}
                                numberOfLines={1}
                              >
                                {`${getHomeModeTokenCostLabel(mode.id)} ${t('common.tokens').toUpperCase()}`}
                              </Text>
                            </View>
                          )}
                        </Pressable>
                      );
                    })()}
                    {SHOW_HOME_MODE_INFO_UI ? (
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
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          </View>
          </View>
        </ScreenContent>
      </SafeAreaView>

      <WebAwareModal visible={!!activeMode} onRequestClose={closeModeInfo}>
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
          {activeMode ? (
            <View
              style={[
                styles.infoModalCard,
                styles.plasticFace,
                isDarkTheme && styles.plasticFaceDark,
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
                  isDarkTheme && styles.plasticFaceDark,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={styles.infoModalCloseText}>{t('common.close').toUpperCase()}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </WebAwareModal>

      <WebAwareModal visible={!!pendingMode} onRequestClose={closeResumeChoice}>
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
              styles.resumeModalCard,
              brandRaisedSurfaceShadow('hero'),
              { backgroundColor: surface },
              isWeb && { maxWidth: 480 },
            ]}
          >
            <Text style={[styles.infoModalTitle, { color: textPrimary, marginBottom: 16 }]}>
              {t('home.resumeModalTitle')}
            </Text>
            <Text style={[styles.infoModalBody, { color: textPrimary, marginBottom: 4 }]}>
              {t('home.resumeModalBody')}
            </Text>

            <View style={styles.resumeButtonsRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('home.continueGame')}
                onPress={continueCurrentGame}
                style={({ pressed }) => [
                  styles.raisedButton,
                  styles.primaryRaisedButton,
                  styles.primaryRaisedButtonDepth,
                  isDarkTheme && styles.plasticFaceDark,
                  { opacity: pressed ? 0.88 : 1, transform: pressed ? [{ scale: 0.97 }] : [{ scale: 1 }] },
                ]}
              >
                <Text style={styles.raisedButtonTextPrimary}>{t('home.continueGame').toUpperCase()}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('home.newGame')}
                onPress={startPendingModeNewGame}
                style={({ pressed }) => [
                  styles.raisedButton,
                  styles.secondaryRaisedButton,
                  styles.secondaryRaisedButtonDepth,
                  isDarkTheme && styles.plasticFaceDark,
                  {
                    backgroundColor: surface,
                    opacity: pressed ? 0.88 : 1,
                    transform: pressed ? [{ scale: 0.97 }] : [{ scale: 1 }],
                  },
                ]}
              >
                <Text style={[styles.raisedButtonText, { color: textPrimary }]}>
                  {t('home.newGame').toUpperCase()}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </WebAwareModal>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  /** Light top lip + soft bottom edge - reads extruded on white squircles. */
  plasticFace: {
    borderTopWidth: 2,
    borderTopColor: 'rgba(255, 255, 255, 0.78)',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  plasticFaceDark: {
    borderTopWidth: 0,
    borderTopColor: 'transparent',
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
  /** Shared content frame - header and cards share one max-width + padding system. */
  contentFrame: {
    flex: 1,
    width: '100%',
    maxWidth: LAYOUT.hubMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: LAYOUT.screenGutter,
  },
  /** Visible top gap while status bar is hidden (safe-area top ≈ 0). */
  contentFrameTopPad: {
    paddingTop: SPACING.xl,
  },
  mainFill: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    justifyContent: 'flex-start',
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 0,
    marginTop: 36,
    width: '100%',
  },
  modeTileContainer: {
    flex: 1,
    aspectRatio: 0.88,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeTile: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    overflow: 'hidden',
    zIndex: 1,
  },
  modeInfoButton: {
    position: 'absolute',
    top: 8,
    end: 8,
    zIndex: 3,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTileLabel: {
    fontFamily: FONTS.uiBold,
    fontSize: 16,
    letterSpacing: 1.2,
    textAlign: 'center',
    textTransform: 'uppercase',
    zIndex: 1,
  },
  modeTileLabelCompact: {
    fontSize: 12,
    letterSpacing: 1,
  },
  modeTileCopy: {
    marginTop: SPACING.xs,
    fontFamily: FONTS.ui,
    fontSize: 11,
    lineHeight: 15,
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
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  modeTileCostTextCompact: {
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.4,
  },
  modeTileSignInButton: {
    marginTop: SPACING.sm,
    minWidth: 88,
    minHeight: 28,
    paddingHorizontal: SPACING.md,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  modeTileSignInText: {
    fontFamily: FONTS.uiBold,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.8,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  modeTileSignInTextCompact: {
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.6,
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
  /**
   * Full-viewport scrim hosted by WebAwareModal (native Modal / web fixed shell).
   * flex + explicit size + absoluteFill - same belt-and-suspenders as PlayMatchMenuModal.
   * absoluteFill alone can leave edges undimmed when the shell sizes via flex only.
   */
  infoModalRoot: {
    flex: 1,
    width: '100%',
    height: '100%',
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.overlay,
    zIndex: 1000,
    elevation: 1000,
  },
  infoModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  infoModalCard: {
    width: '100%',
    maxWidth: 520,
    padding: SPACING.lg,
    borderRadius: 42,
    gap: SPACING.md,
    alignItems: 'center',
    position: 'relative',
    zIndex: 2,
  },
  resumeModalCard: {
    width: '100%',
    maxWidth: 520,
    paddingTop: 30,
    paddingBottom: 24,
    paddingLeft: 24,
    paddingRight: 24,
    borderRadius: 42,
    gap: 0,
    alignItems: 'center',
    position: 'relative',
    zIndex: 2,
    minHeight: 210,
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
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 2,
    borderTopColor: 'rgba(255, 255, 255, 0.78)',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: 'rgba(51, 51, 51, 0.15)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
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
    gap: SPACING.md,
    marginTop: 20,
  },
  raisedButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
    borderWidth: 1.5,
    borderTopWidth: 2,
    borderBottomWidth: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  primaryRaisedButton: {
    backgroundColor: '#FF8A00',
    borderColor: '#C76400',
  },
  primaryRaisedButtonDepth: {
    borderTopColor: 'rgba(255, 214, 163, 0.72)',
    borderBottomColor: '#C76400',
    shadowColor: 'rgba(255, 138, 0, 0.42)',
  },
  secondaryRaisedButton: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(51, 51, 51, 0.12)',
  },
  secondaryRaisedButtonDepth: {
    borderTopColor: 'rgba(255, 255, 255, 0.78)',
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: 'rgba(51, 51, 51, 0.15)',
  },
  raisedButtonText: {
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    letterSpacing: 1.2,
    color: '#333333',
  },
  raisedButtonTextPrimary: {
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    letterSpacing: 1.2,
    color: '#FFFFFF',
  },
  raisedButtonTextAccent: {
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    letterSpacing: 1.2,
    color: '#007BFF',
  },
});
