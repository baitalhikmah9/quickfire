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
import { COLORS, FONTS, SPACING } from '@/constants/theme';
import { Link } from 'expo-router';

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
      <Text style={styles.heading}>Wallets</Text>

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
          <Pressable style={styles.primaryButton} onPress={handleSearch}>
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
    padding: SPACING.lg,
    gap: SPACING.lg,
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
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontFamily: FONTS.ui,
    fontSize: 13,
    color: COLORS.text,
    backgroundColor: '#FAFAFA',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
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
