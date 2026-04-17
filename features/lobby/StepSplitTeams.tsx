import { View, Text, StyleSheet } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { SPACING, FONTS } from '@/constants';
import { HOME_SOFT_UI } from '@/themes';
import { Ionicons } from '@expo/vector-icons';

const T = HOME_SOFT_UI;

interface StepSplitTeamsProps {
  totalPlayers: number;
  team1Count: number;
  team2Count: number;
  onTotalChange: (v: number) => void;
  onTeam1CountChange: (v: number) => void;
  onTeam2CountChange: (v: number) => void;
  onStart: () => void;
}

/** Raised plastic tile shadow tier. */
function neumorphicLift3D(shadowColor: string, tier: 'hero' | 'header' | 'pill' | 'card'): any {
  const m =
    tier === 'hero'
      ? { h: 10, r: 0, el: 12 }
      : tier === 'header'
      ? { h: 6, r: 0, el: 8 }
      : tier === 'card'
      ? { h: 8, r: 0, el: 10 }
      : { h: 4, r: 0, el: 4 };

  return {
    shadowColor: 'rgba(51, 51, 51, 0.15)',
    shadowOffset: { width: 0, height: m.h },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: m.el,
  };
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
  const canvas = T.colors.canvas;
  const surface = T.colors.surface;
  const textPrimary = T.colors.textPrimary;
  const textMuted = T.colors.textMuted;
  const shadowHex = T.colors.shadowStrong;

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

  const stepper = (label: string, value: string | number, onDec: () => void, onInc: () => void) => (
    <View style={styles.section}>
      <Text style={[styles.label, { color: textMuted }]}>{label.toUpperCase()}</Text>
      <View style={[styles.stepperContainer, styles.plasticFace, { backgroundColor: surface }, neumorphicLift3D(shadowHex, 'card')]}>
        <Pressable
          style={({ pressed }) => [
            styles.stepperBtn,
            { opacity: pressed ? 0.7 : 1, transform: pressed ? [{ scale: 0.94 }] : [{ scale: 1 }] }
          ]}
          onPress={onDec}
        >
          <Ionicons name="remove" size={24} color={textPrimary} />
        </Pressable>
        <View style={styles.stepperValueContainer}>
          <Text style={[styles.stepperValue, { color: textPrimary }]}>{value}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.stepperBtn,
            { opacity: pressed ? 0.7 : 1, transform: pressed ? [{ scale: 0.94 }] : [{ scale: 1 }] }
          ]}
          onPress={onInc}
        >
          <Ionicons name="add" size={24} color={textPrimary} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: canvas }]}>
      <Text style={[styles.title, { color: textPrimary }]}>SPLIT TEAMS</Text>
      
      <View style={styles.columns}>
        <View style={styles.col}>
          {stepper('TOTAL PLAYERS', totalPlayers, () => dec(onTotalChange, totalPlayers), () => inc(onTotalChange, totalPlayers, 20))}
        </View>

        <View style={styles.col}>
          {stepper('TEAM SPLIT', `${team1Count} VS ${team2Count}`, () => handleTeam1Change(-1), () => handleTeam1Change(1))}
        </View>
      </View>

      <View style={[styles.footer, styles.plasticFace, { backgroundColor: surface }, neumorphicLift3D(shadowHex, 'pill')]}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.plasticFace,
            { backgroundColor: surface, opacity: valid ? (pressed ? 0.94 : 1) : 0.5 },
            neumorphicLift3D(shadowHex, 'pill'),
            valid && { shadowColor: '#FFB347', shadowOpacity: 0.45 },
          ]}
          onPress={onStart}
          disabled={!valid}
        >
          <Text style={[styles.buttonText, { color: textPrimary }]}>START PLAYING</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plasticFace: {
    borderTopWidth: 2,
    borderTopColor: 'rgba(255, 255, 255, 0.78)',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  root: { flex: 1 },
  columns: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.xl,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  col: {
    flex: 1,
    gap: SPACING.lg,
  },
  title: {
    fontSize: 24,
    fontFamily: FONTS.displayBold,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  section: { gap: SPACING.md },
  label: { 
    fontSize: 10,
    fontFamily: FONTS.uiBold,
    letterSpacing: 1.5,
    paddingLeft: SPACING.sm,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 80,
    borderRadius: 32,
    paddingHorizontal: SPACING.md,
  },
  stepperBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: { 
    fontFamily: FONTS.displayBold,
    fontSize: 24,
    letterSpacing: -0.5,
  },
  footer: {
    padding: SPACING.lg,
    borderTopLeftRadius: 42,
    borderTopRightRadius: 42,
  },
  button: {
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 16, fontFamily: FONTS.displayBold, letterSpacing: 1.2 },
});

