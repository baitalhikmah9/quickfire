import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { SPACING, FONTS, COLORS, BORDER_RADIUS } from '@/constants';
import { CategoryCard } from './CategoryCard';
import { HOME_SOFT_UI } from '@/themes';
import { LinearGradient } from 'expo-linear-gradient';
import { getCategoryPictureSource } from '@/constants/categoryPictures';

const T = HOME_SOFT_UI;

export interface CategoryOption {
  id: string;
  slug: string;
  title: string;
  arabicTitle?: string;
  illustration?: any;
  flag?: any;
}

interface StepCategoriesProps {
  categories: CategoryOption[];
  team1Selected: string[];
  team2Selected: string[];
  onTeam1Toggle: (slug: string) => void;
  onTeam2Toggle: (slug: string) => void;
  onNext: () => void;
}

const PER_TEAM = 3;
const CARD_W = 110; 
/** Height is determined by 0.85 aspect ratio: height = width / 0.85 */
const CARD_H = Math.floor(CARD_W / 0.85);

/** 
 * Sophisticated footer shadow for a "floating" effect 
 */
const getFooterShadow = () => ({
    shadowColor: 'rgba(15, 23, 42, 0.15)',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 20,
});

export function StepCategories({
  categories,
  team1Selected,
  team2Selected,
  onTeam1Toggle,
  onTeam2Toggle,
  onNext,
}: StepCategoriesProps) {
  const [bodyH, setBodyH] = useState(0);
  const gridGap = SPACING.md;

  const canvas = T.colors.canvas;
  const surface = T.colors.surface;
  const textPrimary = T.colors.textPrimary;
  const textMuted = T.colors.textMuted;
  const accentColor = T.colors.resumeAccent; // Electric Blue for functional state

  const toggle = (slug: string) => {
    const isT1 = team1Selected.includes(slug);
    const isT2 = team2Selected.includes(slug);

    if (isT1) onTeam1Toggle(slug);
    else if (isT2) onTeam2Toggle(slug);
    else {
      if (team1Selected.length < PER_TEAM) onTeam1Toggle(slug);
      else if (team2Selected.length < PER_TEAM) onTeam2Toggle(slug);
    }
  };

  const getSelectionState = (slug: string) => {
    if (team1Selected.includes(slug)) return { selected: true };
    if (team2Selected.includes(slug)) return { selected: true };
    return { selected: false };
  };

  const canNext = team1Selected.length === PER_TEAM && team2Selected.length === PER_TEAM;

  const rowsFit = useMemo(() => {
    if (bodyH < CARD_H + gridGap) return 1;
    return Math.max(1, Math.floor((bodyH - gridGap) / (CARD_H + gridGap)));
  }, [bodyH, gridGap]);

  const categoryColumns = useMemo(() => {
    const cols: CategoryOption[][] = [];
    for (let i = 0; i < categories.length; i += rowsFit) {
      cols.push(categories.slice(i, i + rowsFit));
    }
    return cols;
  }, [categories, rowsFit]);

  return (
    <View style={[styles.outerContainer, { backgroundColor: canvas }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: textPrimary }]}>
          {T.id === 'home-soft-ui' ? 'CHOOSE TOPICS' : 'Choose Topics'}
        </Text>
        <Text style={[styles.subtitle, { color: textMuted }]}>
          Select 3 categories for each team to begin
        </Text>
      </View>

      <View style={styles.scrollHost} onLayout={(e) => setBodyH(e.nativeEvent.layout.height)}>
        {bodyH > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.columnsRow, { gap: gridGap + 8 }]}
            decelerationRate="fast"
            snapToInterval={CARD_W + gridGap + 8}
          >
            {categoryColumns.map((col, ci) => (
              <View key={`col-${ci}`} style={[styles.column, { gap: gridGap, width: CARD_W }]}>
                {col.map((c) => {
                  const { selected } = getSelectionState(c.slug);
                  // Resolve illustration: prefer data-attached illustration, fall back to
                  // the shared picture map (same source used in play/categories.tsx).
                  const pictureSource = getCategoryPictureSource(c.id);
                  const illustration = c.illustration ?? (pictureSource ? pictureSource : undefined);
                  return (
                    <CategoryCard
                      key={c.id}
                      title={c.title}
                      illustration={illustration}
                      isSelected={selected}
                      onPress={() => toggle(c.slug)}
                      onInfoPress={() => {}}
                      style={{ width: CARD_W, marginBottom: 0 }}
                    />
                  );
                })}
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>

      <View
        style={[
          styles.footer,
          { backgroundColor: surface },
          getFooterShadow(),
        ]}
      >
        <View style={styles.selectionInfo}>
            <View style={styles.badgeRow}>
                <View style={[styles.teamBadge, { backgroundColor: 'rgba(0,123,255,0.08)' }]}>
                    <Text style={[styles.badgeText, { color: '#007BFF' }]}>T1: {team1Selected.length}/3</Text>
                </View>
                <View style={[styles.teamBadge, { backgroundColor: 'rgba(255,140,0,0.08)' }]}>
                    <Text style={[styles.badgeText, { color: '#FF8C00' }]}>T2: {team2Selected.length}/3</Text>
                </View>
            </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.nextButton,
            {
              backgroundColor: canNext ? accentColor : '#F1F5F9',
              opacity: canNext ? (pressed ? 0.94 : 1) : 1,
              transform: canNext && pressed ? [{ scale: 0.98 }, { translateY: 2 }] : [{ scale: 1 }, { translateY: 0 }],
              
              // Raised style alignment for primary button
              borderTopWidth: 2,
              borderTopColor: canNext ? 'rgba(255, 255, 255, 0.25)' : 'transparent',
              borderBottomWidth: pressed ? 0 : 4,
              borderBottomColor: canNext ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.05)',
              
              shadowColor: 'rgba(51, 51, 51, 0.15)',
              shadowOffset: { width: 0, height: pressed ? 1 : 4 },
              shadowOpacity: 1,
              shadowRadius: 0,
              elevation: pressed ? 1 : 4,
            },
          ]}
          onPress={onNext}
          disabled={!canNext}
        >
          <Text style={[
            styles.nextButtonText, 
            { color: canNext ? '#FFF' : '#94A3B8' }
          ]}>
            {canNext ? 'CONTINUE CHALLENGE' : 'PICK 6 CATEGORIES'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    minHeight: 0,
  },
  header: {
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontFamily: FONTS.displayBold,
    textAlign: 'center',
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONTS.uiMedium,
    marginTop: 4,
    opacity: 0.8,
  },
  scrollHost: {
    flex: 1,
    minHeight: 0,
  },
  columnsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  column: {
    flexDirection: 'column',
  },
  selectionInfo: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  teamBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: FONTS.uiBold,
    letterSpacing: 0.5,
  },
  footer: {
    padding: SPACING.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xl,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    flexShrink: 0,
  },
  nextButton: {
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  nextButtonText: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    letterSpacing: 1.5,
  },
});


