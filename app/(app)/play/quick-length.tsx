import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Platform, useWindowDimensions, type TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable } from '@/components/ui/Pressable';
import { useRouter } from 'expo-router';
import { GameHeader } from '@/components/GameHeader';
import { HeaderBackButton } from '@/components/HeaderBackButton';
import { HubTokenChip } from '@/components/HubTokenChip';
import { ScreenContent } from '@/components/ScreenContent';
import { BORDER_RADIUS, FONT_SIZES, SPACING, LAYOUT, FONTS } from '@/constants';
import { SOFT_SURFACE_STYLES } from '@/features/play/styles/softSurface';
import { QUICK_PLAY_TOPIC_OPTIONS } from '@/features/play/tokenCosts';
import { useI18n } from '@/lib/i18n/useI18n';
import { usePlayStore } from '@/store/play';
import { getRowDirection } from '@/lib/i18n/direction';
import type { SupportedLocale } from '@/lib/i18n/config';
import { HOME_SOFT_UI } from '@/themes';

const T = HOME_SOFT_UI.colors;

const BACKFIRE_TOKEN_ART = require('../../../assets/BF in game logo.png');

const QUICK_LENGTH_LABEL_KEYS = {
  3: 'play.quickLength.option3',
  4: 'play.quickLength.option4',
  5: 'play.quickLength.option5',
} as const;

const QUICK_LENGTH_COPY_KEYS = {
  3: 'play.quickLength.option3Copy',
  4: 'play.quickLength.option4Copy',
  5: 'play.quickLength.option5Copy',
} as const;

function formatTokens(n: number, locale: string) {
  return n.toLocaleString(locale, { maximumFractionDigits: 0 });
}

/** Web-only option row with hover tracking — extracted to keep hooks at top level. */
function OptionRow({
  option,
  isWebRow,
  compact,
  tokenLabel,
  tokensText,
  getTextStyle,
  onSelect,
}: {
  option: { count: number; tokenCost: number; label: string; copy: string };
  isWebRow: boolean;
  compact: boolean;
  tokenLabel: string;
  tokensText: string;
  getTextStyle: (
    locale?: SupportedLocale,
    role?: 'body' | 'bodyMedium' | 'bodySemibold' | 'bodyBold' | 'display' | 'displayBold',
    edge?: 'start' | 'center' | 'end'
  ) => Pick<TextStyle, 'fontFamily' | 'writingDirection' | 'textAlign'>;
  onSelect: (count: number) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      key={option.count}
      onPointerEnter={isWebRow ? () => setHovered(true) : undefined}
      onPointerLeave={isWebRow ? () => setHovered(false) : undefined}
      style={({ pressed }) => [
        styles.optionCard,
        isWebRow
          ? styles.optionCardWeb
          : compact
            ? styles.optionCardCompact
            : styles.optionCardNative,
        SOFT_SURFACE_STYLES.face,
        SOFT_SURFACE_STYLES.raised,
        { backgroundColor: T.surface },
        isWebRow && hovered && styles.optionCardWebHover,
        pressed && styles.optionCardPressed,
      ]}
      onPress={() => onSelect(option.count)}
      accessibilityRole="button"
      accessibilityLabel={`${option.label}, ${option.tokenCost} ${tokensText.toLowerCase()}`}
    >
      <Text
        style={[
          styles.optionTitle,
          isWebRow
            ? styles.optionTitleWeb
            : compact
              ? styles.optionTitleCompact
              : styles.optionTitleNative,
          { color: T.textPrimary },
          getTextStyle(undefined, 'displayBold', 'start'),
        ]}
      >
        {option.label}
      </Text>
      <View style={[styles.tokenCostRow, isWebRow && styles.tokenCostRowWeb]}>
        <Ionicons
          name="diamond"
          size={isWebRow ? 13 : compact ? 11 : 13}
          color={T.textPrimary}
        />
        <Text
          testID={`quick-length-token-cost-${option.count}`}
          style={[
            styles.tokenCostText,
            isWebRow
              ? styles.tokenCostTextWeb
              : compact
                ? styles.tokenCostTextCompact
                : styles.tokenCostTextNative,
            { color: T.textPrimary },
            getTextStyle(undefined, 'bodyBold', 'start'),
          ]}
        >
          {`${option.tokenCost} ${tokenLabel}`}
        </Text>
      </View>
      <Text
        style={[
          styles.optionCopy,
          isWebRow
            ? styles.optionCopyWeb
            : compact
              ? styles.optionCopyCompact
              : styles.optionCopyNative,
          { color: T.textMuted },
          getTextStyle(),
        ]}
      >
        {option.copy}
      </Text>
    </Pressable>
  );
}

export default function QuickLengthScreen() {
  const router = useRouter();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const { t, direction, uiLocale, getTextStyle } = useI18n();
  const setQuickPlayTopicCount = usePlayStore((state) => state.setQuickPlayTopicCount);
  const tokens = usePlayStore((state) => state.tokens);
  const rowDir = getRowDirection(direction);

  const isWeb = Platform.OS === 'web';
  const compact = windowHeight < 720;
  const tokensText = t('common.tokens');
  const tokenLabel = tokensText.toUpperCase();
  const formattedTokens = formatTokens(tokens, uiLocale);

  const options = QUICK_PLAY_TOPIC_OPTIONS.map(({ topicCount, tokenCost }) => ({
    count: topicCount,
    tokenCost,
    label: t(QUICK_LENGTH_LABEL_KEYS[topicCount]),
    copy: t(QUICK_LENGTH_COPY_KEYS[topicCount]),
  }));

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(app)/');
    }
  }, [router]);

  const handleSelect = useCallback(
    (count: number) => {
      setQuickPlayTopicCount(count);
      router.push('/play/team-setup');
    },
    [router, setQuickPlayTopicCount]
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: T.canvas }]}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <ScreenContent fullWidth style={styles.viewport}>
        <GameHeader
          variant="title"
          title={t('play.quickLengthTitle')}
          leftSlot={
            <HeaderBackButton
              onPress={handleBack}
              direction={direction}
              rowDirection={rowDir}
              label={t('common.back')}
            />
          }
          rightSlot={
            <HubTokenChip
              label={t('common.tokens')}
              value={formattedTokens}
              rowDirection={rowDir}
              variant="softUi"
              artworkSource={BACKFIRE_TOKEN_ART}
              onPress={() => router.push('/(app)/store')}
              accessibilityLabel={`${t('common.tokens')}: ${formattedTokens}`}
            />
          }
        />

        {/* Subtitle — flat on cream canvas */}
        <Text
          style={[
            styles.subtitle,
            isWeb && styles.subtitleWeb,
            { color: T.textMuted },
          ]}
        >
          {t('play.quickLengthSubtitle')}
        </Text>

        {/* Options list */}
        <View style={[styles.listWrap, isWeb && styles.listWrapWeb]}>
          <View
            style={[
              styles.list,
              isWeb ? styles.listWeb : styles.listNative,
            ]}
          >
            {options.map((option) => (
              <OptionRow
                key={option.count}
                option={option}
                isWebRow={isWeb}
                compact={compact}
                tokenLabel={tokenLabel}
                tokensText={tokensText}
                getTextStyle={getTextStyle}
                onSelect={handleSelect}
              />
            ))}
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

  /* ── Subtitle ── */
  subtitle: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 18,
    marginBottom: SPACING.md,
    textAlign: 'center',
    paddingHorizontal: SPACING.sm,
  },
  subtitleWeb: {
    fontSize: FONT_SIZES.md,
    lineHeight: 22,
    marginBottom: 32,
  },

  /* ── List wrapper ── */
  listWrap: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    paddingHorizontal: LAYOUT.screenGutter,
  },
  listWrapWeb: {
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  list: {
    width: '100%',
    minWidth: 0,
  },
  listNative: {
    flex: 1,
    minHeight: 0,
    gap: SPACING.sm,
  },
  listWeb: {
    maxWidth: 960,
    gap: 22,
    justifyContent: 'center',
    paddingVertical: SPACING.xs,
  },

  /* ── Option card ── */
  optionCard: {
    borderWidth: 0,
    justifyContent: 'center',
  },
  optionCardNative: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
  optionCardCompact: {
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
  optionCardWeb: {
    borderRadius: 28,
    paddingHorizontal: 36,
    paddingVertical: 28,
    height: 140,
    minHeight: 130,
    maxHeight: 150,
  },
  optionCardWebHover: {
    backgroundColor: '#FDFCFA',
  },
  optionCardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  /* ── Option title ── */
  optionTitle: {
    fontFamily: FONTS.displayBold,
    marginBottom: SPACING.xs,
  },
  optionTitleNative: {
    fontSize: 22,
    lineHeight: 28,
  },
  optionTitleCompact: {
    fontSize: 17,
    lineHeight: 22,
    marginBottom: 2,
  },
  optionTitleWeb: {
    fontSize: 24,
    lineHeight: 30,
    marginBottom: 6,
  },

  /* ── Token cost row ── */
  tokenCostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: SPACING.xs,
  },
  tokenCostRowWeb: {
    marginBottom: 8,
  },
  tokenCostText: {
    fontFamily: FONTS.uiBold,
    letterSpacing: 0.6,
  },
  tokenCostTextNative: {
    fontSize: 12,
    lineHeight: 16,
  },
  tokenCostTextCompact: {
    fontSize: 10,
    lineHeight: 13,
  },
  tokenCostTextWeb: {
    fontSize: 14,
    lineHeight: 18,
  },

  /* ── Option description ── */
  optionCopy: {
    fontFamily: FONTS.ui,
  },
  optionCopyNative: {
    fontSize: FONT_SIZES.md,
    lineHeight: 22,
  },
  optionCopyCompact: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 18,
  },
  optionCopyWeb: {
    fontSize: 15,
    lineHeight: 20,
  },
});
