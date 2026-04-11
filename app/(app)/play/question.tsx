import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { BORDER_RADIUS, FONT_SIZES, SPACING, FONTS } from '@/constants';
import { getCategoryTopicIcon } from '@/features/play/categoryTopicIcon';
import { PlayScaffold } from '@/features/play/components/PlayScaffold';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';
import { usePlayStore } from '@/store/play';

export default function PlayQuestionScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { getLocaleName, getTextStyle, t } = useI18n();
  const session = usePlayStore((state) => state.session);
  const revealAnswer = usePlayStore((state) => state.revealAnswer);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!session?.timerStartedAt) return;
    const update = () => setSeconds(Math.max(0, Math.floor((Date.now() - session.timerStartedAt!) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [session?.timerStartedAt]);

  useEffect(() => {
    if (session?.step === 'answer') {
      router.replace('/(app)/play/answer');
    } else if (!session?.currentQuestion) {
      router.replace('/(app)/play/board');
    }
  }, [router, session?.currentQuestion, session?.step]);

  if (!session?.currentQuestion) {
    return <PlayScaffold title={t('common.loading')}><Text>{t('common.loading')}</Text></PlayScaffold>;
  }

  const topicIcon = getCategoryTopicIcon(session.currentQuestion.categoryId);

  return (
    <PlayScaffold
      title={session.currentQuestion.categoryName}
      subtitle={t('common.points', { count: session.currentQuestion.pointValue })}
      showHud
      session={session}
      footer={
        <Button
          title={t('play.showAnswer')}
          onPress={() => {
            revealAnswer();
            router.replace('/(app)/play/answer');
          }}
        />
      }
    >
      <View style={styles.questionRow}>
        <View style={styles.sideColumn}>
          <View
            style={[
              styles.timerCard,
              {
                backgroundColor: `${colors.primary}12`,
                borderColor: `${colors.primary}30`,
              },
            ]}
          >
            <Text style={[styles.timerLabel, { color: colors.textSecondary }, getTextStyle()]}>
              {t('play.questionTimer')}
            </Text>
            <Text style={[styles.timerValue, { color: colors.text }, getTextStyle(undefined, 'displayBold', 'center')]}>
              {Math.floor(seconds / 60)
                .toString()
                .padStart(2, '0')}
              :
              {(seconds % 60).toString().padStart(2, '0')}
            </Text>
          </View>
          {(session.currentQuestion.resolvedFromFallback ||
            session.currentQuestion.locale !== session.contentLocaleChain[0]) ? (
            <View style={[styles.languageBadge, { backgroundColor: `${colors.secondary}15`, borderColor: `${colors.secondary}25` }]}>
              <Text style={[styles.languageBadgeLabel, { color: colors.textSecondary }, getTextStyle()]}>
                {t('play.questionLanguage')}
              </Text>
              <Text
                style={[styles.languageBadgeValue, { color: colors.text }, getTextStyle(session.currentQuestion.locale, 'bodySemibold', 'center')]}
                numberOfLines={1}
              >
                {getLocaleName(session.currentQuestion.locale, 'english')}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.iconColumn}>
          <View style={[styles.topicIconRing, { borderColor: colors.primary, backgroundColor: `${colors.primary}10` }]}>
            <Ionicons name={topicIcon} size={40} color={colors.primary} />
          </View>
          <Text style={[styles.iconCaption, { color: colors.textSecondary }, getTextStyle()]} numberOfLines={2}>
            {session.currentQuestion.categoryName}
          </Text>
        </View>

        <View
          style={[
            styles.questionCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.questionText, { color: colors.text }, getTextStyle(session.currentQuestion.locale, 'bodySemibold', 'center')]}>
            {session.currentQuestion.prompt}
          </Text>
        </View>
      </View>
    </PlayScaffold>
  );
}

const styles = StyleSheet.create({
  questionRow: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.sm,
  },
  sideColumn: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'flex-start',
    gap: SPACING.sm,
  },
  iconColumn: {
    width: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  topicIconRing: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.pill,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCaption: {
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'center',
  },
  timerCard: {
    borderWidth: 2,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: FONT_SIZES.xs,
    marginBottom: 2,
  },
  timerValue: {
    fontSize: 22,
    lineHeight: 26,
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
  },
  questionCard: {
    flex: 1.35,
    minWidth: 0,
    borderWidth: 2,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    justifyContent: 'center',
  },
  questionText: {
    fontSize: FONT_SIZES.md,
    lineHeight: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  languageBadge: {
    borderWidth: 2,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    alignItems: 'center',
    gap: 2,
  },
  languageBadgeLabel: {
    fontSize: 9,
  },
  languageBadgeValue: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
});
