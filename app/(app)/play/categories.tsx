import { memo, useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
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
import { SPACING, FONTS, FONT_SIZES, LAYOUT } from '@/constants';
import { getCategoryPictureSource } from '@/constants/categoryPictures';
import { getModeCategoryCount } from '@/features/play/data';
import type { CategoryOption, GameMode } from '@/features/shared';
import { PlayScaffold } from '@/features/play/components/PlayScaffold';
import { SOFT_SURFACE_STYLES } from '@/features/play/styles/softSurface';
import {
  groupCategoriesBySection,
  type CategorySection,
} from '@/features/play/categorySections';
import { getPlaySurfaceColors } from '@/features/play/playSurfaceColors';
import { useI18n } from '@/lib/i18n/useI18n';
import { isAuthDisabled } from '@/lib/authMode';
import { adjustGameEntryReservation, consumeGameEntry } from '@/lib/wallet/gameEntry';
import { getGameTokenCost } from '@/features/play/tokenCosts';
import { usePlayStore } from '@/store/play';
import { useThemeStore } from '@/store/theme';
import { useResponsivePlayFontSizes } from '@/utils/responsiveTypography';

function getCategoryIcon(id: string): keyof typeof Ionicons.glyphMap {
  if (id.startsWith('h')) return 'library-outline';
  if (id.startsWith('g')) return 'game-controller-outline';
  if (id.startsWith('pc')) return 'videocam-outline';
  if (id.startsWith('s')) return 'basketball-outline';
  if (id === 'gen2') return 'location-outline';
  if (id === 'gen3') return 'flask-outline';
  return 'folder-outline';
}

// ── Grid constants ──────────────────────────────────────────────────────

const WEB_GRID_MAX_WIDTH = 1400;
const WEB_GRID_GAP = 30;
const NATIVE_GRID_GAP = 24;
const NATIVE_COMPACT_GRID_GAP = 12;
const WEB_GRID_INNER_PAD = 40; // padding inside the max-width container
const WEB_CARD_HEIGHT = 190;
const NATIVE_CARD_ASPECT = 0.72; // height = width * aspect
const COLS = 4;
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
  onToggle,
}: CategoryCardProps) {
  const imageSource = getCategoryPictureSource(category.id);
  const iconName = getCategoryIcon(category.id);
  const useLightListSurface = Platform.OS === 'android';

  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Select ${category.title}`}
      onPress={() => onToggle(category.slug)}
      style={({ pressed }) => [
        styles.topicCard,
        {
          width: cardW,
          height: cardH,
          backgroundColor: surface,
          opacity: disabled ? 0.35 : pressed ? 0.94 : 1,
          transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
        },
        SOFT_SURFACE_STYLES.face,
        !useLightListSurface && SOFT_SURFACE_STYLES.raised,
        selected && styles.topicCardSelected,
      ]}
    >
      <View
        style={[
          styles.cardImageArea,
          { height: imageAreaH, backgroundColor: topicImageMatte ?? surface },
        ]}
      >
        {imageSource ? (
          <Image
            source={imageSource}
            recyclingKey={category.slug}
            style={styles.cardImage as ImageStyle}
            contentFit={topicImageContentFit}
            transition={
              Platform.OS === 'android' ? ANDROID_LIST_IMAGE_TRANSITION : WEB_LIST_IMAGE_TRANSITION
            }
          />
        ) : (
          <Ionicons name={iconName} size={28} color={textPrimary} />
        )}
      </View>

      <View style={[styles.cardTitleBar, { height: titleBarH, backgroundColor: surface }]}>
        <Text
          style={[
            styles.cardTitle,
            {
              color: textPrimary,
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
  useThemeStore((state) => state.paletteId);

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
  const adjustEntryMutation = useMutation(api.wallet.adjustEntryReservation);
  const consumeEntryMutation = useMutation(api.wallet.consumeEntry);

  useLayoutEffect(() => {
    ensureDraft();
  }, [ensureDraft]);

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
  const useWebLayout = isWeb && windowWidth >= 900;
  const isLandscape = windowWidth > windowHeight;
  const compactHeader = !useWebLayout && isLandscape;

  // ── Grid dimension calculations ─────────────────────────────────────
  // Always 4 columns per row as requested.
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

  // Card width fills exactly 4 columns: (innerW - 3 gaps) / 4.
  // Keep this derived from the actual padded body width so phones do not wrap to 3 columns.
  const cardW = Math.max(
    1,
    Math.min(320, Math.floor((innerW - gridGap * (COLS - 1)) / COLS))
  );

  const cardH = useWebLayout
    ? WEB_CARD_HEIGHT
    : Math.floor(cardW * NATIVE_CARD_ASPECT);
  const imageAreaH = Math.floor(cardH * 0.58);
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
  const surfaceColors = getPlaySurfaceColors();
  const canvas = surfaceColors.canvas;
  const surface = surfaceColors.surface;
  const textPrimary = surfaceColors.textPrimary;
  const canChooseRandom = session && selectedCount < required;
  const categorySections = useMemo(
    () => (session ? groupCategoriesBySection(session.availableCategories) : []),
    [session]
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
      return layout ?? { length: cardH, offset: cardH * index };
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
                  topicTitleSize={fontSizes.topicTitle}
                  topicImageMatte={surfaceColors.topicImageMatte}
                  topicImageContentFit={surfaceColors.topicImageContentFit}
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
      fontSizes.topicTitle,
      gridGap,
      handleToggleCategory,
      imageAreaH,
      required,
      sectionTitleHeight,
      selectedCategoryIds,
      selectedCount,
      surface,
      surfaceColors.topicImageContentFit,
      surfaceColors.topicImageMatte,
      textPrimary,
      titleBarH,
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
                <Pressable
                  onPress={() => router.push('/play/team-setup')}
                  accessibilityRole="button"
                  accessibilityLabel="Back to team setup"
                  style={({ pressed }) => [
                    styles.backButton,
                    compactHeader && styles.backButtonCompact,
                    styles.surfaceRaised,
                    SOFT_SURFACE_STYLES.face,
                    SOFT_SURFACE_STYLES.raised,
                    pressed && styles.controlPressed,
                  ]}
                >
                  <Ionicons
                    name={direction === 'rtl' ? 'chevron-forward' : 'chevron-back'}
                    size={compactHeader ? 18 : 20}
                    color={textPrimary}
                  />
                </Pressable>
                <View
                  style={[
                    styles.counterBadge,
                    compactHeader && styles.counterBadgeCompact,
                    styles.surfaceRaised,
                    SOFT_SURFACE_STYLES.face,
                    SOFT_SURFACE_STYLES.raised,
                  ]}
                >
                  <Text
                    style={[
                      styles.counterText,
                      {
                        color: textPrimary,
                        fontSize: compactHeader
                          ? Math.round(fontSizes.headerButton * 0.92)
                          : fontSizes.headerButton,
                        lineHeight: Math.round(
                          (compactHeader
                            ? Math.round(fontSizes.headerButton * 0.92)
                            : fontSizes.headerButton) * 1.2
                        ),
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
                    compactHeader && styles.randomBtnCompact,
                    styles.surfaceRaised,
                    SOFT_SURFACE_STYLES.face,
                    SOFT_SURFACE_STYLES.raised,
                    {
                      opacity: !canChooseRandom ? 0.45 : pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Ionicons name="shuffle-outline" size={compactHeader ? 14 : 16} color={textPrimary} />
                  <Text
                    style={[
                      styles.randomBtnLabel,
                      {
                        color: textPrimary,
                        fontSize: compactHeader
                          ? Math.round(fontSizes.headerButton * 0.9)
                          : fontSizes.headerButton,
                        lineHeight: Math.round(
                          (compactHeader
                            ? Math.round(fontSizes.headerButton * 0.9)
                            : fontSizes.headerButton) * 1.2
                        ),
                      },
                    ]}
                    numberOfLines={1}
                  >
                    Random Topic
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Subtitle — compact, directly below title */}
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
          {/* Selected topics strip — above the grid */}
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
                      styles.surfaceRaised,
                      SOFT_SURFACE_STYLES.face,
                      SOFT_SURFACE_STYLES.raised,
                      { opacity: pressed ? 0.85 : 1, width: selectedPillWidth },
                      isVeryDense && styles.selectedPillVeryDense,
                    ]}
                  >
                    <Text
                      style={[
                        styles.selectedPillText,
                        isVeryDense && styles.selectedPillTextDense,
                        { color: textPrimary, fontSize: fontSizes.headerButton, lineHeight: Math.round(fontSizes.headerButton * 1.2) },
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {category.title.toUpperCase()}
                    </Text>
                    <View
                      onStartShouldSetResponder={() => true}
                      onResponderRelease={() => toggleCategory(category.slug)}
                      accessibilityLabel={`Remove ${category.title}`}
                      style={isVeryDense ? styles.selectedPillCloseDense : styles.selectedPillClose}
                    >
                      <Ionicons name="close" size={isVeryDense ? 14 : 16} color={textPrimary} />
                    </View>
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
              removeClippedSubviews={Platform.OS === 'android'}
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
              if (session && !authDisabled && isLoaded && isSignedIn && entryReservationId) {
                const tokenCost = getGameTokenCost(
                  session.mode,
                  session.config.quickPlayTopicCount
                );
                const entryTokenCharge = session.config.entryTokenCharge ?? 0;
                const delta = Math.max(0, tokenCost - entryTokenCharge);
                if (delta > 0) {
                  const adjusted = await adjustGameEntryReservation(adjustEntryMutation, {
                    reservationId: entryReservationId,
                    additionalCost: delta,
                  });
                  if (!adjusted.ok && adjusted.error === 'insufficient_balance') {
                    Alert.alert('', t('play.needTokens'));
                    return;
                  }
                }
              }

              const result = startBoard();
              if (result.ok) {
                if (!authDisabled && isLoaded && isSignedIn && entryReservationId) {
                  const consumed = await consumeGameEntry(consumeEntryMutation, {
                    reservationId: entryReservationId,
                    completedSessionId: usePlayStore.getState().session?.id ?? '',
                  }).catch(() => ({ ok: false as const, error: 'network' }));
                  // Only a real balance failure blocks entry; stale reservation states
                  // (already consumed/refunded from a previous run) are non-fatal.
                  if (!consumed.ok && consumed.error === 'insufficient_balance') {
                    Alert.alert('', t('play.needTokens'));
                    return;
                  }
                }
                commitEntryCharge();
                setEntryReservationId(null);
                router.replace('/(app)/play/board');
                return;
              }
              const errorMessage = result.error ?? t('play.needTokens');
              Alert.alert('', errorMessage);
            }}
            style={({ pressed }) => [
              styles.startBtn,
              styles.surfaceRaised,
              SOFT_SURFACE_STYLES.face,
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
    paddingVertical: SPACING.xs,
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
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerRowCompact: {
    minHeight: 36,
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
  // ── Header controls ─────────────────────────────────────────────────
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonCompact: {
    width: 32,
    height: 32,
    borderRadius: 11,
  },
  counterBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    minWidth: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBadgeCompact: {
    paddingVertical: 2,
    paddingHorizontal: 7,
    minWidth: 38,
    borderRadius: 11,
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
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  randomBtnCompact: {
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 11,
  },
  randomBtnLabel: {
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    letterSpacing: 0.3,
  },
  surfaceRaised: {
    borderRadius: 14,
  },
  controlPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
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
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    minWidth: 0,
    flexShrink: 0,
  },
  selectedPillVeryDense: {
    paddingHorizontal: 8,
    gap: 3,
  },
  selectedPillText: {
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    letterSpacing: 0.3,
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  selectedPillTextDense: {
    fontSize: 11,
  },
  selectedPillClose: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(51,51,51,0.08)',
    flexShrink: 0,
  },
  selectedPillCloseDense: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(51,51,51,0.08)',
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
    justifyContent: 'flex-start',
  },
  // ── Topic card ───────────────────────────────────────────────────────
  topicCard: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  topicCardSelected: {
    borderWidth: 1.5,
    borderColor: 'rgba(51, 51, 51, 0.2)',
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
  cardTitleBar: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 51, 51, 0.08)',
  },
  cardTitle: {
    fontFamily: FONTS.uiBold,
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
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
