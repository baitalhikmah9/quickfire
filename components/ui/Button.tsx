import { Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { COLORS, TYPE_SCALE, BORDER_RADIUS, SHADOWS, SPACING, FONTS } from '@/constants/theme';
import { useI18n } from '@/lib/i18n/useI18n';

interface ButtonProps {
  /** The label text displayed inside the button. */
  title: string;
  /** Callback fired when the button is pressed. */
  onPress: () => void;
  /** Visual style variant of the button. Defaults to 'primary'. */
  variant?: 'primary' | 'secondary' | 'accent' | 'destructive' | 'outline';
  /** When true, the button is non-interactive and visually dimmed. */
  disabled?: boolean;
  /** Additional styles applied to the button container. */
  style?: ViewStyle;
  /** Additional styles applied to the button label. */
  textStyle?: TextStyle;
}

/**
 * Primary = Electric Blue fill (main challenge CTA).
 * Secondary = Lively Orange outline. Accent = Vivid Purple (utility emphasis).
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  const { getTextStyle } = useI18n();

  const getVariantStyles = (pressed: boolean) => {
    let backgroundColor = COLORS.primary;
    let textColor = COLORS.surface;
    let borderColor = 'transparent';
    let borderWidth = 0;

    switch (variant) {
      case 'secondary':
        backgroundColor = 'transparent';
        textColor = COLORS.secondary;
        borderColor = COLORS.secondary;
        borderWidth = 3;
        break;
      case 'accent':
        backgroundColor = COLORS.tertiary;
        textColor = COLORS.text;
        break;
      case 'destructive':
        backgroundColor = COLORS.error;
        textColor = COLORS.surface;
        break;
      case 'outline':
        backgroundColor = 'transparent';
        textColor = COLORS.primary;
        borderColor = COLORS.border;
        borderWidth = 2;
        break;
      case 'primary':
      default:
        backgroundColor = COLORS.primary;
        textColor = COLORS.surface;
        break;
    }

    return {
      container: {
        backgroundColor: pressed ? backgroundColor + 'CC' : backgroundColor,
        borderColor,
        borderWidth,
      },
      text: {
        color: textColor,
      },
    };
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        getVariantStyles(pressed).container,
        !disabled && variant === 'primary' && styles.shadow,
        !disabled && pressed && styles.pressedBounce,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
    >
      {({ pressed }) => (
        <Text
          style={[
            styles.buttonText,
            getVariantStyles(pressed).text,
            disabled ? styles.disabledText : null,
            getTextStyle(undefined, 'bodySemibold', 'center'),
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: SPACING.xl + 4,
    minHeight: 56,
    borderRadius: BORDER_RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  shadow: {
    ...SHADOWS.card,
  },
  pressedBounce: {
    transform: [{ scale: 0.97 }],
  },
  disabled: {
    opacity: 0.45,
  },
  buttonText: {
    ...TYPE_SCALE.button,
    fontFamily: FONTS.uiSemibold,
    textTransform: 'none',
  },
  disabledText: {
    color: COLORS.mutedText,
  },
});
