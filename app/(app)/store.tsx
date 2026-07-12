import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import { Redirect, useRouter } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  SPACING,
  FONTS,
  LAYOUT,
  SOFT_SURFACE_FACE,
  softSurfaceLift,
  getStandardChromeTopPadding,
} from '@/constants';
import { ScreenContent } from '@/components/ScreenContent';
import { HubTokenChip } from '@/components/HubTokenChip';
import {
  formatTokens,
  buildDisplayBundles,
  type DisplayBundle,
} from '@/features/play/storeBundles';
import { getRowDirection } from '@/lib/i18n/direction';
import { useI18n } from '@/lib/i18n/useI18n';
import { useViewportLayout } from '@/lib/hooks/useViewportLayout';
import { isAuthDisabled } from '@/lib/authMode';
import { usePlayStore } from '@/store/play';
import { useTokenPurchases } from '@/lib/hooks/useTokenPurchases';
import { HOME_SOFT_UI } from '@/themes';

const T = HOME_SOFT_UI;

const SIGN_IN_TO_REDEEM_MESSAGE = 'Sign in to redeem promo codes.';

const PROMO_ERROR_MESSAGES: Record<string, string> = {
  invalid_code: 'That code is invalid or expired.',
  inactive: 'That code is no longer active.',
  not_yet_active: 'That code is not active yet.',
  expired: 'That code has expired.',
  usage_cap: 'That code has already been fully redeemed.',
  per_user_cap: 'You have already redeemed that code.',
  already_redeemed: 'You have already redeemed that code.',
  account_restricted: 'That code is restricted to another account.',
  idempotency_required: 'Please try redeeming that code again.',
  rate_limited: 'Too many redemption attempts. Please try again later.',
};

function getPromoErrorMessage(error?: string) {
  if (!error) return 'Unable to redeem that code. Please try again.';
  return PROMO_ERROR_MESSAGES[error] ?? 'Unable to redeem that code. Please try again.';
}

// ── Helpers ────────────────────────────────────────────────────────────────

const IS_NATIVE_PLATFORM = Platform.OS === 'ios' || Platform.OS === 'android';

// ── Sub-components ─────────────────────────────────────────────────────────

function BundleCard({
  bundle,
  onPress,
  isPurchasing,
  isPurchaseUnavailable,
  compact,
  tight,
}: {
  bundle: DisplayBundle;
  onPress: () => void;
  isPurchasing: boolean;
  isPurchaseUnavailable: boolean;
  compact: boolean;
  tight: boolean;
}) {
  const surface = T.colors.surface;
  const textPrimary = T.colors.textPrimary;
  const textMuted = T.colors.textMuted;
  const accentGlow = T.colors.accentGlow;

  const buyDisabled = isPurchasing || isPurchaseUnavailable;
  const buyLabel = isPurchasing
    ? '...'
    : isPurchaseUnavailable
      ? '—'
      : 'BUY';

  return (
    <View style={styles.bundleCardWrapper}>
      <Pressable
        style={({ pressed }) => [
          styles.bundleCard,
          compact && styles.bundleCardCompact,
          tight && styles.bundleCardTight,
          SOFT_SURFACE_FACE,
          softSurfaceLift(),
          {
            backgroundColor: surface,
            opacity: buyDisabled ? 0.6 : pressed ? 0.96 : 1,
            transform: pressed && !buyDisabled ? [{ scale: 0.98 }] : [{ scale: 1 }],
          },
        ]}
        onPress={buyDisabled ? undefined : onPress}
        disabled={buyDisabled}
      >
        <Text style={[styles.bundleAmount, compact && styles.bundleAmountCompact, { color: textPrimary }]}>
          {formatTokens(bundle.tokensGranted)}
        </Text>
        <Text style={[styles.bundleLabel, compact && styles.bundleLabelCompact, { color: textMuted }]}>
          TOKENS
        </Text>

        {/* Bonus display not available from catalog; kept for layout parity */}
        <View style={styles.bundleBonusSpacer} />

        <Text style={[styles.bundlePrice, compact && styles.bundlePriceCompact, { color: textPrimary }]}>
          {bundle.priceLabel}
        </Text>

        <View
          style={[
            styles.buyButton,
            compact && styles.buyButtonCompact,
            SOFT_SURFACE_FACE,
            { backgroundColor: isPurchaseUnavailable ? textMuted : accentGlow },
          ]}
        >
          {isPurchasing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.buyButtonText}>{buyLabel}</Text>
          )}
        </View>
      </Pressable>
    </View>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────

export default function StoreScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const authDisabled = isAuthDisabled();
  const { direction, t } = useI18n();
  const rowDir = getRowDirection(direction);
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const hubMaxWidth = useViewportLayout().contentMaxWidth('hub');
  const isCompactViewport = height < 740 || width < 390;
  const isTightViewport = height < 660;

  // Local play store (fallback token display).
  const localTokens = usePlayStore((state) => state.tokens);

  // Convex queries.
  const catalog = useQuery(api.payments.getCatalog);
  const balanceData = useQuery(api.wallet.getBalance, {});

  // Promo redemption.
  const redeemPromoCode = useMutation(api.promo.redeemCode);

  // Display token balance: signed-out users always see 0.
  const displayTokens =
    !authDisabled && !isSignedIn
      ? 0
      : balanceData && typeof balanceData.balance === 'number'
        ? balanceData.balance
        : localTokens;
  const formattedDisplayTokens = formatTokens(displayTokens);

  // ── RevenueCat purchases ────────────────────────────────────────────────

  const catalogProducts = useMemo(() => {
    if (!catalog) return undefined;
    return catalog.map((p) => ({
      productKey: p.productKey,
      tokensGranted: p.tokensGranted,
      iosProductId: p.iosProductId,
      androidProductId: p.androidProductId,
      sortOrder: p.sortOrder,
    }));
  }, [catalog]);

  const {
    products: nativeProducts,
    isReady: rcReady,
    isPurchasing,
    isSupported: rcSupported,
    error: rcError,
    purchase,
  } = useTokenPurchases({
    catalog: catalogProducts,
    enabled: IS_NATIVE_PLATFORM && !!catalogProducts?.length,
  });

  const isPurchaseUnavailable = !IS_NATIVE_PLATFORM || !rcReady || !!rcError;
  const purchaseUnavailableReason = !IS_NATIVE_PLATFORM
    ? 'Available on iOS & Android'
    : rcError
      ? rcError
      : !rcReady
        ? 'Loading store…'
        : null;

  // Build display bundles from Convex catalog + native prices.
  const displayBundles: DisplayBundle[] = useMemo(() => {
    if (!catalog) return [];
    return buildDisplayBundles(catalog, nativeProducts, Platform.OS);
  }, [catalog, nativeProducts]);

  // ── Buy handler ─────────────────────────────────────────────────────────

  const [buyingKey, setBuyingKey] = useState<string | null>(null);

  const onBuyBundle = useCallback(
    async (bundle: DisplayBundle) => {
      if (!rcSupported || !rcReady || !catalogProducts) {
        if (!rcSupported) {
          Alert.alert('Unavailable', 'In-app purchases are only available on iOS and Android.');
        } else if (!rcReady) {
          Alert.alert('Not Ready', 'The store is still loading. Please try again shortly.');
        }
        return;
      }

      const catalogProduct = catalogProducts.find(
        (p) => p.productKey === bundle.productKey
      );
      if (!catalogProduct) {
        Alert.alert('Error', 'This product is no longer available.');
        return;
      }

      setBuyingKey(bundle.productKey);
      try {
        await purchase(catalogProduct);
        Alert.alert(
          'Purchase Complete',
          `${formatTokens(bundle.tokensGranted)} tokens have been added to your balance.`
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '';
        if (message.toLowerCase().includes('cancelled')) {
          return; // Silent on user cancellation.
        }
        Alert.alert('Purchase Failed', message || 'An unexpected error occurred. Please try again.');
      } finally {
        setBuyingKey(null);
      }
    },
    [catalogProducts, purchase, rcReady, rcSupported]
  );

  // ── Voucher / promo redemption ──────────────────────────────────────────

  const [voucherCode, setVoucherCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');

  const handleVoucherChange = useCallback(
    (text: string) => {
      setVoucherCode(text);
      if (promoError) setPromoError('');
      if (promoSuccess) setPromoSuccess('');
    },
    [promoError, promoSuccess]
  );

  const applyVoucher = useCallback(async () => {
    setPromoError('');
    setPromoSuccess('');

    const code = voucherCode.trim();
    if (!code || isRedeeming) {
      if (!code) setPromoError(t('store.voucherInvalid'));
      return;
    }

    if (!isSignedIn) {
      Alert.alert(SIGN_IN_TO_REDEEM_MESSAGE);
      router.push('/(auth)/sign-in');
      return;
    }

    setIsRedeeming(true);
    try {
      const result = await redeemPromoCode({
        code,
        clientRequestId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      });

      if (!result.success) {
        setPromoError(getPromoErrorMessage(result.error));
        return;
      }

      // Do NOT grant tokens locally — the Convex mutation already patched the
      // wallet balance, and the useQuery subscription will update automatically.
      setVoucherCode('');

      // If duplicate (idempotent replay), don't imply new tokens were added
      if (result.duplicate) {
        setPromoSuccess('That code has already been redeemed.');
        return;
      }

      const tokenHint =
        typeof result.tokensGranted === 'number' && result.tokensGranted > 0
          ? ` ${formatTokens(result.tokensGranted)} tokens added.`
          : '';
      setPromoSuccess(`${t('store.voucherSuccess')}${tokenHint}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      setPromoError(
        message.includes('Not authenticated')
          ? SIGN_IN_TO_REDEEM_MESSAGE
          : 'Unable to redeem that code. Please try again.'
      );
    } finally {
      setIsRedeeming(false);
    }
  }, [isRedeeming, isSignedIn, redeemPromoCode, router, t, voucherCode]);

  // ── Navigation ──────────────────────────────────────────────────────────

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(app)/');
  }, [router]);

  // ── Auth guards ─────────────────────────────────────────────────────────

  if (!isLoaded && !authDisabled) {
    return null;
  }

  if (!isSignedIn && !authDisabled) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  // ── Render ──────────────────────────────────────────────────────────────

  const canvas = T.colors.canvas;
  const surface = T.colors.surface;
  const textPrimary = T.colors.textPrimary;
  const textMuted = T.colors.textMuted;

  return (
    <SafeAreaView
      collapsable={false}
      edges={['top', 'bottom', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: canvas }]}
    >
      <ScreenContent fullWidth style={styles.viewport}>
        {/* One frame owns outer gutter + max width so header controls and cards share edges. */}
        <View style={[styles.contentFrame, { maxWidth: hubMaxWidth }]}>
        {/* ── Header ─────────────────────────────────────── */}
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
              <Ionicons
                name={direction === 'rtl' ? 'chevron-forward' : 'chevron-back'}
                size={22}
                color={textPrimary}
              />
            </Pressable>
          </View>
          <View style={styles.headerCenter}>
            <Text style={[styles.title, { color: textPrimary }]}>STORE</Text>
          </View>
          <View style={[styles.headerSide, styles.headerSideRight]}>
            <HubTokenChip
              label={t('common.tokens')}
              value={formattedDisplayTokens}
              rowDirection={rowDir}
              variant="softUi"
              accessibilityLabel={`${t('common.tokens')}: ${formattedDisplayTokens}`}
            />
          </View>
        </View>

        <View
          style={styles.pageContent}
        >
          {/* Equal flex spacers center the store body under the header. */}
          <View style={styles.pageSpacer} />

          <View
            style={[
              styles.storeBody,
              isCompactViewport && styles.storeBodyCompact,
              isTightViewport && styles.storeBodyTight,
            ]}
          >
            {/* ── Status banner (non-native / error) ──────── */}
            {!IS_NATIVE_PLATFORM && (
              <View style={[styles.statusBanner, { backgroundColor: surface }]}>
                <Ionicons name="information-circle-outline" size={16} color={textMuted} />
                <Text style={[styles.statusBannerText, { color: textMuted }]}>
                  In-app purchases are only available on iOS and Android. Promo codes can be
                  redeemed on any platform.
                </Text>
              </View>
            )}
            {rcError && (
              <View style={[styles.statusBanner, styles.statusBannerWarning, { backgroundColor: surface }]}>
                <Ionicons name="warning-outline" size={16} color="#D32F2F" />
                <Text style={[styles.statusBannerText, { color: '#D32F2F' }]}>
                  {rcError}
                </Text>
              </View>
            )}
            {IS_NATIVE_PLATFORM && !rcReady && !rcError && (
              <View style={[styles.statusBanner, { backgroundColor: surface }]}>
                <ActivityIndicator size="small" color={textMuted} />
                <Text style={[styles.statusBannerText, { color: textMuted }]}>
                  {purchaseUnavailableReason}
                </Text>
              </View>
            )}

            {/* ── Loading skeleton ───────────────────────── */}
            {!catalog && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={textMuted} />
                <Text style={[styles.loadingText, { color: textMuted }]}>Loading store…</Text>
              </View>
            )}

            {/* ── Bundle cards ───────────────────────────── */}
            {catalog && (
              <View style={[styles.bundlesContainer, isCompactViewport && styles.bundlesContainerCompact]}>
                {displayBundles.map((bundle) => (
                  <BundleCard
                    key={bundle.productKey}
                    bundle={bundle}
                    onPress={() => onBuyBundle(bundle)}
                    isPurchasing={isPurchasing || buyingKey === bundle.productKey}
                    isPurchaseUnavailable={isPurchaseUnavailable}
                    compact={isCompactViewport}
                    tight={isTightViewport}
                  />
                ))}
              </View>
            )}

            <Text style={[styles.tokenBalanceHint, { color: textMuted }]}>
              {t('store.typicalGameTokensHint')}
            </Text>

            {/* ── Promo redemption ───────────────────────── */}
            <View style={styles.redeemSection}>
              <Text style={[styles.redeemTitle, isCompactViewport && styles.redeemTitleCompact, { color: textPrimary }]}>REDEEM CODE</Text>
              <View
                style={[
                  styles.redeemCard,
                  SOFT_SURFACE_FACE,
                  { backgroundColor: surface },
                  softSurfaceLift(),
                ]}
              >
                <TextInput
                  value={voucherCode}
                  onChangeText={handleVoucherChange}
                  placeholder="Enter code here..."
                  placeholderTextColor={textMuted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={[
                    styles.redeemInput,
                    isCompactViewport && styles.redeemInputCompact,
                    {
                      color: textPrimary,
                      borderColor: promoError ? '#D32F2F' : 'rgba(0,0,0,0.08)',
                      borderWidth: promoError ? 1.5 : 1,
                    },
                  ]}
                />
                <Pressable
                  onPress={applyVoucher}
                  disabled={isRedeeming}
                  style={({ pressed }) => [
                    styles.applyButton,
                    isCompactViewport && styles.applyButtonCompact,
                    SOFT_SURFACE_FACE,
                    softSurfaceLift(),
                    {
                      backgroundColor: '#6D8EB1',
                      opacity: isRedeeming ? 0.65 : pressed ? 0.92 : 1,
                      transform: pressed && !isRedeeming ? [{ scale: 0.98 }] : [{ scale: 1 }],
                    },
                  ]}
                >
                  {isRedeeming ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.applyButtonText}>APPLY CODE</Text>
                  )}
                </Pressable>
              </View>
              {promoError ? <Text style={styles.promoErrorText}>{promoError}</Text> : null}
              {promoSuccess ? <Text style={styles.promoSuccessText}>{promoSuccess}</Text> : null}
            </View>
          </View>

          <View style={styles.pageSpacer} />
        </View>
        </View>
      </ScreenContent>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  viewport: {
    flex: 1,
  },
  /** Shared outer gutter + max width — header controls and store cards share the same edges as home. */
  contentFrame: {
    flex: 1,
    width: '100%',
    maxWidth: LAYOUT.hubMaxWidth,
    alignSelf: 'center',
    minWidth: 0,
    minHeight: 0,
    paddingHorizontal: LAYOUT.screenGutter,
  },
  // Fill remaining height under header; equal pageSpacers center storeBody.
  pageContent: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    alignItems: 'stretch',
  },
  pageSpacer: {
    flex: 1,
    minHeight: 0,
  },
  storeBody: {
    width: '100%',
    gap: SPACING.md,
    alignItems: 'stretch',
  },
  storeBodyCompact: {
    gap: SPACING.sm,
  },
  storeBodyTight: {
    gap: SPACING.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    minHeight: Platform.OS === 'web' ? 64 : 56,
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

  title: {
    fontFamily: FONTS.displayBold,
    fontSize: 20,
    letterSpacing: 0.8,
    marginBottom: 0,
  },
  tokenBalanceHint: {
    width: '100%',
    paddingHorizontal: SPACING.xs,
    fontFamily: FONTS.ui,
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
  },

  // ── Status banner ─────────────────────────────────────────────────────
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    width: '100%',
    borderRadius: 16,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  statusBannerWarning: {
    borderLeftWidth: 3,
    borderLeftColor: '#D32F2F',
  },
  statusBannerText: {
    flex: 1,
    fontFamily: FONTS.ui,
    fontSize: 11,
    lineHeight: 15,
  },

  // ── Loading ───────────────────────────────────────────────────────────
  loadingContainer: {
    paddingVertical: SPACING.xxl,
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontFamily: FONTS.ui,
    fontSize: 13,
  },

  // ── Bundle cards ──────────────────────────────────────────────────────
  bundlesContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 6,
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: SPACING.sm,
  },
  bundlesContainerCompact: {
    paddingVertical: 0,
  },
  bundleCardWrapper: {
    flexBasis: '19%',
    minWidth: 0,
    flexGrow: 1,
    flexShrink: 1,
  },
  bundleCard: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    minHeight: 150,
    justifyContent: 'space-between',
  },
  bundleCardCompact: {
    minHeight: 138,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  bundleCardTight: {
    minHeight: 128,
  },
  bundleAmount: {
    fontFamily: FONTS.displayBold,
    fontSize: 24,
    textAlign: 'center',
  },
  bundleAmountCompact: {
    fontSize: 21,
  },
  bundleLabel: {
    fontFamily: FONTS.uiBold,
    fontSize: 10,
    letterSpacing: 0.5,
    marginTop: -4,
  },
  bundleLabelCompact: {
    fontSize: 9,
  },
  bundleBonus: {
    fontFamily: FONTS.ui,
    fontSize: 8,
    marginTop: 1,
  },
  bundleBonusSpacer: {
    height: 10,
  },
  bundlePrice: {
    fontFamily: FONTS.displayBold,
    fontSize: 17,
    marginTop: 4,
    marginBottom: 6,
  },
  bundlePriceCompact: {
    fontSize: 15,
    marginTop: 2,
    marginBottom: 4,
  },
  buyButton: {
    alignSelf: 'stretch',
    height: 30,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyButtonCompact: {
    height: 28,
  },
  buyButtonText: {
    fontFamily: FONTS.uiBold,
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },

  // ── Promo redemption ──────────────────────────────────────────────────
  redeemSection: {
    width: '100%',
    alignItems: 'center',
  },
  redeemTitle: {
    fontFamily: FONTS.uiBold,
    fontSize: 14,
    letterSpacing: 1.2,
    marginBottom: SPACING.sm,
  },
  redeemTitleCompact: {
    marginBottom: SPACING.xs,
  },
  redeemCard: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    borderRadius: 24,
    padding: SPACING.sm,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  redeemInput: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: SPACING.md,
    fontFamily: FONTS.ui,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  redeemInputCompact: {
    height: 44,
  },
  promoErrorText: {
    alignSelf: 'stretch',
    fontFamily: FONTS.ui,
    fontSize: 12,
    color: '#D32F2F',
    textAlign: 'center',
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.xs,
  },
  promoSuccessText: {
    alignSelf: 'stretch',
    fontFamily: FONTS.ui,
    fontSize: 12,
    color: '#388E3C',
    textAlign: 'center',
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.xs,
  },
  applyButton: {
    height: 48,
    paddingHorizontal: SPACING.lg,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonCompact: {
    height: 44,
    paddingHorizontal: SPACING.md,
  },
  applyButtonText: {
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
