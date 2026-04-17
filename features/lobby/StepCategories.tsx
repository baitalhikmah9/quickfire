import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { SPACING, FONTS } from '@/constants';
import { CategoryCard } from './CategoryCard';
import { HOME_SOFT_UI } from '@/themes';

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
const CARD_W = 120;
/** Approximate card height from CategoryCard layout */
const CARD_H = CARD_W * 1.1 + 48; // Updated to match CategoryCard.tsx height

/** Raised plastic tile shadow tier. */
function neumorphicLift3D(shadowColor: string, tier: 'hero' | 'pill'): any {
  const m =
    tier === 'hero'
      ? { h: 14, op: 1, r: 28, el: 18 }
      : { h: 6, op: 0.8, r: 14, el: 8 };

  return {
    shadowColor,
    shadowOffset: { width: 0, height: m.h },
    shadowOpacity: m.op,
    shadowRadius: m.r,
    elevation: m.el,
  };
}

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
  const shadowHex = T.colors.shadowStrong;

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
      <Text style={[styles.title, { color: textPrimary }]}>
        {T.id === 'home-soft-ui' ? 'CHOOSE CATEGORIES' : 'Choose Categories'}
      </Text>

      <View style={styles.scrollHost} onLayout={(e) => setBodyH(e.nativeEvent.layout.height)}>
        {bodyH > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.columnsRow, { gap: gridGap + 8 }]}
          >
            {categoryColumns.map((col, ci) => (
              <View key={`col-${ci}`} style={[styles.column, { gap: gridGap, width: CARD_W }]}>
                {col.map((c) => {
                  const { selected } = getSelectionState(c.slug);
                  return (
                    <CategoryCard
                      key={c.id}
                      title={c.title}
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
          styles.plasticFace,
          {
            backgroundColor: surface,
          },
          neumorphicLift3D(shadowHex, 'pill'),
        ]}
      >
        <View style={styles.selectionInfo}>
          <Text style={[styles.selectionText, { color: textMuted }]}>
            TEAM 1: {team1Selected.length}/3  •  TEAM 2: {team2Selected.length}/3
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.nextButton,
            styles.plasticFace,
            {
              backgroundColor: surface,
              opacity: canNext ? (pressed ? 0.94 : 1) : 0.5,
              transform: canNext && pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
            },
            neumorphicLift3D(shadowHex, 'pill'),
            canNext && { shadowColor: '#FFB347', shadowOpacity: 0.45 }, // Amber glow for CTA
          ]}
          onPress={onNext}
          disabled={!canNext}
        >
          <Text style={[styles.nextButtonText, { color: textPrimary }]}>
            {canNext ? 'CONTINUE' : 'CHOOSE 6 CATEGORIES'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plasticFace: {
    borderTopWidth: 2,
    borderTopColor: 'rgba(255, 255, 255, 0.78)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  outerContainer: {
    flex: 1,
    minHeight: 0,
  },
  title: {
    fontSize: 24,
    fontFamily: FONTS.displayBold,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: SPACING.lg,
    marginTop: SPACING.md,
    flexShrink: 0,
  },
  scrollHost: {
    flex: 1,
    minHeight: 0,
  },
  columnsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  column: {
    flexDirection: 'column',
  },
  selectionInfo: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  selectionText: {
    fontSize: 12,
    fontFamily: FONTS.uiBold,
    letterSpacing: 1,
  },
  footer: {
    padding: SPACING.lg,
    borderTopLeftRadius: 42,
    borderTopRightRadius: 42,
    flexShrink: 0,
  },
  nextButton: {
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    letterSpacing: 1.2,
  },
});

