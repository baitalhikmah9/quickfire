import { View, Text, StyleSheet } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import type { QuestionCard } from '@/features/shared';
import { SPACING, FONTS } from '@/constants';
import { HOME_SOFT_UI } from '@/themes';

const T = HOME_SOFT_UI;

interface BoardProps {
  questions: QuestionCard[];
  onSelectQuestion: (question: QuestionCard) => void;
  selectedQuestionId?: string;
}

/** Group questions by category for grid display */
function groupByCategory(questions: QuestionCard[]): Map<string, QuestionCard[]> {
  const map = new Map<string, QuestionCard[]>();
  for (const q of questions) {
    const list = map.get(q.categoryName) ?? [];
    list.push(q);
    map.set(q.categoryName, list);
  }
  return map;
}

/** Blocky plastic shadow tier. */
function neumorphicLift3D(tier: 'pill' | 'card' | 'cell'): any {
  const m =
    tier === 'card'
      ? { h: 8, el: 10 }
      : tier === 'cell'
      ? { h: 4, el: 4 }
      : { h: 6, el: 8 };

  return {
    shadowColor: 'rgba(51, 51, 51, 0.15)',
    shadowOffset: { width: 0, height: m.h },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: m.el,
  };
}

export function Board({ questions, onSelectQuestion, selectedQuestionId }: BoardProps) {
  const grouped = groupByCategory(questions);
  const categories = Array.from(grouped.keys());

  const canvas = T.colors.canvas;
  const surface = T.colors.surface;
  const textPrimary = T.colors.textPrimary;
  const textMuted = T.colors.textMuted;

  if (categories.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: canvas }]}>
        <Text style={[styles.emptyText, { color: textMuted }]}>
          NO QUESTIONS LOADED
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: canvas }]}>
      {categories.map((catName) => {
        const items = grouped.get(catName) ?? [];
        const sorted = [...items].sort((a, b) => a.pointValue - b.pointValue);
        return (
          <View key={catName} style={styles.categoryColumn}>
            <Text style={[styles.categoryTitle, { color: textPrimary }]} numberOfLines={1}>
              {catName.toUpperCase()}
            </Text>
            <View style={styles.cells}>
              {sorted.map((q) => {
                const isUsed = q.used;
                const isSelected = q.id === selectedQuestionId;
                return (
                  <View key={q.id} style={styles.cellWrapper}>
                    {isSelected && <View style={styles.selectionGlow} />}
                    <Pressable
                      style={({ pressed }) => [
                        styles.cell,
                        styles.plasticFace,
                        {
                          backgroundColor: surface,
                          opacity: isUsed ? 0.35 : (pressed ? 0.94 : 1),
                          transform: pressed ? [{ scale: 0.96 }] : [{ scale: 1 }],
                        },
                        !isUsed && neumorphicLift3D('cell'),
                        isSelected && { shadowColor: '#FFB347', shadowOpacity: 0.45 },
                      ]}
                      onPress={() => !isUsed && onSelectQuestion(q)}
                      disabled={isUsed}
                    >
                      <Text
                        style={[
                          styles.cellText,
                          { color: isUsed ? textMuted : textPrimary },
                        ]}
                      >
                        {isUsed ? '✕' : q.pointValue}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  plasticFace: {
    borderTopWidth: 2,
    borderTopColor: 'rgba(255, 255, 255, 0.78)',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  container: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'flex-start',
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  categoryColumn: {
    width: 100,
    flexShrink: 0,
    gap: SPACING.md,
  },
  categoryTitle: {
    fontSize: 11,
    fontFamily: FONTS.displayBold,
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  cells: {
    gap: SPACING.md,
  },
  cellWrapper: {
    position: 'relative',
  },
  selectionGlow: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 18,
    backgroundColor: '#FFB347',
    opacity: 0.25,
  },
  cell: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    letterSpacing: 0.5,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: FONTS.uiBold,
    letterSpacing: 1,
  },
});

