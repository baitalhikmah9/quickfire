import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BORDER_RADIUS, FONT_SIZES, SPACING } from '@/constants';
import {
  SUPPORTED_LOCALES,
  contentLocalePriorityToArray,
  isNonEnglishContentLocale,
  type NonEnglishContentLocale,
} from '@/lib/i18n/config';
import { getChevronName } from '@/lib/i18n/direction';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';
import { useLocaleStore } from '@/store/locale';

const SELECTABLE_CONTENT_LOCALES = SUPPORTED_LOCALES.filter((locale) =>
  isNonEnglishContentLocale(locale)
);

export default function ContentLanguagesPickerScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { direction, getLocaleName, getTextStyle, t } = useI18n();
  const contentLocales = useLocaleStore((state) => state.contentLocales);
  const setContentLocales = useLocaleStore((state) => state.setContentLocales);
  const moveContentLocale = useLocaleStore((state) => state.moveContentLocale);
  const selected = contentLocalePriorityToArray(contentLocales);

  const toggleLocale = (locale: NonEnglishContentLocale) => {
    if (selected.includes(locale)) {
      setContentLocales(selected.filter((value) => value !== locale));
      return;
    }

    if (selected.length >= 3) {
      return;
    }

    setContentLocales([...selected, locale]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background, flex: 1 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.closeText, { color: colors.textOnBackground }, getTextStyle()]}>
            {t('common.close')}
          </Text>
        </Pressable>
        <Text
          style={[
            styles.title,
            { color: colors.textOnBackground },
            getTextStyle(undefined, 'display', 'center'),
          ]}
        >
          {t('settings.triviaLanguagesTitle')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
        <View style={styles.introRow}>
          <Text
            style={[
              styles.description,
              { color: colors.textSecondaryOnBackground },
              getTextStyle(),
            ]}
          >
            {t('settings.triviaLanguagesDescription')}
          </Text>
          <View style={[styles.noteCard, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}22` }]}>
            <Text style={[styles.noteText, { color: colors.text }, getTextStyle()]}>
              {t('settings.triviaLanguageHelp')}
            </Text>
          </View>
        </View>

        {selected.length === 0 ? (
          <Text
            style={[
              styles.emptyText,
              { color: colors.textSecondaryOnBackground },
              getTextStyle(),
            ]}
          >
            {t('settings.noneSelected')}
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            contentContainerStyle={styles.pickScroller}
          >
            {selected.map((locale, index) => (
              <View
                key={locale}
                style={[
                  styles.selectedRow,
                  styles.pickCard,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.primary,
                  },
                ]}
              >
                <View style={styles.labelBlock}>
                  <Text style={[styles.primaryLabel, { color: colors.text }, getTextStyle(locale, 'bodySemibold', 'start')]}>
                    {getLocaleName(locale, 'native')}
                  </Text>
                  <Text style={[styles.secondaryLabel, { color: colors.textSecondary }, getTextStyle()]}>
                    {t('common.priorityLabel', { count: index + 1 })}
                  </Text>
                </View>
                <View style={styles.priorityActions}>
                  <Pressable
                    onPress={() => index > 0 && moveContentLocale(index as 0 | 1 | 2, (index - 1) as 0 | 1 | 2)}
                    disabled={index === 0}
                  >
                    <Ionicons name="arrow-up" size={18} color={index === 0 ? colors.disabled : colors.textSecondary} />
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      index < selected.length - 1 &&
                      moveContentLocale(index as 0 | 1 | 2, (index + 1) as 0 | 1 | 2)
                    }
                    disabled={index === selected.length - 1}
                  >
                    <Ionicons
                      name="arrow-down"
                      size={18}
                      color={index === selected.length - 1 ? colors.disabled : colors.textSecondary}
                    />
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.sectionHeader}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.textOnBackground },
              getTextStyle(undefined, 'bodySemibold', 'start'),
            ]}
          >
            {t('common.languages')}
          </Text>
          <Text
            style={[
              styles.sectionMeta,
              { color: colors.textSecondaryOnBackground },
              getTextStyle(),
            ]}
          >
            {selected.length}/3
          </Text>
        </View>

        <ScrollView
          horizontal
          style={styles.localeScroller}
          showsHorizontalScrollIndicator
          contentContainerStyle={styles.pickScroller}
        >
          {SELECTABLE_CONTENT_LOCALES.map((locale) => {
            const isSelected = selected.includes(locale);
            const disabled = !isSelected && selected.length >= 3;

            return (
              <Pressable
                key={locale}
                style={[
                  styles.row,
                  styles.pickCard,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: isSelected ? colors.primary : colors.border,
                    opacity: disabled ? 0.5 : 1,
                  },
                ]}
                onPress={() => toggleLocale(locale)}
                disabled={disabled}
              >
                <View style={styles.labelBlock}>
                  <Text style={[styles.primaryLabel, { color: colors.text }, getTextStyle(locale, 'bodySemibold', 'start')]}>
                    {getLocaleName(locale, 'native')}
                  </Text>
                  <Text style={[styles.secondaryLabel, { color: colors.textSecondary }, getTextStyle()]}>
                    {getLocaleName(locale, 'english')}
                  </Text>
                </View>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                ) : (
                  <Ionicons name={getChevronName(direction)} size={18} color={colors.textSecondary} />
                )}
              </Pressable>
            );
          })}

          <View
            style={[
              styles.row,
              styles.pickCard,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
                opacity: 0.8,
              },
            ]}
          >
            <View style={styles.labelBlock}>
              <Text style={[styles.primaryLabel, { color: colors.text }, getTextStyle(undefined, 'bodySemibold', 'start')]}>
                {t('common.english')}
              </Text>
              <Text style={[styles.secondaryLabel, { color: colors.textSecondary }, getTextStyle()]}>
                {t('settings.englishFallback')}
              </Text>
            </View>
            <Ionicons name="lock-closed" size={18} color={colors.textSecondary} />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    minHeight: 0,
  },
  body: {
    flex: 1,
    padding: SPACING.lg,
    gap: SPACING.md,
    minHeight: 0,
  },
  introRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'stretch',
  },
  pickScroller: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  localeScroller: {
    flex: 1,
    minHeight: 0,
  },
  pickCard: {
    width: 220,
    flexShrink: 0,
  },
  header: {
    minHeight: 56,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerSpacer: {
    width: 48,
  },
  closeText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
  },
  description: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
    minWidth: 0,
  },
  noteCard: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  noteText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  sectionMeta: {
    fontSize: FONT_SIZES.sm,
  },
  row: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  selectedRow: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  labelBlock: {
    flex: 1,
  },
  primaryLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    marginBottom: 4,
  },
  secondaryLabel: {
    fontSize: FONT_SIZES.sm,
  },
  priorityActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
});
