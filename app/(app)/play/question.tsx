import { useEffect, useMemo, useState } from 'react';
import { Alert, View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { BORDER_RADIUS, FONT_SIZES, SPACING, FONTS, SHADOWS } from '@/constants';
import { PlayScaffold } from '@/features/play/components/PlayScaffold';
import { getRowDirection } from '@/lib/i18n/direction';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';
import { usePlayStore } from '@/store/play';

function getQuestionLayoutDensity(screenWidth: number, screenHeight: number) {
  const shortSide = Math.min(screenWidth, screenHeight);
  /** Ultra-compact phones / split-screen */
  if (shortSide < 340) {
    return {
      borderWidth: 1,
      metaIconSize: 15,
      timerDigitsSize: 14,
      pointsValueSize: 15,
      questionFontSize: FONT_SIZES.sm,
      questionLineHeight: 18,
      railPadV: SPACING.xs,
      segmentPadH: SPACING.xs,
      promptPadV: SPACING.sm,
      promptPadH: SPACING.sm,
    };
  }
  if (screenHeight < 400) {
    return {
      borderWidth: 1,
      metaIconSize: Math.min(18, screenWidth < 380 ? 16 : 18),
      timerDigitsSize: 16,
      pointsValueSize: 17,
      questionFontSize: FONT_SIZES.md,
      questionLineHeight: 22,
      railPadV: SPACING.sm,
      segmentPadH: screenWidth < 400 ? SPACING.sm : SPACING.md,
      promptPadV: SPACING.md,
      promptPadH: SPACING.md,
    };
  }
  if (screenHeight < 520) {
    return {
      borderWidth: 1,
      metaIconSize: Math.min(20, screenWidth < 400 ? 18 : 20),
      timerDigitsSize: 18,
      pointsValueSize: 20,
      questionFontSize: FONT_SIZES.lg,
      questionLineHeight: 26,
      railPadV: SPACING.md,
      segmentPadH: screenWidth < 400 ? SPACING.sm : SPACING.md,
      promptPadV: SPACING.lg,
      promptPadH: SPACING.lg,
    };
  }
  return {
    borderWidth: 2,
    metaIconSize: 22,
    timerDigitsSize: 21,
    pointsValueSize: 23,
    questionFontSize: FONT_SIZES.xl,
    questionLineHeight: 30,
    railPadV: SPACING.md,
    segmentPadH: SPACING.md,
    promptPadV: SPACING.lg,
    promptPadH: SPACING.lg,
  };
}

export default function PlayQuestionScreen() {
  const router = useRouter();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const { direction, getLocaleName, getTextStyle, t } = useI18n();
  const session = usePlayStore((state) => state.session);
  const revealAnswer = usePlayStore((state) => state.revealAnswer);
  const resetSession = usePlayStore((state) => state.resetSession);
  const [seconds, setSeconds] = useState(0);

  const density = useMemo(
    () => getQuestionLayoutDensity(windowWidth, windowHeight),
    [windowWidth, windowHeight]
  );
  const chromeGap =
    Math.min(windowWidth, windowHeight) < 420 ? SPACING.sm : SPACING.lg;
  const rowDir = getRowDirection(direction);
  const metaPillDir = getRowDirection(direction);
  const questionScrollBottomInset = 56 + SPACING.md * 2 + Math.max(insets.bottom, SPACING.sm);

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

  const q = session.currentQuestion;
  const showLanguageBadge =
    q.resolvedFromFallback || q.locale !== session.contentLocaleChain[0];

  const timeStr = `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  return (
    <PlayScaffold
      title={q.categoryName}
      bodyScrollEnabled={false}
      bodyFrame={false}
      bodyEdgeToEdge
      onBack={() =>
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
        ])
      }
    >
      <View style={styles.bleed}>
        <View style={styles.shell}>
          <View
            style={[
              styles.shellInner,
              {
                paddingLeft: Math.max(SPACING.md, insets.left),
                paddingRight: Math.max(SPACING.md, insets.right),
              },
            ]}
          >
          <ScrollView
            style={styles.mainScroll}
            contentContainerStyle={[
              styles.mainScrollContent,
              {
                paddingBottom: questionScrollBottomInset,
                gap: chromeGap,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
            nestedScrollEnabled
          >
            <View style={styles.topZone}>
            <View
              style={[
                styles.statusRail,
                {
                  flexDirection: rowDir,
                  borderColor: colors.border,
                  borderWidth: density.borderWidth,
                  backgroundColor: colors.cardBackground,
                },
              ]}
            >
              <View
                style={[
                  styles.statusSegment,
                  {
                    flexDirection: metaPillDir,
                    paddingVertical: density.railPadV,
                    paddingHorizontal: density.segmentPadH,
                  },
                ]}
              >
                <Ionicons name="time-outline" size={density.metaIconSize} color={colors.primary} />
                <View style={styles.statusTextBlock}>
                  <Text
                    style={[styles.statusEyebrow, { color: colors.textSecondary }, getTextStyle()]}
                    numberOfLines={1}
                  >
                    {t('play.questionTimer')}
                  </Text>
                  <Text
                    style={[
                      styles.timerDigits,
                      {
                        color: colors.text,
                        fontSize: density.timerDigitsSize,
                        lineHeight: density.timerDigitsSize + 4,
                      },
                      getTextStyle(undefined, 'displayBold', 'start'),
                    ]}
                  >
                    {timeStr}
                  </Text>
                </View>
              </View>

              <View style={[styles.statusDivider, { backgroundColor: colors.border }]} />

              <View
                style={[
                  styles.statusSegment,
                  {
                    flexDirection: metaPillDir,
                    paddingVertical: density.railPadV,
                    paddingHorizontal: density.segmentPadH,
                    backgroundColor: colors.primary,
                  },
                ]}
              >
                <Ionicons name="ribbon-outline" size={density.metaIconSize} color="#FFFFFF" />
                <Text
                  style={[
                    styles.pointsValue,
                    {
                      fontSize: density.pointsValueSize,
                      lineHeight: density.pointsValueSize + 4,
                    },
                    getTextStyle(undefined, 'displayBold', 'start'),
                  ]}
                  accessibilityLabel={t('common.points', { count: q.pointValue })}
                >
                  {q.pointValue}
                </Text>
              </View>
            </View>

            {showLanguageBadge ? (
              <View
                style={[
                  styles.languageChip,
                  {
                    flexDirection: metaPillDir,
                    borderColor: `${colors.secondary}55`,
                    backgroundColor: `${colors.secondary}10`,
                    borderWidth: density.borderWidth,
                  },
                ]}
              >
                <Ionicons name="language-outline" size={15} color={colors.secondary} />
                <Text style={[styles.languageChipText, { color: colors.textSecondary }, getTextStyle()]} numberOfLines={1}>
                  {t('play.questionLanguage')}:{' '}
                  <Text style={[styles.languageChipLocale, { color: colors.text }, getTextStyle(q.locale, 'bodySemibold')]}>
                    {getLocaleName(q.locale, 'english')}
                  </Text>
                </Text>
              </View>
            ) : null}
            </View>

            <View
              style={[
                styles.promptCard,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                  borderWidth: density.borderWidth,
                  shadowColor: colors.primary,
                  paddingVertical: density.promptPadV,
                  paddingHorizontal: density.promptPadH,
                },
              ]}
            >
              <Text
                style={[
                  styles.questionText,
                  {
                    color: colors.text,
                    fontSize: density.questionFontSize,
                    lineHeight: density.questionLineHeight,
                  },
                  getTextStyle(q.locale, 'bodySemibold', 'center'),
                ]}
                maxFontSizeMultiplier={1.25}
              >
                {q.prompt}
              </Text>
            </View>
          </ScrollView>
          <View
            pointerEvents="box-none"
            style={[
              styles.answerOverlay,
              {
                paddingBottom: Math.max(insets.bottom, SPACING.sm),
                backgroundColor: colors.background,
              },
            ]}
          >
            <Button
              title={t('play.showAnswer')}
              style={styles.answerOverlayButton}
              onPress={() => {
                revealAnswer();
                router.replace('/(app)/play/answer');
              }}
            />
          </View>
          </View>
        </View>
      </View>
    </PlayScaffold>
  );
}

const styles = StyleSheet.create({
  bleed: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    position: 'relative',
    overflow: 'hidden',
  },
  shell: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
    paddingTop: SPACING.sm,
    paddingBottom: 0,
  },
  /** Padded column so ScrollView and bottom overlay share the same width as `promptCard`. */
  shellInner: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    position: 'relative',
  },
  mainScroll: {
    flex: 1,
    minHeight: 0,
  },
  mainScrollContent: {
    flexGrow: 1,
    paddingTop: SPACING.xs,
  },
  topZone: {
    alignSelf: 'stretch',
    gap: SPACING.sm,
  },
  statusRail: {
    width: '100%',
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    alignItems: 'stretch',
  },
  statusSegment: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  statusDivider: {
    width: StyleSheet.hairlineWidth * 2,
    minWidth: 1,
    alignSelf: 'stretch',
  },
  statusTextBlock: {
    minWidth: 0,
    flexShrink: 1,
  },
  statusEyebrow: {
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  timerDigits: {
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
    fontVariant: 'tabular-nums',
  },
  pointsValue: {
    color: '#FFFFFF',
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
    fontVariant: 'tabular-nums',
    flexShrink: 0,
  },
  languageChip: {
    alignSelf: 'center',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.pill,
  },
  languageChipText: {
    flex: 1,
    minWidth: 0,
    fontSize: FONT_SIZES.xs,
    lineHeight: 18,
  },
  languageChipLocale: {
    fontSize: FONT_SIZES.xs,
  },
  promptCard: {
    borderRadius: BORDER_RADIUS.xl,
    alignSelf: 'stretch',
    ...SHADOWS.card,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  questionText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  answerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: SPACING.md,
    alignItems: 'stretch',
  },
  answerOverlayButton: {
    alignSelf: 'stretch',
    width: '100%',
  },
});
