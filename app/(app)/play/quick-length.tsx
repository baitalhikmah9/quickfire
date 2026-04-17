import { Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { useRouter } from 'expo-router';
import { BORDER_RADIUS, FONT_SIZES, SPACING, FONTS } from '@/constants';
import { PlayScaffold } from '@/features/play/components/PlayScaffold';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';
import { usePlayStore } from '@/store/play';

export default function QuickLengthScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const compact = windowHeight < 720;
  const { getTextStyle, t } = useI18n();
  const setQuickPlayTopicCount = usePlayStore((state) => state.setQuickPlayTopicCount);
  const options = [
    { count: 2, label: t('play.quickLength.option2'), copy: t('play.quickLength.option2Copy') },
    { count: 3, label: t('play.quickLength.option3'), copy: t('play.quickLength.option3Copy') },
    { count: 4, label: t('play.quickLength.option4'), copy: t('play.quickLength.option4Copy') },
  ];

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
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
            pressed && styles.pressed,
          ]}
          onPress={() => {
            setQuickPlayTopicCount(option.count);
            router.push('/play/team-setup');
          }}
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
    borderWidth: 1,
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
