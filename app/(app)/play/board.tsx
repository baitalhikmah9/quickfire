import { useEffect, useMemo, useState, useRef } from 'react';
import { Alert, View, Text, StyleSheet, ScrollView, useWindowDimensions, Animated, Platform } from 'react-native';
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
import { SOFT_SURFACE_FACE, softSurfaceLift } from '@/features/play/styles/softSurface';
import { getRowDirection } from '@/lib/i18n/direction';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';
import { usePlayStore } from '@/store/play';
import { HOME_SOFT_UI } from '@/themes';

const T = HOME_SOFT_UI;

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

function getGridColumnCount(mode: string, categoryCount: number): number {
  if (mode === 'quickPlay' && categoryCount === 4) return 2;
  if (categoryCount <= 2) return Math.max(1, categoryCount);
  return 3;
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

/** Blocky plastic shadow tier — solid charcoal-tinted depth. */
function neumorphicLift3D(
  tier: 'card' | 'pill' | 'tile' | 'header' | 'score'
): any {
  return softSurfaceLift();
}



const PLASTIC_FACE = {
    ...SOFT_SURFACE_FACE,
};

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
  const compact = screenHeight < 560;
  return {
    gridGap: micro ? 8 : compact ? 12 : 20,
    cellBorder: micro ? 1 : 2,
    innerGap: micro ? 2 : compact ? 6 : 10,
    tileFont: micro ? 11 : compact ? 13 : 15,
    titleOnImage: micro ? 8 : compact ? 9 : 11,
    scoreFont: micro ? 14 : compact ? 16 : 18,
    lifelineIcon: micro ? 10 : compact ? 12 : 14,
    lifelineIconBox: micro ? 18 : compact ? 20 : 24,
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
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);

  const metrics = useMemo(() => getBoardMetrics(height, width), [height, width]);

  // Notch detection: Blank side is the one with smaller safe area insets.
  const isLeftBlank = insets.left <= insets.right;
  const blankSide = isLeftBlank ? 'left' : 'right';
  const sidebarWidth = 52;
  const headerRowDir = getRowDirection(direction);
  const footerRowDir = getRowDirection(direction);

  useEffect(() => {
    if (session?.step === 'question') {
      router.replace('/play/question');
    } else if (session?.step === 'end') {
      router.replace('/play/end');
    }
  }, [router, session?.step]);

  useEffect(() => {
    if (session?.wager && !session.wager.question) {
      confirmRandomWagerQuestion();
    }
  }, [confirmRandomWagerQuestion, session?.wager]);

  const grouped = useMemo(() => (session ? groupBoardTrivia(session) : []), [session]);
  const gridColumnCount = getGridColumnCount(session?.mode ?? 'classic', grouped.length);
  const gridRows = useMemo(() => chunkColumns(grouped, gridColumnCount), [grouped, gridColumnCount]);

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
    const performLeave = () => {
      usePlayStore.getState().resetSession();
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

  if (!session) {
    return <PlayScaffold title={t('common.loading')}><Text>{t('common.loading')}</Text></PlayScaffold>;
  }

  const wager = session.wager;
  const remaining = session.board.filter((question) => !session.usedQuestionIds.has(question.id));
  const formattedTokens = tokens.toLocaleString(uiLocale, { maximumFractionDigits: 0 });

  const renderTile = (column: CategoryColumn, question: QuestionCard) => {
    const used = session.usedQuestionIds.has(question.id);
    const surface = T.colors.surface;
    const textPrimary = T.colors.textPrimary;
    const textMuted = T.colors.textMuted;

    return (
      <View style={styles.tileWrapper}>

         <Pressable
            style={({ pressed }) => [
                styles.pointTile,
                PLASTIC_FACE,
                {
                    backgroundColor: surface,
                    opacity: used ? 0.45 : (pressed ? 0.94 : 1),
                    transform: pressed ? [{ scale: 0.97 }] : [{ scale: 1 }],
                },
                !used && neumorphicLift3D('tile'),
            ]}
            onPress={() => {
                if (used) return;
                selectQuestion(question);
                router.replace('/play/question');
            }}
            disabled={used}
            accessibilityRole="button"
            accessibilityState={{ disabled: used }}
            accessibilityLabel={`${question.pointValue} points`}
        >
            <Text
            style={[
                styles.pointTileText,
                {
                    fontSize: metrics.tileFont,
                    color: used ? textMuted : textPrimary,
                    textDecorationLine: used ? 'line-through' : 'none',
                    opacity: used ? 0.5 : 1,
                },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            >
            {question.pointValue}
            </Text>
        </Pressable>
      </View>
    );
  };

  const categoryCell = (column: (typeof grouped)[0]) => {
    const picture = getCategoryPictureSource(column.categoryId);
    const surface = T.colors.surface;
    const textPrimary = T.colors.textPrimary;
    const textMuted = T.colors.textMuted;
    const compact = height < 560;

    return (
      <View key={column.categoryId} style={styles.categoryBlock}>
        <View style={styles.categoryTriplet}>
          {/* Left Column */}
          <View style={styles.railColumn}>
            {!compact && <Text style={[styles.playableLabel, { color: textMuted }]}>PLAYABLE</Text>}
            <View style={[styles.tileRail, { gap: metrics.innerGap }]}>
                {column.rows.map((row) => (
                    <View key={`L-${row.pointValue}`} style={styles.tileRailSlot}>
                        {renderTile(column, row.left)}
                    </View>
                ))}
            </View>
          </View>

          {/* Central Card */}
          <View style={styles.centralCardWrapper}>
            <Pressable
                style={({ pressed }) => [
                styles.pictureFrame,
                PLASTIC_FACE,
                {
                    backgroundColor: surface,
                    opacity: pressed ? 0.96 : 1,
                    transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
                },
                neumorphicLift3D('card'),
                ]}
                onPress={() => {
                  const next = column.rows
                    .flatMap((row) => [row.left, row.right])
                    .find((candidate) => !session.usedQuestionIds.has(candidate.id));
                  if (!next) return;
                  selectQuestion(next);
                  router.replace('/play/question');
                }}
                accessibilityRole="button"
                accessibilityLabel={column.categoryName}
            >
                <View style={styles.pictureInner}>
                {picture ? (
                    <Image source={picture} style={styles.pictureImage} contentFit="cover" transition={120} />
                ) : (
                    <View style={styles.pictureFallbackFill}>
                        <Ionicons name="image-outline" size={24} color="rgba(51, 51, 51, 0.1)" />
                    </View>
                )}
                </View>
                <View style={styles.categoryTitleContainer}>
                    <Text
                        style={[
                            styles.categoryTitleText,
                            { color: textPrimary, fontSize: compact ? 9 : 10 },
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                    >
                        {column.categoryName.toUpperCase()}
                    </Text>
                </View>
            </Pressable>
          </View>

          {/* Right Column */}
          <View style={styles.railColumn}>
            {!compact && <Text style={[styles.playableLabel, { color: textMuted }]}>PLAYABLE</Text>}
            <View style={[styles.tileRail, { gap: metrics.innerGap }]}>
                {column.rows.map((row) => (
                    <View key={`R-${row.pointValue}`} style={styles.tileRailSlot}>
                        {renderTile(column, row.right)}
                    </View>
                ))}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const logoWordmarkStyle: any = {
    fontFamily: FONTS.displayBold,
    fontSize: layoutTuning.narrow ? 22 : T.typography.logoWordmark.fontSize,
    letterSpacing: T.typography.logoWordmark.letterSpacing,
    color: T.colors.textPrimary,
    textAlign: 'center',
    textTransform: 'none',
  };

  const logoCaplineStyle: any = {
    fontFamily: FONTS.ui,
    fontSize: layoutTuning.narrow ? 10 : T.typography.logoCapline.fontSize,
    letterSpacing: layoutTuning.narrow ? 2.5 : T.typography.logoCapline.letterSpacing,
    color: T.colors.textPrimary,
    textAlign: 'center',
    marginTop: 2,
    textTransform: 'uppercase',
  };

  const boardHeader = (
    <View
      style={[
        styles.headerSideBar,
        {
          [blankSide]: 0,
          paddingTop: Math.max(insets.top, 16),
          paddingBottom: Math.max(insets.bottom, 16),
          width: sidebarWidth,
          borderRightWidth: blankSide === 'left' ? StyleSheet.hairlineWidth : 0,
          borderLeftWidth: blankSide === 'right' ? StyleSheet.hairlineWidth : 0,
          borderColor: 'rgba(0,0,0,0.05)',
        },
      ]}
    >
        <Pressable
            onPress={leaveMatch}
            accessibilityRole="button"
            accessibilityLabel={t('play.boardExit')}
            style={({ pressed }) => [
                styles.headerSquircleInner,
                PLASTIC_FACE,
                {
                    backgroundColor: T.colors.surface,
                    borderRadius: 99,
                    opacity: pressed ? 0.94 : 1,
                    transform: pressed ? [{ scale: 0.94 }] : [{ scale: 1 }],
                },
                neumorphicLift3D('header'),
            ]}
        >
            <Ionicons name="log-out-outline" size={24} color={T.colors.textPrimary} />
        </Pressable>
    </View>
  );

  const footerPadBottom = height < 520 ? 2 : SPACING.xs;
  const footerCompact = innerWidth < 560;
  const activeTeam = session?.teams.find((team) => team.id === activeTeamId) ?? null;

  const boardFooter = (
    <View style={[styles.footerStripOuter, { paddingBottom: footerPadBottom }]}>
        <View
          style={[
            styles.footerRow,
            { flexDirection: footerRowDir, gap: SPACING.md },
          ]}
        >
          {session.teams.map((team, teamIndex) => {
            const slots = lifelineSlotsForTeam(team.id, session.config);
            const isCurrentTurn = Boolean(session.currentTeamId && team.id === session.currentTeamId);
            const a11yLabel = [
              team.name,
              t('common.points', { count: team.score }),
              t('play.boardLifelines'),
              isCurrentTurn ? t('play.boardCurrentTurnA11y') : '',
            ]
              .filter(Boolean)
              .join(', ');

            return (
              <Pressable
                key={team.id}
                onPress={() => setActiveTeamId(team.id)}
                style={[
                  styles.scoreCard,
                  PLASTIC_FACE,
                  {
                      backgroundColor: T.colors.surface,
                      opacity: isCurrentTurn ? 1 : 0.85,
                      transform: isCurrentTurn ? [{ scale: 1 }] : [{ scale: 0.96 }],
                  },
                  neumorphicLift3D('score'),
                ]}
                accessibilityState={isCurrentTurn ? { selected: true } : undefined}
                accessibilityRole="button"
                accessibilityLabel={`${a11yLabel}. Open team details`}
                hitSlop={8}
              >
                  {isCurrentTurn && (
                      <View style={[styles.turnIndicator, { backgroundColor: T.colors.accentGlow || '#FFB411' }]} />
                  )}

                  <View style={styles.scoreContent}>
                      <View style={styles.scoreIdentity}>
                          <Text
                            style={[
                                styles.scoreTeamName,
                                { color: T.colors.textPrimary },
                            ]}
                            numberOfLines={1}
                          >
                            {team.name.toUpperCase()}
                          </Text>
                          <Text
                            style={[
                              styles.scoreValue,
                              {
                                color: T.colors.textPrimary,
                                fontSize: metrics.scoreFont + 4,
                              },
                            ]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                          >
                            {team.score}
                          </Text>
                      </View>

                      <View
                        style={[styles.lifelineStack, { flexDirection: footerRowDir }]}
                      >
                        {slots.map((id, i) => (
                          <View
                            key={`${team.id}-${id}-${i}`}
                            style={[
                              styles.scoreLifelineIcon,
                              {
                                width: metrics.lifelineIconBox + 2,
                                height: metrics.lifelineIconBox + 2,
                                backgroundColor: isCurrentTurn ? 'rgba(51, 51, 51, 0.05)' : 'rgba(0,0,0,0.02)',
                              },
                            ]}
                          >
                            <Ionicons name={lifelineGlyph(id)} size={metrics.lifelineIcon + 2} color={T.colors.textPrimary} />
                          </View>
                        ))}
                      </View>
                  </View>
              </Pressable>
            );
          })}
        </View>
    </View>
  );

  return (
    <>
      <PlayScaffold
        title={t('play.questionBoardTitle')}
        backgroundColor={T.colors.canvas}
        customHeader={<View />}
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
      {boardHeader}
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

      <View style={{ flex: 1, [blankSide === 'left' ? 'paddingLeft' : 'paddingRight']: sidebarWidth }}>
        <ScrollView
            style={[styles.gridScroll, { backgroundColor: T.colors.canvas }]}
            contentContainerStyle={[
            styles.gridScrollContent,
            {
                paddingBottom: Math.max(insets.bottom, SPACING.sm) + SPACING.md,
            },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            bounces
        >
        {session.mode === 'random' ? (
          <View style={[styles.randomWrap, { minHeight: Math.max(220, height * 0.4) }]}>
            <Pressable
              style={({ pressed }) => [
                styles.randomButton,
                PLASTIC_FACE,
                {
                  backgroundColor: T.colors.surface,
                  paddingHorizontal: SPACING.lg,
                  opacity: pressed ? 0.88 : 1,
                },
                neumorphicLift3D('pill'),

              ]}
              onPress={() => {
                const randomQuestion = getRandomRemainingQuestion(session.board, session.usedQuestionIds);
                if (!randomQuestion) return;
                selectQuestion(randomQuestion);
                router.replace('/play/question');
              }}
              disabled={!remaining.length}
            >
              <Text style={[styles.randomButtonText, { color: T.colors.textPrimary, fontSize: FONT_SIZES.lg, fontFamily: FONTS.displayBold }]}>
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
                    paddingHorizontal: metrics.gridGap,
                    marginBottom: metrics.gridGap,
                  },
                ]}
              >
                {row.map((col) => categoryCell(col))}
                {row.length < gridColumnCount
                  ? Array.from({ length: gridColumnCount - row.length }).map((_, ei) => (
                      <View key={`empty-${ri}-${ei}`} style={styles.gridCellSpacer} />
                    ))
                  : null}
              </View>
            ))}
          </View>
        )}
        </ScrollView>
      </View>
      {activeTeam ? (
        <View style={styles.teamModalRoot} accessibilityViewIsModal>
          <Pressable
            style={styles.teamModalBackdrop}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            onPress={() => setActiveTeamId(null)}
          />
          <View style={[styles.teamModalCard, PLASTIC_FACE, neumorphicLift3D('tile')]}>
            <Text style={styles.teamModalTitle} numberOfLines={1}>
              {activeTeam.name.toUpperCase()}
            </Text>
            <Text style={styles.teamModalScore}>
              {t('common.points', { count: activeTeam.score })}
            </Text>
            <View style={styles.teamModalButtonsRow}>
              {lifelineSlotsForTeam(activeTeam.id, session.config).map((id, idx) => (
                <Pressable
                  key={`${activeTeam.id}-modal-${id}-${idx}`}
                  accessibilityRole="button"
                  accessibilityLabel={id}
                  style={({ pressed }) => [
                    styles.teamModalLifelineButton,
                    {
                      opacity: pressed ? 0.82 : 1,
                      transform: pressed ? [{ scale: 0.96 }] : [{ scale: 1 }],
                    },
                  ]}
                >
                  <Ionicons name={lifelineGlyph(id)} size={22} color={T.colors.textPrimary} />
                </Pressable>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              onPress={() => setActiveTeamId(null)}
              style={({ pressed }) => [
                styles.teamModalCloseBtn,
                { opacity: pressed ? 0.82 : 1 },
              ]}
            >
              <Text style={styles.teamModalCloseText}>{t('common.close')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      </PlayScaffold>
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
  headerSideBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    zIndex: 100,
    backgroundColor: 'rgba(250, 249, 246, 0.65)',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  sideBarLogoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sideBarTokenContainer: {
    paddingBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
  },
  boardHeader: {
    width: '100%',
    flexShrink: 0,
  },
  hubTopBar: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
    minHeight: 40,
  },
  footerStripOuter: {
    width: '100%',
    paddingHorizontal: SPACING.md,
    marginTop: -SPACING.sm,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 0,
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
  headerSquircleInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreCard: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    paddingHorizontal: SPACING.sm,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  turnIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  scoreContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  scoreIdentity: {
    flex: 1,
    gap: 2,
  },
  scoreTeamName: {
    fontFamily: FONTS.uiBold,
    fontSize: 10,
    letterSpacing: 1,
    opacity: 0.6,
  },
  scoreValue: {
    fontFamily: FONTS.displayBold,
  },
  lifelineStack: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  scoreLifelineIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  teamModalRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 160,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    backgroundColor: 'rgba(250, 249, 246, 0.45)',
  },
  teamModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  teamModalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: T.colors.surface,
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  teamModalTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: FONT_SIZES.lg,
    color: T.colors.textPrimary,
    letterSpacing: 0.8,
  },
  teamModalScore: {
    fontFamily: FONTS.uiSemibold,
    fontSize: FONT_SIZES.md,
    color: T.colors.textPrimary,
  },
  teamModalButtonsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  teamModalLifelineButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(51, 51, 51, 0.06)',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(51, 51, 51, 0.12)',
  },
  teamModalCloseBtn: {
    marginTop: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  teamModalCloseText: {
    fontFamily: FONTS.uiBold,
    fontSize: FONT_SIZES.sm,
    color: T.colors.textPrimary,
    letterSpacing: 0.6,
  },
  gridScroll: {
    flex: 1,
  },
  gridScrollContent: {
    paddingTop: 0,
    paddingBottom: SPACING.md,
  },
  gridBleed: {
    width: '100%',
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  gridCellSpacer: {
    flex: 1,
  },
  categoryBlock: {
    flex: 1,
    minWidth: 0,
  },
  categoryTriplet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: 8,
  },
  railColumn: {
    alignItems: 'center',
    gap: 4,
  },
  playableLabel: {
    fontSize: 7,
    fontFamily: FONTS.uiBold,
    letterSpacing: 0.5,
    opacity: 0.6,
  },
  tileRail: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  tileRailSlot: {
    width: 54,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileWrapper: {
    position: 'relative',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  pointTile: {
    width: '85%',
    height: '85%',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointTileText: {
    fontFamily: FONTS.displayBold,
    textAlign: 'center',
  },
  centralCardWrapper: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  pictureFrame: {
    width: '100%',
    aspectRatio: 0.75,
    borderRadius: 20,
    overflow: 'hidden',
  },
  pictureInner: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.02)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pictureImage: {
    width: '100%',
    height: '100%',
  },
  pictureFallbackFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  categoryTitleContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 4,
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(51,51,51,0.05)',
  },
  categoryTitleText: {
    fontFamily: FONTS.displayBold,
    fontSize: 10,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  randomWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  randomButton: {
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  randomButtonText: {
    letterSpacing: 1,
  },
});
