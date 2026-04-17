import { useEffect, useMemo, useState } from 'react';
import { Alert, View, Text, StyleSheet, useWindowDimensions, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Pressable } from '@/components/ui/Pressable';
import { SPACING, FONTS } from '@/constants';
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
  const m = tier === 'hero' ? { h: 8, el: 10 } : { h: 4, el: 4 };
  return {
    shadowColor: BRAND.shadowStrong,
    shadowOffset: { width: 0, height: m.h },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: m.el,
  };
}

export default function PlayQuestionScreen() {
  const router = useRouter();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { direction, getTextStyle, t } = useI18n();
  const session = usePlayStore((state) => state.session);
  const revealAnswer = usePlayStore((state) => state.revealAnswer);
  const resetSession = usePlayStore((state) => state.resetSession);
  const [seconds, setSeconds] = useState(0);

  const currentTeam = useMemo(() => {
    return session?.teams.find((t) => t.id === session.currentTeamId);
  }, [session?.teams, session?.currentTeamId]);

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
  const timeStr = `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  const handleBack = () => {
    Alert.alert(t('play.leaveMatchTitle'), t('play.leaveMatchBody'), [
      { text: t('common.stay'), style: 'cancel' },
      {
        text: t('common.leave'),
        style: 'destructive',
        onPress: () => {
          resetSession();
          router.replace('/(app)/');
        },
      },
    ]);
  };

  /** Center weighted landscape layout */
  const isLandscape = windowWidth > windowHeight;
  const contentWidth = isLandscape ? '70%' : '90%';

  return (
    <View style={styles.canvas}>
      {/* Header Info: [Team], Topic, Points */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, SPACING.md) }]}>
        <Text style={[styles.teamTag, { color: BRAND.charcoal }]}>
          {`[${currentTeam?.name || 'TEAM'}]`.toUpperCase()}
        </Text>
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
        <View style={[styles.questionBox, { width: contentWidth }]}>
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
            styles.plasticFace,
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

      {/* Back Button (Floating or Invisible area for ease of use) */}
      <Pressable
        onPress={handleBack}
        style={[
          styles.backCircle,
          { top: Math.max(insets.top, SPACING.md), left: Math.max(insets.left, SPACING.md) },
        ]}
      />
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
  teamTag: {
    fontFamily: FONTS.uiBold,
    fontSize: 14,
    letterSpacing: 1.5,
    opacity: 0.8,
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
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  questionBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionText: {
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '500',
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
  plasticFace: {
    borderTopWidth: 2,
    borderTopColor: 'rgba(255, 255, 255, 0.8)',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  answerButtonText: {
    fontFamily: FONTS.uiBold,
    fontSize: 15,
    letterSpacing: 1.2,
  },
  backCircle: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    zIndex: 30,
  },
});

