import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { SPACING, FONT_SIZES, BORDER_RADIUS, FONTS } from '@/constants';
import { useTheme } from '@/lib/hooks/useTheme';
import { CategoryCard } from './CategoryCard';

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
const CARD_W = 120;
/** Approximate card height from CategoryCard layout */
const CARD_H = CARD_W * 1.3 + 44;

export function StepCategories({
  categories,
  team1Selected,
  team2Selected,
  onTeam1Toggle,
  onTeam2Toggle,
  onNext,
}: StepCategoriesProps) {
  const colors = useTheme();
  const [bodyH, setBodyH] = useState(0);
  const gridGap = SPACING.md;

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
    if (team1Selected.includes(slug)) return { selected: true, color: colors.primary };
    if (team2Selected.includes(slug)) return { selected: true, color: colors.secondary };
    return { selected: false, color: undefined };
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
    <View style={styles.outerContainer}>
      <Text style={[styles.title, { color: colors.textOnBackground }]}>Choose Categories</Text>

      <View style={styles.scrollHost} onLayout={(e) => setBodyH(e.nativeEvent.layout.height)}>
        {bodyH > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            contentContainerStyle={[styles.columnsRow, { gap: gridGap }]}
          >
            {categoryColumns.map((col, ci) => (
              <View key={`col-${ci}`} style={[styles.column, { gap: gridGap, width: CARD_W }]}>
                {col.map((c) => {
                  const { selected, color } = getSelectionState(c.slug);
                  return (
                    <CategoryCard
                      key={c.id}
                      title={c.title}
                      isSelected={selected}
                      selectionColor={color}
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
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        <View style={styles.selectionInfo}>
          <Text style={[styles.selectionText, { color: colors.textSecondaryOnBackground }]}>
            Team 1: {team1Selected.length}/3  •  Team 2: {team2Selected.length}/3
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.nextButton,
            { backgroundColor: colors.primary },
            (!canNext || pressed) && styles.buttonDisabled,
          ]}
          onPress={onNext}
          disabled={!canNext}
        >
          <Text style={styles.nextButtonText}>Next Step</Text>
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
  title: {
    fontSize: 28,
    fontFamily: FONTS.displayBold,
    textAlign: 'center',
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
    flexShrink: 0,
  },
  scrollHost: {
    flex: 1,
    minHeight: 0,
  },
  columnsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: SPACING.xs,
  },
  column: {
    flexDirection: 'column',
  },
  selectionInfo: {
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  selectionText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  footer: {
    padding: SPACING.lg,
    borderTopWidth: 2,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flexShrink: 0,
  },
  nextButton: {
    height: 56,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.uiBold,
  },
});
