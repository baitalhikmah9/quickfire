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
   * When false, the bordered body is a plain column that grows with `children` (no inner vertical ScrollView).
   * Use for short wizard steps so the card height matches content.
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

  const contentStyles = [
    styles.content,
    styles.contentFit,
    !bodyScrollEnabled && styles.contentFitNaturalHeight,
  ];
  const subtitleStyles = [styles.subtitle, styles.subtitleFit];
  const bodyStyles = [
    styles.bodyCard,
    bodyScrollEnabled ? styles.bodyCardFit : styles.bodyCardNatural,
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

      <View style={bodyStyles}>
        {bodyScrollEnabled ? (
          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
            nestedScrollEnabled
          >
            {children}
          </ScrollView>
        ) : (
          <View style={styles.bodyNaturalInner}>{children}</View>
        )}
      </View>
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
  /** Body uses intrinsic height instead of flex-fill + ScrollView. */
  contentFitNaturalHeight: {
    justifyContent: 'flex-start',
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
  bodyCardNatural: {
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'stretch',
    width: '100%',
    padding: SPACING.sm,
  },
  bodyNaturalInner: {
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
