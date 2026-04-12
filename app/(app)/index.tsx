import { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '@clerk/clerk-expo';
import { HubActionCard } from '@/components/HubActionCard';
import { HubTokenChip } from '@/components/HubTokenChip';
import {
  SPACING,
  BORDER_RADIUS,
  FONTS,
  COLORS,
  LAYOUT,
  SHADOWS,
} from '@/constants';
import { ScreenContent } from '@/components/ScreenContent';
import { getChevronName, getRowDirection } from '@/lib/i18n/direction';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';
import { usePlayStore } from '@/store/play';
import { useHubPillLayout } from '@/lib/hooks/useHubPillLayout';

function getResumePath(step?: string): string {
  switch (step) {
    case 'question':
      return '/(app)/play/question';
    case 'answer':
      return '/(app)/play/answer';
    case 'end':
      return '/(app)/play/end';
    case 'board':
      return '/(app)/play/board';
    case 'categories':
      return '/(app)/play/categories';
    case 'team-setup':
      return '/(app)/play/team-setup';
    case 'quick-play-length':
      return '/(app)/play/quick-length';
    case 'mode':
      return '/(app)/play/mode';
    default:
      return '/(app)/play/mode';
  }
}

export default function AppHubScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { direction, getTextStyle, t } = useI18n();
  const { user } = useUser();
  const session = usePlayStore((state) => state.session);
  const tokens = usePlayStore((state) => state.tokens);
  const resetSession = usePlayStore((state) => state.resetSession);
  const ensureDraft = usePlayStore((state) => state.ensureDraft);

  const canResume = Boolean(
    session && session.step !== 'hub' && session.phase !== 'completed'
  );

  const headerDir = direction === 'rtl' ? 'row-reverse' : 'row';
  const rowDir = getRowDirection(direction);
  const chevron = getChevronName(direction);
  const formattedTokens = tokens.toLocaleString('en-US');

  const hubPills = useHubPillLayout(true);
  const { width: windowWidth } = useWindowDimensions();
  /** Extra air on the physical right vs symmetric gutter (LTR hub). */
  const hubHorizontalInset = useMemo(
    () => ({
      paddingLeft: LAYOUT.screenGutter,
      paddingRight: LAYOUT.screenGutter + Math.round(windowWidth * 0.05),
    }),
    [windowWidth]
  );

  const openPlay = useCallback(() => {
    resetSession();
    ensureDraft();
    router.push('/(app)/play/mode');
  }, [ensureDraft, resetSession, router]);

  return (
    <SafeAreaView
      collapsable={false}
      edges={['top', 'bottom', 'left']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScreenContent fullWidth style={styles.viewport}>
        <View style={[styles.headerInset, hubHorizontalInset]}>
        <View style={[styles.topBar, { flexDirection: headerDir }]}>
          <View style={styles.topBarTitleOverlay} pointerEvents="none">
            <Text
              style={[
                styles.topBarTitle,
                { color: colors.textOnBackground },
                getTextStyle(undefined, 'displayBold', 'center'),
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {t('common.appName').toUpperCase()}
            </Text>
          </View>

          <View style={[styles.headerSide, styles.profileHeaderHit]}>
            <Pressable
              onPress={() => router.push('/(app)/profile')}
              style={({ pressed }) => [
                styles.profilePill,
                { flexDirection: rowDir },
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                  opacity: pressed ? 0.92 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('common.profile')}
            >
              {user?.imageUrl ? (
                <Image
                  source={{ uri: user.imageUrl }}
                  style={[styles.profileAvatar, { borderColor: colors.border }]}
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <View
                  style={[
                    styles.profileAvatarFallback,
                    { backgroundColor: colors.border, borderColor: colors.border },
                  ]}
                >
                  <Ionicons
                    name="person"
                    size={18}
                    color={colors.textSecondaryOnBackground}
                  />
                </View>
              )}
              <Text
                style={[styles.profilePillLabel, { color: colors.textOnBackground }]}
                numberOfLines={1}
              >
                {t('common.profile')}
              </Text>
            </Pressable>
          </View>

          <View style={styles.topBarSpacer} />

          <View style={[styles.headerSide, styles.headerSideEnd]}>
            <HubTokenChip
              label={t('common.tokens')}
              value={formattedTokens}
              rowDirection={rowDir}
              onPress={() => router.push('/(app)/store')}
              accessibilityLabel={`${t('common.tokens')}: ${formattedTokens}`}
            />
          </View>
        </View>
        </View>

        <View style={styles.mainDeck}>
          <View style={[styles.deckColumn, styles.deckColumnGrow]}>
            {canResume ? (
              <View style={[styles.deckTopInset, hubHorizontalInset]}>
                <Pressable
                  onPress={() => router.push(getResumePath(session?.step))}
                  style={({ pressed }) => [
                    styles.resumeBar,
                    SHADOWS.card,
                    {
                      backgroundColor: colors.primary,
                      shadowColor: colors.primary,
                      opacity: pressed ? 0.92 : 1,
                      transform: pressed ? [{ scale: 0.97 }] : [{ scale: 1 }],
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t('home.continueGame')}
                >
                  <Ionicons name="play-circle" size={22} color={COLORS.surface} />
                  <View style={styles.resumeBarText}>
                    <Text
                      style={[
                        styles.resumeBarTitle,
                        { color: COLORS.surface },
                        getTextStyle(undefined, 'bodySemibold', 'start'),
                      ]}
                    >
                      {t('home.continueGame')}
                    </Text>
                    <Text
                      style={[
                        styles.resumeBarSub,
                        { color: 'rgba(255,255,255,0.88)' },
                        getTextStyle(undefined, 'body', 'start'),
                      ]}
                    >
                      {t('home.pickUp')}
                    </Text>
                  </View>
                  <Ionicons name={chevron} size={20} color={COLORS.surface} />
                </Pressable>
              </View>
            ) : null}
            <View style={[styles.deckCardInset, hubHorizontalInset]}>
              <View
                style={[
                  styles.cardRow,
                  { flexDirection: getRowDirection(direction) },
                ]}
              >
              <HubActionCard
                title={t('hub.play')}
                subtitle={t('home.pillPlaySub')}
                icon="play-circle"
                accent={colors.primary}
                colors={colors}
                titleStyle={getTextStyle(undefined, 'displayBold', 'center')}
                subtitleStyle={getTextStyle(undefined, 'body', 'center')}
                onPress={openPlay}
                compact={hubPills.compactCards}
                visualVariant="pill3d"
                pillTone="primary"
              />
              <HubActionCard
                title={t('home.pillStoreTitle')}
                subtitle={t('home.pillStoreSub')}
                icon="storefront-outline"
                accent={colors.secondary}
                colors={colors}
                titleStyle={getTextStyle(undefined, 'displayBold', 'center')}
                subtitleStyle={getTextStyle(undefined, 'body', 'center')}
                onPress={() => router.push('/(app)/store')}
                compact={hubPills.compactCards}
                visualVariant="pill3d"
                pillTone="secondary"
              />
              <HubActionCard
                title={t('home.pillHelpTitle')}
                subtitle={t('home.pillHelpSub')}
                icon="book-outline"
                accent={colors.tertiary}
                colors={colors}
                titleStyle={getTextStyle(undefined, 'displayBold', 'center')}
                subtitleStyle={getTextStyle(undefined, 'body', 'center')}
                onPress={() => router.push('/how-to-play')}
                compact={hubPills.compactCards}
                visualVariant="pill3d"
                pillTone="tertiary"
              />
              </View>
            </View>
          </View>
        </View>
      </ScreenContent>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  viewport: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },
  headerInset: {},
  deckTopInset: {},
  /** Vertical flex + width; horizontal inset from `hubHorizontalInset` (+ extra right). */
  deckCardInset: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
  topBar: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    minHeight: 48,
  },
  topBarTitleOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 15,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'center',
    maxWidth: '42%',
  },
  headerSide: {
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSideEnd: {
    alignItems: 'flex-end',
  },
  profileHeaderHit: {
    alignItems: 'flex-start',
  },
  topBarSpacer: {
    flex: 1,
    minWidth: SPACING.md,
  },
  profilePill: {
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 2,
  },
  profilePillLabel: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 15,
    flexShrink: 1,
    minWidth: 0,
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.pill,
    borderWidth: 2,
  },
  profileAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  /** Fills space below the header so `cardRow` flex:1 can stretch hub pills vertically. */
  mainDeck: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
  /** Matches `Button` primary: pill, shadow, min height — hub “continue” CTA. */
  resumeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl + 4,
    minHeight: 56,
    borderRadius: BORDER_RADIUS.pill,
    borderWidth: 0,
  },
  resumeBarText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  resumeBarTitle: {
    fontSize: 16,
    lineHeight: 20,
  },
  resumeBarSub: {
    fontSize: 14,
    lineHeight: 18,
  },
  deckColumn: {
    minWidth: 0,
    gap: SPACING.sm,
  },
  deckColumnGrow: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'flex-start',
  },
  cardRow: {
    flex: 1,
    alignItems: 'stretch',
    gap: SPACING.md,
    minHeight: 0,
    minWidth: 0,
  },
});
