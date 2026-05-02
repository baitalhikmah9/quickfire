import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Pressable } from '@/components/ui/Pressable';
import { SPACING } from '@/constants';
import { SHOW_HOT_SEAT_UI } from '@/constants/featureFlags';
import { FONTS } from '@/constants/theme';
import { useI18n } from '@/lib/i18n/useI18n';
import type { GameSessionState, TeamState } from '@/features/shared';
import { HOME_SOFT_UI } from '@/themes';

const T = HOME_SOFT_UI;

const WAGER_HEADER_ART = require('@/assets/wager.png');
const HOT_SEAT_HEADER_ART = require('@/assets/hot seat.png');
const QF_LOGO = require('@/assets/QF logo.png');

/** Board “current team” highlight — orange (matches play board). */
const ACTIVE_TURN_TINT = 'rgba(255, 179, 71, 0.12)';

function isHotSeatConfigured(session: GameSessionState): boolean {
  if (!SHOW_HOT_SEAT_UI) return false;
  const mode = session.config.mode;
  if (mode !== 'classic' && mode !== 'quickPlay') return false;
  return (session.config.hotSeatRounds ?? 0) > 0;
}

/** No remaining Hot Seat rounds (match-level). */
function isHotSeatFullyPlayed(session: GameSessionState): boolean {
  if (!isHotSeatConfigured(session)) return false;
  const hs = session.hotSeat;
  if (!hs?.challenges.length) return false;
  if (hs.activeChallenge) return false;
  return hs.challenges.every((c) => c.completed);
}

function isWagerExhaustedForTeam(team: TeamState, session: GameSessionState): boolean {
  if (!session.config.wagerEnabled) return false;
  return team.wagersUsed >= session.wagersPerTeam;
}

export interface PlayMatchTopBarProps {
  session: GameSessionState;
  onLogoPress: () => void;
  onWagerInfoPress?: () => void;
  onHotSeatInfoPress?: () => void;
  /** Smaller logo when vertical space is tight (e.g. question chrome below). */
  compact?: boolean;
}

/**
 * Shared top bar: team scores + wager/hot-seat chips, QuickFire logo, mirrored team card.
 * Matches `app/(app)/play/board.tsx` game header chrome.
 */
export function PlayMatchTopBar({
  session,
  onLogoPress,
  onWagerInfoPress,
  onHotSeatInfoPress,
  compact,
}: PlayMatchTopBarProps) {
  const { t } = useI18n();
  const showWager = session.config.wagerEnabled && onWagerInfoPress;
  const showHotSeat = isHotSeatConfigured(session) && onHotSeatInfoPress;
  const hotSeatDimmed = isHotSeatFullyPlayed(session);
  const isRumble = session.mode === 'rumble';

  const renderIconCluster = (team: TeamState) => {
    if (!showWager && !showHotSeat) return null;

    const wagerDimmed = isWagerExhaustedForTeam(team, session);

    return (
      <View style={styles.headerTeamIconsRow} accessibilityElementsHidden={false}>
        {showWager ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('play.wagerHelpLink')} — ${t('play.wagersUsed', {
              used: team.wagersUsed,
              total: session.wagersPerTeam,
            })}`}
            onPress={onWagerInfoPress}
            style={({ pressed }) => [
              styles.headerIconChip,
              wagerDimmed && styles.headerIconChipDimmed,
              pressed && !wagerDimmed && styles.headerFeatureButtonPressed,
            ]}
          >
            <Image source={WAGER_HEADER_ART} style={styles.headerIconChipImage} contentFit="contain" />
          </Pressable>
        ) : null}
        {showHotSeat ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              hotSeatDimmed
                ? `${t('play.hotSeatInfoLink')} — ${t('play.hotSeatAllRoundsPlayed')}`
                : t('play.hotSeatInfoLink')
            }
            onPress={onHotSeatInfoPress}
            style={({ pressed }) => [
              styles.headerIconChip,
              hotSeatDimmed && styles.headerIconChipDimmed,
              pressed && !hotSeatDimmed && styles.headerFeatureButtonPressed,
            ]}
          >
            <Image source={HOT_SEAT_HEADER_ART} style={styles.headerIconChipImage} contentFit="contain" />
          </Pressable>
        ) : null}
      </View>
    );
  };

  const renderScoreCard = (team: TeamState, alignRight = false, compactScore = false) => {
    const isActive = session.currentTeamId === team.id;

    return (
      <View
        key={team.id}
        style={[
          styles.teamScoreHeader,
          alignRight && styles.teamScoreHeaderRight,
          compactScore && styles.rumbleTeamScoreHeader,
        ]}
      >
        <View
          style={[
            styles.headerScoreCard,
            compactScore && styles.rumbleScoreCard,
            isActive && {
              borderColor: T.colors.accentGlow,
              backgroundColor: ACTIVE_TURN_TINT,
            },
          ]}
        >
          <View style={[styles.headerTeamRow, compactScore && styles.rumbleTeamRow]}>
            <View style={styles.headerTeamNameBlock}>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[
                  styles.headerTeamName,
                  compactScore && styles.rumbleTeamName,
                  isActive && styles.headerTeamNameActive,
                ]}
              >
                {team.name}
              </Text>
            </View>
            <View
              style={[
                styles.headerScoreBadge,
                compactScore && styles.rumbleScoreBadge,
                isActive && { backgroundColor: T.colors.surface, borderColor: T.colors.accentGlow },
              ]}
            >
              <Text style={[styles.headerScoreValue, compactScore && styles.rumbleScoreValue]}>
                {team.score}
              </Text>
            </View>
            {compactScore ? null : renderIconCluster(team)}
          </View>
        </View>
      </View>
    );
  };

  if (isRumble) {
    return (
      <View style={styles.rumbleTopBar}>
        <Pressable
          onPress={onLogoPress}
          style={styles.rumbleLogoContainer}
          accessibilityRole="button"
          accessibilityLabel="QuickFire"
        >
          <Image
            source={QF_LOGO}
            style={[styles.rumbleLogo, compact && styles.rumbleLogoCompact]}
            contentFit="contain"
          />
        </Pressable>
        <View style={styles.rumbleScoresWrap}>
          {session.teams.map((team) => renderScoreCard(team, false, true))}
        </View>
      </View>
    );
  }

  const team0 = session.teams[0];
  const team1 = session.teams[1];

  return (
    <View style={styles.gameTopBar}>
      <View style={styles.topBarSide}>
        {team0 ? (
          renderScoreCard(team0)
        ) : null}
      </View>

      <Pressable onPress={onLogoPress} style={styles.headerLogoContainer} accessibilityRole="button" accessibilityLabel="QuickFire">
        <Image source={QF_LOGO} style={[styles.headerLogo, compact && styles.headerLogoCompact]} contentFit="contain" />
      </Pressable>

      <View style={styles.topBarSide}>
        {team1 ? (
          renderScoreCard(team1, true)
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gameTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: 'transparent',
  },
  topBarSide: {
    flex: 1,
    minWidth: 0,
  },
  rumbleTopBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  rumbleScoresWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  teamScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  rumbleTeamScoreHeader: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 86,
    maxWidth: 132,
  },
  teamScoreHeaderRight: {
    justifyContent: 'flex-end',
  },
  headerScoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    maxWidth: '100%',
    flexShrink: 1,
    paddingLeft: SPACING.sm,
    paddingRight: 6,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: T.colors.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    shadowColor: T.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  rumbleScoreCard: {
    width: '100%',
    paddingLeft: 7,
    paddingRight: 5,
    paddingVertical: 4,
    borderRadius: 14,
  },
  headerTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  rumbleTeamRow: {
    gap: 5,
  },
  headerTeamIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  headerTeamNameBlock: {
    flex: 1,
    minWidth: 0,
    paddingLeft: 2,
  },
  headerTeamName: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 14,
    lineHeight: 18,
    color: T.colors.textPrimary,
  },
  rumbleTeamName: {
    fontSize: 11,
    lineHeight: 14,
  },
  headerTeamNameActive: {
    fontFamily: FONTS.uiBold,
  },
  headerScoreBadge: {
    minWidth: 40,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rumbleScoreBadge: {
    minWidth: 28,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 9,
  },
  headerScoreValue: {
    fontFamily: FONTS.displayBold,
    fontSize: 17,
    fontVariant: ['tabular-nums'],
    color: T.colors.textPrimary,
    textAlign: 'center',
  },
  rumbleScoreValue: {
    fontSize: 13,
    lineHeight: 16,
  },
  headerIconChip: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  headerIconChipDimmed: {
    opacity: 0.4,
  },
  headerIconChipImage: {
    width: 22,
    height: 22,
  },
  headerFeatureButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
  headerLogoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rumbleLogoContainer: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerLogo: {
    width: 180,
    height: 48,
  },
  headerLogoCompact: {
    width: 150,
    height: 40,
  },
  rumbleLogo: {
    width: 56,
    height: 26,
  },
  rumbleLogoCompact: {
    width: 48,
    height: 22,
  },
});
