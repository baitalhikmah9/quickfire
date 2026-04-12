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
import type { TranslationKey } from '@/lib/i18n/messages/en';

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
    id: 'b10',
    nameKey: 'store.packQuick',
    tokens: 10,
    priceLabel: '$0.99',
    icon: 'flash-outline',
  },
  {
    id: 'b20',
    nameKey: 'store.packValue',
    tokens: 20,
    priceLabel: '$1.99',
    icon: 'layers-outline',
  },
  {
    id: 'b30',
    nameKey: 'store.packPro',
    tokens: 30,
    bonus: 5,
    priceLabel: '$2.99',
    icon: 'star',
    featured: true,
  },
  {
    id: 'b50',
    nameKey: 'store.packPower',
    tokens: 50,
    priceLabel: '$4.99',
    icon: 'cash-outline',
  },
  {
    id: 'b100',
    nameKey: 'store.packMega',
    tokens: 100,
    priceLabel: '$8.99',
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

function BundleGridCard({
  bundle,
  colors,
  name,
  tokenLine,
  onPress,
}: {
  bundle: BundleDef;
  colors: ReturnType<typeof useTheme>;
  name: string;
  tokenLine: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.gridCard,
        {
          backgroundColor: colors.cardBackground,
          borderColor: COLORS.primary,
          opacity: pressed ? 0.96 : 1,
          transform: pressed ? [{ scale: 0.98 }] : undefined,
        },
      ]}
      onPress={onPress}
      android_ripple={{ color: `${COLORS.primary}22` }}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${tokenLine}, ${bundle.priceLabel}`}
    >
      <View style={[styles.gridIconWrap, { backgroundColor: `${COLORS.primary}18` }]}>
        <Ionicons name={bundle.icon} size={26} color={COLORS.primary} />
      </View>
      <Text style={[styles.gridName, { color: colors.text }]} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[styles.gridTokens, { color: colors.textSecondary }]}>{tokenLine}</Text>
      <View style={styles.pricePill}>
        <Text style={styles.pricePillText}>{bundle.priceLabel}</Text>
      </View>
    </Pressable>
  );
}

function FeaturedBundleCard({
  bundle,
  colors,
  rowDirection,
  name,
  bonusLine,
  bestValue,
  onPress,
}: {
  bundle: BundleDef;
  colors: ReturnType<typeof useTheme>;
  rowDirection: ViewStyle['flexDirection'];
  name: string;
  bonusLine: string;
  bestValue: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.featuredCard,
        {
          backgroundColor: colors.cardBackground,
          borderColor: COLORS.secondary,
          opacity: pressed ? 0.96 : 1,
          transform: pressed ? [{ scale: 0.99 }] : undefined,
        },
      ]}
      onPress={onPress}
      android_ripple={{ color: `${COLORS.secondary}28` }}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${bestValue}`}
    >
      <View style={styles.featuredBadge}>
        <Text style={styles.featuredBadgeText}>{bestValue}</Text>
      </View>
      <View style={[styles.featuredRow, { flexDirection: rowDirection }]}>
        <View style={styles.featuredCopy}>
          <Text style={[styles.featuredLabel, { color: COLORS.secondary }]}>{name.toUpperCase()}</Text>
          <Text style={[styles.featuredAmount, { color: colors.text }]}>{formatTokens(bundle.tokens)}</Text>
          {bonusLine ? (
            <Text style={[styles.featuredBonus, { color: colors.textSecondary }]}>{bonusLine}</Text>
          ) : null}
        </View>
        <View style={[styles.featuredIconTile, { backgroundColor: `${COLORS.secondary}28` }]}>
          <Ionicons name={bundle.icon} size={36} color={COLORS.secondary} />
        </View>
      </View>
      <View style={styles.pricePill}>
        <Text style={styles.pricePillText}>{bundle.priceLabel}</Text>
      </View>
    </Pressable>
  );
}

export default function StoreScreen() {
  const colors = useTheme();
  const { direction, t, getTextStyle, uiLocale } = useI18n();
  const rowDir = getRowDirection(direction);
  const headerDir: ViewStyle['flexDirection'] = direction === 'rtl' ? 'row-reverse' : 'row';
  const router = useRouter();
  const tokens = usePlayStore((state) => state.tokens);
  const grantTokens = usePlayStore((state) => state.grantTokens);

  const [voucherCode, setVoucherCode] = useState('');
  const formattedTokens = formatTokens(tokens);

  const bundlesOrdered = useMemo(() => {
    const featured = BUNDLES.find((b) => b.featured);
    const rest = BUNDLES.filter((b) => !b.featured);
    const row1 = rest.slice(0, 2);
    const row2 = rest.slice(2, 4);
    return { featured, row1, row2 };
  }, []);
  const featuredBundle = bundlesOrdered.featured ?? null;

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

  const backIcon: keyof typeof Ionicons.glyphMap =
    direction === 'rtl' ? 'chevron-forward' : 'chevron-back';

  return (
    <SafeAreaView
      collapsable={false}
      edges={['top', 'bottom', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScreenContent fullWidth style={styles.viewport}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.topBar, { flexDirection: headerDir }]}>
            <View style={[styles.headerSide, styles.backHeaderHit]}>
              <Pressable
                onPress={handleBack}
                style={({ pressed }) => [
                  styles.backPill,
                  { flexDirection: rowDir },
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border,
                    opacity: pressed ? 0.92 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('common.back')}
              >
                <Ionicons name={backIcon} size={20} color={colors.primary} />
                <Text style={[styles.backLabel, { color: colors.textOnBackground }]}>{t('common.back')}</Text>
              </Pressable>
            </View>

            <View style={styles.topBarSpacer} />

            <View style={[styles.headerSide, styles.headerSideEnd]}>
              <HubTokenChip
                label={t('common.tokens')}
                value={formattedTokens}
                rowDirection={rowDir}
                accessibilityLabel={`${t('common.tokens')}: ${formattedTokens}`}
              />
            </View>
          </View>

          <PillCollapsibleSection
            icon="pricetag-outline"
            title={t('store.pillRedeemTitle')}
            kicker={t('store.pillRedeemKicker')}
            tone="tertiary"
            cardBackground={colors.cardBackground}
            rowDir={rowDir}
            collapsible={false}
          >
            <View style={[styles.voucherRow, { flexDirection: rowDir }]}>
              <TextInput
                value={voucherCode}
                onChangeText={setVoucherCode}
                placeholder={t('store.enterCode')}
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="characters"
                autoCorrect={false}
                style={[
                  styles.voucherInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                  getTextStyle(uiLocale, 'bodyMedium', 'start'),
                ]}
              />
              <Pressable
                onPress={applyVoucher}
                style={({ pressed }) => [
                  styles.applyBtn,
                  { backgroundColor: COLORS.accent, opacity: pressed ? 0.9 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('store.apply')}
              >
                <Text style={[styles.applyBtnText, getTextStyle(uiLocale, 'bodySemibold', 'center')]}>
                  {t('store.apply').toUpperCase()}
                </Text>
              </Pressable>
            </View>
            <Text style={[styles.voucherHint, { color: colors.textSecondary }]}>{t('store.demoCheckoutNote')}</Text>
          </PillCollapsibleSection>

          <PillCollapsibleSection
            icon="bag-handle-outline"
            title={t('store.pillBundlesTitle')}
            kicker={t('store.pillBundlesKicker')}
            tone="primary"
            cardBackground={colors.cardBackground}
            rowDir={rowDir}
            collapsible={false}
          >
            <View style={styles.bundleBlock}>
              <View style={[styles.gridRow, { flexDirection: rowDir }]}>
                {bundlesOrdered.row1.map((bundle) => (
                  <View key={bundle.id} style={styles.gridCell}>
                    <BundleGridCard
                      bundle={bundle}
                      colors={colors}
                      name={t(bundle.nameKey)}
                      tokenLine={t('store.tokenCount', {
                        count: formatTokens(bundle.tokens),
                      })}
                      onPress={() => onBuyBundle(bundle)}
                    />
                  </View>
                ))}
              </View>

              {featuredBundle ? (
                <FeaturedBundleCard
                  bundle={featuredBundle}
                  colors={colors}
                  rowDirection={rowDir}
                  name={t(featuredBundle.nameKey)}
                  bonusLine={
                    featuredBundle.bonus
                      ? t('store.bonusLine', {
                          count: String(featuredBundle.bonus),
                        }).toUpperCase()
                      : ''
                  }
                  bestValue={t('store.bestValue').toUpperCase()}
                  onPress={() => onBuyBundle(featuredBundle)}
                />
              ) : null}

              <View style={[styles.gridRow, { flexDirection: rowDir }]}>
                {bundlesOrdered.row2.map((bundle) => (
                  <View key={bundle.id} style={styles.gridCell}>
                    <BundleGridCard
                      bundle={bundle}
                      colors={colors}
                      name={t(bundle.nameKey)}
                      tokenLine={t('store.tokenCount', {
                        count: formatTokens(bundle.tokens),
                      })}
                      onPress={() => onBuyBundle(bundle)}
                    />
                  </View>
                ))}
              </View>
            </View>
          </PillCollapsibleSection>
        </ScrollView>
      </ScreenContent>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    minHeight: 0,
  },
  viewport: {
    flex: 1,
    minWidth: 0,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.screenGutter,
    paddingBottom: SPACING.xxl,
    gap: SPACING.lg,
  },
  backPill: {
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 2,
  },
  backLabel: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 15,
  },
  topBar: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    minHeight: 48,
  },
  headerSide: {
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSideEnd: {
    alignItems: 'flex-end',
  },
  backHeaderHit: {
    alignItems: 'flex-start',
  },
  topBarSpacer: {
    flex: 1,
    minWidth: SPACING.md,
  },
  voucherRow: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  voucherInput: {
    flex: 1,
    minHeight: 48,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 2,
    paddingHorizontal: SPACING.md,
    fontSize: 15,
  },
  applyBtn: {
    paddingHorizontal: SPACING.lg,
    minHeight: 48,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  applyBtnText: {
    fontSize: 13,
    letterSpacing: 0.8,
    color: '#FFFFFF',
  },
  voucherHint: {
    ...TYPE_SCALE.caption,
    marginTop: SPACING.md,
    lineHeight: 18,
  },
  bundleBlock: {
    gap: SPACING.md,
  },
  gridRow: {
    gap: SPACING.md,
  },
  gridCell: {
    flex: 1,
    minWidth: 0,
  },
  gridCard: {
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 3,
    padding: SPACING.md,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  gridIconWrap: {
    width: 52,
    height: 52,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  gridName: {
    ...TYPE_SCALE.bodyS,
    fontFamily: FONTS.uiSemibold,
    marginBottom: 2,
    alignSelf: 'stretch',
    textAlign: 'center',
  },
  gridTokens: {
    ...TYPE_SCALE.caption,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  pricePill: {
    alignSelf: 'stretch',
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: 'rgba(255, 255, 255, 0.22)',
  },
  pricePillText: {
    ...TYPE_SCALE.bodyS,
    fontFamily: FONTS.uiBold,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  featuredCard: {
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 3,
    padding: SPACING.lg,
    position: 'relative',
    overflow: 'visible',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  featuredBadge: {
    position: 'absolute',
    top: -8,
    end: 12,
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    zIndex: 2,
  },
  featuredBadgeText: {
    ...TYPE_SCALE.caption,
    fontFamily: FONTS.uiBold,
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  featuredRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  featuredCopy: {
    flex: 1,
    minWidth: 0,
  },
  featuredLabel: {
    ...TYPE_SCALE.labelCap,
    marginBottom: 4,
  },
  featuredAmount: {
    fontSize: 32,
    lineHeight: 38,
    fontFamily: FONTS.displayBold,
  },
  featuredBonus: {
    ...TYPE_SCALE.caption,
    marginTop: 2,
  },
  featuredIconTile: {
    width: 72,
    height: 72,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
