import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import type { QuestionCard } from '@/features/shared';
import { SPACING, FONTS } from '@/constants';
import { HOME_SOFT_UI } from '@/themes';
import { useResponsivePlayFontSizes } from '@/utils/responsiveTypography';

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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

function getBoardMetrics(
  width: number,
  height: number,
  columns: number,
  rows: number,
  fontSizes: ReturnType<typeof useResponsivePlayFontSizes>
) {
  const shortSide = Math.max(1, Math.min(width || 390, height || 390));
  const padding = clamp(Math.round(shortSide * 0.025), 4, SPACING.lg);
  const columnGap = clamp(Math.round(shortSide * 0.018), 3, SPACING.md);
  const rowGap = clamp(Math.round(shortSide * 0.014), 2, SPACING.md);
  const columnWidth = Math.max(
    24,
    (Math.max(1, width) - padding * 2 - columnGap * (columns - 1)) / columns
  );
  const titleFontSize = clamp(Math.min(fontSizes.categoryTitle, columnWidth * 0.16), 8, 22);
  const titleLineHeight = Math.round(titleFontSize * 1.15);
  const titleHeight = titleLineHeight * 2;
  const availableForCells = Math.max(
    rows,
    Math.max(1, height) - padding * 2 - titleHeight - rowGap * rows
  );
  const cellHeight = availableForCells / rows;
  const pointFontSize = clamp(Math.min(fontSizes.pointValue, cellHeight * 0.44, columnWidth * 0.28), 6, 22);

  return {
    padding,
    columnGap,
    rowGap,
    columnWidth,
    cellHeight,
    titleFontSize,
    titleLineHeight,
    pointFontSize,
    pointLineHeight: Math.round(pointFontSize * 1.15),
  };
}

export function Board({ questions, onSelectQuestion, selectedQuestionId }: BoardProps) {
  const fontSizes = useResponsivePlayFontSizes();
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const grouped = groupByCategory(questions);
  const categories = Array.from(grouped.keys());
  const rowCount = Math.max(1, ...categories.map((catName) => grouped.get(catName)?.length ?? 0));
  const columnCount = Math.max(1, categories.length);
  const boardMetrics = useMemo(
    () => getBoardMetrics(layout.width, layout.height, columnCount, rowCount, fontSizes),
    [columnCount, fontSizes, layout.height, layout.width, rowCount]
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayout((current) =>
      current.width === width && current.height === height ? current : { width, height }
    );
  };

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
    <View
      onLayout={handleLayout}
      style={[
        styles.container,
        {
          backgroundColor: canvas,
          gap: boardMetrics.columnGap,
          padding: boardMetrics.padding,
        },
      ]}
    >
      {categories.map((catName) => {
        const items = grouped.get(catName) ?? [];
        const sorted = [...items].sort((a, b) => a.pointValue - b.pointValue);
        return (
          <View key={catName} style={[styles.categoryColumn, { width: boardMetrics.columnWidth, gap: boardMetrics.rowGap }]}>
            <Text
              style={[
                styles.categoryTitle,
                {
                  color: textPrimary,
                  fontSize: boardMetrics.titleFontSize,
                  lineHeight: boardMetrics.titleLineHeight,
                },
              ]}
              numberOfLines={2}
            >
              {catName.toUpperCase()}
            </Text>
            <View style={[styles.cells, { gap: boardMetrics.rowGap }]}>
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
                          height: boardMetrics.cellHeight,
                          borderRadius: Math.min(16, boardMetrics.cellHeight / 3),
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
                          {
                            color: isUsed ? textMuted : textPrimary,
                            fontSize: boardMetrics.pointFontSize,
                            lineHeight: boardMetrics.pointLineHeight,
                          },
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
    flex: 1,
    minHeight: 0,
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'stretch',
  },
  categoryColumn: {
    flexShrink: 1,
  },
  categoryTitle: {
    fontSize: 11,
    fontFamily: FONTS.displayBold,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  cells: {
    flexShrink: 1,
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

