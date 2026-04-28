import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { BORDER_RADIUS, FONT_SIZES, SPACING, FONTS } from '@/constants';
import { PlayScaffold } from '@/features/play/components/PlayScaffold';
import { SOFT_SURFACE_STYLES } from '@/features/play/styles/softSurface';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';
import { usePlayStore } from '@/store/play';

export default function PlayEndScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { getTextStyle, t } = useI18n();
  const { session, resetSession, ensureDraft, reopenLastResolvedTurn } = usePlayStore();

  if (!session) {
    return <PlayScaffold title={t('play.matchComplete')}><Text>{t('play.sessionCleared')}</Text></PlayScaffold>;
  }

  const winner = [...session.teams].sort((a, b) => b.score - a.score)[0];

  return (
    <PlayScaffold
      title={t('play.matchComplete')}
      subtitle={t('play.matchCompleteSubtitle')}
      onBack={() => router.replace('/(app)/')}
      showHud
      session={session}
    >
      <View
        style={[
          styles.winnerCard,
          {
            backgroundColor: `${colors.primary}10`,
            borderColor: `${colors.primary}25`,
          },
        ]}
      >
        <Text style={[styles.winnerLabel, { color: colors.textSecondary }, getTextStyle()]}>
          {t('play.winner')}
        </Text>
        <Text style={[styles.winnerName, { color: colors.text }, getTextStyle(undefined, 'displayBold', 'center')]}>
          {winner?.name ?? t('play.tieGame')}
        </Text>
      </View>

      <View style={styles.teamList}>
        {session.teams.map((team) => (
          <View
            key={team.id}
            style={[
              styles.teamRow,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
              },
            ]}
          >
            <View>
              <Text style={[styles.teamName, { color: colors.text }]}>{team.name}</Text>
              <Text style={[styles.teamMeta, { color: colors.textSecondary }]}>
                {(team.playerNames ?? []).join(' • ')}
              </Text>
            </View>
            <Text style={[styles.teamScore, { color: colors.text }]}>{team.score}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        {session.lastResolvedTurn ? (
          <Button
            title={t('play.reviewLastAnswer')}
            variant="secondary"
            onPress={() => {
              reopenLastResolvedTurn();
              router.replace('/play/question');
            }}
          />
        ) : null}
        <Button
          title={t('play.backToHome')}
          variant="secondary"
          onPress={() => {
            resetSession();
            router.replace('/(app)/');
          }}
        />
        <Button
          title={t('play.startAnotherMatch')}
          onPress={() => {
            resetSession();
            ensureDraft();
            router.replace('/play/mode');
          }}
        />
      </View>
    </PlayScaffold>
  );
}

const styles = StyleSheet.create({
  winnerCard: {
    borderWidth: 0,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SOFT_SURFACE_STYLES.face,
    ...SOFT_SURFACE_STYLES.raised,
  },
  winnerLabel: {
    fontSize: FONT_SIZES.sm,
    marginBottom: 4,
  },
  winnerName: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    fontFamily: FONTS.displayBold,
    textAlign: 'center',
  },
  teamList: {
    gap: SPACING.md,
  },
  teamRow: {
    borderWidth: 0,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SOFT_SURFACE_STYLES.face,
    ...SOFT_SURFACE_STYLES.raised,
  },
  teamName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    marginBottom: 4,
  },
  teamMeta: {
    fontSize: FONT_SIZES.sm,
  },
  teamScore: {
    fontSize: 28,
    fontWeight: '800',
  },
  actions: {
    gap: SPACING.md,
  },
});
