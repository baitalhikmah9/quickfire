import { View, Text, StyleSheet } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '@/constants';
import { useTheme } from '@/lib/hooks/useTheme';

interface StepSplitTeamsProps {
  totalPlayers: number;
  team1Count: number;
  team2Count: number;
  onTotalChange: (v: number) => void;
  onTeam1CountChange: (v: number) => void;
  onTeam2CountChange: (v: number) => void;
  onStart: () => void;
}

export function StepSplitTeams({
  totalPlayers,
  team1Count,
  team2Count,
  onTotalChange,
  onTeam1CountChange,
  onTeam2CountChange,
  onStart,
}: StepSplitTeamsProps) {
  const colors = useTheme();
  const valid = totalPlayers >= 2 && team1Count + team2Count === totalPlayers && team1Count >= 1 && team2Count >= 1;

  const inc = (setter: (v: number) => void, current: number, max: number) => {
    if (current < max) setter(current + 1);
  };
  const dec = (setter: (v: number) => void, current: number) => {
    if (current > 1) setter(current - 1);
  };

  const handleTeam1Change = (delta: number) => {
    const next = Math.max(1, Math.min(totalPlayers - 1, team1Count + delta));
    onTeam1CountChange(next);
    onTeam2CountChange(totalPlayers - next);
  };

  return (
    <View style={styles.root}>
      <View style={styles.columns}>
        <View style={styles.col}>
          <Text style={[styles.title, { color: colors.textOnBackground }]}>Split Teams</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondaryOnBackground }]}>
            How many players total? How many on each team?
          </Text>

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textOnBackground }]}>Total players</Text>
            <View style={styles.stepper}>
              <Pressable
                style={[styles.stepperBtn, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                onPress={() => dec(onTotalChange, totalPlayers)}
              >
                <Text style={[styles.stepperText, { color: colors.text }]}>−</Text>
              </Pressable>
              <Text style={[styles.stepperValue, { color: colors.text }]}>{totalPlayers}</Text>
              <Pressable
                style={[styles.stepperBtn, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                onPress={() => inc(onTotalChange, totalPlayers, 20)}
              >
                <Text style={[styles.stepperText, { color: colors.text }]}>+</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.col}>
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textOnBackground }]}>
              Team 1: {team1Count} · Team 2: {team2Count}
            </Text>
            <View style={styles.stepper}>
              <Pressable
                style={[styles.stepperBtn, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                onPress={() => handleTeam1Change(-1)}
              >
                <Text style={[styles.stepperText, { color: colors.text }]}>−</Text>
              </Pressable>
              <Text style={[styles.stepperValue, { color: colors.text }]}>
                {team1Count} / {team2Count}
              </Text>
              <Pressable
                style={[styles.stepperBtn, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                onPress={() => handleTeam1Change(1)}
              >
                <Text style={[styles.stepperText, { color: colors.text }]}>+</Text>
              </Pressable>
            </View>
            <Text style={[styles.hint, { color: colors.textSecondaryOnBackground }]}>
              Adjust split: Team 1 vs Team 2
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.primary },
              (!valid || pressed) && styles.buttonDisabled,
            ]}
            onPress={onStart}
            disabled={!valid}
          >
            <Text style={styles.buttonText}>Start Playing</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: SPACING.lg, minHeight: 0 },
  columns: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.xl,
    alignItems: 'stretch',
    minHeight: 0,
  },
  col: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  title: { fontSize: FONT_SIZES.xxl, fontWeight: 'bold', marginBottom: SPACING.sm },
  subtitle: { fontSize: FONT_SIZES.md, marginBottom: SPACING.md },
  section: { marginBottom: 0 },
  label: { fontSize: FONT_SIZES.sm, fontWeight: '600', marginBottom: SPACING.sm },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: { fontSize: FONT_SIZES.xl, fontWeight: '600' },
  stepperValue: { fontSize: FONT_SIZES.lg, fontWeight: '700', minWidth: 72, textAlign: 'center' },
  hint: { fontSize: FONT_SIZES.sm, marginTop: SPACING.sm },
  button: {
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#FFFFFF', fontSize: FONT_SIZES.lg, fontWeight: '600' },
});
