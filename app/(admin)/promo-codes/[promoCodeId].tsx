import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { COLORS, FONTS, SPACING } from '@/constants/theme';

export default function PromoCodeDetailScreen() {
  const { promoCodeId } = useLocalSearchParams<{ promoCodeId: string }>();
  const router = useRouter();
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
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (promo === null) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Promo code not found.</Text>
      </View>
    );
  }

  const { promoCode, redemptions } = promo;
  const isActive = promoCode.active !== false;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.backLink}>← Back to Promo Codes</Text>
      </Pressable>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.heading}>{promoCode.code}</Text>
          {isActive && (
            <Pressable style={styles.dangerButton} onPress={() => setShowDisable(true)}>
              <Text style={styles.dangerButtonText}>Disable</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.detailsGrid}>
          <DetailItem label="Reward Type" value={promoCode.rewardType} />
          <DetailItem label="Reward Amount" value={String(promoCode.rewardAmount)} />
          <DetailItem label="Usage Cap" value={String(promoCode.usageCap)} />
          <DetailItem label="Used Count" value={String(promoCode.usedCount ?? 0)} />
          <DetailItem label="Per-User Limit" value={String(promoCode.perUserLimit ?? 1)} />
          <DetailItem label="Active" value={isActive ? 'Yes' : 'No'} />
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
              <Text style={[styles.cell, styles.headerCell, styles.cellDate]}>Date</Text>
              <Text style={[styles.cell, styles.headerCell, styles.cellTx]}>Transaction</Text>
            </View>
            {redemptions.map((r: { redemption: { _id: string; redeemedAt: number }; user: { email?: string | null; clerkId?: string | null } | null; transaction: { type: string; amount: number } | null }) => (
              <View key={r.redemption._id} style={styles.row}>
                <Text style={[styles.cell, styles.cellUser]}>
                  {r.user?.email ?? r.user?.clerkId ?? 'Unknown'}
                </Text>
                <Text style={[styles.cell, styles.cellDate]}>
                  {new Date(r.redemption.redeemedAt).toLocaleDateString()}
                </Text>
                <Text style={[styles.cell, styles.cellTx]}>
                  {r.transaction ? `${r.transaction.type} (${r.transaction.amount})` : '-'}
                </Text>
              </View>
            ))}
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

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  backLink: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 13,
    color: COLORS.primary,
  },
  heading: {
    fontFamily: FONTS.displayBold,
    fontSize: 24,
    color: COLORS.text,
  },
  panel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.text,
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
    color: COLORS.mutedText,
    marginBottom: 2,
  },
  detailValue: {
    fontFamily: FONTS.ui,
    fontSize: 14,
    color: COLORS.text,
  },
  formLabel: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 12,
    color: COLORS.mutedText,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontFamily: FONTS.ui,
    fontSize: 13,
    color: COLORS.text,
    backgroundColor: '#FAFAFA',
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
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  secondaryButtonText: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 13,
    color: COLORS.text,
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
    color: COLORS.mutedText,
    paddingVertical: SPACING.md,
  },
  table: {
    gap: 1,
    backgroundColor: COLORS.border,
    borderRadius: 8,
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
    backgroundColor: '#F9FAFB',
  },
  cell: {
    fontFamily: FONTS.ui,
    fontSize: 13,
    color: COLORS.text,
  },
  headerCell: {
    fontFamily: FONTS.uiSemibold,
    color: COLORS.mutedText,
    fontSize: 12,
  },
  cellUser: {
    flex: 2,
  },
  cellDate: {
    flex: 1,
  },
  cellTx: {
    flex: 2,
  },
});
