import { useMemo } from 'react';
import {
  Alert,
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  Platform,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from '@/components/ui/Pressable';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Button } from '@/components/ui/Button';
import { FONTS, BORDER_RADIUS, FONT_SIZES, SPACING, COLORS, TYPE_SCALE } from '@/constants';
import { PlayScaffold } from '@/features/play/components/PlayScaffold';
import { SOFT_SURFACE_FACE, softSurfaceLift } from '@/features/play/styles/softSurface';
import { getRowDirection } from '@/lib/i18n/direction';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';
import { usePlayStore } from '@/store/play';
import { HOME_SOFT_UI } from '@/themes';
import type { GameSessionState, TeamState } from '@/features/shared';

const T = HOME_SOFT_UI.colors;
/** docs/BRAND_GUIDELINES.md — charcoal primary text */
const BRAND_CHARCOAL = '#333333';
const BRAND_BORDER = 'rgba(51, 51, 51, 0.12)';
const BRAND_SUBTLE_TEXT = 'rgba(51, 51, 51, 0.72)';
/** Slight fill so rail cells read as tiles on cream canvas. */
const RAIL_IDLE = 'rgba(255, 255, 255, 0.65)';
const NEITHER_DASH = 'rgba(51, 51, 51, 0.22)';

/** Deeper drop shadow — reads as a raised plastic tile (tier scales with control size). */
function neumorphicLift(
  shadowColor: string,
  tier: 'hero' | 'header' | 'pill' | 'card'
): ViewStyle {
  return {
    ...softSurfaceLift(),
    shadowColor,
  };
}

/** Light top lip + soft bottom edge — reads extruded on white squircles. */
const PLASTIC_FACE: ViewStyle = {
  ...SOFT_SURFACE_FACE,
};

function getAnswerLayoutDensity(screenWidth: number, screenHeight: number) {
  const shortSide = Math.min(screenWidth, screenHeight);
  if (shortSide < 340) {
    return {
      borderWidth: 1,
      answerFontSize: FONT_SIZES.sm,
      answerLineHeight: 18,
      sectionTitleSize: FONT_SIZES.xs,
      railPadV: SPACING.xs,
      segmentTitleSize: 11,
      segmentMetaSize: 10,
      sheetGap: SPACING.sm,
      answerCardPadV: SPACING.sm,
      answerCardPadH: SPACING.sm,
    };
  }
  if (screenHeight < 400) {
    return {
      borderWidth: 1,
      answerFontSize: FONT_SIZES.md,
      answerLineHeight: 22,
      sectionTitleSize: FONT_SIZES.sm,
      railPadV: SPACING.sm,
      segmentTitleSize: FONT_SIZES.xs,
      segmentMetaSize: 10,
      sheetGap: SPACING.md,
      answerCardPadV: SPACING.md,
      answerCardPadH: SPACING.md,
    };
  }
  if (screenHeight < 520) {
    return {
      borderWidth: 1,
      answerFontSize: FONT_SIZES.lg,
      answerLineHeight: 26,
      sectionTitleSize: FONT_SIZES.md,
      railPadV: SPACING.md,
      segmentTitleSize: FONT_SIZES.sm,
      segmentMetaSize: FONT_SIZES.xs,
      sheetGap: SPACING.lg,
      answerCardPadV: SPACING.lg,
      answerCardPadH: SPACING.lg,
    };
  }
  return {
    borderWidth: 2,
    answerFontSize: FONT_SIZES.xl,
    answerLineHeight: 30,
    sectionTitleSize: FONT_SIZES.md,
    railPadV: SPACING.md,
    segmentTitleSize: FONT_SIZES.sm,
    segmentMetaSize: FONT_SIZES.xs,
    sheetGap: SPACING.lg,
    answerCardPadV: SPACING.lg,
    answerCardPadH: SPACING.lg,
  };
}

function getAwardTargetTeams(session: GameSessionState): TeamState[] {
  if (session.mode !== 'rumble' || !session.currentQuestion) {
    return session.teams;
  }

  const assignedTeamIds = [
    session.currentQuestion.rumbleFirstTeamId,
    session.currentQuestion.rumbleSecondTeamId,
  ];

  return assignedTeamIds
    .map((teamId) => session.teams.find((team) => team.id === teamId))
    .filter((team): team is TeamState => Boolean(team));
}

type AnswerDensity = ReturnType<typeof getAnswerLayoutDensity> & {
  awardStackMinH: number;
  awardStackPadV: number;
  answerEyebrowMarginBottom: number;
};

function mergeAnswerDensity(
  base: ReturnType<typeof getAnswerLayoutDensity>,
  opts: {
    windowHeight: number;
    insetTop: number;
    insetBottom: number;
    stackedAwards: boolean;
    awardSegments: number;
    showPointsSection: boolean;
    showPostScoreRow: boolean;
    wagerFooter: boolean;
    bonusSubtitle: boolean;
  }
): AnswerDensity {
  const chromeEst = 128 + (opts.bonusSubtitle ? 22 : 0);
  const footerReserve = opts.wagerFooter ? 68 : 0;
  const avail =
    opts.windowHeight - opts.insetTop - opts.insetBottom - chromeEst - footerReserve;

  const minAnswer = 52;
  const minSection = 18;
  const minBtnRow = 46;
  const perStackRow = 40;
  const railBlock = 48;
  const pageGaps = base.sheetGap * 4;
  let need =
    pageGaps +
    minAnswer +
    (opts.showPointsSection
      ? minSection +
        (opts.stackedAwards ? opts.awardSegments * perStackRow + (opts.awardSegments - 1) * 4 : railBlock) +
        (opts.showPostScoreRow ? minBtnRow : 0)
      : 0);

  const defaultStack: Pick<
    AnswerDensity,
    'awardStackMinH' | 'awardStackPadV' | 'answerEyebrowMarginBottom'
  > = {
    awardStackMinH: 48,
    awardStackPadV: SPACING.sm,
    answerEyebrowMarginBottom: SPACING.sm,
  };

  if (avail < need + 24) {
    return {
      ...base,
      borderWidth: 1,
      sheetGap: SPACING.xs,
      answerCardPadV: SPACING.xs,
      answerCardPadH: SPACING.sm,
      answerFontSize: Math.min(base.answerFontSize, FONT_SIZES.sm),
      answerLineHeight: Math.min(base.answerLineHeight, 18),
      sectionTitleSize: FONT_SIZES.xs,
      railPadV: SPACING.xs,
      segmentTitleSize: Math.min(base.segmentTitleSize, 11),
      segmentMetaSize: Math.min(base.segmentMetaSize, 10),
      awardStackMinH: 34,
      awardStackPadV: SPACING.xs,
      answerEyebrowMarginBottom: SPACING.xs,
    };
  }
  if (avail < need + 56) {
    return {
      ...base,
      sheetGap: Math.min(base.sheetGap, SPACING.sm),
      answerCardPadV: Math.min(base.answerCardPadV, SPACING.sm),
      awardStackMinH: 40,
      awardStackPadV: SPACING.xs,
      answerEyebrowMarginBottom: SPACING.xs,
    };
  }
  return { ...base, ...defaultStack };
}

/**
 * Tapers type, padding, and tile size from 1.0 on compact viewports down toward ~0.7
 * on large or very wide screens so the answer + scoring block stays a readable size.
 */
function getAnswerViewportScale(width: number, height: number): number {
  const short = Math.min(width, height);
  if (short < 1) return 1;
  const fromShort = Math.min(1, 420 / short);
  const long = Math.max(width, height);
  const wideDampen = long / short > 2.35 ? 0.9 : 1;
  return Math.max(0.7, fromShort * wideDampen);
}

function roundPx(n: number) {
  return Math.max(1, Math.round(n));
}

function scaleAnswerDensity(d: AnswerDensity, scale: number): AnswerDensity {
  const r = (n: number) => roundPx(n * scale);
  const rFont = (n: number, min = 8) => Math.max(min, Math.round(n * scale));
  return {
    ...d,
    borderWidth: Math.max(1, Math.min(2, r(d.borderWidth))),
    answerFontSize: rFont(d.answerFontSize, 10),
    answerLineHeight: rFont(d.answerLineHeight, 14),
    sectionTitleSize: rFont(d.sectionTitleSize),
    railPadV: r(d.railPadV),
    segmentTitleSize: rFont(d.segmentTitleSize, 9),
    segmentMetaSize: rFont(d.segmentMetaSize, 8),
    sheetGap: r(d.sheetGap),
    answerCardPadV: r(d.answerCardPadV),
    answerCardPadH: r(d.answerCardPadH),
    awardStackMinH: Math.max(30, r(d.awardStackMinH)),
    awardStackPadV: r(d.awardStackPadV),
    answerEyebrowMarginBottom: r(d.answerEyebrowMarginBottom),
  };
}

/**
 * Constrain embedded answer column so cards are not edge-to-edge on very wide viewports;
 * `shortSide` is the main driver, `width` the hard ceiling.
 */
function getAnswerContentMaxWidth(
  width: number,
  height: number,
  viewportScale: number
): number {
  const short = Math.min(width, height);
  const fromShort = short * 0.82 + 40;
  const fromWidth = width - 32;
  return Math.max(280, Math.min(500, fromShort, fromWidth) * (0.88 + 0.12 * viewportScale));
}

function shouldStackAwardLayout(
  screenWidth: number,
  teamCount: number,
  viewportScale: number = 1
): boolean {
  const segments = teamCount + 1;
  const segW = 44 * Math.max(0.78, Math.min(1, viewportScale));
  const minForRail = segments * segW + Math.max(0, segments - 1) * 2;
  return screenWidth < minForRail + 24;
}

export function PlayAnswerPanel({
  embedded = false,
  scrollEmbedded = false,
  suppressPostScoreWagerButton = false,
  suppressPostScoreActions = false,
}: {
  embedded?: boolean;
  /** Use inside a parent ScrollView: no nested flex-fill so the column sizes naturally. */
  scrollEmbedded?: boolean;
  /** When the parent (e.g. question route) shows a floating wager CTA, hide the inline orange button. */
  suppressPostScoreWagerButton?: boolean;
  /** When the parent owns a sticky post-score CTA, hide the inline post-score row. */
  suppressPostScoreActions?: boolean;
}) {
  const router = useRouter();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const { direction, getTextStyle, t } = useI18n();
  const session = usePlayStore((state) => state.session);
  const resetSession = usePlayStore((state) => state.resetSession);
  const awardStandardQuestion = usePlayStore((state) => state.awardStandardQuestion);
  const continueAfterStandardQuestion = usePlayStore((state) => state.continueAfterStandardQuestion);
  const initiateWager = usePlayStore((state) => state.initiateWager);
  const resolveWager = usePlayStore((state) => state.resolveWager);
  const awardTargetTeams = useMemo(
    () => (session ? getAwardTargetTeams(session) : []),
    [session]
  );

  const scrollChain = embedded && scrollEmbedded;

  const answerViewportScale = useMemo(
    () => getAnswerViewportScale(windowWidth, windowHeight),
    [windowWidth, windowHeight]
  );

  const answerContentMaxWidth = useMemo(
    () => getAnswerContentMaxWidth(windowWidth, windowHeight, answerViewportScale),
    [windowWidth, windowHeight, answerViewportScale]
  );

  /** Tighter padding + type on the question (embedded) combined answer + scoring card. */
  const combinedCardLayoutScale = scrollChain ? 0.82 : 1;
  /** Additional shrink for the white “correct answer” card only (padding + headline + solution type). */
  const answerCardOnlyScale = scrollChain ? 0.85 : 1;

  const awardRowGap = useMemo(
    () => Math.max(SPACING.xs, Math.round(SPACING.md * (0.85 * answerViewportScale + 0.15))),
    [answerViewportScale]
  );

  const awardRowGapTight = useMemo(
    () => Math.max(SPACING.xs, Math.round(awardRowGap * combinedCardLayoutScale)),
    [awardRowGap, combinedCardLayoutScale]
  );

  const answerImageHeight = useMemo(
    () => Math.max(100, Math.round(160 * (0.85 * answerViewportScale + 0.15))),
    [answerViewportScale]
  );

  const cardRadiusScaled = useMemo(
    () => Math.max(18, Math.round(BORDER_RADIUS.lg * (0.72 + 0.28 * answerViewportScale))),
    [answerViewportScale]
  );

  const awardTileRadius = useMemo(
    () => Math.max(10, Math.round(14 * (0.85 * answerViewportScale + 0.15))),
    [answerViewportScale]
  );

  const layoutDensity: AnswerDensity = useMemo(() => {
    const base = getAnswerLayoutDensity(windowWidth, windowHeight);
    if (!session?.currentQuestion) {
      return scaleAnswerDensity(
        mergeAnswerDensity(base, {
          windowHeight,
          insetTop: insets.top,
          insetBottom: insets.bottom,
          stackedAwards: false,
          awardSegments: 3,
          showPointsSection: false,
          showPostScoreRow: false,
          wagerFooter: false,
          bonusSubtitle: false,
        }),
        answerViewportScale
      );
    }
    const wagerActive = !!session.wager;
    const postScore = !wagerActive && session.phase === 'scoring';
    const awardTeamCount = getAwardTargetTeams(session).length;
    const stacked = shouldStackAwardLayout(windowWidth, awardTeamCount, answerViewportScale);
    const bonusSubtitle = session.bonus.active && windowHeight >= 360;
    return scaleAnswerDensity(
      mergeAnswerDensity(base, {
        windowHeight,
        insetTop: insets.top,
        insetBottom: insets.bottom,
        stackedAwards: stacked,
        awardSegments: awardTeamCount + 1,
        showPointsSection: !wagerActive,
        showPostScoreRow: postScore,
        wagerFooter: wagerActive,
        bonusSubtitle,
      }),
      answerViewportScale
    );
  }, [windowWidth, windowHeight, insets.top, insets.bottom, session, answerViewportScale]);

  const rowDir = getRowDirection(direction);
  const chromeGap =
    Math.min(windowWidth, windowHeight) < 420 ? SPACING.sm : SPACING.lg;
  /** One rhythm for gaps between answer card, headings, awards, and action rows (matches question `chromeGap` × density). */
  const sectionGap = Math.min(Math.round(chromeGap * (0.75 + 0.25 * answerViewportScale)), layoutDensity.sheetGap);
  const pageColumnGap = sectionGap;

  const confirmLeaveMatch = () => {
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
  };

  if (!session?.currentQuestion) {
    if (embedded) {
      return null;
    }
    return (
      <PlayScaffold title={t('common.loading')}>
        <Text>{t('common.loading')}</Text>
      </PlayScaffold>
    );
  }

  const currentQuestion = session.currentQuestion;
  const wager = session.wager;
  const showPostScoreActions = !wager && session.phase === 'scoring';
  const canWager =
    session.config.wagerEnabled &&
    !session.bonus.active &&
    !wager &&
    session.phase === 'scoring' &&
    (session.teams.find((team) => team.id === session.currentTeamId)?.wagersUsed ?? 0) < session.wagersPerTeam;

  const pointsThisQuestion =
    currentQuestion.pointValue * (session.bonus.active ? session.bonus.multiplier : 1);

  const stackedAwards = shouldStackAwardLayout(windowWidth, awardTargetTeams.length, answerViewportScale);
  const hideSubtitle = windowHeight < 360;
  const awardChoiceCommitted =
    session.phase === 'scoring' && session.lastAwardedTeamId !== undefined;

  const teamAwardSurface = (teamId: string, variant: 'stack' | 'rail' | 'tile'): string => {
    const idle = variant === 'rail' ? RAIL_IDLE : T.surface;
    if (awardChoiceCommitted) {
      return session.lastAwardedTeamId === teamId
        ? `${colors.primary}1F`
        : idle;
    }
    if (session.phase === 'answerLock' && teamId === session.currentTeamId) {
      return `${colors.primary}12`;
    }
    return idle;
  };

  const neitherAwardSurface = (variant: 'stack' | 'rail' | 'tile'): string => {
    const idle = variant === 'rail' ? RAIL_IDLE : T.surface;
    if (awardChoiceCommitted && session.lastAwardedTeamId === null) {
      return `${colors.primary}1A`;
    }
    return idle;
  };

  const footer = wager ? (
    <View style={[styles.footerRow, { flexDirection: rowDir, gap: sectionGap }]}>
      <View style={styles.footerBtn}>
        <Button
          title={`CORRECT FOR ${session.teams.find((team) => team.id === wager.targetTeamId)?.name ?? 'Target Team'}`.toUpperCase()}
          onPress={() => {
            resolveWager(true);
            router.replace('/play/board');
          }}
          style={styles.softUiBtn}
          textStyle={[styles.softUiBtnText, getTextStyle(undefined, 'bodySemibold', 'center')]}
        />
      </View>
      <View style={styles.footerBtn}>
        <Button
          title="INCORRECT"
          onPress={() => {
            resolveWager(false);
            router.replace('/play/board');
          }}
          style={[styles.softUiBtn, { backgroundColor: '#FEE2E2' }]}
          textStyle={[styles.softUiBtnText, { color: '#DC2626' }, getTextStyle(undefined, 'bodySemibold', 'center')]}
        />
      </View>
    </View>
  ) : undefined;

  const postScoreActions = showPostScoreActions ? (
    <View style={[styles.postScoreActionRow, { flexDirection: rowDir, gap: sectionGap }]}>
      <View style={styles.postScorePrimaryBtn}>
        <Button
          title={(session.bonus.active ? t('play.finishMatch') : t('play.nextTurn')).toUpperCase()}
          onPress={() => {
            continueAfterStandardQuestion();
            router.replace('/play/board');
          }}
          style={styles.softUiBtn}
          textStyle={[styles.softUiBtnText, getTextStyle(undefined, 'bodySemibold', 'center')]}
        />
      </View>
      {canWager && !suppressPostScoreWagerButton ? (
        <View style={styles.postScoreWagerBtn}>
          <Button
            title={t('play.wagerNextTeam').toUpperCase()}
            onPress={() => {
              const result = initiateWager();
              if (result.ok) {
                router.replace('/play/board');
              }
            }}
            style={[styles.softUiBtn, { backgroundColor: '#FF8A00' }]}
            textStyle={[styles.softUiBtnText, { color: '#FFFFFF' }, getTextStyle(undefined, 'bodySemibold', 'center')]}
          />
        </View>
      ) : null}
    </View>
  ) : null;

  const renderAwardTargets = () => {
    if (stackedAwards) {
      return (
        <View style={[styles.awardStack, { gap: awardRowGapTight }]}>
          {awardTargetTeams.map((team) => (
              <Pressable
                key={team.id}
                style={({ pressed }) => [
                  styles.awardTile,
                  {
                    borderRadius: Math.max(8, Math.round(awardTileRadius * combinedCardLayoutScale)),
                    backgroundColor: teamAwardSurface(team.id, 'tile'),
                    minHeight: Math.max(28, Math.round(layoutDensity.awardStackMinH * combinedCardLayoutScale)),
                    paddingVertical: Math.max(4, Math.round(layoutDensity.awardStackPadV * combinedCardLayoutScale)),
                    paddingHorizontal: Math.max(6, Math.round(SPACING.sm * combinedCardLayoutScale)),
                    alignSelf: 'stretch',
                    opacity: pressed ? 0.92 : 1,
                  },
                ]}
                onPress={() => awardStandardQuestion(team.id)}
                accessibilityRole="button"
                accessibilityLabel={`${team.name}, +${pointsThisQuestion}`}
                accessibilityState={{ selected: awardChoiceCommitted && session.lastAwardedTeamId === team.id }}
              >
                <Text
                  style={[
                    styles.segmentTitle,
                    { color: T.textPrimary, fontSize: layoutDensity.segmentTitleSize },
                    getTextStyle(undefined, 'bodyBold', 'center'),
                  ]}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  {team.name}
                </Text>
                <Text
                  style={[
                    styles.segmentMeta,
                    { color: BRAND_SUBTLE_TEXT, fontSize: layoutDensity.segmentMetaSize },
                    getTextStyle(undefined, 'body', 'center'),
                  ]}
                  numberOfLines={1}
                >
                  +{pointsThisQuestion} pts
                </Text>
              </Pressable>
          ))}
          <Pressable
            style={({ pressed }) => [
              styles.awardNeitherTileBase,
              {
                borderRadius: Math.max(8, Math.round(awardTileRadius * combinedCardLayoutScale)),
                backgroundColor: neitherAwardSurface('tile'),
                minHeight: Math.max(28, Math.round(layoutDensity.awardStackMinH * combinedCardLayoutScale)),
                paddingVertical: Math.max(4, Math.round(layoutDensity.awardStackPadV * combinedCardLayoutScale)),
                paddingHorizontal: Math.max(6, Math.round(SPACING.sm * combinedCardLayoutScale)),
                alignSelf: 'stretch',
                opacity: pressed ? 0.92 : 1,
              },
            ]}
            onPress={() => awardStandardQuestion(null)}
            accessibilityRole="button"
            accessibilityLabel={t('play.neitherTeam')}
            accessibilityState={{ selected: awardChoiceCommitted && session.lastAwardedTeamId === null }}
          >
            <Text
              style={[
                styles.segmentTitle,
                { color: T.textPrimary, fontSize: layoutDensity.segmentTitleSize },
                getTextStyle(undefined, 'bodyBold', 'center'),
              ]}
              numberOfLines={1}
            >
              {t('play.neitherTeam')}
            </Text>
            <Text
              style={[
                styles.segmentMeta,
                { color: BRAND_SUBTLE_TEXT, fontSize: layoutDensity.segmentMetaSize },
                getTextStyle(undefined, 'body', 'center'),
              ]}
              numberOfLines={2}
            >
              {t('play.noPointsAwarded')}
            </Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={[styles.awardRow, { flexDirection: rowDir, gap: awardRowGapTight }]}>
        {awardTargetTeams.map((team) => (
          <Pressable
            key={team.id}
            style={({ pressed }) => [
              styles.awardTile,
              {
                borderRadius: Math.max(8, Math.round(awardTileRadius * combinedCardLayoutScale)),
                minHeight: Math.max(28, Math.round(layoutDensity.awardStackMinH * combinedCardLayoutScale)),
                paddingVertical: Math.max(4, Math.round(layoutDensity.railPadV * combinedCardLayoutScale)),
                paddingHorizontal: Math.max(4, Math.round(SPACING.xs * combinedCardLayoutScale)),
                backgroundColor: teamAwardSurface(team.id, 'tile'),
                opacity: pressed ? 0.92 : 1,
              },
            ]}
            onPress={() => awardStandardQuestion(team.id)}
            accessibilityRole="button"
            accessibilityLabel={`${team.name}, +${pointsThisQuestion}`}
            accessibilityState={{ selected: awardChoiceCommitted && session.lastAwardedTeamId === team.id }}
          >
            <Text
              style={[
                styles.segmentTitle,
                { color: T.textPrimary, fontSize: layoutDensity.segmentTitleSize },
                getTextStyle(undefined, 'bodyBold', 'center'),
              ]}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {team.name}
            </Text>
            <Text
              style={[
                styles.segmentMeta,
                { color: BRAND_SUBTLE_TEXT, fontSize: layoutDensity.segmentMetaSize },
                getTextStyle(undefined, 'body', 'center'),
              ]}
              numberOfLines={1}
            >
              +{pointsThisQuestion} pts
            </Text>
          </Pressable>
        ))}
        <Pressable
          style={({ pressed }) => [
            styles.awardNeitherTileBase,
            {
              borderRadius: Math.max(8, Math.round(awardTileRadius * combinedCardLayoutScale)),
              minHeight: Math.max(28, Math.round(layoutDensity.awardStackMinH * combinedCardLayoutScale)),
              paddingVertical: Math.max(4, Math.round(layoutDensity.railPadV * combinedCardLayoutScale)),
              paddingHorizontal: Math.max(4, Math.round(SPACING.xs * combinedCardLayoutScale)),
              backgroundColor: neitherAwardSurface('tile'),
              opacity: pressed ? 0.92 : 1,
            },
          ]}
          onPress={() => awardStandardQuestion(null)}
          accessibilityRole="button"
          accessibilityLabel={t('play.neitherTeam')}
          accessibilityState={{ selected: awardChoiceCommitted && session.lastAwardedTeamId === null }}
        >
          <Text
            style={[
              styles.segmentTitle,
              { color: T.textPrimary, fontSize: layoutDensity.segmentTitleSize },
              getTextStyle(undefined, 'bodyBold', 'center'),
            ]}
            numberOfLines={1}
          >
            {t('play.neitherTeam')}
          </Text>
          <Text
            style={[
              styles.segmentMeta,
              { color: BRAND_SUBTLE_TEXT, fontSize: layoutDensity.segmentMetaSize },
              getTextStyle(undefined, 'body', 'center'),
            ]}
            numberOfLines={2}
          >
            {t('play.noPointsAwarded')}
          </Text>
        </Pressable>
      </View>
    );
  };

  const answerTextBlockWager = (
    <>
      {currentQuestion.answerImageUrl ? (
        <Image
          source={{ uri: currentQuestion.answerImageUrl }}
          style={[styles.answerImage, { height: answerImageHeight }]}
          contentFit="contain"
        />
      ) : null}
      <View style={styles.answerHeaderBadge}>
        <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
        <Text
          style={[
            styles.correctAnswerKicker,
            { fontSize: Math.max(11, layoutDensity.segmentTitleSize) },
            getTextStyle(undefined, 'bodyBold', 'center'),
          ]}
          accessibilityRole="header"
        >
          {t('play.correctAnswer').toUpperCase()}
        </Text>
      </View>
      <Text
        style={[
          styles.answerText,
          {
            color: T.textPrimary,
            fontSize: Math.max(28, layoutDensity.answerFontSize * 1.25),
            lineHeight: Math.max(34, layoutDensity.answerLineHeight * 1.25),
            marginTop: layoutDensity.answerEyebrowMarginBottom,
          },
          getTextStyle(undefined, 'displayBold', 'center'),
        ]}
        maxFontSizeMultiplier={1.25}
        numberOfLines={6}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
      >
        {currentQuestion.answer}
      </Text>
    </>
  );

  /** Centered “correct answer + solution” (reference: single white panel, no green chrome). */
  const answerTextBlockCombined = (
    <>
      {currentQuestion.answerImageUrl ? (
        <Image
          source={{ uri: currentQuestion.answerImageUrl }}
          style={[
            styles.answerImage,
            {
              height: Math.max(72, Math.round(answerImageHeight * answerCardOnlyScale)),
              marginBottom: Math.max(
                SPACING.xs,
                Math.round(SPACING.md * combinedCardLayoutScale * answerCardOnlyScale)
              ),
            },
          ]}
          contentFit="contain"
        />
      ) : null}
      <Text
        style={[
          styles.referenceAnswerLabel,
          combinedCardLayoutScale < 1
            ? {
                fontSize: Math.max(8, Math.round(12 * combinedCardLayoutScale * answerCardOnlyScale)),
                lineHeight: Math.max(11, Math.round(16 * combinedCardLayoutScale * answerCardOnlyScale)),
              }
            : null,
        ]}
        accessibilityRole="header"
      >
        {t('play.correctAnswer').toUpperCase()}
      </Text>
      <Text
        style={[
          styles.referenceAnswerMain,
          {
            fontSize: Math.max(
              17,
              Math.round(
                layoutDensity.answerFontSize * (scrollChain ? 0.95 : 1.2) * answerCardOnlyScale
              )
            ),
            lineHeight: Math.max(
              22,
              Math.round(
                layoutDensity.answerLineHeight * (scrollChain ? 0.95 : 1.2) * answerCardOnlyScale
              )
            ),
            marginTop: Math.max(
              SPACING.xs,
              Math.round(SPACING.md * combinedCardLayoutScale * answerCardOnlyScale)
            ),
          },
          getTextStyle(undefined, 'displayBold', 'center'),
        ]}
        maxFontSizeMultiplier={1.25}
        numberOfLines={4}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
      >
        {currentQuestion.answer}
      </Text>
    </>
  );

  const answerBody = (
    <View style={[styles.bleed, scrollChain && styles.bleedScroll]}>
      <View
        style={[
          styles.shell,
          embedded ? styles.shellEmbedded : null,
          scrollChain && styles.shellScroll,
          {
            paddingLeft: Math.max(SPACING.md, insets.left),
            paddingRight: Math.max(SPACING.md, insets.right),
          },
        ]}
      >
        <View
          style={[
            styles.fitBody,
            scrollChain && styles.fitBodyScroll,
            { paddingBottom: Math.max(insets.bottom, SPACING.xs) },
          ]}
        >
          <View
            style={[
              styles.pageColumn,
              scrollChain && styles.pageColumnScroll,
              scrollChain
                ? {
                    gap: pageColumnGap,
                    maxWidth: answerContentMaxWidth,
                    width: '100%' as const,
                    alignSelf: 'center' as const,
                  }
                : { gap: pageColumnGap },
            ]}
          >
            <View
              style={[
                wager ? styles.answerBlockWager : styles.answerBlockMain,
                scrollChain && (wager ? styles.answerBlockWagerScroll : styles.answerBlockMainScroll),
                !scrollChain && styles.answerBlockGap,
              ]}
            >
              {/* Question route already renders pill chrome + prompt above this panel (`scrollEmbedded`). */}
              {!scrollChain ? (
                <>
                  <View style={[styles.questionMetaPill, { flexDirection: rowDir }]}>
                    <Text style={styles.questionMetaText}>
                      {session.teams.find((t) => t.id === session.currentTeamId)?.name.toUpperCase() ?? 'TEAM 1'}
                    </Text>
                    <View style={styles.questionMetaDivider} />
                    <Text style={styles.questionMetaText}>
                      TOPIC: {currentQuestion.categoryName.toUpperCase()}
                    </Text>
                    <View style={styles.questionMetaDivider} />
                    <Text style={styles.questionMetaText}>
                      Points: {currentQuestion.pointValue}
                    </Text>
                  </View>

                  <Text style={styles.questionPromptText}>{currentQuestion.prompt}</Text>
                </>
              ) : null}

              {wager ? (
                <View
                  style={[
                    styles.answerRevealCard,
                    {
                      borderColor: BRAND_BORDER,
                      borderWidth: layoutDensity.borderWidth,
                      backgroundColor: T.surface,
                      shadowColor: colors.primary,
                      paddingVertical: layoutDensity.answerCardPadV * 1.5,
                      paddingHorizontal: layoutDensity.answerCardPadH,
                    },
                    !scrollChain
                      ? { flex: 1, minHeight: 0, justifyContent: 'center' as const }
                      : null,
                  ]}
                >
                  <View style={[styles.answerAccentStrip, { backgroundColor: COLORS.success }]} />
                  {answerTextBlockWager}
                </View>
              ) : (
                <View style={[styles.answerCardAndScoringColumn, { gap: sectionGap }]}>
                  <View
                    style={[
                      styles.combinedAnswerScoringCard,
                      {
                        borderRadius: Math.max(
                          14,
                          Math.round(cardRadiusScaled * combinedCardLayoutScale * answerCardOnlyScale)
                        ),
                      },
                      !scrollChain
                        ? { flex: 1, minHeight: 0, justifyContent: 'center' as const }
                        : null,
                    ]}
                  >
                    <View
                      style={[
                        styles.answerCardTop,
                        {
                          paddingVertical: Math.max(
                            6,
                            Math.round(
                              Math.max(SPACING.md, layoutDensity.answerCardPadV * 1.1) *
                                combinedCardLayoutScale *
                                answerCardOnlyScale
                            )
                          ),
                          paddingHorizontal: Math.max(
                            6,
                            Math.round(
                              layoutDensity.answerCardPadH * combinedCardLayoutScale * answerCardOnlyScale
                            )
                          ),
                        },
                      ]}
                    >
                      {answerTextBlockCombined}
                    </View>
                  </View>
                  <View
                    style={[
                      styles.scoringSectionPlain,
                      {
                        paddingHorizontal: Math.max(
                          8,
                          Math.round(layoutDensity.answerCardPadH * combinedCardLayoutScale)
                        ),
                        paddingBottom: Math.max(
                          SPACING.xs,
                          Math.round(
                            SPACING.lg * (0.75 + 0.25 * answerViewportScale) * combinedCardLayoutScale
                          )
                        ),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.whoGetsPointsHeading,
                        {
                          fontSize: Math.max(
                            FONT_SIZES.xs,
                            Math.round(
                              Math.max(FONT_SIZES.sm, layoutDensity.sectionTitleSize - 1) *
                                (scrollChain ? 0.9 : 1)
                            )
                          ),
                          marginBottom: Math.max(
                            SPACING.xs,
                            Math.round(SPACING.lg * combinedCardLayoutScale)
                          ),
                        },
                        getTextStyle(undefined, 'bodyBold', 'center'),
                      ]}
                      numberOfLines={2}
                      accessibilityRole="header"
                    >
                      {session.phase === 'scoring' ? t('play.pointsAwarded') : t('play.whoGetsPoints')}
                    </Text>
                    <View style={styles.scoringPanelAwardRegion}>{renderAwardTargets()}</View>
                  </View>
                </View>
              )}

              {!wager && postScoreActions && !suppressPostScoreActions ? (
                <View style={styles.postScoreRegion}>{postScoreActions}</View>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  if (embedded) {
    return (
      <View style={[styles.embeddedRoot, scrollChain && styles.embeddedRootScroll]}>
        {answerBody}
        {footer ? (
          <View
            style={[
              styles.embeddedWagerFooter,
              {
                paddingLeft: Math.max(SPACING.md, insets.left),
                paddingRight: Math.max(SPACING.md, insets.right),
                paddingBottom: Math.max(insets.bottom, SPACING.md),
              },
            ]}
          >
            {footer}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <PlayScaffold
      title={t('play.resolveTurnTitle')}
      backgroundColor={T.canvas}
      subtitle={
        hideSubtitle || !session.bonus.active ? undefined : t('play.resolveBonusSubtitle')
      }
      showHud
      session={session}
      bodyScrollEnabled={false}
      bodyFrame={false}
      bodyEdgeToEdge
      onBack={confirmLeaveMatch}
      footer={footer}
    >
      {answerBody}
    </PlayScaffold>
  );
}

const styles = StyleSheet.create({
  embeddedRoot: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    backgroundColor: T.canvas,
  },
  /** In ScrollView (`scrollEmbedded`), `flex: undefined` does not override a prior `flex: 1`; children then measure height 0 and overlap siblings that overflow. Use explicit `flex: 0` so the column sizes to its content. */
  embeddedRootScroll: {
    flex: 0,
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'stretch' as const,
    width: '100%',
    minWidth: 0,
    backgroundColor: T.canvas,
  },
  bleedScroll: {
    flex: 0,
    minWidth: 0,
  },
  shellScroll: {
    flex: 0,
  },
  fitBodyScroll: {
    flex: 0,
  },
  pageColumnScroll: {
    flex: 0,
    flexGrow: 0,
    width: '100%',
    alignSelf: 'stretch',
  },
  answerBlockMainScroll: {
    flex: 0,
    width: '100%',
  },
  answerBlockWagerScroll: {
    flex: 0,
    width: '100%',
    justifyContent: 'flex-start',
  },
  embeddedWagerFooter: {
    flexShrink: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BRAND_BORDER,
    paddingTop: SPACING.sm,
    backgroundColor: T.canvas,
  },
  bleed: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
  shell: {
    flex: 1,
    minHeight: 0,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    backgroundColor: T.canvas,
  },
  shellEmbedded: {
    paddingTop: 0,
  },
  fitBody: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
  pageColumn: {
    flex: 1,
    minHeight: 0,
    alignSelf: 'stretch',
    width: '100%',
  },
  answerBlockMain: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    width: '100%',
  },
  answerBlockGap: {
    gap: SPACING.md,
  },
  answerBlockWager: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    width: '100%',
    justifyContent: 'center',
  },
  answerImage: {
    width: '100%',
    height: 160,
    marginBottom: SPACING.md,
  },
  questionMetaPill: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 24,
    ...PLASTIC_FACE,
    ...softSurfaceLift(),
    shadowColor: 'rgba(15, 23, 42, 0.1)',
  },
  questionMetaText: {
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    color: '#333333',
    letterSpacing: 0.5,
  },
  questionMetaDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginHorizontal: SPACING.md,
  },
  questionPromptText: {
    fontFamily: FONTS.displayBold,
    fontSize: 16,
    lineHeight: 24,
    color: '#333333',
    textAlign: 'center',
    paddingHorizontal: SPACING.md,
  },
  postScoreRegion: {
    flexShrink: 0,
    width: '100%',
    marginTop: SPACING.sm,
  },
  postScoreActionRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  postScorePrimaryBtn: {
    flex: 1,
    minWidth: 0,
  },
  postScoreWagerBtn: {
    flexShrink: 0,
    minWidth: 0,
  },
  /** Column: raised card (correct answer only) + plain canvas strip for “who gets points” + award tiles. */
  answerCardAndScoringColumn: {
    width: '100%',
    alignSelf: 'stretch',
  },
  /** Scoring copy + point buttons — no white card (sits on screen canvas). */
  scoringSectionPlain: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  /** Single raised card — BRAND_GUIDELINES: white surface, neumorphic lip, standard raised shadow, large radius. */
  combinedAnswerScoringCard: {
    position: 'relative',
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SOFT_SURFACE_FACE,
    ...softSurfaceLift(),
  },
  referenceAnswerLabel: {
    ...TYPE_SCALE.labelCap,
    textTransform: 'uppercase',
    textAlign: 'center',
    color: BRAND_SUBTLE_TEXT,
  },
  referenceAnswerMain: {
    fontFamily: FONTS.displayBold,
    color: BRAND_CHARCOAL,
    textAlign: 'center',
  },
  whoGetsPointsHeading: {
    fontFamily: FONTS.uiBold,
    textAlign: 'center',
    color: BRAND_CHARCOAL,
    marginBottom: SPACING.lg,
    maxWidth: '100%',
  },
  answerCardTop: {
    width: '100%',
  },
  /** Matches question `promptCard` — single card on page background */
  answerRevealCard: {
    position: 'relative',
    borderRadius: BORDER_RADIUS.xl,
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    ...SOFT_SURFACE_FACE,
    ...softSurfaceLift(),
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 12,
    borderWidth: 2,
    borderColor: 'rgba(0, 123, 255, 0.12)',
    overflow: 'hidden',
  },
  answerAccentStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 8,
  },
  answerHeaderBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: SPACING.sm,
    ...softSurfaceLift(),
    shadowColor: 'rgba(22, 163, 74, 0.35)',
  },
  correctAnswerKicker: {
    color: '#FFFFFF',
    letterSpacing: 1.2,
    textAlign: 'center',
    fontWeight: '800',
  },
  answerText: {
    fontWeight: '800',
    textAlign: 'center',
  },
  awardRow: {
    width: '100%',
    alignItems: 'stretch',
  },
  /** Tappable score cell — same raised white control as BRAND_GUIDELINES Standard button surface (radius 14). */
  awardTile: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    ...SOFT_SURFACE_FACE,
    ...softSurfaceLift(),
  },
  /** Dashed outline per wireframe; use raised shadow, not neumorphic lip (uniform border would replace face). */
  awardNeitherTileBase: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: NEITHER_DASH,
    ...softSurfaceLift(),
  },
  scoringPanelAwardRegion: {
    width: '100%',
  },
  sectionTitle: {
    flexShrink: 0,
    textAlign: 'center',
  },
  awardStack: {
    alignSelf: 'stretch',
  },
  segmentTitle: {
    fontFamily: FONTS.uiBold,
    fontWeight: '700',
    color: BRAND_CHARCOAL,
  },
  segmentMeta: {
    fontFamily: FONTS.ui,
    fontVariant: ['tabular-nums'],
    color: BRAND_SUBTLE_TEXT,
  },
  footerRow: {
    alignItems: 'stretch',
  },
  footerBtn: {
    flex: 1,
    minWidth: 0,
  },
  softUiBtn: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    ...PLASTIC_FACE,
    ...neumorphicLift('rgba(15, 23, 42, 0.14)', 'pill'),
  },
  softUiBtnText: {
    color: '#333333',
    fontFamily: FONTS.displayBold,
    letterSpacing: 2,
    fontSize: 14,
  },
});
