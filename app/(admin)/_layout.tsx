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
import { isAuthDisabled } from '@/lib/authMode';
import { COLORS, FONTS, SPACING } from '@/constants/theme';

const NAV_ITEMS = [
  { label: 'Overview', href: '/admin' as const },
  { label: 'Promo Codes', href: '/admin/promo-codes' as const },
  { label: 'Wallets', href: '/admin/wallets' as const },
];

function Sidebar({ pathname }: { pathname: string }) {
  const normalizedPathname = pathname.replace('/(admin)', '/admin');

  return (
    <View style={styles.sidebar}>
      <Text style={styles.sidebarTitle}>QuickFire Admin</Text>
      <View style={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const active =
            normalizedPathname === item.href || normalizedPathname.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href} asChild>
              <Pressable style={[styles.navItem, active && styles.navItemActive]}>
                <Text style={[styles.navItemText, active && styles.navItemTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </View>
  );
}

function ForbiddenScreen() {
  return (
    <View style={styles.center}>
      <Text style={styles.forbiddenTitle}>403 Forbidden</Text>
      <Text style={styles.forbiddenText}>
        You do not have permission to access the admin dashboard.
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
          <Text style={styles.envLabel}>ADMIN</Text>
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
    return (
      <View style={styles.center}>
        <Text>Admin dashboard is available on web.</Text>
      </View>
    );
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
        <Text>Loading...</Text>
      </View>
    );
  }

  if (userProfile && userProfile.role !== 'admin') {
    return <ForbiddenScreen />;
  }

  return (
    <AdminShell>
      {children}
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
      </Stack>
    </AdminAccessBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 220,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    backgroundColor: '#FAFAFA',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  sidebarTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 18,
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  nav: {
    gap: 4,
  },
  navItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  navItemActive: {
    backgroundColor: COLORS.primary,
  },
  navItemText: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 14,
    color: COLORS.text,
  },
  navItemTextActive: {
    color: '#FFFFFF',
  },
  main: {
    flex: 1,
    flexDirection: 'column',
    minWidth: 0,
  },
  topBar: {
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  envLabel: {
    fontFamily: FONTS.uiBold,
    fontSize: 11,
    letterSpacing: 1,
    color: COLORS.primary,
    backgroundColor: '#E8F4FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  content: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  contentContainer: {
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
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
    color: COLORS.mutedText,
  },
});
