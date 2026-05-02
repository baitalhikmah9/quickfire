import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, View, Text, StyleSheet, ScrollView, useWindowDimensions, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable } from '@/components/ui/Pressable';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { HubTokenChip } from '@/components/HubTokenChip';
import { BORDER_RADIUS, FONT_SIZES, LAYOUT, SPACING } from '@/constants';
import { SHOW_HOT_SEAT_UI } from '@/constants/featureFlags';
import { FONTS } from '@/constants/theme';
import { getCategoryPictureSource } from '@/constants/categoryPictures';
import { getRandomRemainingQuestion } from '@/features/play/data';
import type { GameConfig, LifelineId, QuestionCard } from '@/features/shared';
import { PlayMatchTopBar } from '@/features/play/components/PlayMatchTopBar';
import { PlayScaffold } from '@/features/play/components/PlayScaffold';
import { WagerInfoModal } from '@/features/play/components/WagerInfoModal';
import { SOFT_SURFACE_FACE, softSurfaceLift } from '@/features/play/styles/softSurface';
import { getRowDirection } from '@/lib/i18n/direction';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';
import { usePlayStore } from '@/store/play';
import { HOME_SOFT_UI } from '@/themes';

const T = HOME_SOFT_UI;

/** Topic art is a portrait tile: same width as the layout cap, extra height for the illustration. */
const TOPIC_ART_HEIGHT_RATIO = 1.18;

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

/** Keeps each topic column wide enough for rails + art + gaps — drops from 3→2→1 cols on narrow widths. */
function clampGridColumns(
  preferredCols: number,
  innerWidth: number,
  gridGap: number,
  categoryCount: number
): number {
  if (categoryCount <= 0) return 1;
  const rowPadding = gridGap * 2;
  const usableRow = Math.max(0, innerWidth - rowPadding);
  /** Minimum space per topic cell before we reduce column count — must fit long category titles. */
  const MIN_CELL = 200;
  let cols = Math.min(preferredCols, categoryCount);
  while (cols > 1) {
    const cell = (usableRow - gridGap * (cols - 1)) / cols;
    if (cell >= MIN_CELL) break;
    cols -= 1;
  }
  return Math.max(1, cols);
}

function computeTopicFit(
  innerWidth: number,
  m: BoardMetrics,
  cols: number
): { topicImageSize: number; railWidth: number; artGap: number } {
  const rowPadding = m.gridGap * 2;
  const usableRow = Math.max(0, innerWidth - rowPadding);
  const safeCols = Math.max(1, cols);
  const cellWidth = (usableRow - m.gridGap * (safeCols - 1)) / safeCols;
  const railW = Math.min(58, Math.max(36, Math.round(cellWidth * 0.22)));
  const artGap = Math.min(m.topicArtGap, Math.max(4, Math.round(cellWidth * 0.045)));
  const reserved = railW * 2 + artGap * 2 + 14;
  const maxImg = Math.floor(cellWidth - reserved);
  const topicImageSize = Math.max(48, Math.min(m.topicImageSize, maxImg));
  return { topicImageSize, railWidth: railW, artGap };
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
  /** Square topic illustration — rails align to this height cluster (title sits below). */
  topicImageSize: number;
  /** Horizontal gap between point rail and central image. */
  topicArtGap: number;
  /** Vertical gap between stacked point pills. */
  pointRailGap: number;
  /** Bottom inset so brand raised-tile shadow (y=4) is not clipped by parent overflow. */
  pointRailClipBleed: number;
  topicTitleFont: number;
};

function getBoardMetrics(screenHeight: number, screenWidth: number): BoardMetrics {
  const micro = screenHeight < 400 || screenWidth < 520;
  const compact = screenHeight < 560;
  return {
    gridGap: micro ? 8 : compact ? 12 : 20,
    cellBorder: micro ? 1 : 2,
    innerGap: micro ? 2 : compact ? 6 : 10,
    tileFont: micro ? 13 : compact ? 14 : 16,
    titleOnImage: micro ? 8 : compact ? 9 : 11,
    scoreFont: micro ? 14 : compact ? 16 : 18,
    lifelineIcon: micro ? 10 : compact ? 12 : 14,
    lifelineIconBox: micro ? 18 : compact ? 20 : 24,
    topicImageSize: micro ? 100 : compact ? 116 : 132,
    topicArtGap: micro ? 8 : compact ? 12 : 14,
    pointRailGap: micro ? 8 : compact ? 10 : 12,
    pointRailClipBleed: micro ? 6 : 8,
    topicTitleFont: micro ? 12 : compact ? 13 : 14,
  };
}

type RandomQuestionSelectorProps = {
  title: string;
  body: string;
  actionLabel?: string;
  disabled?: boolean;
  isRolling: boolean;
  onAction?: () => void;
};

function RandomQuestionSelector({
  title,
  body,
  actionLabel,
  disabled = false,
  isRolling,
  onAction,
}: RandomQuestionSelectorProps) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 950,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 950,
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => {
      loop.stop();
      shimmer.stopAnimation();
    };
  }, [shimmer]);

  const warmScale = shimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.94, 1.08, 0.94],
  });
  const coolScale = shimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1.04, 0.92, 1.04],
  });
  const highlightShift = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-26, 26],
  });
  const rollingOpacity = shimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.42, 0.9, 0.42],
  });

  return (
    <View testID="random-question-selector" style={styles.randomSelectorShell}>
      <View style={[styles.randomSelectorCard, PLASTIC_FACE, neumorphicLift3D('card')]}>
        <View style={styles.randomSelectorVisual}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.randomSelectorGlow,
              {
                opacity: rollingOpacity,
                transform: [{ translateX: highlightShift }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.randomSelectorOrb,
              styles.randomSelectorOrbWarm,
              { transform: [{ scale: warmScale }] },
            ]}
          />
          <Animated.View
            style={[
              styles.randomSelectorOrb,
              styles.randomSelectorOrbCool,
              { transform: [{ scale: coolScale }] },
            ]}
          />
          <View style={styles.randomSelectorTrack}>
            <View style={[styles.randomSelectorPill, styles.randomSelectorPillWarm]} />
            <View style={[styles.randomSelectorPill, styles.randomSelectorPillGold]} />
            <View style={[styles.randomSelectorPill, styles.randomSelectorPillCool]} />
          </View>
        </View>

        <View style={styles.randomSelectorCopy}>
          <Text style={styles.randomSelectorTitle}>{title}</Text>
          <Text style={styles.randomSelectorBody}>{body}</Text>
        </View>

        {actionLabel ? (
          <Pressable
            testID="random-question-selector-action"
            disabled={disabled || isRolling || !onAction}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            accessibilityState={{ disabled: disabled || isRolling || !onAction }}
            onPress={onAction}
            style={({ pressed }) => [
              styles.randomSelectorButton,
              PLASTIC_FACE,
              neumorphicLift3D('pill'),
              {
                opacity: disabled || isRolling ? 0.48 : pressed ? 0.88 : 1,
              },
            ]}
          >
            <Text style={styles.randomSelectorButtonText}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
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
  const selectorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [randomSelectorState, setRandomSelectorState] = useState<'idle' | 'rolling'>('idle');
  const [showExitModal, setShowExitModal] = useState(false);
  const [wagerInfoOpen, setWagerInfoOpen] = useState(false);
  const [hotSeatInfoOpen, setHotSeatInfoOpen] = useState(false);

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

  const clearSelectorTimeout = useCallback(() => {
    if (selectorTimeoutRef.current) {
      clearTimeout(selectorTimeoutRef.current);
      selectorTimeoutRef.current = null;
    }
  }, []);

  const startRandomSelection = useCallback(
    (mode: 'random' | 'wager') => {
      if (!session || randomSelectorState === 'rolling') {
        return;
      }

      clearSelectorTimeout();
      setRandomSelectorState('rolling');
      selectorTimeoutRef.current = setTimeout(() => {
        if (mode === 'random') {
          const randomQuestion = getRandomRemainingQuestion(session.board, session.usedQuestionIds);
          if (randomQuestion) {
            selectQuestion(randomQuestion);
          } else {
            setRandomSelectorState('idle');
          }
        } else {
          confirmRandomWagerQuestion();
        }
        selectorTimeoutRef.current = null;
      }, 1150);
    },
    [
      clearSelectorTimeout,
      confirmRandomWagerQuestion,
      randomSelectorState,
      selectQuestion,
      session,
    ]
  );

  useEffect(() => {
    return () => {
      clearSelectorTimeout();
    };
  }, [clearSelectorTimeout]);

  const showWagerSelector = Boolean(session?.wager && !session.wager.question);

  useEffect(() => {
    if (showWagerSelector) {
      startRandomSelection('wager');
      return;
    }

    if (session?.step !== 'board') {
      clearSelectorTimeout();
      setRandomSelectorState('idle');
    }
  }, [clearSelectorTimeout, session?.step, showWagerSelector, startRandomSelection]);

  const grouped = useMemo(() => (session ? groupBoardTrivia(session) : []), [session]);
  const metrics = useMemo(() => getBoardMetrics(height, width), [height, width]);
  const padXEarly = Math.max(insets.left, LAYOUT.screenGutter) + Math.max(insets.right, LAYOUT.screenGutter);
  const innerWidthEarly = Math.max(0, width - padXEarly);
  const preferredGridCols = useMemo(
    () => getGridColumnCount(session?.mode ?? 'classic', grouped.length),
    [session?.mode, grouped.length]
  );
  const gridColumnCount = useMemo(
    () =>
      grouped.length === 0
        ? preferredGridCols
        : clampGridColumns(preferredGridCols, innerWidthEarly, metrics.gridGap, grouped.length),
    [preferredGridCols, innerWidthEarly, metrics.gridGap, grouped.length]
  );
  const gridRows = useMemo(() => chunkColumns(grouped, gridColumnCount), [grouped, gridColumnCount]);
  const topicFit = useMemo(
    () => computeTopicFit(innerWidthEarly, metrics, gridColumnCount),
    [innerWidthEarly, metrics, gridColumnCount]
  );

  const padX = Math.max(insets.left, LAYOUT.screenGutter) + Math.max(insets.right, LAYOUT.screenGutter);
  const innerWidth = Math.max(0, width - padX);
  const bodyPadLeft = Math.max(insets.left, LAYOUT.screenGutter);
  const bodyPadRight = Math.max(insets.right, LAYOUT.screenGutter);

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

  const toggleExitModal = () => setShowExitModal((prev) => !prev);

  if (!session) {
    return <PlayScaffold title={t('common.loading')}><Text>{t('common.loading')}</Text></PlayScaffold>;
  }

  const activeTeam =
    activeTeamId == null ? undefined : session.teams.find((team) => team.id === activeTeamId);

  const wager = session.wager;
  const remaining = session.board.filter((question) => !session.usedQuestionIds.has(question.id));
  const formattedTokens = tokens.toLocaleString(uiLocale, { maximumFractionDigits: 0 });

  const renderTile = (column: CategoryColumn, question: QuestionCard) => {
    const used = session.usedQuestionIds.has(question.id);
    const textMuted = T.colors.textMuted;
    return (
      <Pressable
        style={({ pressed }) => [
          styles.topicPointPill,
          topicFit.railWidth <= 52 && styles.topicPointPillTight,
          SOFT_SURFACE_FACE,
          softSurfaceLift(),
          {
            opacity: used ? 0.45 : pressed ? 0.9 : 1,
            transform: pressed && !used ? [{ scale: 0.97 }] : [{ scale: 1 }],
          },
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
            styles.topicPointPillText,
            {
              fontSize: metrics.tileFont,
              color: used ? textMuted : T.colors.textPrimary,
              textDecorationLine: used ? 'line-through' : 'none',
              opacity: used ? 0.55 : 1,
            },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {question.pointValue}
        </Text>
      </Pressable>
    );
  };

  const categoryCell = (column: (typeof grouped)[0]) => {
    const picture = getCategoryPictureSource(column.categoryId);
    const textPrimary = T.colors.textPrimary;
    const imgW = topicFit.topicImageSize;
    const imgH = Math.round(imgW * TOPIC_ART_HEIGHT_RATIO);

    return (
      <View key={column.categoryId} style={styles.categoryBlock}>
        <View style={[styles.topicArtRow, { gap: topicFit.artGap }]}>
          <View
            style={[
              styles.topicPointRail,
              { width: topicFit.railWidth, gap: metrics.pointRailGap, paddingBottom: metrics.pointRailClipBleed },
            ]}
          >
            {column.rows.map((row) => (
              <View key={`L-${row.pointValue}`}>{renderTile(column, row.left)}</View>
            ))}
          </View>

          <View style={styles.topicCenterBlock}>
            <Pressable
              style={({ pressed }) => [
                styles.topicImageFrame,
                {
                  width: imgW,
                  height: imgH,
                  opacity: pressed ? 0.96 : 1,
                  transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
                },
                PLASTIC_FACE,
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
              <View style={styles.topicImageInner}>
                {picture ? (
                  <Image
                    source={picture}
                    style={styles.topicImageFill}
                    contentFit="contain"
                    transition={120}
                  />
                ) : (
                  <View style={styles.pictureFallbackFill}>
                    <Ionicons name="image-outline" size={24} color="rgba(15, 23, 42, 0.15)" />
                  </View>
                )}
              </View>
            </Pressable>

            <View style={styles.topicTitleRow}>
                <Text
                  style={[
                    styles.topicTitleText,
                    {
                      color: textPrimary,
                      fontSize: metrics.topicTitleFont,
                      lineHeight: Math.round(metrics.topicTitleFont * 1.35),
                    },
                  ]}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {column.categoryName.toUpperCase()}
                </Text>
            </View>
          </View>

          <View
            style={[
              styles.topicPointRail,
              { width: topicFit.railWidth, gap: metrics.pointRailGap, paddingBottom: metrics.pointRailClipBleed },
            ]}
          >
            {column.rows.map((row) => (
              <View key={`R-${row.pointValue}`}>{renderTile(column, row.right)}</View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const boardHeader = (
    <PlayMatchTopBar
      session={session}
      onLogoPress={toggleExitModal}
      onWagerInfoPress={session.config.wagerEnabled ? () => setWagerInfoOpen(true) : undefined}
      onHotSeatInfoPress={SHOW_HOT_SEAT_UI ? () => setHotSeatInfoOpen(true) : undefined}
    />
  );

  return (
    <View style={[styles.rootContainer, { backgroundColor: T.colors.canvas }]}>
      <PlayScaffold
        title={t('play.questionBoardTitle')}
        backgroundColor={T.colors.canvas}
        customHeader={boardHeader}
        onBack={leaveMatch}
        showHud={false}
        session={session}
        footer={null}
        footerBare
        footerDense
        footerAboveBody
        bodyScrollEnabled={false}
        bodyFrame={false}
        bodyEdgeToEdge
        contentSafeAreaHorizontal={false}
      >
        {wager && !showWagerSelector ? (
          <View
            style={[
              styles.banner,
              {
                backgroundColor: `${colors.secondary}15`,
                borderColor: `${colors.secondary}40`,
                paddingVertical: SPACING.sm,
                paddingLeft: bodyPadLeft + SPACING.md,
                paddingRight: bodyPadRight + SPACING.md,
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
          style={[styles.gridScroll, { backgroundColor: T.colors.canvas }]}
          contentContainerStyle={[
            styles.gridScrollContent,
            {
              paddingLeft: bodyPadLeft + metrics.gridGap,
              paddingRight: bodyPadRight + metrics.gridGap,
              gap: metrics.gridGap,
              paddingBottom: Math.max(insets.bottom, SPACING.sm) + SPACING.md,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          bounces
        >
          {showWagerSelector ? (
            <RandomQuestionSelector
              title={t('play.wagerSelectorTitle')}
              body={t('play.wagerSelectorBody', {
                wageringTeam:
                  session.teams.find((team) => team.id === wager?.wageringTeamId)?.name ??
                  t('common.teamOne'),
                targetTeam:
                  session.teams.find((team) => team.id === wager?.targetTeamId)?.name ??
                  t('common.teamTwo'),
              })}
              isRolling
            />
          ) : session.mode === 'random' ? (
            <RandomQuestionSelector
              title={
                randomSelectorState === 'rolling'
                  ? t('play.randomSelectorRollingTitle')
                  : t('play.randomSelectorIdleTitle')
              }
              body={
                randomSelectorState === 'rolling'
                  ? t('play.randomSelectorRollingBody')
                  : t('play.randomSelectorIdleBody')
              }
              actionLabel={remaining.length ? t('play.randomSelectorAction') : t('play.noQuestionsLeft')}
              disabled={!remaining.length}
              isRolling={randomSelectorState === 'rolling'}
              onAction={() => startRandomSelection('random')}
            />
          ) : (
            <>
              {gridRows.map((row, ri) => (
                <View
                  key={`row-${ri}`}
                  style={[styles.gridRow, { gap: metrics.gridGap }]}
                >
                  {row.map((col) => categoryCell(col))}
                  {row.length < gridColumnCount
                    ? Array.from({ length: gridColumnCount - row.length }).map((_, ei) => (
                        <View key={`empty-${ri}-${ei}`} style={styles.gridCellSpacer} />
                      ))
                    : null}
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </PlayScaffold>

      {showExitModal && (
        <View style={styles.modalRoot} accessibilityViewIsModal>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setShowExitModal(false)}
          />
          <View style={[styles.modalCard, PLASTIC_FACE]}>
             <Text style={styles.modalTitle}>EXIT GAME?</Text>
             <Text style={styles.modalBody}>Are you sure you want to exit the current match?</Text>
             <View style={styles.modalButtonsRow}>
                <Pressable 
                    onPress={leaveMatch}
                    style={({ pressed }) => [
                        styles.exitConfirmButton,
                        { opacity: pressed ? 0.8 : 1 }
                    ]}
                >
                    <Text style={styles.exitConfirmButtonText}>EXIT GAME</Text>
                </Pressable>
                <Pressable 
                    onPress={() => setShowExitModal(false)}
                    style={({ pressed }) => [
                        styles.exitCancelButton,
                        { opacity: pressed ? 0.8 : 1 }
                    ]}
                >
                    <Text style={styles.exitCancelButtonText}>CANCEL</Text>
                </Pressable>
             </View>
          </View>
        </View>
      )}

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

      <WagerInfoModal visible={wagerInfoOpen} onClose={() => setWagerInfoOpen(false)} />

      {SHOW_HOT_SEAT_UI && hotSeatInfoOpen ? (
        <View accessibilityViewIsModal style={styles.hotSeatInfoOverlay} testID="board-hot-seat-info-overlay">
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setHotSeatInfoOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          />
          <View style={[styles.hotSeatInfoCard, PLASTIC_FACE, neumorphicLift3D('card')]}>
            <Text
              style={[styles.modalTitle, { color: T.colors.textPrimary }, getTextStyle(undefined, 'display', 'center')]}
            >
              {t('play.hotSeatInfoTitle')}
            </Text>
            <Text style={[styles.modalBody, { color: T.colors.textMuted }, getTextStyle()]}>
              {t('play.hotSeatInfoBody')}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
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
    flexGrow: 1,
    width: '100%',
    minWidth: 0,
    paddingTop: 0,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    width: '100%',
  },
  gridCellSpacer: {
    flex: 1,
  },
  categoryBlock: {
    flex: 1,
    minWidth: 0,
    maxWidth: '100%',
  },
  /** Illustration + category title — grows to full width between rails; stretches vertically with the rail column (topicArtRow alignItems stretch). */
  topicCenterBlock: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    alignSelf: 'stretch',
    minWidth: 0,
    minHeight: 0,
    gap: SPACING.xs,
  },
  /** Rails + illustration — side rails fixed width; center flexes horizontally and stretches to row height. */
  topicArtRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
  },
  topicPointRail: {
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'stretch',
    minHeight: 1,
  },
  topicPointPill: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Platform.OS === 'android' ? 10 : 11,
    paddingHorizontal: 12,
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  topicPointPillTight: {
    paddingHorizontal: 7,
    minHeight: 38,
    paddingVertical: Platform.OS === 'android' ? 8 : 9,
  },
  topicPointPillText: {
    fontFamily: FONTS.displayBold,
    textAlign: 'center',
    letterSpacing: -0.25,
  },
  topicImageFrame: {
    flexShrink: 0,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    alignSelf: 'center',
    flexGrow: 0,
  },
  topicImageInner: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicImageFill: {
    width: '100%',
    height: '100%',
  },
  pictureFallbackFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  topicTitleRow: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: SPACING.xs,
    paddingTop: 2,
    alignSelf: 'stretch',
    width: '100%',
    maxWidth: '100%',
  },
  topicTitleText: {
    fontFamily: FONTS.displayBold,
    textAlign: 'center',
    letterSpacing: 0.35,
    textTransform: 'uppercase',
    width: '100%',
    flexShrink: 1,
  },
  rootContainer: {
    flex: 1,
  },
  hotSeatInfoOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 55,
    elevation: 55,
    backgroundColor: 'rgba(51, 51, 51, 0.45)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  hotSeatInfoCard: {
    borderRadius: 42,
    backgroundColor: T.colors.surface,
    padding: SPACING.xl,
    maxWidth: 340,
    width: '100%',
    alignSelf: 'center',
  },
  modalRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(51, 51, 51, 0.45)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: '90%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.lg,
  },
  modalTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 22,
    color: '#333333',
    textAlign: 'center',
  },
  modalBody: {
    fontFamily: FONTS.ui,
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
  },
  exitConfirmButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    borderRadius: 16,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  exitConfirmButtonText: {
    fontFamily: FONTS.uiBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  exitCancelButton: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  exitCancelButtonText: {
    fontFamily: FONTS.uiBold,
    fontSize: 14,
    color: '#333333',
  },
  randomSelectorShell: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  randomSelectorCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 32,
    backgroundColor: T.colors.surface,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.lg,
  },
  randomSelectorVisual: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 108,
    overflow: 'hidden',
  },
  randomSelectorGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 180, 17, 0.18)',
  },
  randomSelectorTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 2,
  },
  randomSelectorPill: {
    width: 56,
    height: 16,
    borderRadius: 999,
  },
  randomSelectorPillWarm: {
    backgroundColor: '#FFB411',
  },
  randomSelectorPillGold: {
    backgroundColor: '#FFD65A',
  },
  randomSelectorPillCool: {
    backgroundColor: '#41C98C',
  },
  randomSelectorOrb: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    opacity: 0.9,
  },
  randomSelectorOrbWarm: {
    top: 10,
    left: 58,
    backgroundColor: 'rgba(255, 180, 17, 0.18)',
  },
  randomSelectorOrbCool: {
    right: 58,
    bottom: 12,
    backgroundColor: 'rgba(65, 201, 140, 0.18)',
  },
  randomSelectorCopy: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  randomSelectorTitle: {
    fontFamily: FONTS.uiBold,
    fontSize: 14,
    letterSpacing: 1.2,
    color: T.colors.textPrimary,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  randomSelectorBody: {
    fontFamily: FONTS.ui,
    fontSize: 14,
    lineHeight: 20,
    color: T.colors.textMuted,
    textAlign: 'center',
  },
  randomSelectorButton: {
    minWidth: 220,
    minHeight: 58,
    paddingHorizontal: SPACING.xl,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.colors.surface,
  },
  randomSelectorButtonText: {
    fontFamily: FONTS.displayBold,
    fontSize: FONT_SIZES.md,
    letterSpacing: 0.8,
    color: T.colors.textPrimary,
    textAlign: 'center',
  },
});
