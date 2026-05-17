import {
  Image,
  Platform,
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useClerk, useUser } from '@clerk/clerk-expo';
import { SPACING, BORDER_RADIUS, FONTS, LAYOUT, SOFT_SURFACE_FACE, softSurfaceLift } from '@/constants';
import { contentLocalePriorityToArray } from '@/lib/i18n/config';
import { getChevronName, getRowDirection } from '@/lib/i18n/direction';
import { useI18n } from '@/lib/i18n/useI18n';
import { isAuthDisabled } from '@/lib/authMode';
import { BackfireTitleLogo } from '@/components/BackfireTitleLogo';
import { PublicAuthEntry } from '@/components/PublicAuthEntry';
import { ScreenContent } from '@/components/ScreenContent';
import { useLocaleStore } from '@/store/locale';
import { usePlayStore } from '@/store/play';
import { useThemeStore } from '@/store/theme';
import { HOME_SOFT_UI } from '@/themes';

const T = HOME_SOFT_UI;



function formatTokens(n: number, locale: string) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n);
}

function formatPaletteName(id: string) {
  return id
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function ProfileScreen() {
  const { width } = useWindowDimensions();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const authDisabled = isAuthDisabled();
  const router = useRouter();
  const paletteId = useThemeStore((s) => s.paletteId);
  const { direction, getLocaleName, t, uiLocale } = useI18n();
  const contentLocales = useLocaleStore((state) => state.contentLocales);
  const tokens = usePlayStore((state) => state.tokens);

  const themeSummary = formatPaletteName(paletteId);
  const selectedContentLocales = contentLocalePriorityToArray(contentLocales)
    .map((locale) => getLocaleName(locale, 'english'))
    .join(', ');
  const contentLanguageSummary =
    selectedContentLocales || t('settings.noTriviaLanguagesSelected');
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

  return (
    <SafeAreaView
      collapsable={false}
      edges={['top', 'bottom', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: canvas }]}
    >
      <ScreenContent fullWidth style={styles.profileViewport}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.topBar, { flexDirection: rowDir }]}>
            <Pressable
              onPress={handleBack}
              style={({ pressed }) => [
                styles.headerSquircleInner,
                SOFT_SURFACE_FACE,
                softSurfaceLift(),
                {
                  backgroundColor: surface,
                  opacity: pressed ? 0.94 : 1,
                  transform: pressed ? [{ scale: 0.97 }] : [{ scale: 1 }],
                },
              ]}
            >
              <Ionicons name={direction === 'rtl' ? 'chevron-forward' : 'chevron-back'} size={22} color={textPrimary} />
            </Pressable>

            <View style={styles.headerLogoWrap}>
              <BackfireTitleLogo width={180} testID="profile-brand-logo" />
            </View>

            <Pressable
              onPress={() => router.push('/(app)/store')}
              style={({ pressed }) => [
                styles.tokenChip,
                SOFT_SURFACE_FACE,
                softSurfaceLift(),
                {
                  backgroundColor: surface,
                  opacity: pressed ? 0.94 : 1,
                  transform: pressed ? [{ scale: 0.97 }] : [{ scale: 1 }],
                },
              ]}
            >
              <Ionicons name="diamond-outline" size={16} color={textPrimary} />
              <Text style={[styles.tokenChipValue, { color: textPrimary }]}>
                {formatTokens(tokens, uiLocale)}
              </Text>
            </Pressable>
          </View>

          <View style={[styles.profileColumns, isCompactLayout && styles.profileColumnsCompact]}>
            <View style={styles.profileCol}>
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
                <Link href="/(app)/theme-picker" asChild>
                  <Pressable
                    style={({ pressed }) => [
                      styles.prefRow,
                      { flexDirection: rowDir, borderBottomColor: 'rgba(0,0,0,0.06)' },
                      pressed && { backgroundColor: 'rgba(0,0,0,0.03)' },
                    ]}
                  >
                    <View style={[styles.prefMain, { flexDirection: rowDir }]}>
                      <Ionicons name="color-palette-outline" size={20} color={textPrimary} />
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
                      <View style={styles.prefTrailingSlot}>
                        <Ionicons name={getChevronName(direction)} size={18} color={textMuted} />
                      </View>
                    </View>
                  </Pressable>
                </Link>

                {/* App language */}
                <Link href="/(app)/language-picker" asChild>
                  <Pressable
                    style={({ pressed }) => [
                      styles.prefRow,
                      { flexDirection: rowDir, borderBottomColor: 'rgba(0,0,0,0.06)' },
                      pressed && { backgroundColor: 'rgba(0,0,0,0.03)' },
                    ]}
                  >
                    <View style={[styles.prefMain, { flexDirection: rowDir }]}>
                      <Ionicons name="language-outline" size={20} color={textPrimary} />
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
                      <View style={styles.prefTrailingSlot}>
                        <Ionicons name={getChevronName(direction)} size={18} color={textMuted} />
                      </View>
                    </View>
                  </Pressable>
                </Link>

                {/* Content languages */}
                <Link href="/(app)/content-languages-picker" asChild>
                  <Pressable
                    style={({ pressed }) => [
                      styles.prefRow,
                      { flexDirection: rowDir, borderBottomColor: 'rgba(0,0,0,0.06)' },
                      pressed && { backgroundColor: 'rgba(0,0,0,0.03)' },
                    ]}
                  >
                    <View style={[styles.prefMain, { flexDirection: rowDir }]}>
                      <Ionicons name="chatbubbles-outline" size={20} color={textPrimary} />
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
                      <View style={styles.prefTrailingSlot}>
                        <Ionicons name={getChevronName(direction)} size={18} color={textMuted} />
                      </View>
                    </View>
                  </Pressable>
                </Link>

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
                      <Ionicons name="log-out-outline" size={20} color="#DC2626" />
                      <View style={styles.prefTextBlock}>
                        <Text
                          style={[styles.prefLabel, { color: '#DC2626' }]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {t('common.signOut')}
                        </Text>
                      </View>
                      <View style={styles.prefTrailingSlot}>
                        <Ionicons name={getChevronName(direction)} size={18} color={textMuted} />
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
      </ScreenContent>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.screenGutter,
    paddingBottom: SPACING.xxl,
  },
  profileViewport: {
    flex: 1,
    paddingTop: SPACING.md,
  },

  topBar: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  headerSquircleInner: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogoWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.pill,
  },
  tokenChipValue: {
    fontFamily: FONTS.uiBold,
    fontSize: 16,
  },
  profileColumns: {
    flexDirection: 'row',
    gap: SPACING.xl,
  },
  profileColumnsCompact: {
    flexDirection: 'column',
    gap: SPACING.lg,
  },
  profileCol: {
    flex: 1,
    gap: SPACING.lg,
  },
  prefsGroup: {
    borderRadius: 32,
    overflow: 'hidden',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
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
    minHeight: 80,
    paddingVertical: SPACING.xl,
    paddingHorizontal: 0,
    borderBottomWidth: 0,
    gap: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  prefRowLast: {
    alignItems: 'center',
    minHeight: 80,
    paddingVertical: SPACING.xl,
    paddingHorizontal: 0,
    gap: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  prefLabel: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 16,
    lineHeight: 22,
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
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    opacity: 0.75,
  },
  chevronSpacer: {
    width: 18,
    marginStart: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefTrailingSlot: {
    width: 18,
    marginStart: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
