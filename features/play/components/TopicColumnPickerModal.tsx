import { useMemo } from 'react';
import {
  Modal,
  Platform,
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  type PressableProps,
} from 'react-native';
import { Image } from 'expo-image';
import { Pressable } from '@/components/ui/Pressable';
import { BORDER_RADIUS, FONT_SIZES, SPACING } from '@/constants';
import { FONTS } from '@/constants/theme';
import { getCategoryBoardAccent, getCategoryPictureSource } from '@/constants/categoryPictures';
import type { QuestionCard } from '@/features/shared';
import { getRowDirection } from '@/lib/i18n/direction';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';

export type TopicColumnPickerPayload = {
  categoryId: string;
  categoryName: string;
  rows: { pointValue: number; left: QuestionCard; right: QuestionCard }[];
};

type TopicColumnPickerModalProps = {
  visible: boolean;
  column: TopicColumnPickerPayload | null;
  usedQuestionIds: ReadonlySet<string>;
  onClose: () => void;
  onPickQuestion: (question: QuestionCard) => void;
};

const stopCardPressFromClosingOverlay: PressableProps['onPress'] = (e) => {
  if (typeof e.stopPropagation === 'function') {
    e.stopPropagation();
  }
};

export function TopicColumnPickerModal({
  visible,
  column,
  usedQuestionIds,
  onClose,
  onPickQuestion,
}: TopicColumnPickerModalProps) {
  const colors = useTheme();
  const { width, height } = useWindowDimensions();
  const { direction, getTextStyle, t } = useI18n();
  const rowDir = getRowDirection(direction);

  const cardMaxWidth = useMemo(() => Math.min(width - SPACING.lg * 2, 680), [width]);
  const heroMinHeight = useMemo(() => Math.min(220, Math.max(160, height * 0.28)), [height]);

  if (!visible || !column) {
    return null;
  }

  const accent = getCategoryBoardAccent(column.categoryId);
  const picture = getCategoryPictureSource(column.categoryId);
  const locale = column.rows[0]?.left.locale ?? 'en';

  const renderValueButton = (
    question: QuestionCard,
    a11yMode: 'single' | 'pairFirst' | 'pairSecond',
    layout: 'split' | 'full',
  ) => {
    const used = usedQuestionIds.has(question.id);
    const label =
      a11yMode === 'single'
        ? t('play.boardTopicModalPickA11y', { points: question.pointValue })
        : a11yMode === 'pairFirst'
          ? t('play.boardTopicModalPickSideOneA11y', { points: question.pointValue })
          : t('play.boardTopicModalPickSideTwoA11y', { points: question.pointValue });
    return (
      <Pressable
        style={({ pressed }) => [
          styles.valueTile,
          layout === 'full' && styles.valueTileFull,
          {
            borderColor: used ? colors.border : colors.primary,
            backgroundColor: used ? colors.boardCellUsed : colors.boardCell,
            opacity: used ? 0.5 : pressed ? 0.9 : 1,
          },
        ]}
        onPress={() => {
          if (used) return;
          onPickQuestion(question);
        }}
        disabled={used}
        accessibilityRole="button"
        accessibilityState={{ disabled: used }}
        accessibilityLabel={label}
      >
        <Text
          style={[
            styles.valueTileText,
            getTextStyle(question.locale, 'bodyBold', 'center'),
            { color: used ? colors.textSecondary : colors.primary },
          ]}
          numberOfLines={1}
        >
          {used ? '—' : question.pointValue}
        </Text>
      </Pressable>
    );
  };

  const body = (
    <Pressable style={styles.overlay} onPress={onClose} accessibilityRole="button">
      <Pressable
        style={[
          styles.sheet,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.border,
            maxWidth: cardMaxWidth,
            width: '100%',
          },
        ]}
        onPress={stopCardPressFromClosingOverlay}
        accessibilityViewIsModal
      >
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.hero, { minHeight: heroMinHeight, backgroundColor: colors.primary }]}>
            <View style={styles.heroInner}>
              {picture ? (
                <Image source={picture} style={styles.heroImage} contentFit="cover" transition={120} />
              ) : (
                <View style={[styles.heroFallback, { backgroundColor: `${accent}28` }]}>
                  <Text style={[styles.heroFallbackLetter, { color: accent }]}>{column.categoryName.charAt(0)}</Text>
                </View>
              )}
              <View style={styles.heroTitleBar}>
                <Text
                  style={[
                    styles.heroTitle,
                    getTextStyle(locale, 'bodyBold', 'center'),
                    { fontSize: FONT_SIZES.lg, lineHeight: FONT_SIZES.lg + 4 },
                  ]}
                  numberOfLines={3}
                >
                  {column.categoryName}
                </Text>
              </View>
            </View>
          </View>

          <Text style={[styles.hint, { color: colors.textSecondary }, getTextStyle(undefined, 'body', 'center')]}>
            {t('play.boardTopicModalHint')}
          </Text>

          <View style={styles.rows}>
            {column.rows.map((row) => {
              const sameClue = row.left.id === row.right.id;
              if (sameClue) {
                return (
                  <View key={row.pointValue} style={styles.rowFull}>
                    {renderValueButton(row.left, 'single', 'full')}
                  </View>
                );
              }
              return (
                <View key={row.pointValue} style={[styles.rowPair, { flexDirection: rowDir }]}>
                  {renderValueButton(row.left, 'pairFirst', 'split')}
                  <View style={styles.rowPairCenter}>
                    <Text style={[styles.rowPointLabel, { color: colors.textSecondary }, getTextStyle()]}>
                      {row.pointValue}
                    </Text>
                  </View>
                  {renderValueButton(row.right, 'pairSecond', 'split')}
                </View>
              );
            })}
          </View>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
                opacity: pressed ? 0.88 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('play.boardTopicModalClose')}
          >
            <Text style={[styles.closeButtonLabel, { color: colors.text }, getTextStyle(undefined, 'bodySemibold', 'center')]}>
              {t('play.boardTopicModalClose')}
            </Text>
          </Pressable>
        </ScrollView>
      </Pressable>
    </Pressable>
  );

  if (Platform.OS === 'web') {
    return <View style={styles.webOverlayRoot}>{body}</View>;
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      {body}
    </Modal>
  );
}

const styles = StyleSheet.create({
  webOverlayRoot: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  sheet: {
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 2,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  sheetScroll: {
    maxHeight: '100%',
  },
  sheetScrollContent: {
    paddingBottom: SPACING.lg,
    gap: SPACING.md,
  },
  hero: {
    width: '100%',
    borderTopLeftRadius: BORDER_RADIUS.xl - 2,
    borderTopRightRadius: BORDER_RADIUS.xl - 2,
    overflow: 'hidden',
    padding: SPACING.sm,
  },
  heroInner: {
    flex: 1,
    minHeight: 120,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroFallbackLetter: {
    fontSize: 72,
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
  },
  heroTitleBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
  },
  hint: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xs,
  },
  rows: {
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  rowPair: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  rowPairCenter: {
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowPointLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  rowFull: {
    width: '100%',
  },
  valueTile: {
    flex: 1,
    minHeight: 56,
    minWidth: 0,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  valueTileFull: {
    flexGrow: 0,
    width: '100%',
  },
  valueTileText: {
    fontSize: 22,
    fontWeight: '800',
  },
  closeButton: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xs,
    minHeight: 48,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  closeButtonLabel: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.uiSemibold,
  },
});
