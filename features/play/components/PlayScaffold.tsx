import { ReactNode } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { SPACING, BORDER_RADIUS, FONT_SIZES, LAYOUT } from '@/constants';
import { ScreenContent } from '@/components/ScreenContent';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';
import type { GameSessionState } from '@/features/shared';
import { ScoreHud } from './ScoreHud';
import { PlayStackHeader } from './PlayStackHeader';

interface PlayScaffoldProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Custom back behavior (e.g. match end → home). Default: stack back or play hub. */
  onBack?: () => void;
  showHud?: boolean;
  /** Tighter score strip (e.g. question board). */
  scoreHudDense?: boolean;
  session?: GameSessionState | null;
  footer?: ReactNode;
  /**
   * When false, the body is a flex region with no outer scroll — children should size to fit (or use nested scroll).
   */
  bodyScrollEnabled?: boolean;
  /**
   * Wrap body in the bordered card (default). Set false for edge-to-edge content (e.g. topic grid, question board).
   * Applies with both scroll and non-scroll body modes.
   */
  bodyFrame?: boolean;
  /**
   * Header / HUD stay inset; body fills full width under horizontal safe areas (landscape bezels).
   */
  bodyEdgeToEdge?: boolean;
}

export function PlayScaffold({
  title,
  subtitle,
  children,
  onBack,
  showHud = false,
  scoreHudDense = false,
  session,
  footer,
  bodyScrollEnabled = true,
  bodyFrame = true,
  bodyEdgeToEdge = false,
}: PlayScaffoldProps) {
  const colors = useTheme();
  const { getTextStyle } = useI18n();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const subtitleTight = windowHeight < 700;
  const padLeft = Math.max(insets.left, LAYOUT.screenGutter);
  const padRight = Math.max(insets.right, LAYOUT.screenGutter);

  const contentStyles = [styles.content, styles.contentFit];
  const subtitleStyles = [
    styles.subtitle,
    styles.subtitleFit,
    ...(subtitleTight ? [styles.subtitleTighter] : []),
  ];
  const bodyFillStyles = [
    styles.bodyCard,
    styles.bodyCardFit,
    {
      backgroundColor: colors.cardBackground,
      borderColor: colors.border,
    },
  ];
  const bodyNaturalCardStyles = [
    styles.bodyNaturalCard,
    {
      backgroundColor: colors.cardBackground,
      borderColor: colors.border,
    },
  ];

  const chrome = (
    <>
      <PlayStackHeader title={title} onBackPress={onBack} />

      {subtitle ? (
        <Text
          style={[
            ...subtitleStyles,
            { color: colors.textSecondary },
            getTextStyle(undefined, 'body', 'center'),
          ]}
        >
          {subtitle}
        </Text>
      ) : null}

      {showHud && session ? (
        <ScoreHud session={session} compact dense={scoreHudDense} />
      ) : null}
    </>
  );

  const bodySection = bodyScrollEnabled ? (
    <View style={bodyFrame ? bodyFillStyles : styles.bodyScrollShellFlush}>
      <ScrollView
        style={styles.bodyScroll}
        contentContainerStyle={styles.bodyScrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
        nestedScrollEnabled
      >
        {children}
      </ScrollView>
    </View>
  ) : bodyFrame ? (
    <View style={styles.bodyShellNatural}>
      <View style={[bodyNaturalCardStyles, styles.bodyNaturalCardNoScroll]}>
        {children}
      </View>
    </View>
  ) : (
    <View style={[styles.bodyShellNatural, styles.bodyShellFlush]}>{children}</View>
  );

  const paddedColumnStyles = bodyEdgeToEdge
    ? [
        styles.content,
        styles.chromeColumn,
        {
          paddingLeft: padLeft,
          paddingRight: padRight,
        },
      ]
    : contentStyles;

  const main = (
    <>
      {chrome}
      {!bodyEdgeToEdge ? bodySection : null}
    </>
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={bodyEdgeToEdge ? ['top', 'bottom'] : undefined}
    >
      <ScreenContent fullWidth style={styles.screenInner}>
        <View style={styles.fitRoot}>
          <View style={paddedColumnStyles}>{main}</View>
          {bodyEdgeToEdge ? (
            <View style={styles.edgeBodySlot}>{bodySection}</View>
          ) : null}
        </View>
      </ScreenContent>

      {footer ? (
        <View
          style={[
            styles.footer,
            styles.footerFit,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  screenInner: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },
  fitRoot: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.huge,
  },
  contentFit: {
    flex: 1,
    paddingTop: 0,
    paddingHorizontal: LAYOUT.screenGutter,
    paddingBottom: SPACING.sm,
    minHeight: 0,
  },
  /** Top chrome only — body is a sibling (`edgeBodySlot`) for full horizontal bleed. */
  chromeColumn: {
    flexGrow: 0,
    flexShrink: 0,
    paddingTop: 0,
    paddingBottom: SPACING.sm,
    minHeight: 0,
  },
  edgeBodySlot: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    lineHeight: 22,
    marginBottom: SPACING.md,
    textAlign: 'center',
    paddingHorizontal: SPACING.sm,
  },
  subtitleFit: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  subtitleTighter: {
    fontSize: FONT_SIZES.xs,
    lineHeight: 16,
    marginBottom: SPACING.xs,
  },
  bodyCard: {
    borderWidth: 2,
    borderRadius: BORDER_RADIUS.xl,
    borderStyle: 'solid',
    overflow: 'hidden',
    padding: SPACING.lg,
  },
  bodyCardFit: {
    flex: 1,
    minHeight: 0,
    padding: SPACING.sm,
  },
  /** Scroll body without bordered card — same flex contract as `bodyCard` + `bodyCardFit`. */
  bodyScrollShellFlush: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    width: '100%',
    overflow: 'hidden',
  },
  /** Fills space under header/subtitle; ScrollView inside clips and scrolls. */
  bodyShellNatural: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    width: '100%',
  },
  /** No-scroll body without inner card — children sit on shell background. */
  bodyShellFlush: {
    overflow: 'hidden',
  },
  /** Fills middle region; children use flex to distribute space (no body scroll). */
  bodyNaturalCardNoScroll: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
  bodyNaturalCard: {
    borderWidth: 2,
    borderRadius: BORDER_RADIUS.xl,
    borderStyle: 'solid',
    overflow: 'hidden',
    padding: SPACING.sm,
    width: '100%',
    gap: SPACING.sm,
  },
  bodyScroll: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
  bodyScrollContent: {
    flexGrow: 1,
    gap: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  footer: {
    borderTopWidth: 2,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  footerFit: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
});
