import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useClerk, useUser } from '@clerk/clerk-expo';
import { SPACING, BORDER_RADIUS, SHADOWS, FONTS, LAYOUT } from '@/constants';
import { COLORS, TYPE_SCALE } from '@/constants/theme';
import { contentLocalePriorityToArray } from '@/lib/i18n/config';
import { getChevronName, getRowDirection } from '@/lib/i18n/direction';
import { useI18n } from '@/lib/i18n/useI18n';
import { isAuthDisabled } from '@/lib/authMode';
import { useTheme } from '@/lib/hooks/useTheme';
import { ProfileAuthGate } from '@/components/ProfileAuthGate';
import { ScreenContent } from '@/components/ScreenContent';
import { useLocaleStore } from '@/store/locale';
import { usePlayStore } from '@/store/play';
import { useThemeStore } from '@/store/theme';
import { HOME_SOFT_UI } from '@/themes';

const T = HOME_SOFT_UI;

const STAT_CARD_RADIUS = 32;
const CTA_RADIUS = 99;
const AVATAR_SIZE = 120;
const RANK_BADGE_BG = '#333333';

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

const AMBER_GLOW = {
  shadowColor: '#FFB347',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.45,
  shadowRadius: 24,
  elevation: 10,
};

type ActivityRow = {
  id: string;
  titleKey: 'profile.activityClassic' | 'profile.activityQuick' | 'profile.activityRumble';
  timeKey: 'profile.activityMinsAgo' | 'profile.activityHoursAgo';
  timeCount: number;
  icon: keyof typeof Ionicons.glyphMap;
  iconTint: string;
  deltaSign: string;
  deltaAmount: number;
  statusKey: 'profile.activityVictory' | 'profile.activityDefeat' | 'profile.activityRankUp';
  statusPositive: boolean;
};

const PLACEHOLDER_ACTIVITY: ActivityRow[] = [
  {
    id: 'a1',
    titleKey: 'profile.activityClassic',
    timeKey: 'profile.activityMinsAgo',
    timeCount: 24,
    icon: 'game-controller-outline',
    iconTint: '#333333',
    deltaSign: '+',
    deltaAmount: 250,
    statusKey: 'profile.activityVictory',
    statusPositive: true,
  },
  {
    id: 'a2',
    titleKey: 'profile.activityQuick',
    timeKey: 'profile.activityHoursAgo',
    timeCount: 2,
    icon: 'flash-outline',
    iconTint: '#333333',
    deltaSign: '-',
    deltaAmount: 100,
    statusKey: 'profile.activityDefeat',
    statusPositive: false,
  },
  {
    id: 'a3',
    titleKey: 'profile.activityRumble',
    timeKey: 'profile.activityMinsAgo',
    timeCount: 51,
    icon: 'people-outline',
    iconTint: '#333333',
    deltaSign: '+',
    deltaAmount: 500,
    statusKey: 'profile.activityRankUp',
    statusPositive: true,
  },
];

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
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const authDisabled = isAuthDisabled();
  const router = useRouter();
  const paletteId = useThemeStore((s) => s.paletteId);
  const isDark = paletteId === 'dark';
  const { direction, getLocaleName, getTextStyle, t, uiLocale } = useI18n();
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

  const greetingName =
    user?.firstName ||
    user?.emailAddresses[0]?.emailAddress?.split('@')[0] ||
    t('common.playerFallback');
  const displayHandle = (user?.username ?? greetingName).toUpperCase();
  const accountAuthSummary =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    displayHandle;
  const themeSummary = formatPaletteName(paletteId);
  const selectedContentLocales = contentLocalePriorityToArray(contentLocales)
    .map((locale) => getLocaleName(locale, 'english'))
    .join(', ');
  const contentLanguageSummary =
    selectedContentLocales || t('settings.noTriviaLanguagesSelected');

  const createdAt = user?.createdAt;
  const memberDate =
    createdAt != null
      ? new Intl.DateTimeFormat(uiLocale, { month: 'short', year: 'numeric' }).format(
          new Date(createdAt)
        )
      : null;
  const memberSinceLine =
    memberDate != null ? t('profile.memberSince', { date: memberDate }) : '';

  const winRatePct = 0;
  const bestStreak = 0;
  const accuracyPct = 0;
  const rankBadge =
    tokens >= 1000 ? t('profile.rankBadgeElite') : t('profile.rankBadgeRival');

  const rowDir = getRowDirection(direction);
  const canvas = T.colors.canvas;
  const surface = T.colors.surface;
  const textPrimary = T.colors.textPrimary;
  const textMuted = T.colors.textMuted;
  const shadowHex = T.colors.shadowStrong;

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
              onPress={() => router.back()}
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
              <Text style={[styles.brandWordmark, { color: textPrimary }]}>
                {t('home.logoWordmark')}
              </Text>
              <Text style={[styles.brandCapline, { color: textPrimary }]}>
                {t('home.logoCapline').toUpperCase()}
              </Text>
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

          <View style={styles.profileColumns}>
            <View style={styles.profileCol}>
              <View style={styles.hero}>
                <View style={[styles.avatarWrap, neumorphicLift3D(shadowHex, 'hero')]}>
                  <View style={[styles.avatarSquircle, styles.plasticFace, { backgroundColor: surface }]}>
                    {user?.imageUrl ? (
                      <Image
                        source={{ uri: user.imageUrl }}
                        style={styles.avatarImage}
                        contentFit="cover"
                        accessibilityLabel={displayHandle}
                      />
                    ) : (
                      <Ionicons name="person-outline" size={56} color={textPrimary} />
                    )}
                  </View>
                  <View style={styles.rankBadgeAnchor}>
                    <View style={[styles.rankBadge, styles.plasticFace, { backgroundColor: textPrimary }]}>
                      <Text style={styles.rankBadgeText}>{rankBadge.toUpperCase()}</Text>
                    </View>
                  </View>
                </View>
                <Text
                  style={[styles.displayName, { color: textPrimary }]}
                  numberOfLines={1}
                >
                  {displayHandle}
                </Text>
                {memberSinceLine ? (
                  <Text style={[styles.memberSince, { color: textMuted }]}>
                    {memberSinceLine}
                  </Text>
                ) : null}
              </View>

              <View style={[styles.statsRow, { flexDirection: rowDir }]}>
                <View style={[styles.statCard, styles.plasticFace, { backgroundColor: surface }, neumorphicLift3D(shadowHex, 'card')]}>
                  <Text style={[styles.statLabel, { color: textMuted }]}>{t('profile.winRate').toUpperCase()}</Text>
                  <Text style={[styles.statValue, { color: textPrimary }]}>{winRatePct.toFixed(0)}%</Text>
                </View>
                <View style={[styles.statCard, styles.plasticFace, { backgroundColor: surface }, neumorphicLift3D(shadowHex, 'card')]}>
                  <Text style={[styles.statLabel, { color: textMuted }]}>{t('profile.bestStreak').toUpperCase()}</Text>
                  <Text style={[styles.statValue, { color: textPrimary }]}>{bestStreak}</Text>
                </View>
                <View style={[styles.statCard, styles.plasticFace, { backgroundColor: surface }, neumorphicLift3D(shadowHex, 'card')]}>
                  <Text style={[styles.statLabel, { color: textMuted }]}>{t('profile.accuracy').toUpperCase()}</Text>
                  <Text style={[styles.statValue, { color: textPrimary }]}>{accuracyPct}%</Text>
                </View>
              </View>

              <View style={styles.ctaRow}>
                <Link href="/(app)/game-recap" asChild>
                  <Pressable
                    style={({ pressed }) => [
                      styles.primaryCta,
                      styles.plasticFace,
                      {
                        backgroundColor: surface,
                        opacity: pressed ? 0.94 : 1,
                        transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
                      },
                      neumorphicLift3D(shadowHex, 'pill'),
                      AMBER_GLOW,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={t('profile.viewAnalytics')}
                  >
                    <Ionicons name="bar-chart-outline" size={20} color={textPrimary} />
                    <Text style={[styles.ctaLabel, { color: textPrimary }]}>
                      {t('profile.viewAnalytics').toUpperCase()}
                    </Text>
                  </Pressable>
                </Link>
              </View>
            </View>

            <View style={styles.profileCol}>
              <View style={[styles.sectionHeader, { flexDirection: rowDir }]}>
                <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                  {t('profile.recentActivity').toUpperCase()}
                </Text>
              </View>

              <View style={styles.activityList}>
                {PLACEHOLDER_ACTIVITY.map((row) => (
                  <View
                    key={row.id}
                    style={[
                      styles.activityCard,
                      styles.plasticFace,
                      {
                        backgroundColor: surface,
                        flexDirection: rowDir,
                      },
                      neumorphicLift3D(shadowHex, 'pill'),
                    ]}
                  >
                    <View style={styles.activityIconWrap}>
                      <Ionicons name={row.icon} size={22} color={textPrimary} />
                    </View>
                    <View style={styles.activityCenter}>
                      <Text style={[styles.activityRowTitle, { color: textPrimary }]}>
                        {t(row.titleKey)}
                      </Text>
                      <Text style={[styles.activityTime, { color: textMuted }]}>
                        {t(row.timeKey, { count: row.timeCount })}
                      </Text>
                    </View>
                    <View style={styles.activityRight}>
                      <Text
                        style={[
                          styles.tokenDelta,
                          { color: textPrimary },
                        ]}
                      >
                        {t('profile.tokenDelta', { sign: row.deltaSign, count: row.deltaAmount })}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={[styles.sectionHeader, { flexDirection: rowDir, marginTop: SPACING.lg }]}>
                <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                  {t('profile.preferences').toUpperCase()}
                </Text>
              </View>

              <View style={[styles.prefsGroup, styles.plasticFace, { backgroundColor: surface }, neumorphicLift3D(shadowHex, 'card')]}>
                <View
                  style={[
                    styles.prefRow,
                    { flexDirection: rowDir, borderBottomColor: 'rgba(0,0,0,0.05)' },
                  ]}
                >
                  <Ionicons name="person-circle-outline" size={20} color={textPrimary} />
                  <View style={styles.prefTextBlock}>
                    <Text style={[styles.prefLabel, { color: textPrimary }]}>
                      {t('settings.accountAuthTitle')}
                    </Text>
                    <Text style={[styles.prefMeta, { color: textMuted }]}>
                      {accountAuthSummary}
                    </Text>
                  </View>
                </View>
                <Link href="/(app)/theme-picker" asChild>
                  <Pressable
                    style={({ pressed }) => [
                      styles.prefRow,
                      { flexDirection: rowDir, borderBottomColor: 'rgba(0,0,0,0.05)' },
                      pressed && { backgroundColor: 'rgba(0,0,0,0.02)' },
                    ]}
                  >
                    <Ionicons name="color-palette-outline" size={20} color={textPrimary} />
                    <View style={styles.prefTextBlock}>
                      <Text style={[styles.prefLabel, { color: textPrimary }]}>
                        {t('settings.themeSelectionTitle')}
                      </Text>
                      <Text style={[styles.prefMeta, { color: textMuted }]}>
                        {themeSummary}
                      </Text>
                    </View>
                    <Ionicons name={getChevronName(direction)} size={18} color={textMuted} />
                  </Pressable>
                </Link>
                <Link href="/(app)/language-picker" asChild>
                  <Pressable
                    style={({ pressed }) => [
                      styles.prefRow,
                      { flexDirection: rowDir, borderBottomColor: 'rgba(0,0,0,0.05)' },
                      pressed && { backgroundColor: 'rgba(0,0,0,0.02)' },
                    ]}
                  >
                    <Ionicons name="language-outline" size={20} color={textPrimary} />
                    <View style={styles.prefTextBlock}>
                      <Text style={[styles.prefLabel, { color: textPrimary }]}>
                        {t('settings.appLanguageTitle')}
                      </Text>
                      <Text style={[styles.prefMeta, { color: textMuted }]}>
                        {getLocaleName(uiLocale, 'both')}
                      </Text>
                    </View>
                    <Ionicons name={getChevronName(direction)} size={18} color={textMuted} />
                  </Pressable>
                </Link>
                <Link href="/(app)/content-languages-picker" asChild>
                  <Pressable
                    style={({ pressed }) => [
                      styles.prefRow,
                      { flexDirection: rowDir, borderBottomColor: 'rgba(0,0,0,0.05)' },
                      pressed && { backgroundColor: 'rgba(0,0,0,0.02)' },
                    ]}
                  >
                    <Ionicons name="chatbubbles-outline" size={20} color={textPrimary} />
                    <View style={styles.prefTextBlock}>
                      <Text style={[styles.prefLabel, { color: textPrimary }]}>
                        {t('settings.languagesUpToThreeTitle')}
                      </Text>
                      <Text style={[styles.prefMeta, { color: textMuted }]}>
                        {contentLanguageSummary}
                      </Text>
                    </View>
                    <Ionicons name={getChevronName(direction)} size={18} color={textMuted} />
                  </Pressable>
                </Link>
                {!authDisabled && signOut ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.prefRowLast,
                      { flexDirection: rowDir },
                      pressed && { backgroundColor: 'rgba(0,0,0,0.02)' },
                    ]}
                    onPress={() => signOut()}
                  >
                    <Ionicons name="log-out-outline" size={20} color="#DC2626" />
                    <Text style={[styles.prefLabel, { color: '#DC2626' }]}>
                      {t('common.signOut')}
                    </Text>
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
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
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
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogoWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandWordmark: {
    fontFamily: FONTS.displayBold,
    fontSize: 22,
    letterSpacing: -0.5,
  },
  brandCapline: {
    fontFamily: FONTS.ui,
    fontSize: 11,
    letterSpacing: 3,
    marginTop: -2,
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
  profileCol: {
    flex: 1,
    gap: SPACING.lg,
  },
  hero: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatarWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    marginBottom: SPACING.lg,
    position: 'relative',
    borderRadius: 42,
  },
  avatarSquircle: {
    width: '100%',
    height: '100%',
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  rankBadgeAnchor: {
    position: 'absolute',
    bottom: -10,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  rankBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.pill,
  },
  rankBadgeText: {
    fontFamily: FONTS.uiBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: '#FFFFFF',
  },
  displayName: {
    fontFamily: FONTS.displayBold,
    fontSize: 28,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  memberSince: {
    fontFamily: FONTS.ui,
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
    opacity: 0.6,
  },
  statsRow: {
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    borderRadius: 24,
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontFamily: FONTS.uiBold,
    fontSize: 9,
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: FONTS.displayBold,
    fontSize: 24,
  },
  ctaRow: {
    marginTop: SPACING.sm,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    height: 64,
    borderRadius: 32,
    width: '100%',
  },
  ctaLabel: {
    fontFamily: FONTS.uiBold,
    fontSize: 15,
    letterSpacing: 1.2,
  },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    letterSpacing: 1.5,
  },
  activityList: {
    gap: SPACING.md,
  },
  activityCard: {
    alignItems: 'center',
    borderRadius: 28,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  activityIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityCenter: {
    flex: 1,
  },
  activityRowTitle: {
    fontFamily: FONTS.uiBold,
    fontSize: 15,
  },
  activityTime: {
    fontFamily: FONTS.ui,
    fontSize: 12,
    marginTop: 2,
  },
  activityRight: {
    alignItems: 'flex-end',
  },
  tokenDelta: {
    fontFamily: FONTS.uiBold,
    fontSize: 14,
  },
  prefsGroup: {
    borderRadius: 32,
    overflow: 'hidden',
  },
  prefRow: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    gap: SPACING.md,
  },
  prefRowLast: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  prefLabel: {
    flex: 1,
    fontFamily: FONTS.uiSemibold,
    fontSize: 15,
  },
  prefTextBlock: {
    flex: 1,
  },
  prefMeta: {
    fontFamily: FONTS.ui,
    fontSize: 12,
    marginTop: 4,
  },
});
