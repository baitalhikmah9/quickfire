import { useCallback, useEffect, useRef } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { BackfireTitleLogo } from '@/components/BackfireTitleLogo';
import { Button } from '@/components/ui/Button';
import { HeaderBackButton } from '@/components/HeaderBackButton';
import { HubTokenChip } from '@/components/HubTokenChip';
import {
  BORDER_RADIUS,
  FONTS,
  LAYOUT,
  SPACING,
  getStandardChromeTopPadding,
} from '@/constants';
import { PlayScaffold } from '@/features/play/components/PlayScaffold';
import { SOFT_SURFACE_STYLES } from '@/features/play/styles/softSurface';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';
import { usePlayStore } from '@/store/play';
import { consumeGameEntry } from '@/lib/wallet/gameEntry';
import { HOME_SOFT_UI } from '@/themes';
import type { GameSessionState, TeamState } from '@/features/shared';
import { getRowDirection } from '@/lib/i18n/direction';

const TEAM_COLORS = ['#CFF1C5', '#FFE8A8', '#FFD2A5', '#F7BFC4'];
const ACTION_COLORS = {
  review: '#FF9800',
  another: '#35C759',
  home: '#FF2435',
} as const;

function rankIcon(rank: number): keyof typeof Ionicons.glyphMap | null {
  if (rank === 0) return 'trophy';
  if (rank === 1) return 'star';
  if (rank === 2) return 'ribbon';
  return null;
}

function teamColor(rank: number, teamCount: number): string {
  if (teamCount === 2) return rank === 0 ? TEAM_COLORS[0]! : '#F7C5C9';
  return TEAM_COLORS[Math.min(rank, TEAM_COLORS.length - 1)]!;
}

// The play stack is landscape-locked, but some Android devices report stale
// portrait dimensions right after the orientation lock. Treat the long side
// as width and the short side as height so density breakpoints stay correct.
function useLandscapeDimensions() {
  const { width, height } = useWindowDimensions();
  return { width: Math.max(width, height), height: Math.min(width, height) };
}

function FinalHeader({ title, compact }: { title: string; compact: boolean }) {
  const router = useRouter();
  const { width, height } = useLandscapeDimensions();
  const { direction, t, uiLocale } = useI18n();
  const tokens = usePlayStore((state) => state.tokens);
  const tiny = height < 500;
  const logoWidth = Math.min(compact ? 260 : 380, Math.max(tiny ? 130 : 170, width * (tiny ? 0.22 : 0.3)));
  const formattedTokens = tokens.toLocaleString(uiLocale, { maximumFractionDigits: 0 });

  return (
    <View
      style={[
        styles.finalHeader,
        {
          paddingTop: getStandardChromeTopPadding(Platform.OS === 'web'),
        },
      ]}
    >
      <View style={[styles.headerRow, { height: logoWidth / 4 }]}>
        <View style={styles.headerSideLeft}>
          <HeaderBackButton
            onPress={() => {
              // Return to the completed board so players can review answers.
              usePlayStore.getState().reviewCompletedBoard();
              router.replace('/play/board');
            }}
            direction={direction}
            rowDirection={getRowDirection(direction)}
            label={t('common.back')}
          />
        </View>
        <BackfireTitleLogo width={logoWidth} />
        <View style={styles.headerSideRight}>
          <HubTokenChip
            label={t('common.tokens')}
            value={formattedTokens}
            rowDirection={getRowDirection(direction)}
            variant="softUi"
            onPress={() => router.push('/(app)/store')}
            accessibilityLabel={`${t('common.tokens')}: ${formattedTokens}`}
          />
        </View>
      </View>
      <Text style={[styles.matchTitle, compact && styles.matchTitleCompact, tiny && styles.matchTitleTiny]}>
        {title.toUpperCase()}
      </Text>
    </View>
  );
}

function TeamCard({ team, rank, teamCount, compact, tiny }: {
  team: TeamState;
  rank: number;
  teamCount: number;
  compact: boolean;
  tiny: boolean;
}) {
  const icon = rankIcon(rank);

  return (
    <View
      style={[
        styles.teamCard,
        teamCount === 2
          ? [styles.teamCardVersus, compact && styles.teamCardVersusCompact, tiny && styles.teamCardTiny]
          : [styles.teamCardGrid, compact && styles.teamCardGridCompact, tiny && styles.teamCardTiny],
        { backgroundColor: teamColor(rank, teamCount) },
      ]}
    >
      {icon ? (
        <View style={[styles.rankBadge, compact && styles.rankBadgeCompact]}>
          <Ionicons name={icon} size={compact ? 16 : 22} color="#FFFFFF" />
        </View>
      ) : null}
      <Text
        style={[styles.teamName, compact && styles.teamNameCompact]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {team.name}
      </Text>
      <Text
        style={[styles.teamScore, compact && styles.teamScoreCompact, tiny && styles.teamScoreTiny]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.65}
      >
        {team.score}
      </Text>
    </View>
  );
}

function Scoreboard({ session, compact, tiny }: { session: GameSessionState; compact: boolean; tiny: boolean }) {
  const rankedTeams = [...session.teams].sort((a, b) => b.score - a.score);
  const isVersus = rankedTeams.length === 2;
  const displayTeams = isVersus ? [rankedTeams[1]!, rankedTeams[0]!] : rankedTeams;

  return (
    <View style={[styles.scoreboard, compact && styles.scoreboardCompact, tiny && styles.scoreboardTiny]}>
      {displayTeams.map((team, index) => {
        const rank = isVersus ? (index === 0 ? 1 : 0) : index;
        return (
          <TeamCard
            key={team.id}
            team={team}
            rank={rank}
            teamCount={rankedTeams.length}
            compact={compact}
            tiny={tiny}
          />
        );
      })}
      {isVersus ? <View style={[styles.vsBadge, compact && styles.vsBadgeCompact]}><Text style={styles.vsText}>VS</Text></View> : null}
    </View>
  );
}

function PromoCard({ platform, url, source, compact, width }: {
  platform: string;
  url?: string;
  source: number;
  compact: boolean;
  width: number;
}) {
  return (
    <View style={[styles.promoCard, compact && styles.promoCardCompact, { width }]}>
      <Image
        source={source}
        style={{ width: Math.max(64, width - (compact ? 16 : 24)), aspectRatio: 1 }}
        contentFit="contain"
        accessibilityRole="image"
        accessibilityLabel={`${platform} QR code`}
      />
      <Text style={[styles.promoLabel, compact && styles.promoLabelCompact]}>{platform}</Text>
      {url ? <Text style={[styles.promoUrl, compact && styles.promoUrlCompact]}>{url}</Text> : null}
    </View>
  );
}

export default function PlayEndScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { t } = useI18n();
  const { width, height } = useLandscapeDimensions();
  // Android phones reserve meaningful landscape space for system navigation.
  const compact = height < 800;
  // Phone landscape: viewport is very short, shrink everything harder so nothing clips.
  const tiny = height < 500;
  const {
    session,
    resetSession,
    ensureDraft,
    reopenLastResolvedTurn,
    entryReservationId,
    commitEntryCharge,
  } = usePlayStore();
  const consumeEntryMutation = useMutation(api.wallet.consumeEntry);
  const consumedRef = useRef(false);

  const consumeCurrentEntry = useCallback(async () => {
    if (consumedRef.current) return;
    consumedRef.current = true;
    try {
      if (entryReservationId) {
        const result = await consumeGameEntry(consumeEntryMutation, {
          reservationId: entryReservationId,
          completedSessionId: session?.id ?? '',
        });
        if (!result.ok) throw new Error(result.error);
      }
      commitEntryCharge();
    } catch {
      // Non-fatal — the reservation expires server-side eventually.
    }
  }, [consumeEntryMutation, entryReservationId, commitEntryCharge, session?.id]);

  useEffect(() => {
    void consumeCurrentEntry();
  }, [consumeCurrentEntry]);

  if (!session) {
    return (
      <PlayScaffold title={t('play.matchComplete')} bodyScrollEnabled={false}>
        <Text style={{ color: colors.text }}>{t('play.sessionCleared')}</Text>
      </PlayScaffold>
    );
  }

  const promoWidth = Math.min(
    compact ? 130 : 220,
    Math.max(compact ? 82 : 112, width * (compact ? 0.12 : 0.14)),
    // Never let promo cards eat more than ~1/5 of a short viewport's height.
    Math.max(70, height * 0.2),
  );
  const promoGap = Math.min(56, Math.max(10, width * 0.035));
  const handleHome = () => {
    void consumeCurrentEntry().then(() => {
      resetSession();
      router.replace('/(app)/');
    });
  };
  const handleAnotherMatch = () => {
    void consumeCurrentEntry().then(() => {
      resetSession();
      ensureDraft();
      router.replace('/play/mode');
    });
  };

  return (
    <PlayScaffold
      title={t('play.matchComplete')}
      customHeader={<FinalHeader title={t('play.matchComplete')} compact={compact} />}
      backgroundColor={HOME_SOFT_UI.colors.canvas}
      bodyScrollEnabled={false}
      bodyFrame={false}
      contentMaxWidth={LAYOUT.playWideMaxWidth}
    >
      <View style={[styles.endColumn, compact && styles.endColumnCompact, tiny && styles.endColumnTiny]}>
        <Scoreboard session={session} compact={compact} tiny={tiny} />

        <View style={[styles.promoRow, { gap: promoGap }]}>
          <PromoCard
            platform="Android"
            source={require('../../../assets/final-match/android-qr.png')}
            compact={compact}
            width={promoWidth}
          />
          <PromoCard
            platform="iOS"
            source={require('../../../assets/final-match/ios-qr.png')}
            compact={compact}
            width={promoWidth}
          />
          <PromoCard
            platform="Web"
            url="playbackfire.com"
            source={require('../../../assets/final-match/web-qr.png')}
            compact={compact}
            width={promoWidth}
          />
        </View>

        <Text style={[styles.slogan, compact && styles.sloganCompact, tiny && styles.sloganTiny]}>Play BackFire Today</Text>

        <View style={[styles.actions, compact && styles.actionsCompact]}>
          {session.lastResolvedTurn ? (
            <Button
              title={t('play.reviewLastAnswer')}
              onPress={() => {
                reopenLastResolvedTurn();
                router.replace('/play/question');
              }}
              style={[styles.actionButton, compact && styles.actionButtonCompact, tiny && styles.actionButtonTiny, { backgroundColor: ACTION_COLORS.review }]}
              textStyle={styles.actionText}
            />
          ) : null}
          <Button
            title={t('play.startAnotherMatch')}
            onPress={handleAnotherMatch}
            style={[styles.actionButton, compact && styles.actionButtonCompact, tiny && styles.actionButtonTiny, { backgroundColor: ACTION_COLORS.another }]}
            textStyle={styles.actionText}
          />
          <Button
            title={t('play.backToHome')}
            onPress={handleHome}
            style={[styles.actionButton, compact && styles.actionButtonCompact, tiny && styles.actionButtonTiny, { backgroundColor: ACTION_COLORS.home }]}
            textStyle={styles.actionText}
          />
        </View>
      </View>
    </PlayScaffold>
  );
}

const styles = StyleSheet.create({
  finalHeader: {
    width: '100%',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  headerRow: {
    width: '100%',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSideLeft: {
    position: 'absolute',
    left: 0,
    zIndex: 2,
  },
  headerSideRight: {
    position: 'absolute',
    right: 0,
    zIndex: 2,
  },
  matchTitle: {
    color: '#111111',
    fontFamily: FONTS.displayBold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  matchTitleCompact: {
    fontSize: 24,
    lineHeight: 28,
  },
  matchTitleTiny: {
    fontSize: 18,
    lineHeight: 21,
  },
  endColumn: {
    flex: 1,
    width: '100%',
    maxWidth: LAYOUT.playWideMaxWidth,
    alignSelf: 'center',
    minHeight: 0,
    justifyContent: 'center',
    gap: SPACING.md,
  },
  endColumnCompact: {
    justifyContent: 'flex-start',
    gap: SPACING.xs,
  },
  endColumnTiny: {
    gap: 4,
  },
  scoreboard: {
    width: '100%',
    minHeight: 116,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.sm,
    ...SOFT_SURFACE_STYLES.face,
    ...SOFT_SURFACE_STYLES.raised,
  },
  scoreboardCompact: {
    minHeight: 86,
    padding: 6,
    gap: 6,
    borderRadius: BORDER_RADIUS.lg,
  },
  scoreboardTiny: {
    minHeight: 62,
    padding: 4,
    gap: 4,
  },
  teamCard: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.md,
    minWidth: 0,
  },
  teamCardVersus: {
    flex: 1,
    minHeight: 128,
  },
  teamCardVersusCompact: {
    minHeight: 86,
  },
  teamCardGrid: {
    flex: 1,
    minHeight: 100,
  },
  teamCardGridCompact: {
    minHeight: 76,
  },
  teamCardTiny: {
    minHeight: 54,
    paddingVertical: SPACING.xs,
  },
  rankBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  rankBadgeCompact: {
    top: 4,
    right: 4,
    width: 25,
    height: 25,
    borderRadius: 13,
  },
  teamName: {
    color: '#111111',
    fontFamily: FONTS.uiBold,
    fontSize: 18,
    lineHeight: 23,
    textAlign: 'center',
    maxWidth: '90%',
  },
  teamNameCompact: {
    fontSize: 13,
    lineHeight: 16,
  },
  teamScore: {
    color: '#050505',
    fontFamily: FONTS.displayBold,
    fontSize: 46,
    lineHeight: 52,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  teamScoreCompact: {
    fontSize: 29,
    lineHeight: 32,
  },
  teamScoreTiny: {
    fontSize: 22,
    lineHeight: 25,
  },
  vsBadge: {
    position: 'absolute',
    alignSelf: 'center',
    left: '50%',
    marginLeft: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    ...SOFT_SURFACE_STYLES.raised,
  },
  vsBadgeCompact: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: -20,
  },
  vsText: {
    color: '#111111',
    fontFamily: FONTS.uiBold,
    fontSize: 16,
  },
  promoRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoCard: {
    minHeight: 150,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    ...SOFT_SURFACE_STYLES.face,
    ...SOFT_SURFACE_STYLES.raised,
  },
  promoCardCompact: {
    minHeight: 76,
    padding: 6,
    borderRadius: BORDER_RADIUS.sm,
  },
  promoLabel: {
    marginTop: 4,
    color: '#111111',
    fontFamily: FONTS.uiBold,
    fontSize: 18,
    lineHeight: 22,
  },
  promoLabelCompact: {
    marginTop: 1,
    fontSize: 12,
    lineHeight: 14,
  },
  promoUrl: {
    color: '#111111',
    fontFamily: FONTS.ui,
    fontSize: 14,
    lineHeight: 18,
  },
  promoUrlCompact: {
    fontSize: 8,
    lineHeight: 10,
  },
  slogan: {
    color: '#111111',
    fontFamily: FONTS.displayBold,
    fontSize: 28,
    lineHeight: 34,
    textAlign: 'center',
  },
  sloganCompact: {
    fontSize: 18,
    lineHeight: 22,
  },
  sloganTiny: {
    fontSize: 14,
    lineHeight: 17,
  },
  actions: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: SPACING.xl,
  },
  actionsCompact: {
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 58,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
  },
  actionButtonCompact: {
    minHeight: 44,
    borderRadius: BORDER_RADIUS.sm,
  },
  actionButtonTiny: {
    minHeight: 38,
  },
  actionText: {
    color: '#111111',
    fontFamily: FONTS.uiBold,
    fontSize: 17,
    lineHeight: 21,
    textAlign: 'center',
  },
});
