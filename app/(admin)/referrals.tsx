import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { api } from '@/convex/_generated/api';
import { AdminScreenHeader } from '@/components/admin/AdminScreenHeader';
import { AdminCard, AdminCardTitle } from '@/components/admin/AdminCard';
import { AdminButton } from '@/components/admin/AdminButton';
import { AdminTable, type AdminTableColumn } from '@/components/admin/AdminTable';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { ADMIN_THEME } from '@/constants/adminTheme';
import { FONTS } from '@/constants/theme';
import { adminHref } from '@/lib/admin/shell';

type ReferralEvent = {
  transactionId: string;
  createdAt: number;
  tokensGranted: number;
  code: string | null;
  invitee: {
    userId: string;
    email: string | null;
    name: string | null;
    walletId: string | null;
  } | null;
  inviter: {
    userId: string;
    email: string | null;
    name: string | null;
    referralCode: string | null;
    successfulReferralCount: number;
  } | null;
};

type TopReferrer = {
  userId: string;
  email: string | null;
  name: string | null;
  referralCode: string | null;
  successfulReferralCount: number;
};

function labelUser(user: { email: string | null; name: string | null; userId: string } | null) {
  if (!user) return '-';
  return user.email ?? user.name ?? user.userId;
}

export default function ReferralsScreen() {
  const { width } = useWindowDimensions();
  const isCompact = width < 768;
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [cursorStack, setCursorStack] = useState<number[]>([]);
  const cursor = cursorStack.length > 0 ? cursorStack[cursorStack.length - 1] : undefined;

  const data = useQuery(api.admin.listReferrals, {
    query: submittedSearch || undefined,
    cursor,
    limit: 50,
  });

  const handleSearch = () => {
    setSubmittedSearch(search.trim());
    setCursorStack([]);
  };

  const handleNext = () => {
    if (data?.nextCursor != null) {
      setCursorStack([...cursorStack, data.nextCursor]);
    }
  };

  const handlePrevious = () => setCursorStack(cursorStack.slice(0, -1));

  const eventColumns: AdminTableColumn<ReferralEvent>[] = [
    {
      key: 'when',
      label: 'When',
      flex: 1.2,
      render: (row) => new Date(row.createdAt).toLocaleString(),
    },
    {
      key: 'invitee',
      label: 'Invitee',
      flex: 2,
      render: (row) => labelUser(row.invitee),
    },
    {
      key: 'inviter',
      label: 'Inviter',
      flex: 2,
      render: (row) => labelUser(row.inviter),
    },
    {
      key: 'code',
      label: 'Code',
      flex: 1,
      render: (row) => row.code ?? '-',
    },
    {
      key: 'tokens',
      label: 'Tokens each',
      flex: 1,
      align: 'right',
      render: (row) => String(row.tokensGranted),
    },
  ];

  const topColumns: AdminTableColumn<TopReferrer>[] = [
    {
      key: 'user',
      label: 'User',
      flex: 2,
      render: (row) => labelUser(row),
    },
    {
      key: 'code',
      label: 'Invite code',
      flex: 1,
      render: (row) => row.referralCode ?? '-',
    },
    {
      key: 'count',
      label: 'Successful invites',
      flex: 1,
      align: 'right',
      render: (row) => String(row.successfulReferralCount),
    },
  ];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <AdminScreenHeader
        title="Referrals"
        description="Track Give one, get one invites and token grants"
      />

      <View style={[styles.statsRow, isCompact && styles.statsRowCompact]}>
        <AdminCard style={styles.statCard}>
          <Text style={styles.statLabel}>Successful referrals</Text>
          <Text style={styles.statValue}>
            {data ? String(data.stats.totalSuccessfulReferrals) : '-'}
          </Text>
        </AdminCard>
        <AdminCard style={styles.statCard}>
          <Text style={styles.statLabel}>Users who invited someone</Text>
          <Text style={styles.statValue}>
            {data ? String(data.stats.totalReferrers) : '-'}
          </Text>
        </AdminCard>
        <AdminCard style={styles.statCard}>
          <Text style={styles.statLabel}>Reward each side</Text>
          <Text style={styles.statValue}>
            {data ? `${data.stats.rewardTokens} tokens` : '-'}
          </Text>
        </AdminCard>
      </View>

      <AdminCard>
        <AdminCardTitle>Search referrals</AdminCardTitle>
        <View style={[styles.searchRow, isCompact && styles.searchRowCompact]}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            placeholder="Email, name, or invite code..."
            placeholderTextColor={ADMIN_THEME.colors.mutedForeground}
            autoCapitalize="none"
            onSubmitEditing={handleSearch}
          />
          <AdminButton label="Search" onPress={handleSearch} />
        </View>
      </AdminCard>

      {data === undefined ? (
        <Text style={styles.loadingText}>Loading referrals...</Text>
      ) : (
        <>
          <AdminCard>
            <AdminCardTitle>Recent successful invites</AdminCardTitle>
          </AdminCard>
          <AdminTable
            columns={eventColumns}
            rows={data.items as ReferralEvent[]}
            rowKey={(row) => row.transactionId}
            onRowPress={(row) => {
              if (row.invitee?.walletId) {
                router.push(adminHref(`/admin/wallets/${row.invitee.walletId}`) as any);
              }
            }}
            emptyText="No referral grants yet."
          />
          {(cursorStack.length > 0 || data.nextCursor != null) && (
            <AdminPagination
              hasPrevious={cursorStack.length > 0}
              hasNext={data.nextCursor != null}
              onPrevious={handlePrevious}
              onNext={handleNext}
            />
          )}

          <AdminCard>
            <AdminCardTitle>Top referrers</AdminCardTitle>
          </AdminCard>
          <AdminTable
            columns={topColumns}
            rows={data.topReferrers as TopReferrer[]}
            rowKey={(row) => row.userId}
            emptyText="No successful referrers yet."
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    gap: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  statsRowCompact: {
    flexDirection: 'column',
  },
  statCard: {
    flexGrow: 1,
    flexBasis: 180,
    minWidth: 160,
  },
  statLabel: {
    fontFamily: FONTS.ui,
    fontSize: 12,
    color: ADMIN_THEME.colors.mutedForeground,
    marginBottom: 6,
  },
  statValue: {
    fontFamily: FONTS.uiBold,
    fontSize: 22,
    color: ADMIN_THEME.colors.foreground,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  searchRowCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  searchInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderColor: ADMIN_THEME.colors.border,
    borderRadius: ADMIN_THEME.radius.md,
    paddingHorizontal: 12,
    fontFamily: FONTS.ui,
    fontSize: 13,
    color: ADMIN_THEME.colors.foreground,
    backgroundColor: ADMIN_THEME.colors.inputBackground,
  },
  loadingText: {
    fontFamily: FONTS.ui,
    fontSize: 14,
    color: ADMIN_THEME.colors.mutedForeground,
    paddingVertical: 20,
  },
});
