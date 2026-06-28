import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { AdminScreenHeader } from '@/components/admin/AdminScreenHeader';
import { BRAND_ADMIN_TABLE, BRAND_RAISED_SURFACE, COLORS, FONTS, SPACING } from '@/constants/theme';
import { HOME_SOFT_UI } from '@/themes';

const SOFT = HOME_SOFT_UI.colors;

export default function WalletDetailScreen() {
  const { walletId } = useLocalSearchParams<{ walletId: string }>();
  const wallet = useQuery(api.admin.getWallet, {
    walletId: walletId as any,
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

  const walletData = wallet;

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
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <AdminScreenHeader
          title="Wallet"
          fallbackHref="/admin/wallets"
          backAccessibilityLabel="Back to wallets"
        />
        <View style={styles.center}>
          <Text>Loading...</Text>
        </View>
      </ScrollView>
    );
  }

  if (!walletData) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <AdminScreenHeader
          title="Wallet"
          fallbackHref="/admin/wallets"
          backAccessibilityLabel="Back to wallets"
        />
        <View style={styles.center}>
          <Text style={styles.errorText}>Wallet not found.</Text>
        </View>
      </ScrollView>
    );
  }

  const walletTitle =
    walletData.user?.email ?? walletData.user?.name ?? 'Wallet';
  const walletTitleUppercase = !walletData.user?.email && !walletData.user?.name;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <AdminScreenHeader
        title={walletTitle}
        uppercase={walletTitleUppercase}
        fallbackHref="/admin/wallets"
        backAccessibilityLabel="Back to wallets"
      />

      <View style={styles.panel}>
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
          style={({ pressed }) => [
            styles.submitButton,
            submitting && styles.disabledButton,
            { opacity: pressed && !submitting ? 0.92 : 1 },
          ]}
          onPress={handleAdjust}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
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
    gap: SPACING.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    minHeight: 120,
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
    color: SOFT.textMuted,
    marginBottom: 2,
  },
  detailValue: {
    fontFamily: FONTS.ui,
    fontSize: 14,
    color: SOFT.textPrimary,
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
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontFamily: FONTS.uiBold,
    fontSize: 13,
    letterSpacing: 0.6,
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
