import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPACING, FONT_SIZES } from '@/constants';
import { useTheme } from '@/lib/hooks/useTheme';

export default function RulesModal() {
  const router = useRouter();
  const colors = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <Text style={[styles.closeText, { color: colors.textOnBackground }]}>Close</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.textOnBackground }]}>Rules</Text>
      </View>
      <View style={styles.grid}>
        <View style={styles.column}>
          <Text style={[styles.sectionTitle, { color: colors.textOnBackground }]}>Wagers</Text>
          <Text style={[styles.body, { color: colors.textSecondaryOnBackground }]}>
            Before a question is revealed, the current team can wager. Multipliers: 0.5x, 1.5x, or 2x.
            Correct answers multiply points; incorrect answers deduct.
          </Text>
          <Text style={[styles.sectionTitle, styles.spacedSectionTitle, { color: colors.textOnBackground }]}>
            Hot Seat
          </Text>
          <Text style={[styles.body, { color: colors.textSecondaryOnBackground }]}>
            One player from each team answers solo. Requires player names. 30-second timer. Lifelines
            disabled during Hot Seat.
          </Text>
        </View>
        <View style={styles.column}>
          <Text style={[styles.sectionTitle, { color: colors.textOnBackground }]}>Lifelines</Text>
          <Text style={[styles.body, { color: colors.textSecondaryOnBackground }]}>
            Call a Friend, Discard (skip), Answer Rewards. 3 per team per game (configurable). Not
            available during Hot Seat or Wager turns.
          </Text>
          <Text style={[styles.sectionTitle, styles.spacedSectionTitle, { color: colors.textOnBackground }]}>
            Overtime Surge
          </Text>
          <Text style={[styles.body, { color: colors.textSecondaryOnBackground }]}>
            If the score gap is within a threshold at the end, 5 topics appear. Leading team bans one;
            trailing team picks from the rest.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    padding: SPACING.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    alignSelf: 'flex-end',
  },
  closeText: {
    fontSize: FONT_SIZES.md,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    marginTop: SPACING.sm,
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.lg,
    padding: SPACING.lg,
    minHeight: 0,
  },
  column: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  spacedSectionTitle: {
    marginTop: SPACING.md,
  },
  body: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
});
