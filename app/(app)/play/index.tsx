import { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { BORDER_RADIUS, FONT_SIZES, SPACING } from '@/constants';
import { FONTS } from '@/constants/theme';
import { PlayScaffold } from '@/features/play/components/PlayScaffold';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';
import { usePlayStore } from '@/store/play';

function getResumePath(step?: string) {
  switch (step) {
    case 'question':
      return '/(app)/play/question';
    case 'answer':
      return '/(app)/play/answer';
    case 'end':
      return '/(app)/play/end';
    case 'board':
      return '/(app)/play/board';
    case 'categories':
      return '/(app)/play/categories';
    case 'team-setup':
      return '/(app)/play/team-setup';
    case 'quick-play-length':
      return '/(app)/play/quick-length';
    case 'mode':
      return '/(app)/play/mode';
    default:
      return '/(app)/play/mode';
  }
}

export default function PlayHubScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { getTextStyle, t } = useI18n();
  const { ensureDraft, resetSession, session, tokens } = usePlayStore();

  useEffect(() => {
    ensureDraft();
  }, [ensureDraft]);

  const canResume = Boolean(session && session.step !== 'hub' && session.phase !== 'completed');

  return (
    <PlayScaffold title={t('play.hubTitle')} subtitle={t('play.hubSubtitle')}>
      <View style={styles.bodyRow}>
        <View style={styles.bodyCol}>
          <View
            style={[
              styles.balanceCard,
              {
                backgroundColor: `${colors.primary}10`,
                borderColor: `${colors.primary}25`,
              },
            ]}
          >
            <Text style={[styles.balanceLabel, { color: colors.textSecondary }, getTextStyle()]}>
              {t('common.tokenBalance')}
            </Text>
            <Text style={[styles.balanceValue, { color: colors.text }, getTextStyle(undefined, 'displayBold', 'center')]}>
              {tokens}
            </Text>
          </View>

          <Button
            title={t('play.startNewGame')}
            onPress={() => {
              resetSession();
              ensureDraft();
              router.push('/(app)/play/mode');
            }}
          />

          {canResume ? (
            <Button
              title={t('play.resumeCurrentMatch')}
              variant="secondary"
              onPress={() => router.push(getResumePath(session?.step))}
            />
          ) : null}
        </View>

        <View style={[styles.bodyCol, styles.supportingActions]}>
        <Link href="/how-to-play" asChild>
          <Pressable
            style={({ pressed }) => [
              styles.linkCard,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
              },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.linkTitle, { color: colors.text }, getTextStyle(undefined, 'bodyBold', 'start')]}>
              {t('play.howToPlayTitle')}
            </Text>
            <Text style={[styles.linkCopy, { color: colors.textSecondary }, getTextStyle()]}>
              {t('play.howToPlayDescription')}
            </Text>
          </Pressable>
        </Link>

        <Pressable
          style={({ pressed }) => [
            styles.linkCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
            pressed && styles.pressed,
          ]}
          onPress={() => router.push('/(app)/store')}
        >
          <Text style={[styles.linkTitle, { color: colors.text }, getTextStyle(undefined, 'bodyBold', 'start')]}>
            {t('play.getMoreTokensTitle')}
          </Text>
          <Text style={[styles.linkCopy, { color: colors.textSecondary }, getTextStyle()]}>
            {t('play.getMoreTokensDescription')}
          </Text>
        </Pressable>
        </View>
      </View>
    </PlayScaffold>
  );
}

const styles = StyleSheet.create({
  bodyRow: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.md,
    minHeight: 0,
    minWidth: 0,
  },
  bodyCol: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.sm,
    justifyContent: 'center',
  },
  balanceCard: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  balanceLabel: {
    fontSize: FONT_SIZES.sm,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 40,
    lineHeight: 44,
    fontFamily: FONTS.displayBold,
  },
  supportingActions: {
    gap: SPACING.md,
  },
  linkCard: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    minHeight: 88,
    justifyContent: 'center',
  },
  linkTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    marginBottom: 6,
  },
  linkCopy: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.8,
  },
});
