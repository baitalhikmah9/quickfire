import { Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { BORDER_RADIUS, FONT_SIZES, SPACING, FONTS } from '@/constants';
import { PlayScaffold } from '@/features/play/components/PlayScaffold';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';
import { usePlayStore } from '@/store/play';

export default function QuickLengthScreen() {
  const router = useRouter();
  const colors = useTheme();
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
    >
      {options.map((option) => (
        <Pressable
          key={option.count}
          style={({ pressed }) => [
            styles.optionCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
            pressed && styles.pressed,
          ]}
          onPress={() => {
            setQuickPlayTopicCount(option.count);
            router.push('/(app)/play/team-setup');
          }}
        >
          <Text style={[styles.optionTitle, { color: colors.text }, getTextStyle(undefined, 'displayBold', 'start')]}>
            {option.label}
          </Text>
          <Text style={[styles.optionCopy, { color: colors.textSecondary }, getTextStyle()]}>
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
    minHeight: 112,
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: FONTS.displayBold,
    marginBottom: SPACING.xs,
  },
  optionCopy: {
    fontSize: FONT_SIZES.md,
    lineHeight: 22,
  },
  pressed: {
    opacity: 0.82,
  },
});
