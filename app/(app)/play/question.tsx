import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Pressable } from '@/components/ui/Pressable';
import { Ionicons } from '@expo/vector-icons';
import { BORDER_RADIUS, SPACING, FONTS } from '@/constants';
import { SHOW_HOT_SEAT_UI } from '@/constants/featureFlags';
import { SOFT_SURFACE_STYLES } from '@/features/play/styles/softSurface';
import {
  RUMBLE_FIRST_TEAM_REVEAL_SECONDS,
  RUMBLE_ROUND_END_SECONDS,
  RUMBLE_SECOND_TEAM_REVEAL_SECONDS,
  RUMBLE_TRANSITION_SECONDS,
} from '@/features/play/rumble';
import { PlayAnswerPanel } from '@/features/play/components/PlayAnswerPanel';
import { PlayMatchTopBar } from '@/features/play/components/PlayMatchTopBar';
import { WagerInfoModal } from '@/features/play/components/WagerInfoModal';
import { useI18n } from '@/lib/i18n/useI18n';
import { usePlayStore } from '@/store/play';

/** Brand colors from docs/BRAND_GUIDELINES.md */
const BRAND = {
  canvas: '#FAF9F6',
  surface: '#FFFFFF',
  charcoal: '#333333',
  amber: '#FFB347',
  shadowStrong: 'rgba(51, 51, 51, 0.15)',
};

/** Deeper solid depth - matches extruded raised plastic pattern. */
function neumorphicLift3D(tier: 'hero' | 'pill'): ViewStyle {
  return SOFT_SURFACE_STYLES.raised;
}

/**
 * Max font size scales with available width; `adjustsFontSizeToFit` shrinks from this down to
 * `minimumFontScale` so the full prompt stays on one line without clipping.
 * Narrow viewports get a higher floor and scale so body-size prompts are easier to read.
 */
function getQuestionPromptSizing(contentWidthPx: number): { maxFont: number; lineHeight: number } {
  const w = Math.max(200, Math.floor(contentWidthPx));
  const scale = w < 480 ? 0.056 : 0.048;
  const floor = w < 480 ? 15 : 13;
  const maxFont = Math.min(34, Math.max(floor, Math.round(w * scale)));
  const lineHeight = Math.ceil(maxFont * 1.28);
  return { maxFont, lineHeight };
}

/**
 * Min body size for question text on web. Long prompts can wrap; without a floor, length-based
 * one-line math drives fonts toward 9px on phone-sized viewports.
 */
function getWebMinQuestionFontSize(viewportShortSide: number): number {
  if (viewportShortSide < 480) return 17;
  if (viewportShortSide < 720) return 16;
  return 13;
}

/**
 * Web: `numberOfLines` + `adjustsFontSizeToFit` maps to overflow:hidden + text-overflow and clips text
 * because RN Web often does not shrink fonts reliably. Prefer a one-line size when it fits; otherwise
 * `minFont` is enforced and the prompt wraps to multiple lines.
 */
function estimateWebSingleLineFontSize(
  text: string,
  maxWidthPx: number,
  maxFont: number,
  minFont: number
): { fontSize: number; lineHeight: number } {
  const w = Math.max(120, Math.floor(maxWidthPx));
  const len = Math.max(1, [...text].length);
  const avgGlyphRatio = 0.56;
  const raw = w / (len * avgGlyphRatio);
  const fontSize = Math.floor(Math.max(minFont, Math.min(maxFont, raw)));
  return {
    fontSize,
    lineHeight: Math.ceil(fontSize * 1.35),
  };
}

/** Scales the compact answer-phase / reveal prompt for the pre-reveal “active play” question only. */
const UNREVEALED_QUESTION_TYPE_SCALE = 1.28;

function scaleUpQuestionEmphasis(phase: { fontSize: number; lineHeight: number }): {
  fontSize: number;
  lineHeight: number;
} {
  return {
    fontSize: Math.min(46, Math.round(phase.fontSize * UNREVEALED_QUESTION_TYPE_SCALE)),
    lineHeight: Math.min(60, Math.round(phase.lineHeight * UNREVEALED_QUESTION_TYPE_SCALE)),
  };
}

/** Visual height of `PlayMatchTopBar` + padding — positions legacy absolute timer below it. */
const MATCH_TOP_BAR_EST_HEIGHT = 64;

const WAGER_FAB_ICON = require('@/assets/wager.png');

export default function PlayQuestionScreen() {
  const router = useRouter();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { getTextStyle, t } = useI18n();
  const session = usePlayStore((state) => state.session);
  const cancelCurrentQuestion = usePlayStore((state) => state.cancelCurrentQuestion);
  const revealAnswer = usePlayStore((state) => state.revealAnswer);
  const resetSession = usePlayStore((state) => state.resetSession);
  const initiateWager = usePlayStore((state) => state.initiateWager);
  const continueAfterStandardQuestion = usePlayStore((state) => state.continueAfterStandardQuestion);
  const [seconds, setSeconds] = useState(0);
  const [wagerInfoOpen, setWagerInfoOpen] = useState(false);

  const leaveMatch = useCallback(() => {
    const performLeave = () => {
      resetSession();
      router.replace('/(app)/');
    };

    if (Platform.OS === 'web' && typeof globalThis.confirm === 'function') {
      const confirmed = globalThis.confirm(
        `${t('play.leaveMatchTitle')}\n\n${t('play.leaveMatchBody')}`
      );
      if (confirmed) {
        performLeave();
      }
      return;
    }

    Alert.alert(t('play.leaveMatchTitle'), t('play.leaveMatchBody'), [
      { text: t('common.stay'), style: 'cancel' },
      {
        text: t('common.leave'),
        style: 'destructive',
        onPress: performLeave,
      },
    ]);
  }, [resetSession, router, t]);

  const openHotSeatInfo = useCallback(() => {
    Alert.alert(t('play.hotSeatInfoTitle'), t('play.hotSeatInfoBody'), [{ text: t('common.close') }]);
  }, [t]);

  const currentTeam = useMemo(() => {
    return session?.teams.find((t) => t.id === session.currentTeamId);
  }, [session?.teams, session?.currentTeamId]);

  const rumbleFirstTeam = useMemo(() => {
    const teamId = session?.currentQuestion?.rumbleFirstTeamId;
    return session?.teams.find((team) => team.id === teamId);
  }, [session?.currentQuestion?.rumbleFirstTeamId, session?.teams]);

  const rumbleSecondTeam = useMemo(() => {
    const teamId = session?.currentQuestion?.rumbleSecondTeamId;
    return session?.teams.find((team) => team.id === teamId);
  }, [session?.currentQuestion?.rumbleSecondTeamId, session?.teams]);

  useEffect(() => {
    if (!session?.timerStartedAt) return;
    const update = () =>
      setSeconds(Math.max(0, Math.floor((Date.now() - session.timerStartedAt!) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [session?.timerStartedAt]);

  useEffect(() => {
    if (!usePlayStore.persist.hasHydrated()) return;
    if (!session?.currentQuestion) {
      router.replace('/play/board');
    }
  }, [router, session?.currentQuestion]);

  /** Center weighted landscape layout — must run before any early return (Rules of Hooks). */
  const isLandscape = windowWidth > windowHeight;
  const contentWidth = isLandscape ? '70%' : '90%';
  /** Pixel width for prompt text — bounds `adjustsFontSizeToFit` (especially on web). */
  const promptLayoutWidth = Math.max(
    200,
    Math.floor(windowWidth * (isLandscape ? 0.7 : 0.9))
  );
  const questionPromptSizing = useMemo(
    () => getQuestionPromptSizing(promptLayoutWidth),
    [promptLayoutWidth]
  );

  /** Tighter horizontal padding on small viewports; scales with short side on answer phase scroll. */
  const answerPhaseScrollPaddingH = useMemo(() => {
    const short = Math.min(windowWidth, windowHeight);
    return Math.max(SPACING.md, Math.min(SPACING.xl, Math.round(short * 0.042)));
  }, [windowWidth, windowHeight]);

  const promptText = session?.currentQuestion?.prompt ?? '';
  const viewportShortSide = Math.min(windowWidth, windowHeight);

  /**
   * Base sizing for the prompt in the answer/reveal flow (and shared caps).
   * The pre-reveal “Show answer” state uses `unrevealedActiveQuestionTypography` (larger).
   */
  const compactQuestionPhaseTypography = useMemo(() => {
    const max = questionPromptSizing.maxFont;
    if (Platform.OS === 'web') {
      const min = getWebMinQuestionFontSize(viewportShortSide);
      return estimateWebSingleLineFontSize(promptText, promptLayoutWidth, max, min);
    }
    return {
      fontSize: max,
      lineHeight: questionPromptSizing.lineHeight,
    };
  }, [promptText, promptLayoutWidth, questionPromptSizing, viewportShortSide]);

  const unrevealedActiveQuestionTypography = useMemo(
    () => scaleUpQuestionEmphasis(compactQuestionPhaseTypography),
    [compactQuestionPhaseTypography]
  );

  /** Same rules as `PlayAnswerPanel` canWager — after points are awarded, offer wager for the next team. */
  const answerPhaseCanWager = useMemo(() => {
    if (!session) return false;
    if (!session.config.wagerEnabled) return false;
    if (session.bonus.active) return false;
    if (session.wager) return false;
    if (session.phase !== 'scoring') return false;
    const used =
      session.teams.find((team) => team.id === session.currentTeamId)?.wagersUsed ?? 0;
    if (used >= session.wagersPerTeam) return false;
    return session.teams.length >= 2;
  }, [session]);

  if (!session?.currentQuestion) {
    return (
      <View style={[styles.canvas, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: BRAND.charcoal }}>{t('common.loading')}</Text>
      </View>
    );
  }

  const q = session.currentQuestion;
  const hotSeatChallenge = SHOW_HOT_SEAT_UI ? session.hotSeat?.activeChallenge : undefined;
  const timeStr = `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  const isRumbleQuestion = session.mode === 'rumble';
  const visibleRumbleTeams =
    seconds >= RUMBLE_SECOND_TEAM_REVEAL_SECONDS
      ? [rumbleFirstTeam, rumbleSecondTeam].filter(Boolean)
      : seconds >= RUMBLE_FIRST_TEAM_REVEAL_SECONDS
        ? [rumbleFirstTeam].filter(Boolean)
        : [];
  const rumbleStatus =
    !isRumbleQuestion
      ? null
      : seconds >= RUMBLE_ROUND_END_SECONDS
        ? t('play.rumbleRoundEnded')
        : seconds < RUMBLE_FIRST_TEAM_REVEAL_SECONDS
        ? t('play.rumbleWaiting')
        : seconds < RUMBLE_TRANSITION_SECONDS
          ? t('play.rumbleFirstWindow', {
              team: rumbleFirstTeam?.name ?? currentTeam?.name ?? 'Team',
            })
          : seconds < RUMBLE_SECOND_TEAM_REVEAL_SECONDS
            ? t('play.rumbleTransitionWindow')
          : t('play.rumbleSecondWindow', {
              team: rumbleSecondTeam?.name ?? 'Next team',
            });
  const canShowAnswer =
    !isRumbleQuestion ||
    seconds >= RUMBLE_SECOND_TEAM_REVEAL_SECONDS;
  const hotSeatNames = hotSeatChallenge?.participants
    .map((participant) => participant.playerName)
    .join(' vs ');
  const isAnswerPhase = session.step === 'answer';
  const showAnswerPhaseNextTurnDock = isAnswerPhase && !session.wager && session.phase === 'scoring';

  /** Single-row pill header (reference QuickFire layout) — not used for rumble / hot seat. */
  const usePillHeader = !isRumbleQuestion && !hotSeatNames;

  const onBackToBoard = () => {
    cancelCurrentQuestion();
    router.replace('/play/board');
  };

  const timerNode = (
    <View style={usePillHeader ? styles.timerRingPill : styles.timerRing}>
      <Text style={[usePillHeader ? styles.timerValuePill : styles.timerValue, { color: BRAND.charcoal }]}>
        {timeStr}
      </Text>
    </View>
  );

  const metaPill = (
    <View
      style={[styles.metaPill, SOFT_SURFACE_STYLES.face, SOFT_SURFACE_STYLES.raised]}
      accessibilityRole="summary"
    >
      <Text
        style={styles.metaPillSegment}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {(currentTeam?.name || 'TEAM').toUpperCase()}
      </Text>
      <View style={styles.metaDivider} />
      <Text
        style={[styles.metaPillSegment, styles.metaPillTopic]}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {`TOPIC: ${q.categoryName}`.toUpperCase()}
      </Text>
      <View style={styles.metaDivider} />
      <Text style={styles.metaPillPoints} numberOfLines={1}>
        {`Points: ${q.pointValue}`}
      </Text>
    </View>
  );

  const promptBlock = (
    <View style={[styles.revealPromptBlock, { width: contentWidth }]}>
      {q.promptImageUrl ? (
        <Image
          testID="question-prompt-image"
          source={{ uri: q.promptImageUrl }}
          style={styles.promptImageReveal}
          contentFit="contain"
        />
      ) : null}
      <Text
        style={[
          styles.questionTextReveal,
          getTextStyle(q.locale, 'display', 'center'),
          {
            color: BRAND.charcoal,
            fontSize: compactQuestionPhaseTypography.fontSize,
            lineHeight: compactQuestionPhaseTypography.lineHeight,
            maxWidth: promptLayoutWidth,
            width: '100%',
            alignSelf: 'center',
          },
          Platform.OS === 'web' ? styles.questionTextWeb : null,
        ]}
        {...(Platform.OS === 'web'
          ? {}
          : {
              numberOfLines: 2,
              adjustsFontSizeToFit: true,
              minimumFontScale: 0.62,
              maxFontSizeMultiplier: 1.2,
            })}
        includeFontPadding={false}
      >
        {q.prompt}
      </Text>
    </View>
  );

  return (
    <View style={styles.canvas}>
      <View
        style={[
          styles.matchTopWrap,
          {
            paddingTop: insets.top,
            paddingLeft: Math.max(insets.left, SPACING.sm),
            paddingRight: Math.max(insets.right, SPACING.sm),
          },
        ]}
      >
        <PlayMatchTopBar
          session={session}
          compact
          onLogoPress={leaveMatch}
          onWagerInfoPress={session.config.wagerEnabled ? () => setWagerInfoOpen(true) : undefined}
          onHotSeatInfoPress={SHOW_HOT_SEAT_UI ? openHotSeatInfo : undefined}
        />
      </View>

      {usePillHeader ? (
        <View
          style={[
            styles.pillChromeRow,
            {
              paddingTop: SPACING.sm,
              paddingLeft: Math.max(insets.left, SPACING.sm),
              paddingRight: Math.max(insets.right, SPACING.sm),
            },
          ]}
        >
          <View style={styles.chromeSide}>
            <Pressable
              onPress={onBackToBoard}
              accessibilityRole="button"
              accessibilityLabel="Back to question board"
              style={({ pressed }) => [
                styles.backButtonInline,
                SOFT_SURFACE_STYLES.face,
                SOFT_SURFACE_STYLES.raised,
                { opacity: pressed ? 0.88 : 1 },
              ]}
            >
              <Ionicons name="chevron-back" size={15} color={BRAND.charcoal} />
              <Text style={styles.backButtonText}>{t('common.back')}</Text>
            </Pressable>
          </View>
          <View style={styles.chromeCenter}>{metaPill}</View>
          <View style={[styles.chromeSide, styles.chromeSideRight]}>{timerNode}</View>
        </View>
      ) : (
        <>
          <View style={[styles.header, { paddingTop: SPACING.sm }]}>
            <Pressable
              onPress={onBackToBoard}
              accessibilityRole="button"
              accessibilityLabel="Back to question board"
              style={({ pressed }) => [
                styles.backButton,
                SOFT_SURFACE_STYLES.face,
                SOFT_SURFACE_STYLES.raised,
                {
                  left: Math.max(insets.left + SPACING.sm, SPACING.xl),
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
            >
              <Ionicons name="chevron-back" size={15} color={BRAND.charcoal} />
              <Text style={styles.backButtonText}>{t('common.back')}</Text>
            </Pressable>
            {isRumbleQuestion ? (
              <View style={styles.rumbleTeamWrap}>
                {visibleRumbleTeams.map((team) => (
                  <Text key={team!.id} style={[styles.teamTag, { color: BRAND.charcoal }]}>
                    {`[${team!.name}]`.toUpperCase()}
                  </Text>
                ))}
                {rumbleStatus ? (
                  <Text style={[styles.rumbleStatus, { color: BRAND.charcoal }]}>
                    {rumbleStatus.toUpperCase()}
                  </Text>
                ) : null}
              </View>
            ) : (
              <Text style={[styles.teamTag, { color: BRAND.charcoal }]}>
                {`[${currentTeam?.name || 'TEAM'}]`.toUpperCase()}
              </Text>
            )}
            {hotSeatNames ? (
              <View style={styles.hotSeatBanner}>
                <Text style={styles.hotSeatTitle}>{t('play.hotSeatActiveTitle').toUpperCase()}</Text>
                <Text style={styles.hotSeatNames}>{hotSeatNames}</Text>
              </View>
            ) : null}
            <Text
              style={[styles.topicText, { color: BRAND.charcoal }]}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {`Topic: ${q.categoryName}`.toUpperCase()}
            </Text>
            <Text style={[styles.pointsText, { color: BRAND.charcoal + '88' }]}>
              {`Points: ${q.pointValue}`}
            </Text>
          </View>
          <View
            style={[
              styles.timerContainer,
              {
                top: insets.top + MATCH_TOP_BAR_EST_HEIGHT + SPACING.xs,
                right: Math.max(insets.right, SPACING.sm),
              },
            ]}
          >
            {timerNode}
          </View>
        </>
      )}

      {isAnswerPhase ? (
        <View style={styles.answerPhaseShell} pointerEvents="box-none">
          <ScrollView
            testID="question-answer-scroll"
            style={styles.answerScroll}
            contentContainerStyle={[
              styles.answerScrollContent,
              {
                paddingBottom: Math.max(
                  insets.bottom,
                  SPACING.lg +
                    (answerPhaseCanWager ? 56 : 0) +
                    (showAnswerPhaseNextTurnDock ? 82 : 0)
                ),
                paddingHorizontal: answerPhaseScrollPaddingH,
              },
            ]}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {promptBlock}
            <PlayAnswerPanel
              embedded
              scrollEmbedded
              suppressPostScoreWagerButton={answerPhaseCanWager}
              suppressPostScoreActions={showAnswerPhaseNextTurnDock}
            />
          </ScrollView>
          {showAnswerPhaseNextTurnDock ? (
            <View
              testID="question-answer-next-turn-dock"
              style={[
                styles.answerNextTurnDock,
                {
                  left: Math.max(insets.left, answerPhaseScrollPaddingH),
                  right: Math.max(insets.right, answerPhaseScrollPaddingH),
                  bottom: Math.max(insets.bottom, SPACING.sm),
                },
              ]}
              pointerEvents="box-none"
            >
              <Pressable
                onPress={() => {
                  continueAfterStandardQuestion();
                  router.replace('/play/board');
                }}
                accessibilityRole="button"
                accessibilityLabel={(session.bonus.active
                  ? t('play.finishMatch')
                  : t('play.nextTurn')
                ).toUpperCase()}
                style={({ pressed }) => [
                  styles.answerNextTurnButton,
                  SOFT_SURFACE_STYLES.face,
                  {
                    opacity: pressed ? 0.94 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                  neumorphicLift3D('pill'),
                ]}
              >
                <Text style={styles.answerNextTurnText} numberOfLines={1} adjustsFontSizeToFit>
                  {(session.bonus.active ? t('play.finishMatch') : t('play.nextTurn')).toUpperCase()}
                </Text>
              </Pressable>
            </View>
          ) : null}
          {answerPhaseCanWager ? (
            <Pressable
              testID="question-answer-wager-fab"
              accessibilityRole="button"
              accessibilityLabel={t('play.wagerNextTeam')}
              onPress={() => {
                const result = initiateWager();
                if (result.ok) {
                  router.replace('/play/board');
                }
              }}
              style={({ pressed }) => [
                styles.answerWagerFab,
                SOFT_SURFACE_STYLES.face,
                {
                  bottom:
                    Math.max(insets.bottom, SPACING.md) +
                    SPACING.xs +
                    (showAnswerPhaseNextTurnDock ? 66 : 0),
                  right: Math.max(insets.right, answerPhaseScrollPaddingH),
                  opacity: pressed ? 0.92 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
                neumorphicLift3D('pill'),
              ]}
            >
              <Image
                source={WAGER_FAB_ICON}
                style={styles.answerWagerFabImage}
                contentFit="contain"
                accessibilityIgnoresInvertColors
              />
              <Text style={styles.answerWagerFabLabel} numberOfLines={1}>
                {t('play.wagerCardTitle').toUpperCase()}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <>
          {/* Main Question Display */}
          <View style={styles.contentArea}>
            <ScrollView
              testID="question-content-scroll"
              style={[styles.questionScroll, { width: contentWidth }]}
              contentContainerStyle={[
                styles.questionScrollContent,
                Platform.OS === 'web' ? styles.questionScrollContentWeb : null,
              ]}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.questionBox}>
                {q.promptImageUrl ? (
                  <Image
                    testID="question-prompt-image"
                    source={{ uri: q.promptImageUrl }}
                    style={styles.promptImage}
                    contentFit="contain"
                  />
                ) : null}
                <Text
                  style={[
                    styles.questionText,
                    getTextStyle(q.locale, 'display', 'center'),
                    {
                      color: BRAND.charcoal,
                      fontSize: unrevealedActiveQuestionTypography.fontSize,
                      lineHeight: unrevealedActiveQuestionTypography.lineHeight,
                      maxWidth: promptLayoutWidth,
                      width: '100%',
                      alignSelf: 'center',
                    },
                    Platform.OS === 'web' ? styles.questionTextWeb : null,
                  ]}
                  {...(Platform.OS === 'web'
                    ? {}
                    : {
                        numberOfLines: 3,
                        adjustsFontSizeToFit: true,
                        minimumFontScale: 0.72,
                        maxFontSizeMultiplier: 1.2,
                      })}
                  includeFontPadding={false}
                >
                  {q.prompt}
                </Text>
              </View>
            </ScrollView>
          </View>

          {/* Action Footer: Show Answer */}
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
            <Pressable
              onPress={() => {
                revealAnswer();
              }}
              disabled={!canShowAnswer}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canShowAnswer }}
              style={({ pressed }) => [
                styles.answerButton,
                SOFT_SURFACE_STYLES.face,
                {
                  backgroundColor: BRAND.surface,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  opacity: !canShowAnswer ? 0.45 : pressed ? 0.95 : 1,
                },
                neumorphicLift3D('pill'),
              ]}
            >
              <Text style={[styles.answerButtonText, { color: BRAND.charcoal }]}>
                {t('play.showAnswer').toUpperCase()}
              </Text>
            </Pressable>
          </View>
        </>
      )}

      <WagerInfoModal visible={wagerInfoOpen} onClose={() => setWagerInfoOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: BRAND.canvas,
    position: 'relative',
  },
  matchTopWrap: {
    width: '100%',
    flexShrink: 0,
    zIndex: 15,
  },
  pillChromeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingBottom: SPACING.xs,
    zIndex: 10,
  },
  chromeSide: {
    width: 88,
    minWidth: 88,
    justifyContent: 'center',
  },
  chromeSideRight: {
    alignItems: 'flex-end',
  },
  chromeCenter: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xs,
  },
  backButtonInline: {
    height: 30,
    borderRadius: 12,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'nowrap',
    maxWidth: '100%',
    paddingVertical: 6,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.pill,
    backgroundColor: BRAND.surface,
    gap: SPACING.xs,
  },
  metaDivider: {
    width: StyleSheet.hairlineWidth * 2,
    minWidth: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(51, 51, 51, 0.18)',
    marginVertical: 2,
  },
  metaPillSegment: {
    fontFamily: FONTS.uiBold,
    fontSize: 10,
    letterSpacing: 0.6,
    color: BRAND.charcoal,
    flexShrink: 1,
  },
  metaPillTopic: {
    flex: 1,
    minWidth: 48,
    textAlign: 'center',
  },
  metaPillPoints: {
    fontFamily: FONTS.ui,
    fontSize: 10,
    color: BRAND.charcoal + 'AA',
    flexShrink: 0,
  },
  timerRingPill: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(51, 51, 51, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  timerValuePill: {
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  answerScroll: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
  answerScrollContent: {
    flexGrow: 0,
    alignItems: 'center',
    paddingTop: SPACING.xs,
  },
  answerPhaseShell: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    position: 'relative',
  },
  answerWagerFab: {
    position: 'absolute',
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 12,
    borderRadius: 14,
    backgroundColor: '#FF8A00',
    maxWidth: '88%',
  },
  answerWagerFabImage: {
    width: 24,
    height: 24,
  },
  answerWagerFabLabel: {
    fontFamily: FONTS.displayBold,
    fontSize: 13,
    letterSpacing: 0.5,
    color: '#FFFFFF',
  },
  answerNextTurnDock: {
    position: 'absolute',
    zIndex: 28,
    alignItems: 'center',
  },
  answerNextTurnButton: {
    minHeight: 54,
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    backgroundColor: BRAND.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  answerNextTurnText: {
    fontFamily: FONTS.uiBold,
    fontSize: 14,
    letterSpacing: 1.2,
    color: BRAND.charcoal,
    textAlign: 'center',
  },
  revealPromptBlock: {
    alignItems: 'center',
    alignSelf: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  promptImageReveal: {
    width: '100%',
    maxHeight: 120,
  },
  questionTextReveal: {
    fontWeight: '500',
    textAlign: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: SPACING.lg,
    gap: 0,
    paddingBottom: SPACING.xs,
    zIndex: 10,
  },
  backButton: {
    position: 'absolute',
    left: SPACING.lg,
    top: '50%',
    marginTop: -15,
    height: 30,
    borderRadius: 12,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
    backgroundColor: '#FFFFFF',
  },
  backButtonText: {
    fontFamily: FONTS.uiBold,
    fontSize: 11,
    color: BRAND.charcoal,
  },
  teamTag: {
    fontFamily: FONTS.uiBold,
    fontSize: 11,
    letterSpacing: 1,
    opacity: 0.8,
  },
  rumbleTeamWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    minHeight: 26,
  },
  rumbleStatus: {
    fontFamily: FONTS.uiBold,
    fontSize: 10,
    letterSpacing: 0.8,
    opacity: 0.7,
    textAlign: 'center',
  },
  hotSeatBanner: {
    marginTop: SPACING.xs,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    ...SOFT_SURFACE_STYLES.face,
    ...SOFT_SURFACE_STYLES.raised,
  },
  hotSeatTitle: {
    fontFamily: FONTS.uiBold,
    fontSize: 10,
    color: BRAND.charcoal,
    letterSpacing: 1,
    opacity: 0.65,
  },
  hotSeatNames: {
    fontFamily: FONTS.displayBold,
    fontSize: 15,
    color: BRAND.charcoal,
    textAlign: 'center',
  },
  topicText: {
    fontFamily: FONTS.display,
    fontSize: 15,
    letterSpacing: 0.35,
    lineHeight: 18,
  },
  pointsText: {
    fontFamily: FONTS.ui,
    fontSize: 12,
    marginTop: 1,
  },
  timerContainer: {
    position: 'absolute',
    width: 64,
    height: 64,
    zIndex: 20,
  },
  timerRing: {
    flex: 1,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: 'rgba(51, 51, 51, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  timerValue: {
    fontFamily: FONTS.uiBold,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  contentArea: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.lg,
  },
  questionScroll: {
    flexGrow: 0,
  },
  questionScrollContent: {
    flexGrow: 1,
    width: '100%',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        justifyContent: 'flex-start' as const,
        paddingTop: SPACING.xs,
      },
      default: {},
    }),
  },
  questionScrollContentWeb: {
    overflow: 'visible',
  },
  questionTextWeb: {
    overflow: 'visible',
    flexShrink: 1,
  },
  questionBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.md,
    width: '100%',
    maxWidth: '100%',
    overflow: 'visible',
  },
  promptImage: {
    width: '100%',
    height: 200,
  },
  questionText: {
    fontWeight: '500',
    textAlign: 'center',
    width: '100%',
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: SPACING.xl,
    zIndex: 10,
  },
  answerButton: {
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 22,
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerButtonText: {
    fontFamily: FONTS.uiBold,
    fontSize: 15,
    letterSpacing: 1.2,
  },
});
