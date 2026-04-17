import { View, Text, StyleSheet, TextInput } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { useState } from 'react';
import type { GameConfig, TeamConfig } from '@/features/shared';
import { SPACING, FONTS } from '@/constants';
import { getResolvedContentLocaleChain } from '@/lib/i18n/config';
import { HOME_SOFT_UI } from '@/themes';
import { useLocaleStore } from '@/store/locale';

const T = HOME_SOFT_UI;

interface LobbyBuilderProps {
  mode: 'classic' | 'quickPlay';
  onStart: (config: GameConfig) => void;
}

/** Blocky plastic shadow tier. */
function neumorphicLift3D(tier: 'pill' | 'card' | 'input'): any {
  const m =
    tier === 'input'
      ? { h: 4, el: 4 }
      : tier === 'card'
      ? { h: 8, el: 10 }
      : { h: 10, el: 12 };

  return {
    shadowColor: 'rgba(51, 51, 51, 0.15)',
    shadowOffset: { width: 0, height: m.h },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: m.el,
  };
}

export function LobbyBuilder({ mode, onStart }: LobbyBuilderProps) {
  const [team1Name, setTeam1Name] = useState('Team 1');
  const [team2Name, setTeam2Name] = useState('Team 2');
  
  const contentLocaleChain = getResolvedContentLocaleChain(
    useLocaleStore.getState().contentLocales
  );

  const canvas = T.colors.canvas;
  const surface = T.colors.surface;
  const textPrimary = T.colors.textPrimary;
  const textMuted = T.colors.textMuted;
  const accentGlow = T.colors.accentGlow;

  const handleStart = () => {
    const teams: TeamConfig[] = [
      { id: 'team_1', name: team1Name || 'Team 1' },
      { id: 'team_2', name: team2Name || 'Team 2' },
    ];
    const config: GameConfig = {
      mode,
      teams,
      categories: [],
      contentLocaleChain,
      hotSeatEnabled: false,
      wagerEnabled: mode === 'classic',
      boardSize: mode === 'quickPlay' ? 18 : 36,
    };
    onStart(config);
  };

  return (
    <View style={[styles.container, { backgroundColor: canvas }]}>
      <View style={styles.copyColumn}>
        <Text style={[styles.title, { color: textPrimary }]}>
          {mode === 'classic' ? 'CLASSIC' : 'QUICK PLAY'}
        </Text>
        <Text style={[styles.subtitle, { color: textMuted }]}>
          {mode === 'classic'
            ? '36 questions, wagers enabled'
            : '18 questions, faster game'}
        </Text>
      </View>

      <View style={styles.formColumn}>
        <View style={styles.section}>
          <Text style={[styles.label, { color: textPrimary }]}>TEAM 1 NAME</Text>
          <TextInput
            style={[
              styles.input,
              styles.plasticFace,
              {
                backgroundColor: surface,
                color: textPrimary,
              },
              neumorphicLift3D('input'),
            ]}
            value={team1Name}
            onChangeText={setTeam1Name}
            placeholder="Team name"
            placeholderTextColor={textMuted}
          />
        </View>
        <View style={styles.section}>
          <Text style={[styles.label, { color: textPrimary }]}>TEAM 2 NAME</Text>
          <TextInput
            style={[
              styles.input,
              styles.plasticFace,
              {
                backgroundColor: surface,
                color: textPrimary,
              },
              neumorphicLift3D('input'),
            ]}
            value={team2Name}
            onChangeText={setTeam2Name}
            placeholder="Team name"
            placeholderTextColor={textMuted}
          />
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.plasticFace,
            { 
              backgroundColor: surface,
              opacity: pressed ? 0.94 : 1,
              transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
              shadowColor: accentGlow,
            },
            neumorphicLift3D('pill'),
          ]}
          onPress={handleStart}
        >
          <Text style={[styles.buttonText, { color: textPrimary }]}>START GAME</Text>
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
  container: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'stretch',
    padding: SPACING.xl,
    gap: SPACING.xxl,
    minHeight: 0,
  },
  copyColumn: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: SPACING.md,
  },
  formColumn: {
    flex: 1.2,
    minWidth: 0,
    justifyContent: 'center',
    gap: SPACING.xl,
  },
  title: {
    fontSize: 48,
    fontFamily: FONTS.displayBold,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: FONTS.ui,
    letterSpacing: 0.2,
  },
  section: {
    gap: SPACING.sm,
  },
  label: {
    fontSize: 12,
    fontFamily: FONTS.uiBold,
    letterSpacing: 1.2,
  },
  input: {
    height: 64,
    borderRadius: 22,
    paddingHorizontal: SPACING.lg,
    fontSize: 18,
    fontFamily: FONTS.uiBold,
  },
  button: {
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.lg,
  },
  buttonText: {
    fontSize: 20,
    fontFamily: FONTS.displayBold,
    letterSpacing: 1.5,
  },
});

