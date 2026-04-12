import { View, Text, StyleSheet } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useClerk, useUser } from '@clerk/clerk-expo';
import { SPACING, BORDER_RADIUS, SHADOWS, FONTS, LAYOUT } from '@/constants';
import { COLORS, TYPE_SCALE } from '@/constants/theme';
import { contentLocalePriorityToArray } from '@/lib/i18n/config';
import { getChevronName, getRowDirection } from '@/lib/i18n/direction';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';
import { ProfileAuthGate } from '@/components/ProfileAuthGate';
import { ScreenContent } from '@/components/ScreenContent';
import { useLocaleStore } from '@/store/locale';
import { usePlayStore } from '@/store/play';
import { useThemeStore } from '@/store/theme';

const STAT_CARD_RADIUS = BORDER_RADIUS.lg;
const CTA_RADIUS = BORDER_RADIUS.xl;
const AVATAR_SIZE = 108;
const RANK_BADGE_BG = '#92400E';
const SETTINGS_BUTTON_BG = 'rgba(161, 143, 252, 0.28)';
const SETTINGS_BUTTON_TEXT = '#4C1D95';

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
    icon: 'game-controller',
    iconTint: COLORS.primary,
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
    icon: 'flash',
    iconTint: COLORS.mutedText,
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
    icon: 'ribbon',
    iconTint: COLORS.primary,
    deltaSign: '+',
    deltaAmount: 500,
    statusKey: 'profile.activityRankUp',
    statusPositive: true,
  },
];

function formatTokens(n: number, locale: string) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n);
}

export default function ProfileScreen() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const colors = useTheme();
  const paletteId = useThemeStore((s) => s.paletteId);
  const isDark = paletteId === 'dark';
  const { direction, getLocaleName, getTextStyle, t, uiLocale } = useI18n();
  const contentLocales = useLocaleStore((state) => state.contentLocales);
  const tokens = usePlayStore((state) => state.tokens);

  const mutedSurface = isDark ? 'rgba(255,255,255,0.07)' : '#F1F5F9';
  const pageBg = isDark ? colors.background : COLORS.surface;

  if (!isSignedIn) {
    return (
      <SafeAreaView
        collapsable={false}
        edges={['top', 'bottom', 'left', 'right']}
        style={[styles.safeArea, { backgroundColor: colors.background }]}
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
  const selectedContentLocales = contentLocalePriorityToArray(contentLocales)
    .map((locale) => getLocaleName(locale, 'english'))
    .join(', ');

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

  return (
    <SafeAreaView
      collapsable={false}
      edges={['top', 'bottom', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: pageBg }]}
    >
      <ScreenContent fullWidth style={styles.profileViewport}>
        <View style={[styles.topBar, { flexDirection: rowDir }]}>
          <Text
            style={[
              styles.brandWordmark,
              { color: COLORS.accent },
              getTextStyle(undefined, 'displayBold', 'start'),
            ]}
            numberOfLines={1}
          >
            {t('common.appName').toUpperCase()}
          </Text>
          <View
            style={[
              styles.tokenChip,
              { backgroundColor: isDark ? 'rgba(0, 123, 255, 0.22)' : `${COLORS.primary}14` },
            ]}
          >
            <Ionicons name="diamond" size={16} color={COLORS.primary} />
            <Text style={[styles.tokenChipValue, { color: COLORS.accent }]}>
              {formatTokens(tokens, uiLocale)}
            </Text>
          </View>
        </View>

        <View style={styles.profileColumns}>
          <View style={styles.profileCol}>
            <View style={styles.hero}>
            <View style={styles.avatarWrap}>
              {user?.imageUrl ? (
                <Image
                  source={{ uri: user.imageUrl }}
                  style={styles.avatarImage}
                  contentFit="cover"
                  accessibilityLabel={displayHandle}
                />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: COLORS.primary }]}>
                  <Ionicons name="person" size={48} color="#FFFFFF" />
                </View>
              )}
              <View style={styles.rankBadgeAnchor}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankBadgeText}>{rankBadge}</Text>
                </View>
              </View>
            </View>
            <Text
              style={[styles.displayName, { color: colors.text }, getTextStyle(undefined, 'displayBold', 'center')]}
              numberOfLines={2}
            >
              {displayHandle}
            </Text>
            {memberSinceLine ? (
              <Text style={[styles.memberSince, { color: colors.textSecondary }, getTextStyle(undefined, 'body', 'center')]}>
                {memberSinceLine}
              </Text>
            ) : null}
          </View>

          <View style={[styles.winRateCard, { backgroundColor: mutedSurface }]}>
            <View style={[styles.winRateTop, { flexDirection: rowDir }]}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }, getTextStyle(undefined, 'bodySemibold', 'start')]}>
                {t('profile.winRate')}
              </Text>
              <Ionicons name="trending-up" size={22} color={`${COLORS.primary}99`} />
            </View>
            <Text style={[styles.winRateValue, { color: COLORS.primary }, getTextStyle(undefined, 'displayBold', 'start')]}>
              {winRatePct.toFixed(1)}%
            </Text>
            <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : `${COLORS.primary}18` }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, Math.max(0, winRatePct))}%`,
                    backgroundColor: COLORS.primary,
                  },
                ]}
              />
            </View>
          </View>

          <View style={[styles.twoCol, { flexDirection: rowDir }]}>
            <View style={[styles.smallStat, { backgroundColor: mutedSurface }]}>
              <View style={[styles.smallStatTop, { flexDirection: rowDir }]}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }, getTextStyle(undefined, 'bodySemibold', 'start')]}>
                  {t('profile.bestStreak')}
                </Text>
                <Ionicons name="flame" size={20} color={COLORS.secondary} />
              </View>
              <Text style={[styles.smallStatValue, { color: colors.text }, getTextStyle(undefined, 'displayBold', 'start')]}>
                {bestStreak}
              </Text>
            </View>
            <View style={[styles.smallStat, { backgroundColor: mutedSurface }]}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }, getTextStyle(undefined, 'bodySemibold', 'start')]}>
                {t('profile.accuracy')}
              </Text>
              <Text style={[styles.smallStatValue, { color: colors.text }, getTextStyle(undefined, 'displayBold', 'start')]}>
                {accuracyPct}%
              </Text>
            </View>
          </View>

          <View style={styles.rankCard}>
            <View style={[styles.rankCardInner, { flexDirection: rowDir }]}>
              <View style={styles.rankCardCopy}>
                <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.55)' }, getTextStyle(undefined, 'bodySemibold', 'start')]}>
                  {t('profile.globalRank')}
                </Text>
                <Text style={[styles.rankCardValue, getTextStyle(undefined, 'displayBold', 'start')]}>
                  {t('profile.rankPending')}
                </Text>
              </View>
              <View style={styles.rankIconCircle}>
                <Ionicons name="stats-chart" size={24} color="#FFFFFF" />
              </View>
            </View>
          </View>

          <Link href="/(app)/game-recap" asChild>
            <Pressable
              style={({ pressed }) => [
                styles.primaryCta,
                { backgroundColor: COLORS.primary, opacity: pressed ? 0.92 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('profile.viewAnalytics')}
            >
              <Ionicons name="bar-chart" size={20} color="#FFFFFF" />
              <Text style={[styles.ctaLabel, getTextStyle(undefined, 'bodyBold', 'center')]}>
                {t('profile.viewAnalytics')}
              </Text>
            </Pressable>
          </Link>

          <Link href="/(app)/theme-picker" asChild>
            <Pressable
              style={({ pressed }) => [
                styles.settingsCta,
                {
                  backgroundColor: isDark ? 'rgba(161, 143, 252, 0.2)' : SETTINGS_BUTTON_BG,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('profile.openSettings')}
            >
              <Ionicons name="settings-sharp" size={20} color={SETTINGS_BUTTON_TEXT} />
              <Text style={[styles.settingsCtaLabel, getTextStyle(undefined, 'bodyBold', 'center')]}>
                {t('profile.openSettings')}
              </Text>
            </Pressable>
          </Link>
          </View>

          <View style={styles.profileCol}>
          <View style={[styles.activityHeader, { flexDirection: rowDir }]}>
            <Text style={[styles.activityTitle, { color: colors.text }, getTextStyle(undefined, 'bodyBold', 'start')]}>
              {t('profile.recentActivity')}
            </Text>
            <View style={styles.activityDot} />
          </View>

          {PLACEHOLDER_ACTIVITY.map((row) => (
            <View
              key={row.id}
              style={[
                styles.activityCard,
                {
                  backgroundColor: colors.cardBackground,
                  flexDirection: rowDir,
                },
                SHADOWS.card,
              ]}
            >
              <View style={[styles.activityIconWrap, { backgroundColor: `${row.iconTint}18` }]}>
                <Ionicons name={row.icon} size={22} color={row.iconTint} />
              </View>
              <View style={styles.activityCenter}>
                <Text style={[styles.activityRowTitle, { color: colors.text }, getTextStyle(undefined, 'bodyBold', 'start')]}>
                  {t(row.titleKey)}
                </Text>
                <Text style={[styles.activityTime, { color: colors.textSecondary }, getTextStyle(undefined, 'body', 'start')]}>
                  {t(row.timeKey, { count: row.timeCount })}
                </Text>
              </View>
              <View style={styles.activityRight}>
                <Text
                  style={[
                    styles.tokenDelta,
                    { color: row.deltaSign === '+' ? COLORS.primary : COLORS.error },
                    getTextStyle(undefined, 'bodySemibold', 'end'),
                  ]}
                >
                  {t('profile.tokenDelta', { sign: row.deltaSign, count: row.deltaAmount })}
                </Text>
                <Text
                  style={[
                    styles.activityStatus,
                    {
                      color: row.statusPositive ? COLORS.primary : COLORS.error,
                    },
                    getTextStyle(undefined, 'bodySemibold', 'end'),
                  ]}
                >
                  {t(row.statusKey)}
                </Text>
              </View>
            </View>
          ))}

          <Text style={[styles.prefsSectionTitle, { color: colors.textSecondary }, getTextStyle(undefined, 'bodySemibold', 'start')]}>
            {t('profile.preferences')}
          </Text>

          <View style={[styles.prefsGroup, { backgroundColor: colors.cardBackground }, SHADOWS.card]}>
            <Link href="/(app)/theme-picker" asChild>
              <Pressable
                style={({ pressed }) => [
                  styles.prefRow,
                  { flexDirection: rowDir, borderBottomColor: colors.border },
                  pressed && styles.prefRowPressed,
                ]}
              >
                <View style={[styles.prefIcon, { backgroundColor: `${COLORS.tertiary}22` }]}>
                  <Ionicons name="color-palette" size={20} color={COLORS.tertiary} />
                </View>
                <Text style={[styles.prefLabel, { color: colors.text }, getTextStyle(undefined, 'bodySemibold', 'start')]}>
                  {t('profile.changeTheme')}
                </Text>
                <Ionicons name={getChevronName(direction)} size={18} color={colors.textSecondary} />
              </Pressable>
            </Link>
            <Link href="/(app)/language-picker" asChild>
              <Pressable
                style={({ pressed }) => [
                  styles.prefRow,
                  { flexDirection: rowDir, borderBottomColor: colors.border },
                  pressed && styles.prefRowPressed,
                ]}
              >
                <View style={[styles.prefIcon, { backgroundColor: `${COLORS.tertiary}22` }]}>
                  <Ionicons name="language" size={20} color={COLORS.tertiary} />
                </View>
                <View style={styles.prefTextBlock}>
                  <Text style={[styles.prefLabel, { color: colors.text }, getTextStyle(undefined, 'bodySemibold', 'start')]}>
                    {t('settings.appLanguageTitle')}
                  </Text>
                  <Text style={[styles.prefMeta, { color: colors.textSecondary }, getTextStyle(undefined, 'body', 'start')]}>
                    {getLocaleName(uiLocale, 'both')}
                  </Text>
                </View>
                <Ionicons name={getChevronName(direction)} size={18} color={colors.textSecondary} />
              </Pressable>
            </Link>
            <Link href="/(app)/content-languages-picker" asChild>
              <Pressable
                style={({ pressed }) => [
                  styles.prefRowLast,
                  { flexDirection: rowDir },
                  pressed && styles.prefRowPressed,
                ]}
              >
                <View style={[styles.prefIcon, { backgroundColor: `${COLORS.tertiary}22` }]}>
                  <Ionicons name="globe" size={20} color={COLORS.tertiary} />
                </View>
                <View style={styles.prefTextBlock}>
                  <Text style={[styles.prefLabel, { color: colors.text }, getTextStyle(undefined, 'bodySemibold', 'start')]}>
                    {t('settings.triviaLanguagesTitle')}
                  </Text>
                  <Text style={[styles.prefMeta, { color: colors.textSecondary }, getTextStyle(undefined, 'body', 'start')]}>
                    {selectedContentLocales || t('settings.englishFallback')}
                  </Text>
                </View>
                <Ionicons name={getChevronName(direction)} size={18} color={colors.textSecondary} />
              </Pressable>
            </Link>
          </View>

          <Pressable
            style={({ pressed }) => [styles.signOutText, pressed && { opacity: 0.6 }]}
            onPress={() => signOut?.()}
            accessibilityRole="button"
            accessibilityLabel={t('common.signOut')}
          >
            <Text style={[styles.signOutTextLabel, { color: COLORS.error }, getTextStyle(undefined, 'bodyBold', 'center')]}>
              {t('common.signOut')}
            </Text>
          </Pressable>
          </View>
        </View>
      </ScreenContent>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  profileViewport: {
    flex: 1,
    minHeight: 0,
    paddingTop: SPACING.md,
    paddingHorizontal: LAYOUT.screenGutter,
  },
  profileColumns: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.md,
    minHeight: 0,
    minWidth: 0,
  },
  profileCol: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.md,
  },
  authGateViewport: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    paddingHorizontal: LAYOUT.screenGutter,
  },
  topBar: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  brandWordmark: {
    fontSize: 19,
    letterSpacing: 1.2,
    fontStyle: 'italic',
    flexShrink: 1,
  },
  tokenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.pill,
  },
  tokenChipValue: {
    fontFamily: FONTS.uiBold,
    fontSize: 16,
  },
  hero: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  avatarWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    marginBottom: SPACING.lg,
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarFallback: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeAnchor: {
    position: 'absolute',
    bottom: -6,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  rankBadge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.pill,
    backgroundColor: RANK_BADGE_BG,
  },
  rankBadgeText: {
    fontFamily: FONTS.uiBold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#FFFFFF',
  },
  displayName: {
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  memberSince: {
    ...TYPE_SCALE.bodyS,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  winRateCard: {
    borderRadius: STAT_CARD_RADIUS,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  winRateTop: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  statLabel: {
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  winRateValue: {
    fontSize: 36,
    lineHeight: 42,
    marginBottom: SPACING.md,
  },
  progressTrack: {
    height: 10,
    borderRadius: BORDER_RADIUS.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.pill,
  },
  twoCol: {
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  smallStat: {
    flex: 1,
    borderRadius: STAT_CARD_RADIUS,
    padding: SPACING.lg,
  },
  smallStatTop: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  smallStatValue: {
    fontSize: 28,
    lineHeight: 34,
  },
  rankCard: {
    borderRadius: STAT_CARD_RADIUS,
    backgroundColor: COLORS.text,
    marginBottom: SPACING.xl,
    overflow: 'hidden',
  },
  rankCardInner: {
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rankCardCopy: {
    flex: 1,
    gap: SPACING.xs,
  },
  rankCardValue: {
    fontSize: 34,
    lineHeight: 40,
    color: '#FFFFFF',
  },
  rankIconCircle: {
    width: 52,
    height: 52,
    borderRadius: BORDER_RADIUS.pill,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginStart: SPACING.md,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: 16,
    borderRadius: CTA_RADIUS,
    marginBottom: SPACING.md,
  },
  ctaLabel: {
    fontSize: 14,
    letterSpacing: 0.6,
    color: '#FFFFFF',
  },
  settingsCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: 16,
    borderRadius: CTA_RADIUS,
    marginBottom: SPACING.xl,
  },
  settingsCtaLabel: {
    fontSize: 14,
    letterSpacing: 0.6,
    color: SETTINGS_BUTTON_TEXT,
  },
  activityHeader: {
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  activityTitle: {
    fontSize: 18,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: BORDER_RADIUS.pill,
    backgroundColor: RANK_BADGE_BG,
  },
  activityCard: {
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.modal,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  activityIconWrap: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityCenter: {
    flex: 1,
    minWidth: 0,
  },
  activityRowTitle: {
    fontSize: 16,
  },
  activityTime: {
    ...TYPE_SCALE.caption,
    marginTop: 2,
  },
  activityRight: {
    alignItems: 'flex-end',
  },
  tokenDelta: {
    fontSize: 15,
  },
  activityStatus: {
    fontSize: 12,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  prefsSectionTitle: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
  },
  prefsGroup: {
    borderRadius: BORDER_RADIUS.modal,
    overflow: 'hidden',
    marginBottom: SPACING.xl,
  },
  prefRow: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    gap: SPACING.md,
  },
  prefRowLast: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  prefRowPressed: {
    opacity: 0.75,
  },
  prefIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefLabel: {
    flex: 1,
    fontSize: 16,
  },
  prefTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  prefMeta: {
    ...TYPE_SCALE.caption,
    marginTop: 2,
  },
  signOutText: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  signOutTextLabel: {
    fontSize: 16,
  },
});
