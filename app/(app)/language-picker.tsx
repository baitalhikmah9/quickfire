import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BORDER_RADIUS, FONT_SIZES, SPACING } from '@/constants';
import { useI18n } from '@/lib/i18n/useI18n';
import { SUPPORTED_LOCALES } from '@/lib/i18n/config';
import { getChevronName } from '@/lib/i18n/direction';
import { useTheme } from '@/lib/hooks/useTheme';
import { useLocaleStore } from '@/store/locale';

export default function LanguagePickerScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { direction, getLocaleName, getTextStyle, t } = useI18n();
  const uiLocale = useLocaleStore((state) => state.uiLocale);
  const setUiLocale = useLocaleStore((state) => state.setUiLocale);

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
          {t('settings.appLanguageTitle')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
        <Text
          style={[
            styles.description,
            { color: colors.textSecondaryOnBackground },
            getTextStyle(),
          ]}
        >
          {t('settings.appLanguageDescription')}
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          contentContainerStyle={styles.localeRow}
        >
          {SUPPORTED_LOCALES.map((locale) => {
            const selected = locale === uiLocale;

            return (
              <Pressable
                key={locale}
                style={[
                  styles.row,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setUiLocale(locale)}
              >
                <View style={styles.labelBlock}>
                  <Text style={[styles.primaryLabel, { color: colors.text }, getTextStyle(locale, 'bodySemibold', 'start')]}>
                    {getLocaleName(locale, 'native')}
                  </Text>
                  <Text style={[styles.secondaryLabel, { color: colors.textSecondary }, getTextStyle(undefined)]}>
                    {getLocaleName(locale, 'english')}
                  </Text>
                </View>
                {selected ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                ) : (
                  <Ionicons name={getChevronName(direction)} size={18} color={colors.textSecondary} />
                )}
              </Pressable>
            );
          })}
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
  body: {
    flex: 1,
    padding: SPACING.lg,
    gap: SPACING.md,
    minHeight: 0,
  },
  description: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
    maxWidth: 420,
  },
  localeRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  row: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    width: 220,
    flexShrink: 0,
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
});

