import { Modal, View, Text, StyleSheet, ScrollView } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { BORDER_RADIUS, COLORS, FONT_SIZES, SPACING, FONTS } from '@/constants';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';

type WagerInfoModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function WagerInfoModal({ visible, onClose }: WagerInfoModalProps) {
  const colors = useTheme();
  const { getTextStyle, t } = useI18n();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityRole="button">
        <Pressable
          style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.title, { color: colors.text }, getTextStyle(undefined, 'display', 'start')]}>
              {t('play.wagerInfoTitle')}
            </Text>
            <Text style={[styles.para, { color: colors.textSecondary }, getTextStyle()]}>
              {t('play.wagerInfoParagraph1')}
            </Text>
            <Text style={[styles.para, { color: colors.textSecondary }, getTextStyle()]}>
              {t('play.wagerInfoParagraph2')}
            </Text>

            <View style={[styles.table, { borderColor: colors.border }]}>
              <View style={[styles.tableRow, styles.tableHeaderRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.cell, styles.headerCell, { color: colors.text }, getTextStyle()]}>
                  {t('play.wagerInfoColMultiplier')}
                </Text>
                <Text style={[styles.cell, styles.headerCell, { color: colors.text }, getTextStyle()]}>
                  {t('play.wagerInfoColCorrect')}
                </Text>
                <Text style={[styles.cell, styles.headerCell, { color: colors.text }, getTextStyle()]}>
                  {t('play.wagerInfoColWrong')}
                </Text>
              </View>
              {(
                [
                  ['0.5x', '+0.5x', '-0.5x'],
                  ['1.5x', '+1.5x', '-1x'],
                  ['2x', '+2x', '-1.5x'],
                ] as const
              ).map((row) => (
                <View key={row[0]} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.cell, { color: colors.text }, getTextStyle()]}>{row[0]}</Text>
                  <Text style={[styles.cell, styles.cellPos, getTextStyle()]}>{row[1]}</Text>
                  <Text style={[styles.cell, styles.cellNeg, getTextStyle()]}>{row[2]}</Text>
                </View>
              ))}
            </View>

            <Text style={[styles.warning, { color: colors.textSecondary }, getTextStyle()]}>
              {t('play.wagerInfoWarning')}
            </Text>
          </ScrollView>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.doneButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('play.wagerInfoDone')}
          >
            <Text
              style={[
                styles.doneLabel,
                { color: COLORS.surface },
                getTextStyle(undefined, 'bodySemibold', 'center'),
              ]}
            >
              {t('play.wagerInfoDone')}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  card: {
    maxHeight: '85%',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  scroll: {
    maxHeight: 420,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    fontFamily: FONTS.uiSemibold,
    marginBottom: SPACING.md,
  },
  para: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  table: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    paddingHorizontal: SPACING.sm,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    alignItems: 'stretch',
  },
  tableHeaderRow: {
    borderBottomWidth: 1,
  },
  cell: {
    flex: 1,
    minWidth: 0,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
  },
  headerCell: {
    fontWeight: '700',
    fontFamily: FONTS.uiSemibold,
  },
  cellPos: {
    color: '#15803d',
  },
  cellNeg: {
    color: '#b91c1c',
  },
  warning: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  doneButton: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  doneLabel: {
    fontSize: FONT_SIZES.md,
  },
});
