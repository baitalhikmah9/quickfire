import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { LIFELINES, LIFELINES_PER_TEAM, type LifelineId } from './lifelines';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '@/constants';
import { useTheme } from '@/lib/hooks/useTheme';

interface StepTeamInfoProps {
  team1Name: string;
  team2Name: string;
  team1Lifelines: LifelineId[];
  team2Lifelines: LifelineId[];
  onTeam1NameChange: (v: string) => void;
  onTeam2NameChange: (v: string) => void;
  onTeam1LifelineToggle: (id: LifelineId) => void;
  onTeam2LifelineToggle: (id: LifelineId) => void;
  onNext: () => void;
}

const LIFELINE_CARD_W = 168;

export function StepTeamInfo({
  team1Name,
  team2Name,
  team1Lifelines,
  team2Lifelines,
  onTeam1NameChange,
  onTeam2NameChange,
  onTeam1LifelineToggle,
  onTeam2LifelineToggle,
  onNext,
}: StepTeamInfoProps) {
  const colors = useTheme();
  const canNext =
    team1Name.trim().length > 0 &&
    team2Name.trim().length > 0 &&
    team1Lifelines.length === LIFELINES_PER_TEAM &&
    team2Lifelines.length === LIFELINES_PER_TEAM;

  const renderLifelineSection = (
    title: string,
    selected: LifelineId[],
    onToggle: (id: LifelineId) => void
  ) => (
    <View style={styles.lifelineSection}>
      <Text style={[styles.lifelineTitle, { color: colors.textOnBackground }]}>
        {title}: Choose {LIFELINES_PER_TEAM} lifelines ({selected.length}/{LIFELINES_PER_TEAM})
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        contentContainerStyle={styles.lifelineRow}
      >
        {LIFELINES.map((l) => {
          const sel = selected.includes(l.id);
          const disabled = !sel && selected.length >= LIFELINES_PER_TEAM;
          return (
            <Pressable
              key={l.id}
              style={[
                styles.lifelineCard,
                {
                  backgroundColor: sel ? colors.primary : colors.cardBackground,
                  borderColor: colors.border,
                  opacity: disabled ? 0.5 : 1,
                },
              ]}
              onPress={() => !disabled && onToggle(l.id)}
            >
              <Text style={[styles.lifelineLabel, { color: sel ? '#FFF' : colors.text }]}>
                {l.label}
              </Text>
              <Text
                style={[styles.lifelineDesc, { color: sel ? 'rgba(255,255,255,0.9)' : colors.textSecondary }]}
                numberOfLines={2}
              >
                {l.description}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.root}>
      <Text style={[styles.title, { color: colors.textOnBackground }]}>Define Team Info</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondaryOnBackground }]}>
        Name your teams and choose 3 lifelines per team.
      </Text>

      <View style={styles.columns}>
        <View style={styles.col}>
          <Text style={[styles.label, { color: colors.textOnBackground }]}>Team 1</Text>
          <TextInput
            style={[
              styles.input,
              { borderColor: colors.border, backgroundColor: colors.cardBackground, color: colors.text },
            ]}
            value={team1Name}
            onChangeText={onTeam1NameChange}
            placeholder="Team name"
            placeholderTextColor={colors.textSecondary}
          />
          {renderLifelineSection('Team 1', team1Lifelines, onTeam1LifelineToggle)}
        </View>

        <View style={styles.col}>
          <Text style={[styles.label, { color: colors.textOnBackground }]}>Team 2</Text>
          <TextInput
            style={[
              styles.input,
              { borderColor: colors.border, backgroundColor: colors.cardBackground, color: colors.text },
            ]}
            value={team2Name}
            onChangeText={onTeam2NameChange}
            placeholder="Team name"
            placeholderTextColor={colors.textSecondary}
          />
          {renderLifelineSection('Team 2', team2Lifelines, onTeam2LifelineToggle)}
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.primary },
          (!canNext || pressed) && styles.buttonDisabled,
        ]}
        onPress={onNext}
        disabled={!canNext}
      >
        <Text style={styles.buttonText}>Next</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: SPACING.lg, minHeight: 0, gap: SPACING.md },
  title: { fontSize: FONT_SIZES.xxl, fontWeight: 'bold' },
  subtitle: { fontSize: FONT_SIZES.md, marginBottom: SPACING.sm },
  columns: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.lg,
    minHeight: 0,
    minWidth: 0,
  },
  col: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.sm,
  },
  label: { fontSize: FONT_SIZES.sm, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
  },
  lifelineSection: { flex: 1, minHeight: 0 },
  lifelineTitle: { fontSize: FONT_SIZES.sm, fontWeight: '600', marginBottom: SPACING.sm },
  lifelineRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
    alignItems: 'stretch',
  },
  lifelineCard: {
    width: LIFELINE_CARD_W,
    flexShrink: 0,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  lifelineLabel: { fontSize: FONT_SIZES.md, fontWeight: '600', marginBottom: 4 },
  lifelineDesc: { fontSize: FONT_SIZES.xs },
  button: {
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    flexShrink: 0,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#FFFFFF', fontSize: FONT_SIZES.lg, fontWeight: '600' },
});
