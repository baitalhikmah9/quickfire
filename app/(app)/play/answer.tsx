import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { BORDER_RADIUS, FONT_SIZES, SPACING } from '@/constants';
import { PlayScaffold } from '@/features/play/components/PlayScaffold';
import { useTheme } from '@/lib/hooks/useTheme';
import { usePlayStore } from '@/store/play';

export default function PlayAnswerScreen() {
  const router = useRouter();
  const colors = useTheme();
  const session = usePlayStore((state) => state.session);
  const awardStandardQuestion = usePlayStore((state) => state.awardStandardQuestion);
  const continueAfterStandardQuestion = usePlayStore((state) => state.continueAfterStandardQuestion);
  const initiateWager = usePlayStore((state) => state.initiateWager);
  const resolveWager = usePlayStore((state) => state.resolveWager);

  if (!session?.currentQuestion) {
    return <PlayScaffold title="Loading…"><Text>Loading answer…</Text></PlayScaffold>;
  }
  const currentQuestion = session.currentQuestion;
  const wager = session.wager;

  const showPostScoreActions = !wager && session.phase === 'scoring';
  const canWager =
    session.config.wagerEnabled &&
    !session.bonus.active &&
    !wager &&
    session.phase === 'scoring' &&
    (session.teams.find((team) => team.id === session.currentTeamId)?.wagersUsed ?? 0) < session.wagersPerTeam;

  const footer =
    wager ? (
      <View style={styles.footerRow}>
        <View style={styles.footerBtn}>
          <Button
            title={`Correct for ${session.teams.find((team) => team.id === wager.targetTeamId)?.name ?? 'Target Team'}`}
            onPress={() => {
              resolveWager(true);
              router.replace('/(app)/play/board');
            }}
          />
        </View>
        <View style={styles.footerBtn}>
          <Button
            title="Incorrect"
            variant="destructive"
            onPress={() => {
              resolveWager(false);
              router.replace('/(app)/play/board');
            }}
          />
        </View>
      </View>
    ) : showPostScoreActions ? (
      <View style={styles.footerRow}>
        <View style={styles.footerBtn}>
          <Button
            title={session.bonus.active ? 'Finish Match' : 'Next Turn'}
            onPress={() => {
              continueAfterStandardQuestion();
              router.replace('/(app)/play/board');
            }}
          />
        </View>
        {canWager ? (
          <View style={styles.footerBtn}>
            <Button
              title="Wager on Next Team"
              variant="accent"
              onPress={() => {
                const result = initiateWager();
                if (result.ok) {
                  router.replace('/(app)/play/board');
                }
              }}
            />
          </View>
        ) : null}
      </View>
    ) : undefined;

  return (
    <PlayScaffold
      title="Resolve the Turn"
      subtitle={session.bonus.active ? 'Bonus round is active for this question.' : 'Keep the same reveal-then-award rhythm as TriviaApp.'}
      showHud
      session={session}
      footer={footer}
    >
      <View
        style={[
          styles.answerCard,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.answerLabel, { color: colors.textSecondary }]}>Correct Answer</Text>
        <Text style={[styles.answerText, { color: colors.text }]}>{currentQuestion.answer}</Text>
      </View>

      {!wager ? (
        <>
          <Text style={[styles.promptText, { color: colors.text }]}>
            {session.phase === 'scoring' ? 'Points awarded.' : 'Who gets the points?'}
          </Text>

          <View style={styles.awardRow}>
            {session.teams.map((team) => (
              <Pressable
                key={team.id}
                style={({ pressed }) => [
                  styles.awardCard,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border,
                    opacity: session.phase === 'scoring' ? 0.6 : pressed ? 0.82 : 1,
                  },
                ]}
                onPress={() => awardStandardQuestion(team.id)}
                disabled={session.phase === 'scoring'}
              >
                <Text style={[styles.awardTitle, { color: colors.text }]} numberOfLines={1}>
                  {team.name}
                </Text>
                <Text style={[styles.awardCopy, { color: colors.textSecondary }]} numberOfLines={1}>
                  +{currentQuestion.pointValue * (session.bonus.active ? session.bonus.multiplier : 1)} pts
                </Text>
              </Pressable>
            ))}

            <Pressable
              style={({ pressed }) => [
                styles.awardCard,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                  opacity: session.phase === 'scoring' ? 0.6 : pressed ? 0.82 : 1,
                },
              ]}
              onPress={() => awardStandardQuestion(null)}
              disabled={session.phase === 'scoring'}
            >
              <Text style={[styles.awardTitle, { color: colors.text }]} numberOfLines={1}>
                Neither Team
              </Text>
              <Text style={[styles.awardCopy, { color: colors.textSecondary }]} numberOfLines={1}>
                No points
              </Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </PlayScaffold>
  );
}

const styles = StyleSheet.create({
  answerCard: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    minHeight: 0,
    flexShrink: 0,
    justifyContent: 'center',
  },
  answerLabel: {
    fontSize: FONT_SIZES.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  answerText: {
    fontSize: FONT_SIZES.md,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  promptText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    flexShrink: 0,
  },
  awardRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: SPACING.sm,
    flex: 1,
    minHeight: 0,
    alignItems: 'stretch',
  },
  awardCard: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    justifyContent: 'center',
  },
  awardTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    marginBottom: 2,
  },
  awardCopy: {
    fontSize: FONT_SIZES.xs,
  },
  footerRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'stretch',
  },
  footerBtn: {
    flex: 1,
    minWidth: 0,
  },
});
