import { ReactNode } from 'react';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  SPACING,
  BORDER_RADIUS,
  FONT_SIZES,
  LAYOUT,
  getStandardChromeTopPadding,
  getChromeTopPaddingWithInsets,
} from '@/constants';
import { HOME_SOFT_UI } from '@/themes';
import { ScreenContent } from '@/components/ScreenContent';
import { useI18n } from '@/lib/i18n/useI18n';
import { useTheme } from '@/lib/hooks/useTheme';
import type { GameSessionState } from '@/features/shared';
import { ScoreHud } from './ScoreHud';
import { PlayStackHeader } from './PlayStackHeader';
import type { HeaderBackButtonVariant } from '@/components/HeaderBackButton';

interface PlayScaffoldProps {
  title: string;
  subtitle?: string;
  /** Overrides shell background (e.g. brand cream canvas on team setup). */
  backgroundColor?: string;
  children: ReactNode;
  /** When set, replaces the default `PlayStackHeader` (e.g. full-width play board chrome). */
  customHeader?: ReactNode;
  /** Custom back behavior (e.g. match end → home). Default: stack back or play hub. */
  onBack?: () => void;
  /** Defaults to labeled play pill; use `icon` for settings/store squircle. */
  backVariant?: HeaderBackButtonVariant;
  showHud?: boolean;
  /** Tighter score strip (e.g. question board). */
  scoreHudDense?: boolean;
  session?: GameSessionState | null;
  footer?: ReactNode;
  /** Minimal padding and hairline top border — e.g. play board team strip. */
  footerDense?: boolean;
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
  /**
   * When used with `bodyEdgeToEdge`, inset the body and footer horizontally with
   * `max(safe area, screen gutter)` so content clears rounded corners / notches (landscape bezels).
   */
  contentSafeAreaHorizontal?: boolean;
  /**
   * With `bodyEdgeToEdge`, render `footer` between the header chrome and the body (e.g. scores above the board).
   * Ignored when `bodyEdgeToEdge` is false.
   */
  footerAboveBody?: boolean;
  /**
   * Skip the default footer shell (background, top border, outer padding). The footer node owns its own chrome.
   * When `contentSafeAreaHorizontal` + `bodyEdgeToEdge`, only horizontal safe-area gutters wrap the footer.
   */
  footerBare?: boolean;
  /**
   * Override SafeAreaView edges. Defaults: bodyEdgeToEdge → top+bottom; otherwise all sides.
   * Pass e.g. `['bottom']` with a hidden status bar to reclaim top chrome on the board.
   */
  safeAreaEdges?: readonly Edge[];
  /** Merged onto the column that wraps header chrome + body (e.g. zero bottom inset for a flush CTA on phones). */
  chromeColumnStyle?: StyleProp<ViewStyle>;
  /**
   * Max width for the play stack header bar (web). Pass the same value used by the
   * centered content row so back / token chip left-right edges align with content cards.
   * Home/store `contentFrame` pattern.
   */
  contentMaxWidth?: number;
}

export function PlayScaffold({
  title,
  subtitle,
  backgroundColor,
  children,
  customHeader,
  onBack,
  backVariant,
  showHud = false,
  scoreHudDense = false,
  session,
  footer,
  footerDense = false,
  bodyScrollEnabled = true,
  bodyFrame = true,
  bodyEdgeToEdge = false,
  contentSafeAreaHorizontal = false,
  footerAboveBody = false,
  footerBare = false,
  safeAreaEdges,
  chromeColumnStyle,
  contentMaxWidth,
}: PlayScaffoldProps) {
  const colors = useTheme();
  const shellBackground = backgroundColor ?? HOME_SOFT_UI.colors.canvas;
  const { getTextStyle } = useI18n();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const subtitleTight = windowHeight < 700;
  const padLeft = Math.max(insets.left, LAYOUT.screenGutter);
  const padRight = Math.max(insets.right, LAYOUT.screenGutter);
  const isWeb = Platform.OS === 'web';
  const resolvedSafeAreaEdges: readonly Edge[] =
    safeAreaEdges ?? (bodyEdgeToEdge ? (['top', 'bottom'] as const) : (['top', 'bottom', 'left', 'right'] as const));
  /** Question-screen match: if top safe-area is applied by SafeAreaView, only add standard pad. */
  const chromeTopPad = resolvedSafeAreaEdges.includes('top')
    ? getStandardChromeTopPadding(isWeb)
    : getChromeTopPaddingWithInsets(insets.top, isWeb);

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
      {customHeader ?? (
        <PlayStackHeader
          title={title}
          onBackPress={onBack}
          backVariant={backVariant}
          barMaxWidth={contentMaxWidth}
          // Edge chrome already applies standard top pad on the wrap.
          topPad={bodyEdgeToEdge ? 'none' : 'standard'}
        />
      )}

      {customHeader ? null : subtitle ? (
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

      {customHeader ? null : showHud && session ? (
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
        styles.edgeChromeWrap,
        {
          paddingTop: chromeTopPad,
          paddingBottom: SPACING.xs,
          paddingLeft: padLeft,
          paddingRight: padRight,
        },
      ]
    : contentStyles;

  /**
   * Shared content frame (home/store pattern): when `contentMaxWidth` is set, header
   * chrome and body share one centered column so control faces align with card faces.
   */
  const contentFrameStyle =
    contentMaxWidth != null && !bodyEdgeToEdge
      ? ([styles.contentFrame, { maxWidth: contentMaxWidth }] as const)
      : null;

  const main = (
    <>
      {chrome}
      {!bodyEdgeToEdge ? bodySection : null}
    </>
  );

  const footerPlacementAbove = Boolean(footer && bodyEdgeToEdge && footerAboveBody);

  const footerChromeStyles = [
    styles.footer,
    footerDense ? styles.footerDense : styles.footerFit,
    contentSafeAreaHorizontal && bodyEdgeToEdge && {
      paddingLeft: padLeft,
      paddingRight: padRight,
    },
    {
      backgroundColor: shellBackground,
      borderTopColor: colors.border,
    },
    footerPlacementAbove && {
      borderTopWidth: 0,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    footerPlacementAbove && styles.footerSlotFixed,
  ];

  const footerHorizontalGutter =
    footerBare && contentSafeAreaHorizontal && bodyEdgeToEdge
      ? { paddingLeft: padLeft, paddingRight: padRight }
      : null;

  const footerShell =
    footer ? (
      footerBare ? (
        footerHorizontalGutter ? (
          <View style={[footerHorizontalGutter, footerPlacementAbove && styles.footerSlotFixed]}>{footer}</View>
        ) : footerPlacementAbove ? (
          <View style={styles.footerSlotFixed}>{footer}</View>
        ) : (
          footer
        )
      ) : (
        <View style={footerChromeStyles}>{footer}</View>
      )
    ) : null;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: shellBackground }]}
      edges={resolvedSafeAreaEdges}
    >
      <ScreenContent fullWidth style={styles.screenInner}>
        <View style={styles.fitRoot}>
          <View style={[paddedColumnStyles, chromeColumnStyle]}>
            {contentFrameStyle ? (
              <View style={contentFrameStyle}>{main}</View>
            ) : (
              main
            )}
          </View>
          {footerPlacementAbove ? footerShell : null}
          {bodyEdgeToEdge ? (
            <View
              style={[
                styles.edgeBodySlot,
                contentSafeAreaHorizontal && {
                  paddingLeft: padLeft,
                  paddingRight: padRight,
                },
              ]}
            >
              {bodySection}
            </View>
          ) : null}
        </View>
      </ScreenContent>

      {footer && !footerPlacementAbove ? footerShell : null}
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
    paddingBottom: SPACING.sm,
  },
  contentFit: {
    flex: 1,
    paddingTop: 0,
    paddingHorizontal: LAYOUT.screenGutter,
    paddingBottom: SPACING.xs,
    minHeight: 0,
  },
  /** Centered column for header + body when `contentMaxWidth` is set. */
  contentFrame: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    minWidth: 0,
    minHeight: 0,
  },
  /** Top chrome only — body is a sibling (`edgeBodySlot`). Top pad applied via getStandardChromeTopPadding. */
  edgeChromeWrap: {
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 0,
    width: '100%',
  },
  /** Keeps team strip / footer from collapsing when the board body fights for height. */
  footerSlotFixed: {
    flexGrow: 0,
    flexShrink: 0,
  },
  edgeBodySlot: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    width: '100%',
    alignSelf: 'stretch',
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
    width: '100%',
    alignSelf: 'stretch',
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
  footerDense: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
