import { useEffect, useMemo, useState } from 'react';
import { Alert, View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable } from '@/components/ui/Pressable';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { HubTokenChip } from '@/components/HubTokenChip';
import { BORDER_RADIUS, FONT_SIZES, LAYOUT, SPACING } from '@/constants';
import { FONTS } from '@/constants/theme';
import { getCategoryBoardAccent, getCategoryPictureSource } from '@/constants/categoryPictures';
import { getRandomRemainingQuestion } from '@/features/play/data';
import type { GameConfig, LifelineId, QuestionCard } from '@/features/shared';
import { PlayScaffold } from '@/features/play/components/PlayScaffold';
import { TopicColumnPickerModal } from '@/features/play/components/TopicColumnPickerModal';
import { getRowDirection } from '@/lib/i18n/direction';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';
import { usePlayStore } from '@/store/play';

const GRID_COLS = 3;

interface BoardRow {
  pointValue: number;
  left: QuestionCard;
  right: QuestionCard;
}

type CategoryColumn = {
  categoryId: string;
  categoryName: string;
  rows: BoardRow[];
};

function groupBoardTrivia(session: NonNullable<ReturnType<typeof usePlayStore.getState>['session']>): {
  categoryId: string;
  categoryName: string;
  rows: BoardRow[];
}[] {
  const cols = new Map<
    string,
    {
      categoryName: string;
      cells: Map<number, { left?: QuestionCard; right?: QuestionCard }>;
    }
  >();

  for (const q of session.board) {
    let col = cols.get(q.categoryId);
    if (!col) {
      col = { categoryName: q.categoryName, cells: new Map() };
      cols.set(q.categoryId, col);
    }
    const slot = col.cells.get(q.pointValue) ?? {};
    if (q.boardSide === 'left') slot.left = q;
    else if (q.boardSide === 'right') slot.right = q;
    else {
      if (!slot.left) slot.left = q;
      else slot.right = q;
    }
    col.cells.set(q.pointValue, slot);
  }

  return Array.from(cols.entries()).map(([categoryId, { categoryName, cells }]) => {
    const rows: BoardRow[] = Array.from(cells.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([pointValue, sides]) => {
        const left = sides.left ?? sides.right!;
        const right = sides.right ?? sides.left!;
        return { pointValue, left, right };
      });
    return { categoryId, categoryName, rows };
  });
}

function chunkColumns<T>(items: T[], chunkSize: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    out.push(items.slice(i, i + chunkSize));
  }
  return out;
}

function lifelineGlyph(id: LifelineId): keyof typeof Ionicons.glyphMap {
  switch (id) {
    case 'callAFriend':
      return 'call-outline';
    case 'discard':
      return 'shuffle-outline';
    case 'answerRewards':
      return 'bulb-outline';
    case 'rest':
      return 'moon-outline';
    default:
      return 'help-circle-outline';
  }
}

function lifelineSlotsForTeam(teamId: string, config: GameConfig): LifelineId[] {
  const bag = config.teamLifelines?.[teamId];
  if (!bag) {
    return ['callAFriend', 'discard', 'answerRewards'];
  }
  const out: LifelineId[] = [];
  const pushN = (id: LifelineId, n: number) => {
    for (let i = 0; i < n; i++) {
      if (out.length < 3) out.push(id);
    }
  };
  pushN('callAFriend', bag.callAFriend);
  pushN('discard', bag.discard);
  pushN('answerRewards', bag.answerRewards);
  pushN('rest', bag.rest ?? 0);
  const pad: LifelineId[] = ['callAFriend', 'discard', 'answerRewards'];
  let p = 0;
  while (out.length < 3) {
    out.push(pad[p % pad.length]);
    p++;
  }
  return out.slice(0, 3);
}

type BoardMetrics = {
  gridGap: number;
  cellBorder: number;
  innerGap: number;
  tileFont: number;
  titleOnImage: number;
  scoreFont: number;
  lifelineIcon: number;
  lifelineIconBox: number;
};

function getBoardMetrics(screenHeight: number, screenWidth: number): BoardMetrics {
  const micro = screenHeight < 400 || screenWidth < 520;
  const compact = screenHeight < 520;
  return {
    gridGap: micro ? 4 : compact ? 6 : 8,
    cellBorder: micro ? 1 : 2,
    innerGap: micro ? 2 : compact ? 4 : 6,
    tileFont: micro ? 9 : compact ? 10 : 11,
    titleOnImage: micro ? 9 : compact ? 10 : 12,
    scoreFont: micro ? 15 : compact ? 18 : 21,
    lifelineIcon: micro ? 12 : compact ? 13 : 14,
    lifelineIconBox: micro ? 20 : compact ? 22 : 24,
  };
}

export default function PlayBoardScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const { direction, getTextStyle, t, uiLocale } = useI18n();
  const session = usePlayStore((state) => state.session);
  const tokens = usePlayStore((state) => state.tokens);
  const selectQuestion = usePlayStore((state) => state.selectQuestion);
  const confirmRandomWagerQuestion = usePlayStore((state) => state.confirmRandomWagerQuestion);

  const [topicModalColumn, setTopicModalColumn] = useState<CategoryColumn | null>(null);

  const metrics = useMemo(() => getBoardMetrics(height, width), [height, width]);
  const headerRowDir = getRowDirection(direction);
  const footerRowDir = getRowDirection(direction);

  useEffect(() => {
    if (session?.step === 'question') {
      router.replace('/(app)/play/question');
    } else if (session?.step === 'end') {
      router.replace('/(app)/play/end');
    }
  }, [router, session?.step]);

  useEffect(() => {
    if (session?.wager && !session.wager.question) {
      confirmRandomWagerQuestion();
    }
  }, [confirmRandomWagerQuestion, session?.wager]);

  const grouped = useMemo(() => (session ? groupBoardTrivia(session) : []), [session]);
  const gridRows = useMemo(() => chunkColumns(grouped, GRID_COLS), [grouped]);

  const padX = Math.max(insets.left, LAYOUT.screenGutter) + Math.max(insets.right, LAYOUT.screenGutter);
  const innerWidth = Math.max(0, width - padX);

  /** Tighter rails + scroll on small landscape phones so columns and footer are not clipped. */
  const layoutTuning = useMemo(() => {
    const narrow = innerWidth < 720;
    const tight = innerWidth < 600;
    const short = height < 420;
    const rowCount = Math.max(1, gridRows.length);
    const reserved = short ? 200 : 232;
    const avail = Math.max(0, height - insets.top - insets.bottom - reserved);
    const rowMin = Math.max(80, Math.min(140, Math.floor(avail / rowCount)));
    return {
      narrow,
      pictureFlex: narrow ? 1 : 1.15,
      railFlex: tight ? 0.72 : narrow ? 0.78 : 0.85,
      hubSideMin: tight ? 72 : narrow ? 88 : 120,
      rowMinHeight: rowMin,
    };
  }, [innerWidth, height, insets.top, insets.bottom, gridRows.length]);

  const leaveMatch = () => {
    Alert.alert(t('play.leaveMatchTitle'), t('play.leaveMatchBody'), [
      { text: t('common.stay'), style: 'cancel' },
      {
        text: t('common.leave'),
        style: 'destructive',
        onPress: () => {
          usePlayStore.getState().resetSession();
          router.replace('/(app)/');
        },
      },
    ]);
  };

  if (!session) {
    return <PlayScaffold title={t('common.loading')}><Text>{t('common.loading')}</Text></PlayScaffold>;
  }

  const wager = session.wager;
  const remaining = session.board.filter((question) => !session.usedQuestionIds.has(question.id));
  const formattedTokens = tokens.toLocaleString(uiLocale, { maximumFractionDigits: 0 });

  const renderTile = (column: CategoryColumn, question: QuestionCard) => {
    const used = session.usedQuestionIds.has(question.id);
    return (
      <Pressable
        style={({ pressed }) => [
          styles.pointTile,
          {
            borderRadius: BORDER_RADIUS.sm,
            backgroundColor: used ? colors.boardCellUsed : colors.boardCell,
            borderColor: used ? colors.border : colors.primary,
            borderWidth: 1,
            opacity: used ? 0.55 : pressed ? 0.88 : 1,
          },
        ]}
        onPress={() => {
          if (used) return;
          setTopicModalColumn(column);
        }}
        disabled={used}
        accessibilityRole="button"
        accessibilityState={{ disabled: used }}
        accessibilityLabel={`${question.pointValue} points`}
      >
        <Text
          style={[
            styles.pointTileText,
            getTextStyle(question.locale, 'bodyBold', 'center'),
            {
              fontSize: metrics.tileFont,
              lineHeight: metrics.tileFont + 3,
              color: used ? colors.textSecondary : colors.primary,
            },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {used ? '—' : question.pointValue}
        </Text>
      </Pressable>
    );
  };

  const categoryCell = (column: (typeof grouped)[0]) => {
    const accent = getCategoryBoardAccent(column.categoryId);
    const picture = getCategoryPictureSource(column.categoryId);
    const locale = column.rows[0]?.left.locale ?? 'en';

    return (
      <View
        key={column.categoryId}
        style={[
          styles.categoryCell,
          {
            borderRadius: BORDER_RADIUS.md,
            borderColor: colors.primary,
            borderWidth: metrics.cellBorder,
            backgroundColor: colors.cardBackground,
          },
        ]}
      >
        <View style={[styles.categoryTriplet, { gap: metrics.innerGap, padding: metrics.innerGap }]}>
          <View style={[styles.tileRail, { flex: layoutTuning.railFlex, gap: metrics.innerGap }]}>
            {column.rows.map((row) => (
              <View key={`L-${row.pointValue}`} style={styles.tileRailSlot}>
                {renderTile(column, row.left)}
              </View>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.pictureFrame,
              {
                flex: layoutTuning.pictureFlex,
                borderRadius: BORDER_RADIUS.sm,
                backgroundColor: colors.primary,
                padding: metrics.innerGap <= 2 ? 2 : metrics.innerGap,
                opacity: pressed ? 0.92 : 1,
              },
            ]}
            onPress={() => setTopicModalColumn(column)}
            accessibilityRole="button"
            accessibilityLabel={column.categoryName}
          >
            <View style={styles.pictureInner}>
              {picture ? (
                <Image source={picture} style={styles.pictureImage} contentFit="cover" transition={120} />
              ) : (
                <View style={[styles.pictureFallbackFill, { backgroundColor: `${accent}28` }]}>
                  <Text style={[styles.pictureFallbackLetter, { color: accent, fontSize: metrics.scoreFont * 0.75 }]}>
                    {column.categoryName.charAt(0)}
                  </Text>
                </View>
              )}
              <View style={styles.pictureTitleBar}>
                <Text
                  style={[
                    styles.pictureTitleText,
                    getTextStyle(locale, 'bodyBold', 'center'),
                    { fontSize: metrics.titleOnImage, lineHeight: metrics.titleOnImage + 3 },
                  ]}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.65}
                >
                  {column.categoryName}
                </Text>
              </View>
            </View>
          </Pressable>

          <View style={[styles.tileRail, { flex: layoutTuning.railFlex, gap: metrics.innerGap }]}>
            {column.rows.map((row) => (
              <View key={`R-${row.pointValue}`} style={styles.tileRailSlot}>
                {renderTile(column, row.right)}
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const boardHeader = (
    <View style={styles.boardHeader}>
      <View style={[styles.hubTopBar, { flexDirection: headerRowDir }]}>
        <View style={styles.topBarTitleOverlay} pointerEvents="none">
          <Text
            style={[
              styles.hubTopBarTitle,
              { color: colors.textOnBackground },
              getTextStyle(undefined, 'displayBold', 'center'),
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {t('common.appName').toUpperCase()}
          </Text>
        </View>

        <View style={[styles.hubHeaderSide, styles.hubHeaderSideStart, { minWidth: layoutTuning.hubSideMin }]}>
          <Pressable
            onPress={leaveMatch}
            style={({ pressed }) => [
              styles.headerHubPill,
              { flexDirection: headerRowDir },
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
                opacity: pressed ? 0.92 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('play.boardExit')}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.primary} />
            <Text
              style={[styles.headerHubPillLabel, { color: colors.textOnBackground }]}
              numberOfLines={1}
            >
              {t('play.boardExit')}
            </Text>
          </Pressable>
        </View>

        <View style={styles.topBarSpacer} />

        <View style={[styles.hubHeaderSide, styles.hubHeaderSideEnd, { minWidth: layoutTuning.hubSideMin }]}>
          <View style={styles.boardHeaderEndStack}>
            <HubTokenChip
              label={t('common.tokens')}
              value={formattedTokens}
              rowDirection={headerRowDir}
              onPress={() => router.push('/(app)/store')}
              accessibilityLabel={`${t('common.tokens')}: ${formattedTokens}`}
            />
          </View>
        </View>
      </View>
    </View>
  );

  const footerPadBottom = Math.max(
    height < 420 ? SPACING.sm : SPACING.md,
    insets.bottom > 0 ? insets.bottom : SPACING.xs,
  );
  const footerCompact = innerWidth < 560;

  const boardFooter = (
    <View style={[styles.footerStripOuter, { paddingBottom: footerPadBottom }]}>
      <View
        style={[
          styles.footerStripCard,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.border,
            shadowColor: colors.shadow,
            paddingVertical: footerCompact ? SPACING.xs : SPACING.sm,
            paddingHorizontal: footerCompact ? SPACING.sm : SPACING.md,
          },
        ]}
      >
        <View
          style={[
            styles.footerRow,
            { flexDirection: footerRowDir, gap: footerCompact ? SPACING.xs : SPACING.sm },
          ]}
        >
          {session.teams.map((team, teamIndex) => {
            const slots = lifelineSlotsForTeam(team.id, session.config);
            const showDivider = teamIndex > 0;
            const isCurrentTurn = Boolean(session.currentTeamId && team.id === session.currentTeamId);
            const a11yLabel = [
              team.name,
              t('common.points', { count: team.score }),
              t('play.boardLifelines'),
              isCurrentTurn ? t('play.boardCurrentTurnA11y') : '',
            ]
              .filter(Boolean)
              .join(', ');
            const highlightRadius = BORDER_RADIUS.md;
            const turnHighlightCorners =
              isCurrentTurn && teamIndex === 0
                ? {
                    borderTopStartRadius: highlightRadius,
                    borderBottomStartRadius: highlightRadius,
                  }
                : isCurrentTurn && teamIndex === session.teams.length - 1
                  ? {
                      borderTopEndRadius: highlightRadius,
                      borderBottomEndRadius: highlightRadius,
                    }
                  : isCurrentTurn
                    ? {}
                    : {};

            return (
              <View
                key={team.id}
                style={[
                  styles.footerTeam,
                  showDivider
                    ? [
                        styles.footerTeamDivider,
                        {
                          borderStartColor: colors.border,
                          paddingStart: footerCompact ? SPACING.sm : SPACING.md,
                          marginStart: footerCompact ? SPACING.xs : SPACING.sm,
                        },
                      ]
                    : null,
                  isCurrentTurn && {
                    backgroundColor: `${colors.primary}18`,
                    borderColor: colors.primary,
                  },
                  turnHighlightCorners,
                ]}
                accessibilityState={isCurrentTurn ? { selected: true } : undefined}
              >
                <Text
                  style={[
                    styles.footerTeamName,
                    { color: isCurrentTurn ? colors.primary : colors.textSecondary },
                    getTextStyle(undefined, 'bodySemibold', 'center'),
                  ]}
                  numberOfLines={1}
                >
                  {team.name}
                </Text>
                <View
                  style={[
                    styles.footerScoreLifelinesRow,
                    { flexDirection: footerRowDir, gap: footerCompact ? SPACING.xs : SPACING.sm },
                  ]}
                  accessibilityRole="summary"
                  accessibilityLabel={a11yLabel}
                >
                  <Text
                    style={[
                      styles.footerScore,
                      {
                        color: colors.primary,
                        fontSize: metrics.scoreFont,
                        fontFamily: FONTS.displayBold,
                      },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.65}
                  >
                    {team.score}
                  </Text>
                  <View
                    style={[styles.lifelineIcons, { flexDirection: footerRowDir }]}
                    importantForAccessibility="no-hide-descendants"
                  >
                    {slots.map((id, i) => (
                      <View
                        key={`${team.id}-${id}-${i}`}
                        style={[
                          styles.lifelineIconWrap,
                          {
                            width: metrics.lifelineIconBox,
                            height: metrics.lifelineIconBox,
                            borderRadius: BORDER_RADIUS.sm,
                            borderColor: isCurrentTurn ? colors.primary : colors.border,
                            backgroundColor: isCurrentTurn ? `${colors.primary}10` : colors.background,
                          },
                        ]}
                      >
                        <Ionicons name={lifelineGlyph(id)} size={metrics.lifelineIcon} color={colors.primary} />
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );

  const pickQuestionFromTopicModal = (question: QuestionCard) => {
    selectQuestion(question);
    setTopicModalColumn(null);
    router.replace('/(app)/play/question');
  };

  return (
    <>
      <PlayScaffold
        title={t('play.questionBoardTitle')}
        customHeader={boardHeader}
        onBack={leaveMatch}
        showHud={false}
        session={session}
        footer={boardFooter}
        footerBare
        footerDense
        footerAboveBody
        bodyScrollEnabled={false}
        bodyFrame={false}
        bodyEdgeToEdge
        contentSafeAreaHorizontal
      >
      {wager ? (
        <View
          style={[
            styles.banner,
            {
              backgroundColor: `${colors.secondary}15`,
              borderColor: `${colors.secondary}40`,
              paddingVertical: SPACING.sm,
              paddingHorizontal: SPACING.md,
              borderWidth: 1,
            },
          ]}
        >
          <Text style={[styles.bannerTitle, { color: colors.text }, getTextStyle(undefined, 'bodyBold', 'start')]}>
            {t('play.wagerModeTitle')}
          </Text>
          <Text style={[styles.bannerCopy, { color: colors.textSecondary }, getTextStyle()]} numberOfLines={2}>
            {t('play.wagerModeBody', {
              wageringTeam:
                session.teams.find((team) => team.id === wager.wageringTeamId)?.name ?? t('common.teamOne'),
              targetTeam:
                session.teams.find((team) => team.id === wager.targetTeamId)?.name ?? t('common.teamTwo'),
            })}
          </Text>
        </View>
      ) : null}

      <ScrollView
        style={styles.gridScroll}
        contentContainerStyle={[
          styles.gridScrollContent,
          {
            paddingBottom: Math.max(insets.bottom, SPACING.sm) + SPACING.md,
          },
        ]}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        bounces
      >
        {session.mode === 'random' ? (
          <View style={[styles.randomWrap, { minHeight: Math.max(220, height * 0.4) }]}>
            <Pressable
              style={({ pressed }) => [
                styles.randomButton,
                {
                  backgroundColor: colors.primary,
                  paddingHorizontal: SPACING.lg,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
              onPress={() => {
                const randomQuestion = getRandomRemainingQuestion(session.board, session.usedQuestionIds);
                if (!randomQuestion) return;
                selectQuestion(randomQuestion);
                router.replace('/(app)/play/question');
              }}
              disabled={!remaining.length}
            >
              <Text style={[styles.randomButtonText, getTextStyle(undefined, 'bodyBold', 'center'), { fontSize: FONT_SIZES.lg }]}>
                {remaining.length ? t('play.drawRandomQuestion') : t('play.noQuestionsLeft')}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.gridBleed}>
            {gridRows.map((row, ri) => (
              <View
                key={`row-${ri}`}
                style={[
                  styles.gridRow,
                  {
                    gap: metrics.gridGap,
                    marginBottom: ri < gridRows.length - 1 ? metrics.gridGap : 0,
                    minHeight: layoutTuning.rowMinHeight,
                  },
                ]}
              >
                {row.map((col) => categoryCell(col))}
                {row.length < GRID_COLS
                  ? Array.from({ length: GRID_COLS - row.length }).map((_, ei) => (
                      <View key={`empty-${ri}-${ei}`} style={styles.gridCellSpacer} />
                    ))
                  : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      </PlayScaffold>
      <TopicColumnPickerModal
        visible={topicModalColumn !== null}
        column={topicModalColumn}
        usedQuestionIds={session.usedQuestionIds}
        onClose={() => setTopicModalColumn(null)}
        onPickQuestion={pickQuestionFromTopicModal}
      />
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: BORDER_RADIUS.lg,
    flexShrink: 0,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  bannerTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    marginBottom: 2,
  },
  bannerCopy: {
    fontSize: FONT_SIZES.xs,
    lineHeight: 16,
  },
  boardHeader: {
    width: '100%',
    flexShrink: 0,
  },
  /** Mirrors `app/(app)/index.tsx` hub top bar — light chrome, not solid primary. */
  hubTopBar: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    minHeight: 48,
  },
  topBarTitleOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubTopBarTitle: {
    fontSize: 15,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'center',
    maxWidth: '42%',
  },
  hubHeaderSide: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubHeaderSideStart: {
    alignItems: 'flex-start',
  },
  hubHeaderSideEnd: {
    alignItems: 'flex-end',
  },
  headerHubPill: {
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 2,
    flexShrink: 1,
    minWidth: 0,
  },
  headerHubPillLabel: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 15,
    flexShrink: 1,
    minWidth: 0,
  },
  topBarSpacer: {
    flex: 1,
    minWidth: SPACING.md,
  },
  boardHeaderEndStack: {
    alignItems: 'flex-end',
    gap: SPACING.xs,
    maxWidth: '100%',
  },
  /** Centers the pill; no full-bleed background (avoids a wide empty bar on web / landscape). */
  footerStripOuter: {
    width: '100%',
    alignItems: 'center',
    maxWidth: '100%',
  },
  footerStripCard: {
    alignSelf: 'center',
    maxWidth: '100%',
    flexShrink: 1,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: '100%',
  },
  /** Equal halves so the active-team tint reads as a full side, not a content-sized pill. */
  footerTeam: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  footerTeamDivider: {
    borderStartWidth: StyleSheet.hairlineWidth,
  },
  footerTeamName: {
    fontSize: 11,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    textAlign: 'center',
    maxWidth: '100%',
  },
  footerScoreLifelinesRow: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    maxWidth: '100%',
  },
  footerScore: {
    fontWeight: '800',
    minWidth: 28,
    textAlign: 'center',
  },
  lifelineIcons: {
    gap: 5,
    alignItems: 'center',
  },
  lifelineIconWrap: {
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  randomWrap: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xs,
  },
  randomButton: {
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    paddingVertical: SPACING.md,
  },
  randomButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  gridBleed: {
    width: '100%',
    minWidth: 0,
    paddingTop: SPACING.xs,
  },
  gridScroll: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
  gridScrollContent: {
    flexGrow: 1,
  },
  gridRow: {
    flexDirection: 'row',
    minWidth: 0,
  },
  gridCellSpacer: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },
  categoryCell: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden',
  },
  categoryTriplet: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 0,
  },
  tileRail: {
    minWidth: 0,
    minHeight: 0,
    justifyContent: 'space-between',
  },
  tileRailSlot: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'center',
  },
  pointTile: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  pointTileText: {
    fontWeight: '800',
  },
  pictureFrame: {
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  pictureInner: {
    flex: 1,
    minHeight: 0,
    borderRadius: BORDER_RADIUS.sm - 2,
    overflow: 'hidden',
    position: 'relative',
  },
  pictureImage: {
    ...StyleSheet.absoluteFillObject,
  },
  pictureTitleBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 4,
    paddingVertical: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
  },
  pictureTitleText: {
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
  },
  pictureFallbackFill: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.sm - 2,
  },
  pictureFallbackLetter: {
    fontWeight: '800',
  },
});
