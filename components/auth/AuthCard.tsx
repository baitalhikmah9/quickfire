import React, { type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { SPACING, FONTS, SOFT_SURFACE_FACE } from '@/constants';
import { HOME_SOFT_UI } from '@/themes';
import { useDarkModeFlatTop } from '@/lib/hooks/useTheme';

const T = HOME_SOFT_UI;

/** Raised shadow tier aligned with `OAuthProviderButtons` (header / card depth). */
function cardLiftShadow(shadowColor: string) {
  return {
    shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 12,
  };
}

export type AuthCardProps = {
  children: ReactNode;
  /** Optional max width on large screens (card stays centered). */
  maxWidth?: number;
};

/**
 * Shadcn-inspired auth shell: white card, subtle ring, soft lift - on brand canvas/surface system
 * (`docs/BRAND_GUIDELINES.md`).
 */
export function AuthCard({ children, maxWidth = 400 }: AuthCardProps) {
  const surface = T.colors.surface;
  const shadowHex = T.colors.shadowStrong;
  const darkModeFlatTop = useDarkModeFlatTop();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: surface,
          borderColor: 'rgba(0, 0, 0, 0.06)',
          maxWidth,
        },
        SOFT_SURFACE_FACE,
        darkModeFlatTop,
        cardLiftShadow(shadowHex),
      ]}
    >
      {children}
    </View>
  );
}

export type AuthCardHeaderProps = {
  title: string;
  description?: string;
  titleColor?: string;
  descriptionColor?: string;
};

export function AuthCardHeader({ title, description, titleColor, descriptionColor }: AuthCardHeaderProps) {
  const textPrimary = titleColor ?? T.colors.textPrimary;
  const textMuted = descriptionColor ?? T.colors.textMuted;

  return (
    <View style={styles.headerBlock}>
      <Text style={[styles.cardTitle, { color: textPrimary }]}>{title}</Text>
      {description ? (
        <Text style={[styles.cardDescription, { color: textMuted }]}>{description}</Text>
      ) : null}
    </View>
  );
}

export type AuthOrDividerProps = {
  label: string;
  mutedColor?: string;
};

/** “Or continue with” row - matches common shadcn auth examples. */
export function AuthOrDivider({ label, mutedColor }: AuthOrDividerProps) {
  const line = mutedColor ?? T.colors.textMuted;

  return (
    <View style={styles.dividerRow} accessibilityRole="text">
      <View style={[styles.dividerLine, { backgroundColor: line }]} />
      <Text style={[styles.dividerLabel, { color: line }]}>{label}</Text>
      <View style={[styles.dividerLine, { backgroundColor: line }]} />
    </View>
  );
}

export type AuthFieldProps = TextInputProps & {
  label: string;
  labelColor?: string;
};

/** Single-line field with shadcn-like outline treatment (RN-friendly). */
export function AuthField({ label, labelColor, style, ...inputProps }: AuthFieldProps) {
  const textPrimary = T.colors.textPrimary;
  const textMuted = T.colors.textMuted;
  const surface = T.colors.surface;

  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: labelColor ?? textMuted }]}>{label}</Text>
      <TextInput
        placeholderTextColor={textMuted}
        style={[
          styles.input,
          {
            color: textPrimary,
            backgroundColor: surface,
            borderColor: 'rgba(0, 0, 0, 0.1)',
          },
          style,
        ]}
        {...inputProps}
      />
    </View>
  );
}

export type AuthSubmitButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export function AuthSubmitButton({ label, onPress, disabled, loading }: AuthSubmitButtonProps) {
  const surface = T.colors.surface;
  const textPrimary = T.colors.textPrimary;
  const shadowHex = T.colors.shadowStrong;
  const darkModeFlatTop = useDarkModeFlatTop();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.submitOuter,
        SOFT_SURFACE_FACE,
        darkModeFlatTop,
        {
          backgroundColor: surface,
          opacity: disabled || loading ? 0.55 : pressed ? 0.92 : 1,
          transform: pressed && !disabled && !loading ? [{ scale: 0.98 }] : [{ scale: 1 }],
        },
        cardLiftShadow(shadowHex),
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textPrimary} />
      ) : (
        <Text style={[styles.submitLabel, { color: textPrimary }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    alignSelf: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: SPACING.xl,
    gap: SPACING.lg,
  },
  headerBlock: {
    gap: SPACING.xs,
  },
  cardTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 22,
    letterSpacing: -0.4,
  },
  cardDescription: {
    fontFamily: FONTS.ui,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.85,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginVertical: SPACING.xs,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth * 2,
    opacity: 0.35,
  },
  dividerLabel: {
    fontFamily: FONTS.uiSemibold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    opacity: 0.75,
  },
  field: {
    gap: SPACING.xs,
  },
  fieldLabel: {
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    letterSpacing: 0.6,
  },
  input: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontFamily: FONTS.ui,
    fontSize: 16,
  },
  submitOuter: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xs,
  },
  submitLabel: {
    fontFamily: FONTS.uiBold,
    fontSize: 14,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
});
