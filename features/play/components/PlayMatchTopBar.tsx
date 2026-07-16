import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { BackfireTitleLogo } from '@/components/BackfireTitleLogo';
import { Pressable } from '@/components/ui/Pressable';
import { SPACING } from '@/constants';
import { getGameHeaderLogoDisplayWidth } from '@/lib/layout/backfireTitleLogoWidth';
import { SHOW_HOT_SEAT_UI } from '@/constants/featureFlags';
import { FONTS } from '@/constants/theme';
import { useI18n } from '@/lib/i18n/useI18n';
import type { GameSessionState, TeamState } from '@/features/shared';
import { getLeadingTeamId } from '@/features/play/categorySections';
import { getPlaySurfaceColors } from '@/features/play/playSurfaceColors';
import { HOME_SOFT_UI } from '@/themes';
import { useResponsivePlayFontSizes } from '@/utils/responsiveTypography';
import { usePlayStore } from '@/store/play';
import { useThemeStore } from '@/store/theme';

const T = HOME_SOFT_UI;

/** BackFire flame palette for the active-turn glow: hot red-orange core, ember warmth. */
const FIRE = {
  flame: '#FF5A1F', // ring - hot flame orange-red
  glow: '#FF3D00', // halo - deeper fire red for the burn
};

const WAGER_HEADER_ART = require('@/assets/wager.png');
const HOT_SEAT_HEADER_ART = require('@/assets/hot seat.png');

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
  /** Tighter score-card typography when vertical space is tight. Logo width always matches `<GameHeader />`. */
  compact?: boolean;
  /** When false, only the centered BackFire logo is shown unless scorePillsNextToLogo is true. */
  showTeamScores?: boolean;
  scorePillsNextToLogo?: boolean;
}

/**
 * Shared top bar: team scores + wager/hot-seat chips, Backfire wordmark, mirrored team card.
 * Board chrome is the same across modes; multi-team modes only densify pills to fit.
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
  // Re-render when palette changes; StyleSheet tokens stay structural-only.
  useThemeStore((state) => state.paletteId);
  const surfaceColors = getPlaySurfaceColors();
  const isRumble = session.mode === 'rumble';
  const compactQuestionHeader = Boolean(compact);
  const multiTeamDensePills = session.teams.length >= 4;
  const shortSide = Math.min(width, height);
  const isTightHeader = compactQuestionHeader && (width < 760 || shortSide < 430);
  const isVeryTightHeader = compactQuestionHeader && shortSide < 390;
  /** Same sizing as home `GameHeader` logoOnly. */
  const logoWidth = getGameHeaderLogoDisplayWidth(width, height);
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
            accessibilityLabel={`${t('play.wagerHelpLink')} - ${t('play.wagersUsed', {
              used: team.wagersUsed,
              total: session.wagersPerTeam,
            })}`}
            onPress={onWagerInfoPress}
            style={({ pressed }) => [
              styles.headerIconChip,
              {
                backgroundColor: surfaceColors.iconChipBackground,
                borderColor: surfaceColors.iconChipBorder,
              },
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
                ? `${t('play.hotSeatInfoLink')} - ${t('play.hotSeatAllRoundsPlayed')}`
                : t('play.hotSeatInfoLink')
            }
            onPress={onHotSeatInfoPress}
            style={({ pressed }) => [
              styles.headerIconChip,
              {
                backgroundColor: surfaceColors.iconChipBackground,
                borderColor: surfaceColors.iconChipBorder,
              },
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

  const renderScoreCard = (team: TeamState, alignRight = false) => {
    // Rumble has no rotating turn owner - highlight the sole leader instead.
    const highlightTeamId = isRumble
      ? getLeadingTeamId(session.teams)
      : session.currentTeamId;
    const isActive = highlightTeamId === team.id;
    const useCompactScore = compactQuestionHeader;
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
          compactQuestionHeader && { maxWidth: sideMaxWidth },
        ]}
      >
        <View
          style={[
            styles.headerScoreCard,
            {
              backgroundColor: isActive ? surfaceColors.activeTurnFace : surfaceColors.controlBackground,
              borderColor: isActive ? FIRE.flame : surfaceColors.hairlineBorder,
            },
            useCompactScore && styles.compactScoreCard,
            isActive && styles.headerScoreCardActive,
          ]}
        >
          <View style={[styles.headerTeamRow, useCompactScore && styles.compactTeamRow]}>
            <View style={styles.headerTeamNameBlock}>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[
                  styles.headerTeamName,
                  { color: isActive ? surfaceColors.activeTurnOnFace : surfaceColors.textPrimary },
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
                {
                  backgroundColor: isActive
                    ? surfaceColors.activeTurnNestedFill
                    : surfaceColors.subtleFill,
                  borderColor: isActive ? FIRE.flame : surfaceColors.hairlineBorder,
                },
                useCompactScore && [
                  styles.compactScoreBadge,
                  {
                    backgroundColor: isActive
                      ? surfaceColors.activeTurnNestedFill
                      : surfaceColors.controlBackground,
                  },
                ],
                isActive && styles.headerScoreBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.headerScoreValue,
                  {
                    color: isActive ? surfaceColors.activeTurnOnFace : surfaceColors.textPrimary,
                  },
                  useCompactScore && styles.compactScoreValue,
                  { fontSize: scoreFontSize, lineHeight: Math.round(scoreFontSize * 1.15) },
                ]}
                numberOfLines={1}
              >
                {team.score}
              </Text>
            </View>
            {useCompactScore ? (
              <View
                style={[
                  styles.teamAvatarMark,
                  {
                    borderColor: isActive ? FIRE.flame : surfaceColors.hairlineBorder,
                    backgroundColor: isActive
                      ? surfaceColors.activeTurnNestedFill
                      : 'rgba(255, 179, 71, 0.16)',
                  },
                ]}
                accessibilityElementsHidden
              >
                <Text
                  style={[
                    styles.teamAvatarInitial,
                    {
                      color: isActive
                        ? surfaceColors.activeTurnOnFace
                        : surfaceColors.textPrimary,
                    },
                  ]}
                >
                  {teamInitial}
                </Text>
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
    const dense = multiTeamDensePills;
    const teamCount = session.teams.length;
    // With many equal-width pills, shrink the name before ellipsizing so labels stay readable.
    const nameMinFontScale = teamCount >= 6 ? 0.55 : teamCount >= 4 ? 0.65 : 0.75;

    const onFace = isActive ? surfaceColors.activeTurnOnFace : surfaceColors.textPrimary;
    const nestedFill = isActive
      ? surfaceColors.activeTurnNestedFill
      : surfaceColors.subtleFill;

    return (
      <View
        key={team.id}
        style={[
          styles.logoScorePill,
          {
            backgroundColor: isActive ? surfaceColors.activeTurnFace : surfaceColors.controlBackground,
            borderColor: isActive ? FIRE.flame : surfaceColors.hairlineBorder,
          },
          dense && styles.logoScorePillDense,
          isRumble && styles.logoScorePillRumble,
          isActive && styles.logoScorePillActive,
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${team.name} minus 50`}
          onPress={() => adjustScoreByPoints(team.id, -50, 'board header decrement')}
          style={({ pressed }) => [
            styles.logoScoreAdjust,
            { backgroundColor: nestedFill },
            dense && styles.logoScoreAdjustDense,
            pressed && styles.logoScoreAdjustPressed,
          ]}
        >
          <Text
            style={[
              styles.logoScoreAdjustText,
              { color: onFace },
              dense && styles.logoScoreAdjustTextDense,
            ]}
          >
            −
          </Text>
        </Pressable>
        <View style={[styles.logoScoreTextBlock, isRumble && styles.logoScoreTextBlockRumble]}>
          <Text
            style={[
              styles.logoScoreName,
              { color: isActive ? surfaceColors.activeTurnOnFace : surfaceColors.textMuted },
              dense && styles.logoScoreNameDense,
              // Rumble pills share width equally — drop fixed maxWidth so the name uses the pill.
              isRumble && styles.logoScoreNameRumble,
              isActive && styles.logoScoreNameActive,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={nameMinFontScale}
            ellipsizeMode="tail"
          >
            {team.name}
          </Text>
          <Text
            style={[
              styles.logoScoreValue,
              { color: isActive ? surfaceColors.activeTurnOnFace : surfaceColors.textPrimary },
              dense && styles.logoScoreValueDense,
              isActive && styles.logoScoreValueActive,
            ]}
            numberOfLines={1}
          >
            {team.score}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${team.name} plus 50`}
          onPress={() => adjustScoreByPoints(team.id, 50, 'board header increment')}
          style={({ pressed }) => [
            styles.logoScoreAdjust,
            { backgroundColor: nestedFill },
            dense && styles.logoScoreAdjustDense,
            pressed && styles.logoScoreAdjustPressed,
          ]}
        >
          <Text
            style={[
              styles.logoScoreAdjustText,
              { color: onFace },
              dense && styles.logoScoreAdjustTextDense,
            ]}
          >
            +
          </Text>
        </Pressable>
      </View>
    );
  };

  // Board chrome: classic/quick split teams around the logo; Rumble keeps logo left and all scores right.
  if (!showTeamScores) {
    const team0 = session.teams[0];
    const team1 = session.teams[1];
    const extraTeams = session.teams.slice(2);

    if (scorePillsNextToLogo && isRumble) {
      return (
        <View style={[styles.logoOnlyTopBar, styles.logoOnlyTopBarDense, styles.logoOnlyTopBarRumble]}>
          <Pressable
            onPress={onLogoPress}
            style={[styles.headerLogoContainer, { width: logoWidth }]}
            accessibilityRole="button"
            accessibilityLabel={t('play.matchMenuA11y')}
          >
            <BackfireTitleLogo width={logoWidth} accessibilityLabel="BackFire" />
          </Pressable>
          <View
            style={[
              styles.logoScorePills,
              styles.logoScorePillsRumble,
              multiTeamDensePills && styles.logoScorePillsDense,
            ]}
          >
            {session.teams.map((team) => renderLogoScorePill(team))}
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.logoOnlyTopBar, scorePillsNextToLogo && styles.logoOnlyTopBarDense]}>
        {scorePillsNextToLogo && team0 ? (
          <View style={styles.logoScoreSide}>{renderLogoScorePill(team0)}</View>
        ) : null}
        <Pressable
          onPress={onLogoPress}
          style={[styles.headerLogoContainer, { width: logoWidth }]}
          accessibilityRole="button"
          accessibilityLabel={t('play.matchMenuA11y')}
        >
          <BackfireTitleLogo
            width={logoWidth}
            accessibilityLabel="BackFire"
          />
        </Pressable>
        {scorePillsNextToLogo && team1 ? (
          <View style={[styles.logoScoreSide, styles.logoScoreSideRight]}>{renderLogoScorePill(team1)}</View>
        ) : null}
        {scorePillsNextToLogo && extraTeams.length ? (
          <View
            style={[
              styles.logoScorePills,
              multiTeamDensePills && styles.logoScorePillsDense,
            ]}
          >
            {extraTeams.map((team) => renderLogoScorePill(team))}
          </View>
        ) : null}
      </View>
    );
  }

  const team0 = session.teams[0];
  const team1 = session.teams[1];
  const extraTeams = session.teams.slice(2);

  const tightTopBarRow = compactQuestionHeader;

  return (
    <View style={[styles.gameTopBar, tightTopBarRow && styles.gameTopBarCompact]}>
      <View style={[styles.topBarSide, tightTopBarRow && styles.topBarSideCompact]}>
        {team0 ? renderScoreCard(team0) : null}
      </View>

      <View style={styles.topBarTitle}>
        <Pressable
          onPress={onLogoPress}
          style={[styles.headerLogoContainer, { width: logoWidth }]}
          accessibilityRole="button"
          accessibilityLabel={t('play.matchMenuA11y')}
        >
          <BackfireTitleLogo width={logoWidth} accessibilityLabel="Backfire" />
        </Pressable>
      </View>

      <View style={[styles.topBarSide, tightTopBarRow && styles.topBarSideCompact, styles.topBarSideRight]}>
        {team1 ? renderScoreCard(team1, true) : null}
      </View>

      {extraTeams.length ? (
        <View
          style={[
            styles.logoScorePills,
            multiTeamDensePills && styles.logoScorePillsDense,
          ]}
        >
          {extraTeams.map((team) => renderLogoScorePill(team))}
        </View>
      ) : null}
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
    overflow: 'visible',
  },
  /** Board: room for amber turn glow so parent overflow doesn't clip it. */
  logoOnlyTopBarDense: {
    gap: 6,
    paddingVertical: 10,
    minHeight: 0,
  },
  /** Rumble: logo anchored left; every team score pill stays to its right. */
  logoOnlyTopBarRumble: {
    justifyContent: 'flex-start',
    gap: 8,
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

  logoScorePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 0,
  },
  logoScorePillsRumble: {
    flex: 1,
    flexWrap: 'nowrap',
  },
  /** Rumble board: equal flex so N teams fill the header row. */
  logoScorePillRumble: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    maxWidth: 9999,
  },
  logoScorePillsDense: {
    gap: 4,
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
    minWidth: 112,
    maxWidth: 180,
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth * 2,
    /** Clip face fill to the rounded card so nested chrome can’t punch holes. */
    overflow: 'hidden',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  /** Fire glow - BackFire flame ember: red-orange ring + hot halo, warm ember-lit face. */
  logoScorePillActive: {
    borderWidth: 2,
    shadowColor: FIRE.glow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 14,
    // Keep elevation modest — high elevation + translucent faces left a dark mid strip on Android.
    elevation: 4,
  },
  logoScorePillDense: {
    minWidth: 88,
    maxWidth: 120,
    minHeight: 28,
    gap: 2,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  logoScoreAdjust: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logoScoreAdjustDense: {
    width: 22,
    height: 22,
    borderRadius: 7,
  },
  logoScoreAdjustPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.94 }],
  },
  logoScoreAdjustText: {
    fontFamily: FONTS.displayBold,
    fontSize: 16,
    lineHeight: 18,
  },
  logoScoreAdjustTextDense: {
    fontSize: 14,
    lineHeight: 16,
  },
  logoScoreTextBlock: {
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 1,
  },
  /** Rumble: take remaining width between ± controls so names are not hard-capped. */
  logoScoreTextBlockRumble: {
    flex: 1,
    alignSelf: 'stretch',
  },
  logoScoreName: {
    maxWidth: 88,
    fontFamily: FONTS.uiBold,
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'center',
  },
  logoScoreNameDense: {
    maxWidth: 56,
    fontSize: 9,
    lineHeight: 11,
  },
  /** Override dense/default pixel caps; name fills the flex text block. */
  logoScoreNameRumble: {
    maxWidth: '100%',
    width: '100%',
    textAlign: 'center',
  },
  logoScoreNameActive: {
    color: '#E8420C',
  },
  logoScoreValue: {
    fontFamily: FONTS.displayBold,
    fontSize: 14,
    lineHeight: 16,
    fontVariant: ['tabular-nums'],
  },
  logoScoreValueDense: {
    fontSize: 12,
    lineHeight: 14,
  },
  logoScoreValueActive: {
    color: '#E8420C',
  },
  teamScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
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
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  headerScoreCardActive: {
    borderWidth: 2,
    shadowColor: FIRE.glow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 16,
    elevation: 4,
  },
  compactScoreCard: {
    height: 34,
    paddingLeft: 8,
    paddingRight: 5,
    paddingVertical: 0,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },

  headerTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    gap: 8,
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
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactScoreBadge: {
    minWidth: 30,
    height: 24,
    paddingHorizontal: 6,
    paddingVertical: 0,
    borderRadius: 10,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  headerScoreBadgeActive: {
    borderColor: FIRE.flame,
  },

  headerScoreValue: {
    fontFamily: FONTS.displayBold,
    fontSize: 17,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  compactScoreValue: {
    fontFamily: FONTS.displayBold,
  },
  teamAvatarMark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderWidth: StyleSheet.hairlineWidth,
  },
  teamAvatarInitial: {
    fontFamily: FONTS.uiBold,
    fontSize: 10,
  },

  headerIconChip: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderWidth: StyleSheet.hairlineWidth,
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
});
