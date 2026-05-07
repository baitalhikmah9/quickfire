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
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { AdminScreenHeader } from '@/components/admin/AdminScreenHeader';
import { BRAND_ADMIN_TABLE, BRAND_RAISED_SURFACE, COLORS, FONTS, SPACING } from '@/constants/theme';
import { Link } from 'expo-router';
import { HOME_SOFT_UI } from '@/themes';

const SOFT = HOME_SOFT_UI.colors;

export default function WalletsScreen() {
  const { width } = useWindowDimensions();
  const isCompact = width < 768;
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const results = useQuery(
    api.admin.searchWallets,
    submittedQuery ? { query: submittedQuery, limit: 20 } : 'skip'
  );

  const handleSearch = () => {
    setSubmittedQuery(query.trim());
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <AdminScreenHeader
        title="Wallets"
        fallbackHref="/admin"
        backAccessibilityLabel="Back to admin overview"
      />

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Search</Text>
        <View style={[styles.searchRow, isCompact && styles.searchRowCompact]}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
            placeholder="Email, Clerk ID, or Purchaser Account ID"
            placeholderTextColor={COLORS.disabled}
            onSubmitEditing={handleSearch}
          />
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              { opacity: pressed ? 0.9 : 1, transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }] },
            ]}
            onPress={handleSearch}
          >
            <Text style={styles.primaryButtonText}>Search</Text>
          </Pressable>
        </View>
      </View>

      {submittedQuery && results === undefined ? (
        <Text style={styles.empty}>Loading...</Text>
      ) : submittedQuery && results && results.length === 0 ? (
        <Text style={styles.empty}>No wallets found.</Text>
      ) : results && results.length > 0 ? (
        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]}>
            <Text style={[styles.cell, styles.headerCell, styles.cellUser]}>User</Text>
            <Text style={[styles.cell, styles.headerCell, styles.cellId]}>Purchaser ID</Text>
            <Text style={[styles.cell, styles.headerCell, styles.cellBalance]}>Balance</Text>
            <Text style={[styles.cell, styles.headerCell, styles.cellActions]} />
          </View>
          {results.map(({ wallet, user }: { wallet: { _id: string; purchaserAccountId?: string | null; balance: number }; user: { email?: string | null; name?: string | null } | null }) => (
            <View key={wallet._id} style={styles.row}>
              <Text style={[styles.cell, styles.cellUser]}>
                {user?.email ?? user?.name ?? 'Unknown'}
              </Text>
              <Text style={[styles.cell, styles.cellId]} numberOfLines={1}>
                {wallet.purchaserAccountId ?? '-'}
              </Text>
              <Text style={[styles.cell, styles.cellBalance]}>{wallet.balance}</Text>
              <View style={styles.cellActions}>
                <Link href={`/admin/wallets/${wallet._id}`} asChild>
                  <Pressable>
                    <Text style={styles.link}>View</Text>
                  </Pressable>
                </Link>
              </View>
            </View>
          ))}
        </View>
      ) : null}
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
  searchRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'center',
  },
  searchRowCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  searchInput: {
    flex: 1,
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
  primaryButton: {
    ...BRAND_RAISED_SURFACE,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    letterSpacing: 1,
    color: SOFT.textPrimary,
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
  cellId: {
    flex: 2,
  },
  cellBalance: {
    flex: 1,
  },
  cellActions: {
    flex: 1,
    alignItems: 'flex-end',
  },
  link: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 13,
    color: COLORS.primary,
  },
});
