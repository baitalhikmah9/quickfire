import { useAuth } from '@clerk/clerk-expo';
import { Link, Redirect, Stack, usePathname } from 'expo-router';
import {
  Platform,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { isAuthDisabled } from '@/lib/authMode';
import { BRAND_ADMIN_TABLE, BRAND_RAISED_SURFACE, COLORS, FONTS, SPACING } from '@/constants/theme';
import { HOME_SOFT_UI } from '@/themes';

const SOFT = HOME_SOFT_UI.colors;

const NAV_ITEMS = [
  { label: 'Overview', href: '/admin' as const },
  { label: 'Promo Codes', href: '/admin/promo-codes' as const },
  { label: 'Wallets', href: '/admin/wallets' as const },
  { label: 'Sign out', href: '/admin/sign-out' as const },
];

function Sidebar({ pathname }: { pathname: string }) {
  const normalizedPathname = pathname.replace('/(admin)', '/admin');

  return (
    <View style={styles.sidebar}>
      <View style={styles.sidebarBrand}>
        <Text style={styles.sidebarWordmark}>QuickFire</Text>
        <Text style={styles.sidebarCapline}>ADMIN</Text>
      </View>
      <View style={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const active =
            normalizedPathname === item.href || normalizedPathname.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href} asChild>
              <Pressable
                style={({ pressed }) => [
                  styles.navItem,
                  active ? styles.navItemActive : undefined,
                  { opacity: pressed ? 0.88 : 1 },
                ]}
              >
                <Text style={styles.navItemText}>{item.label}</Text>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </View>
  );
}

function AdminBackendUnavailableScreen() {
  return (
    <View style={styles.center}>
      <Text style={styles.forbiddenTitle}>Admin backend unavailable</Text>
      <Text style={styles.forbiddenText}>
        Convex has not deployed the admin functions yet. Run the repo-local Convex
        dev or deploy command before using this dashboard.
      </Text>
    </View>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isWide = width >= 1024;

  return (
    <View style={styles.root}>
      {isWide && <Sidebar pathname={pathname} />}
      <View style={styles.main}>
        <View style={styles.topBar}>
          <View style={styles.envChip}>
            <Text style={styles.envLabel}>ADMIN</Text>
          </View>
          <Link href="/admin/sign-out" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              style={({ pressed }) => [styles.topBarSignOut, { opacity: pressed ? 0.82 : 1 }]}
            >
              <Text style={styles.topBarSignOutText}>Sign out</Text>
            </Pressable>
          </Link>
        </View>
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

export function AdminAccessBoundary({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const authDisabled = isAuthDisabled();
  const shouldLoadProfile = Platform.OS === 'web' && isLoaded && (isSignedIn || authDisabled);
  const userProfile = useQuery(
    api.users.getCurrentProfile,
    shouldLoadProfile ? {} : 'skip'
  );

  if (Platform.OS !== 'web') {
    return <Redirect href="/(app)/" />;
  }

  if (!isLoaded && !authDisabled) {
    return null;
  }

  if (!isSignedIn && !authDisabled) {
    return <Redirect href="/admin/sign-in" />;
  }

  if (userProfile === undefined) {
    return (
      <View style={styles.center}>
        <Text style={styles.mutedMessage}>Loading...</Text>
      </View>
    );
  }

  if (userProfile === null) {
    return <Redirect href="/admin/sign-in" />;
  }

  if (userProfile.role !== 'admin') {
    return <Redirect href="/admin/sign-in" />;
  }

  return (
    <AdminShell>
      <ErrorBoundary fallback={<AdminBackendUnavailableScreen />}>
        {children}
      </ErrorBoundary>
    </AdminShell>
  );
}

export default function AdminLayout() {
  return (
    <AdminAccessBoundary>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="promo-codes" />
        <Stack.Screen name="wallets" />
        <Stack.Screen name="sign-out" />
      </Stack>
    </AdminAccessBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: SOFT.canvas,
  },
  sidebar: {
    width: 228,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: BRAND_ADMIN_TABLE.rowDivider,
    backgroundColor: SOFT.canvas,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  sidebarBrand: {
    marginBottom: SPACING.lg,
    gap: 4,
  },
  sidebarWordmark: {
    fontFamily: FONTS.displayBold,
    fontSize: 20,
    letterSpacing: -0.3,
    color: SOFT.textPrimary,
  },
  sidebarCapline: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 11,
    letterSpacing: 3,
    color: SOFT.textMuted,
  },
  nav: {
    gap: SPACING.sm,
  },
  navItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BRAND_RAISED_SURFACE.borderRadius,
  },
  navItemActive: {
    ...BRAND_RAISED_SURFACE,
  },
  navItemText: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 14,
    color: SOFT.textPrimary,
  },
  main: {
    flex: 1,
    flexDirection: 'column',
    minWidth: 0,
    backgroundColor: SOFT.canvas,
  },
  topBar: {
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BRAND_ADMIN_TABLE.rowDivider,
    backgroundColor: SOFT.canvas,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  topBarSignOut: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  topBarSignOutText: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 14,
    color: SOFT.textPrimary,
  },
  envChip: {
    ...BRAND_RAISED_SURFACE,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  envLabel: {
    fontFamily: FONTS.uiBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: SOFT.textPrimary,
  },
  content: {
    flex: 1,
    backgroundColor: SOFT.canvas,
  },
  contentContainer: {
    padding: SPACING.lg,
    gap: SPACING.lg,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    backgroundColor: SOFT.canvas,
  },
  mutedMessage: {
    fontFamily: FONTS.ui,
    fontSize: 15,
    color: SOFT.textMuted,
  },
  forbiddenTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 28,
    color: COLORS.error,
    marginBottom: SPACING.sm,
  },
  forbiddenText: {
    fontFamily: FONTS.ui,
    fontSize: 14,
    color: SOFT.textMuted,
    textAlign: 'center',
    maxWidth: 400,
  },
});
