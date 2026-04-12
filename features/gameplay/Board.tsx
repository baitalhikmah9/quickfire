import { View, Text, StyleSheet } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import type { QuestionCard } from '@/features/shared';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '@/constants';
import { useTheme } from '@/lib/hooks/useTheme';

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

export function Board({ questions, onSelectQuestion, selectedQuestionId }: BoardProps) {
  const colors = useTheme();
  const grouped = groupByCategory(questions);
  const categories = Array.from(grouped.keys());

  if (categories.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No questions loaded
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {categories.map((catName) => {
        const items = grouped.get(catName) ?? [];
        const sorted = [...items].sort((a, b) => a.pointValue - b.pointValue);
        return (
          <View key={catName} style={styles.categoryColumn}>
            <Text style={[styles.categoryTitle, { color: colors.text }]} numberOfLines={1}>
              {catName}
            </Text>
            <View style={styles.cells}>
              {sorted.map((q) => {
                const isUsed = q.used;
                const isSelected = q.id === selectedQuestionId;
                return (
                  <Pressable
                    key={q.id}
                    style={[
                      styles.cell,
                      {
                        backgroundColor: isUsed
                          ? colors.boardCellUsed
                          : isSelected
                            ? colors.boardCellActive
                            : colors.primary,
                      },
                    ]}
                    onPress={() => !isUsed && onSelectQuestion(q)}
                    disabled={isUsed}
                  >
                    <Text
                      style={[
                        styles.cellText,
                        isUsed && { color: colors.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {isUsed ? '—' : q.pointValue}
                    </Text>
                  </Pressable>
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
  container: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  categoryColumn: {
    width: 88,
    flexShrink: 0,
  },
  categoryTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  cells: {
    gap: SPACING.xs,
  },
  cell: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  cellText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  empty: {
    padding: SPACING.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
  },
});
