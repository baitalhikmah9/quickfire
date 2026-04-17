import { View, Text, StyleSheet, TextInput, ScrollView } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { LIFELINES, LIFELINES_PER_TEAM, type LifelineId } from './lifelines';
import { SPACING, FONTS } from '@/constants';
import { HOME_SOFT_UI } from '@/themes';
import { Ionicons } from '@expo/vector-icons';

const T = HOME_SOFT_UI;

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

/** Raised plastic tile shadow tier. */
function neumorphicLift3D(shadowColor: string, tier: 'hero' | 'header' | 'pill' | 'card'): any {
  const m =
    tier === 'hero'
      ? { h: 14, op: 1, r: 28, el: 18 }
      : tier === 'header'
      ? { h: 8, op: 0.9, r: 18, el: 12 }
      : tier === 'card'
      ? { h: 10, op: 0.9, r: 22, el: 14 }
      : { h: 6, op: 0.8, r: 14, el: 8 };

  return {
    shadowColor,
    shadowOffset: { width: 0, height: m.h },
    shadowOpacity: m.op,
    shadowRadius: m.r,
    elevation: m.el,
  };
}

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
  const canvas = T.colors.canvas;
  const surface = T.colors.surface;
  const textPrimary = T.colors.textPrimary;
  const textMuted = T.colors.textMuted;
  const shadowHex = T.colors.shadowStrong;

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
      <Text style={[styles.lifelineTitle, { color: textMuted }]}>
        {title.toUpperCase()} LIFELINES ({selected.length}/{LIFELINES_PER_TEAM})
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.lifelineRow}
      >
        {LIFELINES.map((l) => {
          const sel = selected.includes(l.id);
          const disabled = !sel && selected.length >= LIFELINES_PER_TEAM;
          return (
            <View key={l.id} style={styles.lifelineCardWrapper}>
              {sel && <View style={styles.selectionGlow} />}
              <Pressable
                style={({ pressed }) => [
                  styles.lifelineCard,
                  styles.plasticFace,
                  {
                    backgroundColor: surface,
                    opacity: disabled ? 0.4 : pressed ? 0.94 : 1,
                    transform: pressed ? [{ scale: 0.97 }] : [{ scale: 1 }],
                  },
                  neumorphicLift3D(shadowHex, 'card'),
                  sel && { shadowColor: '#FFB347', shadowOpacity: 0.3 },
                ]}
                onPress={() => !disabled && onToggle(l.id)}
              >
                <View style={[styles.iconWrap, { backgroundColor: sel ? 'rgba(51, 51, 51, 0.05)' : 'rgba(0,0,0,0.02)' }]}>
                   <Ionicons name={sel ? 'shield-checkmark' : 'shield-outline'} size={24} color={textPrimary} />
                </View>
                <Text style={[styles.lifelineLabel, { color: textPrimary }]}>
                  {l.label.toUpperCase()}
                </Text>
                <Text
                  style={[styles.lifelineDesc, { color: textMuted }]}
                  numberOfLines={2}
                >
                  {l.description}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: canvas }]}>
      <Text style={[styles.title, { color: textPrimary }]}>TEAM INFORMATION</Text>
      
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.inputSection}>
          <View style={styles.col}>
            <Text style={[styles.label, { color: textMuted }]}>TEAM 1 NAME</Text>
            <View style={[styles.inputWrap, styles.plasticFace, { backgroundColor: surface }, neumorphicLift3D(shadowHex, 'header')]}>
              <TextInput
                style={[styles.input, { color: textPrimary }]}
                value={team1Name}
                onChangeText={onTeam1NameChange}
                placeholder="ENTER NAME"
                placeholderTextColor={textMuted}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <View style={styles.col}>
            <Text style={[styles.label, { color: textMuted }]}>TEAM 2 NAME</Text>
            <View style={[styles.inputWrap, styles.plasticFace, { backgroundColor: surface }, neumorphicLift3D(shadowHex, 'header')]}>
              <TextInput
                style={[styles.input, { color: textPrimary }]}
                value={team2Name}
                onChangeText={onTeam2NameChange}
                placeholder="ENTER NAME"
                placeholderTextColor={textMuted}
                autoCapitalize="characters"
              />
            </View>
          </View>
        </View>

        {renderLifelineSection('Team 1', team1Lifelines, onTeam1LifelineToggle)}
        {renderLifelineSection('Team 2', team2Lifelines, onTeam2LifelineToggle)}
      </ScrollView>

      <View style={[styles.footer, styles.plasticFace, { backgroundColor: surface }, neumorphicLift3D(shadowHex, 'pill')]}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.plasticFace,
            { backgroundColor: surface, opacity: canNext ? (pressed ? 0.94 : 1) : 0.5 },
            neumorphicLift3D(shadowHex, 'pill'),
            canNext && { shadowColor: '#FFB347', shadowOpacity: 0.45 },
          ]}
          onPress={onNext}
          disabled={!canNext}
        >
          <Text style={[styles.buttonText, { color: textPrimary }]}>{canNext ? 'CONTINUE' : 'CHOOSE NAMES & LIFELINES'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plasticFace: {
    borderTopWidth: 2,
    borderTopColor: 'rgba(255, 255, 255, 0.78)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.lg, gap: SPACING.xl },
  title: {
    fontSize: 24,
    fontFamily: FONTS.displayBold,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  inputSection: {
    gap: SPACING.lg,
  },
  col: {
    gap: SPACING.sm,
  },
  label: { 
    fontSize: 10,
    fontFamily: FONTS.uiBold,
    letterSpacing: 1.5,
    paddingLeft: SPACING.sm,
  },
  inputWrap: {
    borderRadius: 24,
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  input: {
    fontFamily: FONTS.uiBold,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  lifelineSection: { gap: SPACING.md },
  lifelineTitle: {
    fontSize: 10,
    fontFamily: FONTS.uiBold,
    letterSpacing: 1.5,
    paddingLeft: SPACING.sm,
  },
  lifelineRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  lifelineCardWrapper: {
    position: 'relative',
  },
  selectionGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 26,
    backgroundColor: '#FFB347',
    opacity: 0.15,
  },
  lifelineCard: {
    width: LIFELINE_CARD_W,
    padding: SPACING.lg,
    borderRadius: 24,
    alignItems: 'center',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  lifelineLabel: {
    fontSize: 12,
    fontFamily: FONTS.displayBold,
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  lifelineDesc: { 
    fontSize: 11,
    fontFamily: FONTS.ui,
    textAlign: 'center',
    lineHeight: 16,
    opacity: 0.8,
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

