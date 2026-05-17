import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { Pressable } from '@/components/ui/Pressable';
import { FONTS, SOFT_SURFACE_FACE, softSurfaceLift, SPACING } from '@/constants';
import { isAuthDisabled } from '@/lib/authMode';
import { getRowDirection } from '@/lib/i18n/direction';
import { useI18n } from '@/lib/i18n/useI18n';
import { HOME_SOFT_UI } from '@/themes';

const T = HOME_SOFT_UI;

/** `docs/BRAND_GUIDELINES.md` — standard raised button radius (default). */
const RAISED_BUTTON_RADIUS = 14;

export type PublicAuthEntryProps = {
  showCreateAccount?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Compact signed-out auth entry points (Clerk sign-in / sign-up routes).
 * Hidden when `EXPO_PUBLIC_DISABLE_AUTH=true` (auth bypass).
 * Surfaces use the brand standard raised white control (warm lobby system).
 */
export function PublicAuthEntry({ showCreateAccount = true, style }: PublicAuthEntryProps) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { direction, t } = useI18n();
  const rowDirection = getRowDirection(direction);

  if (isAuthDisabled() || !isLoaded || isSignedIn) {
    return null;
  }

  const surface = T.colors.surface;
  const textPrimary = T.colors.textPrimary;

  return (
    <View testID="public-auth-entry" style={[styles.container, { flexDirection: rowDirection }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('auth.signUp.signIn')}
        testID="public-auth-entry-sign-in"
        onPress={() => router.push('/(auth)/sign-in')}
        style={({ pressed }) => [
          styles.raisedButton,
          SOFT_SURFACE_FACE,
          softSurfaceLift(),
          {
            backgroundColor: surface,
            opacity: pressed ? 0.9 : 1,
            transform: pressed ? [{ scale: 0.97 }] : [{ scale: 1 }],
          },
        ]}
      >
        <Text style={[styles.ctaLabel, { color: textPrimary }]} numberOfLines={1}>
          {t('auth.signUp.signIn')}
        </Text>
      </Pressable>

      {showCreateAccount ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('profile.guest.createAccount')}
          testID="public-auth-entry-sign-up"
          onPress={() => router.push('/(auth)/sign-up')}
          style={({ pressed }) => [
            styles.raisedButton,
            styles.raisedButtonPrimary,
            SOFT_SURFACE_FACE,
            softSurfaceLift(),
            {
              backgroundColor: surface,
              opacity: pressed ? 0.9 : 1,
              transform: pressed ? [{ scale: 0.97 }] : [{ scale: 1 }],
            },
          ]}
        >
          <Text style={[styles.ctaLabel, { color: textPrimary }]} numberOfLines={1}>
            {t('profile.guest.createAccount')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: SPACING.sm,
    flexShrink: 1,
    minWidth: 0,
  },
  raisedButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RAISED_BUTTON_RADIUS,
    paddingVertical: 10,
    paddingHorizontal: SPACING.lg,
    minWidth: 120,
  },
  /** Slightly larger tap target for the acquisition CTA when both buttons show. */
  raisedButtonPrimary: {
    minHeight: 48,
    paddingHorizontal: SPACING.xl,
  },
  ctaLabel: {
    fontFamily: FONTS.uiBold,
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});
