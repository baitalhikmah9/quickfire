import { View, Text, StyleSheet } from 'react-native';
import { WebAwareModal } from '@/components/WebAwareModal';
import { Pressable } from '@/components/ui/Pressable';
import { COLORS, FONTS, SPACING } from '@/constants';
import { relativeLuminance, PALETTES } from '@/constants/theme';
import { useDarkModeFlatTop } from '@/lib/hooks/useTheme';
import { HOME_SOFT_UI } from '@/themes';
import {
  hideThemedAlert,
  useThemedAlertStore,
  type ThemedAlertButton,
  type ThemedAlertButtonStyle,
} from '@/store/themedAlert';
import { useThemeStore } from '@/store/theme';

const T = HOME_SOFT_UI;

function buttonFace(
  style: ThemedAlertButtonStyle | undefined,
  isDark: boolean,
  textPrimary: string
): { backgroundColor: string; color: string } {
  if (style === 'destructive') {
    return { backgroundColor: '#FF3B30', color: '#FFFFFF' };
  }
  if (style === 'cancel') {
    return {
      backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.08)',
      color: textPrimary,
    };
  }
  return {
    backgroundColor: isDark ? 'rgba(255,255,255,0.92)' : COLORS.primary,
    color: isDark ? '#0B1220' : '#FFFFFF',
  };
}

/**
 * Single global host for theme-aware alerts. Mount once near the app root.
 * Call `showThemedAlert` instead of `Alert.alert` so dialogs follow dark mode.
 */
export function ThemedAlertHost() {
  const visible = useThemedAlertStore((s) => s.visible);
  const title = useThemedAlertStore((s) => s.title);
  const message = useThemedAlertStore((s) => s.message);
  const buttons = useThemedAlertStore((s) => s.buttons);
  const paletteId = useThemeStore((s) => s.paletteId);
  const darkModeFlatTop = useDarkModeFlatTop();
  // HOME_SOFT_UI colors proxy resolves after palette subscription re-renders this host.
  const surface = T.colors.surface;
  const textPrimary = T.colors.textPrimary;
  const textMuted = T.colors.textMuted;
  const isDark = relativeLuminance(PALETTES[paletteId].background) < 0.3;
  const handleButton = (button: ThemedAlertButton) => {
    hideThemedAlert();
    button.onPress?.();
  };

  const onRequestClose = () => {
    const cancel = buttons.find((b) => b.style === 'cancel') ?? buttons[buttons.length - 1];
    if (cancel) {
      handleButton(cancel);
      return;
    }
    hideThemedAlert();
  };

  return (
    <WebAwareModal visible={visible} onRequestClose={onRequestClose}>
      <View
        accessibilityViewIsModal
        style={styles.overlay}
        testID="themed-alert-modal"
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onRequestClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        />
        <View
          testID="themed-alert-card"
          style={[
            styles.card,
            darkModeFlatTop,
            {
              backgroundColor: surface,
              borderTopWidth: 0,
              borderTopColor: 'transparent',
            },
          ]}
        >
          {title ? (
            <Text style={[styles.title, { color: textPrimary }]} accessibilityRole="header">
              {title}
            </Text>
          ) : null}
          {message ? (
            <Text style={[styles.message, { color: textMuted }]}>{message}</Text>
          ) : null}
          <View
            style={[
              styles.buttonRow,
              buttons.length > 2 && styles.buttonColumn,
            ]}
          >
            {buttons.map((button, index) => {
              const face = buttonFace(button.style, isDark, textPrimary);
              return (
                <Pressable
                  key={`${button.text}-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={button.text}
                  onPress={() => handleButton(button)}
                  style={({ pressed }) => [
                    styles.button,
                    buttons.length <= 2 && styles.buttonFlex,
                    {
                      backgroundColor: face.backgroundColor,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.buttonText, { color: face.color }]} numberOfLines={1}>
                    {button.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </WebAwareModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
    zIndex: 1000,
    elevation: 1000,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: SPACING.lg,
    gap: SPACING.md,
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
  },
  title: {
    fontFamily: FONTS.uiBold,
    fontSize: 18,
    letterSpacing: 0.2,
  },
  message: {
    fontFamily: FONTS.ui,
    fontSize: 15,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
    justifyContent: 'flex-end',
  },
  buttonColumn: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  button: {
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonFlex: {
    flex: 1,
  },
  buttonText: {
    fontFamily: FONTS.uiBold,
    fontSize: 14,
    letterSpacing: 0.3,
  },
});
