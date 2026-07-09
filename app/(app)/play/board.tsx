import { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Alert, View, Text, StyleSheet, useWindowDimensions, Platform, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Pressable } from '@/components/ui/Pressable';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { HubTokenChip } from '@/components/HubTokenChip';
import { BORDER_RADIUS, BREAKPOINTS, COLORS, FONT_SIZES, LAYOUT, SPACING } from '@/constants';
import { SHOW_HOT_SEAT_UI } from '@/constants/featureFlags';
import { FONTS } from '@/constants/theme';
import {
  getCategoryPictureSource,
  MISSING_CATEGORY_PICTURE_LABEL,
} from '@/constants/categoryPictures';
import { computeBoardVerticalLayout } from '@/features/play/boardLayout';
import { getRandomRemainingQuestion } from '@/features/play/data';
import {
  RANDOM_FLASH_GREEN,
  RANDOM_FLASH_GREEN_TEXT,
  RANDOM_FLASH_OFF_MS,
  RANDOM_FLASH_ON_MS,
  buildRandomFlashSequence,
  type RandomPickMode,
} from '@/features/play/randomQuestionFlash';
import type { GameConfig, LifelineId, QuestionCard } from '@/features/shared';
import { PlayMatchTopBar } from '@/features/play/components/PlayMatchTopBar';
import { PlayScaffold } from '@/features/play/components/PlayScaffold';
import { WagerInfoModal } from '@/features/play/components/WagerInfoModal';
import { getPlaySurfaceColors } from '@/features/play/playSurfaceColors';
import { SOFT_SURFACE_FACE, softSurfaceLift } from '@/features/play/styles/softSurface';
import { hapticSuccess, hapticTick } from '@/lib/haptics';
import { getRowDirection } from '@/lib/i18n/direction';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';
import { usePlayStore } from '@/store/play';
import { useThemeStore } from '@/store/theme';
import { abandonGameEntry } from '@/lib/wallet/gameEntry';
import { HOME_SOFT_UI } from '@/themes';
import { getResponsivePlayFontSizes, scaleFont } from '@/utils/responsiveTypography';

const T = HOME_SOFT_UI;

/** Topic art is a portrait tile: same width as the layout cap, extra height for the illustration.
 * Dynamic ratio — tighter on small screens to prevent clipping in native landscape. */
function getTopicArtHeightRatio(screenHeight: number): number {
  if (screenHeight < 420) return 0.98;
  if (screenHeight < 560) return 1.06;
  return 1.18;
}

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
  const usableRow = Math.max(0, innerWidth);
  /** Minimum space per topic cell before we reduce column count — must fit long category titles without abandoning the intended 3x2 board too early. */
  const MIN_CELL = 176;
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
  cols: number,
  screenWidth: number
): {
  cellWidth: number;
  groupWidth: number;
  topicImageSize: number;
  centerWidth: number;
  titleWidth: number;
  titleHeight: number;
  railWidth: number;
  artGap: number;
} {
  const usableRow = Math.max(0, innerWidth);
  const safeCols = Math.max(1, cols);
  const cellWidth = Math.max(1, (usableRow - m.gridGap * (safeCols - 1)) / safeCols);
  // Web wide: use nearly the full cell for art so fill-layout cards stay dense.
  const web = Platform.OS === 'web' && screenWidth >= 900;
  const railWidth = web ? 54 : screenWidth < 620 ? 50 : 56;
  const artGap = web ? 6 : screenWidth < 620 ? 6 : 8;
  const horizontalChrome = railWidth * 2 + artGap * 2;
  const maxCenterWidth = Math.max(56, Math.floor(cellWidth - horizontalChrome));
  const preferredCenterWidth = web
    ? Math.max(160, Math.floor(maxCenterWidth * 0.96))
    : screenWidth < 620
      ? 116
      : 152;
  const centerWidth = Math.max(56, Math.min(preferredCenterWidth, maxCenterWidth));
  const groupWidth = horizontalChrome + centerWidth;
  const topicImageSize = Math.max(48, Math.min(m.topicImageSize, centerWidth));
  // Title tracks art width so long names wrap like phone (not a wider orphan band).
  const titleWidth = Math.min(Math.max(centerWidth, web ? centerWidth : 160), cellWidth);
  const lineHeight = Math.round(m.topicTitleFont * 1.12);
  // Two-line budget — phone-like density; avoids a tall empty title slab under art.
  const titleHeight = Math.max(Math.round(lineHeight * 2.15), Math.round(m.topicTitleFont * 2.2));
  return { cellWidth, groupWidth, topicImageSize, centerWidth, titleWidth, titleHeight, railWidth, artGap };
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
  const tight = screenHeight < 450;
  const roomy = screenHeight >= 680 && screenWidth >= 900;
  const tall = screenHeight >= 820 && screenWidth >= 1000;
  return {
    gridGap: tight ? 8 : micro ? 10 : compact ? 14 : tall ? 30 : roomy ? 26 : 20,
    cellBorder: micro ? 1 : 2,
    innerGap: tight ? 2 : micro ? 2 : compact ? 6 : 10,
    tileFont: tight ? 11 : micro ? 12 : compact ? 14 : roomy ? 18 : 16,
    titleOnImage: tight ? 6 : micro ? 8 : compact ? 9 : 11,
    scoreFont: tight ? 13 : micro ? 14 : compact ? 16 : roomy ? 20 : 18,
    lifelineIcon: tight ? 9 : micro ? 10 : compact ? 12 : 14,
    lifelineIconBox: tight ? 16 : micro ? 18 : compact ? 20 : 24,
    topicImageSize: tight ? 86 : micro ? 96 : compact ? 118 : tall ? 184 : roomy ? 166 : 148,
    topicArtGap: tight ? 5 : micro ? 6 : compact ? 10 : roomy ? 16 : 14,
    pointRailGap: tight ? 5 : micro ? 6 : compact ? 10 : roomy ? 14 : 12,
    pointRailClipBleed: tight ? 3 : micro ? 5 : 8,
    topicTitleFont: tight ? 11 : micro ? 11 : compact ? 13 : roomy ? 16 : 14,
  };
}

type BoardRandomPick = {
  mode: RandomPickMode;
  question: QuestionCard;
  phase: 'flashing' | 'locked';
  flashingId: string | null;
};

export default function PlayBoardScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const { direction, getTextStyle, t, uiLocale } = useI18n();
  useThemeStore((state) => state.paletteId);
  const session = usePlayStore((state) => state.session);
  const tokens = usePlayStore((state) => state.tokens);
  const selectQuestion = usePlayStore((state) => state.selectQuestion);
  const reviewBoardQuestion = usePlayStore((state) => state.reviewBoardQuestion);
  const confirmRandomWagerQuestion = usePlayStore((state) => state.confirmRandomWagerQuestion);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [randomPick, setRandomPick] = useState<BoardRandomPick | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [wagerInfoOpen, setWagerInfoOpen] = useState(false);
  const [hotSeatInfoOpen, setHotSeatInfoOpen] = useState(false);
  const [gridViewport, setGridViewport] = useState({ width: 0, height: 0 });

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

  const showWagerSelector = Boolean(session?.wager && !session.wager.question);
  const remainingQuestions = useMemo(
    () => session?.board.filter((question) => !session.usedQuestionIds.has(question.id) && !question.used) ?? [],
    [session?.board, session?.usedQuestionIds]
  );
  const remainingQuestionCount = remainingQuestions.length;
  const showRandomSelector = session?.mode === 'random' && !showWagerSelector && remainingQuestionCount > 0;
  const usedQuestionKey = useMemo(
    () => (session ? Array.from(session.usedQuestionIds).sort().join('|') : ''),
    [session?.usedQuestionIds]
  );

  const openLockedRandomPick = useCallback(() => {
    if (!randomPick || randomPick.phase !== 'locked') return;
    if (randomPick.mode === 'wager') {
      confirmRandomWagerQuestion(randomPick.question);
    } else {
      selectQuestion(randomPick.question);
    }
    router.replace('/play/question');
  }, [confirmRandomWagerQuestion, randomPick, router, selectQuestion]);

  // Random mode + wager: pre-draw a remaining question, flash available tiles, then lock the winner.
  useEffect(() => {
    if (!session || session.step !== 'board') {
      setRandomPick(null);
      return;
    }

    const mode: RandomPickMode | null = showWagerSelector
      ? 'wager'
      : showRandomSelector
        ? 'random'
        : null;
    if (!mode) {
      setRandomPick(null);
      return;
    }

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const question = getRandomRemainingQuestion(session.board, session.usedQuestionIds);
    if (!question) {
      setRandomPick(null);
      if (mode === 'wager') {
        confirmRandomWagerQuestion();
      }
      return;
    }

    const remainingIds = session.board
      .filter((entry) => !session.usedQuestionIds.has(entry.id) && !entry.used)
      .map((entry) => entry.id);

    setRandomPick({ mode, question, phase: 'flashing', flashingId: null });

    Promise.resolve(AccessibilityInfo.isReduceMotionEnabled())
      .catch(() => false)
      .then((reduceMotion) => {
        if (cancelled) return;
        if (reduceMotion) {
          setRandomPick({ mode, question, phase: 'locked', flashingId: null });
          hapticSuccess();
          return;
        }

        const sequence = buildRandomFlashSequence(remainingIds, question.id);
        let step = 0;

        const finish = () => {
          if (cancelled) return;
          setRandomPick({ mode, question, phase: 'locked', flashingId: null });
          hapticSuccess();
        };

        const flashNext = () => {
          if (cancelled) return;
          if (step >= sequence.length) {
            finish();
            return;
          }
          const flashId = sequence[step]!;
          const isLast = step === sequence.length - 1;
          step += 1;
          setRandomPick({ mode, question, phase: 'flashing', flashingId: flashId });
          hapticTick();
          timers.push(
            setTimeout(() => {
              if (cancelled) return;
              if (isLast) {
                finish();
                return;
              }
              setRandomPick({ mode, question, phase: 'flashing', flashingId: null });
              timers.push(setTimeout(flashNext, RANDOM_FLASH_OFF_MS));
            }, RANDOM_FLASH_ON_MS)
          );
        };

        flashNext();
      });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [
    confirmRandomWagerQuestion,
    session?.id,
    session?.step,
    showRandomSelector,
    showWagerSelector,
    usedQuestionKey,
  ]);

  const grouped = useMemo(() => (session ? groupBoardTrivia(session) : []), [session]);
  const responsiveFontSizes = useMemo(() => getResponsivePlayFontSizes(width, height), [height, width]);
  const metrics = useMemo(() => {
    const baseMetrics = getBoardMetrics(height, width);
    const isWebBoard = Platform.OS === 'web' && width >= BREAKPOINTS.wide;
    // Cap roomy/tall desktop inflation so web board density tracks phone landscape.
    // Web: allow larger preferred art tokens; vertical layout grows them further to fill height.
    const webDense = isWebBoard
      ? {
          gridGap: Math.min(baseMetrics.gridGap, 16),
          topicImageSize: Math.min(Math.max(baseMetrics.topicImageSize, 168), 200),
          topicArtGap: Math.min(baseMetrics.topicArtGap, 12),
          pointRailGap: Math.min(baseMetrics.pointRailGap, 12),
          pointRailClipBleed: Math.min(baseMetrics.pointRailClipBleed, 6),
          tileFont: Math.min(baseMetrics.tileFont, 17),
          topicTitleFont: Math.min(baseMetrics.topicTitleFont, 15),
        }
      : null;
    const topicTitleFont = isWebBoard
      ? scaleFont(18, 15, 22, width, height)
      : scaleFont(20, 18, 26, width, height);
    return {
      ...baseMetrics,
      ...webDense,
      tileFont: isWebBoard
        ? scaleFont(15, 13, 17, width, height)
        : responsiveFontSizes.pointValue,
      topicTitleFont,
      scoreFont: responsiveFontSizes.scoreValue,
    };
  }, [height, responsiveFontSizes, width]);
  const topicArtHeightRatio = useMemo(() => getTopicArtHeightRatio(height), [height]);
  const bodyPadLeft = Math.max(insets.left, LAYOUT.screenGutter);
  const bodyPadRight = Math.max(insets.right, LAYOUT.screenGutter);
  const padX = bodyPadLeft + bodyPadRight;
  const innerWidth = Math.max(0, width - padX);
  const centeredContentMaxWidth =
    width >= BREAKPOINTS.wide ? LAYOUT.playMaxWidth : Math.floor(innerWidth * 0.94);
  const boardLayoutWidth = Math.max(0, Math.min(innerWidth, centeredContentMaxWidth));
  const preferredGridCols = useMemo(
    () => getGridColumnCount(session?.mode ?? 'classic', grouped.length),
    [session?.mode, grouped.length]
  );
  const gridColumnCount = useMemo(() => {
    if (grouped.length === 0) return preferredGridCols;
    if (Platform.OS === 'web' && width >= BREAKPOINTS.wide && grouped.length >= 6) {
      return Math.min(3, grouped.length);
    }
    return clampGridColumns(preferredGridCols, boardLayoutWidth, metrics.gridGap, grouped.length);
  }, [preferredGridCols, boardLayoutWidth, metrics.gridGap, grouped.length, width]);
  const gridRows = useMemo(() => chunkColumns(grouped, gridColumnCount), [grouped, gridColumnCount]);
  const topicFit = useMemo(
    () => computeTopicFit(boardLayoutWidth, metrics, gridColumnCount, width),
    [boardLayoutWidth, metrics, gridColumnCount, width]
  );
  // Equal top/bottom inset so the grid is not flush under the header while the
  // bottom still clears the home indicator / viewport edge.
  const gridEdgePadding =
    Platform.OS === 'web'
      ? SPACING.sm
      : Math.max(insets.bottom, SPACING.xs) + SPACING.sm;
  const gridVerticalPadding = gridEdgePadding * 2;
  const maxQuestionRows = Math.max(1, ...grouped.map((column) => column.rows.length));
  /** Matches topicCenterBlock gap so pill rail targets image + title stack. */
  const topicCenterBlockGap = 2;
  /** Solve the tallest row content that still fits the cell width:
   *   2*tileSide + 2*artGap + artWidth <= cellWidth
   * where tileSide = (R - railChrome) / qRows and artWidth = (R - title - gap) / ratio.
   * Without this, tall web viewports grow square tiles past the rails and overlap art. */
  const railChrome =
    metrics.pointRailGap * Math.max(0, maxQuestionRows - 1) + metrics.pointRailClipBleed;
  const maxRowContentHeight = Math.max(
    railChrome + maxQuestionRows * 24,
    (topicFit.cellWidth -
      2 - // rounding slack (ceil'd rail width)
      2 * topicFit.artGap +
      (2 * railChrome) / maxQuestionRows +
      (topicFit.titleHeight + topicCenterBlockGap) / topicArtHeightRatio) /
      (2 / maxQuestionRows + 1 / topicArtHeightRatio)
  );
  const verticalLayout = useMemo(
    () =>
      computeBoardVerticalLayout({
        viewportHeight: Math.max(1, gridViewport.height),
        gridVerticalPadding,
        gridRowCount: Math.max(1, gridRows.length),
        maxQuestionRows,
        baseGridGap: metrics.gridGap,
        pointRailGap: metrics.pointRailGap,
        pointRailClipBleed: metrics.pointRailClipBleed,
        topicImageSize: topicFit.topicImageSize,
        topicArtHeightRatio,
        titleHeightBudget: topicFit.titleHeight,
        centerBlockGap: topicCenterBlockGap,
        maxRowContentHeight,
      }),
    [
      gridVerticalPadding,
      maxRowContentHeight,
      gridRows.length,
      gridViewport.height,
      maxQuestionRows,
      metrics.gridGap,
      metrics.pointRailClipBleed,
      metrics.pointRailGap,
      topicArtHeightRatio,
      topicCenterBlockGap,
      topicFit.titleHeight,
      topicFit.topicImageSize,
    ]
  );
  const fittedBoardRowHeight = verticalLayout.boardRowHeight;
  /** Side length of each 100/200/300 control — rounded square, not a capsule. */
  const pointTileSize = verticalLayout.pointPillHeight;
  const topicRowGap = verticalLayout.topicRowGap;
  /** Rails must be at least as wide as the square tiles. */
  const pointRailWidth = Math.max(topicFit.railWidth, Math.ceil(pointTileSize));
  /** Actual rendered art width — group and title track it so rails hug the art like phone. */
  const topicArtWidth = Math.max(
    48,
    Math.min(topicFit.centerWidth, Math.floor(verticalLayout.topicImageHeight / topicArtHeightRatio))
  );
  const topicGroupWidth = 2 * (pointRailWidth + topicFit.artGap) + topicArtWidth;
  const topicTitleWidth = Math.min(topicFit.titleWidth, Math.max(topicArtWidth, 120));
  /** Squircle corners (~14pt), never height/2 (that makes a pill). */
  const pointTileRadius = Math.min(14, Math.max(8, Math.round(pointTileSize * 0.18)));
  const handleGridLayout = (event: LayoutChangeEvent) => {
    const { width: nextWidth, height: nextHeight } = event.nativeEvent.layout;
    setGridViewport((current) =>
      current.width === nextWidth && current.height === nextHeight
        ? current
        : { width: nextWidth, height: nextHeight }
    );
  };

  /** Tighter rails + no scroll on small landscape phones so columns and footer are not clipped. */
  const layoutTuning = useMemo(() => {
    const narrow = innerWidth < 720;
    const tight = innerWidth < 600;
    const short = height < 420;
    const rowCount = Math.max(1, gridRows.length);
    /** Dense match header (~32–36px pills + tight chrome); status bar hidden on this screen. */
    const reserved = short ? 96 : 120;
    const avail = Math.max(0, height - insets.bottom - reserved);
    const rowMin = Math.max(60, Math.min(130, Math.floor(avail / rowCount)));
    return {
      narrow,
      pictureFlex: narrow ? 1 : 1.15,
      railFlex: tight ? 0.72 : narrow ? 0.78 : 0.85,
      hubSideMin: tight ? 72 : narrow ? 88 : 120,
      rowMinHeight: rowMin,
    };
  }, [innerWidth, height, insets.bottom, gridRows.length]);

  const refundEntryMutation = useMutation(api.wallet.refundEntry);

  const leaveMatch = () => {
    const performLeave = async () => {
      await abandonGameEntry(refundEntryMutation, {
        reservationId: usePlayStore.getState().entryReservationId,
        reason: 'user_abandoned',
        resetSession: () => usePlayStore.getState().resetSession(),
      });
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
  const formattedTokens = tokens.toLocaleString(uiLocale, { maximumFractionDigits: 0 });
  const surfaceColors = getPlaySurfaceColors();

  const renderTile = (column: CategoryColumn, question: QuestionCard) => {
    const used = session.usedQuestionIds.has(question.id) || question.used;
    const textMuted = T.colors.textMuted;
    const isFlashing = randomPick?.phase === 'flashing' && randomPick.flashingId === question.id;
    const isLocked = randomPick?.phase === 'locked' && randomPick.question.id === question.id;
    const isGreenHighlight = isFlashing || isLocked;
    const randomPickActive = Boolean(randomPick);
    return (
      <Pressable
        testID={isLocked ? 'board-random-pick-locked' : isFlashing ? 'board-random-pick-flashing' : undefined}
        style={({ pressed }) => [
          styles.topicPointTile,
          SOFT_SURFACE_FACE,
          softSurfaceLift(),
          {
            backgroundColor: isGreenHighlight ? RANDOM_FLASH_GREEN : surfaceColors.tileBackground,
            width: pointTileSize,
            height: pointTileSize,
            minHeight: 0,
            minWidth: 0,
            borderRadius: pointTileRadius,
            paddingVertical: 0,
            paddingHorizontal: 0,
            opacity: used ? 0.72 : pressed && !randomPickActive ? 0.9 : 1,
            transform: pressed && !randomPickActive ? [{ scale: 0.97 }] : [{ scale: 1 }],
          },
          isLocked && styles.topicPointTileLocked,
        ]}
        onPress={() => {
          if (used) {
            if (randomPickActive) return;
            reviewBoardQuestion(question);
            router.replace('/play/question');
            return;
          }
          if (randomPick) {
            if (randomPick.phase === 'locked' && randomPick.question.id === question.id) {
              openLockedRandomPick();
            }
            return;
          }
          selectQuestion(question);
          router.replace('/play/question');
        }}
        accessibilityRole="button"
        accessibilityState={{ disabled: randomPickActive && !isLocked, selected: isLocked }}
        accessibilityLabel={
          isLocked
            ? `Selected ${question.pointValue} point question`
            : used
              ? `Review ${question.pointValue} point question`
              : `${question.pointValue} points`
        }
      >
        <Text
          style={[
            styles.topicPointTileText,
            {
              fontSize: Math.min(metrics.tileFont, Math.max(6, pointTileSize * 0.42)),
              lineHeight: Math.round(Math.min(metrics.tileFont, Math.max(6, pointTileSize * 0.42)) * 1.1),
              color: isGreenHighlight ? RANDOM_FLASH_GREEN_TEXT : used ? textMuted : T.colors.textPrimary,
              textDecorationLine: used ? 'line-through' : 'none',
              opacity: used && !isGreenHighlight ? 0.55 : 1,
            },
            Platform.OS === 'web' ? ({ whiteSpace: 'nowrap' } as any) : null,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          ellipsizeMode="clip"
        >
          {question.pointValue}
        </Text>
      </Pressable>
    );
  };

  const categoryCell = (column: (typeof grouped)[0]) => {
    const picture = getCategoryPictureSource(column.categoryId);
    const surfaceColors = getPlaySurfaceColors();
    const textPrimary = surfaceColors.textPrimary;
    // Same image/title heights the pill rail is sized against.
    const titleHeight = verticalLayout.topicTitleHeight;
    const imgH = Math.max(1, Math.round(verticalLayout.topicImageHeight));
    const imgW = Math.max(1, topicArtWidth);
    // Shared starting size from layout; long names shrink via adjustsFontSizeToFit
    // so nothing is ellipsized/cut off within the two-line title band.
    const titleFontSize = Math.min(
      metrics.topicTitleFont,
      Math.max(11, Math.floor(titleHeight / 2.35))
    );

    const railHeight = imgH + topicCenterBlockGap + titleHeight;

    return (
      <View key={column.categoryId} style={[styles.categoryGridCell, { height: fittedBoardRowHeight }]}>
        <View style={[styles.categoryBlock, { width: topicGroupWidth }]}>
          <View style={[styles.topicArtRow, { columnGap: topicFit.artGap }]}>
          <View
            style={[
              styles.topicPointRail,
              {
                width: pointRailWidth,
                gap: metrics.pointRailGap,
                paddingBottom: metrics.pointRailClipBleed,
                // Rail height = image + gap + title so 3 tiles fill that stack.
                height: railHeight,
              },
            ]}
          >
            {column.rows.map((row) => (
              <View key={`L-${row.pointValue}`}>{renderTile(column, row.left)}</View>
            ))}
          </View>

          <View style={[styles.topicCenterBlock, { gap: topicCenterBlockGap }]}>
            <Pressable
              style={({ pressed }) => [
                styles.topicImageFrame,
                height < 420 && styles.topicImageFrameTight,
                {
                  width: imgW,
                  height: imgH,
                  backgroundColor: surfaceColors.topicImageMatte ?? surfaceColors.imageFrameBackground,
                  opacity: pressed ? 0.96 : 1,
                  transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
                },
                PLASTIC_FACE,
                neumorphicLift3D('card'),
              ]}
              onPress={() => {
                if (randomPick) {
                  if (randomPick.phase !== 'locked') return;
                  const hasLocked = column.rows.some(
                    (row) =>
                      row.left.id === randomPick.question.id || row.right.id === randomPick.question.id
                  );
                  if (hasLocked) {
                    openLockedRandomPick();
                  }
                  return;
                }
                const next = column.rows
                  .flatMap((row) => [row.left, row.right])
                  .find((candidate) => !session.usedQuestionIds.has(candidate.id) && !candidate.used);
                if (!next) {
                  const usedQuestion = column.rows
                    .flatMap((row) => [row.left, row.right])
                    .find((candidate) => session.usedQuestionIds.has(candidate.id) || candidate.used);
                  if (usedQuestion) {
                    reviewBoardQuestion(usedQuestion);
                    router.replace('/play/question');
                  }
                  return;
                }
                selectQuestion(next);
                router.replace('/play/question');
              }}
              accessibilityRole="button"
              accessibilityLabel={column.categoryName}
            >
              <View
                style={[
                  styles.topicImageInner,
                  { paddingHorizontal: 0, paddingVertical: 0 },
                ]}
              >
                {picture ? (
                  <Image
                    source={picture}
                    style={styles.topicImageFill}
                    contentFit={surfaceColors.topicImageContentFit}
                    transition={120}
                  />
                ) : (
                  <View style={styles.pictureFallbackFill}>
                    <Text
                      style={[
                        styles.missingPictureLabel,
                        { color: surfaceColors.missingPictureLabelColor },
                      ]}
                      accessibilityLabel={MISSING_CATEGORY_PICTURE_LABEL}
                    >
                      {MISSING_CATEGORY_PICTURE_LABEL}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>

            <View
              style={[
                styles.topicTitleRow,
                { width: topicTitleWidth, height: titleHeight },
              ]}
            >
              <Text
                style={[
                  styles.topicTitleText,
                  {
                    color: textPrimary,
                    fontSize: titleFontSize,
                    // Omit fixed lineHeight so adjustsFontSizeToFit can scale cleanly.
                  },
                  Platform.OS === 'web'
                    ? ({ wordBreak: 'break-word', overflowWrap: 'anywhere' } as any)
                    : null,
                ]}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.55}
              >
                {column.categoryName.toUpperCase()}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.topicPointRail,
              {
                width: pointRailWidth,
                gap: metrics.pointRailGap,
                paddingBottom: metrics.pointRailClipBleed,
                height: railHeight,
              },
            ]}
          >
            {column.rows.map((row) => (
              <View key={`R-${row.pointValue}`}>{renderTile(column, row.right)}</View>
            ))}
          </View>
          </View>
        </View>
      </View>
    );
  };

  const boardHeader = (
    <View style={[styles.headerCenterWrap, { width: boardLayoutWidth, maxWidth: centeredContentMaxWidth }]}>
      <PlayMatchTopBar
        session={session}
        onLogoPress={toggleExitModal}
        onWagerInfoPress={session.config.wagerEnabled ? () => setWagerInfoOpen(true) : undefined}
        onHotSeatInfoPress={SHOW_HOT_SEAT_UI ? () => setHotSeatInfoOpen(true) : undefined}
        showTeamScores={false}
        scorePillsNextToLogo
      />
    </View>
  );

  return (
    <View style={[styles.rootContainer, { backgroundColor: T.colors.canvas }]}>
      {/* Immersive match board: hide system status bar (time / battery / icons) to free vertical space. */}
      <StatusBar hidden />
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
        /** Top edge skipped while status bar is hidden; keep bottom for home-indicator clearance. */
        safeAreaEdges={['bottom']}
        chromeColumnStyle={{
          paddingTop: Platform.OS === 'web' ? 4 : 2,
          paddingBottom: Platform.OS === 'web' ? 4 : 2,
        }}
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

        <View
          onLayout={handleGridLayout}
          style={[
            styles.gridScroll,
            styles.gridScrollContent,
            {
              backgroundColor: T.colors.canvas,
              paddingLeft: bodyPadLeft,
              paddingRight: bodyPadRight,
              gap: topicRowGap,
              paddingTop: gridEdgePadding,
              paddingBottom: gridEdgePadding,
            },
          ]}
        >
          <View
            style={[
              styles.boardCenterContainer,
              {
                width: boardLayoutWidth,
                maxWidth: centeredContentMaxWidth,
                gap: topicRowGap,
              },
            ]}
          >
            {gridRows.map((row, ri) => (
              <View
                key={`row-${ri}`}
                style={[styles.gridRow, { gap: metrics.gridGap, height: fittedBoardRowHeight }]}
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
        </View>
      </PlayScaffold>

      {showExitModal && (
        <View style={styles.modalRoot} accessibilityViewIsModal>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setShowExitModal(false)}
          />
          <View style={[styles.modalCard, PLASTIC_FACE, { backgroundColor: surfaceColors.surface }]}>
             <Text style={[styles.modalTitle, { color: surfaceColors.textPrimary }]}>EXIT GAME?</Text>
             <Text style={[styles.modalBody, { color: surfaceColors.textMuted }]}>Are you sure you want to exit the current match?</Text>
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
                        { backgroundColor: surfaceColors.isDark ? 'rgba(255,255,255,0.12)' : '#F2F2F7', opacity: pressed ? 0.8 : 1 }
                    ]}
                >
                    <Text style={[styles.exitCancelButtonText, { color: surfaceColors.textPrimary }]}>CANCEL</Text>
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
    minHeight: 0,
    overflow: 'hidden',
  },
  gridScrollContent: {
    width: '100%',
    minWidth: 0,
    /** Top/bottom padding applied inline so header gap matches viewport-edge gap. */
    justifyContent: 'flex-start',
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
  categoryGridCell: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    /** Topic block (image + title + rails) centered; leftover row height is breathing room. */
    justifyContent: 'center',
  },
  boardCenterContainer: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    flexGrow: 0,
    flexShrink: 1,
  },
  headerCenterWrap: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },
  categoryBlock: {
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 0,
    maxWidth: '100%',
  },
  /** Illustration + category title — stacked between side rails. */
  topicCenterBlock: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    alignSelf: 'stretch',
    minWidth: 0,
    minHeight: 0,
  },
  /** Rails + illustration — side rails fixed width; center flexes horizontally. */
  topicArtRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
  },
  topicPointRail: {
    flexShrink: 0,
    /** 100/200/300 rounded squares fill image+title height (gaps via style.gap). */
    justifyContent: 'flex-start',
    alignItems: 'center',
    minHeight: 1,
  },
  /** Point value control — rounded square (squircle corners), not a capsule pill. */
  topicPointTile: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 0,
    paddingHorizontal: 0,
    minHeight: 0,
    minWidth: 0,
    borderRadius: 14,
    overflow: 'hidden',
  },
  topicPointTileLocked: {
    shadowColor: RANDOM_FLASH_GREEN,
    shadowOpacity: 0.55,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  topicPointTileText: {
    fontFamily: FONTS.displayBold,
    textAlign: 'center',
    letterSpacing: -0.25,
    width: '100%',
    flexShrink: 0,
  },
  topicImageFrame: {
    flexShrink: 0,
    borderRadius: 20,
    overflow: 'hidden',
    alignSelf: 'center',
    flexGrow: 0,
  },
  topicImageFrameTight: {
    borderRadius: 16,
  },
  topicImageInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicImageFill: {
    width: '100%',
    height: '100%',
    // Mild zoom only — heavy scale crops portraits (e.g. Harry Potter) mid-torso.
    transform: [{ scale: 1.04 }],
  },
  pictureFallbackFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  missingPictureLabel: {
    fontFamily: FONTS.uiBold,
    fontSize: 10,
    letterSpacing: 0.5,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  topicTitleRow: {
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    alignSelf: 'center',
    maxWidth: '100%',
    // Allow adjustsFontSizeToFit to use the full band; avoid clipping mid-scale.
    overflow: 'visible',
  },
  topicTitleText: {
    fontFamily: FONTS.displayBold,
    textAlign: 'center',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    width: '100%',
    height: '100%',
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  rootContainer: {
    flex: 1,
  },
  hotSeatInfoOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 55,
    elevation: 55,
    backgroundColor: COLORS.overlay,
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
    backgroundColor: COLORS.overlay,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: '90%',
    maxWidth: 340,
    borderRadius: 32,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.lg,
  },
  modalTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 22,
    textAlign: 'center',
  },
  modalBody: {
    fontFamily: FONTS.ui,
    fontSize: 16,
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
    borderRadius: 16,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  exitCancelButtonText: {
    fontFamily: FONTS.uiBold,
    fontSize: 14,
  },
});
