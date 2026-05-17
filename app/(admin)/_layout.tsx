import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
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
  Modal,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { isAuthDisabled } from '@/lib/authMode';
import { BRAND_ADMIN_TABLE, BRAND_RAISED_SURFACE, COLORS, FONTS, SPACING } from '@/constants/theme';
import { HOME_SOFT_UI } from '@/themes';

const SOFT = HOME_SOFT_UI.colors;

// ── Sidebar constants ────────────────────────────────────────────────
const SIDEBAR_WIDTH_EXPANDED = 280;
const SIDEBAR_WIDTH_COLLAPSED = 72;
const DESKTOP_BREAKPOINT = 1024; // px
/** Shared height for desktop sidebar top row and main column top bar. */
const ADMIN_HEADER_HEIGHT = 56;

/**
 * Web only: animate sidebar width. shadcn sidebar uses
 * `transition-[left,right,width] duration-200 ease-linear` (see docs/sidebar.md).
 * RN layout toggles width in one frame otherwise — no tween on native without Reanimated.
 */
const SIDEBAR_WIDTH_TRANSITION_WEB = {
  transition: 'width 200ms linear',
} as ViewStyle;

// ── Icon map for nav items ───────────────────────────────────────────
type IconName = React.ComponentProps<typeof Ionicons>['name'];

const MAIN_NAV_ITEMS: { label: string; href: string; icon: IconName }[] = [
  { label: 'Overview', href: '/admin', icon: 'grid-outline' },
  { label: 'Promo Codes', href: '/admin/promo-codes', icon: 'pricetags-outline' },
  { label: 'Wallets', href: '/admin/wallets', icon: 'wallet-outline' },
];

// ── Sidebar context ──────────────────────────────────────────────────
interface SidebarContextValue {
  expanded: boolean;
  setExpanded: (v: boolean) => void;
  toggleExpanded: () => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
  toggleMobile: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

function useSidebarCtx() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebarCtx must be used within <SidebarProvider>');
  return ctx;
}

function SidebarProvider({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleExpanded = useCallback(() => setExpanded((p) => !p), []);
  const toggleMobile = useCallback(() => setMobileOpen((p) => !p), []);

  return (
    <SidebarContext.Provider
      value={{ expanded, setExpanded, toggleExpanded, mobileOpen, setMobileOpen, toggleMobile }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

// ── Sidebar component ────────────────────────────────────────────────
function AdminSidebar({ pathname }: { pathname: string }) {
  const { expanded } = useSidebarCtx();
  const normalizedPath = pathname.replace('/(admin)', '/admin');

  const isActive = (href: string) => {
    if (href === '/admin') return normalizedPath === '/admin';
    return normalizedPath.startsWith(href + '/') || normalizedPath === href;
  };

  const signOutActive = isActive('/admin/sign-out');

  return (
    <View
      style={[
        styles.sidebarBase,
        expanded ? styles.sidebarExpanded : styles.sidebarCollapsed,
        Platform.OS === 'web' ? SIDEBAR_WIDTH_TRANSITION_WEB : null,
      ]}
    >
      {/* ── Brand header (same height as main column top bar) ───────────── */}
      <View style={[styles.sidebarHeaderRow, !expanded && styles.sidebarHeaderRowCollapsed]}>
        {expanded ? (
          <View style={styles.brandTextWrap}>
            <Text style={styles.brandWordmark}>Backfire</Text>
            <Text style={styles.brandCapline}>ADMIN</Text>
          </View>
        ) : (
          <Text
            style={styles.brandMonogram}
            accessibilityRole="text"
            accessibilityLabel="Backfire Admin"
          >
            B
          </Text>
        )}
      </View>

      {/* ── Navigation ──────────────────────────────────── */}
      <ScrollView style={styles.sidebarScroll} contentContainerStyle={styles.navList}>
        {MAIN_NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href as any} asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={item.label}
                style={({ pressed }) => [
                  styles.navItem,
                  expanded ? styles.navItemExpanded : styles.navItemCollapsed,
                  active ? styles.navItemActive : undefined,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <View style={[styles.navItemInner, !expanded && styles.navItemInnerCollapsed]}>
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={active ? COLORS.primary : SOFT.textMuted}
                    style={styles.navIcon}
                  />
                  {expanded && (
                    <Text
                      style={[
                        styles.navLabel,
                        active ? styles.navLabelActive : undefined,
                      ]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                  )}
                </View>
              </Pressable>
            </Link>
          );
        })}
      </ScrollView>

      {/* ── Sign out (sidebar only) ─────────────────────── */}
      <View style={[styles.sidebarSignOutWrap, !expanded && styles.sidebarSignOutWrapCollapsed]}>
        <Link href="/admin/sign-out" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            style={({ pressed }) => [
              styles.navItem,
              expanded ? styles.navItemExpanded : styles.navItemCollapsed,
              signOutActive ? styles.navItemActive : undefined,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View style={[styles.navItemInner, !expanded && styles.navItemInnerCollapsed]}>
              <Ionicons
                name="log-out-outline"
                size={20}
                color={signOutActive ? COLORS.primary : SOFT.textMuted}
                style={styles.navIcon}
              />
              {expanded && (
                <Text
                  style={[styles.navLabel, signOutActive ? styles.navLabelActive : undefined]}
                  numberOfLines={1}
                >
                  Sign out
                </Text>
              )}
            </View>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

// ── Mobile sidebar overlay ───────────────────────────────────────────
function MobileSidebarOverlay({ pathname }: { pathname: string }) {
  const { mobileOpen, toggleMobile } = useSidebarCtx();
  const normalizedPath = pathname.replace('/(admin)', '/admin');

  const isActive = (href: string) => {
    if (href === '/admin') return normalizedPath === '/admin';
    return normalizedPath.startsWith(href + '/') || normalizedPath === href;
  };

  const signOutActive = isActive('/admin/sign-out');

  return (
    <Modal
      visible={mobileOpen}
      animationType="slide"
      transparent
      onRequestClose={toggleMobile}
    >
      <View style={styles.mobileOverlay}>
        <View style={styles.mobileSidebar}>
          {/* ── Brand header ────────────────────────────── */}
          <View style={styles.mobileSidebarHeader}>
            <View style={styles.mobileBrandWrap}>
              <Text style={styles.mobileBrandWordmark}>Backfire</Text>
              <Text style={styles.mobileBrandCapline}>ADMIN</Text>
            </View>
            <Pressable
              onPress={toggleMobile}
              accessibilityRole="button"
              accessibilityLabel="Close sidebar"
              style={({ pressed }) => [
                styles.mobileCloseBtn,
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Ionicons name="close-outline" size={24} color={SOFT.textPrimary} />
            </Pressable>
          </View>

          {/* ── Navigation ──────────────────────────────── */}
          <ScrollView style={styles.sidebarScroll} contentContainerStyle={styles.navList}>
            {MAIN_NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href as any} asChild>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    onPress={toggleMobile}
                    style={({ pressed }) => [
                      styles.navItem,
                      styles.navItemExpanded,
                      active ? styles.navItemActive : undefined,
                      { opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    <View style={styles.navItemInner}>
                      <Ionicons
                        name={item.icon}
                        size={20}
                        color={active ? COLORS.primary : SOFT.textMuted}
                        style={styles.navIcon}
                      />
                      <Text
                        style={[
                          styles.navLabel,
                          active ? styles.navLabelActive : undefined,
                        ]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                    </View>
                  </Pressable>
                </Link>
              );
            })}
          </ScrollView>

          <View style={styles.mobileSidebarSignOut}>
            <Link href="/admin/sign-out" asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sign out"
                onPress={toggleMobile}
                style={({ pressed }) => [
                  styles.navItem,
                  styles.navItemExpanded,
                  signOutActive ? styles.navItemActive : undefined,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <View style={styles.navItemInner}>
                  <Ionicons
                    name="log-out-outline"
                    size={20}
                    color={signOutActive ? COLORS.primary : SOFT.textMuted}
                    style={styles.navIcon}
                  />
                  <Text
                    style={[
                      styles.navLabel,
                      signOutActive ? styles.navLabelActive : undefined,
                    ]}
                    numberOfLines={1}
                  >
                    Sign out
                  </Text>
                </View>
              </Pressable>
            </Link>
          </View>
        </View>

        {/* ── tap backdrop to dismiss ──────────────────── */}
        <Pressable style={styles.mobileBackdrop} onPress={toggleMobile} />
      </View>
    </Modal>
  );
}

// ── Top bar ──────────────────────────────────────────────────────────
function AdminTopBar() {
  const { toggleMobile, toggleExpanded, expanded } = useSidebarCtx();
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  return (
    <View style={styles.topBar}>
      {isDesktop ? (
        <Pressable
          onPress={toggleExpanded}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          style={({ pressed }) => [
            styles.topBarIconBtn,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Ionicons
            name={expanded ? 'menu-outline' : 'menu-outline'}
            size={22}
            color={SOFT.textPrimary}
          />
        </Pressable>
      ) : (
        <Pressable
          onPress={toggleMobile}
          accessibilityRole="button"
          accessibilityLabel="Open navigation"
          style={({ pressed }) => [
            styles.topBarIconBtn,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Ionicons name="menu-outline" size={24} color={SOFT.textPrimary} />
        </Pressable>
      )}
    </View>
  );
}

// ── Admin shell (orchestrator) ───────────────────────────────────────
function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  return (
    <SidebarProvider>
      <View style={styles.root}>
        {/* Desktop sidebar */}
        {isDesktop && <AdminSidebar pathname={pathname} />}

        {/* Mobile sidebar overlay */}
        {!isDesktop && <MobileSidebarOverlay pathname={pathname} />}

        {/* Main content area */}
        <View style={styles.main}>
          <AdminTopBar />
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </SidebarProvider>
  );
}

// ── Admin access boundary ────────────────────────────────────────────
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

// ── Error fallback ───────────────────────────────────────────────────
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

// ── Layout export ────────────────────────────────────────────────────
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

// ── Styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Root ────────────────────────────────────────────
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: SOFT.canvas,
  },
  main: {
    flex: 1,
    flexDirection: 'column',
    minWidth: 0,
    backgroundColor: SOFT.canvas,
  },

  // ── Sidebar ─────────────────────────────────────────
  sidebarBase: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: BRAND_ADMIN_TABLE.rowDivider,
    backgroundColor: SOFT.canvas,
    paddingTop: 0,
    paddingBottom: SPACING.sm,
    overflow: 'hidden',
  },
  sidebarExpanded: {
    width: SIDEBAR_WIDTH_EXPANDED,
  },
  sidebarCollapsed: {
    width: SIDEBAR_WIDTH_COLLAPSED,
    alignItems: 'center',
  },

  // ── Sidebar top row (aligns with main `topBar` height) ───────────────
  sidebarHeaderRow: {
    height: ADMIN_HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BRAND_ADMIN_TABLE.rowDivider,
  },
  sidebarHeaderRowCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  sidebarSignOutWrap: {
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BRAND_ADMIN_TABLE.rowDivider,
    marginTop: SPACING.xs,
  },
  sidebarSignOutWrapCollapsed: {
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  brandTextWrap: {
    flexShrink: 1,
    gap: 2,
  },
  brandWordmark: {
    fontFamily: FONTS.displayBold,
    fontSize: 20,
    letterSpacing: -0.3,
    color: SOFT.textPrimary,
  },
  brandCapline: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 11,
    letterSpacing: 3,
    color: SOFT.textMuted,
  },
  brandMonogram: {
    fontFamily: FONTS.displayBold,
    fontSize: 22,
    letterSpacing: -0.4,
    color: SOFT.textPrimary,
  },

  // ── Navigation ──────────────────────────────────────
  sidebarScroll: {
    flex: 1,
  },
  navList: {
    gap: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },

  navItem: {
    borderRadius: 12,
  },
  /** Row inside nav Pressable — fixes web `<a>` children stacking without flex row. */
  navItemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  navItemInnerCollapsed: {
    flexGrow: 0,
    justifyContent: 'center',
    width: '100%',
  },
  navItemExpanded: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  navItemCollapsed: {
    paddingVertical: SPACING.md,
    paddingHorizontal: 0,
    justifyContent: 'center',
    width: SIDEBAR_WIDTH_COLLAPSED,
  },

  navItemActive: {
    backgroundColor: 'rgba(0, 123, 255, 0.10)',
  },

  navIcon: {
    width: 20,
    textAlign: 'center',
  },

  navLabel: {
    fontFamily: FONTS.uiMedium,
    fontSize: 14,
    color: SOFT.textPrimary,
    flexShrink: 1,
  },
  navLabelActive: {
    fontFamily: FONTS.uiSemibold,
    color: COLORS.primary,
  },

  // ── Mobile overlay ──────────────────────────────────
  mobileOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  mobileSidebar: {
    width: SIDEBAR_WIDTH_EXPANDED,
    flexDirection: 'column',
    alignSelf: 'stretch',
    backgroundColor: SOFT.canvas,
    paddingTop: 0,
    paddingBottom: SPACING.sm,
    zIndex: 2,
  },
  mobileSidebarSignOut: {
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BRAND_ADMIN_TABLE.rowDivider,
    marginTop: SPACING.xs,
  },
  mobileBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  mobileSidebarHeader: {
    height: ADMIN_HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BRAND_ADMIN_TABLE.rowDivider,
  },
  mobileBrandWrap: {
    gap: 2,
  },
  mobileBrandWordmark: {
    fontFamily: FONTS.displayBold,
    fontSize: 20,
    letterSpacing: -0.3,
    color: SOFT.textPrimary,
  },
  mobileBrandCapline: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 11,
    letterSpacing: 3,
    color: SOFT.textMuted,
  },
  mobileCloseBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    ...BRAND_RAISED_SURFACE,
  },

  // ── Top bar ─────────────────────────────────────────
  topBar: {
    height: ADMIN_HEADER_HEIGHT,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BRAND_ADMIN_TABLE.rowDivider,
    backgroundColor: SOFT.canvas,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  topBarIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    ...BRAND_RAISED_SURFACE,
  },

  // ── Content ─────────────────────────────────────────
  content: {
    flex: 1,
    backgroundColor: SOFT.canvas,
  },
  contentContainer: {
    padding: SPACING.lg,
    gap: SPACING.lg,
    flexGrow: 1,
  },

  // ── Utility / fallback ──────────────────────────────
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
