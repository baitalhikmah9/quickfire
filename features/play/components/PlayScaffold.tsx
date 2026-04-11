import { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
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
  session?: GameSessionState | null;
  footer?: ReactNode;
  /**
   * When false, children live in a bordered card inside a bounded ScrollView: short content keeps a tight card;
   * tall content or small viewports scroll inside the middle region without overflowing the screen.
   */
  bodyScrollEnabled?: boolean;
}

export function PlayScaffold({
  title,
  subtitle,
  children,
  onBack,
  showHud = false,
  session,
  footer,
  bodyScrollEnabled = true,
}: PlayScaffoldProps) {
  const colors = useTheme();
  const { getTextStyle } = useI18n();

  const contentStyles = [styles.content, styles.contentFit];
  const subtitleStyles = [styles.subtitle, styles.subtitleFit];
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

  const main = (
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

      {showHud && session ? <ScoreHud session={session} compact /> : null}

      {bodyScrollEnabled ? (
        <View style={bodyFillStyles}>
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
      ) : (
        <View style={styles.bodyShellNatural}>
          <ScrollView
            style={styles.bodyScrollNatural}
            contentContainerStyle={styles.bodyScrollNaturalContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
            nestedScrollEnabled
          >
            <View style={bodyNaturalCardStyles}>{children}</View>
          </ScrollView>
        </View>
      )}
    </>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScreenContent fullWidth style={styles.screenInner}>
        <View style={styles.fitRoot}>
          <View style={contentStyles}>{main}</View>
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
  bodyCard: {
    borderWidth: 2,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
  },
  bodyCardFit: {
    flex: 1,
    minHeight: 0,
    padding: SPACING.sm,
  },
  /** Fills space under header/subtitle; ScrollView inside clips and scrolls. */
  bodyShellNatural: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    width: '100%',
  },
  bodyScrollNatural: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
  /** flexGrow keeps the scroll area at least viewport-tall so short cards sit at the top without forcing stretch. */
  bodyScrollNaturalContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    paddingBottom: SPACING.sm,
  },
  bodyNaturalCard: {
    borderWidth: 2,
    borderRadius: BORDER_RADIUS.xl,
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
