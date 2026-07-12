import { useState } from 'react';
import {
  Image,
  Platform,
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useClerk, useUser } from '@clerk/clerk-expo';
import {
  HEADER,
  SPACING,
  BORDER_RADIUS,
  COLORS,
  PALETTES,
  FONTS,
  LAYOUT,
  SOFT_SURFACE_FACE,
  softSurfaceLift,
  getStandardChromeTopPadding,
  type ThemePaletteId,
} from '@/constants';
import {
  SUPPORTED_LOCALES,
  contentLocalePriorityToArray,
  isNonEnglishContentLocale,
  type NonEnglishContentLocale,
} from '@/lib/i18n/config';
import { getRowDirection } from '@/lib/i18n/direction';
import { useI18n } from '@/lib/i18n/useI18n';
import { useViewportLayout } from '@/lib/hooks/useViewportLayout';
import { isAuthDisabled } from '@/lib/authMode';
import { PublicAuthEntry } from '@/components/PublicAuthEntry';
import { ScreenContent } from '@/components/ScreenContent';
import { HubTokenChip } from '@/components/HubTokenChip';
import { WebAwareModal } from '@/components/WebAwareModal';
import { useLocaleStore } from '@/store/locale';
import { usePlayStore } from '@/store/play';
import { useThemeStore } from '@/store/theme';
import { HOME_SOFT_UI } from '@/themes';

const T = HOME_SOFT_UI;

const ALL_PALETTES: ThemePaletteId[] = ['dark', 'default', 'warm', 'cool', 'green', 'red'];
const SELECTABLE_CONTENT_LOCALES = SUPPORTED_LOCALES.filter((locale) =>
  isNonEnglishContentLocale(locale)
);

function formatTokens(n: number, locale: string) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n);
}

function getPaletteNameKey(id: ThemePaletteId) {
  return `settings.palette.${id}` as const;
}

export default function SettingsScreen() {
  const { width } = useWindowDimensions();
  const hubMaxWidth = useViewportLayout().contentMaxWidth('hub');
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const authDisabled = isAuthDisabled();
  const router = useRouter();
  const paletteId = useThemeStore((s) => s.paletteId);
  const setPalette = useThemeStore((s) => s.setPalette);
  const [isThemeModalVisible, setThemeModalVisible] = useState(false);
  const [isLanguageModalVisible, setLanguageModalVisible] = useState(false);
  const [isContentLanguagesModalVisible, setContentLanguagesModalVisible] = useState(false);
  const { direction, getLocaleName, t, uiLocale } = useI18n();
  const setUiLocale = useLocaleStore((state) => state.setUiLocale);
  const contentLocales = useLocaleStore((state) => state.contentLocales);
  const setContentLocales = useLocaleStore((state) => state.setContentLocales);
  const moveContentLocale = useLocaleStore((state) => state.moveContentLocale);
  const storedTokens = usePlayStore((state) => state.tokens);
  const tokens = !authDisabled && !isSignedIn ? 0 : storedTokens;

  const themeSummary = t(getPaletteNameKey(paletteId));
  const selectedContentLocaleValues = contentLocalePriorityToArray(contentLocales);
  const selectedContentLocales = selectedContentLocaleValues
    .map((locale) => getLocaleName(locale, 'english'))
    .join(', ');
  const contentLanguageSummary =
    selectedContentLocales || t('settings.noTriviaLanguagesSelected');
  const formattedTokens = formatTokens(tokens, uiLocale);
  const userDisplayName = user?.fullName || user?.username || user?.primaryEmailAddress?.emailAddress || t('common.profile');
  const userEmail = user?.primaryEmailAddress?.emailAddress;
  const userInitial = userDisplayName.trim().charAt(0).toUpperCase() || 'U';

  const rowDir = getRowDirection(direction);
  const isCompactLayout = width < 980;
  const canvas = T.colors.canvas;
  const surface = T.colors.surface;
  const textPrimary = T.colors.textPrimary;
  const textMuted = T.colors.textMuted;
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(app)');
  };

  const toggleContentLocale = (locale: NonEnglishContentLocale) => {
    if (selectedContentLocaleValues.includes(locale)) {
      setContentLocales(selectedContentLocaleValues.filter((value) => value !== locale));
      return;
    }

    if (selectedContentLocaleValues.length >= 3) {
      return;
    }

    setContentLocales([...selectedContentLocaleValues, locale]);
  };

  return (
    <SafeAreaView
      collapsable={false}
      edges={['top', 'bottom', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: canvas }]}
    >
      <ScreenContent fullWidth style={styles.settingsViewport}>
        {/* One frame owns outer gutter so header controls and content cards share edges. */}
        <View style={[styles.contentFrame, { maxWidth: hubMaxWidth }]}>
        <View style={styles.header}>
          <View style={styles.headerSide}>
            <Pressable
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              style={({ pressed }) => [
                styles.backButton,
                SOFT_SURFACE_FACE,
                softSurfaceLift(),
                { backgroundColor: surface },
                {
                  opacity: pressed ? 0.9 : 1,
                  transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
                },
              ]}
            >
              <Ionicons name={direction === 'rtl' ? 'chevron-forward' : 'chevron-back'} size={22} color={textPrimary} />
            </Pressable>
          </View>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: textPrimary }]} accessibilityRole="header">
              {t('common.settings').toUpperCase()}
            </Text>
          </View>
          <View style={[styles.headerSide, styles.headerSideRight]}>
            <HubTokenChip
              label={t('common.tokens')}
              value={formattedTokens}
              rowDirection={rowDir}
              variant="softUi"
              onPress={() => router.push('/(app)/store')}
              accessibilityLabel={`${t('common.tokens')}: ${formattedTokens}`}
            />
          </View>
        </View>

        <ScrollView
          style={styles.settingsScroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.settingsColumns, isCompactLayout && styles.settingsColumnsCompact]}>
            <View style={styles.settingsCol}>
              {isSignedIn && user ? (
                <View
                  testID="settings-user-profile-card"
                  style={[
                    styles.userProfileCard,
                    SOFT_SURFACE_FACE,
                    softSurfaceLift(),
                    { backgroundColor: surface, flexDirection: rowDir },
                  ]}
                >
                  {user.imageUrl ? (
                    <Image source={{ uri: user.imageUrl }} style={styles.userAvatar} />
                  ) : (
                    <View style={[styles.userAvatar, styles.userAvatarFallback]}>
                      <Text style={[styles.userAvatarInitial, { color: textPrimary }]}>{userInitial}</Text>
                    </View>
                  )}
                  <View style={styles.userProfileTextBlock}>
                    <Text style={[styles.userProfileKicker, { color: textMuted }]}>
                      {t('settings.accountAuthTitle').toUpperCase()}
                    </Text>
                    <Text style={[styles.userProfileName, { color: textPrimary }]} numberOfLines={1}>
                      {userDisplayName}
                    </Text>
                    {userEmail ? (
                      <Text style={[styles.userProfileEmail, { color: textMuted }]} numberOfLines={1}>
                        {userEmail}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : null}

              <View
                style={[
                  styles.prefsGroup,
                  SOFT_SURFACE_FACE,
                  softSurfaceLift(),
                  { backgroundColor: surface },
                ]}
              >
                {/* Theme selection */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('settings.themeSelectionTitle')}
                  onPress={() => setThemeModalVisible(true)}
                  style={({ pressed }) => [
                    styles.prefRow,
                    { flexDirection: rowDir, borderBottomColor: 'rgba(0,0,0,0.06)' },
                    pressed && { backgroundColor: 'rgba(0,0,0,0.03)' },
                  ]}
                >
                  <View style={[styles.prefMain, { flexDirection: rowDir }]}>
                      <Ionicons name="color-palette-outline" size={18} color={textPrimary} />
                      <View style={styles.prefTextBlock}>
                        <Text
                          style={[styles.prefLabel, { color: textPrimary }]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {t('settings.themeSelectionTitle')}
                        </Text>
                        <Text
                          style={[styles.prefMeta, { color: textMuted }]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {themeSummary}
                        </Text>
                      </View>
                  </View>
                </Pressable>

                {/* App language */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('settings.appLanguageTitle')}
                  onPress={() => setLanguageModalVisible(true)}
                  style={({ pressed }) => [
                    styles.prefRow,
                    { flexDirection: rowDir, borderBottomColor: 'rgba(0,0,0,0.06)' },
                    pressed && { backgroundColor: 'rgba(0,0,0,0.03)' },
                  ]}
                >
                  <View style={[styles.prefMain, { flexDirection: rowDir }]}>
                      <Ionicons name="language-outline" size={18} color={textPrimary} />
                      <View style={styles.prefTextBlock}>
                        <Text
                          style={[styles.prefLabel, { color: textPrimary }]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {t('settings.appLanguageTitle')}
                        </Text>
                        <Text
                          style={[styles.prefMeta, { color: textMuted }]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {getLocaleName(uiLocale, 'both')}
                        </Text>
                      </View>
                  </View>
                </Pressable>

                {/* Content languages */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('settings.languagesUpToThreeTitle')}
                  onPress={() => setContentLanguagesModalVisible(true)}
                  style={({ pressed }) => [
                    styles.prefRow,
                    { flexDirection: rowDir, borderBottomColor: 'rgba(0,0,0,0.06)' },
                    pressed && { backgroundColor: 'rgba(0,0,0,0.03)' },
                  ]}
                >
                  <View style={[styles.prefMain, { flexDirection: rowDir }]}>
                      <Ionicons name="chatbubbles-outline" size={18} color={textPrimary} />
                      <View style={styles.prefTextBlock}>
                        <Text
                          style={[styles.prefLabel, { color: textPrimary }]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {t('settings.languagesUpToThreeTitle')}
                        </Text>
                        <Text
                          style={[styles.prefMeta, { color: textMuted }]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {contentLanguageSummary}
                        </Text>
                      </View>
                  </View>
                </Pressable>

              </View>

              <View
                style={[
                  styles.prefsGroup,
                  SOFT_SURFACE_FACE,
                  softSurfaceLift(),
                  { backgroundColor: surface },
                ]}
              >
                <Text
                  accessibilityRole="header"
                  style={[styles.userProfileKicker, { color: textMuted, marginBottom: SPACING.xs }]}
                >
                  {t('settings.legalHeading').toUpperCase()}
                </Text>
                <Pressable
                  testID="settings-legal-terms"
                  accessibilityRole="button"
                  accessibilityLabel={t('legal.termsTitle')}
                  onPress={() => router.push('/terms')}
                  style={({ pressed }) => [
                    styles.prefRow,
                    { flexDirection: rowDir, borderBottomColor: 'rgba(0,0,0,0.06)' },
                    pressed && { backgroundColor: 'rgba(0,0,0,0.03)' },
                  ]}
                >
                  <View style={[styles.prefMain, { flexDirection: rowDir }]}>
                    <Ionicons name="document-text-outline" size={18} color={textPrimary} />
                    <View style={styles.prefTextBlock}>
                      <Text
                        style={[styles.prefLabel, { color: textPrimary }]}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {t('legal.termsTitle')}
                      </Text>
                    </View>
                  </View>
                </Pressable>
                <Pressable
                  testID="settings-legal-privacy"
                  accessibilityRole="button"
                  accessibilityLabel={t('legal.privacyTitle')}
                  onPress={() => router.push('/privacy')}
                  style={({ pressed }) => [
                    styles.prefRowLast,
                    { flexDirection: rowDir },
                    pressed && { backgroundColor: 'rgba(0,0,0,0.03)' },
                  ]}
                >
                  <View style={[styles.prefMain, { flexDirection: rowDir }]}>
                    <Ionicons name="shield-checkmark-outline" size={18} color={textPrimary} />
                    <View style={styles.prefTextBlock}>
                      <Text
                        style={[styles.prefLabel, { color: textPrimary }]}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {t('legal.privacyTitle')}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              </View>

              {isSignedIn ? (
                <View
                  style={[
                    styles.authCard,
                    SOFT_SURFACE_FACE,
                    softSurfaceLift(),
                    { backgroundColor: surface },
                  ]}
                >
                  <Pressable
                    testID="settings-sign-out-button"
                    accessibilityRole="button"
                    accessibilityLabel={t('common.signOut')}
                    style={({ pressed }) => [
                      styles.prefRowLast,
                      { flexDirection: rowDir },
                      pressed && { backgroundColor: 'rgba(0,0,0,0.03)' },
                    ]}
                    onPress={() => {
                      void signOut?.();
                    }}
                  >
                    <View style={[styles.prefMain, { flexDirection: rowDir }]}>
                      <Ionicons name="log-out-outline" size={18} color="#DC2626" />
                      <View style={styles.prefTextBlock}>
                        <Text
                          style={[styles.prefLabel, { color: '#DC2626' }]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {t('common.signOut')}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                </View>
              ) : !authDisabled ? (
                <View style={styles.publicAuthInSettings}>
                  <PublicAuthEntry
                    showCreateAccount={Platform.OS === 'web'}
                    style={styles.publicAuthEntry}
                  />
                </View>
              ) : null}
            </View>
          </View>
        </ScrollView>
        </View>
      </ScreenContent>

      <WebAwareModal
        visible={isThemeModalVisible}
        onRequestClose={() => setThemeModalVisible(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settings.closeThemePicker')}
            style={styles.modalBackdrop}
            onPress={() => setThemeModalVisible(false)}
          />
          <View
            style={[
              styles.themeModalCard,
              SOFT_SURFACE_FACE,
              softSurfaceLift(),
              { backgroundColor: surface },
            ]}
          >
            <View style={styles.themeModalHeader}>
              <View>
                <Text style={[styles.themeModalTitle, { color: textPrimary }]}>{t('common.theme').toUpperCase()}</Text>
                <Text style={[styles.themeModalSubtitle, { color: textMuted }]}>{t('settings.themePickerDescription')}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('settings.closeThemePicker')}
                onPress={() => setThemeModalVisible(false)}
                style={({ pressed }) => [
                  styles.themeModalCloseButton,
                  SOFT_SURFACE_FACE,
                  softSurfaceLift(),
                  {
                    backgroundColor: surface,
                    opacity: pressed ? 0.94 : 1,
                    transform: pressed ? [{ scale: 0.97 }] : [{ scale: 1 }],
                  },
                ]}
              >
                <Ionicons name="close" size={20} color={textPrimary} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.themePaletteGrid}
            >
              {ALL_PALETTES.map((id) => {
                const palette = PALETTES[id];
                const isSelected = id === paletteId;
                return (
                  <Pressable
                    key={id}
                    accessibilityRole="button"
                    accessibilityLabel={`${t(getPaletteNameKey(id))} ${t('common.theme')}`}
                    onPress={() => setPalette(id)}
                    style={({ pressed }) => [
                      styles.themePaletteCard,
                      SOFT_SURFACE_FACE,
                      softSurfaceLift(),
                      {
                        backgroundColor: surface,
                        opacity: pressed ? 0.94 : 1,
                        borderColor: isSelected ? textPrimary : 'rgba(51, 51, 51, 0.08)',
                      },
                    ]}
                  >
                    <View style={styles.themeSwatchRow}>
                      <View style={[styles.themeSwatch, { backgroundColor: palette.primary }]} />
                      <View style={[styles.themeSwatch, { backgroundColor: palette.background }]} />
                      <View style={[styles.themeSwatch, { backgroundColor: palette.success }]} />
                    </View>
                    <View style={styles.themePaletteTextBlock}>
                      <Text style={[styles.themePaletteName, { color: textPrimary }]}>
                        {t(getPaletteNameKey(id))}
                      </Text>
                      <Text style={[styles.themePaletteMeta, { color: textMuted }]}>
                        {isSelected ? t('settings.activePalette') : t('settings.tapToApply')}
                      </Text>
                    </View>
                    {isSelected ? <Ionicons name="checkmark-circle" size={22} color={textPrimary} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </WebAwareModal>

      <WebAwareModal
        visible={isLanguageModalVisible}
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settings.closeLanguagePicker')}
            style={styles.modalBackdrop}
            onPress={() => setLanguageModalVisible(false)}
          />
          <View
            style={[
              styles.themeModalCard,
              SOFT_SURFACE_FACE,
              softSurfaceLift(),
              { backgroundColor: surface },
            ]}
          >
            <View style={styles.themeModalHeader}>
              <View>
                <Text style={[styles.themeModalTitle, { color: textPrimary }]}> 
                  {t('settings.appLanguageTitle').toUpperCase()}
                </Text>
                <Text style={[styles.themeModalSubtitle, { color: textMuted }]}>{t('settings.appLanguagePickerDescription')}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('settings.closeLanguagePicker')}
                onPress={() => setLanguageModalVisible(false)}
                style={({ pressed }) => [
                  styles.themeModalCloseButton,
                  SOFT_SURFACE_FACE,
                  softSurfaceLift(),
                  {
                    backgroundColor: surface,
                    opacity: pressed ? 0.94 : 1,
                    transform: pressed ? [{ scale: 0.97 }] : [{ scale: 1 }],
                  },
                ]}
              >
                <Ionicons name="close" size={20} color={textPrimary} />
              </Pressable>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.languageRow}>
              {SUPPORTED_LOCALES.map((locale) => {
                const isSelected = locale === uiLocale;
                return (
                  <Pressable
                    key={locale}
                    accessibilityRole="button"
                    accessibilityLabel={`${getLocaleName(locale, 'english')} ${t('settings.appLanguageTitle')}`}
                    onPress={() => setUiLocale(locale)}
                    style={({ pressed }) => [
                      styles.languageCard,
                      SOFT_SURFACE_FACE,
                      softSurfaceLift(),
                      {
                        backgroundColor: surface,
                        opacity: pressed ? 0.94 : 1,
                        borderColor: isSelected ? textPrimary : 'rgba(51, 51, 51, 0.08)',
                      },
                    ]}
                  >
                    <View style={styles.themePaletteTextBlock}>
                      <Text style={[styles.languagePrimaryLabel, { color: textPrimary }]}> 
                        {getLocaleName(locale, 'native').toUpperCase()}
                      </Text>
                      <Text style={[styles.themePaletteMeta, { color: textMuted }]}> 
                        {getLocaleName(locale, 'english')}
                      </Text>
                    </View>
                    {isSelected ? <Ionicons name="checkmark-circle" size={22} color={textPrimary} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </WebAwareModal>

      <WebAwareModal
        visible={isContentLanguagesModalVisible}
        onRequestClose={() => setContentLanguagesModalVisible(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settings.closeTriviaLanguagesPicker')}
            style={styles.modalBackdrop}
            onPress={() => setContentLanguagesModalVisible(false)}
          />
          <View
            style={[
              styles.themeModalCard,
              SOFT_SURFACE_FACE,
              softSurfaceLift(),
              { backgroundColor: surface },
            ]}
          >
            <View style={styles.themeModalHeader}>
              <View>
                <Text style={[styles.themeModalTitle, { color: textPrimary }]}>{t('settings.triviaLanguagesTitle').toUpperCase()}</Text>
                <Text style={[styles.themeModalSubtitle, { color: textMuted }]}>{t('settings.triviaLanguagesDescription')}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('settings.closeTriviaLanguagesPicker')}
                onPress={() => setContentLanguagesModalVisible(false)}
                style={({ pressed }) => [
                  styles.themeModalCloseButton,
                  SOFT_SURFACE_FACE,
                  softSurfaceLift(),
                  {
                    backgroundColor: surface,
                    opacity: pressed ? 0.94 : 1,
                    transform: pressed ? [{ scale: 0.97 }] : [{ scale: 1 }],
                  },
                ]}
              >
                <Ionicons name="close" size={20} color={textPrimary} />
              </Pressable>
            </View>

            {selectedContentLocaleValues.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectedLanguageRow}>
                {selectedContentLocaleValues.map((locale, index) => (
                  <View
                    key={locale}
                    style={[
                      styles.selectedLanguageCard,
                      SOFT_SURFACE_FACE,
                      softSurfaceLift(),
                      { backgroundColor: surface },
                    ]}
                  >
                    <View style={styles.themePaletteTextBlock}>
                      <Text style={[styles.themePaletteName, { color: textPrimary }]}>{getLocaleName(locale, 'native')}</Text>
                      <Text style={[styles.themePaletteMeta, { color: textMuted }]}>{t('common.priorityLabel', { count: index + 1 })}</Text>
                    </View>
                    <View style={styles.priorityActions}>
                      <Pressable
                        onPress={() => index > 0 && moveContentLocale(index as 0 | 1 | 2, (index - 1) as 0 | 1 | 2)}
                        disabled={index === 0}
                      >
                        <Ionicons name="arrow-up" size={18} color={index === 0 ? 'rgba(51,51,51,0.32)' : textMuted} />
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          index < selectedContentLocaleValues.length - 1 &&
                          moveContentLocale(index as 0 | 1 | 2, (index + 1) as 0 | 1 | 2)
                        }
                        disabled={index === selectedContentLocaleValues.length - 1}
                      >
                        <Ionicons
                          name="arrow-down"
                          size={18}
                          color={index === selectedContentLocaleValues.length - 1 ? 'rgba(51,51,51,0.32)' : textMuted}
                        />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : null}

            <View style={styles.contentLanguageHeader}>
              <Text style={[styles.themePaletteName, { color: textPrimary }]}>{t('common.languages')}</Text>
              <Text style={[styles.themePaletteMeta, { color: textMuted }]}>{selectedContentLocaleValues.length}/3</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.themePaletteGrid}>
              {SELECTABLE_CONTENT_LOCALES.map((locale) => {
                const isSelected = selectedContentLocaleValues.includes(locale);
                const disabled = !isSelected && selectedContentLocaleValues.length >= 3;
                return (
                  <Pressable
                    key={locale}
                    accessibilityRole="button"
                    accessibilityLabel={`${getLocaleName(locale, 'english')} ${t('settings.triviaLanguagesTitle')}`}
                    onPress={() => toggleContentLocale(locale)}
                    disabled={disabled}
                    style={({ pressed }) => [
                      styles.themePaletteCard,
                      SOFT_SURFACE_FACE,
                      softSurfaceLift(),
                      {
                        backgroundColor: surface,
                        opacity: disabled ? 0.5 : pressed ? 0.94 : 1,
                        borderColor: isSelected ? textPrimary : 'rgba(51, 51, 51, 0.08)',
                      },
                    ]}
                  >
                    <View style={styles.themePaletteTextBlock}>
                      <Text style={[styles.themePaletteName, { color: textPrimary }]}>{getLocaleName(locale, 'native')}</Text>
                      <Text style={[styles.themePaletteMeta, { color: textMuted }]}>{getLocaleName(locale, 'english')}</Text>
                    </View>
                    {isSelected ? <Ionicons name="checkmark-circle" size={22} color={textPrimary} /> : null}
                  </Pressable>
                );
              })}
              <View
                style={[
                  styles.themePaletteCard,
                  SOFT_SURFACE_FACE,
                  softSurfaceLift(),
                  { backgroundColor: surface, borderColor: 'rgba(51, 51, 51, 0.08)', opacity: 0.82 },
                ]}
              >
                <View style={styles.themePaletteTextBlock}>
                  <Text style={[styles.themePaletteName, { color: textPrimary }]}>{t('common.english')}</Text>
                  <Text style={[styles.themePaletteMeta, { color: textMuted }]}>{t('settings.englishFallback')}</Text>
                </View>
                <Ionicons name="lock-closed" size={18} color={textMuted} />
              </View>
            </ScrollView>
          </View>
        </View>
      </WebAwareModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl,
    gap: SPACING.lg,
  },
  settingsViewport: {
    flex: 1,
  },
  /** Shared outer gutter — header controls and content cards share the same edges. */
  contentFrame: {
    flex: 1,
    width: '100%',
    maxWidth: LAYOUT.hubMaxWidth,
    alignSelf: 'center',
    minWidth: 0,
    minHeight: 0,
    paddingHorizontal: LAYOUT.screenGutter,
  },
  settingsScroll: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    minHeight: Platform.OS === 'web' ? HEADER.heightWeb : HEADER.heightNative,
    paddingTop: getStandardChromeTopPadding(Platform.OS === 'web'),
    paddingBottom: SPACING.xs,
  },
  headerSide: {
    width: 116,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerSideRight: {
    alignItems: 'flex-end',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 20,
    letterSpacing: 0.8,
    marginBottom: 0,
  },
  settingsColumns: {
    flexDirection: 'row',
    gap: SPACING.xl,
  },
  settingsColumnsCompact: {
    flexDirection: 'column',
    gap: SPACING.lg,
  },
  settingsCol: {
    flex: 1,
    gap: SPACING.lg,
  },
  prefsGroup: {
    borderRadius: 24,
    overflow: 'hidden',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    gap: SPACING.xs,
  },
  authCard: {
    borderRadius: 32,
    overflow: 'hidden',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  publicAuthInSettings: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  publicAuthEntry: {
    alignSelf: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: '100%',
  },
  userProfileCard: {
    alignItems: 'center',
    borderRadius: 32,
    gap: SPACING.md,
    overflow: 'hidden',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  userAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(51, 51, 51, 0.08)',
  },
  userAvatarInitial: {
    fontFamily: FONTS.uiBold,
    fontSize: 22,
    lineHeight: 28,
  },
  userProfileTextBlock: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  userProfileKicker: {
    fontFamily: FONTS.uiBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
    opacity: 0.65,
  },
  userProfileName: {
    fontFamily: FONTS.uiBold,
    fontSize: 18,
    lineHeight: 24,
    marginTop: 3,
  },
  userProfileEmail: {
    fontFamily: FONTS.ui,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
    opacity: 0.75,
  },
  prefRow: {
    alignItems: 'center',
    minHeight: 52,
    paddingVertical: SPACING.sm,
    paddingHorizontal: 0,
    borderBottomWidth: 0,
    gap: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  prefRowLast: {
    alignItems: 'center',
    minHeight: 52,
    paddingVertical: SPACING.sm,
    paddingHorizontal: 0,
    gap: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  prefLabel: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 14,
    lineHeight: 18,
  },
  prefTextBlock: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  prefMain: {
    flex: 1,
    alignItems: 'center',
    gap: SPACING.md,
    minWidth: 0,
  },
  prefMeta: {
    fontFamily: FONTS.ui,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
    opacity: 0.75,
  },
  modalRoot: {
    // Absolute fill (not flex-only) so web fixed shells always dim the full viewport.
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
  },
  themeModalCard: {
    width: '100%',
    maxWidth: 720,
    maxHeight: '86%',
    borderRadius: 32,
    padding: SPACING.xl,
    gap: SPACING.lg,
    zIndex: 2,
  },
  themeModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  themeModalTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: 0.8,
  },
  themeModalSubtitle: {
    marginTop: 4,
    fontFamily: FONTS.ui,
    fontSize: 14,
    lineHeight: 20,
  },
  themeModalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themePaletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  themePaletteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    flexShrink: 1,
    width: '47%',
    minWidth: 148,
    maxWidth: '100%',
    borderWidth: 1.5,
    borderRadius: 24,
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  themeSwatchRow: {
    flexDirection: 'row',
    gap: 6,
  },
  themeSwatch: {
    width: 24,
    height: 24,
    borderRadius: BORDER_RADIUS.sm,
  },
  themePaletteTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  themePaletteName: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 16,
    lineHeight: 22,
  },
  themePaletteMeta: {
    marginTop: 2,
    fontFamily: FONTS.ui,
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.75,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  languageCard: {
    width: 220,
    minHeight: 120,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: 28,
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  languagePrimaryLabel: {
    fontFamily: FONTS.displayBold,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0.5,
  },
  selectedLanguageRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  selectedLanguageCard: {
    width: 220,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 24,
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  priorityActions: {
    gap: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentLanguageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
});
