import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { AdminScreenHeader } from '@/components/admin/AdminScreenHeader';
import { BRAND_ADMIN_TABLE, BRAND_RAISED_SURFACE, COLORS, FONTS, SPACING } from '@/constants/theme';
import { Link } from 'expo-router';
import { HOME_SOFT_UI } from '@/themes';

const SOFT = HOME_SOFT_UI.colors;

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  expired: 'Expired',
  scheduled: 'Scheduled',
  exhausted: 'Exhausted',
};

const STATUS_COLORS: Record<string, string> = {
  active: COLORS.success,
  inactive: COLORS.disabled,
  expired: COLORS.error,
  scheduled: COLORS.info,
  exhausted: COLORS.warning,
};

const COUPON_MODES = [
  {
    value: 'public_single_use',
    label: 'Public Single-Use',
    requiresAccount: false,
    requiresCap: false,
  },
  {
    value: 'public_multi_use',
    label: 'Public Multi-Use',
    requiresAccount: false,
    requiresCap: true,
  },
  {
    value: 'account_single_use',
    label: 'Account Single-Use',
    requiresAccount: true,
    requiresCap: false,
  },
  {
    value: 'account_multi_use',
    label: 'Account Multi-Use',
    requiresAccount: true,
    requiresCap: true,
  },
] as const;

type CouponMode = (typeof COUPON_MODES)[number]['value'];

type WalletSearchResult = {
  wallet: {
    _id: string;
    purchaserAccountId?: string | null;
    balance: number;
  };
  user: {
    _id: Id<'users'>;
    email?: string | null;
    name?: string | null;
    clerkId?: string | null;
  } | null;
};

export default function PromoCodesScreen() {
  const { width } = useWindowDimensions();
  const isCompact = width < 768;
  const [filter, setFilter] = useState('');
  const promoCodes = useQuery(api.admin.listPromoCodes, {
    query: filter || undefined,
    limit: 50,
  });
  const createPromo = useMutation(api.admin.createPromoCode);

  const [showCreate, setShowCreate] = useState(false);
  const [code, setCode] = useState('');
  const [rewardAmount, setRewardAmount] = useState('');
  const [usageCap, setUsageCap] = useState('');
  const [mode, setMode] = useState<CouponMode>('public_single_use');
  const [accountQuery, setAccountQuery] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<WalletSearchResult | null>(null);
  const [campaignName, setCampaignName] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const selectedMode = COUPON_MODES.find((item) => item.value === mode) ?? COUPON_MODES[0];
  const amount = parseInt(rewardAmount, 10);
  const cap = parseInt(usageCap, 10);
  const isSubmitDisabled =
    submitting ||
    !code.trim() ||
    Number.isNaN(amount) ||
    amount <= 0 ||
    (selectedMode.requiresCap && (Number.isNaN(cap) || cap <= 0)) ||
    (selectedMode.requiresAccount && !selectedAccount?.user?._id);
  const accountResults = useQuery(
    api.admin.searchWallets,
    selectedMode.requiresAccount && accountQuery.trim()
      ? { query: accountQuery.trim(), limit: 6 }
      : 'skip'
  ) as WalletSearchResult[] | undefined;

  const handleCreate = async () => {
    setError('');
    const amount = parseInt(rewardAmount, 10);
    const parsedCap = selectedMode.requiresCap ? parseInt(usageCap, 10) : 1;

    if (!code.trim() || Number.isNaN(amount)) {
      setError('Code and token amount are required.');
      return;
    }

    if (selectedMode.requiresCap && (Number.isNaN(parsedCap) || parsedCap <= 0)) {
      setError('Max redemptions must be a positive number.');
      return;
    }

    if (selectedMode.requiresAccount && !selectedAccount?.user?._id) {
      setError('Choose the restricted account for this coupon.');
      return;
    }

    try {
      setSubmitting(true);
      await createPromo({
        code: code.trim(),
        rewardAmount: amount,
        usageCap: parsedCap,
        mode,
        restrictedToUserId: selectedAccount?.user?._id,
        restrictedToPurchaserAccountId: selectedAccount?.wallet.purchaserAccountId ?? undefined,
        metadata: campaignName || notes ? { campaignName: campaignName || undefined, notes: notes || undefined } : undefined,
      });
      setCode('');
      setRewardAmount('');
      setUsageCap('');
      setMode('public_single_use');
      setAccountQuery('');
      setSelectedAccount(null);
      setCampaignName('');
      setNotes('');
      setShowCreate(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create promo code');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <AdminScreenHeader
        title="Promo Codes"
        fallbackHref="/admin"
        backAccessibilityLabel="Back to admin overview"
        headerRight={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showCreate ? 'Cancel creating promo code' : 'Create new promo code'}
            style={({ pressed }) => [
              styles.primaryButton,
              { opacity: pressed ? 0.9 : 1, transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }] },
            ]}
            onPress={() => setShowCreate((s) => !s)}
          >
            <Text style={styles.primaryButtonText}>{showCreate ? 'Cancel' : 'Create'}</Text>
          </Pressable>
        }
      />

      {showCreate && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>New Promo Code</Text>
          <View style={[styles.formGrid, isCompact && styles.formGridCompact]}>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Code</Text>
              <TextInput
                value={code}
                onChangeText={setCode}
                style={styles.input}
                placeholder="e.g. WELCOME2024"
                placeholderTextColor={COLORS.disabled}
                autoCapitalize="characters"
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Reward Amount</Text>
              <TextInput
                value={rewardAmount}
                onChangeText={setRewardAmount}
                style={styles.input}
                placeholder="Tokens"
                placeholderTextColor={COLORS.disabled}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Mode</Text>
              <View style={styles.modeGrid}>
                {COUPON_MODES.map((item) => (
                  <Pressable
                    key={item.value}
                    onPress={() => {
                      setMode(item.value);
                      setError('');
                      if (!item.requiresAccount) {
                        setAccountQuery('');
                        setSelectedAccount(null);
                      }
                    }}
                    style={[
                      styles.modeOption,
                      mode === item.value ? styles.modeOptionActive : undefined,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modeOptionText,
                        mode === item.value ? styles.modeOptionTextActive : undefined,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            {selectedMode.requiresCap && (
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Max Redemptions</Text>
                <TextInput
                  value={usageCap}
                  onChangeText={setUsageCap}
                  style={styles.input}
                  placeholder="Max redemptions"
                  placeholderTextColor={COLORS.disabled}
                  keyboardType="numeric"
                />
              </View>
            )}
            {selectedMode.requiresAccount && (
              <View style={styles.formFieldWide}>
                <Text style={styles.formLabel}>Restricted Account</Text>
                <TextInput
                  value={accountQuery}
                  onChangeText={(value) => {
                    setAccountQuery(value);
                    setSelectedAccount(null);
                  }}
                  style={styles.input}
                  placeholder="Search email, Clerk id, or purchaser id"
                  placeholderTextColor={COLORS.disabled}
                  autoCapitalize="none"
                />
                {selectedAccount ? (
                  <Text style={styles.selectedAccountText}>
                    Selected: {selectedAccount.user?.email ?? selectedAccount.user?.name ?? selectedAccount.user?.clerkId ?? selectedAccount.wallet.purchaserAccountId}
                  </Text>
                ) : accountResults && accountResults.length > 0 ? (
                  <View style={styles.accountResults}>
                    {accountResults.map((result) => (
                      <Pressable
                        key={result.wallet._id}
                        onPress={() => {
                          setSelectedAccount(result);
                          setAccountQuery(result.user?.email ?? result.user?.clerkId ?? result.wallet.purchaserAccountId ?? '');
                        }}
                        style={styles.accountResult}
                      >
                        <Text style={styles.accountResultTitle}>
                          {result.user?.email ?? result.user?.name ?? result.user?.clerkId ?? 'Unknown account'}
                        </Text>
                        <Text style={styles.accountResultMeta}>
                          {result.wallet.purchaserAccountId ?? 'No purchaser id'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : accountQuery.trim() ? (
                  <Text style={styles.selectedAccountText}>No matching accounts found.</Text>
                ) : null}
              </View>
            )}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Campaign Name</Text>
              <TextInput
                value={campaignName}
                onChangeText={setCampaignName}
                style={styles.input}
                placeholder="Optional"
                placeholderTextColor={COLORS.disabled}
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Notes</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                style={styles.input}
                placeholder="Optional"
                placeholderTextColor={COLORS.disabled}
              />
            </View>
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              isSubmitDisabled && styles.disabledButton,
              { opacity: pressed && !isSubmitDisabled ? 0.92 : 1 },
            ]}
            onPress={handleCreate}
            disabled={isSubmitDisabled}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Creating...' : 'Create Promo Code'}
            </Text>
          </Pressable>
        </View>
      )}

      <View style={styles.filterRow}>
        <TextInput
          value={filter}
          onChangeText={setFilter}
          style={styles.filterInput}
          placeholder="Search codes..."
          placeholderTextColor={COLORS.disabled}
        />
      </View>

      {promoCodes === undefined ? (
        <Text style={styles.empty}>Loading...</Text>
      ) : promoCodes.items.length === 0 ? (
        <Text style={styles.empty}>No promo codes found.</Text>
      ) : (
        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]}>
            <Text style={[styles.cell, styles.headerCell, styles.cellCode]}>Code</Text>
            <Text style={[styles.cell, styles.headerCell, styles.cellReward]}>Reward</Text>
            <Text style={[styles.cell, styles.headerCell, styles.cellCap]}>Used / Cap</Text>
            <Text style={[styles.cell, styles.headerCell, styles.cellStatus]}>Status</Text>
          </View>
          {promoCodes.items.map((promo: { _id: string; code: string; rewardAmount: number; usedCount?: number; usageCap: number; status: string }) => (
            <Link key={promo._id} href={`/admin/promo-codes/${promo._id}`} asChild>
              <Pressable style={styles.row}>
                <Text style={[styles.cell, styles.cellCode]}>{promo.code}</Text>
                <Text style={[styles.cell, styles.cellReward]}>{promo.rewardAmount}</Text>
                <Text style={[styles.cell, styles.cellCap]}>
                  {promo.usedCount ?? 0} / {promo.usageCap}
                </Text>
                <View style={styles.cellStatus}>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: (STATUS_COLORS[promo.status] || COLORS.disabled) + '22' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        { color: STATUS_COLORS[promo.status] || COLORS.disabled },
                      ]}
                    >
                      {STATUS_LABELS[promo.status] ?? promo.status}
                    </Text>
                  </View>
                </View>
              </Pressable>
            </Link>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    gap: SPACING.lg,
  },
  primaryButton: {
    ...BRAND_RAISED_SURFACE,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    letterSpacing: 1,
    color: SOFT.textPrimary,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
  },
  submitButtonText: {
    fontFamily: FONTS.uiBold,
    fontSize: 13,
    letterSpacing: 0.6,
    color: '#FFFFFF',
  },
  panel: {
    ...BRAND_RAISED_SURFACE,
    borderRadius: 18,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  panelTitle: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 16,
    color: SOFT.textPrimary,
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  formGridCompact: {
    flexDirection: 'column',
  },
  formField: {
    flexBasis: '30%',
    flexGrow: 1,
    minWidth: 200,
  },
  formFieldWide: {
    flexBasis: '62%',
    flexGrow: 1,
    minWidth: 280,
  },
  formLabel: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 12,
    color: SOFT.textMuted,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: BRAND_ADMIN_TABLE.inputBorder,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontFamily: FONTS.ui,
    fontSize: 13,
    color: SOFT.textPrimary,
    backgroundColor: BRAND_ADMIN_TABLE.inputBackground,
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modeOption: {
    borderWidth: 1,
    borderColor: BRAND_ADMIN_TABLE.inputBorder,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: BRAND_ADMIN_TABLE.inputBackground,
  },
  modeOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '14',
  },
  modeOptionText: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 12,
    color: SOFT.textMuted,
  },
  modeOptionTextActive: {
    color: COLORS.primary,
  },
  selectedAccountText: {
    marginTop: 6,
    fontFamily: FONTS.ui,
    fontSize: 12,
    color: SOFT.textMuted,
  },
  accountResults: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: BRAND_ADMIN_TABLE.rowDivider,
    borderRadius: 10,
    overflow: 'hidden',
  },
  accountResult: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BRAND_ADMIN_TABLE.rowDivider,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  accountResultTitle: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 13,
    color: SOFT.textPrimary,
  },
  accountResultMeta: {
    marginTop: 2,
    fontFamily: FONTS.ui,
    fontSize: 11,
    color: SOFT.textMuted,
  },
  filterRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  filterInput: {
    flex: 1,
    maxWidth: 320,
    borderWidth: 1,
    borderColor: BRAND_ADMIN_TABLE.inputBorder,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontFamily: FONTS.ui,
    fontSize: 13,
    color: SOFT.textPrimary,
    backgroundColor: BRAND_ADMIN_TABLE.inputBackground,
  },
  errorText: {
    fontFamily: FONTS.ui,
    fontSize: 13,
    color: COLORS.error,
  },
  empty: {
    fontFamily: FONTS.ui,
    fontSize: 14,
    color: SOFT.textMuted,
    paddingVertical: SPACING.md,
  },
  table: {
    gap: 1,
    backgroundColor: BRAND_ADMIN_TABLE.rowDivider,
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
    alignItems: 'center',
  },
  headerRow: {
    backgroundColor: BRAND_ADMIN_TABLE.headerBackground,
  },
  cell: {
    fontFamily: FONTS.ui,
    fontSize: 13,
    color: SOFT.textPrimary,
  },
  headerCell: {
    fontFamily: FONTS.uiSemibold,
    color: SOFT.textMuted,
    fontSize: 12,
  },
  cellCode: {
    flex: 2,
  },
  cellReward: {
    flex: 1,
  },
  cellCap: {
    flex: 1,
  },
  cellStatus: {
    flex: 1,
    alignItems: 'flex-end',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 11,
  },
});
