import { useLayoutEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, FONTS } from '@/constants';
import { getCategoryPictureSource } from '@/constants/categoryPictures';
import { getModeCategoryCount } from '@/features/play/data';
import type { GameMode } from '@/features/shared';
import { PlayScaffold } from '@/features/play/components/PlayScaffold';
import { SOFT_SURFACE_STYLES } from '@/features/play/styles/softSurface';
import { useI18n } from '@/lib/i18n/useI18n';
import { usePlayStore } from '@/store/play';

function getCategoryIcon(id: string): keyof typeof Ionicons.glyphMap {
  if (id.startsWith('h')) return 'library-outline';
  if (id.startsWith('g')) return 'game-controller-outline';
  if (id.startsWith('pc')) return 'videocam-outline';
  if (id.startsWith('s')) return 'basketball-outline';
  if (id === 'gen2') return 'location-outline';
  if (id === 'gen3') return 'flask-outline';
  return 'folder-outline';
}

export default function CategorySelectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const categoryScrollRef = useRef<ScrollView | null>(null);
  const categoryOffsetsRef = useRef<Record<string, number>>({});
  const { t } = useI18n();
  const session = usePlayStore((state) => state.session);
  const ensureDraft = usePlayStore((state) => state.ensureDraft);
  const toggleCategory = usePlayStore((state) => state.toggleCategory);
  const setCategories = usePlayStore((state) => state.setCategories);
  const startBoard = usePlayStore((state) => state.startBoard);

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
      y: Math.max(offset - SPACING.md, 0),
      animated: true,
    });
  };

  const isLoading = !session;
  const selectedCount = (session?.selectedCategoryIds ?? []).length;
  const canvas = '#FAF9F6';
  const surface = '#FFFFFF';
  const textPrimary = '#333333';

  return (
    <PlayScaffold
      title={isLoading ? t('common.loading') : ''}
      backgroundColor={canvas}
      bodyFrame={false}
      bodyEdgeToEdge
      bodyScrollEnabled={false}
      contentSafeAreaHorizontal
      customHeader={
        isLoading ? null : (
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Pressable
                onPress={() => router.push('/play/team-setup')}
                accessibilityRole="button"
                accessibilityLabel="Back to team setup"
                style={({ pressed }) => [
                  styles.backButton,
                  styles.surfaceRaised,
                  SOFT_SURFACE_STYLES.face,
                  SOFT_SURFACE_STYLES.raised,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Ionicons name="chevron-back" size={20} color={textPrimary} />
              </Pressable>
              <View style={styles.counterCardHeader}>
                <Text style={[styles.counterTextHeader, { color: textPrimary }]}>
                  {selectedCount}/{required}
                </Text>
              </View>
            </View>
            <Text
              style={[styles.mainTitle, { color: textPrimary }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
            >
              {t('play.pickTopicsTitle')}
            </Text>
            <View style={styles.headerAction}>
              <Pressable
                onPress={onSelectRandom}
                disabled={selectedCount >= required}
                accessibilityRole="button"
                accessibilityLabel="Choose a random topic"
                accessibilityState={{ disabled: selectedCount >= required }}
                style={({ pressed }) => [
                  styles.randomTopicBtn,
                  styles.surfaceRaised,
                  SOFT_SURFACE_STYLES.face,
                  SOFT_SURFACE_STYLES.raised,
                  {
                    opacity: selectedCount >= required ? 0.45 : pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text style={styles.randomTopicText} numberOfLines={2}>
                  Choose a random topic
                </Text>
              </Pressable>
            </View>
          </View>
        )
      }
      footer={null}
    >
      {isLoading ? (
        <Text>{t('common.loading')}</Text>
      ) : (
        <View style={styles.contentRoot}>
          <View style={styles.selectedStrip}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.selectedStripContent}
            >
              {selectedCategories.length === 0 ? (
                <Text style={styles.selectedStripEmpty}>Selected topics appear here.</Text>
              ) : (
                selectedCategories.map((category) => (
                  <Pressable
                    key={category.slug}
                    onPress={() => scrollToCategory(category.slug)}
                    accessibilityRole="button"
                    accessibilityLabel={`Jump to ${category.title}`}
                    style={({ pressed }) => [
                      styles.selectedTopicChip,
                      styles.surfaceRaised,
                      SOFT_SURFACE_STYLES.face,
                      SOFT_SURFACE_STYLES.raised,
                      { opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Text style={styles.selectedTopicChipText} numberOfLines={1}>
                      {category.title.toUpperCase()}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>

          <View style={styles.gridContainer}>
            <ScrollView
              ref={categoryScrollRef}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.gridVerticalContent,
                { paddingBottom: 160 }, // Extra space to clear the floating footer
              ]}
            >
              <View style={styles.grid}>
                {session.availableCategories.map((category) => {
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
                        categoryOffsetsRef.current[category.slug] = event.nativeEvent.layout.y;
                      }}
                      style={({ pressed }) => [
                        styles.topicPill,
                        styles.surfaceRaised,
                        SOFT_SURFACE_STYLES.face,
                        SOFT_SURFACE_STYLES.raised,
                        selected && styles.topicPillSelected,
                        {
                          opacity: disabled ? 0.35 : pressed ? 0.9 : 1,
                          backgroundColor: selected ? '#FFFBF5' : surface,
                        },
                      ]}
                    >
                      {selected ? (
                        <View style={styles.topicPillCheckBadge}>
                          <Ionicons name="checkmark-circle-outline" size={18} color="#16A34A" />
                        </View>
                      ) : null}
                      <View style={styles.topicPillInner}>
                        <View style={styles.pillImageWrap}>
                          {imageSource ? (
                            <Image
                              source={imageSource}
                              style={styles.categoryThumb}
                              contentFit="contain"
                              transition={200}
                            />
                          ) : (
                            <Ionicons name={iconName} size={28} color={textPrimary} />
                          )}
                        </View>

                        <Text
                          style={[styles.topicTitle, { color: textPrimary }]}
                          numberOfLines={2}
                          adjustsFontSizeToFit
                          minimumFontScale={0.72}
                        >
                          {category.title.toUpperCase()}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {isLoading ? null : (
        <View style={[styles.floatingActionPanel, { bottom: Math.max(insets.bottom, SPACING.lg) }]}>
          <Pressable
            disabled={selectedCount !== required}
            accessibilityRole="button"
            accessibilityLabel={t('play.startBoard')}
            accessibilityState={{ disabled: selectedCount !== required }}
            onPress={() => {
              const result = startBoard();
              if (result.ok) {
                router.replace('/(app)/play/board');
                return;
              }
              const errorMessage = result.error ?? t('play.needTokens');
              Alert.alert('', errorMessage);
            }}
            style={({ pressed }) => [
              styles.primaryButton,
              styles.surfaceRaised,
              SOFT_SURFACE_STYLES.face,
              SOFT_SURFACE_STYLES.raised,
              {
                backgroundColor: '#FFFFFF',
                opacity: selectedCount !== required ? 0.4 : pressed ? 0.92 : 1,
              },
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {t('play.startBoard').toUpperCase()}
            </Text>
          </Pressable>
        </View>
      )}
    </PlayScaffold>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    width: '100%',
  },
  headerLeft: {
    flexShrink: 0,
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  headerAction: {
    flexShrink: 0,
    alignItems: 'flex-end',
  },
  mainTitle: {
    flex: 1,
    fontFamily: FONTS.displayBold,
    fontSize: 28,
    textAlign: 'center',
    letterSpacing: -0.5,
    minWidth: 0,
  },
  randomTopicBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 18,
    minWidth: 96,
    maxWidth: 112,
    alignItems: 'center',
    justifyContent: 'center',
  },
  randomTopicText: {
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    color: '#333333',
    textAlign: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surfaceRaised: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
  },
  selectedStrip: {
    flexGrow: 0,
    marginBottom: SPACING.lg,
  },
  selectedStripContent: {
    paddingHorizontal: 4,
    gap: SPACING.sm,
    paddingBottom: 8, // space for shadow
    minHeight: 44,
    alignItems: 'center',
  },
  selectedStripEmpty: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 13,
    color: 'rgba(51,51,51,0.52)',
    paddingVertical: 10,
    paddingHorizontal: SPACING.sm,
  },
  selectedTopicChip: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    maxWidth: 180,
  },
  selectedTopicChipText: {
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    color: '#333333',
    letterSpacing: 0.3,
  },
  gridContainer: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: SPACING.md,
    justifyContent: 'space-between',
    paddingBottom: SPACING.xl,
  },
  topicPill: {
    width: '23%',
    minHeight: 116,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  topicPillInner: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    flexGrow: 1,
  },
  topicPillSelected: {
    backgroundColor: '#FFFBF5',
    zIndex: 10,
    borderWidth: 1.5,
    borderColor: '#16A34A',
  },
  topicPillCheckBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicTitle: {
    fontFamily: FONTS.uiBold,
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'center',
    letterSpacing: 0.2,
    minHeight: 24,
  },
  pillImageWrap: {
    width: 68,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.02)',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryThumb: {
    width: '100%',
    height: '100%',
    opacity: 0.95,
  },
  counterRow: {
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  counterText: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 14,
  },
  primaryButton: {
    width: '100%',
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  primaryButtonText: {
    fontFamily: FONTS.displayBold,
    fontSize: 18,
    letterSpacing: 1.2,
    color: '#333333',
  },
  contentRoot: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
  gridVerticalContent: {
    paddingBottom: SPACING.xl,
  },
  floatingActionPanel: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    alignItems: 'center',
    zIndex: 100,
  },
  counterCardHeader: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    minWidth: 56,
    borderRadius: 14,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    ...SOFT_SURFACE_STYLES.face,
    ...SOFT_SURFACE_STYLES.raised,
  },
  counterTextHeader: {
    fontFamily: FONTS.uiBold,
    fontSize: 13,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
