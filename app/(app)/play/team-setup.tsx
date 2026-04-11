import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { BORDER_RADIUS, FONT_SIZES, SPACING, FONTS } from '@/constants';
import { PlayScaffold } from '@/features/play/components/PlayScaffold';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';
import { usePlayStore } from '@/store/play';

export default function TeamSetupScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { getTextStyle, t } = useI18n();
  const session = usePlayStore((state) => state.session);
  const updateTeamName = usePlayStore((state) => state.updateTeamName);
  const addTeamMember = usePlayStore((state) => state.addTeamMember);
  const removeTeamMember = usePlayStore((state) => state.removeTeamMember);
  const updateTeamMemberName = usePlayStore((state) => state.updateTeamMemberName);
  const setWagersPerTeam = usePlayStore((state) => state.setWagersPerTeam);

  if (!session) {
    return <PlayScaffold title={t('common.loading')}><Text>{t('common.loading')}</Text></PlayScaffold>;
  }

  const canContinue = session.teams.every(
    (team) =>
      team.name.trim().length > 0 &&
      (team.playerNames?.length ?? 0) > 0 &&
      team.playerNames?.every((player) => player.trim().length > 0)
  );

  return (
    <PlayScaffold
      title={t('play.teamSetupTitle')}
      subtitle={t('play.teamSetupSubtitle')}
      footer={
        <Button
          title={t('play.continueToTopics')}
          onPress={() => router.push('/(app)/play/categories')}
          disabled={!canContinue}
        />
      }
    >
      {session.config.wagerEnabled ? (
        <View
          style={[
            styles.wagerCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }, getTextStyle(undefined, 'display', 'start')]}>
            {t('play.wagersPerTeam')}
          </Text>
          <View style={styles.stepperRow}>
            <Pressable
              style={[styles.stepperButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
              onPress={() => setWagersPerTeam(session.wagersPerTeam - 1)}
            >
              <Text style={[styles.stepperText, { color: colors.text }]}>−</Text>
            </Pressable>
            <Text style={[styles.stepperValue, { color: colors.text }]}>{session.wagersPerTeam}</Text>
            <Pressable
              style={[styles.stepperButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
              onPress={() => setWagersPerTeam(session.wagersPerTeam + 1)}
            >
              <Text style={[styles.stepperText, { color: colors.text }]}>+</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {session.teams.map((team) => (
        <View
          key={team.id}
          style={[
            styles.teamCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }, getTextStyle(undefined, 'display', 'start')]}>
            {team.id === 'team_1' ? t('common.teamOne') : t('common.teamTwo')}
          </Text>
          <TextInput
            value={team.name}
            onChangeText={(value) => updateTeamName(team.id, value)}
            style={[
              styles.input,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            placeholder={t('play.teamNamePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            accessibilityLabel={`${team.id} ${t('play.teamNamePlaceholder')}`}
          />

          <View style={styles.membersHeader}>
            <Text style={[styles.membersLabel, { color: colors.textSecondary }, getTextStyle()]}>
              {t('play.teamMembers')}
            </Text>
            <View style={styles.memberActions}>
              <Pressable
                style={[styles.memberActionButton, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}
                onPress={() => removeTeamMember(team.id)}
              >
                <Text style={[styles.memberActionText, { color: colors.text }]}>−</Text>
              </Pressable>
              <Pressable
                style={[styles.memberActionButton, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}
                onPress={() => addTeamMember(team.id)}
              >
                <Text style={[styles.memberActionText, { color: colors.text }]}>+</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.memberList}>
            {(team.playerNames ?? []).map((player, index) => (
              <TextInput
                key={`${team.id}-${index}`}
                value={player}
                onChangeText={(value) => updateTeamMemberName(team.id, index, value)}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder={t('play.playerPlaceholder', { count: index + 1 })}
                placeholderTextColor={colors.textSecondary}
                accessibilityLabel={`${team.id} ${t('play.playerPlaceholder', { count: index + 1 })}`}
              />
            ))}
          </View>
        </View>
      ))}
    </PlayScaffold>
  );
}

const styles = StyleSheet.create({
  wagerCard: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
  },
  teamCard: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    fontFamily: FONTS.uiSemibold,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  stepperButton: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
  },
  stepperValue: {
    minWidth: 40,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '800',
  },
  membersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  membersLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  memberActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  memberActionButton: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberActionText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
  },
  memberList: {
    gap: SPACING.sm,
  },
});
