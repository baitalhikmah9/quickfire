import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from '@/components/ui/Pressable';
import { useRouter } from 'expo-router';
import { BORDER_RADIUS, FONT_SIZES, SPACING, FONTS } from '@/constants';
import { PlayScaffold } from '@/features/play/components/PlayScaffold';
import { SOFT_SURFACE_STYLES } from '@/features/play/styles/softSurface';
import { QUICK_PLAY_TOPIC_OPTIONS } from '@/features/play/tokenCosts';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';
import { usePlayStore } from '@/store/play';

const QUICK_LENGTH_LABEL_KEYS = {
  3: 'play.quickLength.option3',
  4: 'play.quickLength.option4',
  5: 'play.quickLength.option5',
} as const;

const QUICK_LENGTH_COPY_KEYS = {
  3: 'play.quickLength.option3Copy',
  4: 'play.quickLength.option4Copy',
  5: 'play.quickLength.option5Copy',
} as const;

export default function QuickLengthScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const compact = windowHeight < 720;
  const { getTextStyle, t } = useI18n();
  const setQuickPlayTopicCount = usePlayStore((state) => state.setQuickPlayTopicCount);
  const tokensText = t('common.tokens');
  const tokenLabel = tokensText.toUpperCase();
  const options = QUICK_PLAY_TOPIC_OPTIONS.map(({ topicCount, tokenCost }) => ({
    count: topicCount,
    tokenCost,
    label: t(QUICK_LENGTH_LABEL_KEYS[topicCount]),
    copy: t(QUICK_LENGTH_COPY_KEYS[topicCount]),
  }));

  return (
    <PlayScaffold
      title={t('play.quickLengthTitle')}
      subtitle={t('play.quickLengthSubtitle')}
      bodyScrollEnabled={false}
    >
      {options.map((option) => (
        <Pressable
          key={option.count}
          style={({ pressed }) => [
            styles.optionCard,
            compact ? styles.optionCardCompact : null,
            SOFT_SURFACE_STYLES.face,
            SOFT_SURFACE_STYLES.raised,
            {
              backgroundColor: colors.cardBackground,
              borderColor: 'transparent',
            },
            pressed && styles.pressed,
          ]}
          onPress={() => {
            setQuickPlayTopicCount(option.count);
            router.push('/play/team-setup');
          }}
          accessibilityRole="button"
          accessibilityLabel={`${option.label}, ${option.tokenCost} ${tokensText.toLowerCase()}`}
        >
          <Text
            style={[
              styles.optionTitle,
              compact && styles.optionTitleCompact,
              { color: colors.text },
              getTextStyle(undefined, 'displayBold', 'start'),
            ]}
          >
            {option.label}
          </Text>
          <View style={styles.tokenCostRow}>
            <Ionicons name="diamond" size={compact ? 11 : 13} color={colors.text} />
            <Text
              testID={`quick-length-token-cost-${option.count}`}
              style={[
                styles.tokenCostText,
                compact && styles.tokenCostTextCompact,
                { color: colors.text },
                getTextStyle(undefined, 'bodyBold', 'start'),
              ]}
            >
              {`${option.tokenCost} ${tokenLabel}`}
            </Text>
          </View>
          <Text
            style={[
              styles.optionCopy,
              compact && styles.optionCopyCompact,
              { color: colors.textSecondary },
              getTextStyle(),
            ]}
          >
            {option.copy}
          </Text>
        </Pressable>
      ))}
    </PlayScaffold>
  );
}

const styles = StyleSheet.create({
  optionCard: {
    borderWidth: 0,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    justifyContent: 'center',
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
  optionCardCompact: {
    padding: SPACING.sm,
  },
  optionTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: FONTS.displayBold,
    marginBottom: SPACING.xs,
  },
  optionTitleCompact: {
    fontSize: 17,
    lineHeight: 22,
    marginBottom: 2,
  },
  tokenCostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: SPACING.xs,
  },
  tokenCostText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FONTS.uiBold,
    letterSpacing: 0.6,
  },
  tokenCostTextCompact: {
    fontSize: 10,
    lineHeight: 13,
  },
  optionCopy: {
    fontSize: FONT_SIZES.md,
    lineHeight: 22,
  },
  optionCopyCompact: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.82,
  },
});
