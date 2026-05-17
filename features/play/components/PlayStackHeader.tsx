import { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { GameHeader } from '@/components/GameHeader';
import { HeaderBackButton } from '@/components/HeaderBackButton';
import { HubTokenChip } from '@/components/HubTokenChip';
import { SPACING } from '@/constants';
import { getRowDirection } from '@/lib/i18n/direction';
import { useI18n } from '@/lib/i18n/useI18n';
import { usePlayStore } from '@/store/play';

const BACKFIRE_TOKEN_ART = require('@/assets/BF in game logo.png');

function formatTokens(n: number, locale: string) {
  return n.toLocaleString(locale, { maximumFractionDigits: 0 });
}

export type PlayStackHeaderProps = {
  title: string;
  /** When set, used instead of default stack back / home fallback. */
  onBackPress?: () => void;
};

/**
 * Play stack top bar — docs/BRAND_GUIDELINES.md soft UI: cream-context chrome, white squircles, charcoal type.
 *
 * Wraps the shared <GameHeader /> in title-only mode so all play screens use
 * consistent header positioning, safe-area handling, and spacing tokens.
 */
export function PlayStackHeader({ title, onBackPress }: PlayStackHeaderProps) {
  const router = useRouter();
  const { direction, t, uiLocale } = useI18n();
  const tokens = usePlayStore((s) => s.tokens);
  const rowDir = getRowDirection(direction);

  const handleBack = useCallback(() => {
    if (onBackPress) {
      onBackPress();
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(app)/');
  }, [onBackPress, router]);

  const formatted = formatTokens(tokens, uiLocale);

  return (
    <View style={styles.wrapper}>
      <GameHeader
        variant="title"
        title={title}
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
            value={formatted}
            rowDirection={rowDir}
            variant="softUi"
            artworkSource={BACKFIRE_TOKEN_ART}
            onPress={() => router.push('/(app)/store')}
            accessibilityLabel={`${t('common.tokens')}: ${formatted}`}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: SPACING.md,
  },
});
