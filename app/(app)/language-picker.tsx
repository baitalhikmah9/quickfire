import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, FONTS } from '@/constants';
import { useI18n } from '@/lib/i18n/useI18n';
import { SUPPORTED_LOCALES } from '@/lib/i18n/config';
import { useLocaleStore } from '@/store/locale';
import { HOME_SOFT_UI } from '@/themes';

const T = HOME_SOFT_UI;

/** Raised plastic tile shadow tier. */
function neumorphicLift3D(shadowColor: string, tier: 'hero' | 'header' | 'pill' | 'card'): any {
  const m =
    tier === 'hero'
      ? { h: 10, r: 0, el: 12 }
      : tier === 'header'
      ? { h: 6, r: 0, el: 8 }
      : tier === 'card'
      ? { h: 8, r: 0, el: 10 }
      : { h: 4, r: 0, el: 4 };

  return {
    shadowColor: 'rgba(51, 51, 51, 0.15)',
    shadowOffset: { width: 0, height: m.h },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: m.el,
  };
}

export default function LanguagePickerScreen() {
  const router = useRouter();
  const { direction, getLocaleName, getTextStyle, t } = useI18n();
  const uiLocale = useLocaleStore((state) => state.uiLocale);
  const setUiLocale = useLocaleStore((state) => state.setUiLocale);

  const canvas = T.colors.canvas;
  const surface = T.colors.surface;
  const textPrimary = T.colors.textPrimary;
  const textMuted = T.colors.textMuted;
  const shadowHex = T.colors.shadowStrong;
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(app)/profile');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: canvas }]}>
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [
            styles.headerSquircleInner,
            styles.plasticFace,
            { backgroundColor: surface, opacity: pressed ? 0.94 : 1, transform: pressed ? [{ scale: 0.97 }] : [{ scale: 1 }] },
            neumorphicLift3D(shadowHex, 'header'),
          ]}
        >
          <Ionicons name={direction === 'rtl' ? 'chevron-forward' : 'chevron-back'} size={22} color={textPrimary} />
        </Pressable>
        <Text style={[styles.title, { color: textPrimary }]}>
          {t('settings.appLanguageTitle').toUpperCase()}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
        <Text
          style={[
            styles.description,
            { color: textMuted },
            getTextStyle(),
          ]}
        >
          {t('settings.appLanguageDescription')}
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.localeRow}
        >
          {SUPPORTED_LOCALES.map((locale) => {
            const selected = locale === uiLocale;

            return (
              <View key={locale} style={styles.rowWrapper}>
                {selected && <View style={styles.selectionGlow} />}
                <Pressable
                  style={({ pressed }) => [
                    styles.row,
                    styles.plasticFace,
                    {
                      backgroundColor: surface,
                      opacity: pressed ? 0.96 : 1,
                      transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
                    },
                    neumorphicLift3D(shadowHex, 'card'),
                    selected && styles.rowSelected,
                  ]}
                  onPress={() => setUiLocale(locale)}
                >
                  <View style={styles.labelBlock}>
                    <Text style={[styles.primaryLabel, { color: textPrimary }]}>
                      {getLocaleName(locale, 'native').toUpperCase()}
                    </Text>
                    <Text style={[styles.secondaryLabel, { color: textMuted }]}>
                      {getLocaleName(locale, 'english')}
                    </Text>
                  </View>
                  {selected ? (
                    <Ionicons name="checkmark-circle" size={24} color={textPrimary} />
                  ) : (
                   <View style={styles.unselectedIndicator} />
                  )}
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  plasticFace: {
    borderTopWidth: 2,
    borderTopColor: 'rgba(255, 255, 255, 0.78)',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    height: 72,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  headerSquircleInner: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  title: {
    fontSize: 20,
    fontFamily: FONTS.displayBold,
    letterSpacing: -0.5,
  },
  body: {
    flex: 1,
    padding: SPACING.lg,
    gap: SPACING.xl,
    justifyContent: 'center',
  },
  description: {
    fontSize: 15,
    fontFamily: FONTS.ui,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 420,
    alignSelf: 'center',
  },
  localeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xl,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xl,
  },
  rowWrapper: {
    position: 'relative',
  },
  selectionGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 36,
    backgroundColor: '#333333',
    opacity: 0.07,
  },
  row: {
    width: 220,
    height: 120,
    borderRadius: 32,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  rowSelected: {
    borderWidth: 1.5,
    borderColor: 'rgba(51, 51, 51, 0.2)',
  },
  labelBlock: {
    flex: 1,
  },
  primaryLabel: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  secondaryLabel: {
    fontSize: 13,
    fontFamily: FONTS.uiSemibold,
    opacity: 0.6,
  },
  unselectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
});


