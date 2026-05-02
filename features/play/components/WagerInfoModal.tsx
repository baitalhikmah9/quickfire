import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { FONT_SIZES, SPACING, FONTS } from '@/constants';
import { useI18n } from '@/lib/i18n/useI18n';
import { HOME_SOFT_UI } from '@/themes';
import type { ViewStyle } from 'react-native';

const T = HOME_SOFT_UI.colors;

/** Deeper drop shadow — reads as a raised plastic tile (tier scales with control size). */
function neumorphicLift(
  shadowColor: string,
  tier: 'hero' | 'header' | 'pill' | 'card'
): ViewStyle {
  const m =
    tier === 'hero'
      ? { h: 14, op: 0.35, r: 28, el: 18 }
      : tier === 'header'
        ? { h: 8, op: 0.28, r: 18, el: 12 }
        : tier === 'card'
          ? { h: 10, op: 0.22, r: 22, el: 10 }
          : { h: 6, op: 0.25, r: 14, el: 8 };
  return {
    shadowColor,
    shadowOffset: { width: 0, height: m.h },
    shadowOpacity: m.op,
    shadowRadius: m.r,
    elevation: m.el,
  };
}

/** Light top lip + soft bottom edge — reads extruded on white squircles. */
const PLASTIC_FACE: ViewStyle = {
  borderTopWidth: 2,
  borderTopColor: 'rgba(255, 255, 255, 0.78)',
  borderBottomWidth: StyleSheet.hairlineWidth * 2,
  borderBottomColor: 'rgba(0, 0, 0, 0.1)',
};

type WagerInfoModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function WagerInfoModal({ visible, onClose }: WagerInfoModalProps) {
  const { t, getTextStyle } = useI18n();

  if (!visible) {
    return null;
  }

  return (
    <View
      accessibilityViewIsModal
      style={styles.overlay}
      testID="wager-info-overlay"
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityLabel={t('common.close')}
        accessibilityRole="button"
      />
      <View
        style={[styles.card, { backgroundColor: T.surface }, neumorphicLift(T.shadowStrong, 'hero')]}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { color: T.textPrimary }, getTextStyle(undefined, 'display', 'start')]}>
            {t('play.wagerInfoTitle')}
          </Text>
          <Text style={[styles.para, { color: T.textMuted }, getTextStyle()]}>
            {t('play.wagerInfoParagraph1')}
          </Text>
          <Text style={[styles.para, { color: T.textMuted }, getTextStyle()]}>
            {t('play.wagerInfoParagraph2')}
          </Text>

          <View style={[styles.table, { borderColor: T.shadow }]}>
            <View style={[styles.tableRow, styles.tableHeaderRow, { borderBottomColor: T.shadow }]}>
              <Text style={[styles.cell, styles.headerCell, { color: T.textPrimary }, getTextStyle()]}>
                {t('play.wagerInfoColMultiplier')}
              </Text>
              <Text style={[styles.cell, styles.headerCell, { color: T.textPrimary }, getTextStyle()]}>
                {t('play.wagerInfoColCorrect')}
              </Text>
              <Text style={[styles.cell, styles.headerCell, { color: T.textPrimary }, getTextStyle()]}>
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
              <View key={row[0]} style={[styles.tableRow, { borderBottomColor: T.shadow }]}>
                <Text style={[styles.cell, { color: T.textPrimary }, getTextStyle()]}>{row[0]}</Text>
                <Text style={[styles.cell, styles.cellPos, getTextStyle()]}>{row[1]}</Text>
                <Text style={[styles.cell, styles.cellNeg, getTextStyle()]}>{row[2]}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.warning, { color: T.textMuted }, getTextStyle()]}>
            {t('play.wagerInfoWarning')}
          </Text>
        </ScrollView>


      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    elevation: 50,
    backgroundColor: 'rgba(51, 51, 51, 0.45)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  card: {
    maxHeight: '85%',
    borderRadius: 42,
    overflow: 'hidden',
    ...PLASTIC_FACE,
  },
  scroll: {
    maxHeight: 420,
  },
  scrollContent: {
    padding: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.displayBold,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  para: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: SPACING.sm,
    textAlign: 'center',
    fontFamily: FONTS.ui,
  },
  table: {
    borderWidth: 1,
    borderRadius: 24,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.02)',
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
    fontSize: 14,
    textAlign: 'center',
    fontFamily: FONTS.uiSemibold,
  },
  headerCell: {
    fontFamily: FONTS.displayBold,
    textTransform: 'uppercase',
    fontSize: 12,
  },
  cellPos: {
    color: '#16A34A',
    fontFamily: FONTS.uiBold,
  },
  cellNeg: {
    color: '#DC2626',
    fontFamily: FONTS.uiBold,
  },
  warning: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
    textAlign: 'center',
    fontFamily: FONTS.ui,
    opacity: 0.8,
  },

});
