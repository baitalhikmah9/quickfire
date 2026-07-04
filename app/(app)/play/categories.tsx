import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  useWindowDimensions,
  Platform,
  type ImageStyle,
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
import type { GameMode } from '@/features/shared';
import { PlayScaffold } from '@/features/play/components/PlayScaffold';
import { SOFT_SURFACE_STYLES } from '@/features/play/styles/softSurface';
import { groupCategoriesBySection } from '@/features/play/categorySections';
import { getPlaySurfaceColors } from '@/features/play/playSurfaceColors';
import { useI18n } from '@/lib/i18n/useI18n';
import { isAuthDisabled } from '@/lib/authMode';
import { adjustGameEntryReservation } from '@/lib/wallet/gameEntry';
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

export default function CategorySelectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const categoryScrollRef = useRef<ScrollView | null>(null);
  const categoryOffsetsRef = useRef<Record<string, number>>({});
  const { direction, getTextStyle, t } = useI18n();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const fontSizes = useResponsivePlayFontSizes();
  useThemeStore((state) => state.paletteId);

  const session = usePlayStore((state) => state.session);
  const entryReservationId = usePlayStore((state) => state.entryReservationId);
  const ensureDraft = usePlayStore((state) => state.ensureDraft);
  const toggleCategory = usePlayStore((state) => state.toggleCategory);
  const setCategories = usePlayStore((state) => state.setCategories);
  const startBoard = usePlayStore((state) => state.startBoard);
  const { isLoaded, isSignedIn } = useAuth();
  const authDisabled = isAuthDisabled();
  const adjustEntryMutation = useMutation(api.wallet.adjustEntryReservation);

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
    const offset = categoryOffsetsRef.current[slug];
    if (offset === undefined) return;
    categoryScrollRef.current?.scrollTo({
      y: Math.max(offset - SPACING.sm, 0),
      animated: true,
    });
  };

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
            <ScrollView
              ref={categoryScrollRef}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.gridScrollContent,
                { paddingBottom: 160 },
              ]}
            >
              <View
                style={[
                  styles.gridOuter,
                  useWebLayout && { maxWidth: WEB_GRID_MAX_WIDTH, alignSelf: 'center' as const },
                ]}
              >
                <View
                  style={[
                    styles.grid,
                    { gap: gridGap },
                    useWebLayout && { paddingHorizontal: WEB_GRID_INNER_PAD },
                  ]}
                >
                  {categorySections.map((section) => (
                    <View key={section.id} style={styles.sectionBlock}>
                      <Text
                        style={[
                          styles.sectionTitle,
                          { color: textPrimary, fontSize: fontSizes.subtitle },
                        ]}
                      >
                        {section.title.toUpperCase()}
                      </Text>
                      <View style={[styles.sectionGrid, { gap: gridGap }]}>
                        {section.categories.map((category) => {
                    const selected = (session.selectedCategoryIds ?? []).includes(category.slug);
                    const disabled = !selected && selectedCount >= required;
                    const imageSource = getCategoryPictureSource(category.id);
                    const iconName = getCategoryIcon(category.id);

                    return (
                      <Pressable
                        key={category.slug}
                        disabled={disabled}
                        accessibilityRole="button"
                        accessibilityLabel={`Select ${category.title}`}
                        onPress={() => toggleCategory(category.slug)}
                        onLayout={(event) => {
                          categoryOffsetsRef.current[category.slug] =
                            event.nativeEvent.layout.y;
                        }}
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
                          SOFT_SURFACE_STYLES.raised,
                          selected && styles.topicCardSelected,
                        ]}
                      >
                        {/* Image area */}
                        <View style={[styles.cardImageArea, { height: imageAreaH, backgroundColor: surfaceColors.imageMatte ?? surface }]}>
                          {imageSource ? (
                            <Image
                              source={imageSource}
                              style={styles.cardImage as ImageStyle}
                              contentFit="cover"
                              transition={200}
                            />
                          ) : (
                            <Ionicons name={iconName} size={28} color={textPrimary} />
                          )}
                        </View>

                        {/* Title bar */}
                        <View
                          style={[
                            styles.cardTitleBar,
                            { height: titleBarH, backgroundColor: surface },
                          ]}
                        >
                          <Text
                            style={[
                              styles.cardTitle,
                              {
                                color: textPrimary,
                                fontSize: fontSizes.topicTitle,
                                lineHeight: Math.round(fontSizes.topicTitle * 1.18),
                              },
                            ]}
                            numberOfLines={2}
                          >
                            {category.title.toUpperCase()}
                          </Text>
                        </View>

                        {/* Selected checkmark badge */}
                        {selected && (
                          <View style={styles.selectedBadge}>
                            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                          </View>
                        )}
                      </Pressable>
                    );
                        })}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
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
                  if (!adjusted.ok) {
                    Alert.alert('', t('play.needTokens'));
                    return;
                  }
                }
              }

              const result = startBoard();
              if (result.ok) {
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
  },
  gridOuter: {
    width: '100%',
  },
  grid: {
    flexDirection: 'column',
    gap: SPACING.md,
  },
  sectionBlock: {
    width: '100%',
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontFamily: FONTS.uiBold,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    paddingHorizontal: 2,
  },
  sectionGrid: {
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
