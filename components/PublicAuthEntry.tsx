import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { Pressable } from '@/components/ui/Pressable';
import { BORDER_RADIUS, FONTS, SPACING } from '@/constants';
import { isAuthDisabled } from '@/lib/authMode';
import { getRowDirection } from '@/lib/i18n/direction';
import { useI18n } from '@/lib/i18n/useI18n';

export type PublicAuthEntryProps = {
  showCreateAccount?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Compact signed-out auth entry points for public-facing screens.
 * Hidden when dev auth is disabled because /(auth) redirects back to the app hub.
 */
export function PublicAuthEntry({ showCreateAccount = true, style }: PublicAuthEntryProps) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { direction, t } = useI18n();
  const rowDirection = getRowDirection(direction);

  if (isAuthDisabled() || !isLoaded || isSignedIn) {
    return null;
  }

  return (
    <View testID="public-auth-entry" style={[styles.container, { flexDirection: rowDirection }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('auth.signUp.signIn')}
        testID="public-auth-entry-sign-in"
        onPress={() => router.push('/(auth)/sign-in')}
        style={({ pressed }) => [
          styles.button,
          styles.secondaryButton,
          { opacity: pressed ? 0.82 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
        ]}
      >
        <Text style={[styles.buttonLabel, styles.secondaryLabel]} numberOfLines={1}>
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
            styles.button,
            styles.primaryButton,
            { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
          ]}
        >
          <Text style={[styles.buttonLabel, styles.primaryLabel]} numberOfLines={1}>
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
    gap: SPACING.xs,
    flexShrink: 1,
    minWidth: 0,
  },
  button: {
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 2,
  },
  primaryButton: {
    backgroundColor: '#333333',
    borderColor: '#333333',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(51, 51, 51, 0.14)',
  },
  buttonLabel: {
    fontFamily: FONTS.uiBold,
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 0.4,
  },
  primaryLabel: {
    color: '#FFFFFF',
  },
  secondaryLabel: {
    color: '#333333',
  },
});
