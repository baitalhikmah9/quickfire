import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Pressable } from '@/components/ui/Pressable';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, FONTS } from '@/constants';
import { SOFT_SURFACE_STYLES } from '@/features/play/styles/softSurface';
import { getLocaleLabel } from '@/lib/i18n/config';
import { useI18n } from '@/lib/i18n/useI18n';
import { usePlayStore } from '@/store/play';

/** Brand colors from docs/BRAND_GUIDELINES.md */
const BRAND = {
  canvas: '#FAF9F6',
  surface: '#FFFFFF',
  charcoal: '#333333',
  amber: '#FFB347',
  shadowStrong: 'rgba(51, 51, 51, 0.15)',
};

/** Deeper solid depth - matches extruded raised plastic pattern. */
function neumorphicLift3D(tier: 'hero' | 'pill'): ViewStyle {
  return SOFT_SURFACE_STYLES.raised;
}

const RUMBLE_REVEAL_SECONDS = 30;
const RUMBLE_SECOND_WINDOW_SECONDS = 45;

export default function PlayQuestionScreen() {
  const router = useRouter();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { getTextStyle, t } = useI18n();
  const session = usePlayStore((state) => state.session);
  const cancelCurrentQuestion = usePlayStore((state) => state.cancelCurrentQuestion);
  const revealAnswer = usePlayStore((state) => state.revealAnswer);
  const [seconds, setSeconds] = useState(0);

  const currentTeam = useMemo(() => {
    return session?.teams.find((t) => t.id === session.currentTeamId);
  }, [session?.teams, session?.currentTeamId]);

  const rumbleFirstTeam = useMemo(() => {
    const teamId = session?.currentQuestion?.rumbleFirstTeamId;
    return session?.teams.find((team) => team.id === teamId);
  }, [session?.currentQuestion?.rumbleFirstTeamId, session?.teams]);

  const rumbleSecondTeam = useMemo(() => {
    const teamId = session?.currentQuestion?.rumbleSecondTeamId;
    return session?.teams.find((team) => team.id === teamId);
  }, [session?.currentQuestion?.rumbleSecondTeamId, session?.teams]);

  useEffect(() => {
    if (!session?.timerStartedAt) return;
    const update = () =>
      setSeconds(Math.max(0, Math.floor((Date.now() - session.timerStartedAt!) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [session?.timerStartedAt]);

  useEffect(() => {
    if (session?.step === 'answer') {
      router.replace('/play/answer');
    } else if (!session?.currentQuestion) {
      router.replace('/play/board');
    }
  }, [router, session?.currentQuestion, session?.step]);

  if (!session?.currentQuestion) {
    return (
      <View style={[styles.canvas, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: BRAND.charcoal }}>{t('common.loading')}</Text>
      </View>
    );
  }

  const q = session.currentQuestion;
  const hotSeatChallenge = session.hotSeat?.activeChallenge;
  const timeStr = `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  /** Center weighted landscape layout */
  const isLandscape = windowWidth > windowHeight;
  const contentWidth = isLandscape ? '70%' : '90%';
  const isRumbleQuestion = session.mode === 'rumble';
  const questionLanguageLabel = `${t('play.questionLanguage')}: ${getLocaleLabel(
    q.locale,
    'both'
  )}`;
  const visibleRumbleTeams =
    seconds >= RUMBLE_SECOND_WINDOW_SECONDS
      ? [rumbleFirstTeam, rumbleSecondTeam].filter(Boolean)
      : seconds >= RUMBLE_REVEAL_SECONDS
        ? [rumbleFirstTeam].filter(Boolean)
        : [];
  const rumbleStatus =
    !isRumbleQuestion
      ? null
      : seconds < RUMBLE_REVEAL_SECONDS
        ? t('play.rumbleWaiting')
        : seconds < RUMBLE_SECOND_WINDOW_SECONDS
          ? t('play.rumbleFirstWindow', {
              team: rumbleFirstTeam?.name ?? currentTeam?.name ?? 'Team',
            })
          : t('play.rumbleSecondWindow', {
              team: rumbleSecondTeam?.name ?? 'Next team',
            });
  const hotSeatNames = hotSeatChallenge?.participants
    .map((participant) => participant.playerName)
    .join(' vs ');

  return (
    <View style={styles.canvas}>
      {/* Header Info: [Team], Topic, Points */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, SPACING.md) }]}>
        <Pressable
          onPress={() => {
            cancelCurrentQuestion();
            router.replace('/play/board');
          }}
          accessibilityRole="button"
          accessibilityLabel="Back to question board"
          style={({ pressed }) => [
            styles.backButton,
            SOFT_SURFACE_STYLES.face,
            SOFT_SURFACE_STYLES.raised,
            {
              left: Math.max(insets.left + SPACING.sm, SPACING.xl),
              opacity: pressed ? 0.88 : 1,
            },
          ]}
        >
          <Ionicons name="chevron-back" size={18} color={BRAND.charcoal} />
          <Text style={styles.backButtonText}>{t('common.back')}</Text>
        </Pressable>
        {isRumbleQuestion ? (
          <View style={styles.rumbleTeamWrap}>
            {visibleRumbleTeams.map((team) => (
              <Text key={team!.id} style={[styles.teamTag, { color: BRAND.charcoal }]}>
                {`[${team!.name}]`.toUpperCase()}
              </Text>
            ))}
            {rumbleStatus ? (
              <Text style={[styles.rumbleStatus, { color: BRAND.charcoal }]}>
                {rumbleStatus.toUpperCase()}
              </Text>
            ) : null}
          </View>
        ) : (
          <Text style={[styles.teamTag, { color: BRAND.charcoal }]}>
            {`[${currentTeam?.name || 'TEAM'}]`.toUpperCase()}
          </Text>
        )}
        {hotSeatNames ? (
          <View style={styles.hotSeatBanner}>
            <Text style={styles.hotSeatTitle}>{t('play.hotSeatActiveTitle').toUpperCase()}</Text>
            <Text style={styles.hotSeatNames}>{hotSeatNames}</Text>
          </View>
        ) : null}
        <Text style={[styles.topicText, { color: BRAND.charcoal }]}>
          {`Topic: ${q.categoryName}`.toUpperCase()}
        </Text>
        <Text style={[styles.pointsText, { color: BRAND.charcoal + '88' }]}>
          {`Points: ${q.pointValue}`}
        </Text>
      </View>

      {/* Circular Timer (Top-Right) */}
      <View
        style={[
          styles.timerContainer,
          {
            top: Math.max(insets.top, SPACING.md),
            right: Math.max(insets.right, SPACING.md),
          },
        ]}
      >
        <View style={styles.timerRing}>
          <Text style={[styles.timerValue, { color: BRAND.charcoal }]}>{timeStr}</Text>
        </View>
      </View>

      {/* Main Question Display */}
      <View style={styles.contentArea}>
        <ScrollView
          testID="question-content-scroll"
          style={[styles.questionScroll, { width: contentWidth }]}
          contentContainerStyle={styles.questionScrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.questionBox}>
            <View
              testID="question-language-chip"
              style={[styles.languageChip, SOFT_SURFACE_STYLES.face, SOFT_SURFACE_STYLES.raised]}
            >
              <Text style={styles.languageChipText}>{questionLanguageLabel}</Text>
            </View>
            {q.promptImageUrl ? (
              <Image
                testID="question-prompt-image"
                source={{ uri: q.promptImageUrl }}
                style={styles.promptImage}
                contentFit="contain"
              />
            ) : null}
            <Text
              style={[
                styles.questionText,
                { color: BRAND.charcoal },
                getTextStyle(q.locale, 'display', 'center'),
              ]}
            >
              {q.prompt}
            </Text>
          </View>
        </ScrollView>
      </View>

      {/* Action Footer: Show Answer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
        <Pressable
          onPress={() => {
            revealAnswer();
            router.replace('/play/answer');
          }}
          style={({ pressed }) => [
            styles.answerButton,
            SOFT_SURFACE_STYLES.face,
            {
              backgroundColor: BRAND.surface,
              transform: [{ scale: pressed ? 0.98 : 1 }],
              opacity: pressed ? 0.95 : 1,
            },
            neumorphicLift3D('pill'),
          ]}
        >
          <Text style={[styles.answerButtonText, { color: BRAND.charcoal }]}>
            {t('play.showAnswer').toUpperCase()}
          </Text>
        </Pressable>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: BRAND.canvas,
    position: 'relative',
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: SPACING.xl,
    gap: 2,
    zIndex: 10,
  },
  backButton: {
    position: 'absolute',
    left: SPACING.lg,
    top: '50%',
    marginTop: -20,
    height: 40,
    borderRadius: 14,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
    backgroundColor: '#FFFFFF',
  },
  backButtonText: {
    fontFamily: FONTS.uiBold,
    fontSize: 13,
    color: BRAND.charcoal,
  },
  teamTag: {
    fontFamily: FONTS.uiBold,
    fontSize: 14,
    letterSpacing: 1.5,
    opacity: 0.8,
  },
  rumbleTeamWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 34,
  },
  rumbleStatus: {
    fontFamily: FONTS.uiBold,
    fontSize: 11,
    letterSpacing: 0.8,
    opacity: 0.7,
    textAlign: 'center',
  },
  hotSeatBanner: {
    marginTop: SPACING.xs,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    ...SOFT_SURFACE_STYLES.face,
    ...SOFT_SURFACE_STYLES.raised,
  },
  hotSeatTitle: {
    fontFamily: FONTS.uiBold,
    fontSize: 10,
    color: BRAND.charcoal,
    letterSpacing: 1,
    opacity: 0.65,
  },
  hotSeatNames: {
    fontFamily: FONTS.displayBold,
    fontSize: 15,
    color: BRAND.charcoal,
    textAlign: 'center',
  },
  topicText: {
    fontFamily: FONTS.display,
    fontSize: 20,
    letterSpacing: 0.5,
  },
  pointsText: {
    fontFamily: FONTS.ui,
    fontSize: 16,
  },
  timerContainer: {
    position: 'absolute',
    width: 64,
    height: 64,
    zIndex: 20,
  },
  timerRing: {
    flex: 1,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: 'rgba(51, 51, 51, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  timerValue: {
    fontFamily: FONTS.uiBold,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  contentArea: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
  },
  questionScroll: {
    flexGrow: 0,
  },
  questionScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  questionBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  languageChip: {
    borderRadius: 999,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: BRAND.surface,
  },
  languageChipText: {
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    color: BRAND.charcoal,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  promptImage: {
    width: '100%',
    height: 200,
  },
  questionText: {
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '500',
    textAlign: 'center',
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: SPACING.xl,
    zIndex: 10,
  },
  answerButton: {
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 22,
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerButtonText: {
    fontFamily: FONTS.uiBold,
    fontSize: 15,
    letterSpacing: 1.2,
  },
});
