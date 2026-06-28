import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
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
import { SPACING, FONTS, LAYOUT, SOFT_SURFACE_FACE, softSurfaceLift } from '@/constants';
import { ScreenContent } from '@/components/ScreenContent';
import { HubTokenChip } from '@/components/HubTokenChip';
import {
  formatTokens,
  buildDisplayBundles,
  type DisplayBundle,
} from '@/features/play/storeBundles';
import { getRowDirection } from '@/lib/i18n/direction';
import { useI18n } from '@/lib/i18n/useI18n';
import { isAuthDisabled } from '@/lib/authMode';
import { usePlayStore } from '@/store/play';
import { useTokenPurchases } from '@/lib/hooks/useTokenPurchases';
import { HOME_SOFT_UI } from '@/themes';

const T = HOME_SOFT_UI;
const COMPACT_BUNDLES_ROW_MAX_WIDTH = 584;

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
}: {
  bundle: DisplayBundle;
  onPress: () => void;
  isPurchasing: boolean;
  isPurchaseUnavailable: boolean;
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
        <Text style={[styles.bundleAmount, { color: textPrimary }]}>
          {formatTokens(bundle.tokensGranted)}
        </Text>
        <Text style={[styles.bundleLabel, { color: textMuted }]}>
          TOKENS
        </Text>

        {/* Bonus display not available from catalog; kept for layout parity */}
        <View style={styles.bundleBonusSpacer} />

        <Text style={[styles.bundlePrice, { color: textPrimary }]}>
          {bundle.priceLabel}
        </Text>

        <View
          style={[
            styles.buyButton,
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
        {/* ── Header ─────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerSide}>
            <Pressable
              onPress={handleBack}
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

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
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
            <View style={styles.bundlesContainer}>
              {displayBundles.map((bundle) => (
                <BundleCard
                  key={bundle.productKey}
                  bundle={bundle}
                  onPress={() => onBuyBundle(bundle)}
                  isPurchasing={isPurchasing || buyingKey === bundle.productKey}
                  isPurchaseUnavailable={isPurchaseUnavailable}
                />
              ))}
            </View>
          )}

          <Text style={[styles.tokenBalanceHint, { color: textMuted }]}>
            {t('store.typicalGameTokensHint')}
          </Text>

          {/* ── Promo redemption ───────────────────────── */}
          <View style={styles.redeemSection}>
            <Text style={[styles.redeemTitle, { color: textPrimary }]}>REDEEM CODE</Text>
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
        </ScrollView>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.screenGutter,
    paddingBottom: SPACING.xxl,
    gap: SPACING.lg,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    minHeight: 72,
    paddingVertical: SPACING.md,
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
    maxWidth: COMPACT_BUNDLES_ROW_MAX_WIDTH,
    marginTop: SPACING.xs,
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
    maxWidth: COMPACT_BUNDLES_ROW_MAX_WIDTH,
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
    maxWidth: COMPACT_BUNDLES_ROW_MAX_WIDTH,
    alignSelf: 'center',
    paddingVertical: SPACING.md,
  },
  bundleCardWrapper: {
    flexBasis: '19%',
    minWidth: 0,
    flexGrow: 1,
    flexShrink: 1,
  },
  bundleCard: {
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'space-between',
  },
  bundleAmount: {
    fontFamily: FONTS.displayBold,
    fontSize: 18,
    textAlign: 'center',
  },
  bundleLabel: {
    fontFamily: FONTS.uiBold,
    fontSize: 8,
    letterSpacing: 0.5,
    marginTop: -4,
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
    fontSize: 14,
    marginTop: 4,
    marginBottom: 6,
  },
  buyButton: {
    alignSelf: 'stretch',
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyButtonText: {
    fontFamily: FONTS.uiBold,
    fontSize: 8,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },

  // ── Promo redemption ──────────────────────────────────────────────────
  redeemSection: {
    width: '100%',
    maxWidth: COMPACT_BUNDLES_ROW_MAX_WIDTH,
    marginTop: SPACING.lg,
    alignItems: 'center',
  },
  redeemTitle: {
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    letterSpacing: 1.2,
    marginBottom: SPACING.sm,
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
    height: 40,
    borderRadius: 20,
    paddingHorizontal: SPACING.md,
    fontFamily: FONTS.ui,
    fontSize: 12,
    backgroundColor: '#FFFFFF',
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
    height: 40,
    paddingHorizontal: SPACING.lg,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    fontFamily: FONTS.uiBold,
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
