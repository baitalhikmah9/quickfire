import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Pressable } from '@/components/ui/Pressable';
import { SPACING } from '@/constants';
import { FONTS } from '@/constants/theme';
import { useI18n } from '@/lib/i18n/useI18n';
import type { GameSessionState } from '@/features/shared';
import { HOME_SOFT_UI } from '@/themes';

const T = HOME_SOFT_UI;

const WAGER_HEADER_ART = require('@/assets/wager.png');
const HOT_SEAT_HEADER_ART = require('@/assets/hot seat.png');
const QF_LOGO = require('@/assets/QF logo.png');

/** Board “current team” highlight — orange (matches play board). */
const ACTIVE_TURN_TINT = 'rgba(255, 179, 71, 0.12)';

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

  const renderFeatures = () => (
    <View style={styles.headerFeatureRow} accessibilityElementsHidden={false}>
      {showWager ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('play.wagerHelpLink')}
          onPress={onWagerInfoPress}
          style={({ pressed }) => [
            styles.headerFeatureButton,
            pressed && styles.headerFeatureButtonPressed,
          ]}
        >
          <Image source={WAGER_HEADER_ART} style={styles.headerFeatureButtonImage} contentFit="contain" />
        </Pressable>
      ) : null}
      {onHotSeatInfoPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('play.hotSeatInfoLink')}
          onPress={onHotSeatInfoPress}
          style={({ pressed }) => [
            styles.headerFeatureButton,
            pressed && styles.headerFeatureButtonPressed,
          ]}
        >
          <Image source={HOT_SEAT_HEADER_ART} style={styles.headerFeatureButtonImage} contentFit="contain" />
        </Pressable>
      ) : null}
    </View>
  );

  const team0 = session.teams[0];
  const team1 = session.teams[1];
  const headerTeam0Active = team0 && session.currentTeamId === team0.id;
  const headerTeam1Active = team1 && session.currentTeamId === team1.id;

  return (
    <View style={styles.gameTopBar}>
      <View style={styles.topBarSide}>
        {team0 ? (
          <View style={styles.teamScoreHeader}>
            <View
              style={[
                styles.headerScoreCard,
                headerTeam0Active && {
                  borderColor: T.colors.accentGlow,
                  backgroundColor: ACTIVE_TURN_TINT,
                },
              ]}
            >
              <View style={styles.headerTeamRow}>
                <View style={styles.headerTeamNameBlock}>
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[styles.headerTeamName, headerTeam0Active && styles.headerTeamNameActive]}
                  >
                    {team0.name}
                  </Text>
                </View>
                <View
                  style={[
                    styles.headerScoreBadge,
                    headerTeam0Active && { backgroundColor: T.colors.surface, borderColor: T.colors.accentGlow },
                  ]}
                >
                  <Text style={styles.headerScoreValue}>{team0.score}</Text>
                </View>
              </View>
              {renderFeatures()}
            </View>
          </View>
        ) : null}
      </View>

      <Pressable onPress={onLogoPress} style={styles.headerLogoContainer} accessibilityRole="button" accessibilityLabel="QuickFire">
        <Image source={QF_LOGO} style={[styles.headerLogo, compact && styles.headerLogoCompact]} contentFit="contain" />
      </Pressable>

      <View style={styles.topBarSide}>
        {team1 ? (
          <View style={[styles.teamScoreHeader, styles.teamScoreHeaderRight]}>
            <View
              style={[
                styles.headerScoreCard,
                headerTeam1Active && {
                  borderColor: T.colors.accentGlow,
                  backgroundColor: ACTIVE_TURN_TINT,
                },
              ]}
            >
              <View style={styles.headerTeamRow}>
                <View style={styles.headerTeamNameBlock}>
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[styles.headerTeamName, headerTeam1Active && styles.headerTeamNameActive]}
                  >
                    {team1.name}
                  </Text>
                </View>
                <View
                  style={[
                    styles.headerScoreBadge,
                    headerTeam1Active && { backgroundColor: T.colors.surface, borderColor: T.colors.accentGlow },
                  ]}
                >
                  <Text style={styles.headerScoreValue}>{team1.score}</Text>
                </View>
              </View>
              {renderFeatures()}
            </View>
          </View>
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
    backgroundColor: T.colors.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    shadowColor: T.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    gap: 8,
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
  headerScoreValue: {
    fontFamily: FONTS.displayBold,
    fontSize: 17,
    fontVariant: ['tabular-nums'],
    color: T.colors.textPrimary,
    textAlign: 'center',
  },
  headerFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  headerFeatureButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  headerFeatureButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
  headerFeatureButtonImage: {
    width: 28,
    height: 28,
  },
  headerLogoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    width: 180,
    height: 48,
  },
  headerLogoCompact: {
    width: 150,
    height: 40,
  },
});
