import { View, Text, StyleSheet } from 'react-native';
import { WebAwareModal } from '@/components/WebAwareModal';
import { Pressable } from '@/components/ui/Pressable';
import { COLORS, FONTS, SPACING } from '@/constants';
import { useI18n } from '@/lib/i18n/useI18n';
import { getPlaySurfaceColors } from '@/features/play/playSurfaceColors';
import { SOFT_SURFACE_STYLES } from '@/features/play/styles/softSurface';

export type PlayMatchMenuModalProps = {
  visible: boolean;
  onClose: () => void;
  onSettings: () => void;
  onExitGame: () => void;
};

/**
 * In-match menu opened from the Backfire logo: Settings and Exit Game.
 */
export function PlayMatchMenuModal({
  visible,
  onClose,
  onSettings,
  onExitGame,
}: PlayMatchMenuModalProps) {
  const { t } = useI18n();
  const surfaceColors = getPlaySurfaceColors();

  return (
    <WebAwareModal visible={visible} onRequestClose={onClose}>
      <View
        accessibilityViewIsModal
        style={styles.overlay}
        testID="play-match-menu-modal"
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        />
        <View
          style={[
            styles.card,
            SOFT_SURFACE_STYLES.face,
            SOFT_SURFACE_STYLES.raised,
            { backgroundColor: surfaceColors.surface },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.settings')}
            onPress={onSettings}
            style={({ pressed }) => [
              styles.actionButton,
              styles.settingsButton,
              {
                backgroundColor: surfaceColors.isDark
                  ? 'rgba(255,255,255,0.12)'
                  : '#F2F2F7',
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={[styles.actionButtonText, { color: surfaceColors.textPrimary }]}>
              {t('common.settings').toUpperCase()}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('play.exitGame')}
            onPress={onExitGame}
            style={({ pressed }) => [
              styles.actionButton,
              styles.exitButton,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.exitButtonText}>{t('play.exitGame').toUpperCase()}</Text>
          </Pressable>
        </View>
      </View>
    </WebAwareModal>
  );
}

const styles = StyleSheet.create({
  /** Full-viewport dim scrim inside `WebAwareModal` (native Modal fill shell or web fixed shell). */
  overlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
    zIndex: 1000,
    elevation: 1000,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 28,
    padding: SPACING.lg,
    gap: SPACING.md,
    alignItems: 'stretch',
  },
  actionButton: {
    borderRadius: 16,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  settingsButton: {},
  exitButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    fontFamily: FONTS.uiBold,
    fontSize: 15,
    letterSpacing: 0.4,
  },
  exitButtonText: {
    fontFamily: FONTS.uiBold,
    fontSize: 15,
    letterSpacing: 0.4,
    color: '#FFFFFF',
  },
});
