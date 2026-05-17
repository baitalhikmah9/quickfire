import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { AdminScreenHeader } from '@/components/admin/AdminScreenHeader';
import { BRAND_ADMIN_TABLE, BRAND_RAISED_SURFACE, COLORS, FONTS, SPACING } from '@/constants/theme';
import { HOME_SOFT_UI } from '@/themes';

const SOFT = HOME_SOFT_UI.colors;

export default function PromoCodeDetailScreen() {
  const { promoCodeId } = useLocalSearchParams<{ promoCodeId: string }>();
  const promo = useQuery(api.admin.getPromoCode, { promoCodeId: promoCodeId as any });
  const deactivate = useMutation(api.admin.deactivatePromoCode);

  const [showDisable, setShowDisable] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleDeactivate = async () => {
    setError('');
    if (!reason.trim()) {
      setError('A reason is required.');
      return;
    }
    try {
      setSubmitting(true);
      await deactivate({ promoCodeId: promoCodeId as any, reason: reason.trim() });
      setShowDisable(false);
      setReason('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to deactivate');
    } finally {
      setSubmitting(false);
    }
  };

  if (promo === undefined) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <AdminScreenHeader
          title="Promo code"
          fallbackHref="/admin/promo-codes"
          backAccessibilityLabel="Back to promo codes"
        />
        <View style={styles.center}>
          <Text>Loading...</Text>
        </View>
      </ScrollView>
    );
  }

  if (promo === null) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <AdminScreenHeader
          title="Promo code"
          fallbackHref="/admin/promo-codes"
          backAccessibilityLabel="Back to promo codes"
        />
        <View style={styles.center}>
          <Text style={styles.errorText}>Promo code not found.</Text>
        </View>
      </ScrollView>
    );
  }

  const { promoCode, redemptions, restrictedUser } = promo;
  const isActive = promoCode.active !== false;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <AdminScreenHeader
        title={promoCode.code}
        fallbackHref="/admin/promo-codes"
        backAccessibilityLabel="Back to promo codes"
      />

      <View style={styles.panel}>
        {isActive ? (
          <View style={styles.panelHeader}>
            <View style={styles.panelHeaderSpacer} />
            <Pressable style={styles.dangerButton} onPress={() => setShowDisable(true)}>
              <Text style={styles.dangerButtonText}>Disable</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.detailsGrid}>
          <DetailItem label="Mode" value={formatPromoMode(promoCode.mode)} />
          <DetailItem label="Scope" value={promoCode.redemptionScope ?? 'public'} />
          <DetailItem label="Reward Type" value={promoCode.rewardType} />
          <DetailItem label="Reward Amount" value={String(promoCode.rewardAmount)} />
          <DetailItem label="Usage Cap" value={String(promoCode.usageCap)} />
          <DetailItem label="Used Count" value={String(promoCode.usedCount ?? 0)} />
          <DetailItem label="Per-User Limit" value={String(promoCode.perUserLimit ?? 1)} />
          <DetailItem label="Active" value={isActive ? 'Yes' : 'No'} />
          {restrictedUser && (
            <DetailItem
              label="Restricted Account"
              value={
                restrictedUser.email ??
                restrictedUser.name ??
                restrictedUser.clerkId ??
                promoCode.restrictedToPurchaserAccountId ??
                'Unknown'
              }
            />
          )}
          {promoCode.restrictedToPurchaserAccountId && (
            <DetailItem
              label="Restricted Purchaser ID"
              value={promoCode.restrictedToPurchaserAccountId}
            />
          )}
        </View>

        {promoCode.metadata?.campaignName && (
          <DetailItem label="Campaign" value={promoCode.metadata.campaignName} />
        )}
        {promoCode.metadata?.notes && (
          <DetailItem label="Notes" value={promoCode.metadata.notes} />
        )}
        {promoCode.metadata?.deactivationReason && (
          <DetailItem label="Deactivation Reason" value={promoCode.metadata.deactivationReason} />
        )}
      </View>

      {showDisable && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Disable Promo Code</Text>
          <Text style={styles.formLabel}>Reason</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            style={styles.input}
            placeholder="Why are you disabling this code?"
            placeholderTextColor={COLORS.disabled}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <View style={styles.buttonRow}>
            <Pressable style={styles.secondaryButton} onPress={() => setShowDisable(false)}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.dangerButton, submitting && styles.disabledButton]}
              onPress={handleDeactivate}
              disabled={submitting}
            >
              <Text style={styles.dangerButtonText}>
                {submitting ? 'Disabling...' : 'Confirm Disable'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Redemptions ({redemptions.length})</Text>
        {redemptions.length === 0 ? (
          <Text style={styles.empty}>No redemptions yet.</Text>
        ) : (
          <View style={styles.table}>
            <View style={[styles.row, styles.headerRow]}>
              <Text style={[styles.cell, styles.headerCell, styles.cellUser]}>User</Text>
              <Text style={[styles.cell, styles.headerCell, styles.cellUserId]}>User ID</Text>
              <Text style={[styles.cell, styles.headerCell, styles.cellDate]}>Date</Text>
              <Text style={[styles.cell, styles.headerCell, styles.cellTx]}>Transaction</Text>
            </View>
            {redemptions.map(
              (r: {
                redemption: { _id: string; userId: string; redeemedAt: number };
                user: { email?: string | null; clerkId?: string | null } | null;
                transaction: { type: string; amount: number } | null;
              }) => (
                <View key={r.redemption._id} style={styles.row}>
                  <Text style={[styles.cell, styles.cellUser]}>
                    {r.user?.email ?? r.user?.clerkId ?? 'Unknown'}
                  </Text>
                  <Text
                    style={[styles.cell, styles.cellUserId, styles.cellMono]}
                    selectable
                  >
                    {r.redemption.userId}
                  </Text>
                  <Text style={[styles.cell, styles.cellDate]}>
                    {new Date(r.redemption.redeemedAt).toLocaleDateString()}
                  </Text>
                  <Text style={[styles.cell, styles.cellTx]}>
                    {r.transaction ? `${r.transaction.type} (${r.transaction.amount})` : '-'}
                  </Text>
                </View>
              )
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function formatPromoMode(mode?: string) {
  switch (mode) {
    case 'public_single_use':
      return 'Public Single-Use';
    case 'public_multi_use':
      return 'Public Multi-Use';
    case 'account_single_use':
      return 'Account Single-Use';
    case 'account_multi_use':
      return 'Account Multi-Use';
    default:
      return 'Public Multi-Use';
  }
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    gap: SPACING.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    minHeight: 120,
  },
  panelHeaderSpacer: {
    flex: 1,
  },
  panel: {
    ...BRAND_RAISED_SURFACE,
    borderRadius: 18,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  panelTitle: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 16,
    color: SOFT.textPrimary,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  detailItem: {
    flexBasis: '30%',
    flexGrow: 1,
    minWidth: 140,
  },
  detailLabel: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 11,
    color: SOFT.textMuted,
    marginBottom: 2,
  },
  detailValue: {
    fontFamily: FONTS.ui,
    fontSize: 14,
    color: SOFT.textPrimary,
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
  errorText: {
    fontFamily: FONTS.ui,
    fontSize: 13,
    color: COLORS.error,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    justifyContent: 'flex-end',
  },
  secondaryButton: {
    ...BRAND_RAISED_SURFACE,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    letterSpacing: 0.8,
    color: SOFT.textPrimary,
  },
  dangerButton: {
    backgroundColor: COLORS.error,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  dangerButtonText: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 13,
    color: '#FFFFFF',
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
  cellUser: {
    flex: 2,
  },
  cellUserId: {
    flex: 2,
    minWidth: 0,
  },
  cellMono: {
    fontSize: 11,
  },
  cellDate: {
    flex: 1,
  },
  cellTx: {
    flex: 2,
  },
});
