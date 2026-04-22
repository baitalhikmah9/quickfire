import { Fragment } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '@/constants';
import { COLORS, FONTS } from '@/constants/theme';
import { getRowDirection } from '@/lib/i18n/direction';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';
import type { GameSessionState } from '@/features/shared';
import { usePlayStore } from '@/store/play';

/** Below this width, use the compact strip typography and chrome. */
const NARROW_SCORE_BREAKPOINT = 560;

interface ScoreHudProps {
  session: GameSessionState;
  compact?: boolean;
  /** Tighter chrome for board / landscape — stacks under compact. */
  dense?: boolean;
}

export function ScoreHud({ session, compact, dense }: ScoreHudProps) {
  const colors = useTheme();
  const { width } = useWindowDimensions();
  const { direction, getTextStyle, t } = useI18n();
  const adjustScoreByPoints = usePlayStore((state) => state.adjustScoreByPoints);
  const showWagerMeta = session.config.wagerEnabled;
  const useStripLayout = dense || width < NARROW_SCORE_BREAKPOINT;
  const compactSegment = useStripLayout || dense;

  const showMetaExtras =
    (session.wager && showWagerMeta) || session.bonus.active;

  const metaRowEl = showMetaExtras ? (
    <View
      style={[
        styles.metaRow,
        dense && styles.metaRowDense,
        useStripLayout && styles.metaRowNarrow,
        { flexDirection: getRowDirection(direction) },
      ]}
    >
      {session.wager && showWagerMeta ? (
        <Text
          style={[
            styles.metaText,
            compact && styles.metaTextCompact,
            dense && styles.metaTextDense,
            useStripLayout && styles.metaTextNarrow,
            { color: COLORS.secondary },
            getTextStyle(),
          ]}
        >
          Wager x{session.wager.multiplier}
        </Text>
      ) : null}
      {session.bonus.active ? (
        <Text
          style={[
            styles.metaText,
            compact && styles.metaTextCompact,
            dense && styles.metaTextDense,
            useStripLayout && styles.metaTextNarrow,
            { color: colors.warning },
            getTextStyle(),
          ]}
        >
          Bonus x{session.bonus.multiplier}
        </Text>
      ) : null}
    </View>
  ) : null;

  return (
    <View
      style={[
        styles.hudOuter,
        compact && styles.hudOuterCompact,
        dense && styles.hudOuterDense,
        useStripLayout && styles.hudOuterStrip,
      ]}
    >
      {metaRowEl}
      <View
        style={[
          styles.mergedScoreBar,
          compactSegment && styles.mergedScoreBarCompact,
          {
            borderColor: colors.border,
            backgroundColor: colors.cardBackground,
            flexDirection: getRowDirection(direction),
          },
        ]}
        accessibilityRole="summary"
      >
        {session.teams.map((team, index) => {
          const isActive = team.id === session.currentTeamId;
          const wagerLabel = showWagerMeta
            ? t('play.wagersUsed', {
                used: team.wagersUsed,
                total: session.wagersPerTeam,
              })
            : '';
          return (
            <Fragment key={team.id}>
              {index > 0 ? (
                <View
                  style={[styles.segmentDivider, { backgroundColor: colors.border }]}
                  importantForAccessibility="no-hide-descendants"
                />
              ) : null}
              <View
                style={[
                  styles.teamSegment,
                  compactSegment ? styles.teamSegmentCompact : styles.teamSegmentRelaxed,
                  { backgroundColor: isActive ? `${colors.primary}12` : 'transparent' },
                ]}
                accessibilityLabel={`${team.name}, ${t('common.points', { count: team.score })}${showWagerMeta ? `, ${wagerLabel}` : ''}`}
              >
                <View
                  style={[
                    styles.teamSegmentStack,
                    compactSegment && styles.teamSegmentStackCompact,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentTeamLabel,
                      compactSegment ? styles.segmentTeamLabelCompact : styles.segmentTeamLabelRelaxed,
                      { color: colors.textSecondary },
                      getTextStyle(undefined, 'bodySemibold', 'center'),
                    ]}
                    numberOfLines={1}
                  >
                    {team.name}
                  </Text>
                  <Text
                    style={[
                      styles.segmentScoreValue,
                      compactSegment ? styles.segmentScoreValueCompact : styles.segmentScoreValueRelaxed,
                      { color: colors.text },
                      getTextStyle(undefined, 'displayBold', 'center'),
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                  >
                    {team.score}
                  </Text>
                  <View style={styles.scoreAdjustRow}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${team.name} minus 50`}
                      onPress={() => adjustScoreByPoints(team.id, -50, 'score hud decrement')}
                      style={({ pressed }) => [
                        styles.scoreAdjustButton,
                        { borderColor: colors.border, opacity: pressed ? 0.82 : 1 },
                      ]}
                    >
                      <Text style={[styles.scoreAdjustText, { color: colors.textSecondary }]}>-50</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${team.name} plus 50`}
                      onPress={() => adjustScoreByPoints(team.id, 50, 'score hud increment')}
                      style={({ pressed }) => [
                        styles.scoreAdjustButton,
                        { borderColor: colors.border, opacity: pressed ? 0.82 : 1 },
                      ]}
                    >
                      <Text style={[styles.scoreAdjustText, { color: colors.textSecondary }]}>+50</Text>
                    </Pressable>
                  </View>
                  {showWagerMeta ? (
                    <Text
                      style={[
                        styles.segmentWagerLine,
                        compactSegment && styles.segmentWagerLineCompact,
                        { color: colors.textSecondary },
                        getTextStyle(undefined, 'body', 'center'),
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {t('play.wagersUsed', {
                        used: team.wagersUsed,
                        total: session.wagersPerTeam,
                      })}
                    </Text>
                  ) : null}
                </View>
              </View>
            </Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hudOuter: {
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  hudOuterCompact: {
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  hudOuterDense: {
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  hudOuterStrip: {
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  mergedScoreBar: {
    borderWidth: 2,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    alignItems: 'stretch',
  },
  mergedScoreBarCompact: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
  },
  segmentDivider: {
    width: StyleSheet.hairlineWidth * 2,
    minWidth: 1,
    alignSelf: 'stretch',
  },
  teamSegment: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  teamSegmentCompact: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    minHeight: 52,
  },
  teamSegmentRelaxed: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minHeight: 68,
  },
  teamSegmentStack: {
    flex: 1,
    width: '100%',
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  teamSegmentStackCompact: {
    gap: 2,
  },
  segmentTeamLabel: {
    width: '100%',
    fontFamily: FONTS.uiSemibold,
    letterSpacing: 0.2,
  },
  segmentTeamLabelCompact: {
    fontSize: 10,
    lineHeight: 12,
  },
  segmentTeamLabelRelaxed: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 18,
  },
  segmentScoreValue: {
    fontFamily: FONTS.displayBold,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  segmentScoreValueCompact: {
    fontSize: 22,
    lineHeight: 26,
  },
  segmentScoreValueRelaxed: {
    fontSize: FONT_SIZES.xxxl,
    lineHeight: 40,
  },
  segmentWagerLine: {
    width: '100%',
    fontFamily: FONTS.uiMedium,
    fontVariant: ['tabular-nums'],
    fontSize: FONT_SIZES.xs,
    lineHeight: 14,
    opacity: 0.92,
  },
  scoreAdjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  scoreAdjustButton: {
    minWidth: 38,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreAdjustText: {
    fontSize: 10,
    fontFamily: FONTS.uiBold,
    letterSpacing: 0.2,
  },
  segmentWagerLineCompact: {
    fontSize: 10,
    lineHeight: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaRowDense: {
    paddingBottom: 2,
  },
  metaRowNarrow: {
    gap: SPACING.xs,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.uiSemibold,
  },
  metaTextCompact: {
    fontSize: FONT_SIZES.xs,
  },
  metaTextDense: {
    fontSize: 10,
  },
  metaTextNarrow: {
    fontSize: 10,
    lineHeight: 14,
  },
});
