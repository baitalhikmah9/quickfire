import { Fragment, useMemo } from 'react';
import { Alert, View, Text, StyleSheet, useWindowDimensions, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable } from '@/components/ui/Pressable';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { FONTS, BORDER_RADIUS, FONT_SIZES, SPACING, SHADOWS } from '@/constants';
import { PlayScaffold } from '@/features/play/components/PlayScaffold';
import { getRowDirection } from '@/lib/i18n/direction';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';
import { usePlayStore } from '@/store/play';
import { HOME_SOFT_UI } from '@/themes';

const T = HOME_SOFT_UI.colors;

/** Deeper drop shadow — reads as a raised plastic tile (tier scales with control size). */
function neumorphicLift(
  shadowColor: string,
  tier: 'hero' | 'header' | 'pill' | 'card'
): ViewStyle {
  const m =
    tier === 'hero'
      ? { h: 14, op: 0.35, r: 28, el: 18 }
      : tier === 'header'
        ? { h: 8, op: 0.28, r: 18, el: 12 }
        : tier === 'card'
          ? { h: 10, op: 0.22, r: 22, el: 10 }
          : { h: 6, op: 0.25, r: 14, el: 8 };
  return {
    shadowColor,
    shadowOffset: { width: 0, height: m.h },
    shadowOpacity: m.op,
    shadowRadius: m.r,
    elevation: m.el,
  };
}

/** Soft amber glow for focal focal squircles. */
const AMBER_GLOW: ViewStyle = {
  shadowColor: '#FFB347',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.45,
  shadowRadius: 36,
  elevation: 12,
};

/** Light top lip + soft bottom edge — reads extruded on white squircles. */
const PLASTIC_FACE: ViewStyle = {
  borderTopWidth: 2,
  borderTopColor: 'rgba(255, 255, 255, 0.78)',
  borderBottomWidth: StyleSheet.hairlineWidth * 2,
  borderBottomColor: 'rgba(0, 0, 0, 0.1)',
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

/** Horizontal award rail needs ~72px per segment + dividers; stack vertically when too tight. */
function shouldStackAwardLayout(screenWidth: number, teamCount: number): boolean {
  const segments = teamCount + 1;
  const minForRail = segments * 72 + Math.max(0, segments - 1) * 2;
  return screenWidth < minForRail + 40;
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

export default function PlayAnswerScreen() {
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

  const layoutDensity: AnswerDensity = useMemo(() => {
    const base = getAnswerLayoutDensity(windowWidth, windowHeight);
    if (!session?.currentQuestion) {
      return mergeAnswerDensity(base, {
        windowHeight,
        insetTop: insets.top,
        insetBottom: insets.bottom,
        stackedAwards: false,
        awardSegments: 3,
        showPointsSection: false,
        showPostScoreRow: false,
        wagerFooter: false,
        bonusSubtitle: false,
      });
    }
    const wagerActive = !!session.wager;
    const postScore = !wagerActive && session.phase === 'scoring';
    const stacked = shouldStackAwardLayout(windowWidth, session.teams.length);
    const bonusSubtitle = session.bonus.active && windowHeight >= 360;
    return mergeAnswerDensity(base, {
      windowHeight,
      insetTop: insets.top,
      insetBottom: insets.bottom,
      stackedAwards: stacked,
      awardSegments: session.teams.length + 1,
      showPointsSection: !wagerActive,
      showPostScoreRow: postScore,
      wagerFooter: wagerActive,
      bonusSubtitle,
    });
  }, [windowWidth, windowHeight, insets.top, insets.bottom, session]);

  const rowDir = getRowDirection(direction);
  const chromeGap =
    Math.min(windowWidth, windowHeight) < 420 ? SPACING.sm : SPACING.lg;
  /** One rhythm for gaps between answer card, headings, awards, and action rows (matches question `chromeGap` × density). */
  const sectionGap = Math.min(chromeGap, layoutDensity.sheetGap);

  if (!session?.currentQuestion) {
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

  const stackedAwards = shouldStackAwardLayout(windowWidth, session.teams.length);
  const hideSubtitle = windowHeight < 360;
  const awardChoiceCommitted =
    session.phase === 'scoring' && session.lastAwardedTeamId !== undefined;

  const teamAwardSurface = (teamId: string, variant: 'stack' | 'rail'): string => {
    if (awardChoiceCommitted) {
      return session.lastAwardedTeamId === teamId
        ? `${colors.primary}24`
        : variant === 'rail'
          ? 'transparent'
          : colors.cardBackground;
    }
    if (session.phase === 'answerLock' && teamId === session.currentTeamId) {
      return `${colors.primary}14`;
    }
    return variant === 'rail' ? 'transparent' : colors.cardBackground;
  };

  const neitherAwardSurface = (variant: 'stack' | 'rail'): string => {
    if (awardChoiceCommitted && session.lastAwardedTeamId === null) {
      return `${colors.primary}20`;
    }
    return variant === 'rail' ? 'transparent' : colors.cardBackground;
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
          style={[styles.softUiBtn, { backgroundColor: '#FEE2E2' }]} // Subtle destructive tint
          textStyle={[styles.softUiBtnText, { color: '#DC2626' }, getTextStyle(undefined, 'bodySemibold', 'center')]}
        />
      </View>
    </View>
  ) : undefined;

  const postScoreActions = showPostScoreActions ? (
    <View style={[styles.footerRow, { flexDirection: rowDir, gap: sectionGap }]}>
      <View style={styles.footerBtn}>
        <Button
          title={(session.bonus.active ? t('play.finishMatch') : t('play.nextTurn')).toUpperCase()}
          onPress={() => {
            continueAfterStandardQuestion();
            router.replace('/play/board');
          }}
          style={[styles.softUiBtn, styles.primarySoftUiBtn]}
          textStyle={[styles.softUiBtnText, getTextStyle(undefined, 'bodySemibold', 'center')]}
        />
      </View>
      {canWager ? (
        <View style={styles.footerBtn}>
          <Button
            title={t('play.wagerNextTeam').toUpperCase()}
            onPress={() => {
              const result = initiateWager();
              if (result.ok) {
                router.replace('/play/board');
              }
            }}
            style={styles.softUiBtn}
            textStyle={[styles.softUiBtnText, getTextStyle(undefined, 'bodySemibold', 'center')]}
          />
        </View>
      ) : null}
    </View>
  ) : null;

  const renderAwardTargets = () => {
    if (stackedAwards) {
      return (
        <View style={[styles.awardStack, { gap: sectionGap }]}>
          {session.teams.map((team) => (
              <Pressable
                key={team.id}
                style={({ pressed }) => [
                  styles.awardStackCell,
                  {
                    borderColor: colors.border,
                    borderWidth: layoutDensity.borderWidth,
                    backgroundColor: teamAwardSurface(team.id, 'stack'),
                    minHeight: layoutDensity.awardStackMinH,
                    paddingVertical: layoutDensity.awardStackPadV,
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
                    { color: colors.text, fontSize: layoutDensity.segmentTitleSize },
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
                    { color: colors.textSecondary, fontSize: layoutDensity.segmentMetaSize },
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
              styles.awardStackCell,
              {
                borderColor: colors.border,
                borderWidth: layoutDensity.borderWidth,
                backgroundColor: neitherAwardSurface('stack'),
                minHeight: layoutDensity.awardStackMinH,
                paddingVertical: layoutDensity.awardStackPadV,
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
                { color: colors.text, fontSize: layoutDensity.segmentTitleSize },
                getTextStyle(undefined, 'bodyBold', 'center'),
              ]}
              numberOfLines={1}
            >
              {t('play.neitherTeam')}
            </Text>
            <Text
              style={[
                styles.segmentMeta,
                { color: colors.textSecondary, fontSize: layoutDensity.segmentMetaSize },
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
      <View
        style={[
          styles.awardRail,
          {
            flexDirection: rowDir,
            borderColor: colors.border,
            borderWidth: layoutDensity.borderWidth,
            minHeight: layoutDensity.awardStackMinH,
          },
        ]}
      >
        {session.teams.map((team, index) => (
            <Fragment key={team.id}>
              {index > 0 ? (
                <View style={[styles.awardDivider, { backgroundColor: colors.border }]} />
              ) : null}
              <Pressable
                style={({ pressed }) => [
                  styles.awardCell,
                  {
                    paddingVertical: layoutDensity.railPadV,
                    backgroundColor: teamAwardSurface(team.id, 'rail'),
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
                    { color: colors.text, fontSize: layoutDensity.segmentTitleSize },
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
                    { color: colors.textSecondary, fontSize: layoutDensity.segmentMetaSize },
                    getTextStyle(undefined, 'body', 'center'),
                  ]}
                  numberOfLines={1}
                >
                  +{pointsThisQuestion} pts
                </Text>
              </Pressable>
            </Fragment>
        ))}
        <View style={[styles.awardDivider, { backgroundColor: colors.border }]} />
        <Pressable
          style={({ pressed }) => [
            styles.awardCell,
            {
              paddingVertical: layoutDensity.railPadV,
              backgroundColor: neitherAwardSurface('rail'),
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
              { color: colors.text, fontSize: layoutDensity.segmentTitleSize },
              getTextStyle(undefined, 'bodyBold', 'center'),
            ]}
            numberOfLines={1}
          >
            {t('play.neitherTeam')}
          </Text>
          <Text
            style={[
              styles.segmentMeta,
              { color: colors.textSecondary, fontSize: layoutDensity.segmentMetaSize },
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

  return (
    <PlayScaffold
      title={t('play.resolveTurnTitle')}
      subtitle={
        hideSubtitle || !session.bonus.active ? undefined : t('play.resolveBonusSubtitle')
      }
      bodyScrollEnabled={false}
      bodyFrame={false}
      bodyEdgeToEdge
      onBack={() =>
        Alert.alert(t('play.leaveMatchTitle'), t('play.leaveMatchBody'), [
          { text: t('common.stay'), style: 'cancel' },
          {
            text: t('common.leave'),
            style: 'destructive',
            onPress: () => {
              resetSession();
              router.replace('/(app)/');
            },
          },
        ])
      }
      footer={footer}
    >
      <View style={styles.bleed}>
        <View
          style={[
            styles.shell,
            {
              paddingLeft: Math.max(SPACING.md, insets.left),
              paddingRight: Math.max(SPACING.md, insets.right),
            },
          ]}
        >
          <View
            style={[
              styles.fitBody,
              { paddingBottom: Math.max(insets.bottom, SPACING.xs) },
            ]}
          >
            <View style={[styles.pageColumn, { gap: sectionGap }]}>
              <View
                style={[
                  wager ? styles.answerBlockWager : styles.answerBlockMain,
                ]}
              >
                <View
                  style={[
                    styles.answerRevealCard,
                    {
                      borderColor: colors.border,
                      borderWidth: layoutDensity.borderWidth,
                      backgroundColor: colors.cardBackground,
                      shadowColor: colors.primary,
                      paddingVertical: layoutDensity.answerCardPadV,
                      paddingHorizontal: layoutDensity.answerCardPadH,
                      ...(wager
                        ? {}
                        : { flex: 1, minHeight: 0, justifyContent: 'center' as const }),
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.answerEyebrow,
                      {
                        color: colors.textSecondary,
                        marginBottom: layoutDensity.answerEyebrowMarginBottom,
                      },
                      getTextStyle(undefined, 'body', 'center'),
                    ]}
                  >
                    {t('play.correctAnswer')}
                  </Text>
                  <Text
                    style={[
                      styles.answerText,
                      {
                        color: colors.text,
                        fontSize: layoutDensity.answerFontSize,
                        lineHeight: layoutDensity.answerLineHeight,
                      },
                      getTextStyle(undefined, 'displayBold', 'center'),
                    ]}
                    maxFontSizeMultiplier={1.25}
                    numberOfLines={6}
                    adjustsFontSizeToFit
                    minimumFontScale={0.62}
                  >
                    {currentQuestion.answer}
                  </Text>
                </View>
              </View>

              {!wager ? (
                <>
                  <Text
                    style={[
                      styles.sectionTitle,
                      {
                        color: colors.text,
                        fontSize: layoutDensity.sectionTitleSize,
                        lineHeight: layoutDensity.sectionTitleSize + 6,
                      },
                      getTextStyle(undefined, 'bodyBold', 'center'),
                    ]}
                  >
                    {session.phase === 'scoring' ? t('play.pointsAwarded') : t('play.whoGetsPoints')}
                  </Text>
                  <View style={styles.awardRegion}>{renderAwardTargets()}</View>
                  {postScoreActions ? (
                    <View style={styles.postScoreRegion}>{postScoreActions}</View>
                  ) : null}
                </>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </PlayScaffold>
  );
}

const styles = StyleSheet.create({
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
  answerBlockWager: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    width: '100%',
    justifyContent: 'center',
  },
  awardRegion: {
    flexShrink: 0,
    width: '100%',
  },
  postScoreRegion: {
    flexShrink: 0,
    width: '100%',
    marginTop: SPACING.sm,
  },
  /** Matches question `promptCard` — single card on page background */
  answerRevealCard: {
    borderRadius: BORDER_RADIUS.xl,
    alignSelf: 'stretch',
    ...SHADOWS.card,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  answerEyebrow: {
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  answerText: {
    fontWeight: '700',
    textAlign: 'center',
  },
  sectionTitle: {
    flexShrink: 0,
    textAlign: 'center',
  },
  awardRail: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    alignItems: 'stretch',
    alignSelf: 'stretch',
  },
  awardStack: {
    alignSelf: 'stretch',
  },
  awardStackCell: {
    alignSelf: 'stretch',
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  awardDivider: {
    width: StyleSheet.hairlineWidth * 2,
    minWidth: 1,
    alignSelf: 'stretch',
  },
  awardCell: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
    gap: 4,
  },
  segmentTitle: {
    fontWeight: '700',
  },
  segmentMeta: {
    fontVariant: 'tabular-nums',
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
  primarySoftUiBtn: {
    ...AMBER_GLOW,
  },
  softUiBtnText: {
    color: '#333333',
    fontFamily: FONTS.displayBold,
    letterSpacing: 2,
    fontSize: 14,
  },
});
