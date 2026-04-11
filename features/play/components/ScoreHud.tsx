import { View, Text, StyleSheet } from 'react-native';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '@/constants';
import { COLORS, FONTS, TYPE_SCALE } from '@/constants/theme';
import { getRowDirection } from '@/lib/i18n/direction';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';
import type { GameSessionState } from '@/features/shared';

interface ScoreHudProps {
  session: GameSessionState;
  compact?: boolean;
}

function formatPhase(
  phase: GameSessionState['phase'],
  t: ReturnType<typeof useI18n>['t']
) {
  switch (phase) {
    case 'wagerDecision':
      return t('play.phase.board');
    case 'questionReveal':
      return t('play.phase.question');
    case 'answerLock':
    case 'scoring':
      return t('play.phase.answer');
    case 'completed':
      return t('play.phase.finished');
    default:
      return t('play.phase.play');
  }
}

export function ScoreHud({ session, compact }: ScoreHudProps) {
  const colors = useTheme();
  const { direction, getTextStyle, t } = useI18n();
  const showWagerMeta = session.config.wagerEnabled;

  return (
    <View
      style={[
        styles.container,
        compact && styles.containerCompact,
        {
          backgroundColor: colors.cardBackground,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={[styles.metaRow, { flexDirection: getRowDirection(direction) }]}>
        <Text style={[styles.phasePill, compact && styles.phasePillCompact, { backgroundColor: colors.primary }]}>
          {formatPhase(session.phase, t).toUpperCase()}
        </Text>
        {session.wager && showWagerMeta ? (
          <Text style={[styles.metaText, compact && styles.metaTextCompact, { color: COLORS.secondary }, getTextStyle()]}>
            Wager x{session.wager.multiplier}
          </Text>
        ) : null}
        {session.bonus.active ? (
          <Text style={[styles.metaText, compact && styles.metaTextCompact, { color: colors.warning }, getTextStyle()]}>
            Bonus x{session.bonus.multiplier}
          </Text>
        ) : null}
      </View>

      <View style={[styles.scoreRow, { flexDirection: getRowDirection(direction) }]}>
        {session.teams.map((team) => {
          const isActive = team.id === session.currentTeamId;
          return (
            <View
              key={team.id}
              style={[
                styles.teamCard,
                compact && styles.teamCardCompact,
                {
                  borderColor: isActive ? colors.primary : colors.border,
                  backgroundColor: isActive ? `${colors.primary}12` : colors.background,
                },
              ]}
            >
              <Text
                style={[
                  styles.teamName,
                  compact && styles.teamNameCompact,
                  { color: colors.text },
                  getTextStyle(undefined, 'bodyBold', 'start'),
                ]}
                numberOfLines={1}
              >
                {team.name}
              </Text>
              <Text
                style={[
                  styles.teamScore,
                  compact && styles.teamScoreCompact,
                  { color: colors.text },
                  getTextStyle(undefined, 'displayBold', 'start'),
                ]}
              >
                {team.score}
              </Text>
              {showWagerMeta ? (
                <Text style={[styles.teamMeta, compact && styles.teamMetaCompact, { color: colors.textSecondary }, getTextStyle()]}>
                  {t('play.wagersUsed', {
                    used: team.wagersUsed,
                    total: session.wagersPerTeam,
                  })}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
    borderWidth: 2,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  containerCompact: {
    marginBottom: SPACING.sm,
    padding: SPACING.sm,
    gap: SPACING.sm,
  },
  metaRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  phasePill: {
    ...TYPE_SCALE.labelCap,
    fontFamily: FONTS.uiBold,
    color: '#FFFFFF',
    overflow: 'hidden',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.pill,
  },
  phasePillCompact: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    fontSize: 10,
  },
  metaText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.uiSemibold,
  },
  metaTextCompact: {
    fontSize: FONT_SIZES.xs,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  teamCard: {
    flex: 1,
    borderWidth: 2,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    minHeight: 88,
  },
  teamCardCompact: {
    minHeight: 56,
    padding: SPACING.xs,
  },
  teamName: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.uiBold,
    marginBottom: 4,
  },
  teamNameCompact: {
    fontSize: FONT_SIZES.xs,
    marginBottom: 2,
  },
  teamScore: {
    fontSize: FONT_SIZES.xxl,
    fontFamily: FONTS.displayBold,
    marginBottom: 4,
  },
  teamScoreCompact: {
    fontSize: FONT_SIZES.lg,
    marginBottom: 0,
  },
  teamMeta: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.ui,
  },
  teamMetaCompact: {
    fontSize: 10,
  },
});
