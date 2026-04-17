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
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, BORDER_RADIUS, TYPE_SCALE, FONTS, LAYOUT } from '@/constants';
import { ScreenContent } from '@/components/ScreenContent';
import { PillCollapsibleSection } from '@/components/PillCollapsibleSection';
import { HubTokenChip } from '@/components/HubTokenChip';
import { getRowDirection } from '@/lib/i18n/direction';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';
import { usePlayStore } from '@/store/play';
import { HOME_SOFT_UI } from '@/themes';
import type { TranslationKey } from '@/lib/i18n/messages/en';

const T = HOME_SOFT_UI;

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



type BundleDef = {
  id: string;
  nameKey: TranslationKey;
  tokens: number;
  bonus?: number;
  priceLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  featured?: boolean;
};

const BUNDLES: BundleDef[] = [
  {
    id: 'b50',
    nameKey: 'store.packQuick',
    tokens: 50,
    priceLabel: '$0.99',
    icon: 'flash-outline',
  },
  {
    id: 'b250',
    nameKey: 'store.packValue',
    tokens: 250,
    bonus: 10,
    priceLabel: '$4.99',
    icon: 'layers-outline',
  },
  {
    id: 'b600',
    nameKey: 'store.packPro',
    tokens: 600,
    bonus: 50,
    priceLabel: '$9.99',
    icon: 'star-outline',
    featured: true,
  },
  {
    id: 'b1500',
    nameKey: 'store.packMega',
    tokens: 1500,
    bonus: 200,
    priceLabel: '$19.99',
    icon: 'trophy-outline',
  },
];

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
  bundle: BundleDef;
  onPress: () => void;
  isFeatured?: boolean;
  isFirst?: boolean;
}) {
  const surface = T.colors.surface;
  const textPrimary = T.colors.textPrimary;
  const textMuted = T.colors.textMuted;
  const shadowHex = T.colors.shadowStrong;
  const accentGlow = T.colors.accentGlow;
  const blueAccent = '#6D8EB1'; // From image for first card

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
            { backgroundColor: isFirst ? blueAccent : accentGlow }
          ]}
        >
          <Text style={styles.buyButtonText}>BUY</Text>
        </View>
      </Pressable>
    </View>
  );
}

export default function StoreScreen() {
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
    (bundle: BundleDef) => {
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
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backButton,
              {
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons name={direction === 'rtl' ? 'chevron-forward' : 'chevron-back'} size={28} color={textPrimary} />
          </Pressable>
          <Text style={[styles.title, { color: textPrimary }]}>STORE</Text>
          <View style={styles.balanceChip}>
            <Ionicons name="radio-outline" size={16} color={textPrimary} style={{ marginRight: 6 }} />
            <Text style={[styles.balanceText, { color: textPrimary }]}>
              BALANCE: {formattedTokens} TOKENS
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.bundlesContainer}>
            {BUNDLES.map((bundle, index) => (
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
  },
  header: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: SPACING.lg,
    zIndex: 10,
  },
  title: {
    fontFamily: FONTS.displayBold,
    fontSize: 42,
    letterSpacing: 2,
    marginBottom: SPACING.xs,
  },
  balanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 16,
  },
  balanceText: {
    fontFamily: FONTS.uiBold,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.screenGutter,
    paddingBottom: SPACING.xxl,
    alignItems: 'center',
  },
  bundlesContainer: {
    flexDirection: 'row',
    gap: SPACING.lg,
    justifyContent: 'center',
    width: '100%',
    paddingVertical: SPACING.xl,
  },
  bundleCardWrapper: {
    width: 160,
  },
  bundleCard: {
    borderRadius: 32,
    padding: SPACING.lg,
    alignItems: 'center',
    minHeight: 220,
    justifyContent: 'space-between',
  },
  bundleAmount: {
    fontFamily: FONTS.displayBold,
    fontSize: 32,
    textAlign: 'center',
  },
  bundleLabel: {
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    letterSpacing: 1,
    marginTop: -8,
  },
  bundleBonus: {
    fontFamily: FONTS.ui,
    fontSize: 11,
    marginTop: 4,
  },
  bundleBonusSpacer: {
    height: 18,
  },
  bundlePrice: {
    fontFamily: FONTS.displayBold,
    fontSize: 20,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  buyButton: {
    alignSelf: 'stretch',
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyButtonText: {
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  redeemSection: {
    width: '100%',
    maxWidth: 600,
    marginTop: SPACING.xl,
    alignItems: 'center',
  },
  redeemTitle: {
    fontFamily: FONTS.uiBold,
    fontSize: 14,
    letterSpacing: 1.5,
    marginBottom: SPACING.md,
  },
  redeemCard: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    borderRadius: 32,
    padding: SPACING.md,
    alignItems: 'center',
    gap: SPACING.md,
  },
  redeemInput: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: SPACING.lg,
    fontFamily: FONTS.ui,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  applyButton: {
    height: 48,
    paddingHorizontal: SPACING.xl,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
