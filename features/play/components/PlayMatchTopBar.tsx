import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { BackfireTitleLogo } from '@/components/BackfireTitleLogo';
import { Pressable } from '@/components/ui/Pressable';
import { SPACING } from '@/constants';
import { getBackfireTitleLogoWidth, getGameHeaderLogoDisplayWidth } from '@/lib/layout/backfireTitleLogoWidth';
import { SHOW_HOT_SEAT_UI } from '@/constants/featureFlags';
import { FONTS } from '@/constants/theme';
import { useI18n } from '@/lib/i18n/useI18n';
import type { GameSessionState, TeamState } from '@/features/shared';
import { getLeadingTeamId } from '@/features/play/categorySections';
import { HOME_SOFT_UI } from '@/themes';
import { useResponsivePlayFontSizes } from '@/utils/responsiveTypography';
import { usePlayStore } from '@/store/play';

const T = HOME_SOFT_UI;

const WAGER_HEADER_ART = require('@/assets/wager.png');
const HOT_SEAT_HEADER_ART = require('@/assets/hot seat.png');
const BACKFIRE_IN_GAME_LOGO = require('@/assets/BF in game logo safe.png');

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
  /** When false, only the centered BackFire logo is shown unless scorePillsNextToLogo is true. */
  showTeamScores?: boolean;
  scorePillsNextToLogo?: boolean;
}

/**
 * Shared top bar: team scores + wager/hot-seat chips, Backfire wordmark, mirrored team card.
 * Matches `app/(app)/play/board.tsx` game header chrome.
 */
export function PlayMatchTopBar({
  session,
  onLogoPress,
  onWagerInfoPress,
  onHotSeatInfoPress,
  compact,
  showTeamScores = true,
  scorePillsNextToLogo = false,
}: PlayMatchTopBarProps) {
  const { t } = useI18n();
  const { width, height } = useWindowDimensions();
  const fontSizes = useResponsivePlayFontSizes();
  const adjustScoreByPoints = usePlayStore((state) => state.adjustScoreByPoints);
  const isRumble = session.mode === 'rumble';
  const compactQuestionHeader = Boolean(compact && !isRumble);
  const shortSide = Math.min(width, height);
  const isTightHeader = compactQuestionHeader && (width < 760 || shortSide < 430);
  const isVeryTightHeader = compactQuestionHeader && shortSide < 390;
  const homeLogoWidth = getBackfireTitleLogoWidth(width, height);
  /** Classic board: same `BackfireTitleLogo` width as `<GameHeader />`; question view keeps tighter caps. */
  const logoWidth = compactQuestionHeader
    ? Math.min(homeLogoWidth, isVeryTightHeader ? 104 : isTightHeader ? 112 : 142)
    : getGameHeaderLogoDisplayWidth(width, height);
  const sideMaxWidth = compactQuestionHeader ? (isVeryTightHeader ? 142 : isTightHeader ? 158 : 214) : undefined;
  const showWager = session.config.wagerEnabled && onWagerInfoPress;
  const showHotSeat = isHotSeatConfigured(session) && onHotSeatInfoPress;
  const hotSeatDimmed = isHotSeatFullyPlayed(session);

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
    const highlightTeamId = isRumble
      ? getLeadingTeamId(session.teams)
      : session.currentTeamId;
    const isActive = highlightTeamId === team.id;
    const useCompactScore = compactScore || compactQuestionHeader;
    const teamInitial = team.name.trim().charAt(0).toUpperCase() || 'T';
    const teamNameFontSize = useCompactScore
      ? (isVeryTightHeader ? 10 : isTightHeader ? 10.5 : 12)
      : fontSizes.teamName;
    const scoreFontSize = useCompactScore
      ? (isVeryTightHeader ? 12 : isTightHeader ? 12.5 : 14)
      : fontSizes.scoreValue;

    return (
      <View
        key={team.id}
        style={[
          styles.teamScoreHeader,
          alignRight && styles.teamScoreHeaderRight,
          compactScore && styles.rumbleTeamScoreHeader,
          compactQuestionHeader && { maxWidth: sideMaxWidth },
        ]}
      >
        <View
          style={[
            styles.headerScoreCard,
            useCompactScore && styles.compactScoreCard,
            compactScore && styles.rumbleScoreCard,
            isActive
              ? {
                  borderColor: T.colors.accentGlow,
                  backgroundColor: T.colors.surface,
                }
              : { borderColor: 'rgba(15, 23, 42, 0.1)' },
          ]}
        >
          <View style={[styles.headerTeamRow, useCompactScore && styles.compactTeamRow]}>
            <View style={styles.headerTeamNameBlock}>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[
                  styles.headerTeamName,
                  useCompactScore && styles.compactTeamName,
                  isActive && styles.headerTeamNameActive,
                  { fontSize: teamNameFontSize, lineHeight: Math.round(teamNameFontSize * 1.2) },
                ]}
              >
                {team.name}
              </Text>
            </View>
            <View
              style={[
                styles.headerScoreBadge,
                useCompactScore && styles.compactScoreBadge,
                isActive && { backgroundColor: T.colors.surface, borderColor: T.colors.accentGlow },
              ]}
            >
              <Text
                style={[
                  styles.headerScoreValue,
                  useCompactScore && styles.compactScoreValue,
                  { fontSize: scoreFontSize, lineHeight: Math.round(scoreFontSize * 1.15) },
                ]}
                numberOfLines={1}
              >
                {team.score}
              </Text>
            </View>
            {useCompactScore ? (
              <View style={styles.teamAvatarMark} accessibilityElementsHidden>
                <Text style={styles.teamAvatarInitial}>{teamInitial}</Text>
              </View>
            ) : (
              renderIconCluster(team)
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderLogoScorePill = (team: TeamState) => {
    const highlightTeamId = isRumble ? getLeadingTeamId(session.teams) : session.currentTeamId;
    const isActive = highlightTeamId === team.id;

    return (
      <View
        key={team.id}
        style={[
          styles.logoScorePill,
          isActive && { borderColor: T.colors.accentGlow, backgroundColor: T.colors.surface },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${team.name} minus 50`}
          onPress={() => adjustScoreByPoints(team.id, -50, 'board header decrement')}
          style={({ pressed }) => [styles.logoScoreAdjust, pressed && styles.logoScoreAdjustPressed]}
        >
          <Text style={styles.logoScoreAdjustText}>−</Text>
        </Pressable>
        <View style={styles.logoScoreTextBlock}>
          <Text style={styles.logoScoreName} numberOfLines={1}>{team.name}</Text>
          <Text style={styles.logoScoreValue} numberOfLines={1}>{team.score}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${team.name} plus 50`}
          onPress={() => adjustScoreByPoints(team.id, 50, 'board header increment')}
          style={({ pressed }) => [styles.logoScoreAdjust, pressed && styles.logoScoreAdjustPressed]}
        >
          <Text style={styles.logoScoreAdjustText}>+</Text>
        </Pressable>
      </View>
    );
  };

  if (isRumble) {
    if (scorePillsNextToLogo) {
      const team0 = session.teams[0];
      const team1 = session.teams[1];
      const extraTeams = session.teams.slice(2);

      return (
        <View style={styles.logoOnlyTopBar}>
          {team0 ? <View style={styles.logoScoreSide}>{renderLogoScorePill(team0)}</View> : null}
          <Pressable
            onPress={onLogoPress}
            style={styles.rumbleLogoContainer}
            accessibilityRole="button"
            accessibilityLabel="BackFire"
          >
            <Image
              source={BACKFIRE_IN_GAME_LOGO}
              style={[styles.rumbleLogo, compact && styles.rumbleLogoCompact]}
              contentFit="contain"
            />
          </Pressable>
          {team1 ? <View style={[styles.logoScoreSide, styles.logoScoreSideRight]}>{renderLogoScorePill(team1)}</View> : null}
          {extraTeams.length ? <View style={styles.logoScorePills}>{extraTeams.map(renderLogoScorePill)}</View> : null}
        </View>
      );
    }

    return (
      <View style={styles.rumbleTopBar}>
        <Pressable
          onPress={onLogoPress}
          style={styles.rumbleLogoContainer}
          accessibilityRole="button"
          accessibilityLabel="BackFire"
        >
          <Image
            source={BACKFIRE_IN_GAME_LOGO}
            style={[styles.rumbleLogo, compact && styles.rumbleLogoCompact]}
            contentFit="contain"
          />
        </Pressable>
        {showTeamScores ? (
          <View style={styles.rumbleScoresWrap}>
            {session.teams.map((team) => renderScoreCard(team, false, true))}
          </View>
        ) : null}
      </View>
    );
  }

  if (!showTeamScores) {
    const team0 = session.teams[0];
    const team1 = session.teams[1];
    const extraTeams = session.teams.slice(2);

    return (
      <View style={styles.logoOnlyTopBar}>
        {scorePillsNextToLogo && team0 ? (
          <View style={styles.logoScoreSide}>{renderLogoScorePill(team0)}</View>
        ) : null}
        <Pressable
          onPress={onLogoPress}
          style={styles.headerLogoContainer}
          accessibilityRole="button"
          accessibilityLabel="BackFire"
        >
          <BackfireTitleLogo width={logoWidth} accessibilityLabel="BackFire" />
        </Pressable>
        {scorePillsNextToLogo && team1 ? (
          <View style={[styles.logoScoreSide, styles.logoScoreSideRight]}>{renderLogoScorePill(team1)}</View>
        ) : null}
        {scorePillsNextToLogo && extraTeams.length ? (
          <View style={styles.logoScorePills}>{extraTeams.map(renderLogoScorePill)}</View>
        ) : null}
      </View>
    );
  }

  const team0 = session.teams[0];
  const team1 = session.teams[1];

  const tightTopBarRow = compactQuestionHeader;

  return (
    <View style={[styles.gameTopBar, tightTopBarRow && styles.gameTopBarCompact]}>
      <View style={[styles.topBarSide, tightTopBarRow && styles.topBarSideCompact]}>
        {team0 ? renderScoreCard(team0) : null}
      </View>

      <View style={styles.topBarTitle}>
        <Pressable
          onPress={onLogoPress}
          style={styles.headerLogoContainer}
          accessibilityRole="button"
          accessibilityLabel="BackFire"
        >
          <BackfireTitleLogo width={logoWidth} accessibilityLabel="Backfire" />
        </Pressable>
      </View>

      <View style={[styles.topBarSide, tightTopBarRow && styles.topBarSideCompact, styles.topBarSideRight]}>
        {team1 ? renderScoreCard(team1, true) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gameTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    backgroundColor: 'transparent',
    gap: 10,
  },
  gameTopBarCompact: {
    gap: 6,
  },
  logoOnlyTopBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  topBarSide: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  topBarTitle: {
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  topBarSideCompact: {
    alignItems: 'flex-start',
  },
  topBarSideRight: {
    alignItems: 'flex-end',
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
  logoScorePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 0,
  },
  logoScoreSide: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
  },
  logoScoreSideRight: {
    alignItems: 'flex-end',
  },
  logoScorePill: {
    minWidth: 138,
    maxWidth: 220,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: T.colors.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(15, 23, 42, 0.1)',
    shadowColor: T.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  logoScoreAdjust: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.06)',
    flexShrink: 0,
  },
  logoScoreAdjustPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.94 }],
  },
  logoScoreAdjustText: {
    fontFamily: FONTS.displayBold,
    fontSize: 20,
    lineHeight: 22,
    color: T.colors.textPrimary,
  },
  logoScoreTextBlock: {
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 1,
  },
  logoScoreName: {
    maxWidth: 104,
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    lineHeight: 14,
    color: T.colors.textMuted,
  },
  logoScoreValue: {
    fontFamily: FONTS.displayBold,
    fontSize: 18,
    lineHeight: 21,
    fontVariant: ['tabular-nums'],
    color: T.colors.textPrimary,
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
  compactScoreCard: {
    height: 34,
    paddingLeft: 8,
    paddingRight: 5,
    paddingVertical: 0,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.11,
    shadowRadius: 5,
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
  compactTeamRow: {
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
  compactTeamName: {
    fontFamily: FONTS.uiBold,
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
  compactScoreBadge: {
    minWidth: 30,
    height: 24,
    paddingHorizontal: 6,
    paddingVertical: 0,
    borderRadius: 10,
    backgroundColor: T.colors.surface,
    shadowColor: T.colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
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
  compactScoreValue: {
    fontFamily: FONTS.displayBold,
  },
  rumbleScoreValue: {
    fontSize: 13,
    lineHeight: 16,
  },
  teamAvatarMark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    backgroundColor: 'rgba(255, 179, 71, 0.16)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(51, 51, 51, 0.1)',
  },
  teamAvatarInitial: {
    fontFamily: FONTS.uiBold,
    fontSize: 10,
    color: T.colors.textPrimary,
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
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '100%',
  },
  rumbleLogoContainer: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
