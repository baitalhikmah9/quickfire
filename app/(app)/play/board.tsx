import { useEffect, useMemo } from 'react';
import { Alert, View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { BORDER_RADIUS, FONT_SIZES, SPACING } from '@/constants';
import { getCategoryBoardAccent, getCategoryPictureSource } from '@/constants/categoryPictures';
import { getRandomRemainingQuestion } from '@/features/play/data';
import type { QuestionCard } from '@/features/shared';
import { PlayScaffold } from '@/features/play/components/PlayScaffold';
import { HorizontalPlayEdgeBlurs } from '@/features/play/components/HorizontalPlayEdgeBlurs';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';
import { usePlayStore } from '@/store/play';

interface BoardRow {
  pointValue: number;
  left: QuestionCard;
  right: QuestionCard;
}

function getBoardColumnWidth(screenWidth: number, screenHeight: number): number {
  const visibleColumns =
    screenWidth >= 1560 ? 7
      : screenWidth >= 1320 ? 6
        : screenWidth >= 1080 ? 5
          : screenWidth >= 860 ? 4
            : 3;

  const boardGutter = screenWidth >= 1100 ? SPACING.md : SPACING.sm;
  const horizontalChrome =
    screenHeight < 480 ? 44 : screenWidth >= 1100 ? 80 : 52;
  const available = Math.max(280, screenWidth - horizontalChrome);
  const raw = Math.floor((available - boardGutter * (visibleColumns - 1)) / visibleColumns);
  const minW = screenHeight < 450 ? 120 : 140;
  const maxW = screenHeight < 520 ? 252 : 292;
  return Math.max(minW, Math.min(maxW, raw));
}

type BoardDensity = {
  headerPaddingV: number;
  headerPaddingH: number;
  pictureInset: number;
  rowMinHeight: number;
  tileMinHeight: number;
  rowsGap: number;
  rowsPadding: number;
  titleFontSize: number;
  titleLineHeight: number;
  tileFontSize: number;
  bannerPaddingV: number;
  bannerPaddingH: number;
  cardBorderWidth: number;
  randomButtonMinH: number;
  randomTitleSize: number;
  fallbackLetterSize: number;
};

function getBoardDensity(screenHeight: number): BoardDensity {
  if (screenHeight < 400) {
    return {
      headerPaddingV: 4,
      headerPaddingH: SPACING.xs,
      pictureInset: 2,
      rowMinHeight: 22,
      tileMinHeight: 22,
      rowsGap: 2,
      rowsPadding: 2,
      titleFontSize: 10,
      titleLineHeight: 13,
      tileFontSize: 10,
      bannerPaddingV: SPACING.xs,
      bannerPaddingH: SPACING.sm,
      cardBorderWidth: 1,
      randomButtonMinH: 44,
      randomTitleSize: FONT_SIZES.md,
      fallbackLetterSize: 22,
    };
  }
  if (screenHeight < 520) {
    return {
      headerPaddingV: 6,
      headerPaddingH: SPACING.sm,
      pictureInset: 2,
      rowMinHeight: 26,
      tileMinHeight: 24,
      rowsGap: 3,
      rowsPadding: 4,
      titleFontSize: 11,
      titleLineHeight: 14,
      tileFontSize: 11,
      bannerPaddingV: SPACING.sm,
      bannerPaddingH: SPACING.md,
      cardBorderWidth: 1,
      randomButtonMinH: 48,
      randomTitleSize: FONT_SIZES.lg,
      fallbackLetterSize: 26,
    };
  }
  if (screenHeight < 640) {
    return {
      headerPaddingV: 8,
      headerPaddingH: SPACING.sm,
      pictureInset: 3,
      rowMinHeight: 30,
      tileMinHeight: 28,
      rowsGap: SPACING.xs,
      rowsPadding: SPACING.xs,
      titleFontSize: FONT_SIZES.xs,
      titleLineHeight: 15,
      tileFontSize: FONT_SIZES.xs,
      bannerPaddingV: SPACING.sm,
      bannerPaddingH: SPACING.md,
      cardBorderWidth: 2,
      randomButtonMinH: 52,
      randomTitleSize: FONT_SIZES.lg,
      fallbackLetterSize: 28,
    };
  }
  return {
    headerPaddingV: 10,
    headerPaddingH: SPACING.sm,
    pictureInset: 3,
    rowMinHeight: 34,
    tileMinHeight: 32,
    rowsGap: SPACING.xs,
    rowsPadding: SPACING.xs,
    titleFontSize: FONT_SIZES.xs,
    titleLineHeight: 15,
    tileFontSize: FONT_SIZES.xs,
    bannerPaddingV: SPACING.md,
    bannerPaddingH: SPACING.md,
    cardBorderWidth: 2,
    randomButtonMinH: 56,
    randomTitleSize: FONT_SIZES.lg,
    fallbackLetterSize: 30,
  };
}

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

export default function PlayBoardScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const colors = useTheme();
  const { getTextStyle, t } = useI18n();
  const session = usePlayStore((state) => state.session);
  const selectQuestion = usePlayStore((state) => state.selectQuestion);
  const confirmRandomWagerQuestion = usePlayStore((state) => state.confirmRandomWagerQuestion);

  const density = useMemo(() => getBoardDensity(height), [height]);

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
  const columnWidth = useMemo(() => getBoardColumnWidth(width, height), [width, height]);
  const edgeBlurWidth = useMemo(
    () => Math.round(Math.min(56, Math.max(28, width * 0.042))),
    [width]
  );
  const boardGap = width >= 1100 ? SPACING.md : SPACING.sm;
  const boardContentWidth = useMemo(() => {
    if (grouped.length === 0) return 0;
    return grouped.length * columnWidth + Math.max(0, grouped.length - 1) * boardGap;
  }, [grouped.length, columnWidth, boardGap]);
  const centerBoardInViewport = boardContentWidth > 0 && boardContentWidth < width - 4;

  if (!session) {
    return <PlayScaffold title={t('common.loading')}><Text>{t('common.loading')}</Text></PlayScaffold>;
  }

  const wager = session.wager;
  const remaining = session.board.filter((question) => !session.usedQuestionIds.has(question.id));

  const renderTile = (question: QuestionCard) => {
    const used = session.usedQuestionIds.has(question.id);
    return (
      <Pressable
        style={({ pressed }) => [
          styles.tile,
          {
            minHeight: density.tileMinHeight,
            borderRadius: BORDER_RADIUS.sm,
            backgroundColor: used ? colors.boardCellUsed : colors.primary,
            opacity: used ? 0.52 : pressed ? 0.84 : 1,
          },
        ]}
        onPress={() => {
          if (used) return;
          selectQuestion(question);
          router.replace('/(app)/play/question');
        }}
        disabled={used}
        accessibilityRole="button"
        accessibilityState={{ disabled: used }}
        accessibilityLabel={`${question.pointValue} points`}
      >
        <Text
          style={[
            styles.tileText,
            getTextStyle(question.locale, 'bodyBold', 'center'),
            {
              fontSize: density.tileFontSize,
              lineHeight: density.tileFontSize + 4,
            },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {used ? 'USED' : question.pointValue}
        </Text>
      </Pressable>
    );
  };

  return (
    <PlayScaffold
      title={t('play.questionBoardTitle')}
      onBack={() =>
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
        ])
      }
      showHud
      scoreHudDense
      session={session}
      bodyScrollEnabled={false}
      bodyFrame={false}
      bodyEdgeToEdge
    >
      {wager ? (
        <View
          style={[
            styles.banner,
            {
              backgroundColor: `${colors.secondary}15`,
              borderColor: `${colors.secondary}40`,
              paddingVertical: density.bannerPaddingV,
              paddingHorizontal: density.bannerPaddingH,
              borderWidth: density.cardBorderWidth,
            },
          ]}
        >
          <Text style={[styles.bannerTitle, { color: colors.text }, getTextStyle(undefined, 'bodyBold', 'start')]}>
            {t('play.wagerModeTitle')}
          </Text>
          <Text style={[styles.bannerCopy, { color: colors.textSecondary }, getTextStyle()]}>
            {t('play.wagerModeBody', {
              wageringTeam:
                session.teams.find((team) => team.id === wager.wageringTeamId)?.name ??
                t('common.teamOne'),
              targetTeam:
                session.teams.find((team) => team.id === wager.targetTeamId)?.name ??
                t('common.teamTwo'),
            })}
          </Text>
        </View>
      ) : null}

      {session.mode === 'random' ? (
        <View style={styles.boardBleed}>
          <View style={styles.randomWrap}>
            <Pressable
              style={({ pressed }) => [
                styles.randomButton,
                {
                  backgroundColor: colors.primary,
                  minHeight: density.randomButtonMinH,
                  paddingHorizontal: density.bannerPaddingH,
                },
                pressed && styles.pressed,
              ]}
              onPress={() => {
                const randomQuestion = getRandomRemainingQuestion(session.board, session.usedQuestionIds);
                if (!randomQuestion) return;
                selectQuestion(randomQuestion);
                router.replace('/(app)/play/question');
              }}
              disabled={!remaining.length}
            >
              <Text
                style={[
                  styles.randomButtonText,
                  getTextStyle(undefined, 'bodyBold', 'center'),
                  { fontSize: density.randomTitleSize },
                ]}
              >
                {remaining.length ? t('play.drawRandomQuestion') : t('play.noQuestionsLeft')}
              </Text>
            </Pressable>
          </View>
          <HorizontalPlayEdgeBlurs stripWidth={edgeBlurWidth} />
        </View>
      ) : (
        <View style={styles.boardBleed}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.boardScroll}
            contentContainerStyle={[
              styles.boardScrollContent,
              {
                gap: boardGap,
                minHeight: '100%',
                justifyContent: centerBoardInViewport ? 'center' : 'flex-start',
              },
            ]}
          >
            {grouped.map((column) => {
            const accent = getCategoryBoardAccent(column.categoryId);
            const picture = getCategoryPictureSource(column.categoryId);
            return (
              <View
                key={column.categoryId}
                style={[
                  styles.categoryCard,
                  {
                    width: columnWidth,
                    alignSelf: 'stretch',
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.primary,
                    borderWidth: density.cardBorderWidth,
                  },
                ]}
              >
                <View
                  style={[
                    styles.categoryHeader,
                    {
                      paddingVertical: density.headerPaddingV,
                      paddingHorizontal: density.headerPaddingH,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.columnTitle,
                      getTextStyle(column.rows[0]?.left.locale ?? 'en', 'bodyBold', 'center'),
                      {
                        color: colors.text,
                        fontSize: density.titleFontSize,
                        lineHeight: density.titleLineHeight,
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {column.categoryName}
                  </Text>
                </View>

                <View
                  style={[
                    styles.categoryTriplet,
                    {
                      flex: 1,
                      minHeight: 0,
                      gap: density.rowsGap,
                      padding: density.rowsPadding,
                    },
                  ]}
                >
                  <View style={[styles.tileColumn, { gap: density.rowsGap }]}>
                    {column.rows.map((row) => (
                      <View
                        key={`L-${row.pointValue}`}
                        style={[styles.tileColumnSlot, { minHeight: density.rowMinHeight }]}
                      >
                        {renderTile(row.left)}
                      </View>
                    ))}
                  </View>

                  <View
                    style={[
                      styles.pictureFrame,
                      {
                        padding: density.pictureInset,
                        backgroundColor: colors.primary,
                        borderRadius: BORDER_RADIUS.md,
                      },
                    ]}
                  >
                    {picture ? (
                      <Image
                        source={picture}
                        style={styles.pictureFrameImage}
                        contentFit="cover"
                        transition={120}
                      />
                    ) : (
                      <View style={[styles.pictureFallback, { backgroundColor: `${accent}28` }]}>
                        <Text
                          style={[
                            styles.pictureFallbackText,
                            { color: accent, fontSize: density.fallbackLetterSize },
                          ]}
                        >
                          {column.categoryName.charAt(0)}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={[styles.tileColumn, { gap: density.rowsGap }]}>
                    {column.rows.map((row) => (
                      <View
                        key={`R-${row.pointValue}`}
                        style={[styles.tileColumnSlot, { minHeight: density.rowMinHeight }]}
                      >
                        {renderTile(row.right)}
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            );
          })}
          </ScrollView>
          <HorizontalPlayEdgeBlurs stripWidth={edgeBlurWidth} />
        </View>
      )}
    </PlayScaffold>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: BORDER_RADIUS.lg,
    flexShrink: 0,
  },
  bannerTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    marginBottom: 4,
  },
  bannerCopy: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  boardBleed: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    position: 'relative',
    overflow: 'hidden',
  },
  randomWrap: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'center',
  },
  randomButton: {
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  randomButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  boardScroll: {
    flex: 1,
    minHeight: 0,
  },
  boardScrollContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
    flexGrow: 1,
    paddingVertical: 2,
    paddingHorizontal: SPACING.lg,
  },
  categoryCard: {
    flexShrink: 0,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  categoryHeader: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTriplet: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  tileColumn: {
    flex: 1,
    minWidth: 0,
  },
  tileColumnSlot: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs,
  },
  pictureFrame: {
    flex: 1.25,
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden',
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  pictureFrameImage: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    borderRadius: BORDER_RADIUS.sm,
  },
  pictureFallback: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.sm,
  },
  pictureFallbackText: {
    fontWeight: '800',
  },
  columnTitle: {
    fontWeight: '800',
    textAlign: 'center',
  },
  tile: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs,
  },
  tileText: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  pressed: {
    opacity: 0.82,
  },
});
