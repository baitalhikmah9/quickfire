import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  type ViewStyle,
} from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import { Redirect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, BORDER_RADIUS, TYPE_SCALE, FONTS, LAYOUT } from '@/constants';
import { ScreenContent } from '@/components/ScreenContent';
import { PillCollapsibleSection } from '@/components/PillCollapsibleSection';
import { HubTokenChip } from '@/components/HubTokenChip';
import { STORE_BUNDLES, type StoreBundle } from '@/features/play/storeBundles';
import { getRowDirection } from '@/lib/i18n/direction';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';
import { isAuthDisabled } from '@/lib/authMode';
import { usePlayStore } from '@/store/play';
import { HOME_SOFT_UI } from '@/themes';

const T = HOME_SOFT_UI;
const COMPACT_BUNDLES_ROW_MAX_WIDTH = 584;

/** Raised plastic tile shadow tier. */
function neumorphicLift3D(shadowColor: string, tier: 'hero' | 'header' | 'pill' | 'card'): any {
  const m =
    tier === 'hero'
      ? { h: 10, r: 0, el: 12 }
      : tier === 'header'
      ? { h: 6, r: 0, el: 8 }
      : tier === 'card'
      ? { h: 8, r: 0, el: 10 }
      : { h: 4, r: 0, el: 4 };

  return {
    shadowColor: 'rgba(51, 51, 51, 0.15)',
    shadowOffset: { width: 0, height: m.h },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: m.el,
  };
}



const VOUCHER_CODES: Record<string, number> = {
  DOUBLE: 10,
  WELCOME: 5,
};

function formatTokens(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function BundleCard({
  bundle,
  onPress,
  isFeatured = false,
  isFirst = false,
}: {
  bundle: StoreBundle;
  onPress: () => void;
  isFeatured?: boolean;
  isFirst?: boolean;
}) {
  const surface = T.colors.surface;
  const textPrimary = T.colors.textPrimary;
  const textMuted = T.colors.textMuted;
  const shadowHex = T.colors.shadowStrong;
  const accentGlow = T.colors.accentGlow;

  return (
    <View style={styles.bundleCardWrapper}>
      <Pressable
        style={({ pressed }) => [
          styles.bundleCard,
          styles.plasticFace,
          {
            backgroundColor: surface,
            opacity: pressed ? 0.96 : 1,
            transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
          },
          neumorphicLift3D(shadowHex, 'card'),
        ]}
        onPress={onPress}
      >
        <Text style={[styles.bundleAmount, { color: textPrimary }]}>
          {formatTokens(bundle.tokens)}
        </Text>
        <Text style={[styles.bundleLabel, { color: textMuted }]}>
          TOKENS
        </Text>
        
        {bundle.bonus ? (
          <Text style={[styles.bundleBonus, { color: textMuted }]}>
            (+{bundle.bonus} FREE)
          </Text>
        ) : (
          <View style={styles.bundleBonusSpacer} />
        )}

        <Text style={[styles.bundlePrice, { color: textPrimary }]}>
          {bundle.priceLabel}
        </Text>

        <View 
          style={[
            styles.buyButton, 
            styles.plasticFace,
            { backgroundColor: accentGlow }
          ]}
        >
          <Text style={styles.buyButtonText}>BUY</Text>
        </View>
      </Pressable>
    </View>
  );
}

export default function StoreScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const authDisabled = isAuthDisabled();
  const { direction, t, uiLocale } = useI18n();
  const rowDir = getRowDirection(direction);
  const router = useRouter();
  const tokens = usePlayStore((state) => state.tokens);
  const grantTokens = usePlayStore((state) => state.grantTokens);

  const [voucherCode, setVoucherCode] = useState('');
  const formattedTokens = formatTokens(tokens);

  const canvas = T.colors.canvas;
  const surface = T.colors.surface;
  const textPrimary = T.colors.textPrimary;
  const textMuted = T.colors.textMuted;
  const shadowHex = T.colors.shadowStrong;

  if (!isLoaded && !authDisabled) {
    return null;
  }

  if (!isSignedIn && !authDisabled) {
    return <Redirect href="/(auth)/sign-in" />;
  }



  const applyVoucher = useCallback(() => {
    const key = voucherCode.trim().toUpperCase();
    if (!key) {
      Alert.alert(t('store.voucherInvalid'));
      return;
    }
    const amount = VOUCHER_CODES[key];
    if (amount === undefined) {
      Alert.alert(t('store.voucherInvalid'));
      return;
    }
    grantTokens(amount);
    setVoucherCode('');
    Alert.alert(t('store.voucherSuccess'));
  }, [grantTokens, t, voucherCode]);

  const onBuyBundle = useCallback(
    (bundle: StoreBundle) => {
      const total = bundle.tokens + (bundle.bonus ?? 0);
      grantTokens(total);
    },
    [grantTokens]
  );

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(app)/');
  }, [router]);

  return (
    <SafeAreaView
      collapsable={false}
      edges={['top', 'bottom', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: canvas }]}
    >
      <ScreenContent fullWidth style={styles.viewport}>
        <View style={styles.header}>
          <View style={styles.headerSide}>
            <Pressable
              onPress={handleBack}
              style={({ pressed }) => [
                styles.backButton,
                styles.plasticFace,
                { backgroundColor: surface },
                styles.raisedButtonDepth,
                {
                  opacity: pressed ? 0.9 : 1,
                  transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
                },
              ]}
            >
              <Ionicons name={direction === 'rtl' ? 'chevron-forward' : 'chevron-back'} size={22} color={textPrimary} />
            </Pressable>
          </View>
          <View style={styles.headerCenter}>
            <Text style={[styles.title, { color: textPrimary }]}>STORE</Text>
          </View>
          <View style={[styles.headerSide, styles.headerSideRight]}>
            <HubTokenChip
              label={t('common.tokens')}
              value={formattedTokens}
              rowDirection={rowDir}
              variant="softUi"
              accessibilityLabel={`${t('common.tokens')}: ${formattedTokens}`}
            />
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          <View style={styles.bundlesContainer}>
            {STORE_BUNDLES.map((bundle, index) => (
              <BundleCard
                key={bundle.id}
                bundle={bundle}
                isFirst={index === 0}
                onPress={() => onBuyBundle(bundle)}
              />
            ))}
          </View>

          <View style={styles.redeemSection}>
            <Text style={[styles.redeemTitle, { color: textPrimary }]}>REDEEM CODE</Text>
            <View style={[styles.redeemCard, styles.plasticFace, { backgroundColor: surface }, neumorphicLift3D(shadowHex, 'header')]}>
              <TextInput
                value={voucherCode}
                onChangeText={setVoucherCode}
                placeholder="Enter code here..."
                placeholderTextColor={textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                style={[
                  styles.redeemInput,
                  {
                    color: textPrimary,
                    borderColor: 'rgba(0,0,0,0.08)',
                    borderWidth: 1,
                  },
                ]}
              />
              <Pressable
                onPress={applyVoucher}
                style={({ pressed }) => [
                  styles.applyButton,
                  styles.plasticFace,
                  {
                    backgroundColor: '#6D8EB1', // Match image blue
                    opacity: pressed ? 0.92 : 1,
                    transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }]
                  },
                  neumorphicLift3D(shadowHex, 'pill'),
                ]}
              >
                <Text style={styles.applyButtonText}>APPLY CODE</Text>
              </Pressable>
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
  raisedButtonDepth: {
    shadowColor: 'rgba(51, 51, 51, 0.15)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  title: {
    fontFamily: FONTS.displayBold,
    fontSize: 42,
    letterSpacing: 2,
    marginBottom: 0,
  },
  balanceCornerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  balanceCornerIcon: {
    marginRight: 4,
  },
  balanceCornerText: {
    fontFamily: FONTS.uiBold,
    fontSize: 11,
    letterSpacing: 0.4,
  },
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
