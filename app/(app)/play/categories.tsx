import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  useWindowDimensions,
  Platform,
  type ImageStyle,
  type ListRenderItem,
} from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderBackButton } from '@/components/HeaderBackButton';
import { BREAKPOINTS, SPACING, FONTS, FONT_SIZES, LAYOUT, BORDER_RADIUS } from '@/constants';
import {
  getCategoryPictureSource,
  MISSING_CATEGORY_PICTURE_LABEL,
} from '@/constants/categoryPictures';
import { getModeCategoryCount } from '@/features/play/data';
import type { CategoryOption, GameMode } from '@/features/shared';
import { PlayScaffold } from '@/features/play/components/PlayScaffold';
import { isActiveMatchStep, routeForPlayStep } from '@/features/play/sessionRouting';
import { SOFT_SURFACE_STYLES } from '@/features/play/styles/softSurface';
import {
  groupCategoriesBySection,
  type CategorySection,
} from '@/features/play/categorySections';
import { getPlaySurfaceColors } from '@/features/play/playSurfaceColors';
import { showThemedAlert } from '@/store/themedAlert';
import { getRowDirection } from '@/lib/i18n/direction';
import { useI18n } from '@/lib/i18n/useI18n';
import { useDarkModeFlatTop } from '@/lib/hooks/useTheme';
import { isAuthDisabled } from '@/lib/authMode';
import { goBackOrReplace } from '@/lib/navigation/goBackOrReplace';
import {
  consumeGameEntry,
  refundGameEntry,
  reserveGameEntry,
} from '@/lib/wallet/gameEntry';
import { getGameTokenCost } from '@/features/play/tokenCosts';
import { usePlayStore } from '@/store/play';
import { useThemeStore } from '@/store/theme';
import { useResponsivePlayFontSizes } from '@/utils/responsiveTypography';

// ── Grid constants ──────────────────────────────────────────────────────

const WEB_GRID_MAX_WIDTH = LAYOUT.playWideMaxWidth;
const WEB_GRID_GAP = 24;
const NATIVE_GRID_GAP = 16;
const NATIVE_COMPACT_GRID_GAP = 8;
const WEB_GRID_INNER_PAD = 40; // padding inside the max-width container
const WEB_CARD_HEIGHT = 190;
const NATIVE_CARD_ASPECT = 0.82; // Taller cards preserve artwork size across five columns.
const COLS = 5;
const ANDROID_LIST_IMAGE_TRANSITION = 0;
const WEB_LIST_IMAGE_TRANSITION = 200;

type CategoryListItem =
  | {
      kind: 'header';
      id: string;
      title: string;
      sectionWidth: number;
      marginTop: number;
      paddingBottom: number;
    }
  | {
      kind: 'row';
      id: string;
      sectionWidth: number;
      categories: CategoryOption[];
      marginBottom: number;
    };

function buildCategoryListData(
  sections: CategorySection[],
  cols: number,
  cardW: number,
  cardH: number,
  gridGap: number,
  sectionTitleHeight: number
): {
  rows: CategoryListItem[];
  layouts: { length: number; offset: number }[];
  slugToIndex: Map<string, number>;
} {
  const rows: CategoryListItem[] = [];
  const layouts: { length: number; offset: number }[] = [];
  const slugToIndex = new Map<string, number>();
  let offset = SPACING.xs;

  sections.forEach((section, sectionIndex) => {
    const marginTop = sectionIndex > 0 ? SPACING.md : 0;
    const sectionCols = Math.min(cols, section.categories.length);
    const sectionWidth = cardW * sectionCols + gridGap * Math.max(0, sectionCols - 1);

    const headerLength = marginTop + sectionTitleHeight + SPACING.sm;
    rows.push({
      kind: 'header',
      id: `header-${section.id}`,
      title: section.title,
      sectionWidth,
      marginTop,
      paddingBottom: SPACING.sm,
    });
    layouts.push({ length: headerLength, offset });
    offset += headerLength;

    const categoryRows = Math.ceil(section.categories.length / cols);
    for (let rowIndex = 0; rowIndex < categoryRows; rowIndex += 1) {
      const categories = section.categories.slice(rowIndex * cols, rowIndex * cols + cols);
      const listIndex = rows.length;
      for (const category of categories) {
        slugToIndex.set(category.slug, listIndex);
      }

      const isLastRowInSection = rowIndex === categoryRows - 1;
      const marginBottom = isLastRowInSection ? 0 : gridGap;
      const rowLength = cardH + marginBottom;

      rows.push({
        kind: 'row',
        id: `row-${section.id}-${rowIndex}`,
        sectionWidth,
        categories,
        marginBottom,
      });
      layouts.push({ length: rowLength, offset });
      offset += rowLength;
    }
  });

  return { rows, layouts, slugToIndex };
}

interface CategoryCardProps {
  category: CategoryOption;
  selected: boolean;
  disabled: boolean;
  cardW: number;
  cardH: number;
  imageAreaH: number;
  titleBarH: number;
  surface: string;
  textPrimary: string;
  topicTitleSize: number;
  topicImageMatte?: string;
  topicImageContentFit: 'cover' | 'contain';
  missingPictureLabelColor?: string;
  topicLabelBackground: string;
  topicLabelText: string;
  topicLabelBorder: string;
  selectedBorder: string;
  onToggle: (slug: string) => void;
}

const CategoryCard = memo(function CategoryCard({
  category,
  selected,
  disabled,
  cardW,
  cardH,
  imageAreaH,
  titleBarH,
  surface,
  textPrimary,
  topicTitleSize,
  topicImageMatte,
  topicImageContentFit,
  missingPictureLabelColor,
  topicLabelBackground,
  topicLabelText,
  topicLabelBorder,
  selectedBorder,
  onToggle,
}: CategoryCardProps) {
  const imageSource = getCategoryPictureSource(category.id);
  const isAndroid = Platform.OS === 'android';
  const darkModeFlatTop = useDarkModeFlatTop();

  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Select ${category.title}`}
      accessibilityState={{ selected, disabled }}
      onPress={() => onToggle(category.slug)}
      style={({ pressed }) => [
        styles.topicCard,
        {
          width: cardW,
          height: cardH,
          backgroundColor: surface,
          // Keep border width constant so select/deselect never reflows image bounds
          // (Android expo-image blanks when parent layout thrashing or opacity changes).
          borderColor: selected ? selectedBorder : 'transparent',
          // Android: never set opacity on an ancestor of expo-image — it blanks the bitmap.
          // Use scale for press, and a dim overlay for disabled (below).
          ...(isAndroid
            ? { opacity: 1 }
            : { opacity: disabled ? 0.35 : pressed ? 0.94 : 1 }),
          transform: pressed && !disabled ? [{ scale: 0.98 }] : [{ scale: 1 }],
        },
        SOFT_SURFACE_STYLES.face,
        darkModeFlatTop,
        !isAndroid && SOFT_SURFACE_STYLES.raised,
      ]}
    >
      <View
        // Android can collapse/detach image views during parent re-layout; keep the host.
        collapsable={isAndroid ? false : undefined}
        style={[
          styles.cardImageArea,
          { height: imageAreaH, backgroundColor: topicImageMatte ?? surface },
        ]}
      >
        {imageSource ? (
          <Image
            source={imageSource}
            // recyclingKey is for remote URL reuse; local require() + Android recycling
            // has blanked bitmaps on select re-renders. Keep on non-Android only.
            recyclingKey={isAndroid ? undefined : category.slug}
            cachePolicy="memory-disk"
            style={styles.cardImage as ImageStyle}
            contentFit={topicImageContentFit}
            transition={isAndroid ? ANDROID_LIST_IMAGE_TRANSITION : WEB_LIST_IMAGE_TRANSITION}
          />
        ) : (
          <Text
            style={[
              styles.missingPictureLabel,
              { color: missingPictureLabelColor ?? textPrimary },
            ]}
            accessibilityLabel={MISSING_CATEGORY_PICTURE_LABEL}
          >
            {MISSING_CATEGORY_PICTURE_LABEL}
          </Text>
        )}
      </View>

      <View
        testID={`topic-label-${category.slug}`}
        style={[
          styles.cardTitleBar,
          {
            height: titleBarH,
            backgroundColor: topicLabelBackground,
            borderTopColor: topicLabelBorder,
          },
        ]}
      >
        <Text
          style={[
            styles.cardTitle,
            {
              color: topicLabelText,
              fontSize: topicTitleSize,
              lineHeight: Math.round(topicTitleSize * 1.18),
            },
          ]}
          numberOfLines={2}
        >
          {category.title.toUpperCase()}
        </Text>
      </View>

      {selected ? (
        <View style={styles.selectedBadge}>
          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
        </View>
      ) : null}

      {isAndroid && disabled ? (
        <View
          pointerEvents="none"
          style={[styles.disabledDim, { backgroundColor: surface }]}
        />
      ) : null}
    </Pressable>
  );
});

export default function CategorySelectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const categoryListRef = useRef<FlatList<CategoryListItem> | null>(null);
  const { direction, getTextStyle, t } = useI18n();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const fontSizes = useResponsivePlayFontSizes();
  const darkModeFlatTop = useDarkModeFlatTop();

  const session = usePlayStore((state) => state.session);
  const entryReservationId = usePlayStore((state) => state.entryReservationId);
  const setEntryReservationId = usePlayStore((state) => state.setEntryReservationId);
  const commitEntryCharge = usePlayStore((state) => state.commitEntryCharge);
  const ensureDraft = usePlayStore((state) => state.ensureDraft);
  const toggleCategory = usePlayStore((state) => state.toggleCategory);
  const setCategories = usePlayStore((state) => state.setCategories);
  const startBoard = usePlayStore((state) => state.startBoard);
  const { isLoaded, isSignedIn } = useAuth();
  const authDisabled = isAuthDisabled();
  const reserveGameEntryMutation = useMutation(api.wallet.reserveGameEntry);
  const consumeEntryMutation = useMutation(api.wallet.consumeEntry);
  const refundEntryMutation = useMutation(api.wallet.refundEntry);

  useLayoutEffect(() => {
    ensureDraft();
  }, [ensureDraft]);

  // Browser/history back can reopen setup while a match is live - return to the leave-capable match UI.
  useEffect(() => {
    const step = session?.step;
    if (!isActiveMatchStep(step) || !step) return;
    const target = routeForPlayStep(step);
    if (target) {
      router.replace(target);
    }
  }, [router, session?.step]);

  const required = useMemo(() => {
    if (!session) return 0;
    return getModeCategoryCount(
      session.mode as GameMode,
      session.config.quickPlayTopicCount ?? 3
    );
  }, [session]);

  const selectedCategories = useMemo(() => {
    if (!session) return [];
    const categoriesBySlug = new Map(
      session.availableCategories.map((category) => [category.slug, category])
    );
    return (session.selectedCategoryIds ?? [])
      .map((slug) => categoriesBySlug.get(slug))
      .filter((category): category is NonNullable<typeof category> => Boolean(category));
  }, [session]);

  const isWeb = Platform.OS === 'web';
  const useWebLayout = isWeb && windowWidth >= BREAKPOINTS.wide;
  const isLandscape = windowWidth > windowHeight;
  const compactHeader = !useWebLayout && isLandscape;

  // ── Grid dimension calculations ─────────────────────────────────────
  // Always five columns per row as requested.
  const gridGap = useWebLayout
    ? WEB_GRID_GAP
    : windowWidth < 430
      ? NATIVE_COMPACT_GRID_GAP
      : NATIVE_GRID_GAP;
  const gridInnerPad = useWebLayout ? WEB_GRID_INNER_PAD : 0;
  const maxGridW = useWebLayout ? WEB_GRID_MAX_WIDTH : windowWidth;
  const horizontalSafeGutters =
    Math.max(insets.left, LAYOUT.screenGutter) + Math.max(insets.right, LAYOUT.screenGutter);
  const availableGridW = Math.max(COLS, windowWidth - horizontalSafeGutters);

  // Available inner width for the grid:
  //   Web: body width after PlayScaffold safe gutters, clamped to maxGridW, then subtract
  //        the grid's own inner padding so it matches the rendered grid area.
  //   Native: body width after PlayScaffold contentSafeAreaHorizontal gutters.
  const innerW = Math.max(
    COLS,
    Math.min(maxGridW, availableGridW) - (useWebLayout ? gridInnerPad * 2 : 0)
  );

  // Card width fills exactly five columns.
  const cardW = Math.max(
    1,
    Math.min(320, Math.floor((innerW - gridGap * (COLS - 1)) / COLS))
  );

  const cardH = useWebLayout
    ? WEB_CARD_HEIGHT
    : Math.floor(cardW * NATIVE_CARD_ASPECT);
  const imageAreaH = Math.floor(cardH * 0.78);
  const titleBarH = cardH - imageAreaH;

  // ── Handlers ─────────────────────────────────────────────────────────

  const onSelectRandom = () => {
    if (!session) return;
    if ((session.selectedCategoryIds ?? []).length >= required) return;

    const selectedSlugs = new Set(session.selectedCategoryIds ?? []);
    const remainingCategories = session.availableCategories.filter(
      (category) => !selectedSlugs.has(category.slug)
    );
    const randomCategory =
      remainingCategories[Math.floor(Math.random() * remainingCategories.length)];

    if (randomCategory) {
      setCategories([...(session.selectedCategoryIds ?? []), randomCategory.slug]);
    }
  };

  const scrollToCategory = (slug: string) => {
    const index = categorySlugToIndex.get(slug);
    if (index === undefined) return;
    categoryListRef.current?.scrollToIndex({
      index,
      viewOffset: SPACING.sm,
      animated: true,
    });
  };

  const onScrollToIndexFailed = useCallback(
    (info: { index: number; averageItemLength: number }) => {
      categoryListRef.current?.scrollToOffset({
        offset: Math.max(info.averageItemLength * info.index - SPACING.sm, 0),
        animated: false,
      });
      requestAnimationFrame(() => {
        categoryListRef.current?.scrollToIndex({
          index: info.index,
          viewOffset: SPACING.sm,
          animated: true,
        });
      });
    },
    []
  );

  // ── Derived state ─────────────────────────────────────────────────────

  const isLoading = !session;
  const selectedCount = (session?.selectedCategoryIds ?? []).length;
  const isVeryDense = selectedCount >= 5;
  const selectedPillGap = selectedCount >= 5 ? 6 : 10;
  const selectedStripInnerW = Math.max(1, availableGridW - SPACING.sm * 2);
  const selectedPillWidth =
    selectedCount > 0
      ? Math.max(
          1,
          Math.floor(
            (selectedStripInnerW - selectedPillGap * Math.max(0, selectedCount - 1)) /
              selectedCount
          )
        )
      : 0;
  // Subscribe so canvas/surface tokens recompute when the palette changes.
  useThemeStore((state) => state.paletteId);
  const surfaceColors = getPlaySurfaceColors();
  const canvas = surfaceColors.canvas;
  const surface = surfaceColors.surface;
  const textPrimary = surfaceColors.textPrimary;
  const controlBackground = surfaceColors.controlBackground;
  const canChooseRandom = session && selectedCount < required;
  const categorySections = useMemo(
    () => (session ? groupCategoriesBySection(session.availableCategories) : []),
    [session]
  );
  const longestTopicTitleLength = Math.max(
    1,
    ...categorySections.flatMap((section) =>
      section.categories.map((category) => category.title.length)
    )
  );
  const topicTitleSize = Math.max(
    5,
    Math.min(
      fontSizes.topicTitle,
      Math.floor((titleBarH - 4) / (2 * 1.18)),
      Math.floor(((cardW - 12) * 2) / (longestTopicTitleLength * 0.6))
    )
  );
  const sectionTitleHeight = Math.round(fontSizes.subtitle * 1.2);
  const { categoryListRows, categoryItemLayouts, categorySlugToIndex } = useMemo(() => {
    if (!categorySections.length) {
      return {
        categoryListRows: [] as CategoryListItem[],
        categoryItemLayouts: [] as { length: number; offset: number }[],
        categorySlugToIndex: new Map<string, number>(),
      };
    }

    const { rows, layouts, slugToIndex } = buildCategoryListData(
      categorySections,
      COLS,
      cardW,
      cardH,
      gridGap,
      sectionTitleHeight
    );

    return {
      categoryListRows: rows,
      categoryItemLayouts: layouts,
      categorySlugToIndex: slugToIndex,
    };
  }, [cardH, cardW, categorySections, gridGap, sectionTitleHeight]);

  const selectedCategoryIds = useMemo(
    () => session?.selectedCategoryIds ?? [],
    [session?.selectedCategoryIds]
  );

  const handleToggleCategory = useCallback(
    (slug: string) => {
      toggleCategory(slug);
    },
    [toggleCategory]
  );

  const getCategoryItemLayout = useCallback(
    (_data: ArrayLike<CategoryListItem> | null | undefined, index: number) => {
      const layout = categoryItemLayouts[index];
      // VirtualizedList requires `index` on the returned frame. Without it,
      // react-native-web throws: "Should not have to estimate frames when a
      // measurement metrics function is provided".
      if (layout) {
        return { length: layout.length, offset: layout.offset, index };
      }
      return { length: cardH, offset: cardH * index, index };
    },
    [cardH, categoryItemLayouts]
  );

  const renderCategoryListItem: ListRenderItem<CategoryListItem> = useCallback(
    ({ item }) => {
      if (item.kind === 'header') {
        return (
          <View
            style={[
              styles.listItemWrap,
              {
                marginTop: item.marginTop,
                paddingBottom: item.paddingBottom,
                width: item.sectionWidth,
              },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: textPrimary,
                  fontSize: fontSizes.subtitle,
                  height: sectionTitleHeight,
                  width: item.sectionWidth,
                },
              ]}
            >
              {item.title.toUpperCase()}
            </Text>
          </View>
        );
      }

      return (
        <View
          style={[
            styles.listItemWrap,
            { marginBottom: item.marginBottom, width: item.sectionWidth },
          ]}
        >
          <View style={[styles.sectionGrid, { gap: gridGap, width: item.sectionWidth }]}>
            {item.categories.map((category) => {
              const selected = selectedCategoryIds.includes(category.slug);
              const disabled = !selected && selectedCount >= required;

              return (
                <CategoryCard
                  key={category.slug}
                  category={category}
                  selected={selected}
                  disabled={disabled}
                  cardW={cardW}
                  cardH={cardH}
                  imageAreaH={imageAreaH}
                  titleBarH={titleBarH}
                  surface={surface}
                  textPrimary={textPrimary}
                  topicTitleSize={topicTitleSize}
                  topicImageMatte={surfaceColors.topicImageMatte}
                  topicImageContentFit={surfaceColors.topicImageContentFit}
                  missingPictureLabelColor={surfaceColors.missingPictureLabelColor}
                  topicLabelBackground={surfaceColors.topicLabelBackground}
                  topicLabelText={surfaceColors.topicLabelText}
                  topicLabelBorder={surfaceColors.topicLabelBorder}
                  selectedBorder={surfaceColors.selectedBorder}
                  onToggle={handleToggleCategory}
                />
              );
            })}
          </View>
        </View>
      );
    },
    [
      cardH,
      cardW,
      fontSizes.subtitle,
      gridGap,
      handleToggleCategory,
      imageAreaH,
      required,
      sectionTitleHeight,
      selectedCategoryIds,
      selectedCount,
      surface,
      surfaceColors.missingPictureLabelColor,
      surfaceColors.selectedBorder,
      surfaceColors.topicImageContentFit,
      surfaceColors.topicImageMatte,
      surfaceColors.topicLabelBackground,
      surfaceColors.topicLabelBorder,
      surfaceColors.topicLabelText,
      textPrimary,
      titleBarH,
      topicTitleSize,
    ]
  );

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <PlayScaffold
      title={isLoading ? t('common.loading') : ''}
      backgroundColor={canvas}
      bodyFrame={false}
      bodyEdgeToEdge
      bodyScrollEnabled={false}
      contentSafeAreaHorizontal
      chromeColumnStyle={compactHeader ? styles.compactChrome : undefined}
      customHeader={
        isLoading ? null : (
          <View style={[styles.headerWrap, compactHeader && styles.headerWrapCompact]}>
            {/* Header row: back + counter | title | random button */}
            <View style={[styles.headerRow, compactHeader && styles.headerRowCompact]}>
              <View style={styles.headerLeft}>
                <HeaderBackButton
                  onPress={() => goBackOrReplace(router, '/play/team-setup')}
                  direction={direction}
                  rowDirection={getRowDirection(direction)}
                  label={t('common.back')}
                  accessibilityLabel="Back to team setup"
                  variant="icon"
                />
                <View
                  style={[
                    styles.counterBadge,
                    styles.surfaceRaised,
                    SOFT_SURFACE_STYLES.face,
                    darkModeFlatTop,
                    SOFT_SURFACE_STYLES.raised,
                    { backgroundColor: controlBackground },
                  ]}
                >
                  <Text
                    style={[
                      styles.counterText,
                      {
                        color: textPrimary,
                        fontSize: fontSizes.headerButton,
                        lineHeight: Math.round(fontSizes.headerButton * 1.2),
                      },
                    ]}
                  >
                    {selectedCount}/{required}
                  </Text>
                </View>
              </View>

              <View style={styles.headerCenter} pointerEvents="none">
                <Text
                  style={[
                    styles.mainTitle,
                    { color: textPrimary },
                    compactHeader && styles.mainTitleCompact,
                    getTextStyle(undefined, 'displayBold', 'center'),
                    {
                      fontSize: compactHeader
                        ? Math.round(fontSizes.pageTitle * 0.82)
                        : fontSizes.pageTitle,
                      lineHeight: Math.round(
                        (compactHeader
                          ? Math.round(fontSizes.pageTitle * 0.82)
                          : fontSizes.pageTitle) * 1.15
                      ),
                    },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {t('play.pickTopicsTitle').toUpperCase()}
                </Text>
              </View>

              <View style={styles.headerRight}>
                <Pressable
                  onPress={onSelectRandom}
                  disabled={!canChooseRandom}
                  accessibilityRole="button"
                  accessibilityLabel="Choose a random topic"
                  accessibilityState={{ disabled: !canChooseRandom }}
                  style={({ pressed }) => [
                    styles.randomBtn,
                    styles.surfaceRaised,
                    SOFT_SURFACE_STYLES.face,
                    darkModeFlatTop,
                    SOFT_SURFACE_STYLES.raised,
                    {
                      backgroundColor: controlBackground,
                      opacity: !canChooseRandom ? 0.45 : pressed ? 0.9 : 1,
                      transform: pressed && canChooseRandom ? [{ scale: 0.98 }] : [{ scale: 1 }],
                    },
                  ]}
                >
                  <Ionicons name="shuffle-outline" size={18} color={textPrimary} />
                  <Text
                    style={[
                      styles.randomBtnLabel,
                      {
                        color: textPrimary,
                        fontSize: fontSizes.headerButton,
                        lineHeight: Math.round(fontSizes.headerButton * 1.2),
                      },
                    ]}
                    numberOfLines={1}
                  >
                    Random Topic
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Subtitle - compact, directly below title */}
            <Text
              style={[
                styles.subtitle,
                compactHeader && styles.subtitleCompact,
                { color: textPrimary },
                getTextStyle(undefined, 'body', 'center'),
                {
                  fontSize: compactHeader
                    ? Math.round(fontSizes.subtitle * 0.9)
                    : fontSizes.subtitle,
                  lineHeight: Math.round(
                    (compactHeader
                      ? Math.round(fontSizes.subtitle * 0.9)
                      : fontSizes.subtitle) * 1.25
                  ),
                },
              ]}
              numberOfLines={1}
            >
              {t('play.pickTopicsSubtitle', { count: required })}
            </Text>
          </View>
        )
      }
      footer={null}
    >
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <Text style={{ color: textPrimary }}>{t('common.loading')}</Text>
        </View>
      ) : (
        <View style={styles.contentRoot}>
          {/* Selected topics strip - above the grid */}
          {selectedCategories.length > 0 && (
            <View style={styles.selectedStrip}>
              <View
                style={[
                  styles.selectedStripContent,
                  compactHeader && styles.selectedStripContentCompact,
                  { gap: selectedPillGap },
                ]}
              >
                {selectedCategories.map((category) => (
                  <Pressable
                    key={category.slug}
                    onPress={() => scrollToCategory(category.slug)}
                    accessibilityRole="button"
                    accessibilityLabel={`Jump to ${category.title}`}
                    style={({ pressed }) => [
                      styles.selectedTopicPill,
                      compactHeader && styles.selectedTopicPillCompact,
                      SOFT_SURFACE_STYLES.raised,
                      {
                        backgroundColor: controlBackground,
                        opacity: pressed ? 0.85 : 1,
                        width: selectedPillWidth,
                      },
                      isVeryDense && styles.selectedPillVeryDense,
                    ]}
                  >
                    <Text
                      style={[
                        styles.selectedPillText,
                        isVeryDense && styles.selectedPillTextDense,
                        {
                          color: textPrimary,
                          fontSize: fontSizes.headerButton,
                          lineHeight: Math.round(fontSizes.headerButton * 1.2),
                        },
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {category.title.toUpperCase()}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${category.title}`}
                      // Extra hit area without adding visual inset past the right padding.
                      hitSlop={8}
                      onPress={() => toggleCategory(category.slug)}
                      style={({ pressed }) => [
                        isVeryDense ? styles.selectedPillCloseDense : styles.selectedPillClose,
                        { opacity: pressed ? 0.55 : 1 },
                      ]}
                    >
                      <Ionicons
                        name="close"
                        size={isVeryDense ? 14 : 16}
                        color={textPrimary}
                      />
                    </Pressable>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Topic grid */}
          <View style={styles.gridContainer}>
            <FlatList
              ref={categoryListRef}
              data={categoryListRows}
              keyExtractor={(item) => item.id}
              renderItem={renderCategoryListItem}
              getItemLayout={getCategoryItemLayout}
              onScrollToIndexFailed={onScrollToIndexFailed}
              showsVerticalScrollIndicator={false}
              initialNumToRender={8}
              maxToRenderPerBatch={10}
              windowSize={7}
              removeClippedSubviews={false}
              contentContainerStyle={[
                styles.gridScrollContent,
                useWebLayout && styles.gridScrollContentWeb,
                { paddingBottom: 160 },
              ]}
              style={[
                styles.categoryList,
                useWebLayout && { maxWidth: WEB_GRID_MAX_WIDTH, alignSelf: 'center' as const },
              ]}
            />
          </View>
        </View>
      )}

      {/* Floating action: "START BOARD" */}
      {isLoading || selectedCount !== required ? null : (
        <View
          style={[
            styles.floatingPanel,
            { bottom: Math.max(insets.bottom, SPACING.lg) },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('play.startBoard')}
            onPress={async () => {
              if (!session) return;

              const tokenCost = getGameTokenCost(
                session.mode,
                session.config.quickPlayTopicCount
              );

              // Lock in + spend only once topics are chosen and the board starts.
              let reservationId = entryReservationId;
              if (!authDisabled && isLoaded && isSignedIn) {
                if (!reservationId) {
                  const reservation = await reserveGameEntry(reserveGameEntryMutation, {
                    mode: session.mode,
                    clientSessionId: session.id,
                    cost: tokenCost,
                  });
                  if (!reservation.ok) {
                    showThemedAlert(t('play.needTokens'));
                    return;
                  }
                  reservationId = reservation.reservationId;
                  setEntryReservationId(reservationId);
                }
              }

              const result = startBoard();
              if (!result.ok) {
                if (reservationId && !authDisabled && isLoaded && isSignedIn) {
                  await refundGameEntry(refundEntryMutation, {
                    reservationId,
                    reason: 'start_board_failed',
                  }).catch(() => {});
                  setEntryReservationId(null);
                }
                showThemedAlert(result.error ?? t('play.needTokens'));
                return;
              }

              if (!authDisabled && isLoaded && isSignedIn && reservationId) {
                const consumed = await consumeGameEntry(consumeEntryMutation, {
                  reservationId,
                  completedSessionId: usePlayStore.getState().session?.id ?? '',
                }).catch(() => ({ ok: false as const, error: 'network' }));
                // Only a real balance failure blocks entry; stale reservation states
                // (already consumed/refunded from a previous run) are non-fatal.
                if (!consumed.ok && consumed.error === 'insufficient_balance') {
                  showThemedAlert(t('play.needTokens'));
                  return;
                }
              }
              commitEntryCharge();
              setEntryReservationId(null);
              router.replace('/(app)/play/board');
            }}
            style={({ pressed }) => [
              styles.startBtn,
              styles.surfaceRaised,
              SOFT_SURFACE_STYLES.face,
              darkModeFlatTop,
              SOFT_SURFACE_STYLES.raised,
              {
                backgroundColor: surface,
                opacity: pressed ? 0.92 : 1,
              },
            ]}
          >
            <Text style={[styles.startBtnText, { color: textPrimary }]}>
              {t('play.startBoard').toUpperCase()}
            </Text>
          </Pressable>
        </View>
      )}
    </PlayScaffold>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  compactChrome: {
    // Keep shared HEADER top pad; only tighten bottom on short viewports.
    paddingBottom: 0,
  },
  // ── Header ──────────────────────────────────────────────────────────
  headerWrap: {
    width: '100%',
    paddingTop: 0,
    paddingBottom: 0,
    gap: 0,
  },
  headerWrapCompact: {
    paddingTop: 0,
  },
  headerRow: {
    position: 'relative',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerRowCompact: {
    minHeight: 44,
    gap: SPACING.xs,
  },
  headerLeft: {
    zIndex: 2,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  headerCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xs,
  },
  headerRight: {
    zIndex: 2,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginLeft: 'auto',
  },
  mainTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: FONT_SIZES.lg,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    textAlign: 'center',
    maxWidth: '46%',
  },
  mainTitleCompact: {
    fontSize: FONT_SIZES.sm,
    letterSpacing: 1.2,
  },
  subtitle: {
    fontFamily: FONTS.ui,
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.65,
    textAlign: 'center',
    marginTop: 0,
    marginBottom: SPACING.xs,
  },
  subtitleCompact: {
    fontSize: 11,
    lineHeight: 14,
    marginTop: 0,
    marginBottom: SPACING.xs,
  },
  // ── Header controls (match HeaderBackButton icon / standard raised controls) ──
  counterBadge: {
    height: 44,
    minWidth: 44,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterText: {
    fontFamily: FONTS.uiBold,
    fontSize: 13,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  randomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    height: 44,
    minHeight: 44,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.button,
  },
  randomBtnLabel: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 14,
    letterSpacing: 0.3,
  },
  surfaceRaised: {
    borderRadius: BORDER_RADIUS.button,
  },
  // ── Selected strip ───────────────────────────────────────────────────
  selectedStrip: {
    flexGrow: 0,
    flexShrink: 0,
    marginTop: 0,
    marginBottom: SPACING.sm,
  },
  selectedStripContent: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
    height: 44,
    minWidth: 0,
  },
  selectedStripContentCompact: {
    height: 36,
    paddingHorizontal: SPACING.xs,
  },
  selectedTopicPill: {
    borderRadius: BORDER_RADIUS.button,
    // Equal left/right inset: text starts at 12, X ends at 12 (icon-sized control).
    paddingHorizontal: 12,
    height: 44,
    justifyContent: 'flex-start',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    minWidth: 0,
    flexShrink: 0,
    overflow: 'hidden',
  },
  selectedTopicPillCompact: {
    height: 36,
    paddingHorizontal: 10,
  },
  selectedPillVeryDense: {
    paddingHorizontal: 8,
    gap: 3,
  },
  selectedPillText: {
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    letterSpacing: 0.3,
    textAlign: 'left',
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    // Android: avoid extra font padding that unbalances row centering.
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  selectedPillTextDense: {
    fontSize: 11,
  },
  // Icon-sized (not 24px circle) so right edge inset matches left text inset.
  selectedPillClose: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    flexShrink: 0,
  },
  selectedPillCloseDense: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    flexShrink: 0,
  },
  // ── Content root ─────────────────────────────────────────────────────
  contentRoot: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Grid container ───────────────────────────────────────────────────
  gridContainer: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
  gridScrollContent: {
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.xs,
    width: '100%',
  },
  gridScrollContentWeb: {
    paddingHorizontal: WEB_GRID_INNER_PAD,
  },
  categoryList: {
    width: '100%',
  },
  listItemWrap: {
    alignSelf: 'center',
  },
  sectionTitle: {
    alignSelf: 'center',
    fontFamily: FONTS.uiBold,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    paddingHorizontal: 2,
  },
  sectionGrid: {
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  // ── Topic card ───────────────────────────────────────────────────────
  topicCard: {
    borderRadius: 14,
    overflow: 'hidden',
    // Always reserve selection ring space so toggling never reflows art bounds.
    borderWidth: 1.5,
  },
  cardImageArea: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  missingPictureLabel: {
    fontFamily: FONTS.uiBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textAlign: 'center',
    paddingHorizontal: 6,
  },
  cardTitleBar: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderTopWidth: 1,
  },
  cardTitle: {
    alignSelf: 'center',
    fontFamily: FONTS.uiBold,
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
    textAlignVertical: 'center',
    letterSpacing: 0.3,
    width: '100%',
  },
  selectedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(51, 51, 51, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  // Android-only dim when at topic cap — avoid parent opacity blanking expo-image.
  disabledDim: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.65,
    zIndex: 3,
  },
  // ── Floating action panel ────────────────────────────────────────────
  floatingPanel: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    alignItems: 'center',
    zIndex: 100,
  },
  startBtn: {
    width: '100%',
    maxWidth: 380,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  startBtnText: {
    fontFamily: FONTS.displayBold,
    fontSize: 17,
    letterSpacing: 1.3,
  },
});
