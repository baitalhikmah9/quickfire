import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { AdminScreenHeader } from '@/components/admin/AdminScreenHeader';
import { AdminCard, AdminCardContent } from '@/components/admin/AdminCard';
import { AdminTable, type AdminTableColumn } from '@/components/admin/AdminTable';
import PromoModeDropdown from '@/components/admin/PromoModeDropdown';
import { ADMIN_THEME } from '@/constants/adminTheme';
import { FALLBACK_CATEGORIES } from '@/constants/categories';
import { FONTS } from '@/constants/theme';

const DAY_MS = 24 * 60 * 60 * 1000;

const WINDOW_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

const MODE_OPTIONS = [
  { value: '', label: 'All modes' },
  { value: 'classic', label: 'Classic' },
  { value: 'quickPlay', label: 'Quick Play' },
  { value: 'random', label: 'Random' },
  { value: 'rumble', label: 'Rumble' },
];

const CATALOG = FALLBACK_CATEGORIES.map((category) => ({
  slug: category.slug,
  title: category.title,
}));

type TopicRow = {
  rank: number;
  slug: string;
  title: string;
  timesChosen: number;
  boardSharePct: number;
  pickSharePct: number;
};

/** Stable window start so useQuery args do not change every render (Date.now thrash). */
export function sinceMsForWindow(window: string, now = Date.now()): number | undefined {
  if (window === 'all') return undefined;
  const days = Number(window);
  if (!Number.isFinite(days) || days <= 0) return undefined;
  return now - days * DAY_MS;
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={styles.statChipValue}>{value}</Text>
      <Text style={styles.statChipLabel}>{label}</Text>
    </View>
  );
}

export default function TopicsScreen() {
  const { width } = useWindowDimensions();
  const isCompact = width < 900;

  const [windowKey, setWindowKey] = useState('30');
  const [mode, setMode] = useState('');

  // Freeze the cutoff when the window filter changes - not on every paint.
  const sinceMs = useMemo(() => sinceMsForWindow(windowKey), [windowKey]);
  const report = useQuery(api.admin.getTopicPopularity, {
    sinceMs,
    mode: mode || undefined,
  });

  const rows: TopicRow[] = useMemo(() => {
    const bySlug = new Map(
      (report?.topics ?? []).map((topic) => [
        topic.slug,
        {
          timesChosen: topic.selectionCount,
          boardSharePct: topic.boardSharePct,
          pickSharePct: topic.pickSharePct,
        },
      ])
    );

    // Include catalog topics with 0 so never-picked packs are visible.
    const merged = CATALOG.map((category) => {
      const stats = bySlug.get(category.slug);
      bySlug.delete(category.slug);
      return {
        slug: category.slug,
        title: category.title,
        timesChosen: stats?.timesChosen ?? 0,
        boardSharePct: stats?.boardSharePct ?? 0,
        pickSharePct: stats?.pickSharePct ?? 0,
      };
    });

    // Any unknown slugs from live data (renamed/removed packs) still show up.
    for (const [slug, stats] of bySlug) {
      merged.push({
        slug,
        title: slug,
        timesChosen: stats.timesChosen,
        boardSharePct: stats.boardSharePct,
        pickSharePct: stats.pickSharePct,
      });
    }

    merged.sort((a, b) => {
      if (b.timesChosen !== a.timesChosen) return b.timesChosen - a.timesChosen;
      return a.title.localeCompare(b.title);
    });

    return merged.map((row, index) => ({ ...row, rank: index + 1 }));
  }, [report]);

  const columns: AdminTableColumn<TopicRow>[] = [
    {
      key: 'rank',
      label: '#',
      flex: 0.4,
      render: (row) => String(row.rank),
    },
    {
      key: 'title',
      label: 'Topic',
      flex: 2.8,
      render: (row) => (
        <View style={styles.topicCell}>
          <Text style={styles.topicTitle} numberOfLines={1}>
            {row.title}
          </Text>
          <Text style={styles.topicSlug} numberOfLines={1}>
            {row.slug}
          </Text>
        </View>
      ),
    },
    {
      key: 'timesChosen',
      label: 'Times chosen',
      flex: 1.1,
      align: 'right',
      render: (row) => row.timesChosen.toLocaleString('en-US'),
    },
    {
      key: 'boardShare',
      label: '% of boards',
      flex: 1,
      align: 'right',
      render: (row) => `${row.boardSharePct.toFixed(1)}%`,
    },
    {
      key: 'pickShare',
      label: '% of picks',
      flex: 1,
      align: 'right',
      render: (row) => `${row.pickSharePct.toFixed(1)}%`,
    },
  ];

  const neverPicked = rows.filter((row) => row.timesChosen === 0).length;
  const boardCountLabel =
    report === undefined ? '-' : report.boardCount.toLocaleString('en-US');
  const pickCountLabel =
    report === undefined ? '-' : (report.pickCount ?? 0).toLocaleString('en-US');
  const neverPickedLabel =
    report === undefined ? '-' : neverPicked.toLocaleString('en-US');

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <AdminScreenHeader
        title="Topic popularity"
        description="Ranked by how often each topic is locked in when a board starts."
      />

      <AdminCard style={styles.toolbarCard}>
        <AdminCardContent style={[styles.toolbar, isCompact && styles.toolbarCompact]}>
          <View style={[styles.filters, isCompact && styles.filtersCompact]}>
            <View style={styles.selectField}>
              <Text style={styles.formLabel}>Window</Text>
              <PromoModeDropdown
                value={windowKey}
                accessibilityLabel="Select time window"
                options={WINDOW_OPTIONS}
                onValueChange={setWindowKey}
              />
            </View>
            <View style={styles.selectField}>
              <Text style={styles.formLabel}>Mode</Text>
              <PromoModeDropdown
                value={mode}
                accessibilityLabel="Select game mode filter"
                options={MODE_OPTIONS}
                onValueChange={setMode}
              />
            </View>
          </View>

          <View style={[styles.stats, isCompact && styles.statsCompact]}>
            <StatChip label="boards" value={boardCountLabel} />
            <StatChip label="picks" value={pickCountLabel} />
            <StatChip label="never chosen" value={neverPickedLabel} />
          </View>
        </AdminCardContent>
      </AdminCard>

      {report === undefined ? (
        <Text style={styles.loadingText}>Loading topic stats…</Text>
      ) : (
        <AdminTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.slug}
          emptyText="No topics in the catalog yet."
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    gap: 16,
  },
  toolbarCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  toolbarCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  filters: {
    flexDirection: 'row',
    gap: 12,
    flexShrink: 1,
  },
  filtersCompact: {
    width: '100%',
  },
  selectField: {
    width: 200,
    maxWidth: '100%',
    flexGrow: 1,
    gap: 6,
  },
  formLabel: {
    fontFamily: FONTS.uiMedium,
    fontSize: 11,
    color: ADMIN_THEME.colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  statsCompact: {
    width: '100%',
    justifyContent: 'flex-start',
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: ADMIN_THEME.colors.border,
    borderRadius: ADMIN_THEME.radius.md,
    backgroundColor: ADMIN_THEME.colors.secondary,
  },
  statChipValue: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 15,
    color: ADMIN_THEME.colors.foreground,
  },
  statChipLabel: {
    fontFamily: FONTS.ui,
    fontSize: 12,
    color: ADMIN_THEME.colors.mutedForeground,
  },
  loadingText: {
    fontFamily: FONTS.ui,
    fontSize: 14,
    color: ADMIN_THEME.colors.mutedForeground,
  },
  topicCell: {
    gap: 2,
    minWidth: 0,
  },
  topicTitle: {
    fontFamily: FONTS.uiMedium,
    fontSize: 13,
    color: ADMIN_THEME.colors.foreground,
  },
  topicSlug: {
    fontFamily: FONTS.ui,
    fontSize: 11,
    color: ADMIN_THEME.colors.mutedForeground,
  },
});
