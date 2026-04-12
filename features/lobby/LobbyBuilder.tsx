import { View, Text, StyleSheet, TextInput } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { useState } from 'react';
import type { GameConfig, TeamConfig } from '@/features/shared';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '@/constants';
import { getResolvedContentLocaleChain } from '@/lib/i18n/config';
import { useTheme } from '@/lib/hooks/useTheme';
import { useLocaleStore } from '@/store/locale';

interface LobbyBuilderProps {
  mode: 'classic' | 'quickPlay';
  onStart: (config: GameConfig) => void;
}

export function LobbyBuilder({ mode, onStart }: LobbyBuilderProps) {
  const [team1Name, setTeam1Name] = useState('Team 1');
  const [team2Name, setTeam2Name] = useState('Team 2');
  const colors = useTheme();
  const contentLocaleChain = getResolvedContentLocaleChain(
    useLocaleStore.getState().contentLocales
  );

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
    <View style={styles.container}>
      <View style={styles.copyColumn}>
        <Text style={[styles.title, { color: colors.textOnBackground }]}>
          {mode === 'classic' ? 'Classic' : 'Quick Play'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondaryOnBackground }]}>
          {mode === 'classic'
            ? '36 questions, wagers enabled'
            : '18 questions, faster game'}
        </Text>
      </View>

      <View style={styles.formColumn}>
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textOnBackground }]}>Team 1</Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.border,
                backgroundColor: colors.cardBackground,
                color: colors.text,
              },
            ]}
            value={team1Name}
            onChangeText={setTeam1Name}
            placeholder="Team name"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textOnBackground }]}>Team 2</Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.border,
                backgroundColor: colors.cardBackground,
                color: colors.text,
              },
            ]}
            value={team2Name}
            onChangeText={setTeam2Name}
            placeholder="Team name"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.primary },
            pressed && styles.buttonPressed,
          ]}
          onPress={handleStart}
        >
          <Text style={styles.buttonText}>Start Game</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'stretch',
    padding: SPACING.lg,
    gap: SPACING.xl,
    minHeight: 0,
  },
  copyColumn: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  formColumn: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
  },
  section: {
    gap: SPACING.xs,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
  },
  button: {
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
  },
});
