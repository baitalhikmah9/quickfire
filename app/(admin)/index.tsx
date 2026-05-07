import React from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { BRAND_ADMIN_TABLE, BRAND_RAISED_SURFACE, COLORS, FONTS, SPACING } from '@/constants/theme';
import { Link } from 'expo-router';
import { HOME_SOFT_UI } from '@/themes';

const SOFT = HOME_SOFT_UI.colors;

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <View style={[statStyles.card, BRAND_RAISED_SURFACE, { borderRadius: 18 }]}>
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
      <View style={[styles.pageHeader, isCompact && styles.pageHeaderCompact]}>
        <Text style={styles.heading}>Overview</Text>
        <View style={[styles.headerActions, isCompact && styles.headerActionsCompact]}>
          <Link href="/admin/promo-codes" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create promo code. Coupons, account restrictions, and token rewards."
              style={({ pressed }) => [
                styles.headerAction,
                BRAND_RAISED_SURFACE,
                isCompact && styles.headerActionFlex,
                pressed && styles.headerActionPressed,
              ]}
            >
              <Text style={styles.headerActionLabel}>Promo codes</Text>
            </Pressable>
          </Link>
          <Link href="/admin/wallets" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Manage wallets. Search accounts and adjust token balances."
              style={({ pressed }) => [
                styles.headerAction,
                BRAND_RAISED_SURFACE,
                isCompact && styles.headerActionFlex,
                pressed && styles.headerActionPressed,
              ]}
            >
              <Text style={styles.headerActionLabel}>Wallets</Text>
            </Pressable>
          </Link>
        </View>
      </View>

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
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    flexWrap: 'wrap',
  },
  pageHeaderCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  heading: {
    fontFamily: FONTS.displayBold,
    fontSize: 24,
    color: SOFT.textPrimary,
    flexShrink: 0,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexShrink: 0,
  },
  headerActionsCompact: {
    alignSelf: 'stretch',
    flexDirection: 'row',
  },
  /** Matches docs/BRAND_GUIDELINES.md — standard raised button surface */
  headerAction: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActionPressed: {
    opacity: 0.9,
  },
  headerActionFlex: {
    flex: 1,
  },
  /** Functional labels: bold + all caps per brand typography table */
  headerActionLabel: {
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    letterSpacing: 0.9,
    color: SOFT.textPrimary,
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  statsRowCompact: {
    flexDirection: 'column',
  },
  section: {
    ...BRAND_RAISED_SURFACE,
    borderRadius: 18,
    padding: SPACING.lg,
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
    color: SOFT.textPrimary,
  },
  link: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 13,
    color: COLORS.primary,
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
    padding: SPACING.lg,
    minWidth: 0,
  },
  value: {
    fontFamily: FONTS.displayBold,
    fontSize: 28,
    color: SOFT.textPrimary,
    marginBottom: 4,
  },
  label: {
    fontFamily: FONTS.ui,
    fontSize: 12,
    color: SOFT.textMuted,
  },
});
