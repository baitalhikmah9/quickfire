import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useClerk, useUser } from '@clerk/clerk-expo';
import { SPACING, BORDER_RADIUS, FONTS, LAYOUT } from '@/constants';
import { contentLocalePriorityToArray } from '@/lib/i18n/config';
import { getChevronName, getRowDirection } from '@/lib/i18n/direction';
import { useI18n } from '@/lib/i18n/useI18n';
import { isAuthDisabled } from '@/lib/authMode';
import { ProfileAuthGate } from '@/components/ProfileAuthGate';
import { QuickFireTitleLogo } from '@/components/QuickFireTitleLogo';
import { ScreenContent } from '@/components/ScreenContent';
import { useLocaleStore } from '@/store/locale';
import { usePlayStore } from '@/store/play';
import { useThemeStore } from '@/store/theme';
import { HOME_SOFT_UI } from '@/themes';

const T = HOME_SOFT_UI;

/** Raised plastic tile shadow tier. */
function neumorphicLift3D(shadowColor: string, tier: 'hero' | 'header' | 'pill' | 'card'): any {
  const m =
    tier === 'hero'
      ? { h: 14, op: 0.14, r: 28, el: 18 }
      : tier === 'header'
      ? { h: 8, op: 0.12, r: 18, el: 12 }
      : tier === 'card'
      ? { h: 10, op: 0.12, r: 22, el: 14 }
      : { h: 6, op: 0.1, r: 14, el: 8 };

  return {
    shadowColor,
    shadowOffset: { width: 0, height: m.h },
    shadowOpacity: m.op,
    shadowRadius: m.r,
    elevation: m.el,
  };
}

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

  if (!isSignedIn && !authDisabled) {
    return (
      <SafeAreaView
        collapsable={false}
        edges={['top', 'bottom', 'left', 'right']}
        style={[styles.safeArea, { backgroundColor: T.colors.canvas }]}
      >
        <ScreenContent fullWidth style={styles.authGateViewport}>
          <ProfileAuthGate />
        </ScreenContent>
      </SafeAreaView>
    );
  }

  const themeSummary = formatPaletteName(paletteId);
  const selectedContentLocales = contentLocalePriorityToArray(contentLocales)
    .map((locale) => getLocaleName(locale, 'english'))
    .join(', ');
  const contentLanguageSummary =
    selectedContentLocales || t('settings.noTriviaLanguagesSelected');

  const rowDir = getRowDirection(direction);
  const isCompactLayout = width < 980;
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
                styles.plasticFace,
                {
                  backgroundColor: surface,
                  borderRadius: 99,
                  opacity: pressed ? 0.94 : 1,
                  transform: pressed ? [{ scale: 0.97 }] : [{ scale: 1 }],
                },
                neumorphicLift3D(shadowHex, 'header'),
              ]}
            >
              <Ionicons name={direction === 'rtl' ? 'chevron-forward' : 'chevron-back'} size={22} color={textPrimary} />
            </Pressable>

            <View style={styles.headerLogoWrap}>
              <QuickFireTitleLogo width={180} testID="profile-brand-logo" />
            </View>

            <Pressable
              onPress={() => router.push('/(app)/store')}
              style={({ pressed }) => [
                styles.tokenChip,
                styles.plasticFace,
                {
                  backgroundColor: surface,
                  opacity: pressed ? 0.94 : 1,
                  transform: pressed ? [{ scale: 0.97 }] : [{ scale: 1 }],
                },
                neumorphicLift3D(shadowHex, 'header'),
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
              <View
                style={[
                  styles.prefsGroup,
                  styles.plasticFace,
                  { backgroundColor: surface },
                  neumorphicLift3D(shadowHex, 'card'),
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

                {/* Sign out */}
                {!authDisabled && signOut ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.prefRowLast,
                      { flexDirection: rowDir },
                      pressed && { backgroundColor: 'rgba(0,0,0,0.03)' },
                    ]}
                    onPress={() => signOut()}
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
                    </View>
                    <View style={styles.chevronSpacer} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        </ScrollView>
      </ScreenContent>
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
  scrollContent: {
    paddingHorizontal: LAYOUT.screenGutter,
    paddingBottom: SPACING.xxl,
  },
  profileViewport: {
    flex: 1,
    paddingTop: SPACING.md,
  },
  authGateViewport: {
    flex: 1,
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
