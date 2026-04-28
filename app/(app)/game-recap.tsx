import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { BORDER_RADIUS, FONT_SIZES, SPACING, FONTS } from '@/constants';
import { useTheme } from '@/lib/hooks/useTheme';
import { usePlayStore } from '@/store/play';

function formatReason(reason: string): string {
  switch (reason) {
    case 'manualAdjustment':
      return 'Manual adjustment';
    case 'hotSeat':
      return 'Hot Seat';
    case 'overtimeSurge':
      return 'Overtime Surge';
    default:
      return reason.charAt(0).toUpperCase() + reason.slice(1);
  }
}

export default function GameRecapModal() {
  const router = useRouter();
  const colors = useTheme();
  const session = usePlayStore((state) => state.session);
  const reopenLastResolvedTurn = usePlayStore((state) => state.reopenLastResolvedTurn);

  if (!session) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.emptyState}>
          <Text style={[styles.title, { color: colors.text }]}>Game Recap</Text>
          <Text style={[styles.emptyCopy, { color: colors.textSecondary }]}>
            No finished session is available to review.
          </Text>
          <Button title="Close" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const winner = [...session.teams].sort((a, b) => b.score - a.score)[0] ?? null;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Game Recap</Text>
        <Button title="Close" variant="secondary" onPress={() => router.back()} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.heroEyebrow, { color: colors.textSecondary }]}>Winner</Text>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            {winner?.name ?? 'Tie Game'}
          </Text>
          <Text style={[styles.heroBody, { color: colors.textSecondary }]}>
            {session.mode.toUpperCase()} · {session.scoreEvents.length} logged score events
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Final Scores</Text>
          {session.teams.map((team) => (
            <View
              key={team.id}
              style={[
                styles.scoreRow,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                },
              ]}
            >
              <View>
                <Text style={[styles.teamName, { color: colors.text }]}>{team.name}</Text>
                <Text style={[styles.teamMeta, { color: colors.textSecondary }]}>
                  {(team.playerNames ?? []).join(' • ') || 'No players listed'}
                </Text>
              </View>
              <Text style={[styles.teamScore, { color: colors.text }]}>{team.score}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Score Log</Text>
          {session.scoreEvents.length ? (
            session.scoreEvents.map((event, index) => (
              <View
                key={`${event.teamId}-${event.createdAt}-${index}`}
                style={[
                  styles.eventRow,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.eventHeadline, { color: colors.text }]}>
                  {event.teamId} · {event.points > 0 ? '+' : ''}
                  {event.points}
                </Text>
                <Text style={[styles.eventBody, { color: colors.textSecondary }]}>
                  {formatReason(event.reason)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyCopy, { color: colors.textSecondary }]}>
              No score events were recorded for this session.
            </Text>
          )}
        </View>

        {session.lastResolvedTurn ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Latest Answer</Text>
            <View
              style={[
                styles.reviewCard,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.reviewPrompt, { color: colors.text }]}>
                {session.lastResolvedTurn.question.prompt}
              </Text>
              <Text style={[styles.reviewAnswer, { color: colors.textSecondary }]}>
                {session.lastResolvedTurn.question.answer}
              </Text>
              <Button
                title="Review Last Answer"
                onPress={() => {
                  reopenLastResolvedTurn();
                  router.replace('/play/question');
                }}
              />
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontFamily: FONTS.displayBold,
  },
  content: {
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    gap: SPACING.xs,
  },
  heroEyebrow: {
    fontSize: FONT_SIZES.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: FONTS.uiBold,
  },
  heroTitle: {
    fontSize: 30,
    fontFamily: FONTS.displayBold,
  },
  heroBody: {
    fontSize: FONT_SIZES.sm,
  },
  section: {
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.uiBold,
  },
  scoreRow: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamName: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.uiBold,
  },
  teamMeta: {
    fontSize: FONT_SIZES.sm,
    marginTop: 4,
  },
  teamScore: {
    fontSize: 28,
    fontFamily: FONTS.displayBold,
  },
  eventRow: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    gap: 4,
  },
  eventHeadline: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.uiBold,
  },
  eventBody: {
    fontSize: FONT_SIZES.sm,
  },
  reviewCard: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  reviewPrompt: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.uiBold,
  },
  reviewAnswer: {
    fontSize: FONT_SIZES.sm,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    padding: SPACING.xl,
  },
  emptyCopy: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
  },
});
