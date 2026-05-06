import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { COLORS, FONTS, SPACING } from '@/constants/theme';

export default function WalletDetailScreen() {
  const { walletId } = useLocalSearchParams<{ walletId: string }>();
  const router = useRouter();
  const wallet = useQuery(api.admin.searchWallets, {
    query: walletId,
    limit: 1,
  });
  const transactions = useQuery(api.admin.listWalletTransactions, {
    walletId: walletId as any,
    limit: 20,
  });
  const adjustWallet = useMutation(api.admin.adjustWallet);

  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const walletData = wallet && wallet.length > 0 ? wallet[0] : null;

  const handleAdjust = async () => {
    setError('');
    const num = parseInt(amount, 10);
    if (Number.isNaN(num)) {
      setError('Enter a valid number.');
      return;
    }
    if (!reason.trim()) {
      setError('Reason is required.');
      return;
    }
    if (!walletData?.wallet.purchaserAccountId) {
      setError('Wallet has no purchaser account id.');
      return;
    }

    try {
      setSubmitting(true);
      await adjustWallet({
        purchaserAccountId: walletData.wallet.purchaserAccountId,
        amount: num,
        reason: reason.trim(),
      });
      setAmount('');
      setReason('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Adjustment failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (wallet === undefined) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!walletData) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Wallet not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.backLink}>← Back to Wallets</Text>
      </Pressable>

      <View style={styles.panel}>
        <Text style={styles.heading}>Wallet</Text>
        <View style={styles.detailsGrid}>
          <DetailItem label="User" value={walletData.user?.email ?? walletData.user?.name ?? 'Unknown'} />
          <DetailItem label="Purchaser ID" value={walletData.wallet.purchaserAccountId ?? '-'} />
          <DetailItem label="Balance" value={String(walletData.wallet.balance)} />
          <DetailItem label="Token Cap" value={walletData.wallet.tokenCap ? String(walletData.wallet.tokenCap) : 'Unlimited'} />
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Manual Adjustment</Text>
        <View style={styles.formRow}>
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Amount (+/- tokens)</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              style={styles.input}
              placeholder="e.g. 10 or -5"
              placeholderTextColor={COLORS.disabled}
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.formField, { flex: 2 }]}>
            <Text style={styles.formLabel}>Reason</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              style={styles.input}
              placeholder="Required reason"
              placeholderTextColor={COLORS.disabled}
            />
          </View>
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Pressable
          style={[styles.primaryButton, submitting && styles.disabledButton]}
          onPress={handleAdjust}
          disabled={submitting}
        >
          <Text style={styles.primaryButtonText}>
            {submitting ? 'Applying...' : 'Apply Adjustment'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Recent Transactions</Text>
        {transactions === undefined ? (
          <Text style={styles.empty}>Loading...</Text>
        ) : transactions.items.length === 0 ? (
          <Text style={styles.empty}>No transactions.</Text>
        ) : (
          <View style={styles.table}>
            <View style={[styles.row, styles.headerRow]}>
              <Text style={[styles.cell, styles.headerCell, styles.cellType]}>Type</Text>
              <Text style={[styles.cell, styles.headerCell, styles.cellAmount]}>Amount</Text>
              <Text style={[styles.cell, styles.headerCell, styles.cellSource]}>Source</Text>
              <Text style={[styles.cell, styles.headerCell, styles.cellReason]}>Reason</Text>
            </View>
            {transactions.items.map((tx: { _id: string; type: string; amount: number; source?: string | null; metadata?: { reason?: string } | null }) => (
              <View key={tx._id} style={styles.row}>
                <Text style={[styles.cell, styles.cellType]}>{tx.type}</Text>
                <Text style={[styles.cell, styles.cellAmount]}>{tx.amount}</Text>
                <Text style={[styles.cell, styles.cellSource]}>{tx.source ?? '-'}</Text>
                <Text style={[styles.cell, styles.cellReason]} numberOfLines={1}>
                  {tx.metadata?.reason ?? '-'}
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
    flexBasis: '45%',
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
  formRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  formField: {
    flex: 1,
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
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
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
  cellType: {
    flex: 2,
  },
  cellAmount: {
    flex: 1,
  },
  cellSource: {
    flex: 1,
  },
  cellReason: {
    flex: 2,
  },
});
