import { useEffect, useMemo } from 'react';
import { Alert, View, Text, StyleSheet, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { BORDER_RADIUS, FONT_SIZES, SPACING } from '@/constants';
import { getCategoryBoardAccent, getCategoryPictureSource } from '@/constants/categoryPictures';
import { getRandomRemainingQuestion } from '@/features/play/data';
import type { QuestionCard } from '@/features/shared';
import { PlayScaffold } from '@/features/play/components/PlayScaffold';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';
import { usePlayStore } from '@/store/play';

interface BoardRow {
  pointValue: number;
  left: QuestionCard;
  right: QuestionCard;
}

function getBoardColumnWidth(screenWidth: number): number {
  const visibleColumns =
    screenWidth >= 1560 ? 7
      : screenWidth >= 1320 ? 6
        : screenWidth >= 1080 ? 5
          : screenWidth >= 860 ? 4
            : 3;

  const boardGutter = screenWidth >= 1100 ? SPACING.md : SPACING.sm;
  const horizontalChrome = screenWidth >= 1100 ? 84 : 60;
  const available = Math.max(320, screenWidth - horizontalChrome);
  const raw = Math.floor((available - boardGutter * (visibleColumns - 1)) / visibleColumns);
  return Math.max(152, Math.min(232, raw));
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
  const { width } = useWindowDimensions();
  const colors = useTheme();
  const { getTextStyle, t } = useI18n();
  const session = usePlayStore((state) => state.session);
  const selectQuestion = usePlayStore((state) => state.selectQuestion);
  const confirmRandomWagerQuestion = usePlayStore((state) => state.confirmRandomWagerQuestion);

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
  const columnWidth = useMemo(() => getBoardColumnWidth(width), [width]);

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
        <Text style={[styles.tileText, getTextStyle(question.locale, 'bodyBold', 'center')]}> 
          {used ? 'USED' : question.pointValue}
        </Text>
      </Pressable>
    );
  };

  return (
    <PlayScaffold
      title={t('play.questionBoardTitle')}
      subtitle={
        session.mode === 'random'
          ? t('play.randomBoardSubtitle')
          : t('play.questionBoardSubtitle')
      }
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
      session={session}
    >
      {wager ? (
        <View style={[styles.banner, { backgroundColor: `${colors.secondary}15`, borderColor: `${colors.secondary}40` }]}> 
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
        <View style={styles.randomWrap}>
          <Pressable
            style={({ pressed }) => [
              styles.randomButton,
              { backgroundColor: colors.primary },
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
            <Text style={[styles.randomButtonText, getTextStyle(undefined, 'bodyBold', 'center')]}> 
              {remaining.length ? t('play.drawRandomQuestion') : t('play.noQuestionsLeft')}
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.boardScroll}
          contentContainerStyle={[
            styles.boardScrollContent,
            { gap: width >= 1100 ? SPACING.md : SPACING.sm },
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
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.categoryHero}>
                  {picture ? (
                    <Image source={picture} style={styles.categoryImage} contentFit="cover" transition={120} />
                  ) : (
                    <View style={[styles.categoryFallback, { backgroundColor: `${accent}20` }]}> 
                      <Text style={[styles.categoryFallbackText, { color: accent }]}> 
                        {column.categoryName.charAt(0)}
                      </Text>
                    </View>
                  )}

                  <View style={styles.heroScrim} />
                  <View style={[styles.heroAccent, { backgroundColor: accent }]} />

                  <Text
                    style={[styles.columnTitle, getTextStyle(column.rows[0]?.left.locale ?? 'en', 'bodyBold', 'center')]}
                    numberOfLines={2}
                  >
                    {column.categoryName}
                  </Text>
                </View>

                <View style={styles.rowsWrap}>
                  {column.rows.map((row) => (
                    <View key={row.pointValue} style={[styles.pointsRow, { borderColor: `${colors.border}AA` }]}> 
                      <View style={styles.tileSlot}>{renderTile(row.left)}</View>
                      <View style={[styles.rowDivider, { backgroundColor: `${colors.border}D9` }]} />
                      <View style={styles.tileSlot}>{renderTile(row.right)}</View>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </PlayScaffold>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 2,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
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
  randomWrap: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'center',
  },
  randomButton: {
    minHeight: 56,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  randomButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  boardScroll: {
    flex: 1,
    minHeight: 0,
  },
  boardScrollContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: 2,
  },
  categoryCard: {
    flexShrink: 0,
    alignSelf: 'stretch',
    borderWidth: 2,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  categoryHero: {
    position: 'relative',
    height: 86,
    justifyContent: 'flex-end',
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.sm,
    overflow: 'hidden',
  },
  categoryImage: {
    ...StyleSheet.absoluteFillObject,
  },
  categoryFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryFallbackText: {
    fontSize: 30,
    fontWeight: '800',
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  heroAccent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
  },
  columnTitle: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.xs,
    lineHeight: 15,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  rowsWrap: {
    flex: 1,
    padding: SPACING.xs,
    gap: SPACING.xs,
  },
  pointsRow: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  tileSlot: {
    flex: 1,
  },
  rowDivider: {
    width: 1,
  },
  tile: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  tileText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.xs,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  pressed: {
    opacity: 0.82,
  },
});
