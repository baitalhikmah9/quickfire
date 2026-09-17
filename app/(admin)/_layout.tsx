import {
  createContext,
  Fragment,
  useContext,
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from 'react';
import { useAuth, useUser } from '@clerk/clerk-expo';
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
  Animated,
  type ViewStyle,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { BackfireTitleLogo } from '@/components/BackfireTitleLogo';
import { isAuthDisabled } from '@/lib/authMode';
import { ADMIN_THEME } from '@/constants/adminTheme';
import { FONTS, SPACING } from '@/constants/theme';
import { landscapeStackScreenOptions } from '@/lib/navigation/landscapeStack';
import {
  adminHref,
  breadcrumbsForAdminPath,
  normalizeAdminPath,
  useSidebarCollapsed,
} from '@/lib/admin/shell';

// ── Sidebar constants ────────────────────────────────────────────────
const SIDEBAR_WIDTH_EXPANDED = 256;
const SIDEBAR_WIDTH_COLLAPSED = 66;
const DESKTOP_BREAKPOINT = 1024; // px
const MOBILE_SIDEBAR_ANIM_MS = 250;
const ADMIN_HEADER_HEIGHT = 56;
const BACKFIRE_APP_ICON = require('@/assets/icon.png');

const SIDEBAR_WIDTH_TRANSITION_WEB = {
  transition: 'width 200ms linear',
} as ViewStyle;

const SIDEBAR_ITEM_TRANSITION_WEB = {
  transition: 'width 200ms linear, padding 200ms linear',
} as ViewStyle;

const SIDEBAR_LABEL_TRANSITION_WEB = {
  transition: 'margin 200ms linear, opacity 200ms linear',
} as ViewStyle;

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface NavItemDef {
  label: string;
  href: string;
  icon: IconName;
  badge?: string;
}

interface NavGroupDef {
  title: string;
  items: NavItemDef[];
}

const NAV_GROUPS: NavGroupDef[] = [
  {
    title: 'General',
    items: [
      { label: 'Dashboard', href: '/admin', icon: 'grid-outline' },
      { label: 'Transactions', href: '/admin/transactions', icon: 'receipt-outline' },
      { label: 'Purchases', href: '/admin/purchases', icon: 'cart-outline' },
      { label: 'Promo Codes', href: '/admin/promo-codes', icon: 'pricetags-outline' },
      { label: 'Referrals', href: '/admin/referrals', icon: 'people-outline' },
      { label: 'Topics', href: '/admin/topics', icon: 'albums-outline' },
      { label: 'Wallets', href: '/admin/wallets', icon: 'wallet-outline' },
    ],
  },
  {
    title: 'Other',
    items: [
      { label: 'Audit Log', href: '/admin/audit', icon: 'shield-checkmark-outline' },
    ],
  },
];

const AFFILIATE_NAV_GROUPS: NavGroupDef[] = [
  {
    title: 'Affiliate',
    items: [{ label: 'My coupon', href: '/admin/affiliate', icon: 'pricetag-outline' }],
  },
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
  const [collapsed, setCollapsed, toggleCollapsed] = useSidebarCollapsed();
  const [mobileOpen, setMobileOpen] = useState(false);
  const expanded = !collapsed;
  const setExpanded = useCallback((next: boolean) => setCollapsed(!next), [setCollapsed]);
  const toggleExpanded = toggleCollapsed;
  const toggleMobile = useCallback(() => setMobileOpen((p) => !p), []);

  return (
    <SidebarContext.Provider
      value={{ expanded, setExpanded, toggleExpanded, mobileOpen, setMobileOpen, toggleMobile }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

// ── User profile pill (shadcn-admin NavUser) ─────────────────────────
function UserNavPill({ expanded = true }: { expanded?: boolean }) {
  const { user } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const email = user?.primaryEmailAddress?.emailAddress ?? 'admin@backfire.gg';
  const name = user?.fullName || user?.firstName || 'Admin';
  const initials = (name.slice(0, 1) + (user?.lastName?.slice(0, 1) || 'D')).toUpperCase();

  return (
    <View style={styles.userMenuRoot}>
      {menuOpen ? (
        <View accessibilityRole="menu" style={styles.userMenu}>
          <View style={styles.userMenuHeader}>
            <View style={styles.userMenuAvatar}>
              {user?.imageUrl ? (
                <Image source={{ uri: user.imageUrl }} style={styles.userAvatarImage} contentFit="cover" />
              ) : (
                <Text style={styles.userAvatarText}>{initials}</Text>
              )}
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>{name}</Text>
              <Text style={styles.userEmail} numberOfLines={1}>{email}</Text>
            </View>
          </View>
          <View style={styles.userMenuDivider} />
          <Link href={adminHref('/admin/sign-out') as any} asChild>
            <Pressable
              accessibilityRole="menuitem"
              accessibilityLabel="Sign out"
              style={styles.userMenuItem}
            >
              <Ionicons name="log-out-outline" size={16} color={ADMIN_THEME.colors.sidebarForeground} />
              <Text style={styles.userMenuItemText}>Log out</Text>
            </Pressable>
          </Link>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Account menu"
        accessibilityState={{ expanded: menuOpen }}
        onPress={() => setMenuOpen((open) => !open)}
        style={StyleSheet.flatten([
          styles.userPill,
          menuOpen && styles.userPillOpen,
          !expanded && styles.userPillCollapsed,
        ])}
      >
        <View style={[styles.userAvatar, !expanded && styles.userAvatarCollapsed]}>
          {user?.imageUrl ? (
            <Image
              source={{ uri: user.imageUrl }}
              style={styles.userAvatarImage}
              contentFit="cover"
              accessibilityLabel={name}
            />
          ) : (
            <Text style={styles.userAvatarText}>{initials}</Text>
          )}
        </View>
        {expanded ? (
          <>
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>{name}</Text>
              <Text style={styles.userEmail} numberOfLines={1}>{email}</Text>
            </View>
            <Ionicons name="chevron-expand-outline" size={16} color={ADMIN_THEME.colors.sidebarMuted} />
          </>
        ) : null}
      </Pressable>
    </View>
  );
}

// ── Sidebar component ────────────────────────────────────────────────
function AdminSidebar({
  pathname,
  navGroups = NAV_GROUPS,
  brandTitle = 'Backfire Admin',
}: {
  pathname: string;
  navGroups?: NavGroupDef[];
  brandTitle?: string;
}) {
  const { expanded, toggleExpanded } = useSidebarCtx();
  const normalizedPath = normalizeAdminPath(pathname);

  const isActive = (href: string) => {
    if (href === '/admin') return normalizedPath === '/admin';
    return normalizedPath.startsWith(href + '/') || normalizedPath === href;
  };

  return (
    <View
      style={[
        styles.sidebarBase,
        expanded ? styles.sidebarExpanded : styles.sidebarCollapsed,
        Platform.OS === 'web' ? SIDEBAR_WIDTH_TRANSITION_WEB : null,
      ]}
    >
      <Link
        href={adminHref(navGroups === AFFILIATE_NAV_GROUPS ? '/admin/affiliate' : '/admin') as any}
        asChild
      >
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={brandTitle}
          style={StyleSheet.flatten([
            styles.sidebarHeaderRow,
            !expanded && styles.sidebarHeaderRowCollapsed,
          ])}
        >
          {expanded ? (
            <BackfireTitleLogo width={132} accessibilityLabel={brandTitle} />
          ) : (
            <Image
              source={BACKFIRE_APP_ICON}
              testID="admin-sidebar-brand-icon"
              style={styles.brandIcon}
              contentFit="cover"
              accessibilityLabel={brandTitle}
            />
          )}
        </Pressable>
      </Link>

      {/* ── Navigation groups ──────────────────────────────────── */}
      <ScrollView style={styles.sidebarScroll} contentContainerStyle={styles.navList}>
        {navGroups.map((group) => (
          <View key={group.title} style={styles.navGroup}>
            <Text
              style={[
                styles.groupTitle,
                !expanded && styles.groupTitleCollapsed,
                Platform.OS === 'web' ? SIDEBAR_LABEL_TRANSITION_WEB : null,
              ]}
            >
              {group.title}
            </Text>
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={adminHref(item.href) as any} asChild>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    testID={`admin-sidebar-nav-${item.label}`}
                    style={StyleSheet.flatten([
                      styles.navLink,
                      styles.navItem,
                      active && styles.navItemActive,
                      !expanded && styles.navItemCollapsed,
                      Platform.OS === 'web' ? SIDEBAR_ITEM_TRANSITION_WEB : null,
                    ])}
                  >
                    <View
                      testID={`admin-sidebar-nav-icon-${item.label}`}
                      style={styles.navIconBox}
                    >
                      <Ionicons
                        name={item.icon}
                        size={16}
                        color={
                          active
                            ? ADMIN_THEME.colors.sidebarAccentForeground
                            : ADMIN_THEME.colors.sidebarMuted
                        }
                      />
                    </View>
                    <Text
                      style={[
                        styles.navLabel,
                        active && styles.navLabelActive,
                        !expanded && styles.navLabelCollapsed,
                        Platform.OS === 'web' ? SIDEBAR_LABEL_TRANSITION_WEB : null,
                      ]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                    {expanded && item.badge && (
                      <View style={styles.navBadge}>
                        <Text style={styles.navBadgeText}>{item.badge}</Text>
                      </View>
                    )}
                  </Pressable>
                </Link>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* ── User Footer ─────────────────────── */}
      <View style={[styles.sidebarFooter, !expanded && styles.sidebarFooterCollapsed]}>
        <UserNavPill expanded={expanded} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Toggle sidebar rail"
        onPress={toggleExpanded}
        style={styles.sidebarRail}
      />
    </View>
  );
}

// ── Mobile sidebar overlay ───────────────────────────────────────────
function MobileSidebarOverlay({
  pathname,
  navGroups = NAV_GROUPS,
  brandTitle = 'Backfire Admin',
}: {
  pathname: string;
  navGroups?: NavGroupDef[];
  brandTitle?: string;
}) {
  const { mobileOpen, toggleMobile, setMobileOpen } = useSidebarCtx();
  const [presented, setPresented] = useState(false);
  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH_EXPANDED)).current;

  const normalizedPath = normalizeAdminPath(pathname);

  const isActive = (href: string) => {
    if (href === '/admin') return normalizedPath === '/admin';
    return normalizedPath.startsWith(href + '/') || normalizedPath === href;
  };

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  useLayoutEffect(() => {
    if (mobileOpen) {
      translateX.setValue(-SIDEBAR_WIDTH_EXPANDED);
      setPresented(true);
    }
  }, [mobileOpen, translateX]);

  useEffect(() => {
    if (!presented) return undefined;

    if (mobileOpen) {
      const anim = Animated.timing(translateX, {
        toValue: 0,
        duration: MOBILE_SIDEBAR_ANIM_MS,
        useNativeDriver: true,
      });
      anim.start();
      return () => anim.stop();
    }

    const anim = Animated.timing(translateX, {
      toValue: -SIDEBAR_WIDTH_EXPANDED,
      duration: MOBILE_SIDEBAR_ANIM_MS,
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished) setPresented(false);
    });
    return () => anim.stop();
  }, [mobileOpen, presented, translateX]);

  return (
    <Modal
      visible={presented}
      animationType="none"
      transparent
      onRequestClose={toggleMobile}
    >
      <View style={styles.mobileOverlay}>
        <Pressable style={styles.mobileBackdrop} onPress={toggleMobile} />
        <Animated.View
          style={[
            styles.mobileSidebar,
            { transform: [{ translateX }] },
          ]}
        >
          {/* ── Brand header ────────────────────────────── */}
          <View style={styles.mobileSidebarHeader}>
            <View style={styles.brandHeaderLeft}>
              <BackfireTitleLogo width={132} accessibilityLabel={brandTitle} />
            </View>
            <Pressable
              onPress={toggleMobile}
              accessibilityRole="button"
              accessibilityLabel="Close sidebar"
              style={({ pressed }) => [
                styles.mobileCloseBtn,
                pressed && styles.mobileCloseBtnPressed,
              ]}
            >
              <Ionicons name="close-outline" size={20} color={ADMIN_THEME.colors.foreground} />
            </Pressable>
          </View>

          {/* ── Navigation ──────────────────────────────── */}
          <ScrollView style={styles.sidebarScroll} contentContainerStyle={styles.navList}>
            {navGroups.map((group) => (
              <View key={group.title} style={styles.navGroup}>
                <Text style={styles.groupTitle}>{group.title}</Text>
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link key={item.href} href={adminHref(item.href) as any} asChild>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={item.label}
                        onPress={toggleMobile}
                        style={StyleSheet.flatten([
                          styles.navLink,
                          styles.navItem,
                          active && styles.navItemActive,
                        ])}
                      >
                        <View style={styles.navIconBox}>
                          <Ionicons
                            name={item.icon}
                            size={16}
                            color={
                              active
                                ? ADMIN_THEME.colors.sidebarAccentForeground
                                : ADMIN_THEME.colors.sidebarMuted
                            }
                          />
                        </View>
                        <Text
                          style={[
                            styles.navLabel,
                            active && styles.navLabelActive,
                          ]}
                          numberOfLines={1}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    </Link>
                  );
                })}
              </View>
            ))}
          </ScrollView>

          <View style={styles.sidebarFooter}>
            <UserNavPill expanded />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── Top bar (shadcn-admin header) ────────────────────────────────────
function AdminTopBar({ pathname, affiliate = false }: { pathname: string; affiliate?: boolean }) {
  const { toggleMobile, toggleExpanded } = useSidebarCtx();
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const crumbs = breadcrumbsForAdminPath(pathname, { affiliate });

  return (
    <View style={styles.topBar}>
      <View style={styles.topBarLeft}>
        <Pressable
          onPress={isDesktop ? toggleExpanded : toggleMobile}
          accessibilityRole="button"
          accessibilityLabel={isDesktop ? 'Toggle sidebar' : 'Open navigation'}
          testID="admin-sidebar-trigger"
          style={({ pressed }) => [
            styles.topBarIconBtn,
            pressed && styles.topBarIconBtnPressed,
          ]}
        >
          <Feather name="sidebar" size={16} color={ADMIN_THEME.colors.foreground} />
        </Pressable>

        <View style={styles.topNavDivider} />

        <View style={styles.breadcrumbRow} accessibilityRole="text" accessibilityLabel="Breadcrumb">
          {crumbs.map((crumb, index) => {
            const last = index === crumbs.length - 1;
            return (
              <Fragment key={`${crumb.label}-${index}`}>
                {index > 0 ? <Text style={styles.breadcrumbSep}>/</Text> : null}
                {last || !crumb.href ? (
                  <Text style={styles.breadcrumbCurrent} numberOfLines={1}>
                    {crumb.label}
                  </Text>
                ) : (
                  <Link href={adminHref(crumb.href) as any} asChild>
                    <Pressable accessibilityRole="link" accessibilityLabel={crumb.label}>
                      <Text style={styles.breadcrumbLink} numberOfLines={1}>
                        {crumb.label}
                      </Text>
                    </Pressable>
                  </Link>
                )}
              </Fragment>
            );
          })}
        </View>
      </View>

    </View>
  );
}

// ── Admin shell (orchestrator) ───────────────────────────────────────
function AdminShell({
  children,
  navGroups = NAV_GROUPS,
  brandTitle = 'Backfire Admin',
  affiliate = false,
}: {
  children: React.ReactNode;
  navGroups?: NavGroupDef[];
  brandTitle?: string;
  affiliate?: boolean;
}) {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  return (
    <SidebarProvider>
      <View style={styles.root}>
        {isDesktop && (
          <AdminSidebar pathname={pathname} navGroups={navGroups} brandTitle={brandTitle} />
        )}
        {!isDesktop && (
          <MobileSidebarOverlay pathname={pathname} navGroups={navGroups} brandTitle={brandTitle} />
        )}

        <View style={[styles.main, isDesktop && styles.mainInset]}>
          <AdminTopBar pathname={pathname} affiliate={affiliate} />
          <View style={styles.content}>{children}</View>
        </View>
      </View>
    </SidebarProvider>
  );
}

// ── Admin access boundary ────────────────────────────────────────────
function isAffiliateDashboard(
  value: unknown
): value is { codes: { code: string }[] } {
  return (
    !!value &&
    typeof value === 'object' &&
    Array.isArray((value as { codes?: unknown }).codes) &&
    (value as { codes: unknown[] }).codes.length > 0
  );
}

export function AdminAccessBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useAuth();
  const authDisabled = isAuthDisabled();
  const shouldLoadProfile = Platform.OS === 'web' && isLoaded && (isSignedIn || authDisabled);
  const userProfile = useQuery(
    api.users.getCurrentProfile,
    shouldLoadProfile ? {} : 'skip'
  );
  const shouldLoadAffiliate =
    shouldLoadProfile && userProfile !== undefined && userProfile !== null && userProfile.role !== 'admin';
  const affiliateDashboard = useQuery(
    api.affiliate.getMyDashboard,
    shouldLoadAffiliate ? {} : 'skip'
  );

  if (Platform.OS !== 'web') {
    return <Redirect href="/(app)/" />;
  }

  if (!isLoaded && !authDisabled) {
    return null;
  }

  if (!isSignedIn && !authDisabled) {
    return <Redirect href={adminHref('/admin/sign-in') as any} />;
  }

  if (userProfile === undefined) {
    return (
      <View style={styles.center}>
        <Text style={styles.mutedMessage}>Loading...</Text>
      </View>
    );
  }

  if (userProfile === null) {
    return <Redirect href={adminHref('/admin/sign-in') as any} />;
  }

  if (userProfile.role === 'admin') {
    return (
      <AdminShell>
        <ErrorBoundary fallback={<AdminBackendUnavailableScreen />}>
          {children}
        </ErrorBoundary>
      </AdminShell>
    );
  }

  if (shouldLoadAffiliate && affiliateDashboard === undefined) {
    return (
      <View style={styles.center}>
        <Text style={styles.mutedMessage}>Loading...</Text>
      </View>
    );
  }

  if (isAffiliateDashboard(affiliateDashboard)) {
    const normalizedPath = normalizeAdminPath(pathname);
    if (normalizedPath !== '/admin/affiliate' && normalizedPath !== '/admin/sign-out') {
      return <Redirect href={adminHref('/admin/affiliate') as any} />;
    }
    return (
      <AdminShell navGroups={AFFILIATE_NAV_GROUPS} brandTitle="Backfire" affiliate>
        <ErrorBoundary fallback={<AdminBackendUnavailableScreen />}>
          {children}
        </ErrorBoundary>
      </AdminShell>
    );
  }

  return <Redirect href={adminHref('/admin/sign-in') as any} />;
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
      <Stack screenOptions={landscapeStackScreenOptions}>
        <Stack.Screen name="index" />
        <Stack.Screen name="transactions" />
        <Stack.Screen name="purchases" />
        <Stack.Screen name="purchases/[purchaseId]" />
        <Stack.Screen name="promo-codes" />
        <Stack.Screen name="referrals" />
        <Stack.Screen name="topics" />
        <Stack.Screen name="wallets" />
        <Stack.Screen name="audit" />
        <Stack.Screen name="affiliate" />
        <Stack.Screen name="sign-out" />
      </Stack>
    </AdminAccessBoundary>
  );
}

// ── Styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
    overflow: 'hidden',
    backgroundColor: ADMIN_THEME.colors.sidebar,
    ...(Platform.OS === 'web' ? ({ height: '100%' } as ViewStyle) : null),
  },
  main: {
    flex: 1,
    flexDirection: 'column',
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden',
    backgroundColor: ADMIN_THEME.colors.background,
  },
  mainInset: {
    marginVertical: 8,
    marginRight: 8,
    marginLeft: 0,
    borderRadius: ADMIN_THEME.radius.xl,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 1px 3px rgba(15, 23, 42, 0.16)' } as ViewStyle)
      : null),
  },

  // ── Sidebar ─────────────────────────────────────────
  sidebarBase: {
    position: 'relative',
    padding: 8,
    backgroundColor: ADMIN_THEME.colors.sidebar,
    overflow: 'visible',
    justifyContent: 'space-between',
    minHeight: 0,
  },
  sidebarRail: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: -8,
    width: 16,
    zIndex: 20,
  },
  sidebarExpanded: {
    width: SIDEBAR_WIDTH_EXPANDED,
  },
  sidebarCollapsed: {
    width: SIDEBAR_WIDTH_COLLAPSED,
  },

  sidebarHeaderRow: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderRadius: ADMIN_THEME.radius.md,
  },
  sidebarHeaderRowCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: ADMIN_THEME.radius.md,
    marginRight: 0,
  },

  // ── Nav Groups ──────────────────────────────────────
  sidebarScroll: {
    flex: 1,
  },
  navList: {
    padding: 0,
  },
  navGroup: {
    gap: 4,
    padding: 8,
  },
  groupTitle: {
    height: 32,
    fontFamily: FONTS.uiMedium,
    fontSize: 12,
    color: ADMIN_THEME.colors.sidebarMuted,
    paddingHorizontal: 8,
    textAlignVertical: 'center',
  },
  groupTitleCollapsed: {
    marginTop: -32,
    opacity: 0,
  },
  navLink: {
    width: '100%',
    textDecorationLine: 'none' as any,
  },
  navItem: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderRadius: ADMIN_THEME.radius.md,
    width: '100%',
    overflow: 'hidden',
  },
  navItemCollapsed: {
    width: 32,
  },
  navItemActive: {
    backgroundColor: ADMIN_THEME.colors.sidebarAccent,
  },
  navIconBox: {
    width: 16,
    height: 16,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    flexShrink: 0,
    alignSelf: 'center',
    marginLeft: 8,
    fontFamily: FONTS.uiMedium,
    fontSize: 14,
    color: ADMIN_THEME.colors.sidebarForeground,
    ...(Platform.OS === 'web' ? ({ whiteSpace: 'nowrap' } as ViewStyle) : null),
  },
  navLabelCollapsed: {
    opacity: 0,
  },
  navLabelActive: {
    fontFamily: FONTS.uiSemibold,
    color: ADMIN_THEME.colors.sidebarAccentForeground,
  },
  navBadge: {
    backgroundColor: ADMIN_THEME.colors.primary,
    borderRadius: 9999,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 'auto',
  },
  navBadgeText: {
    fontFamily: FONTS.uiMedium,
    fontSize: 11,
    color: ADMIN_THEME.colors.primaryForeground,
  },

  // ── User Footer ─────────────────────────────────────
  sidebarFooter: {
    padding: 8,
  },
  sidebarFooterCollapsed: {
    alignItems: 'center',
  },
  userMenuRoot: {
    position: 'relative',
    width: '100%',
  },
  userMenu: {
    position: 'absolute',
    left: 0,
    bottom: 56,
    width: 224,
    padding: 4,
    borderWidth: 1,
    borderColor: ADMIN_THEME.colors.border,
    borderRadius: ADMIN_THEME.radius.lg,
    backgroundColor: ADMIN_THEME.colors.card,
    zIndex: 30,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 8px 24px rgba(51, 51, 51, 0.14)' } as ViewStyle)
      : null),
  },
  userMenuHeader: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  userMenuAvatar: {
    width: 32,
    height: 32,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: ADMIN_THEME.colors.sidebarBorder,
    borderRadius: ADMIN_THEME.radius.md,
    backgroundColor: ADMIN_THEME.colors.sidebar,
  },
  userMenuDivider: {
    height: 1,
    marginVertical: 4,
    backgroundColor: ADMIN_THEME.colors.border,
  },
  userMenuItem: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    borderRadius: ADMIN_THEME.radius.md,
  },
  userMenuItemText: {
    fontFamily: FONTS.uiMedium,
    fontSize: 13,
    color: ADMIN_THEME.colors.sidebarForeground,
  },
  userPill: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: ADMIN_THEME.colors.sidebarBorder,
    borderRadius: ADMIN_THEME.radius.lg,
    backgroundColor: ADMIN_THEME.colors.sidebarAccent,
    width: '100%',
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 1px 2px rgba(51, 51, 51, 0.08)' } as ViewStyle)
      : null),
  },
  userPillOpen: {
    borderColor: ADMIN_THEME.colors.sidebarForeground,
  },
  userPillCollapsed: {
    height: 32,
    justifyContent: 'center',
    padding: 0,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: ADMIN_THEME.radius.md,
    backgroundColor: ADMIN_THEME.colors.sidebarAccent,
    borderWidth: 1,
    borderColor: ADMIN_THEME.colors.sidebarBorder,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  userAvatarCollapsed: {
    marginRight: 0,
  },
  userAvatarImage: {
    width: '100%',
    height: '100%',
  },
  userAvatarText: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 12,
    color: ADMIN_THEME.colors.sidebarAccentForeground,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 2,
  },
  userName: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 13,
    lineHeight: 16,
    color: ADMIN_THEME.colors.sidebarForeground,
  },
  userEmail: {
    fontFamily: FONTS.ui,
    fontSize: 11,
    lineHeight: 14,
    color: ADMIN_THEME.colors.sidebarMuted,
  },

  // ── Mobile overlay ──────────────────────────────────
  mobileOverlay: {
    flex: 1,
  },
  mobileBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 1,
  },
  mobileSidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH_EXPANDED,
    backgroundColor: ADMIN_THEME.colors.sidebar,
    zIndex: 2,
    borderRightWidth: 1,
    borderRightColor: ADMIN_THEME.colors.sidebarBorder,
  },
  mobileSidebarHeader: {
    height: ADMIN_HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_THEME.colors.sidebarBorder,
  },
  brandHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  mobileCloseBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: ADMIN_THEME.radius.md,
    borderWidth: 1,
    borderColor: ADMIN_THEME.colors.border,
    backgroundColor: ADMIN_THEME.colors.card,
  },
  mobileCloseBtnPressed: {
    backgroundColor: ADMIN_THEME.colors.secondary,
  },

  // ── Top bar ─────────────────────────────────────────
  topBar: {
    height: ADMIN_HEADER_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_THEME.colors.border,
    backgroundColor: ADMIN_THEME.colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarIconBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: ADMIN_THEME.radius.md,
  },
  topBarIconBtnPressed: {
    backgroundColor: ADMIN_THEME.colors.secondary,
  },
  topNavDivider: {
    width: 1,
    height: 18,
    backgroundColor: ADMIN_THEME.colors.border,
    marginHorizontal: 12,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    minWidth: 0,
    gap: 8,
  },
  breadcrumbSep: {
    fontFamily: FONTS.ui,
    fontSize: 13,
    color: ADMIN_THEME.colors.mutedForeground,
  },
  breadcrumbLink: {
    fontFamily: FONTS.ui,
    fontSize: 13,
    color: ADMIN_THEME.colors.mutedForeground,
  },
  breadcrumbCurrent: {
    fontFamily: FONTS.uiMedium,
    fontSize: 13,
    color: ADMIN_THEME.colors.foreground,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userTopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: ADMIN_THEME.radius.lg,
  },
  userTopButtonPressed: {
    backgroundColor: ADMIN_THEME.colors.secondary,
  },
  userTopInfo: {
    alignItems: 'flex-start',
    gap: 1,
    maxWidth: 160,
  },
  userTopName: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 12,
    color: ADMIN_THEME.colors.foreground,
  },
  userTopEmail: {
    fontFamily: FONTS.ui,
    fontSize: 11,
    color: ADMIN_THEME.colors.mutedForeground,
  },
  userAvatarTop: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    backgroundColor: ADMIN_THEME.colors.secondary,
    borderWidth: 1,
    borderColor: ADMIN_THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarTopText: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 12,
    color: ADMIN_THEME.colors.foreground,
  },

  // ── Content ─────────────────────────────────────────
  content: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    overflow: 'hidden',
    backgroundColor: ADMIN_THEME.colors.background,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },

  // ── Fallback ────────────────────────────────────────
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    backgroundColor: ADMIN_THEME.colors.background,
  },
  mutedMessage: {
    fontFamily: FONTS.ui,
    fontSize: 15,
    color: ADMIN_THEME.colors.mutedForeground,
  },
  forbiddenTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 24,
    color: ADMIN_THEME.colors.destructive,
    marginBottom: SPACING.sm,
  },
  forbiddenText: {
    fontFamily: FONTS.ui,
    fontSize: 14,
    color: ADMIN_THEME.colors.mutedForeground,
    textAlign: 'center',
    maxWidth: 400,
  },
});
