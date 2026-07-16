import { useCallback, useEffect, useRef } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
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
} from '@/constants';
import { PlayScaffold } from '@/features/play/components/PlayScaffold';
import { SOFT_SURFACE_STYLES } from '@/features/play/styles/softSurface';
import {
  getWinnerActionLabelSize,
  getWinnerPromoLayout,
  getWinnerPromoQrSize,
} from '@/features/play/winnerPromoLayout';
import { useI18n } from '@/lib/i18n/useI18n';
import { useDarkModeFlatTop, useTheme } from '@/lib/hooks/useTheme';
import { usePlayStore } from '@/store/play';
import { useDisplayTokenBalance } from '@/lib/hooks/useDisplayTokenBalance';
import { consumeGameEntry } from '@/lib/wallet/gameEntry';
import { HOME_SOFT_UI } from '@/themes';
import type { GameSessionState, TeamState } from '@/features/shared';
import { getRowDirection } from '@/lib/i18n/direction';
import { usePlayTextScale } from '@/store/display';

/** Same QR payload for Android / iOS / Web promo tiles on the match-end screen. */
const PROMO_SITE_URL = 'playbackfire.com';
const PROMO_QR_SOURCE = require('../../../assets/final-match/web-qr.png');

const TEAM_COLORS = ['#CFF1C5', '#FFE8A8', '#FFD2A5', '#F7BFC4'];
const ACTION_COLORS = {
  review: '#FF9800',
  another: '#35C759',
  home: '#FF2435',
} as const;

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
  const tokens = useDisplayTokenBalance();
  const textScale = usePlayTextScale();
  const textPrimary = HOME_SOFT_UI.colors.textPrimary;
  const tiny = height < 500;
  const logoWidth = Math.min(compact ? 240 : 340, Math.max(tiny ? 120 : 150, width * (tiny ? 0.2 : 0.26)));
  const formattedTokens = tokens.toLocaleString(uiLocale, { maximumFractionDigits: 0 });

  return (
    <View
      style={[
        styles.finalHeader,
        compact && styles.finalHeaderCompact,
        // Match scaffold bottom pad (contentFit paddingBottom: SPACING.xs) — tight edge inset.
        { paddingTop: SPACING.xs },
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
      <Text
        style={[
          styles.matchTitle,
          compact && styles.matchTitleCompact,
          tiny && styles.matchTitleTiny,
          {
            color: textPrimary,
            fontSize: Math.round((tiny ? 16 : compact ? 20 : 28) * textScale),
            lineHeight: Math.round((tiny ? 19 : compact ? 24 : 34) * textScale),
          },
        ]}
      >
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
  const textScale = usePlayTextScale();
  const teamNameSize = (compact ? 13 : 18) * textScale;
  const teamScoreSize = (tiny ? 22 : compact ? 29 : 46) * textScale;

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
      <Text
        style={[
          styles.teamName,
          compact && styles.teamNameCompact,
          { fontSize: Math.round(teamNameSize), lineHeight: Math.round(teamNameSize * 1.25) },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {team.name}
      </Text>
      <Text
        style={[
          styles.teamScore,
          compact && styles.teamScoreCompact,
          tiny && styles.teamScoreTiny,
          { fontSize: Math.round(teamScoreSize), lineHeight: Math.round(teamScoreSize * 1.13) },
        ]}
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
  const textScale = usePlayTextScale();
  const darkModeFlatTop = useDarkModeFlatTop();
  const surface = HOME_SOFT_UI.colors.surface;
  const textPrimary = HOME_SOFT_UI.colors.textPrimary;
  // Rank by score for trophy/colors, but always render teams in setup order
  // so Team 1 stays on the left (and Team 2 on the right in versus).
  const rankedByScore = [...session.teams].sort((a, b) => b.score - a.score);
  const rankById = new Map(rankedByScore.map((team, index) => [team.id, index]));
  const displayTeams = session.teams;
  const isVersus = displayTeams.length === 2;

  return (
    <View
      style={[
        styles.scoreboard,
        compact && styles.scoreboardCompact,
        tiny && styles.scoreboardTiny,
        SOFT_SURFACE_STYLES.face,
        darkModeFlatTop,
        SOFT_SURFACE_STYLES.raised,
        { backgroundColor: surface },
      ]}
    >
      {displayTeams.map((team) => {
        const rank = rankById.get(team.id) ?? 0;
        return (
          <TeamCard
            key={team.id}
            team={team}
            rank={rank}
            teamCount={displayTeams.length}
            compact={compact}
            tiny={tiny}
          />
        );
      })}
      {isVersus ? (
        <View
          style={[
            styles.vsBadge,
            compact && styles.vsBadgeCompact,
            SOFT_SURFACE_STYLES.raised,
            { backgroundColor: surface },
          ]}
        >
          <Text style={[styles.vsText, { color: textPrimary, fontSize: Math.round(16 * textScale) }]}>VS</Text>
        </View>
      ) : null}
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
  const textScale = usePlayTextScale();
  const darkModeFlatTop = useDarkModeFlatTop();
  const surface = HOME_SOFT_UI.colors.surface;
  const textPrimary = HOME_SOFT_UI.colors.textPrimary;
  const textMuted = HOME_SOFT_UI.colors.textMuted;
  const labelSize = (compact ? 11 : 15) * textScale;
  const urlSize = (compact ? 8 : 12) * textScale;
  const qrSize = getWinnerPromoQrSize(width, compact, Platform.OS);

  return (
    <View
      style={[
        styles.promoCard,
        compact && styles.promoCardCompact,
        SOFT_SURFACE_STYLES.face,
        darkModeFlatTop,
        SOFT_SURFACE_STYLES.raised,
        { width, backgroundColor: surface },
      ]}
    >
      <Image
        source={source}
        style={{ width: qrSize, aspectRatio: 1 }}
        contentFit="contain"
        accessibilityRole="image"
        accessibilityLabel={`${platform} QR code`}
      />
      <Text
        style={[
          styles.promoLabel,
          compact && styles.promoLabelCompact,
          { color: textPrimary, fontSize: Math.round(labelSize), lineHeight: Math.round(labelSize * 1.2) },
        ]}
      >
        {platform}
      </Text>
      {url ? (
        <Text
          style={[
            styles.promoUrl,
            compact && styles.promoUrlCompact,
            {
              color: textMuted,
              fontSize: Math.max(7, Math.round(urlSize)),
              lineHeight: Math.max(9, Math.round(urlSize * 1.25)),
            },
          ]}
        >
          {url}
        </Text>
      ) : null}
    </View>
  );
}

export default function PlayEndScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { t } = useI18n();
  const { width, height } = useLandscapeDimensions();
  const textScale = usePlayTextScale();
  const promoLayout = getWinnerPromoLayout({
    windowWidth: width,
    windowHeight: height,
    platform: Platform.OS,
  });
  // Android phones reserve meaningful landscape space for system navigation.
  const compact = promoLayout.compact;
  // Phone landscape: viewport is very short, shrink everything harder so nothing clips.
  const tiny = promoLayout.tiny;
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
      // Non-fatal - the reservation expires server-side eventually.
    }
  }, [consumeEntryMutation, entryReservationId, commitEntryCharge, session?.id]);

  useEffect(() => {
    void consumeCurrentEntry();
  }, [consumeCurrentEntry]);

  if (!session) {
    return (
      <PlayScaffold title={t('play.matchComplete')} bodyScrollEnabled={false}>
        <Text style={{ color: colors.text, fontSize: Math.round(14 * textScale) }}>{t('play.sessionCleared')}</Text>
      </PlayScaffold>
    );
  }

  // QR tiles share vertical room with scoreboard + slogan + tall actions.
  // iOS phone landscape uses a larger share so codes fill the flex promo band.
  const promoWidth = promoLayout.promoWidth;
  const promoGap = promoLayout.promoGap;
  const actionLabelSize = getWinnerActionLabelSize({
    platform: Platform.OS,
    compact,
    tiny,
    textScale,
  });
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

        <View style={[styles.promoBlock, compact && styles.promoBlockCompact]}>
          <View style={[styles.promoRow, { gap: promoGap }]}>
            <PromoCard
              platform="Android"
              url={PROMO_SITE_URL}
              source={PROMO_QR_SOURCE}
              compact={compact}
              width={promoWidth}
            />
            <PromoCard
              platform="iOS"
              url={PROMO_SITE_URL}
              source={PROMO_QR_SOURCE}
              compact={compact}
              width={promoWidth}
            />
            <PromoCard
              platform="Web"
              url={PROMO_SITE_URL}
              source={PROMO_QR_SOURCE}
              compact={compact}
              width={promoWidth}
            />
          </View>
        </View>

        <Text
          style={[
            styles.slogan,
            compact && styles.sloganCompact,
            tiny && styles.sloganTiny,
            {
              color: HOME_SOFT_UI.colors.textPrimary,
              fontSize: Math.round((tiny ? 15 : compact ? 18 : 26) * textScale),
              lineHeight: Math.round((tiny ? 18 : compact ? 22 : 32) * textScale),
            },
          ]}
        >
          Play BackFire Today!
        </Text>

        <View style={[styles.actions, compact && styles.actionsCompact]}>
          {session.lastResolvedTurn ? (
            <Button
              title={t('play.reviewLastAnswer')}
              onPress={() => {
                reopenLastResolvedTurn();
                router.replace('/play/question');
              }}
              style={[styles.actionButton, compact && styles.actionButtonCompact, tiny && styles.actionButtonTiny, { backgroundColor: ACTION_COLORS.review }]}
              textStyle={[styles.actionText, { fontSize: actionLabelSize, lineHeight: Math.round(actionLabelSize * 1.2) }]}
            />
          ) : null}
          <Button
            title={t('play.startAnotherMatch')}
            onPress={handleAnotherMatch}
            style={[styles.actionButton, compact && styles.actionButtonCompact, tiny && styles.actionButtonTiny, { backgroundColor: ACTION_COLORS.another }]}
            textStyle={[styles.actionText, { fontSize: actionLabelSize, lineHeight: Math.round(actionLabelSize * 1.2) }]}
          />
          <Button
            title={t('play.backToHome')}
            onPress={handleHome}
            style={[styles.actionButton, compact && styles.actionButtonCompact, tiny && styles.actionButtonTiny, { backgroundColor: ACTION_COLORS.home }]}
            textStyle={[styles.actionText, { fontSize: actionLabelSize, lineHeight: Math.round(actionLabelSize * 1.2) }]}
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
    marginBottom: SPACING.xs,
  },
  finalHeaderCompact: {
    marginBottom: 2,
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
    // Color applied inline from theme textPrimary (dark-mode safe).
    color: '#111111',
    fontFamily: FONTS.displayBold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: 0.8,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  matchTitleCompact: {
    fontSize: 20,
    lineHeight: 24,
    marginTop: 2,
  },
  matchTitleTiny: {
    fontSize: 16,
    lineHeight: 19,
  },
  endColumn: {
    flex: 1,
    width: '100%',
    maxWidth: LAYOUT.playWideMaxWidth,
    alignSelf: 'center',
    minHeight: 0,
    justifyContent: 'flex-start',
    gap: SPACING.sm,
    // Bottom viewport pad is owned by PlayScaffold chromeColumnStyle (matches top edgePad).
    paddingBottom: 0,
  },
  endColumnCompact: {
    gap: 6,
  },
  endColumnTiny: {
    gap: 4,
  },
  promoBlock: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoBlockCompact: {
    paddingVertical: 2,
  },
  scoreboard: {
    width: '100%',
    flexShrink: 0,
    minHeight: 96,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.xl,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.sm,
  },
  scoreboardCompact: {
    minHeight: 72,
    padding: 6,
    gap: 6,
    borderRadius: BORDER_RADIUS.lg,
  },
  scoreboardTiny: {
    minHeight: 58,
    padding: 4,
    gap: 4,
  },
  teamCard: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    minWidth: 0,
  },
  teamCardVersus: {
    flex: 1,
    minHeight: 96,
  },
  teamCardVersusCompact: {
    minHeight: 68,
  },
  teamCardGrid: {
    flex: 1,
    minHeight: 88,
  },
  teamCardGridCompact: {
    minHeight: 64,
  },
  teamCardTiny: {
    minHeight: 50,
    paddingVertical: SPACING.xs,
  },
  teamName: {
    // Pastel team tiles stay light in both themes — charcoal label is intentional.
    color: '#1A1A1A',
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
    color: '#0A0A0A',
    fontFamily: FONTS.displayBold,
    fontSize: 46,
    lineHeight: 52,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  teamScoreCompact: {
    fontSize: 28,
    lineHeight: 31,
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
    zIndex: 2,
  },
  vsBadgeCompact: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: -20,
  },
  vsText: {
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
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoCardCompact: {
    padding: 6,
    borderRadius: BORDER_RADIUS.sm,
  },
  promoLabel: {
    marginTop: 4,
    fontFamily: FONTS.uiBold,
    fontSize: 15,
    lineHeight: 18,
  },
  promoLabelCompact: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 13,
  },
  promoUrl: {
    fontFamily: FONTS.ui,
    fontSize: 12,
    lineHeight: 15,
  },
  promoUrlCompact: {
    fontSize: 8,
    lineHeight: 10,
  },
  slogan: {
    fontFamily: FONTS.displayBold,
    fontSize: 26,
    lineHeight: 32,
    textAlign: 'center',
    flexShrink: 0,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  sloganCompact: {
    fontSize: 18,
    lineHeight: 22,
    marginTop: 4,
    marginBottom: 6,
  },
  sloganTiny: {
    fontSize: 15,
    lineHeight: 18,
    marginTop: 2,
    marginBottom: 4,
  },
  actions: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: SPACING.md,
    flexShrink: 0,
  },
  actionsCompact: {
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 64,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  actionButtonCompact: {
    minHeight: 54,
    borderRadius: BORDER_RADIUS.sm,
    paddingVertical: SPACING.xs,
  },
  actionButtonTiny: {
    minHeight: 48,
  },
  actionText: {
    // Labels sit on bright CTA fills — charcoal stays readable in light and dark.
    color: '#0A0A0A',
    fontFamily: FONTS.uiBold,
    fontSize: 17,
    lineHeight: 21,
    textAlign: 'center',
  },
});
