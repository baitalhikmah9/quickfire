import { useLayoutEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, type ViewStyle } from 'react-native';
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
import { useI18n } from '@/lib/i18n/useI18n';
import { usePlayStore } from '@/store/play';

type CategoryFilter = 'all' | 'history' | 'games' | 'pc' | 'sports' | 'science';

const FILTER_TABS: { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: 'ALL' },
  { id: 'history', label: 'HISTORY' },
  { id: 'science', label: 'SCIENCE' },
  { id: 'games', label: 'GAMES' },
  { id: 'pc', label: 'POP CULTURE' },
  { id: 'sports', label: 'SPORTS' },
];

/** Deeper drop shadow — reads as a raised plastic tile. */
function neumorphicLift3D(tier: 'hero' | 'pill'): ViewStyle {
  const m = tier === 'hero' ? { h: 10, el: 12 } : { h: 4, el: 4 };
  return {
    shadowColor: 'rgba(51, 51, 51, 0.15)',
    shadowOffset: { width: 0, height: m.h },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: m.el,
  };
}


export default function CategorySelectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('all');
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

  const filteredCategories = useMemo(() => {
    if (!session) return [];
    if (activeFilter === 'all') return session.availableCategories;

    return session.availableCategories.filter((cat) => {
      if (activeFilter === 'history') return cat.id.startsWith('h');
      if (activeFilter === 'games') return cat.id.startsWith('g');
      if (activeFilter === 'pc') return cat.id.startsWith('pc');
      if (activeFilter === 'sports') return cat.id.startsWith('s') && !cat.id.startsWith('science');
      if (activeFilter === 'science') return cat.id === 'gen3' || cat.slug.includes('science');
      return true;
    });
  }, [session, activeFilter]);

  const onSelectRandom = () => {
    if (!session) return;

    // Toggle: If any are selected, clear them. Otherwise, select random set.
    if (session.selectedCategoryIds.length > 0) {
      setCategories([]);
    } else {
      const all = session.availableCategories;
      // Fisher-Yates shuffle or simple sort shuffle for small array
      const shuffled = [...all].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, required).map((c) => c.slug);
      setCategories(selected);
    }
  };

  if (!session) {
    return <PlayScaffold title={t('common.loading')}><Text>{t('common.loading')}</Text></PlayScaffold>;
  }

  const getCategoryIcon = (id: string): keyof typeof Ionicons.glyphMap => {
    if (id.startsWith('h')) return 'library-outline';
    if (id.startsWith('g')) return 'game-controller-outline';
    if (id.startsWith('pc')) return 'videocam-outline';
    if (id.startsWith('s')) return 'basketball-outline';
    if (id === 'gen2') return 'location-outline';
    if (id === 'gen3') return 'flask-outline';
    return 'folder-outline';
  };

  const canvas = '#FAF9F6';
  const surface = '#FFFFFF';
  const textPrimary = '#333333';

  return (
    <PlayScaffold
      title=""
      backgroundColor={canvas}
      bodyFrame={false}
      bodyEdgeToEdge
      bodyScrollEnabled={false}
      contentSafeAreaHorizontal
      customHeader={
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.counterCardHeader}>
              <Text style={[styles.counterTextHeader, { color: textPrimary }]}>
                {session.selectedCategoryIds.length}/{required}
              </Text>
            </View>
          </View>
          <Text style={[styles.mainTitle, { color: textPrimary }]}>
            {t('play.pickTopicsTitle')}
          </Text>
          <View style={styles.headerAction}>
            <Pressable
              onPress={onSelectRandom}
              style={({ pressed }) => [
                styles.randomTopicBtn,
                styles.plasticFace,
                neumorphicLift3D('pill'),
                { opacity: pressed ? 0.8 : 1 }
              ]}
            >
              <Text style={styles.randomTopicText}>Random Topics</Text>
            </Pressable>
          </View>
        </View>
      }
      footer={null}
    >
      <View style={styles.contentRoot}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterBar}
          contentContainerStyle={styles.filterBarContent}
        >
          {FILTER_TABS.map((tab) => (
            <Pressable
              key={tab.id}
              onPress={() => setActiveFilter(tab.id)}
              style={({ pressed }) => [
                styles.filterTab,
                styles.plasticFace,
                neumorphicLift3D('pill'),
                activeFilter === tab.id && styles.filterTabActive,
                activeFilter === tab.id && { shadowColor: '#FFB347', shadowOpacity: 0.3, shadowRadius: 12 },
                {
                  opacity: pressed ? 0.8 : 1,
                  backgroundColor: activeFilter === tab.id ? '#FFFBF5' : '#FFFFFF'
                }
              ]}
            >
              <Text style={[styles.filterTabText, activeFilter === tab.id && styles.filterTabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.gridContainer}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.gridVerticalContent,
              { paddingBottom: 160 }, // Extra space to clear the floating footer
            ]}
          >
            <View style={styles.grid}>
              {filteredCategories.map((category) => {
                const selected = session.selectedCategoryIds.includes(category.slug);
                const disabled = !selected && session.selectedCategoryIds.length >= required;
                const imageSource = getCategoryPictureSource(category.id);
                const iconName = getCategoryIcon(category.id);

                return (
                  <Pressable
                    key={category.slug}
                    disabled={disabled}
                    onPress={() => toggleCategory(category.slug)}
                    style={({ pressed }) => [
                      styles.topicPill,
                      styles.plasticFace,
                      neumorphicLift3D('pill'),
                      selected && styles.topicPillSelected,
                      selected && { shadowColor: '#FFB347', shadowOpacity: 0.4, shadowRadius: 16 },
                      {
                        opacity: disabled ? 0.35 : pressed ? 0.9 : 1,
                        backgroundColor: selected ? '#FFFBF5' : surface,
                      },
                    ]}
                  >
                    <View style={styles.topicPillInner}>
                      <View style={styles.pillIconWrap}>
                        <Ionicons name={iconName} size={24} color={textPrimary} />
                      </View>

                      <Text
                        style={[styles.topicTitle, { color: textPrimary }]}
                        numberOfLines={1}
                      >
                        {category.title.toUpperCase()}
                      </Text>

                      <View style={styles.pillImageWrap}>
                        {imageSource && (
                          <Image
                            source={imageSource}
                            style={styles.categoryThumb}
                            contentFit="cover"
                            transition={200}
                          />
                        )}
                        <View style={styles.pillSecondaryIcon}>
                          <Ionicons name={iconName} size={14} color="rgba(51,51,51,0.3)" />
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>

      <View style={[styles.floatingActionPanel, { bottom: Math.max(insets.bottom, SPACING.lg) }]}>
        <Pressable
          disabled={session.selectedCategoryIds.length !== required}
          accessibilityRole="button"
          accessibilityLabel={t('play.startBoard')}
          accessibilityState={{ disabled: session.selectedCategoryIds.length !== required }}
          onPress={() => {
            const result = startBoard();
            if (result.ok) {
              router.replace('/(app)/play/board');
            }
          }}
          style={({ pressed }) => [
            styles.primaryButton,
            styles.plasticFace,
            neumorphicLift3D('hero'),
            {
              backgroundColor: '#FFFFFF',
              opacity:
                session.selectedCategoryIds.length !== required
                  ? 0.4
                  : pressed
                    ? 0.92
                    : 1,
            },
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {t('play.startBoard').toUpperCase()}
          </Text>
        </Pressable>
      </View>
    </PlayScaffold>
  );
}

const styles = StyleSheet.create({
  plasticFace: {
    borderTopWidth: 2,
    borderTopColor: 'rgba(255, 255, 255, 0.78)',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    width: '100%',
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerAction: {
    flex: 1,
    alignItems: 'flex-end',
  },
  mainTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 28,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  randomTopicBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  randomTopicText: {
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    color: '#333333',
    textAlign: 'center',
  },
  filterBar: {
    flexGrow: 0,
    marginBottom: SPACING.lg,
  },
  filterBarContent: {
    paddingHorizontal: 4,
    gap: SPACING.sm,
    paddingBottom: 8, // space for shadow
  },
  filterTab: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  filterTabActive: {
    backgroundColor: '#FFFBF5',
  },
  filterTabText: {
    fontFamily: FONTS.uiBold,
    fontSize: 13,
    color: '#333333',
    letterSpacing: 0.5,
  },
  filterTabTextActive: {
    color: '#FFB347',
  },
  gridContainer: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    justifyContent: 'center',
    paddingBottom: SPACING.xl,
  },
  topicPill: {
    width: '48%', // 2 columns
    height: 72,
    borderRadius: 22,
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
  },
  topicPillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  topicPillSelected: {
    backgroundColor: '#FFFBF5',
    zIndex: 10,
  },
  pillIconWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicTitle: {
    flex: 1,
    fontFamily: FONTS.uiBold,
    fontSize: 15,
    textAlign: 'left',
    paddingHorizontal: SPACING.sm,
    letterSpacing: 0.3,
  },
  pillImageWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryThumb: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
  pillSecondaryIcon: {
    position: 'absolute',
    zIndex: 1,
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
    borderRadius: 32,
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(51,51,51,0.08)',
    ...neumorphicLift3D('pill'),
  },
  counterTextHeader: {
    fontFamily: FONTS.uiBold,
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
