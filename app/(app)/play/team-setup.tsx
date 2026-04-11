import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { BORDER_RADIUS, FONT_SIZES, SPACING, FONTS } from '@/constants';
import { PlayScaffold } from '@/features/play/components/PlayScaffold';
import { WagerInfoModal } from '@/features/play/components/WagerInfoModal';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';
import { usePlayStore } from '@/store/play';
import type { GameSessionState } from '@/features/shared';

/** Must stay in sync with `setWagersPerTeam` clamp in `store/play.ts`. */
const MAX_WAGERS_PER_TEAM = 9;

type TeamSetupStep = 'team_1' | 'team_2' | 'wager';

function isTeamConfigured(team: GameSessionState['teams'][number]): boolean {
  return (
    team.name.trim().length > 0 &&
    (team.playerNames?.length ?? 0) > 0 &&
    Boolean(team.playerNames?.every((player) => player.trim().length > 0))
  );
}

export default function TeamSetupScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { getTextStyle, t } = useI18n();
  const [wagerInfoOpen, setWagerInfoOpen] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);

  const session = usePlayStore((state) => state.session);
  const updateTeamName = usePlayStore((state) => state.updateTeamName);
  const addTeamMember = usePlayStore((state) => state.addTeamMember);
  const removeTeamMember = usePlayStore((state) => state.removeTeamMember);
  const updateTeamMemberName = usePlayStore((state) => state.updateTeamMemberName);
  const setWagersPerTeam = usePlayStore((state) => state.setWagersPerTeam);

  const steps = useMemo<TeamSetupStep[]>(() => {
    const base: TeamSetupStep[] = ['team_1', 'team_2'];
    if (session?.config.wagerEnabled) base.push('wager');
    return base;
  }, [session?.config.wagerEnabled]);

  const currentStep = steps[slideIndex] ?? 'team_1';

  const canContinue = Boolean(
    session?.teams.every(
      (team) =>
        team.name.trim().length > 0 &&
        (team.playerNames?.length ?? 0) > 0 &&
        team.playerNames?.every((player) => player.trim().length > 0)
    )
  );

  const canLeaveCurrentSlide = useMemo(() => {
    if (!session) return false;
    if (currentStep === 'wager') return true;
    const team = currentStep === 'team_1' ? session.teams[0] : session.teams[1];
    return isTeamConfigured(team);
  }, [session, currentStep]);

  const goToPage = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(steps.length - 1, index));
    setSlideIndex(clamped);
  }, [steps.length]);

  useEffect(() => {
    if (slideIndex >= steps.length) {
      setSlideIndex(Math.max(0, steps.length - 1));
    }
  }, [slideIndex, steps.length]);

  const headerTitle = useMemo(() => {
    switch (currentStep) {
      case 'team_1':
        return t('common.teamOne');
      case 'team_2':
        return t('common.teamTwo');
      case 'wager':
        return t('play.wagersPerTeam');
      default:
        return t('play.teamSetupTitle');
    }
  }, [currentStep, t]);

  if (!session) {
    return (
      <PlayScaffold title={t('common.loading')} bodyScrollEnabled={false}>
        <Text>{t('common.loading')}</Text>
      </PlayScaffold>
    );
  }

  const renderTeamSlide = (team: GameSessionState['teams'][number]) => {
    const memberCount = team.playerNames?.length ?? 0;
    return (
      <View
        style={[
          styles.slidePage,
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
            {t('play.teamMembersCount', { count: memberCount })}
          </Text>
          <View style={styles.memberActions}>
            <Pressable
              style={({ pressed }) => [
                styles.memberActionButton,
                { borderColor: colors.border, backgroundColor: colors.cardBackground },
                {
                  opacity: memberCount <= 1 ? 0.45 : pressed ? 0.85 : 1,
                },
              ]}
              onPress={() => removeTeamMember(team.id)}
              disabled={memberCount <= 1}
              accessibilityRole="button"
              accessibilityState={{ disabled: memberCount <= 1 }}
              accessibilityLabel={t('play.removeTeamMemberA11y')}
            >
              <Text style={[styles.memberActionText, { color: colors.text }]}>−</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.memberActionButton,
                { borderColor: colors.border, backgroundColor: colors.cardBackground },
                { opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => addTeamMember(team.id)}
              accessibilityRole="button"
              accessibilityLabel={t('play.addTeamMemberA11y')}
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
    );
  };

  const renderWagerSlide = () => (
    <View
      style={[
        styles.slidePage,
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
          style={({ pressed }) => [
            styles.stepperButton,
            { backgroundColor: colors.cardBackground, borderColor: colors.border },
            {
              opacity: session.wagersPerTeam <= 0 ? 0.45 : pressed ? 0.85 : 1,
            },
          ]}
          onPress={() => setWagersPerTeam(session.wagersPerTeam - 1)}
          disabled={session.wagersPerTeam <= 0}
          accessibilityRole="button"
          accessibilityState={{ disabled: session.wagersPerTeam <= 0 }}
        >
          <Text style={[styles.stepperText, { color: colors.text }]}>−</Text>
        </Pressable>
        <Text style={[styles.stepperValue, { color: colors.text }]}>{session.wagersPerTeam}</Text>
        <Pressable
          style={({ pressed }) => [
            styles.stepperButton,
            { backgroundColor: colors.cardBackground, borderColor: colors.border },
            {
              opacity: session.wagersPerTeam >= MAX_WAGERS_PER_TEAM ? 0.45 : pressed ? 0.85 : 1,
            },
          ]}
          onPress={() => setWagersPerTeam(session.wagersPerTeam + 1)}
          disabled={session.wagersPerTeam >= MAX_WAGERS_PER_TEAM}
          accessibilityRole="button"
          accessibilityState={{ disabled: session.wagersPerTeam >= MAX_WAGERS_PER_TEAM }}
        >
          <Text style={[styles.stepperText, { color: colors.text }]}>+</Text>
        </Pressable>
      </View>
      <Pressable
        onPress={() => setWagerInfoOpen(true)}
        style={styles.wagerInfoLink}
        accessibilityRole="button"
        accessibilityLabel={t('play.wagerInfoLink')}
      >
        <Text style={[styles.wagerInfoLinkText, { color: colors.primary }, getTextStyle()]}>
          {t('play.wagerInfoLink')}
        </Text>
      </Pressable>
    </View>
  );

  const isLastSlide = slideIndex >= steps.length - 1;

  const currentSlide =
    currentStep === 'team_1'
      ? renderTeamSlide(session.teams[0])
      : currentStep === 'team_2'
        ? renderTeamSlide(session.teams[1])
        : renderWagerSlide();

  return (
    <PlayScaffold
      title={headerTitle}
      subtitle={t('play.teamSetupStepOf', { current: slideIndex + 1, total: steps.length })}
      bodyScrollEnabled={false}
      footer={
        <View style={styles.footerActions}>
          {slideIndex > 0 ? (
            <Button
              title={t('common.back')}
              variant="outline"
              onPress={() => goToPage(slideIndex - 1)}
              style={styles.footerBack}
            />
          ) : null}
          {!isLastSlide ? (
            <Button
              title={t('play.teamSetupNext')}
              onPress={() => goToPage(slideIndex + 1)}
              disabled={!canLeaveCurrentSlide}
              style={slideIndex > 0 ? styles.footerPrimary : styles.footerPrimaryFull}
            />
          ) : (
            <Button
              title={t('play.continueToTopics')}
              onPress={() => router.push('/(app)/play/categories')}
              disabled={!canContinue}
              style={slideIndex > 0 ? styles.footerPrimary : styles.footerPrimaryFull}
            />
          )}
        </View>
      }
    >
      <WagerInfoModal visible={wagerInfoOpen} onClose={() => setWagerInfoOpen(false)} />

      <View style={styles.dotsRow} accessibilityRole="tablist">
        {steps.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === slideIndex ? colors.primary : colors.border,
                opacity: i === slideIndex ? 1 : 0.45,
              },
            ]}
            accessibilityRole="text"
            accessibilityLabel={t('play.teamSetupStepOf', { current: i + 1, total: steps.length })}
          />
        ))}
      </View>

      <View style={styles.slideHost}>{currentSlide}</View>
    </PlayScaffold>
  );
}

const styles = StyleSheet.create({
  slideHost: {
    width: '100%',
  },
  slidePage: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.md,
    width: '100%',
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
  wagerInfoLink: {
    marginTop: SPACING.md,
    alignSelf: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  wagerInfoLinkText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.sm,
    width: '100%',
  },
  footerBack: {
    flexShrink: 0,
    minWidth: 108,
  },
  footerPrimary: {
    flex: 1,
    minWidth: 0,
  },
  footerPrimaryFull: {
    flex: 1,
    width: '100%',
  },
});
