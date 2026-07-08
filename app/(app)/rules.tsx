import { View, Text, StyleSheet } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPACING, FONT_SIZES, FONTS, SOFT_SURFACE_FACE, softSurfaceLift } from '@/constants';
import { SHOW_HOT_SEAT_UI } from '@/constants/featureFlags';
import { useI18n } from '@/lib/i18n/useI18n';
import { goBackOrReplace } from '@/lib/navigation/goBackOrReplace';
import { HOME_SOFT_UI } from '@/themes';

const T = HOME_SOFT_UI;

export default function RulesModal() {
  const router = useRouter();
  const { t } = useI18n();
  const handleClose = () => goBackOrReplace(router, '/(app)/');

  const canvas = T.colors.canvas;
  const surface = T.colors.surface;
  const textPrimary = T.colors.textPrimary;
  const textMuted = T.colors.textMuted;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: canvas }]}>
      <View style={[styles.header, SOFT_SURFACE_FACE, softSurfaceLift(), { backgroundColor: surface, marginHorizontal: SPACING.lg, marginTop: SPACING.sm, borderRadius: 14 }]}>
        <Pressable
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          style={styles.closeButton}
        >
          <Text style={[styles.closeText, { color: textPrimary }]}>Close</Text>
        </Pressable>
        <Text style={[styles.title, { color: textPrimary }]}>RULES</Text>
      </View>
      <View style={[styles.grid, { gap: SPACING.lg }]}>
        <View style={styles.column}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>WAGERS</Text>
          <Text style={[styles.body, { color: textMuted }]}>
            Before a question is revealed, the current team can wager. Multipliers: 0.5x, 1.5x, or 2x.
            Correct answers multiply points; incorrect answers deduct.
          </Text>
          {SHOW_HOT_SEAT_UI ? (
            <>
              <Text style={[styles.sectionTitle, styles.spacedSectionTitle, { color: textPrimary }]}>
                HOT SEAT
              </Text>
              <Text style={[styles.body, { color: textMuted }]}>
                One player from each team answers solo. Requires player names. 30-second timer. Lifelines
                disabled during Hot Seat.
              </Text>
            </>
          ) : null}
        </View>
        <View style={styles.column}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>LIFELINES</Text>
          <Text style={[styles.body, { color: textMuted }]}>
            Call a Friend, Discard (skip), Answer Rewards. 3 per team per game (configurable). Not
            available during{SHOW_HOT_SEAT_UI ? ' Hot Seat or' : ''} Wager turns.
          </Text>
          <Text style={[styles.sectionTitle, styles.spacedSectionTitle, { color: textPrimary }]}>
            OVERTIME SURGE
          </Text>
          <Text style={[styles.body, { color: textMuted }]}>
            If the score gap is within a threshold at the end, 5 topics appear. Leading team bans one;
            trailing team picks from the rest.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    paddingHorizontal: SPACING.lg,
    height: 64,
  },
  closeButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  closeText: {
    fontFamily: FONTS.uiSemibold,
    fontSize: FONT_SIZES.md,
  },
  title: {
    fontFamily: FONTS.displayBold,
    fontSize: 20,
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.lg,
    padding: SPACING.lg,
    minHeight: 0,
  },
  column: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: FONT_SIZES.md,
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  spacedSectionTitle: {
    marginTop: SPACING.md,
  },
  body: {
    fontFamily: FONTS.ui,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
});
