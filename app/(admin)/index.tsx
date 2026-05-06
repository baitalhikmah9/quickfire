import React from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { COLORS, FONTS, SPACING } from '@/constants/theme';
import { Link } from 'expo-router';

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <View style={statStyles.card}>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

export default function AdminIndexScreen() {
  const { width } = useWindowDimensions();
  const isCompact = width < 768;
  const promoCodes = useQuery(api.admin.listPromoCodes, { limit: 100 });
  const transactions = useQuery(api.admin.listWalletTransactions, { limit: 5 });

    const activePromos =
      promoCodes?.items.filter((p: { status: string }) => p.status === 'active').length ?? 0;
    const totalPromos = promoCodes?.items.length ?? 0;
    const totalRedemptions =
      promoCodes?.items.reduce((sum: number, p: { usedCount?: number }) => sum + (p.usedCount ?? 0), 0) ?? 0;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Overview</Text>

      <View style={[styles.statsRow, isCompact && styles.statsRowCompact]}>
        <StatCard label="Active Promo Codes" value={activePromos} />
        <StatCard label="Total Promo Codes" value={totalPromos} />
        <StatCard label="Total Redemptions" value={totalRedemptions} />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <Link href="/admin/wallets" asChild>
            <Pressable>
              <Text style={styles.link}>View all</Text>
            </Pressable>
          </Link>
        </View>

        {transactions === undefined ? (
          <Text style={styles.empty}>Loading...</Text>
        ) : transactions.items.length === 0 ? (
          <Text style={styles.empty}>No transactions yet.</Text>
        ) : (
          <View style={styles.table}>
            <View style={[styles.row, styles.headerRow]}>
              <Text style={[styles.cell, styles.headerCell, styles.cellType]}>Type</Text>
              <Text style={[styles.cell, styles.headerCell, styles.cellAmount]}>Amount</Text>
              <Text style={[styles.cell, styles.headerCell, styles.cellSource]}>Source</Text>
            </View>
            {transactions.items.map((tx: { _id: string; type: string; amount: number; source?: string | null }) => (
              <View key={tx._id} style={styles.row}>
                <Text style={[styles.cell, styles.cellType]}>{tx.type}</Text>
                <Text style={[styles.cell, styles.cellAmount]}>{tx.amount}</Text>
                <Text style={[styles.cell, styles.cellSource]}>{tx.source ?? '-'}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.lg,
  },
  heading: {
    fontFamily: FONTS.displayBold,
    fontSize: 24,
    color: COLORS.text,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  statsRowCompact: {
    flexDirection: 'column',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 16,
    color: COLORS.text,
  },
  link: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 13,
    color: COLORS.primary,
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
    textAlign: 'right',
  },
  cellSource: {
    flex: 2,
    textAlign: 'right',
  },
});

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 0,
  },
  value: {
    fontFamily: FONTS.displayBold,
    fontSize: 28,
    color: COLORS.text,
    marginBottom: 4,
  },
  label: {
    fontFamily: FONTS.ui,
    fontSize: 12,
    color: COLORS.mutedText,
  },
});
