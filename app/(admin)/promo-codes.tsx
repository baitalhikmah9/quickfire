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
import { COLORS, FONTS, SPACING } from '@/constants/theme';
import { Link } from 'expo-router';

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
  const [perUserLimit, setPerUserLimit] = useState('1');
  const [campaignName, setCampaignName] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    setError('');
    const amount = parseInt(rewardAmount, 10);
    const cap = parseInt(usageCap, 10);
    const limit = parseInt(perUserLimit, 10);

    if (!code.trim() || Number.isNaN(amount) || Number.isNaN(cap)) {
      setError('Code, reward amount, and usage cap are required.');
      return;
    }

    try {
      setSubmitting(true);
      await createPromo({
        code: code.trim(),
        rewardAmount: amount,
        usageCap: cap,
        perUserLimit: Number.isNaN(limit) ? undefined : limit,
        metadata: campaignName || notes ? { campaignName: campaignName || undefined, notes: notes || undefined } : undefined,
      });
      setCode('');
      setRewardAmount('');
      setUsageCap('');
      setPerUserLimit('1');
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
      <View style={styles.header}>
        <Text style={styles.heading}>Promo Codes</Text>
        <Pressable style={styles.primaryButton} onPress={() => setShowCreate((s) => !s)}>
          <Text style={styles.primaryButtonText}>{showCreate ? 'Cancel' : 'Create'}</Text>
        </Pressable>
      </View>

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
              <Text style={styles.formLabel}>Usage Cap</Text>
              <TextInput
                value={usageCap}
                onChangeText={setUsageCap}
                style={styles.input}
                placeholder="Max redemptions"
                placeholderTextColor={COLORS.disabled}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Per-User Limit</Text>
              <TextInput
                value={perUserLimit}
                onChangeText={setPerUserLimit}
                style={styles.input}
                placeholder="Default 1"
                placeholderTextColor={COLORS.disabled}
                keyboardType="numeric"
              />
            </View>
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
            style={[styles.primaryButton, submitting && styles.disabledButton]}
            onPress={handleCreate}
            disabled={submitting}
          >
            <Text style={styles.primaryButtonText}>
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
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heading: {
    fontFamily: FONTS.displayBold,
    fontSize: 24,
    color: COLORS.text,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 13,
    color: '#FFFFFF',
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
  filterRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  filterInput: {
    flex: 1,
    maxWidth: 320,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontFamily: FONTS.ui,
    fontSize: 13,
    color: COLORS.text,
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    fontFamily: FONTS.ui,
    fontSize: 13,
    color: COLORS.error,
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
